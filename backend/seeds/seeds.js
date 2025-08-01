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
const TABLE_NAME = "Seeds";

exports.handler = async (event) => {
  const { httpMethod, path, pathParameters, body } = event;
  console.log("Received event:", JSON.stringify(event, null, 2));

  try {
    const userid_fromauth = event.requestContext?.authorizer?.uid;

    //Get all seeds
    if (httpMethod === "GET" && path === "/seeds/all") {
      const result = await client.send(
        new ScanCommand({
          TableName: TABLE_NAME,
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
            ":uid": userid_fromauth,
          },
        })
      );
      return response(200, result.Items);
    }

    //Add a plant
    if (httpMethod === "POST" && path === "/seed") {
      const new_seed = JSON.parse(body);
      new_seed.userid = userid_fromauth;
      new_seed.created = new Date().toISOString();
      if (new_seed.subtype) 
        new_seed.subtype = new_seed.subtype.trim();

      //create the new plant
      await client.send(
        new PutCommand({
          TableName: TABLE_NAME,
          Item: new_seed,
        })
      );

      await updatePlantTypes(new_seed.type, new_seed.subtype);
      return response(201, { message: `Seed row created.`, created: new_seed.created });
    }

    //Update a plant
    if (httpMethod === "PUT" && path === "/seed") {
      const new_seed = JSON.parse(body);
      new_seed.userid = userid_fromauth;
      if (new_seed.subtype) 
        new_seed.subtype = new_seed.subtype.trim();

      if (new_seed.userid != userid_fromauth)
        return {
          statusCode: 403,
          body: "Unauthorized",
        };

      //update a plant
      await client.send(BuildUpdateCommand(
        TABLE_NAME,
        new_seed,
        ["userid", "created"]
      ));

      await updatePlantTypes(new_seed.type, new_seed.subtype);
      return response(200, { message: `Seed row updated.` });
    }

    //Delete a plant
    if (httpMethod === "DELETE" && path === "/seed") {
      const seed = JSON.parse(body);

      //delete a plant
      await client.send(
        new DeleteCommand({
          TableName: TABLE_NAME,
          Key: { userid: userid_fromauth, created: seed.created },
        })
      );
      return response(200, { message: `Seed row deleted.` });
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

function BuildUpdateCommand(table_name, item, primary_keys = ["id", "created"]) {

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

async function updatePlantTypes(type, subtype) {
  if (!type) return;
  else if (!subtype) {
    const result = await client.send(
      new QueryCommand({
        TableName: "PlantTypes",
        KeyConditionExpression: `#t = :pkValue`,
        ExpressionAttributeValues: {
          ":pkValue": type,
        },
        ProjectionExpression: "#s",
        ExpressionAttributeNames: {
          "#t": "type",
          "#s": "subtype",
        },
      })
    );

    //insert new type if it does not exist
    if (result.Count == 0) {
      return await client.send(
        new PutCommand({
          TableName: "PlantTypes",
          Item: { type: type, subtype: ' ' },
        })
      );
    }
  } else {
    const result = await client.send(
      new GetCommand({
        TableName: "PlantTypes",
        Key: {
          type: type,
          subtype: subtype,
        },
      })
    );

    if (undefined == result.Item) {
      return await client.send(
        new PutCommand({
          TableName: "PlantTypes",
          Item: { 
            type: type, 
            subtype: subtype 
          },
        })
      );
    }
  }
}