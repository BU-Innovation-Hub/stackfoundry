import User, { IStudent } from "../models/user.model";
import { ApiError } from "../middleware/errorHandler";
import { isBothoEmail } from "../utils/validation";
import { recordAuditEvent } from "../utils/audit";

export interface ProfileUpdates {
  name?: string;
  surname?: string;
  email?: string;
  bio?: string;
  skills?: string[];
  interests?: string[];
  faculty?: string;
  department?: string;
  programme?: string;
  collaborationOptIn?: boolean;
}

export const getProfile = async (id: string): Promise<IStudent> => {
  const user = await User.findById(id).select("-passwordHash -refreshTokens").populate("roles").exec();
  if (!user) throw new ApiError(404, "User not found");
  recordAuditEvent({ eventType: "business", action: "user.profile_updated", actorId: id, targetType: "User", targetId: id, success: true });
  return user;
};

export const updateProfile = async (id: string, updates: ProfileUpdates): Promise<IStudent> => {
  if (updates.email && !isBothoEmail(updates.email)) {
    throw new ApiError(400, "Email must use a Botho University domain");
  }
  const user = await User.findByIdAndUpdate(id, { $set: updates }, { new: true, runValidators: true })
    .populate("roles").exec();
  if (!user) throw new ApiError(404, "User not found");
  return user;
};

export const setProfilePicture = async (id: string, url: string, publicId: string): Promise<IStudent> => {
  const user = await User.findByIdAndUpdate(id, { $set: { profilePictureUrl: url, profilePicturePublicId: publicId } }, { new: true })
    .populate("roles").exec();
  if (!user) throw new ApiError(404, "User not found");
  return user;
};
