import { Router, type IRouter } from "express";
import healthRouter from "./health";
import aiRouter from "./ai";
import videosRouter from "./videos";
import authRouter from "./auth";
import postsRouter from "./posts";
import studyRouter from "./study";
import groupsRouter from "./groups";

const router: IRouter = Router();

router.use(healthRouter);
router.use(aiRouter);
router.use(videosRouter);
router.use(authRouter);
router.use(postsRouter);
router.use(studyRouter);
router.use(groupsRouter);

export default router;
