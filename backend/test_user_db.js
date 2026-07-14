require('dotenv').config();
const { createClients } = require('./src/db/client');
const { QueryCommand } = require('@aws-sdk/lib-dynamodb');
const { usersTable } = require('./src/db/tables');

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
      console.log(`Email: ${item.email}, mustChangePassword: ${item.mustChangePassword}`);
    }
  } catch (e) {
    console.error(e);
  }
})();
