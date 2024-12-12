import { ServiceResponse } from "@/common/models/serviceResponse";
import { handleServiceResponse } from "@/common/utils/httpHandlers";
import { db } from "@/firebase";
import { subscriptions } from "@/subscriptions";
import axios from "axios";
import type { Request, RequestHandler, Response } from "express";
import { StatusCodes } from "http-status-codes";
import {
  type DBUser,
  type SubscriptionUpdateData,
  addAccessEmail,
  getAdminBySubscriptionId,
  getUserByEmail,
  getUserSubscription,
  revokeAccessEmail,
  updateManagedAccounts,
  updateUserBySubscriptionId,
  updateUserSubscription,
} from "./stripeService";
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

class StripeController {
  public createSession: RequestHandler = async (req: Request, res: Response) => {
    const domainURL = process.env.CORS_ORIGIN;
    const { priceId, userId, email } = req.body; // Include userId to identify the subscriber.

    try {
      const session = await stripe.checkout.sessions.create({
        mode: "subscription",
        line_items: [
          {
            price: priceId,
            quantity: 1,
          },
        ],
        subscription_data: {
          trial_period_days: 7, // Add a 7-day trial period.
        },
        client_reference_id: userId, // Pass userId in metadata for later reference.
        customer_email: email,
        success_url: `${domainURL}/manage`,
        cancel_url: `${domainURL}/`,
      });
      const serviceResponse = ServiceResponse.success("Checkout url", {
        url: session.url,
      });

      return handleServiceResponse(serviceResponse, res);
    } catch (e: any) {
      res.status(400);
      return res.send({
        error: {
          message: e.message,
        },
      });
    }
  };

  public createCustomerPortal: RequestHandler = async (req: Request, res: Response) => {
    const domainURL = process.env.CORS_ORIGIN;
    const { customerId } = req.body; // Stripe Customer ID is required

    if (!customerId) {
      return res.status(400).json({ error: "Customer ID is required." });
    }

    try {
      // Create a customer portal session
      const portalSession = await stripe.billingPortal.sessions.create({
        customer: customerId,
        return_url: `${domainURL}/manage`, // Where the user is redirected after using the portal
      });

      // Redirect to the Customer Portal
      return res.redirect(303, portalSession.url);
    } catch (e: any) {
      console.error("Error creating Customer Portal:", e.message);
      return res.status(500).json({
        error: {
          message: "Failed to create customer portal session.",
        },
      });
    }
  };

