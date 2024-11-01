import { db } from "@/firebase";
import { firestore } from "firebase-admin";

// Define interfaces for the tokens and user
interface Tokens {
  accessToken: string;
  refreshToken: string;
  timestamp: firestore.Timestamp;
}

// Save tokens in Firestore
async function saveTokens(userId: string, accessToken: string, refreshToken: string): Promise<void> {
  try {
    await db.collection("zoomTokens").doc(userId).set({
      accessToken,
      refreshToken,
      timestamp: firestore.FieldValue.serverTimestamp(), // For tracking token validity
    });
    console.log("Tokens saved successfully.");
  } catch (error) {
    console.error("Error saving tokens:", error);
  }
}

// Retrieve tokens from Firestore
async function getTokens(userId: string): Promise<Tokens | null> {
  try {
    const doc = await db.collection("zoomTokens").doc(userId).get();
    if (!doc.exists) {
      console.log("No tokens found for the user.");
      return null;
    }
    return doc.data() as Tokens;
  } catch (error) {
    console.error("Error retrieving tokens:", error);
    return null;
  }
}

// Update tokens in Firestore
async function updateTokens(userId: string, newAccessToken: string, newRefreshToken: string): Promise<void> {
  try {
    await db.collection("zoomTokens").doc(userId).update({
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
      timestamp: firestore.FieldValue.serverTimestamp(),
    });
    console.log("Tokens updated successfully.");
  } catch (error) {
    console.error("Error updating tokens:", error);
  }
}

export { saveTokens, getTokens, updateTokens };
