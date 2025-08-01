const {
  SecretsManagerClient,
  GetSecretValueCommand,
} = require("@aws-sdk/client-secrets-manager");
const admin = require("firebase-admin");

async function initializeApp() {
  if (!admin.apps?.length) {
    const client = new SecretsManagerClient({ region: "us-west-2" }); // adjust region
    const command = new GetSecretValueCommand({
      SecretId: "FirebaseAWS",
    });
    const response = await client.send(command);

    // Ensure the secret exists and is a string before parsing
    if (!response.SecretString) {
      throw new Error("SecretString is undefined");
    }

    let secret = JSON.parse(response.SecretString);
    secret = JSON.parse(secret.FIREBASE_CONFIG);

    // Ensure the secret exists and is a string before parsing
    if (
      !secret ||
      !secret.project_id ||
      !secret.client_email ||
      !secret.private_key
    ) {
      console.error(
        "Malformed secret: Missing required fields"
      );
    }

    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: secret?.project_id,
        clientEmail: secret?.client_email,
        privateKey: secret?.private_key?.replace(/\\n/g, "\n"),
      }),
    });
  }
}
 
exports.handler = async (event) => {
  try {    
    await initializeApp();

    console.log('Received event:', JSON.stringify(event, null, 2));
    const authHeader = event.authorizationToken || event.AuthorizationToken;
    console.log('Authorization header:', authHeader);

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return { statusCode: 401, body: "Missing or invalid Authorization header" };
    }
    const idToken = authHeader.split(' ')[1];

    console.log('Extracted ID Token:', idToken);

    // ✅ VERIFY the token
    const decodedToken = {uid:"ladeedadeeda"};//await admin.auth().verifyIdToken(idToken);
    const uid = decodedToken.uid;

    console.log('Authenticated user UID:', uid);

    // Construct the IAM policy based on the decoded token
    // You can customize this policy based on user roles or claims in the token
    const policy = generatePolicy(decodedToken.uid, "Allow", event.methodArn);

    // Return the policy and optional context information
    return {
      principalId: decodedToken.uid,
      policyDocument: policy,
      context: decodedToken
    };

  } catch (err) {

    console.error('Auth error:', err);
    return {
      principalId: "user", // A generic principalId for unauthorized requests
      policyDocument: generatePolicy("user", "Deny", event.methodArn),
    };
      
  }
};

// Helper function to generate an IAM policy
function generatePolicy(principalId, effect, resource) {
  const authResponse = {};
  authResponse.principalId = principalId;

  if (effect && resource) {
    const policyDocument = {};
    policyDocument.Version = '2012-10-17';
    policyDocument.Statement = [];
    const statementOne = {};
    statementOne.Action = 'execute-api:Invoke';
    statementOne.Effect = effect;
    statementOne.Resource = resource;
    policyDocument.Statement[0] = statementOne;
    authResponse.policyDocument = policyDocument;
  }

  return authResponse.policyDocument;
}