const { CosmosClient } = require("@azure/cosmos");
const dbConfig = require('./cosmosConfig');

const client = new CosmosClient({
  endpoint: dbConfig.endpoint,
  key: dbConfig.key
});

const database = client.database("wordData")

const container = {
  wordData: database.container("word"),
  senseInfo: database.container("sense_info"),
  singleFeedback: database.container("singleFeedback"),
  sessionFeedback: database.container("sessionFeedback"),
  cases: database.container("cases")
};

module.exports = { container };