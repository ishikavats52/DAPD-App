require('dotenv').config();
const { createClients } = require('./src/db/client');
const { QueryCommand, PutCommand } = require('@aws-sdk/lib-dynamodb');
const { usersTable } = require('./src/db/tables');
const User = require('./src/models/User');

(async () => {
  try {
    const docClient = createClients();
    const res = await docClient.send(new QueryCommand({
      TableName: usersTable(),
      IndexName: 'role-index',
      KeyConditionExpression: '#r = :r',
      ExpressionAttributeNames: { '#r': 'role' },
      ExpressionAttributeValues: { ':r': 'employee' }
    }));
    for (const item of res.Items) {
      item.mustChangePassword = true;
      await docClient.send(new PutCommand({ TableName: usersTable(), Item: item }));
      console.log(`Reset mustChangePassword to true for: ${item.email}`);
    }
  } catch (e) {
    console.error(e);
  }
})();
