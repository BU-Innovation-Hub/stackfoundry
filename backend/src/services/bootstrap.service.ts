import Role from "../models/role.model";
import Student, { IStudent } from "../models/user.model";
import { BootstrapConfig, BootstrapError, normalizeAdminEmail, requireInitialPassword } from "../config/bootstrap";
import { INITIAL_ROLES } from "../config/roles";

const isDuplicateKey = (error: unknown): boolean =>
  typeof error === "object" && error !== null && "code" in error && error.code === 11000;

const assertExistingAdmin = (user: IStudent, adminRoleId: string): void => {
  // Authentication uses the first role as the primary role.
  if (user.roles[0]?.toString() !== adminRoleId) {
    throw new BootstrapError("ADMIN_EMAIL belongs to an account whose primary role is not system_admin. No privileges were changed; resolve the account conflict explicitly.");
  }
  if (!user.isActive) {
    throw new BootstrapError("The configured administrator is inactive. Bootstrap will not reactivate it; resolve this through account administration.");
  }
};

/** Run on an already connected database. Safe to retry after partial completion. */
export const bootstrapDatabase = async (config: Pick<BootstrapConfig, "adminEmail" | "adminPassword">) => {
  const email = normalizeAdminEmail(config.adminEmail);
  // Build rather than sync: preserve unrelated indexes and fail on existing duplicates.
  // Explicit calls also work when production disables Mongoose autoIndex.
  await Role.createIndexes();
  await Student.createIndexes();

  const existing = await Student.findOne({ email });
  if (existing) {
    const adminRole = await Role.findOne({ name: "system_admin" });
    assertExistingAdmin(existing, adminRole?._id.toString() || "");
  }
  // Check missing/weak credentials before inserting any seed records.
  const password = existing ? undefined : requireInitialPassword(config.adminPassword);

  let rolesCreated = 0;
  for (const role of INITIAL_ROLES) {
    const now = new Date();
    try {
      const result = await Role.updateOne({ name: role.name }, {
        $setOnInsert: { ...role, createdAt: now, updatedAt: now },
      }, { upsert: true, runValidators: true, timestamps: false });
      rolesCreated += result.upsertedCount;
    } catch (error) {
      // Another release may have inserted the same role after our lookup.
      if (!isDuplicateKey(error) || !await Role.exists({ name: role.name })) throw error;
    }
  }

  const adminRole = await Role.findOne({ name: "system_admin" });
  if (!adminRole) throw new BootstrapError("The system_admin role could not be verified. Retry bootstrap.");
  if (existing) return { rolesCreated, adminCreated: false };

  const passwordHash = await Student.hashPassword(password!);
  try {
    await Student.create({
      email,
      name: "System",
      surname: "Administrator",
      passwordHash,
      roles: [adminRole._id],
      refreshTokens: [],
      isActive: true,
    });
    return { rolesCreated, adminCreated: true };
  } catch (error) {
    if (!isDuplicateKey(error)) throw error;
    // Do not promote an account that registered concurrently or overwrite a
    // password created by another release job. The email index arbitrates.
    const winner = await Student.findOne({ email });
    if (!winner) throw error;
    assertExistingAdmin(winner, adminRole._id.toString());
    return { rolesCreated, adminCreated: false };
  }
};
