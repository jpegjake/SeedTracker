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
const TABLE_NAME = "PlantTypes";

exports.handler = async (event) => {
  const { httpMethod, path, pathParameters, body } = event;
  console.log("Received event:", JSON.stringify(event, null, 2));

  try {
    //Get plant types, if type is specified, return subtypes, 
    // else return only unique base types.
    if (httpMethod === "GET" && path.startsWith("/planttypes")) {
      if (pathParameters && pathParameters.type) {
        const result = await client.send(
          new QueryCommand({
            TableName: TABLE_NAME,
            KeyConditionExpression: `#t = :pkValue`,
            ExpressionAttributeValues: {
              ":pkValue": pathParameters.type,
            },
            ProjectionExpression: "#s",
            ExpressionAttributeNames: {
              "#t": "type",
              "#s": "subtype",
            },
          })
        );

        return response(200, 
          result.Items
          .filter(item => item.subtype != ' ')
          .map(item => item.subtype)
        );
      }

      else {
        const result = await client.send(
          new ScanCommand({
            TableName: TABLE_NAME,
            ProjectionExpression: "#t",
            ExpressionAttributeNames: {
              "#t": "type",
            }
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