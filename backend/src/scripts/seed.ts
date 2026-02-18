/**
 * Database Seed Script
 * Creates initial roles, admin account, and sample blogs
 *
 * Run with: npx ts-node src/scripts/seed.ts
 */

import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";
import Role from "../models/role.model";
import Student from "../models/user.model";
import Blog from "../models/blog.model";
import Event from "../models/event.model";

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

const SAMPLE_BLOGS = [
  {
    title: "How to Build a Successful Tech Startup in Africa",
    excerpt:
      "Key insights and strategies for launching and scaling your tech venture in the African market.",
    content: `
# How to Build a Successful Tech Startup in Africa

Africa is experiencing a tech revolution, and there's never been a better time to launch a startup on the continent.

## Understanding the Market

The African tech ecosystem has grown exponentially over the past decade. With a young, digitally-savvy population and increasing smartphone penetration, the opportunities are immense.

### Key Considerations

1. **Identify Local Problems**: The most successful startups solve real problems faced by Africans
2. **Mobile-First Approach**: Design for mobile from day one
3. **Localization**: Understand local languages, cultures, and payment preferences
4. **Infrastructure Challenges**: Build solutions that work with limited connectivity

## Funding Landscape

The funding landscape in Africa has matured significantly:

- **Angel Investors**: Growing network of local angels
- **VC Funds**: Both local and international funds are active
- **Accelerators**: Programs like Y Combinator are increasingly interested in African startups

## Conclusion

Building a tech startup in Africa requires resilience, adaptability, and a deep understanding of local markets. The rewards, however, can be transformative.
    `,
    category: "entrepreneurship" as const,
    tags: ["startup", "africa", "entrepreneurship", "funding"],
    status: "published" as const,
  },
  {
    title: "The Rise of AI in African Innovation",
    excerpt:
      "Exploring how artificial intelligence is transforming industries across the continent.",
    content: `
# The Rise of AI in African Innovation

Artificial Intelligence is no longer a futuristic concept—it's reshaping industries across Africa today.

## AI Applications in Africa

### Agriculture
- Crop disease detection using computer vision
- Yield prediction models
- Smart irrigation systems

### Healthcare
- Diagnostic tools for remote areas
- Drug discovery acceleration
- Patient management systems

### Financial Services
- Credit scoring for the unbanked
- Fraud detection
- Automated customer service

## Challenges and Opportunities

While AI presents immense opportunities, there are challenges:

- **Data availability**: Need for localized datasets
- **Infrastructure**: Computing resources are expensive
- **Skills gap**: Need for more AI talent

## The Future

African innovators are uniquely positioned to develop AI solutions that address local challenges while contributing to global knowledge.
    `,
    category: "technology" as const,
    tags: ["AI", "machine learning", "innovation", "africa"],
    status: "published" as const,
  },
  {
    title: "5 Lessons from Our Latest Hackathon Winners",
    excerpt:
      "What we learned from the teams that built winning solutions in just 48 hours.",
    content: `
# 5 Lessons from Our Latest Hackathon Winners

Our recent 48-hour hackathon brought together some of the brightest minds in tech. Here's what the winning teams taught us.

## Lesson 1: Start with the Problem

The winning team spent the first 4 hours just understanding the problem. They interviewed potential users and validated assumptions before writing any code.

## Lesson 2: Keep It Simple

All winning solutions were remarkably simple. They focused on doing one thing exceptionally well rather than building feature-rich applications.

## Lesson 3: Team Dynamics Matter

Successful teams had clear roles and excellent communication. They used tools like Slack and Notion to stay coordinated.

## Lesson 4: Presentation is Key

A great product with a poor presentation loses. Winners spent significant time preparing their demo and pitch.

## Lesson 5: Have Fun

The teams that enjoyed the process performed better. They took breaks, celebrated small wins, and maintained positive energy.

## Conclusion

Hackathons are about more than winning—they're about learning, networking, and pushing boundaries.
    `,
    category: "events" as const,
    tags: ["hackathon", "learning", "teamwork", "competition"],
    status: "published" as const,
  },
];

