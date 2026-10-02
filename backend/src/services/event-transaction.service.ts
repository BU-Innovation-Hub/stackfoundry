import mongoose, { ClientSession } from "mongoose";
export const eventTransaction = async <T>(work: (session: ClientSession) => Promise<T>): Promise<T> => {
  for (let attempt = 0; ; attempt++) {
    try {
      const started = Date.now();
      let runs = 0;
      const result = await mongoose.connection.transaction(async session => { runs++; return work(session); }, {
        readConcern: { level: "snapshot" }, writeConcern: { w: "majority" }, maxCommitTimeMS: 10000,
      });
      if (process.env.NODE_ENV !== "test") console.info("[events] transaction", { durationMs: Date.now() - started, retries: runs - 1 + attempt });
      return result;
    } catch (error) {
      if ((error as { code?: number }).code !== 11000 || attempt >= 2) throw error;
    }
  }
};
