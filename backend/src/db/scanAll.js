const { ScanCommand } = require('@aws-sdk/lib-dynamodb');
const { getDocClient } = require('./client');

async function scanAllPages(params) {
  const client = getDocClient();
  const items = [];
  let lastKey;

  do {
    const res = await client.send(
      new ScanCommand({
        ...params,
        ExclusiveStartKey: lastKey
      })
    );
    if (res.Items?.length) items.push(...res.Items);
    lastKey = res.LastEvaluatedKey;
  } while (lastKey);

  return items;
}

module.exports = { scanAllPages };