  public webhook: RequestHandler = async (req: Request, res: Response) => {
    let data: any;
    let eventType: any;
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (webhookSecret) {
      let event: any;
      const signature = req.headers["stripe-signature"];

      try {
        event = stripe.webhooks.constructEvent(req.body, signature, webhookSecret);
      } catch (err) {
        console.log("⚠️ Webhook signature verification failed.");
        return res.sendStatus(400);
      }

      data = event.data.object;
      eventType = event.type;
    } else {
      data = req.body.data.object;
      eventType = req.body.type;
    }

    const userId = data.client_reference_id; // Extract userId from metadata.

    switch (eventType) {
      case "checkout.session.completed":
        // Update the database to mark the user as active.
        if (userId) {
          await updateUserSubscription(userId, {
            status: "trialing",
            subscriptionId: data.subscription,
            customerId: data.customer,
            subscriptionType: "admin",
            subscriptionAdmin: data.customer_email,
            accessEmails: null,
          });

          await axios.post("https://api.clarifyme.ai/email/subscription", {
            adminEmail: data.customer_email,
            subscriptionType: "Started",
          });
          console.log("User subscription activated after checkout.");
        }
        break;

      case "invoice.paid":
        // Mark the subscription as paid.
        await updateUserBySubscriptionId(data.subscription, {
          status: "active",
          lastPaymentDate: new Date(),
        });

        await axios.post("https://api.clarifyme.ai/email/subscription", {
          adminEmail: data.customer_email,
          subscriptionType: "Started",
        });
        console.log("User subscription renewed after payment.");
        break;

      case "invoice.payment_failed":
        // Mark the subscription as past_due.
        await updateUserBySubscriptionId(data.subscription, {
          status: "past_due",
          lastPaymentDate: null,
        });
        console.log("User subscription payment failed.");
        break;

      case "customer.subscription.created":
        // Handle subscription cancellation.

        await updateUserBySubscriptionId(data.id, {
          status: data.status,
          priceId: data.plan.id,
          trialStart: data.trial_start ? new Date(data.trial_start * 1000) : null,
          trialEnd: data.trial_end ? new Date(data.trial_end * 1000) : null,
        });
        console.log("User subscription created.");
        break;

      case "customer.subscription.updated": {
        try {
          const adminSubscriptionId = data.id;

          // Update the admin subscription
          const adminDoc = await getAdminBySubscriptionId(adminSubscriptionId);
          if (!adminDoc) {
            console.error(`Admin not found for subscription ID: ${adminSubscriptionId}`);
            return res.status(404).send("Admin not found.");
          }

          const adminData = adminDoc.data() as DBUser;
          const adminUpdate = {
            status: data.status,
            priceId: data.plan.id,
            trialStart: data.trial_start ? new Date(data.trial_start * 1000) : null,
            trialEnd: data.trial_end ? new Date(data.trial_end * 1000) : null,
          };

          await adminDoc.ref.set({ subscription: { ...adminData.subscription, ...adminUpdate } }, { merge: true });

          // Fetch managed accounts
          const managedEmails = adminData.subscription.accessEmails || [];
          if (managedEmails.length === 0) {
            console.log("No managed accounts to update.");
            break;
          }

          // Update managed accounts in batches
          await updateManagedAccounts(adminUpdate, managedEmails, adminData.email);
          console.log("Managed accounts updated successfully.");
        } catch (error) {
          console.error("Error updating subscription:", error);
          return res.status(500).send("Error updating subscription.");
        }
        break;
      }

      case "customer.subscription.deleted": {
        try {
          const adminSubscriptionId = data.id;

          // Update the admin subscription
          const adminDoc = await getAdminBySubscriptionId(adminSubscriptionId);
          if (!adminDoc) {
            console.error(`Admin not found for subscription ID: ${adminSubscriptionId}`);
            return res.status(404).send("Admin not found.");
          }

          const adminData = adminDoc.data() as DBUser;
          const adminUpdate: SubscriptionUpdateData = {
            status: "canceled",
            subscriptionId: null,
            customerId: null,
            lastPaymentDate: null,
            trialStart: null,
            trialEnd: null,
            priceId: null,
            subscriptionType: null,
            subscriptionAdmin: null,
            accessEmails: null,
          };

          await adminDoc.ref.set({ subscription: { ...adminData.subscription, ...adminUpdate } }, { merge: true });

          // Fetch managed accounts
          const managedEmails = adminData.subscription.accessEmails || [];
          if (managedEmails.length === 0) {
            console.log("No managed accounts to cancel.");
            break;
          }

          // Update managed accounts in batches
          await updateManagedAccounts(adminUpdate, managedEmails, null);

          await axios.post("https://api.clarifyme.ai/email/subscription", {
            adminEmail: data.customer_email,
            subscriptionType: "Canceled",
          });
          console.log("Managed accounts canceled successfully.");
        } catch (error) {
          console.error("Error canceling subscription:", error);
          return res.status(500).send("Error canceling subscription.");
        }
        break;
      }

      default:
        console.log(`Unhandled event type: ${eventType}`);
    }

    res.sendStatus(200);
  };

  public addAccessUser: RequestHandler = async (req: Request, res: Response) => {
    const { accessEmail, adminId } = req.body;

    try {
      const adminSubscription = await getUserSubscription(adminId);

      const accessLimit =
        subscriptions.plans.find((plan) => plan.priceId === adminSubscription?.priceId)?.accessLimit || 0;

      const response = await addAccessEmail(accessEmail, adminId, accessLimit);

      let serviceResponse: any;
      if (response.success) {
        serviceResponse = ServiceResponse.success("Success!", response);
      } else {
        serviceResponse = ServiceResponse.failure("Error adding access email:", response, StatusCodes.UNAUTHORIZED);
      }

      return handleServiceResponse(serviceResponse, res);
    } catch (e: any) {
      console.error("Something went wrong!", e.message);
      const serviceResponse = ServiceResponse.failure("Something went wrong!", e.message);

      return handleServiceResponse(serviceResponse, res);
    }
  };

  public revokeAccessUser: RequestHandler = async (req: Request, res: Response) => {
    const { accessEmail, adminId } = req.body;

    try {
      const response = await revokeAccessEmail(accessEmail, adminId);

      let serviceResponse: any;
      if (response.success) {
        serviceResponse = ServiceResponse.success("Success!", response);
      } else {
        serviceResponse = ServiceResponse.failure("Error revokin access email:", response, StatusCodes.UNAUTHORIZED);
      }

      return handleServiceResponse(serviceResponse, res);
    } catch (e: any) {
      console.error("Something went wrong!", e.message);
      const serviceResponse = ServiceResponse.failure("Something went wrong!", e.message);

      return handleServiceResponse(serviceResponse, res);
    }
  };
}

export const stripeController = new StripeController();
