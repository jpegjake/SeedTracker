const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const {
  DynamoDBDocumentClient,
  GetCommand,
  QueryCommand,
  PutCommand,
  DeleteCommand,
  UpdateCommand,
  ScanCommand,
} = require("@aws-sdk/lib-dynamodb");

const client = DynamoDBDocumentClient.from(
  new DynamoDBClient({ region: "us-west-2" })
);
const TABLE_NAME = "Users";

exports.handler = async (event) => {
  const { httpMethod, path, pathParameters, body } = event;
  console.log("Received event:", JSON.stringify(event, null, 2));

  try {
    const userid_fromauth = event.requestContext?.authorizer?.uid;
    console.log("User from auth:", JSON.stringify(event.requestContext?.authorizer));
    console.log("User ID from auth:", userid_fromauth);
    
    //Get one user by ID
    if (httpMethod === "GET" && path === '/user') {
      const result = await client.send(
        new GetCommand({
          TableName: TABLE_NAME,
          Key: { id: userid_fromauth },
        })
      );

      if (!result.Item)
        return response(404, { error: "User not found" });
      else
        delete result.Item.id; // remove internal id from response

      return response(200, result.Item);
    }

    //Add or update a user
    if (httpMethod === "POST" && path === '/user') {
      const user = JSON.parse(body);
      user.id = userid_fromauth;
      user.updated = new Date().toISOString();

      const result = await client.send(
        new QueryCommand({
          TableName: TABLE_NAME,
          KeyConditionExpression: "#u = :useridVal",
          ExpressionAttributeNames: {
            "#u": "id",
          },
          ExpressionAttributeValues: {
            ":useridVal": userid_fromauth,
          },
        })
      );

      //if the user already exists, perform update
      if (result.Items && result.Items.length > 0) {

        await client.send(
          BuildUpdateCommand(TABLE_NAME, item, ["id"])
        );

        return response(201, { message: `User updated` });

      } else {

        user.created = new Date().toISOString();
        await client.send(
          new PutCommand({
            TableName: TABLE_NAME,
            Item: user,
          })
        );

        return response(201, { message: `User created.` });

      }

    }

    //Delete a user
    if (httpMethod === "DELETE" && path === "/user") {
            
      await client.send(
        new DeleteCommand({
          TableName: TABLE_NAME,
          Key: { id: userid_fromauth },
        })
      );

      //TODO delete account from Firebase
      //await admin.auth().deleteUser(userid_fromauth);

      return response(200, { message: `User ${userid_fromauth} deleted` });
    }

    return response(404, { error: "Route not found" });

  } catch (err) {

    console.error(err);
    return response(500, {
      error: "Internal Server Error",
      detail: err.message,
    });

  }
};

function response(statusCode, body) {
  return {
    statusCode,
    body: JSON.stringify(body),
    headers: { "Access-Control-Allow-Origin": "*" },
  };
}

function BuildUpdateCommand(
  table_name,
  item,
  primary_keys = ["id"]
) {
  // Extract keys to update (exclude key fields)
  const updates = Object.keys(item).filter((k) => !primary_keys.includes(k));

  const UpdateExpression =
    "SET " + updates.map((k, i) => `#k${i} = :v${i}`).join(", ");
  const ExpressionAttributeNames = {};
  const ExpressionAttributeValues = {};

  updates.forEach((k, i) => {
    ExpressionAttributeNames[`#k${i}`] = k;
    ExpressionAttributeValues[`:v${i}`] = item[k];
  });

  // Build the key parameters for the command
  const key_params = {};
  for (const key of primary_keys) {
    key_params[key] = item[key];
  }

  // Build the command
  return new UpdateCommand({
    TableName: table_name,
    Key: key_params,
    UpdateExpression,
    ExpressionAttributeNames,
    ExpressionAttributeValues,
  });
}