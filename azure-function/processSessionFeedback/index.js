const { CosmosClient } = require("@azure/cosmos");
const admin = require('firebase-admin');

let cosmosClient;
let container;
let firestoreClient;

function initClients(context, name) {
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
    context.log.info("CosmosClient 및 container 초기화 완료");
  }
  if (!firestoreClient) {
    let serviceAccountJson;
    try {
      serviceAccountJson = process.env["FIREBASE_SERVICE_ACCOUNT_JSON"];
      if (!serviceAccountJson) {
        throw new Error("환경변수 FIREBASE_SERVICE_ACCOUNT_JSON 미설정");
      }
      const serviceAccountObj = JSON.parse(serviceAccountJson);
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccountObj)
      });
      firestoreClient = admin.firestore();
      context.log.info("Firebase Admin 초기화 완료");
    } catch (err) {
      context.log.error("Firebase Admin 초기화 실패:", err);
      throw err;
    }
  }
}

async function getUserInfo(context, db, uid, now) {
  try {
    const docSnap = await db.collection('trustScore').doc(uid).get();
    if (!docSnap.exists) {
      context.log.warn(`trustScore에 유저 문서 없음: ${uid}`);
      return { duration: 0, submitted: 0, bias: 0 };
    }
    const data = docSnap.data();
    if (!data.createdAt || typeof data.createdAt.seconds !== 'number') {
      context.log.warn(`createdAt 필드 이상: ${uid}`, data.createdAt);
      return { duration: 0, submitted: data.submitted || 0, bias: data.bias || 0 };
    }
    const duration = Math.floor((now - data.createdAt.seconds) / 86400);
    const submitted = data.submitted || 0;
    const bias = data.bias || 0;
    return { duration, submitted, bias };
  } catch (err) {
    context.log.error(`getUserInfo 오류 uid=${uid}:`, err);
    throw err;
  }
}

async function getValidationCases(context) {
  try {
    const { resources: rows } = await container.cases.items
        .query("SELECT TOP 1 c['value'] FROM c WHERE c.id = 'validation'")
        .fetchAll();
    if (!rows || rows.length === 0) {
      context.log.warn("validation 케이스 없음");
      return {};
    }
    let arr;
    try {
      arr = JSON.parse(rows[0].value);
    } catch (e) {
      context.log.error("validationCases JSON 파싱 실패:", e);
      return {};
    }
    if (!Array.isArray(arr)) {
      context.log.warn("validationCases 값이 배열 아님");
      return {};
    }
    const result = {};
    arr.forEach(item => {
      const { from_sense, to_sense, sim } = item;
      if (from_sense == null || to_sense == null) {
        context.log.warn("validation 항목 필드 누락:", item);
        return;
      }
      if (result[from_sense] === undefined) {
        result[from_sense] = {};
      }
      result[from_sense][to_sense] = sim;
    });
    return result;
  } catch (err) {
    context.log.error("getValidationCases 전체 오류:", err);
    throw err;
  }
}

function getTrustScore(duration, submitted, bias) {
  let trustScore = 1;

  if (duration < 15) {
    trustScore *= 0.7;
  } else if (duration < 60) {
    trustScore *= 0.8;
  } else if (duration < 90) {
    trustScore *= 0.9;
  }

  if (submitted < 20) {
    trustScore *= 0.5;
  } else if (submitted < 50) {
    trustScore *= 0.7;
  } else if (submitted < 100) {
    trustScore *= 0.9;
  }

  if (bias < 0.1) {
    trustScore *= 1;
  } else if (bias < 0.2) {
    trustScore *= 0.8;
  } else if (bias < 0.3) {
    trustScore *= 0.5;
  } else {
    trustScore *= 0.3;
  }

  return trustScore;
}

function accumulator(sumObject, value, trustScore, uid, from_sense, to_sense) {
  if (sumObject == null) {
    return {
      id: `${from_sense}-${to_sense}`,
      from_sense,
      to_sense,
      valueSum: value * trustScore,
      trustScoreSum: trustScore,
      users: { [uid]: value }
    };
  } else {
    if (sumObject.users[uid] === undefined) {
      sumObject.users[uid] = value;
      sumObject.valueSum += value * trustScore;
      sumObject.trustScoreSum += trustScore;
    }
    return sumObject;
  }
}

async function updateUserTrustScore(context, db, uid, submitted, bias) {
  try {
    await db.collection('trustScore').doc(uid).update({ submitted, bias });
    context.log.info(`${uid} trustScore 업데이트: submitted=${submitted}, bias=${bias}`);
    return true;
  } catch (error) {
    context.log.error(`${uid} trustScore 업데이트 실패:`, error);
    return false;
  }
}

