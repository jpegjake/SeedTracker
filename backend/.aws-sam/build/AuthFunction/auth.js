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
    
    const secret = JSON.parse(response.SecretString);

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
    const authHeader = 
      event.headers?.Authorization || event.headers?.authorization;
    console.log('Authorization header:', authHeader);

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return { statusCode: 401, body: "Missing or invalid Authorization header" };
    }
    const idToken = authHeader.split(' ')[1];

    console.log('Extracted ID Token:', idToken);

    // ✅ VERIFY the token
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    const uid = decodedToken.uid;

    console.log('Authenticated user UID:', uid);

    // ✅ Continue with authenticated logic
    return {
      statusCode: 200,
      body: decodedToken 
    };

  } catch (err) {

    console.error('Auth error:', err);
    return {
      statusCode: 403,
      body: 'Unauthorized'
    };
      
  }
}