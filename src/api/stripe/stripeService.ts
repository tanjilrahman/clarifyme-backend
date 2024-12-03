import { db } from "@/firebase";
import { firestore } from "firebase-admin";

export interface DBUser {
  id: string; // Unique identifier for the user
  name: string; // Full name of the user
  email: string; // Email address of the user
  createdAt: Date; // Date the user was created
  updatedAt: Date; // Date the user was last updated
  subscription: SubscriptionUpdateData; // Nested subscription details
}

export interface SubscriptionUpdateData {
  status: "active" | "past_due" | "canceled" | "trialing";
  subscriptionId?: string | null;
  customerId?: string | null;
  priceId?: string | null;
  trialStart?: Date | null;
  trialEnd?: Date | null;
  lastPaymentDate?: Date | null;
  subscriptionType?: "managed" | "admin" | null;
  subscriptionAdmin?: string | null;
  accessEmails?: string[] | null; // Date the subscription was canceled
}

// Update user subscription in Firestore
export async function updateUserSubscription(userId: string, updateData: SubscriptionUpdateData): Promise<void> {
  try {
    const userDocRef = db.collection("users").doc(userId);

    // Update subscription details
    await userDocRef.set(
      {
        subscription: {
          ...updateData,
          updatedAt: firestore.FieldValue.serverTimestamp(),
        },
      },
      { merge: true },
    );

    console.log("User subscription updated successfully:", updateData);
  } catch (error) {
    console.error("Error updating user subscription:", error);
  }
}

export async function updateUserBySubscriptionId(
  subscriptionId: string,
  updateData: SubscriptionUpdateData,
): Promise<void> {
  try {
    // Query the Firestore collection to find the user with the given subscriptionId
    const querySnapshot = await db
      .collection("users") // Collection name
      .where("subscription.subscriptionId", "==", subscriptionId)
      .get();

    if (querySnapshot.empty) {
      console.log(`No user found with subscriptionId: ${subscriptionId}`);
      return;
    }

    // Assuming only one user has the given subscriptionId
    const userDoc = querySnapshot.docs[0];
    const userRef = userDoc.ref;

    // Update the user document with the provided update data
    await userRef.set(
      {
        subscription: {
          ...updateData,
          updatedAt: firestore.FieldValue.serverTimestamp(),
        },
      },
      { merge: true },
    );

    console.log(`User with subscriptionId ${subscriptionId} updated successfully.`);
  } catch (error) {
    console.error(`Error updating user with subscriptionId ${subscriptionId}:`, error);
  }
}

// Retrieve user subscription from Firestore
export async function getUserSubscription(userId: string): Promise<SubscriptionUpdateData | null> {
  try {
    const userDoc = await db.collection("users").doc(userId).get();
    if (!userDoc.exists) {
      console.log("No subscription found for the user.");
      return null;
    }
    return userDoc.data()?.subscription;
  } catch (error) {
    console.error("Error retrieving user subscription:", error);
    return null;
  }
}

// Add a new access email
export const addAccessEmail = async (
  accessEmail: string,
  adminId: string,
  limit: number,
): Promise<{ success: boolean; message: string }> => {
  try {
    // Fetch the admin user document
    const adminDoc = await db.collection("users").doc(adminId).get();

    if (!adminDoc.exists) {
      return { success: false, message: "Admin user not found." };
    }

    const adminData = adminDoc.data() as DBUser;

    // Ensure admin user has an active subscription and it's an admin subscription
    if (adminData.subscription.subscriptionType !== "admin") {
      return {
        success: false,
        message: "Admin user does not have an admin subscription.",
      };
    }

    // Check if the accessEmails array exists and is below the limit
    const accessEmails = adminData.subscription.accessEmails || [];
    if (accessEmails.length >= limit) {
      return { success: false, message: "Access email limit reached." };
    }

    // Ensure accessEmail is not already in the accessEmails array
    if (accessEmails.includes(accessEmail)) {
      return { success: false, message: "This email is already assigned." };
    }

    // Fetch the user document for the accessEmail
    const accessUserDoc = await db.collection("users").where("email", "==", accessEmail).get();

    if (accessUserDoc.empty) {
      return { success: false, message: "Access email user not found." };
    }

    const accessUserRef = accessUserDoc.docs[0].ref;
    const accessUserData = accessUserDoc.docs[0].data() as DBUser;

    // Check if the user already has a subscription
    if (accessUserData.subscription.subscriptionId) {
      return {
        success: false,
        message: "This user already has a subscription.",
      };
    }

    // Update the subscription for the accessEmail user
    const updatedSubscription: SubscriptionUpdateData = {
      ...adminData.subscription,
      subscriptionType: "managed",
      subscriptionAdmin: adminData.email,
      customerId: null,
      subscriptionId: null,
      accessEmails: null,
    };

    await accessUserRef.set(
      {
        subscription: updatedSubscription,
        updatedAt: new Date(),
      },
      { merge: true },
    );

    // Add the accessEmail to the admin's accessEmails array
    const updatedAccessEmails = [...accessEmails, accessEmail];
    await db
      .collection("users")
      .doc(adminId)
      .set(
        {
          subscription: {
            ...adminData.subscription,
            accessEmails: updatedAccessEmails,
            updatedAt: firestore.FieldValue.serverTimestamp(),
          },
        },
        { merge: true },
      );

    return { success: true, message: "Access email successfully added." };
  } catch (error) {
    console.error("Error adding access email:", error);
    return {
      success: false,
      message: "An error occurred while adding access email.",
    };
  }
};

