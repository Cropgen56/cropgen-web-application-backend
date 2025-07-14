import admin from "firebase-admin";

// Dynamically import the JSON file
const serviceAccountPromise = import(
  "./cropgen-4551-firebase-adminsdk-fbsvc-d3594b16b6.json",
  {
    with: { type: "json" },
  }
);

// Initialize Firebase Admin SDK
serviceAccountPromise.then(({ default: serviceAccount }) => {
  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
    console.log("Firebase Admin initialized");
  }
});

// Export admin (optional, depending on your use case)
export default admin;
