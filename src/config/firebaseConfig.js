import admin from "firebase-admin";

const serviceAccountPromise = import(
  "./cropgen-4551-firebase-adminsdk-fbsvc-d3594b16b6.json",
  {
    with: { type: "json" },
  }
);

serviceAccountPromise.then(({ default: serviceAccount }) => {
  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
    console.log("Firebase Admin initialized");
  }
});

export default admin;
