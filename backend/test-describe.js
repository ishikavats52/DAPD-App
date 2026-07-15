const { DescribeTableCommand } = require('@aws-sdk/client-dynamodb');
const { getRawClient, createClients } = require('./src/db/client');
require('dotenv').config();

async function run() {
  createClients();
  try {
    const res = await getRawClient().send(new DescribeTableCommand({ TableName: 'dapd-users' }));
    console.log(JSON.stringify(res.Table, null, 2));
  } catch (err) {
    console.error(err);
  }
}
run();