const SAMPLE_EVENTS = [
  {
    title: "AI & Machine Learning Workshop",
    description:
      "Hands-on workshop exploring the latest in AI/ML technologies and their applications in African markets. Learn to build and deploy machine learning models using TensorFlow and PyTorch. Suitable for beginners and intermediate developers.",
    date: "Mar 15, 2026",
    time: "10:00 AM - 4:00 PM",
    eventDate: new Date("2026-03-15T10:00:00"),
    type: "workshop" as const,
    location: "Innovation Hub Lab 1, Botho University",
    registrationLink: "https://forms.example.com/ai-workshop",
    status: "published" as const,
  },
  {
    title: "Startup Pitch Competition 2026",
    description:
      "Present your startup idea to a panel of investors and industry experts. Win funding up to $10,000 and mentorship from successful entrepreneurs. Open to all students and recent graduates with innovative business ideas.",
    date: "Mar 22, 2026",
    time: "2:00 PM - 6:00 PM",
    eventDate: new Date("2026-03-22T14:00:00"),
    type: "conference" as const,
    location: "Main Auditorium, Botho University",
    registrationLink: "https://forms.example.com/pitch-competition",
    status: "published" as const,
  },
  {
    title: "48-Hour Hackathon: FinTech Edition",
    description:
      "Build innovative financial solutions for the unbanked. Teams compete for prizes worth $15,000. Food, drinks, and accommodation provided. Form teams of 2-5 members and bring your laptops ready to code!",
    date: "Apr 5-6, 2026",
    time: "All Day Event",
    eventDate: new Date("2026-04-05T08:00:00"),
    type: "hackathon" as const,
    location: "Innovation Hub, Building C",
    registrationLink: "https://forms.example.com/fintech-hackathon",
    status: "published" as const,
  },
  {
    title: "Tech Founders Meetup",
    description:
      "Network with successful tech founders and learn from their entrepreneurial journeys. Hear stories of failure and success, and get practical advice on building your startup. Light refreshments will be served.",
    date: "Apr 12, 2026",
    time: "6:00 PM - 9:00 PM",
    eventDate: new Date("2026-04-12T18:00:00"),
    type: "meetup" as const,
    location: "Startup Lounge, Innovation Hub",
    status: "published" as const,
  },
  {
    title: "Web Development Bootcamp",
    description:
      "Intensive 2-day bootcamp covering modern web development with React, Node.js, and MongoDB. Build a full-stack application from scratch. Prior programming experience required.",
    date: "Apr 19-20, 2026",
    time: "9:00 AM - 5:00 PM",
    eventDate: new Date("2026-04-19T09:00:00"),
    type: "workshop" as const,
    location: "Computer Lab 3, Tech Building",
    registrationLink: "https://forms.example.com/webdev-bootcamp",
    status: "draft" as const,
  },
];

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

async function seedBlogs(): Promise<void> {
  console.log("\n📝 Seeding blogs...");

  // Get admin user for author reference
  const admin = await Student.findOne({ email: ADMIN_USER.email });
  if (!admin) {
    console.log("   ⚠️ Admin user not found. Skipping blog seed.");
    return;
  }

  for (const blogData of SAMPLE_BLOGS) {
    // Check if blog with same title exists
    const existing = await Blog.findOne({ title: blogData.title });

    if (existing) {
      console.log(`   ✓ Blog "${blogData.title.substring(0, 40)}..." already exists`);
    } else {
      await Blog.create({
        ...blogData,
        author: admin._id,
        authorName: `${admin.name} ${admin.surname}`,
        publishedAt: blogData.status === "published" ? new Date() : undefined,
      });
      console.log(`   ✓ Created blog "${blogData.title.substring(0, 40)}..."`);
    }
  }
}

async function seedEvents(): Promise<void> {
  console.log("\n📅 Seeding events...");

  // Get admin user for author reference
  const admin = await Student.findOne({ email: ADMIN_USER.email });
  if (!admin) {
    console.log("   ⚠️ Admin user not found. Skipping event seed.");
    return;
  }

  for (const eventData of SAMPLE_EVENTS) {
    // Check if event with same title exists
    const existing = await Event.findOne({ title: eventData.title });

    if (existing) {
      console.log(`   ✓ Event "${eventData.title.substring(0, 40)}..." already exists`);
    } else {
      await Event.create({
        ...eventData,
        author: admin._id,
        authorName: `${admin.name} ${admin.surname}`,
        publishedAt: eventData.status === "published" ? new Date() : undefined,
      });
      console.log(`   ✓ Created event "${eventData.title.substring(0, 40)}..."`);
    }
  }
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
    await seedBlogs();
    await seedEvents();
    // await seedBlogs();

    console.log("\n✅ Seed completed successfully!");

    // Show summary
    const roleCount = await Role.countDocuments();
    const userCount = await Student.countDocuments();
    const blogCount = await Blog.countDocuments();
    const eventCount = await Event.countDocuments();
    console.log(`\n📊 Summary:`);
    console.log(`   - Roles: ${roleCount}`);
    console.log(`   - Users: ${userCount}`);
    console.log(`   - Blogs: ${blogCount}`);
    console.log(`   - Events: ${eventCount}`);
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
