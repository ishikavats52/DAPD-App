const {
  CreateTableCommand,
  DescribeTableCommand,
  ResourceNotFoundException
} = require('@aws-sdk/client-dynamodb');
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient } = require('@aws-sdk/lib-dynamodb');
const { usersTable, medicinesTable, auditLogsTable } = require('./tables');

let rawClient;
let docClient;

function buildClientConfig() {
  const region = process.env.AWS_REGION?.trim();
  if (!region) {
    throw new Error('AWS_REGION is not set');
  }

  const config = { region };
  const endpoint = process.env.DYNAMODB_ENDPOINT?.trim();
  if (endpoint) {
    config.endpoint = endpoint;
  }

  if (process.env.AWS_ACCESS_KEY_ID?.trim() && process.env.AWS_SECRET_ACCESS_KEY?.trim()) {
    config.credentials = {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID.trim(),
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY.trim()
    };
  }

  return config;
}

function getRawClient() {
  if (!rawClient) {
    throw new Error('DynamoDB client is not initialized — call connectDB() first');
  }
  return rawClient;
}

function getDocClient() {
  if (!docClient) {
    throw new Error('DynamoDB client is not initialized — call connectDB() first');
  }
  return docClient;
}

function createClients() {
  rawClient = new DynamoDBClient(buildClientConfig());
  docClient = DynamoDBDocumentClient.from(rawClient, {
    marshallOptions: { removeUndefinedValues: true }
  });
  return docClient;
}

function closeClients() {
  rawClient = null;
  docClient = null;
}

const TABLE_DEFS = [
  {
    getName: usersTable,
    attributes: [
      { AttributeName: '_id', AttributeType: 'S' },
      { AttributeName: 'email', AttributeType: 'S' },
      { AttributeName: 'phone', AttributeType: 'S' },
      { AttributeName: 'createdBy', AttributeType: 'S' },
      { AttributeName: 'role', AttributeType: 'S' }
    ],
    keySchema: [{ AttributeName: '_id', KeyType: 'HASH' }],
    gsis: [
      {
        IndexName: 'email-index',
        KeySchema: [{ AttributeName: 'email', KeyType: 'HASH' }],
        Projection: { ProjectionType: 'ALL' }
      },
      {
        IndexName: 'phone-index',
        KeySchema: [{ AttributeName: 'phone', KeyType: 'HASH' }],
        Projection: { ProjectionType: 'ALL' }
      },
      {
        IndexName: 'createdBy-index',
        KeySchema: [{ AttributeName: 'createdBy', KeyType: 'HASH' }],
        Projection: { ProjectionType: 'ALL' }
      },
      {
        IndexName: 'role-index',
        KeySchema: [{ AttributeName: 'role', KeyType: 'HASH' }],
        Projection: { ProjectionType: 'ALL' }
      }
    ]
  },
  {
    getName: medicinesTable,
    attributes: [
      { AttributeName: '_id', AttributeType: 'S' },
      { AttributeName: 'tag', AttributeType: 'S' },
      { AttributeName: 'imageContentHash', AttributeType: 'S' },
      { AttributeName: 'createdBy', AttributeType: 'S' }
    ],
    keySchema: [{ AttributeName: '_id', KeyType: 'HASH' }],
    gsis: [
      {
        IndexName: 'tag-index',
        KeySchema: [{ AttributeName: 'tag', KeyType: 'HASH' }],
        Projection: { ProjectionType: 'ALL' }
      },
      {
        IndexName: 'imageContentHash-index',
        KeySchema: [{ AttributeName: 'imageContentHash', KeyType: 'HASH' }],
        Projection: { ProjectionType: 'ALL' }
      },
      {
        IndexName: 'createdBy-index',
        KeySchema: [{ AttributeName: 'createdBy', KeyType: 'HASH' }],
        Projection: { ProjectionType: 'ALL' }
      }
    ]
  },
  {
    getName: auditLogsTable,
    attributes: [{ AttributeName: '_id', AttributeType: 'S' }],
    keySchema: [{ AttributeName: '_id', KeyType: 'HASH' }],
    gsis: []
  }
];

async function tableExists(tableName) {
  try {
    await getRawClient().send(new DescribeTableCommand({ TableName: tableName }));
    return true;
  } catch (err) {
    if (err instanceof ResourceNotFoundException || err.name === 'ResourceNotFoundException') {
      return false;
    }
    throw err;
  }
}

async function createTable(def) {
  await getRawClient().send(
    new CreateTableCommand({
      TableName: def.getName(),
      AttributeDefinitions: def.attributes,
      KeySchema: def.keySchema,
      GlobalSecondaryIndexes: def.gsis.length ? def.gsis : undefined,
      BillingMode: 'PAY_PER_REQUEST'
    })
  );
}

async function ensureTables() {
  if (process.env.DYNAMODB_CREATE_TABLES !== 'true') return;

  for (const def of TABLE_DEFS) {
    const name = def.getName();
    if (await tableExists(name)) continue;
    await createTable(def);
    console.log(`  DynamoDB table created: ${name}`);
  }
}

async function verifyTables() {
  if (process.env.DYNAMODB_SKIP_VERIFY === 'true') return;

  for (const def of TABLE_DEFS) {
    const name = def.getName();
    if (!(await tableExists(name))) {
      throw new Error(
        `DynamoDB table "${name}" not found. Create it in AWS or set DYNAMODB_CREATE_TABLES=true for local DynamoDB.`
      );
    }
  }
}

module.exports = {
  createClients,
  getDocClient,
  getRawClient,
  closeClients,
  ensureTables,
  verifyTables
};
