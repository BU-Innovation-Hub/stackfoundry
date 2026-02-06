import { Router } from "express";
import healthRouter from "./health.routes";
import userRouter from "./user.routes";

const v1 = Router();

v1.use("/health", healthRouter);
v1.use("/users", userRouter);

export default v1;
