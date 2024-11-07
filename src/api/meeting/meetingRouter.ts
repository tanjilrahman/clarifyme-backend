import express, { type Router } from "express";
import { meetingController } from "./meetingController";

export const meetingRouter: Router = express.Router();

meetingRouter.post("/create/zoom", meetingController.createZoomMeeting);

meetingRouter.get("/auth/zoom", meetingController.zoomOAuth);

meetingRouter.get("/auth/zoom/callback", meetingController.zoomOAuthCallback);

meetingRouter.post("/create/teams", meetingController.createTeamsMeeting);

meetingRouter.get("/auth/teams", meetingController.teamsOAuth);

meetingRouter.get("/auth/teams/callback", meetingController.teamsOAuthCallback);
