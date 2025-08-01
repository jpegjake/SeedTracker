const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  DeleteCommand,
  UpdateCommand,
  ScanCommand,
} = require("@aws-sdk/lib-dynamodb");

const client = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const TABLE_NAME = "Users";

exports.handler = async (event) => {
  const { httpMethod, path, pathParameters, body } = event;

  try {    
    const userid_fromauth = event.requestContext.authorizer.user.uid;

    //Get one user by ID
    if (httpMethod === "GET" && path === '/user') {
      const result = await client.send(
        new ScanCommand({
          TableName: TABLE_NAME,
          Key: { id: userid_fromauth },
        })
      );
      return response(200, result.Items);
    }

    //Add or update a user
    if (httpMethod === "POST" && path === '/user') {
      const user = JSON.parse(body);

      if (user.id != userid_fromauth)
        return {
          statusCode: 403,
          body: "Unauthorized",
        };

      const result = await client.send(
        new ScanCommand({
          TableName: TABLE_NAME,
          FilterExpression: "#u = :useridVal",
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
          new PutCommand({
            TableName: TABLE_NAME,
            Item: user,
          })
        );

        return response(201, { message: `User ${userid_fromauth} updated` });

      } else {

        await client.send(
          new PostCommand({
            TableName: TABLE_NAME,
            Item: user,
          })
        );

        return response(201, { message: `User ${userid_fromauth} created.` });

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