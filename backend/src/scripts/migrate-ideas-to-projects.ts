/**
 * One-time migration: Idea (+ legacy embedded-collaborator docs) -> Project repository model.
 *
 * Maps Idea.owner -> Project.owner, Idea.teamMembers -> Project.collaborators,
 * preserves _ids and timestamps, idempotent via migratedFrom.ideaId, reversible
 * via backup collections. Supports --dry-run and --rollback.
 *
 * Usage:
 *   npm run migrate:projects -- --dry-run
 *   npm run migrate:projects
 *   npm run migrate:projects -- --rollback
 */
import dotenv from "dotenv";
import mongoose from "mongoose";

dotenv.config();

const args = process.argv.slice(2);
const DRY_RUN = args.includes("--dry-run");
const ROLLBACK = args.includes("--rollback");

const ts = () => new Date().toISOString().replace(/[:.]/g, "-");

const mapCollaboratorRole = (legacyRole?: string): "maintainer" | "contributor" | "owner" => {
  if (legacyRole === "owner" || legacyRole === "co_owner") return "maintainer";
  return "contributor";
};

async function main() {
  const uri = process.env.MONGO_URI || process.env.MONGODB_URI || "mongodb://localhost:27017/innovation-hub";
  await mongoose.connect(uri);
  const db = mongoose.connection.db!;
  console.log(`Connected. dryRun=${DRY_RUN} rollback=${ROLLBACK}`);

  if (ROLLBACK) {
    const backups = await db.listCollections().toArray();
    const projectBackups = backups.map((c) => c.name).filter((n) => n.startsWith("projects_backup_"));
    const showcaseBackups = backups.map((c) => c.name).filter((n) => n.startsWith("showcases_backup_"));
    if (DRY_RUN) {
      console.log(`[dry-run] Would restore from ${projectBackups[projectBackups.length - 1] || "(none)"} and ${showcaseBackups[showcaseBackups.length - 1] || "(none)"}`);
      await mongoose.disconnect();
      return;
    }
    const latestProjects = projectBackups.sort().pop();
    if (latestProjects) {
      await db.collection("projects").deleteMany({});
      const docs = await db.collection(latestProjects).find().toArray();
      if (docs.length) await db.collection("projects").insertMany(docs);
      console.log(`Restored ${docs.length} docs from ${latestProjects}`);
    }
    const latestShowcase = showcaseBackups.sort().pop();
    if (latestShowcase) {
      await db.collection("showcases").deleteMany({});
      const docs = await db.collection(latestShowcase).find().toArray();
      if (docs.length) await db.collection("showcases").insertMany(docs);
      console.log(`Restored ${docs.length} showcase docs from ${latestShowcase}`);
    }
    await mongoose.disconnect();
    return;
  }

  const ideas = await db.collection("ideas").find().toArray();
  const existing = await db.collection("projects").find({ "migratedFrom.ideaId": { $exists: true } }).toArray();
  const migratedIds = new Set(existing.map((d: any) => String(d.migratedFrom.ideaId)));
  const pending = ideas.filter((i: any) => !migratedIds.has(String(i._id)));

  console.log(`Ideas: ${ideas.length}, already migrated: ${existing.length}, pending: ${pending.length}`);

  const backupName = `projects_backup_${ts()}`;
  const showcaseBackup = `showcases_backup_${ts()}`;
  if (!DRY_RUN) {
    const allProjects = await db.collection("projects").find().toArray();
    if (allProjects.length) await db.collection(backupName).insertMany(allProjects);
    const allShowcase = await db.collection("showcases").find().toArray();
    if (allShowcase.length) await db.collection(showcaseBackup).insertMany(allShowcase);
    console.log(`Backed up ${allProjects.length} projects -> ${backupName}, ${allShowcase.length} showcases -> ${showcaseBackup}`);
  } else {
    console.log(`[dry-run] Would back up projects -> ${backupName}, showcases -> ${showcaseBackup}`);
  }

  let created = 0;
  for (const idea of pending as any[]) {
    const collaborators = [
      { user: idea.owner, role: "owner", joinedAt: idea.createdAt || new Date() },
      ...((idea.teamMembers || [])
        .filter((m: any) => String(m.user) !== String(idea.owner))
        .map((m: any) => ({ user: m.user, role: m.role === "owner" ? "owner" : mapCollaboratorRole(m.role), joinedAt: new Date() }))),
    ];
    // De-duplicate by user
    const seen = new Set<string>();
    const deduped = collaborators.filter((c: any) => {
      const k = String(c.user);
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });
    const doc = {
      _id: idea._id,
      title: idea.title,
      problem: idea.problem,
      solution: idea.solution,
      beneficiaries: idea.beneficiaries || [],
      impact: idea.impact,
      category: idea.category,
      stage: idea.stage,
      tags: [],
      media: idea.media || [],
      owner: idea.owner,
      collaborators: deduped,
      visibility: idea.visibility === "public" ? "public" : "private",
      status: idea.status || "draft",
      reviewHistory: idea.reviewHistory || [],
      migratedFrom: { ideaId: idea._id },
      createdAt: idea.createdAt,
      updatedAt: idea.updatedAt,
    };
    if (DRY_RUN) {
      created++;
      continue;
    }
    await db.collection("projects").updateOne({ _id: idea._id }, { $set: doc, $setOnInsert: {} }, { upsert: true });
    created++;
  }

  // Retarget showcases: showcases.idea -> showcases.project (preserve _id)
  const showcases = await db.collection("showcases").find().toArray();
  let retargeted = 0;
  for (const s of showcases as any[]) {
    if (s.project) continue;
    if (!s.idea) continue;
    if (DRY_RUN) {
      retargeted++;
      continue;
    }
    await db.collection("showcases").updateOne({ _id: s._id }, { $set: { project: s.idea } });
    retargeted++;
  }

  console.log(`${DRY_RUN ? "[dry-run] Would migrate" : "Migrated"} ${created} ideas -> projects, retargeted ${retargeted} showcases.`);
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
