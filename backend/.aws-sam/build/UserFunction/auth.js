// auth/auth.js
const admin = require("firebase-admin");

// Initialize once
if (!admin.apps.length) {
  admin.initializeApp();
}

exports.handler = async (event) => {
  const token = event.headers?.Authorization?.split("Bearer ")[1];

  if (!token) {
    return {
      isAuthorized: false,
    };
  }

  try {
    const decodedToken = await admin.auth().verifyIdToken(token);
    return {
      isAuthorized: true,
      context: {
        user: decodedToken,
      },
    };
  } catch (err) {
    console.error("Auth error", err);
    return {
      isAuthorized: false,
    };
  }
};
