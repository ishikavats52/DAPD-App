const dynamodbLocal = require('dynamodb-localhost');

console.log('Checking for local DynamoDB installation...');
dynamodbLocal.install(() => {
  console.log('Starting local DynamoDB on port 8000...');
  dynamodbLocal.start({
    port: 8000,
    cors: '*',
    sharedDb: true,
    delayTransientStatuses: true
  });
  console.log('Local DynamoDB is running on http://127.0.0.1:8000');
  console.log('Keep this terminal open, and run "npm run dev" in another terminal.');
});
