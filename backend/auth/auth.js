// This section of the code runs once when the Lambda container is initialized ("cold start").
// This is the ideal place to handle dependencies and expensive operations like
// fetching secrets or initializing the Firebase Admin SDK.

const {
  SecretsManagerClient,
  GetSecretValueCommand,
} = require("@aws-sdk/client-secrets-manager");
const admin = require("firebase-admin");

let isInitialized = false;

// Function to initialize the Firebase app by fetching credentials from Secrets Manager.
const initializeApp = async () => {
  if (isInitialized) return; // Ensure initialization only happens once.

  try {
    const client = new SecretsManagerClient({ region: "us-west-2" }); // Ensure this region is correct
    const command = new GetSecretValueCommand({
      SecretId: "FirebaseAWS", // Your secret's name
    });
    const response = await client.send(command);

    if (!response.SecretString) {
      throw new Error("SecretString is undefined in Secrets Manager response.");
    }

    // Parse the secret string from Secrets Manager.
    // Assuming the secret itself is a JSON object with the required Firebase keys.
    const secret = JSON.parse(response.SecretString);

    // Check for required fields to prevent initialization errors
    if (
      !secret ||
      !secret.project_id ||
      !secret.client_email ||
      !secret.private_key
    ) {
      throw new Error("Malformed secret: Missing required Firebase fields.");
    }

    // Initialize the Firebase Admin SDK with the fetched credentials
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: secret.project_id,
        clientEmail: secret.client_email,
        // The private key often contains escaped newlines; this replaces them correctly.
        privateKey: secret.private_key.replace(/\\n/g, "\n"),
      }),
    });

    isInitialized = true;
    console.log("Firebase Admin SDK initialized successfully.");
  } catch (err) {
    console.error("Failed to initialize Firebase Admin SDK:", err);
    // Rethrow the error so the Lambda fails on a cold start if initialization fails.
    throw err;
  }
};

// Immediately call the initialization function. This will run only once during the cold start.
let initializationPromise = initializeApp();

// Helper function to generate an IAM policy
function generatePolicy(principalId, effect, resource) {
  const policyDocument = {
    Version: "2012-10-17",
    Statement: [
      {
        Action: "execute-api:Invoke",
        Effect: effect,
        Resource: resource,
      },
    ],
  };
  return policyDocument;
}

// The main handler function for the Lambda authorizer
exports.handler = async (event) => {
  try {
    // Wait for the global initialization to complete before processing the request.
    // This handles the first invocation on a new container.
    await initializationPromise;

    console.log("Received event:", JSON.stringify(event, null, 2));

    const authHeader = event.authorizationToken || event.AuthorizationToken;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      // Throw a proper Error object for better logging and consistency.
      throw new Error("Missing or invalid Authorization header");
    }

    const idToken = authHeader.split(" ")[1];

    console.log("Extracted ID Token:", idToken);

    // Verify the ID token using the Firebase Admin SDK
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    console.log("Authenticated user UID:", decodedToken.uid);

    const policyDocument = generatePolicy(
      decodedToken.uid,
      "Allow",
      event.methodArn
    );

    const returnObject = {
      principalId: decodedToken.uid,
      policyDocument: policyDocument,
      context: {
        uid: decodedToken.uid,
        email: decodedToken.email,
      },
    };

    console.log("Generated policy:", JSON.stringify(returnObject, null, 2));

    return returnObject;
  } catch (err) {
    console.error("Authorization error:", err);
    // Return a Deny policy for any authorization failure.
    return {
      principalId: "user",
      policyDocument: generatePolicy("user", "Deny", event.methodArn),
    };
  }
};
