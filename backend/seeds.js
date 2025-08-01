const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  DeleteCommand,
  UpdateCommand,
  ScanCommand,
} = require("@aws-sdk/lib-dynamodb");
const initializeApp = require("./auth").initializeApp;

const client = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const TABLE_NAME = "Seeds";

const plantTypes = require("planttypes.js");

exports.handler = async (event) => {
  const { httpMethod, path, pathParameters, body } = event;
  await initializeApp();

  try {
    const userid_fromauth = event.requestContext?.authorizer?.user?.uid;

    //Get all seeds
    if (httpMethod === "GET" && path === "/seeds/all") {
      const result = await client.send(
        new QueryCommand({
          TableName: TABLE_NAME//,
          //ProjectionExpression:
          //  "type, subtype, qty, datePlanted, dateTransPlanted, notes",
        })
      );
      return response(200, result.Items);
    }

    //Get all seeds by user ID
    if (httpMethod === "GET" && path === "/seeds") {
      const result = await client.send(
        new QueryCommand({
          TableName: TABLE_NAME,
          KeyConditionExpression: "userid = :uid",
          ExpressionAttributeValues: {
            ":uid": { S: userid_fromauth },
          },
          ProjectionExpression:
            "type, subtype, qty, datePlanted, dateTransPlanted, notes",
        })
      );
      return response(200, result.Items);
    }

    //Add a plant
    if (httpMethod === "POST" && path === "/seed") {
      const new_seed = JSON.parse(body);
      new_seed.userid = user_result.body.uid;
      new_seed.timestamp = new Date().toISOString();
      //create the new plant
      await client.send(
        new PostCommand({
          TableName: TABLE_NAME,
          Item: new_seed,
        })
      );

      plantTypes.updatePlantTypes(new_seed.type, new_seed.subtype);
      return response(201, { message: `Seed row created.` });
    }

    //Update a plant
    if (httpMethod === "PUT" && path === "/seed") {
      const new_seed = JSON.parse(body);

      if (new_seed.userid != userid_fromauth)
        return {
          statusCode: 403,
          body: "Unauthorized",
        };

      //update a plant
      await client.send(
        new PutCommand({
          TableName: TABLE_NAME,
          Item: new_seed,
        })
      );

      plantTypes.updatePlantTypes(new_seed.type, new_seed.subtype);
      return response(201, { message: `Seed row updated.` });
    }

    //Delete a plant
    if (httpMethod === "DELETE" && path === "/seed") {
      const seed = JSON.parse(body);

      if (seed.userid != userid_fromauth)
        return {
          statusCode: 403,
          body: "Unauthorized",
        };

      //delete a plant
      await client.send(
        new DeleteCommand({
          TableName: TABLE_NAME,
          Key: { userid: userid_fromauth, timestamp: seed.timestamp },
        })
      );
      return response(201, { message: `Seed row deleted.` });
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