// Revoke Access
export const revokeAccessEmail = async (
  accessEmail: string,
  adminId: string,
): Promise<{ success: boolean; message: string }> => {
  try {
    // Fetch the admin user document
    const adminDoc = await db.collection("users").doc(adminId).get();

    if (!adminDoc.exists) {
      return { success: false, message: "Admin user not found." };
    }

    const adminData = adminDoc.data() as DBUser;

    // Ensure admin user has an active admin subscription
    if (adminData.subscription.subscriptionType !== "admin") {
      return {
        success: false,
        message: "Admin user does not have an admin subscription.",
      };
    }

    const accessEmails = adminData.subscription.accessEmails || [];

    // Check if the email exists in the accessEmails array
    if (!accessEmails.includes(accessEmail)) {
      return { success: false, message: "This email is not assigned." };
    }

    // Fetch the user document for the accessEmail
    const accessUserDoc = await db.collection("users").where("email", "==", accessEmail).get();

    if (accessUserDoc.empty) {
      return { success: false, message: "Access email user not found." };
    }

    const accessUserRef = accessUserDoc.docs[0].ref;

    // Reset the subscription for the accessEmail user
    await accessUserRef.set(
      {
        subscription: {
          subscriptionType: null,
          subscriptionAdmin: null,
          subscriptionId: null,
          status: null,
          customerId: null,
          lastPaymentDate: null,
          trialStart: null,
          trialEnd: null,
          priceId: null,
          accessEmails: null,
        },
        updatedAt: firestore.FieldValue.serverTimestamp(),
      },
      { merge: true },
    );

    // Remove the accessEmail from the admin's accessEmails array
    const updatedAccessEmails = accessEmails.filter((email) => email !== accessEmail);

    await db
      .collection("users")
      .doc(adminId)
      .set(
        {
          subscription: {
            ...adminData.subscription,
            accessEmails: updatedAccessEmails,
            updatedAt: firestore.FieldValue.serverTimestamp(),
          },
        },
        { merge: true },
      );

    return { success: true, message: "Access email successfully revoked." };
  } catch (error) {
    console.error("Error revoking access email:", error);
    return {
      success: false,
      message: "An error occurred while revoking access email.",
    };
  }
};

export const updateManagedAccounts = async (
  updateData: SubscriptionUpdateData,
  managedEmails: string[],
  adminEmail: string | null,
) => {
  const batchSize = 500; // Firestore batch limit
  for (let i = 0; i < managedEmails.length; i += batchSize) {
    const batch = db.batch();

    const chunk = managedEmails.slice(i, i + batchSize);
    for (const email of chunk) {
      const userDoc = await getUserByEmail(email);
      if (userDoc) {
        const updatedSubscription = {
          ...updateData,
          subscriptionType: adminEmail ? "managed" : null,
          subscriptionAdmin: adminEmail,
        };

        batch.set(userDoc.ref, { subscription: updatedSubscription }, { merge: true });
      } else {
        console.error(`Managed account not found for email: ${email}`);
      }
    }

    await batch.commit();
  }
};

export const getAdminBySubscriptionId = async (subscriptionId: string) => {
  const adminSnapshot = await db
    .collection("users")
    .where("subscription.subscriptionId", "==", subscriptionId)
    .limit(1)
    .get();
  return adminSnapshot.empty ? null : adminSnapshot.docs[0];
};

export const getUserByEmail = async (email: string) => {
  const userSnapshot = await db.collection("users").where("email", "==", email).limit(1).get();
  return userSnapshot.empty ? null : userSnapshot.docs[0];
};
