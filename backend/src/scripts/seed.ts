/**
 * Database Seed Script
 * Creates initial roles and admin account
 *
 * Run with: npx ts-node src/scripts/seed.ts
 */

import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";
import Role from "../models/role.model";
import Student from "../models/user.model";

// Load environment variables
dotenv.config();

// ============================================
// Configuration
// ============================================

const MONGO_URI =
  process.env.MONGO_URI || "mongodb://localhost:27017/innovation_hub";

const ROLES = [
  {
    name: "student" as const,
    description: "Regular student with basic access to courses and materials",
  },
  {
    name: "member" as const,
    description: "Member with additional access to community features",
  },
  {
    name: "instructor" as const,
    description: "Instructor who can create and manage course content",
  },
  {
    name: "admin" as const,
    description: "Administrator with full system access",
  },
];

const ADMIN_USER = {
  studentId: "ADMIN-001",
  email: process.env.ADMIN_EMAIL || "admin@botho.ac.bw",
  password: process.env.ADMIN_PASSWORD || "Admin@123456",
  name: "System",
  surname: "Administrator",
};

// ============================================
// Seed Functions
// ============================================

async function seedRoles(): Promise<void> {
  console.log("\n📋 Seeding roles...");

  for (const roleData of ROLES) {
    const existing = await Role.findOne({ name: roleData.name });

    if (existing) {
      console.log(`   ✓ Role "${roleData.name}" already exists`);
    } else {
      await Role.create(roleData);
      console.log(`   ✓ Created role "${roleData.name}"`);
    }
  }
}

async function seedAdminUser(): Promise<void> {
  console.log("\n👤 Seeding admin user...");

  // Check if admin exists
  const existingAdmin = await Student.findOne({ email: ADMIN_USER.email });

  if (existingAdmin) {
    console.log(`   ✓ Admin user "${ADMIN_USER.email}" already exists`);
    return;
  }

  // Get admin role
  const adminRole = await Role.findOne({ name: "admin" });
  if (!adminRole) {
    throw new Error("Admin role not found. Run role seed first.");
  }

  // Hash password
  const passwordHash = await bcrypt.hash(ADMIN_USER.password, 12);

  // Create admin user
  await Student.create({
    studentId: ADMIN_USER.studentId,
    email: ADMIN_USER.email,
    name: ADMIN_USER.name,
    surname: ADMIN_USER.surname,
    passwordHash,
    roles: [adminRole._id],
    isActive: true,
  });

  console.log(`   ✓ Created admin user "${ADMIN_USER.email}"`);
  console.log(`   ⚠️  Default password: ${ADMIN_USER.password}`);
  console.log(`   ⚠️  CHANGE THIS PASSWORD IN PRODUCTION!`);
}

// ============================================
// Main
// ============================================

async function main(): Promise<void> {
  console.log("🌱 Starting database seed...");
  console.log(`   Database: ${MONGO_URI}`);

  try {
    // Connect to MongoDB
    await mongoose.connect(MONGO_URI);
    console.log("   ✓ Connected to MongoDB");

    // Run seeds
    await seedRoles();
    await seedAdminUser();

    console.log("\n✅ Seed completed successfully!");

    // Show summary
    const roleCount = await Role.countDocuments();
    const userCount = await Student.countDocuments();
    console.log(`\n📊 Summary:`);
    console.log(`   - Roles: ${roleCount}`);
    console.log(`   - Users: ${userCount}`);
  } catch (error) {
    console.error("\n❌ Seed failed:", error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log("\n   ✓ Disconnected from MongoDB");
  }
}

// Run the seed
main();
