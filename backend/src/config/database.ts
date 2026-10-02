import mongoose from "mongoose";

export const connectDatabase = async (mongoUri: string) => {
	mongoose.set("strictQuery", true);
	await mongoose.connect(mongoUri);
	return mongoose.connection;
};

export const assertReplicaSet = async () => {
  const hello = await mongoose.connection.db!.admin().command({ hello: 1 });
  if (!hello.setName && hello.msg !== "isdbgrid") throw new Error("Event transactions require MongoDB replica set or mongos");
};
