/**
 * Database Seed Script
 * Creates initial roles, demo accounts, and sample content
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
import Course from "../models/course.model";
import Level from "../models/level.model";
import Topic from "../models/topic.model";
import Material from "../models/material.model";
import Enrollment from "../models/enrollment.model";

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
    name: "mentor" as const,
    description: "Mentor who can support innovation hub users",
  },
  {
    name: "system_admin" as const,
    description: "Administrator with full system access",
  },
  {
    name: "innovation_hub_admin" as const,
    description: "Innovation Hub administrator who manages hub operations",
  },
];

const ADMIN_USER = {
  studentId: "ADMIN-001",
  email: process.env.ADMIN_EMAIL || "admin@bothouniversity.ac.bw",
  password: process.env.ADMIN_PASSWORD || "Admin@123456",
  name: "System",
  surname: "Administrator",
};

const SEEDED_USERS = [
  {
    role: "system_admin" as const,
    studentId: ADMIN_USER.studentId,
    email: ADMIN_USER.email,
    password: ADMIN_USER.password,
    name: ADMIN_USER.name,
    surname: ADMIN_USER.surname,
  },
  {
    role: "innovation_hub_admin" as const,
    email: process.env.INNOVATION_HUB_ADMIN_EMAIL || "hub.admin@bothouniversity.com",
    password: process.env.INNOVATION_HUB_ADMIN_PASSWORD || "HubAdmin@123456",
    name: "Innovation Hub",
    surname: "Administrator",
  },
  {
    role: "mentor" as const,
    email: process.env.MENTOR_EMAIL || "mentor@bothouniversity.com",
    password: process.env.MENTOR_PASSWORD || "Mentor@123456",
    name: "Demo",
    surname: "Mentor",
  },
  {
    role: "student" as const,
    studentId: "STU-DEMO-001",
    email: process.env.STUDENT_EMAIL || "student@bothouniversity.com",
    password: process.env.STUDENT_PASSWORD || "Student@123456",
    name: "Demo",
    surname: "Student",
  },
  {
    role: "member" as const,
    email: process.env.MEMBER_EMAIL || "member@bothouniversity.com",
    password: process.env.MEMBER_PASSWORD || "Member@123456",
    name: "Demo",
    surname: "Member",
  },
];

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
// LMS Sample Data
// ============================================

const SAMPLE_COURSES = [
  {
    title: "Full Stack Web Development Bootcamp",
    description:
      "Master modern web development with React, Node.js, Express, and MongoDB. Build real-world projects from scratch and deploy them to the cloud.",
  },
  {
    title: "Introduction to Python Programming",
    description:
      "Learn Python fundamentals, data structures, and build practical applications. Perfect for beginners with no prior programming experience.",
  },
  {
    title: "Mobile App Development with React Native",
    description:
      "Create cross-platform mobile apps for iOS and Android using React Native. Ship your first app to the app stores.",
  },
];

// Levels for each course (indexed by course position)
const SAMPLE_LEVELS = [
  // Course 0: Full Stack Web Development
  [
    { levelNumber: 1, name: "HTML & CSS Foundations", lockedByDefault: false },
    { levelNumber: 2, name: "JavaScript Essentials", lockedByDefault: true },
    { levelNumber: 3, name: "React Fundamentals", lockedByDefault: true },
    { levelNumber: 4, name: "Node.js & Express", lockedByDefault: true },
    { levelNumber: 5, name: "MongoDB & Database Design", lockedByDefault: true },
  ],
  // Course 1: Python Programming
  [
    { levelNumber: 1, name: "Python Basics", lockedByDefault: false },
    { levelNumber: 2, name: "Data Structures in Python", lockedByDefault: true },
    { levelNumber: 3, name: "Functions & Modules", lockedByDefault: true },
    { levelNumber: 4, name: "Object-Oriented Programming", lockedByDefault: true },
  ],
  // Course 2: React Native
  [
    { levelNumber: 1, name: "React Native Setup & Basics", lockedByDefault: false },
    { levelNumber: 2, name: "Components & Styling", lockedByDefault: true },
    { levelNumber: 3, name: "Navigation & State Management", lockedByDefault: true },
  ],
];

// Topics for first level of first course (for demonstration)
const SAMPLE_TOPICS = [
  { name: "Introduction to HTML", description: "Learn the basics of HTML document structure" },
  { name: "HTML Elements & Tags", description: "Explore common HTML elements and their usage" },
  { name: "CSS Fundamentals", description: "Style your web pages with CSS" },
  { name: "Flexbox & Grid", description: "Modern CSS layout techniques" },
];

// Materials for first level of first course (video + pdf examples)
const SAMPLE_MATERIALS = [
  {
    title: "Welcome to Web Development",
    type: "video" as const,
    youtubeVideoId: "UB1O30fR-EE", // HTML Crash Course for Beginners
    youtubeTitle: "HTML Crash Course For Beginners",
    youtubeDurationSeconds: 3600,
    youtubeThumbnail: "https://img.youtube.com/vi/UB1O30fR-EE/maxresdefault.jpg",
    order: 1,
  },
  {
    title: "HTML5 Complete Reference",
    type: "pdf" as const,
    cloudinaryPublicId: "innovation-hub/lms-pdfs/html5-reference",
    pdfOriginalName: "html5-complete-reference.pdf",
    pdfSizeBytes: 2457600,
    order: 2,
  },
  {
    title: "CSS Basics Tutorial",
    type: "video" as const,
    youtubeVideoId: "yfoY53QXEnI", // CSS Crash Course for Beginners
    youtubeTitle: "CSS Crash Course For Beginners",
    youtubeDurationSeconds: 5040,
    youtubeThumbnail: "https://img.youtube.com/vi/yfoY53QXEnI/maxresdefault.jpg",
    order: 3,
  },
  {
    title: "CSS Cheat Sheet",
    type: "pdf" as const,
    cloudinaryPublicId: "innovation-hub/lms-pdfs/css-cheatsheet",
    pdfOriginalName: "css-cheatsheet.pdf",
    pdfSizeBytes: 1048576,
    order: 4,
  },
  {
    title: "Flexbox in 20 Minutes",
    type: "video" as const,
    youtubeVideoId: "JJSoEo8JSnc", // Flexbox tutorial
    youtubeTitle: "Flexbox CSS In 20 Minutes",
    youtubeDurationSeconds: 1200,
    youtubeThumbnail: "https://img.youtube.com/vi/JJSoEo8JSnc/maxresdefault.jpg",
    order: 5,
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

async function seedUsers(): Promise<void> {
  console.log("\n👤 Seeding demo accounts...");

  for (const userData of SEEDED_USERS) {
    const existing = await Student.findOne({ email: userData.email });
    if (existing) {
      console.log(`   ✓ ${userData.role} account "${userData.email}" already exists`);
      continue;
    }

    const role = await Role.findOne({ name: userData.role });
    if (!role) throw new Error(`Role "${userData.role}" not found. Run role seed first.`);

    if (userData.role === "innovation_hub_admin" && await Student.exists({ roles: role._id })) {
      console.log("   ✓ An innovation hub admin already exists; skipping demo hub admin");
      continue;
    }

    const passwordHash = await bcrypt.hash(userData.password, 12);
    await Student.create({
      studentId: userData.studentId,
      email: userData.email.toLowerCase(),
      name: userData.name,
      surname: userData.surname,
      passwordHash,
      roles: [role._id],
      refreshTokens: [],
      isActive: true,
    });
    console.log(`   ✓ Created ${userData.role} account "${userData.email}"`);
    console.log(`     Password: ${userData.password}`);
  }
  console.log("   ⚠️ Change seeded passwords outside development environments.");
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

async function seedLMS(): Promise<void> {
  console.log("\n📚 Seeding LMS (Courses, Levels, Topics, Materials)...");

  // Get admin user for createdBy reference
  const admin = await Student.findOne({ email: ADMIN_USER.email });
  if (!admin) {
    console.log("   ⚠️ Admin user not found. Skipping LMS seed.");
    return;
  }

  // Seed Courses
  const createdCourses: mongoose.Types.ObjectId[] = [];

  for (let i = 0; i < SAMPLE_COURSES.length; i++) {
    const courseData = SAMPLE_COURSES[i];
    const existing = await Course.findOne({ title: courseData.title });

    if (existing) {
      console.log(`   ✓ Course "${courseData.title.substring(0, 40)}..." already exists`);
      createdCourses.push(existing._id as mongoose.Types.ObjectId);
    } else {
      const course = await Course.create({
        ...courseData,
        createdBy: admin._id,
      });
      console.log(`   ✓ Created course "${courseData.title.substring(0, 40)}..."`);
      createdCourses.push(course._id as mongoose.Types.ObjectId);
    }
  }

  // Seed Levels for each course
  const createdLevels: mongoose.Types.ObjectId[][] = [];

  for (let courseIdx = 0; courseIdx < createdCourses.length; courseIdx++) {
    const courseId = createdCourses[courseIdx];
    const levelsData = SAMPLE_LEVELS[courseIdx] || [];
    const courseLevels: mongoose.Types.ObjectId[] = [];

    for (const levelData of levelsData) {
      const existing = await Level.findOne({
        course: courseId,
        levelNumber: levelData.levelNumber,
      });

      if (existing) {
        console.log(`   ✓ Level ${levelData.levelNumber} "${levelData.name}" already exists`);
        courseLevels.push(existing._id as mongoose.Types.ObjectId);
      } else {
        const level = await Level.create({
          ...levelData,
          course: courseId,
        });
        console.log(`   ✓ Created level ${levelData.levelNumber}: "${levelData.name}"`);
        courseLevels.push(level._id as mongoose.Types.ObjectId);
      }
    }
    createdLevels.push(courseLevels);
  }

  // Seed Topics for the first level of the first course
  if (createdLevels.length > 0 && createdLevels[0].length > 0) {
    const firstLevelId = createdLevels[0][0];
    const createdTopics: mongoose.Types.ObjectId[] = [];

    for (const topicData of SAMPLE_TOPICS) {
      const existing = await Topic.findOne({
        level: firstLevelId,
        name: topicData.name,
      });

      if (existing) {
        console.log(`   ✓ Topic "${topicData.name}" already exists`);
        createdTopics.push(existing._id as mongoose.Types.ObjectId);
      } else {
        const topic = await Topic.create({
          ...topicData,
          level: firstLevelId,
        });
        console.log(`   ✓ Created topic "${topicData.name}"`);
        createdTopics.push(topic._id as mongoose.Types.ObjectId);
      }
    }

    // Seed Materials for the first level
    const firstTopicId = createdTopics.length > 0 ? createdTopics[0] : undefined;

    for (const materialData of SAMPLE_MATERIALS) {
      const existing = await Material.findOne({
        level: firstLevelId,
        title: materialData.title,
      });

      if (existing) {
        console.log(`   ✓ Material "${materialData.title.substring(0, 35)}..." already exists`);
      } else {
        await Material.create({
          ...materialData,
          level: firstLevelId,
          topic: firstTopicId,
        });
        console.log(`   ✓ Created ${materialData.type} material: "${materialData.title.substring(0, 35)}..."`);
      }
    }
  }

  // Enroll admin in the first course (for testing)
  if (createdCourses.length > 0 && createdLevels.length > 0) {
    const firstCourseId = createdCourses[0];
    const firstCourseLevels = createdLevels[0];

    const existingEnrollment = await Enrollment.findOne({
      user: admin._id,
      course: firstCourseId,
    });

    if (existingEnrollment) {
      console.log(`   ✓ Admin enrollment in first course already exists`);
    } else {
      // Enroll admin with first level unlocked
      await Enrollment.create({
        user: admin._id,
        course: firstCourseId,
        levelsUnlocked: firstCourseLevels.length > 0 ? [firstCourseLevels[0]] : [],
      });
      console.log(`   ✓ Enrolled admin in first course with level 1 unlocked`);
    }
  }

  console.log("   ✓ LMS seeding complete");
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
    await seedUsers();
    await seedBlogs();
    await seedEvents();
    await seedLMS();

    console.log("\n✅ Seed completed successfully!");

    // Show summary
    const roleCount = await Role.countDocuments();
    const userCount = await Student.countDocuments();
    const blogCount = await Blog.countDocuments();
    const eventCount = await Event.countDocuments();
    const courseCount = await Course.countDocuments();
    const levelCount = await Level.countDocuments();
    const topicCount = await Topic.countDocuments();
    const materialCount = await Material.countDocuments();
    const enrollmentCount = await Enrollment.countDocuments();

    console.log(`\n📊 Summary:`);
    console.log(`   - Roles: ${roleCount}`);
    console.log(`   - Users: ${userCount}`);
    console.log(`   - Blogs: ${blogCount}`);
    console.log(`   - Events: ${eventCount}`);
    console.log(`   - Courses: ${courseCount}`);
    console.log(`   - Levels: ${levelCount}`);
    console.log(`   - Topics: ${topicCount}`);
    console.log(`   - Materials: ${materialCount}`);
    console.log(`   - Enrollments: ${enrollmentCount}`);
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