module.exports = async function (context, input) {
  context.log.info("processSessionFeedback Activity 시작");
  initClients(context);
  const db = firestoreClient;
  const now = Math.floor(Date.now() / 1000);
  const requireTrustScore = parseInt(process.env['requireTrustScore'], 10) || 3;

  let aggFeedback = {};
  // const trustScoreUpdates = {};

  // 검증용 케이스 로드
  const validationCases = await getValidationCases(context);

  // sessionFeedback에서 uid 조회
  let sessionUids;
  try {
    const queryResult = await container.sessionFeedback.items
        .query("SELECT DISTINCT VALUE c.uid FROM c")
        .fetchAll();
    sessionUids = queryResult.resources || [];
  } catch (err) {
    context.log.error("sessionFeedback distinct uid 조회 실패:", err);
    throw err;
  }

  // 각 uid별 처리
  for (const uid of sessionUids) {
    let userInfo;
    try {
      userInfo = await getUserInfo(context, db, uid, now);
    } catch (err) {
      context.log.error(`getUserInfo 실패 uid=${uid}:`, err);
      continue;
    }
    let { duration, submitted, bias } = userInfo;

    // 해당 uid의 feedback 항목 조회
    let feedbacks;
    try {
      const { resources } = await container.sessionFeedback.items
          .query(
            {
              query: "SELECT * FROM c WHERE c.uid = @uid",
              parameters: [{ name: "@uid", value: uid }]
            },
            { partitionKey: uid }
          )
          .fetchAll();
      feedbacks = resources || [];
    } catch (err) {
      context.log.error(`feedbacks 조회 실패 uid=${uid}:`, err);
      continue;
    }

    // 각 feedback 처리
    for (const feedback of feedbacks) {
      const validationAnswers = [];
      const testAnswers = [];
      // answers 배열 분류
      if (Array.isArray(feedback.answers)) {
        feedback.answers.forEach(answer => {
          const { from_sense, to_sense, value } = answer;
          if (!validationCases[from_sense] || validationCases[from_sense][to_sense] === undefined) {
            testAnswers.push({ from_sense, to_sense, value });
          } else {
            validationAnswers.push({ from_sense, to_sense, value });
          }
        });
      } else {
        context.log.warn(`answers 형식 이상 uid=${uid}, feedback id=${feedback.id}`);
      }

      // 검증용 응답으로 bias 및 submitted 업데이트
      if (validationAnswers.length) {
        validationAnswers.forEach(answer => {
          const { from_sense, to_sense, value } = answer;
          const correctSim = validationCases[from_sense][to_sense];
          bias += ((Math.abs(correctSim - value) - bias) / (submitted + 1));
          submitted += 1;
        });
        const trustScore = getTrustScore(duration, submitted, bias);
        const ok = await updateUserTrustScore(context, db, uid, submitted, bias);
        if (!ok) {
          context.log.warn(`trustScore 업데이트 실패 uid=${uid}`);
        }
        userInfo.trustScore = trustScore;
      } else {
        userInfo.trustScore = getTrustScore(duration, submitted, bias);
      }

      // 실제 문항 응답 집계
      for (const answer of testAnswers) {
        const { from_sense, to_sense, value } = answer;
        const relationId = `${from_sense}-${to_sense}`;
        const trustScore = userInfo.trustScore;
        aggFeedback[relationId] = accumulator(
          aggFeedback[relationId],
          value,
          trustScore,
          uid,
          from_sense,
          to_sense
        );
      }
    }
  }

  try {
    // aggFeedback 에 존재하는 모든 key 수집
    const keys = Object.keys(aggFeedback);
    const idsFromIncomplete = new Set();

    if (keys.length) {
      const BATCH_SIZE = 50;
      for (let i = 0; i < keys.length; i += BATCH_SIZE) {
        const batch = keys.slice(i, i + BATCH_SIZE);

        const parameters = batch.map((k, idx) => ({ name: `@id${idx}`, value: k }));
        const inClause  = batch.map((_, idx) => `@id${idx}`).join(", ");
        const querySpec = {
          query: `SELECT * FROM c WHERE c.id IN (${inClause})`,
          parameters
        };

        // incompleteFeedback에서 기존 문서 조회
        const { resources: rows = [] } =
          await container.incompleteFeedback.items.query(querySpec).fetchAll();

        // incompleteFeedback과 sessionFeedback의 데이터 결합
        rows.forEach(doc => {
          const key = doc.id;
          idsFromIncomplete.add(key);

          if (aggFeedback[key] !== undefined) {
            const mergedFeedback = aggFeedback[key]
            mergedFeedback.valueSum += doc.valueSum;
            mergedFeedback.trustScoreSum += doc.trustScoreSum;
          }

          // users 객체 병합
          if (doc.users) {
            Object.entries(doc.users).forEach(([uid, val]) => {
              if (A.users[uid] === undefined) {
                A.users[uid] = val;
              }
            });
          }
          aggFeedback[key] = A;
        });
      }
      } context.log.info(`incompleteFeedback 병합 완료: ${Object.keys(idsFromIncomplete).length}개`);
  } catch (err) {
    context.log.error("incompleteFeedback 병합 과정 오류:", err);
    throw err;
  }

  // 최종 completeCases 및 incompleteCases 구성
  const completeCases = [];
  const deleteCases = [];
  const incompleteCases = [];
  const changedIds = [];

  for (const key of Object.keys(aggFeedback)) {
    const entry = aggFeedback[key];
    if (entry.valueSum >= requireTrustScore) {
      const data = {
          from_sense: entry.from_sense,
          to_sense: entry.to_sense,
          value: entry.valueSum / entry.trustScoreSum
        }; 

      if (Math.abs(data.value) < 0.65) {
        deleteCases.push(data);
      } else {
        completeCases.push(data); 
      }

      if (idsFromIncomplete.has(key)) {
        changedIds.push(key);
      }
    } else {
      incompleteCases.push(entry);
    }
  }

  context.log.info("processSessionFeedback Activity 완료", {
    completeCasesCount: completeCases.length,
    incompleteCasesCount: incompleteCases.length,
    changedIdsCount: changedIds.length
  });
  return { completeCases, deleteCases, incompleteCases, changedIds };
};
