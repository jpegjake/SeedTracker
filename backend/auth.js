const {
  SecretsManagerClient,
  GetSecretValueCommand,
} = require("@aws-sdk/client-secrets-manager");
const admin = require("firebase-admin");

exports.initializeApp = async () => {
  if (!admin.apps?.length) {
    const client = new SecretsManagerClient({ region: "us-west-2" }); // adjust region
    const command = new GetSecretValueCommand({
      SecretId: "FirebaseAWS",
    });
    const response = await client.send(command);
    const secret = JSON.parse(response.SecretString);

    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: secret.projectId,
        clientEmail: secret.clientEmail,
        privateKey: secret.privateKey.replace(/\\n/g, "\n"),
      }),
    });
  }
}
 
exports.handler = async (event) => {
  try {

    const authHeader = 
      event.headers?.Authorization || event.headers?.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return { statusCode: 401, body: "Missing or invalid Authorization header" };
    }
    const idToken = authHeader.split(' ')[1];

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