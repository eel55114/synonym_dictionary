const { container } = require("./cosmosClient");


/** SqlQuerySpec을 받아 어휘 문서 배열을 반환
 * 
 * @param {*} querySpec 
 * @returns 
 */
async function _queryWord(querySpec) {
    try {
        const {resources: items} = await container.wordData
            .items.query(querySpec, {enableCrossPartitionQuery: true})
            .fetchAll();

        return items;
    } catch (error) {
        console.error(`Error occured in DB query function _queryWord: ${error.message}`);
    }
}

/**문자열을 받아 해당 문자열을 표제어로 가진 어휘 문서 배열을 반환
 * 
 * @param {string} word 
 * @returns 
 */
async function queryWordByName(word) {
    const querySpec = {
        query: "SELECT c.id, c.word_info.pos_info[0].comm_pattern_info[0].sense_info[0].definition \
    FROM c where c.word_info.word = @word",
        parameters: [{name: `@word`, value: word}]
    }
    return await _queryWord(querySpec);
}
/**정수를 받아 해당 정수를 wordId로 갖는 어휘 문서 배열(길이 1)을 반환
 * 
 * @param {number} wordId 
 * @returns 
 */
async function queryWordById(wordId) {
    const querySpec = {
        query: "SELECT TOP 1 c.word_info FROM c where c.id = @wordId",
        parameters: [{name: `@wordId`, value: wordId}]
    }
    return await _queryWord(querySpec);
}

/** Firebase UID를 받아 sessionFeedback에 저장된 제출이 있는지 확인
 * 
 * @param {string} uid 
 * @returns 
 */
async function isAlreadySubmitted(uid) {
  const querySpec = {
    query: "SELECT TOP 1 1 FROM c where c.uid = @uid",
    parameters: [{name: `@uid`, value: uid}]
  }
  try {
    const {resources: item} = await container.sessionFeedback
        .items.query(querySpec, { partitionKey: uid })
        .fetchAll();

    return item.length > 0;
  } catch (error) {
    console.error(`Error occurred in DB query function isAlreadySubmitted: ${error.message}`);
  }
}

/** Firebase UID, 응답, 응답 유형을 받아 sessionFeedback에 저장
 * 
 * @param {*} uid 
 * @param {*} answers 
 * @param {*} feedbackType 
 */
async function saveSessionFeedback(uid, answers, feedbackType="session", feedbackName="session") {
  const doc = {
    id: `${uid}_${feedbackName}`,
    type: feedbackType,
    uid: uid,
    answers: answers
  };

  try {
    await container.sessionFeedback.items.create(doc);

  } catch (error) {
    console.error(`Error occurred in DB query function saveSessionFeedback: ${error.message}`);
  }
}

async function saveSingleFeedback(uid, from_sense_code, to_sense_code, similarity) {
  const doc = {
    id: `${uid}-${from_sense_code}-${to_sense_code}`,
    uid: uid,
    from_sense_code: from_sense_code,
    to_sense_code: to_sense_code,
    similarity: similarity
  }

  try {
    await container.singleFeedback.items.upsert(doc);

  } catch (error) {
    console.error(`Error occurred in DB query function saveSessionFeedback: ${error.message}`);
  }
}

/** 현재 Cosmos에 캐시된 케이스 찾기
 * 
 * @returns 
 */
async function getCase() {
  try {
    const {resources: testCases} = await container.cases
        .items.query("SELECT TOP 1 c['value'] FROM c WHERE c.id = 'test'")
        .fetchAll();
    const {resources: validationCases} = await container.cases
        .items.query("SELECT TOP 1 c['value'] FROM c WHERE c.id = 'validation'")
        .fetchAll();

    return {
      testCases: testCases[0].value,
      validationCases: validationCases[0].value
    };

  } catch (error) {
    console.error(`Error occurred in DB query function getCase: ${error.message}`);
  }
}

async function verifySenseCode(sense_code) {
  try {
    querySpec = {
      query: "SELECT 1 FROM c where c.sense_code in (@sense_code1, @sense_code2)",
      parameters: [
        {name: `@sense_code1`, value: sense_code[0]},
        {name: `@sense_code2`, value: sense_code[1]}
      ]
    }

    const {resources: testCases} = await container.senseInfo
      .items.query(querySpec)
      .fetchAll();

    return testCases.length == 2;

  } catch (error) {
    console.error(`Error occurred in DB query function getCase: ${error.message}`);
  }
}

// (async () => {
//     try {
//         const result = await getCase();
//         console.log("쿼리 결과:", result);
//     } catch (error) {
//         console.error("최상위 쿼리 실행 중 오류:", error.message);
//     }
// })();

module.exports = {
    queryWordByName,
    queryWordById,
    isAlreadySubmitted,
    saveSessionFeedback,
    saveSingleFeedback,
    getCase,
    verifySenseCode
};