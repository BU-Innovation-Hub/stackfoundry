import { InnovationCategory, DevelopmentStage, Notification } from "../models/innovation.model";
import Student from "../models/user.model";
import { sendNotificationEmail } from "./email.service";

export const DEFAULT_CATEGORIES = ["Climate and Sustainability", "Health", "Education", "Technology", "Business and Society"];
export const DEFAULT_STAGES = ["Ideation", "Validation", "Prototype", "Pilot", "Scale"];

export const ensureInnovationClassifications = async (): Promise<void> => {
  for (const [Model, values] of [[InnovationCategory, DEFAULT_CATEGORIES], [DevelopmentStage, DEFAULT_STAGES]] as const) {
    for (const name of values) await Model.updateOne({ slug: name.toLowerCase().replace(/[^a-z0-9]+/g, "-") }, { $setOnInsert: { name, slug: name.toLowerCase().replace(/[^a-z0-9]+/g, "-") } }, { upsert: true });
  }
};

export const notify = async (recipient: string, title: string, message: string, link?: string, email = true) => {
  const notification = await Notification.create({ recipient, title, message, link, type: "in_app" });
  if (email) {
    const user = await Student.findById(recipient).select("email name");
    if (user) {
      try { await sendNotificationEmail(user.email, title, `Hi ${user.name},\n\n${message}`); await Notification.findByIdAndUpdate(notification._id, { emailSentAt: new Date() }); } catch { /* notification remains available in-app */ }
    }
  }
  return notification;
};
