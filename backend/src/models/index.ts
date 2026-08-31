/**
 * Models Index
 * Central export for all Mongoose models
 */

import User, { IStudent } from "./user.model";

export { User, IStudent };
// Temporary source-level alias while consumers migrate from Student to User.
export { User as Student };
export { default as Role, IRole } from "./role.model";
export { default as Blog, IBlog, BlogCategory, BlogStatus } from "./blog.model";
export { default as Event, IEvent, EventType, EventStatus } from "./event.model";

// LMS Models
export { default as Course, ICourse } from "./course.model";
export { default as Level, ILevel } from "./level.model";
export { default as Topic, ITopic } from "./topic.model";
export { default as Material, IMaterial } from "./material.model";
export { default as Enrollment, IEnrollment } from "./enrollment.model";
export { default as Progress, IProgress } from "./progress.model";
