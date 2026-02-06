import User, { IUser } from "../models/user.model";

export const findById = async (id: string): Promise<IUser | null> => {
  return User.findById(id).exec();
};
