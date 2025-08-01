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
const TABLE_NAME = "PlantTypes";

exports.handler = async (event) => {
  const { httpMethod, path, pathParameters, body } = event;
  await initializeApp();

  try {
    //Get plant types, if type is specified, return subtypes, 
    // else return only unique base types.
    if (httpMethod === "GET" && path.StartsWith("/planttypes")) {
      if (pathParameters && pathParameters.type) {
        const result = await client.send(
          new QueryCommand({
            TableName: TABLE_NAME,
            KeyConditionExpression: `type = :pkValue`,
            ExpressionAttributeValues: {
              ":pkValue": pathParameters.type,
            },
            ProjectionExpression: "subtype"
          })
        );

        return response(200, result.Items);
      }
      else {
        const result = await client.send(
          new QueryCommand({
            TableName: TABLE_NAME//,
            //ProjectionExpression: "type"
          })
        );
        
        const uniquePartitionKeyValues = [
          ...new Set(result.Items.map((item) => item["type"])),
        ];

        return response(200, uniquePartitionKeyValues);
      }
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

exports.updatePlantTypes = async function (type, subtype) {
  if (!type) return;
  else if (!subtype) {
    const result = await client.send(
      new QueryCommand({
        TableName: TABLE_NAME,
        KeyConditionExpression: `type = :pkValue`,
        ExpressionAttributeValues: {
          ":pkValue": pathParameters.type,
        },
        ProjectionExpression: "subtype",
      })
    );

    //insert new type if it does not exist
    if (result.length == 0) {
      await client.send(
        new PostCommand({
          TableName: TABLE_NAME,
          Item: { type: type, subtype: null },
        })
      );
    }
  } else {
    const result = await client.send(
      new GetCommand({
        TableName: TABLE_NAME,
        Key: {
          [partitionKeyName]: type,
          [sortKeyName]: subtype,
        },
      })
    );

    if (result.Items.length == 0) {
      await client.send(
        new PostCommand({
          TableName: TABLE_NAME,
          Item: { type: type, subtype: subtype },
        })
      );
    }
  }
};
