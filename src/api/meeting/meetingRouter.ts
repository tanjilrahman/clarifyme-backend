import express, { type Router } from "express";
import { meetingController } from "./meetingController";

export const meetingRouter: Router = express.Router();

meetingRouter.post("/create", meetingController.createZoomMeeting);

meetingRouter.get("/auth/zoom", meetingController.zoomOAuth);

meetingRouter.get("/auth/zoom/callback", meetingController.zoomOAuthCallback);
