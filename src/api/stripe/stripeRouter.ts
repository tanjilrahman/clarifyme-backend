import express, { type Router } from "express";
import { stripeController } from "./stripeController";

export const stripeRouter: Router = express.Router();

stripeRouter.post("/create-checkout-session", stripeController.createSession);
stripeRouter.post("/create-customer-portal", stripeController.createCustomerPortal);
stripeRouter.post("/webhook", express.raw({ type: "application/json" }), stripeController.webhook);
stripeRouter.post("/add-access-user", stripeController.addAccessUser);
stripeRouter.post("/revoke-access-user", stripeController.revokeAccessUser);
