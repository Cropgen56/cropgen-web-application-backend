import admin from "firebase-admin";
import serviceAccount from "./cropgen-4551-firebase-adminsdk-fbsvc-d3594b16b6.json" assert { type: "json" };

// Initialize Firebase Admin SDK
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
  console.log("Firebase Admin initialized");
}

export default admin;
