import * as admin from "firebase-admin";
import serviceAccount from "firebase-service-account.json"; // Path to your service account

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount as admin.ServiceAccount),
});

const db = admin.firestore(); // Firestore instance

export { db };
