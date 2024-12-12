import express, { type Router } from "express";
import { emailController } from "./emailController";

export const emailRouter: Router = express.Router();

emailRouter.post("/send-appointment", emailController.sendAppointment);
emailRouter.post("/send-confirm-appointment", emailController.confirmAppointment);
emailRouter.post("/invitation", emailController.sendInvitation);
emailRouter.post("/subscription", emailController.confirmSubscription);
