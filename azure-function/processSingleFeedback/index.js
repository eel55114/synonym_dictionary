const { CosmosClient } = require("@azure/cosmos");
let cosmosClient;
let container;

module.exports = async function (context, name) {
  try {
    context.log("pSingle start");
    if (!cosmosClient) {
      const connStr = process.env["DOCDBCONNSTR_cosmos"];
      cosmosClient = new CosmosClient(connStr);
      const database = cosmosClient.database("wordData");
      container = {
        wordData: database.container("word"),
        senseInfo: database.container("sense_info"),
        singleFeedback: database.container("singleFeedback"),
        sessionFeedback: database.container("sessionFeedback"),
        incompleteFeedback: database.container("incompleteFeedback"),
        cases: database.container("cases")
      };
      context.log.info("CosmosClient 및 컨테이너 초기화 완료");
    }


    // singleFeedback에서 가장 오래된 제출부터 15개 추출
    const { resources: feedbacks } = await container.singleFeedback.items
        .query(
          "SELECT TOP 15 c.uid, c.from_sense, c.to_sense, c['value'] FROM c ORDER BY c._ts ASC",
          {enableCrossPartitionQuery: true}
        )
        .fetchAll();
    
    // sessionFeedback에 넘길 것
    const newFeedbacks = feedbacks.map(feedback => {
      return {
        id: `${feedback.uid}_${feedback.from_sense}-${feedback.to_sense}`,
        uid: feedback.uid,
        type: "single",
        answers: [{
          from_sense: feedback.from_sense,
          to_sense: feedback.to_sense,
          value: feedback.value,
        }]
      }
    });  

    // case 선정에 사용할 것
    const singleCases = feedbacks.map(feedback => {
      return {
        from_sense: feedback.from_sense,
        to_sense: feedback.to_sense,
        value: feedback.value
      }
    });

    context.log.info(`processSingleFeedback 완료: newFeedbacks/singleCases(${newFeedbacks.length})`);
    return {
      feedbacks: newFeedbacks,
      cases: singleCases
    };
  } catch (err) {
    context.log.error("processSingleFeedback 예외 발생:", err);
    throw err;
  }
}
