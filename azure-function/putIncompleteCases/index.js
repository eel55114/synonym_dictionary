const { CosmosClient, BulkOperationType, PatchOperationType } = require("@azure/cosmos");
let cosmosClient;
let container;

function findMatches(document, targetSense, targetLink) {
    const posList = document.word_info.pos_info || [];
    for (let i = 0; i < posList.length; i++) {
        const posInfo = posList[i];
        const commList = posInfo.comm_pattern_info || [];
        for (let j = 0; j < commList.length; j++) {
            const commPattern = commList[j];
            const senseList = commPattern.sense_info || [];
            for (let k = 0; k < senseList.length; k++) {
                const sense = senseList[k];
                if (sense.sense_code !== targetSense) {
                    continue;
                }
                const lexList = sense.lexical_info || [];
                for (let l = 0; l < lexList.length; l++) {
                    const lex = lexList[l];
                    if (lex.link_target_code == targetLink) {
                        return [i, j, k, l];
                    }
                }
                return [i, j, k];
            }
        }
    }
    return [];
}

module.exports = async function (context, name) {
  try {
    context.log("putIncompleteCases start");
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

    const {
        completeCases,
        incompleteCases,
        changedIds
    } = context.bindings;

    

    // sense_code와 word_id 매핑
    let senses = Set(); 
    completeCases.forEach(eachCase => {
        senses.add(eachCase.from_sense);
        senses.add(eachCase.to_sense);
    })

    const senseArr = Array.from(senses);
    let parameters = senseArr.map((k, idx) => ({ name: `@scode${idx}`, value: k }));
    let inClause = senseArr.map((_, idx) => `@scode${idx}`).join(", ");

    const { resources: ids } = await container.senseInfo.items
        .query({
            query: `SELECT c.sense_code, c.word_id FROM c WHERE c.id IN (${inClause})`,
            parameters
        })
        .fetchAll();

    parameters = ids.map((k, idx) => ({ name: `@wordid${idx}`, value: String(k.word_id) }));
    inClause = ids.map((_, idx) => `@wordid${idx}`).join(", ");

    const { resources: wordDatas } = await container.word.items
        .query({
            query: `SELECT * FROM c WHERE c.id IN (${inClause})`,
            parameters
        })
        .fetchAll();

    let senseToWord = {};
    ids.forEach(mapped => {
        senseToWord[mapped.sense_code] = mapped.word_id;
    });

    let wordidToDoc = {};
    wordDatas.forEach(doc => {
        const word_id = parseInt(doc.word_id);
        wordidToDoc[word_id] = doc;
    });


    
    const patchOperations = [];

    completeCases.forEach(eachCase => {
        const { from_sense, to_sense, value } = eachCase;

        const senses = [from_sense, to_sense];
        const wordIds = [senseToWord[from_sense], senseToWord[to_sense]];
        const docs = [wordidToDoc[wordIds[0]], wordidToDoc[wordIds[1]]];
        const words = [docs[0].word_info.word, docs[1].word_info.word];

        for (let i=0; i<2; i++) {
            const opposite = i ? 0 : 1;
            const idxs = findMatches(docs[i], senses[i], wordIds[opposite]);
            let op, path, patchValue;

            if (idxs.length == 4) {
                op = PatchOperationType.replace;
                path = `/word_info/pos_info/${idxs[0]}/comm_pattern_info/${idxs[1]}/sense_info/${idxs[2]}/lexical_info/${idxs[3]}/similarity`;
                patchValue = value;
            } else if (idxs.length == 3) {
                op = PatchOperationType.add;
                path = `/word_info/pos_info/${idxs[0]}/comm_pattern_info/${idxs[1]}/sense_info/${idxs[2]}/lexical_info/-`;
                patchValue = {
                    "link_target_code": wordIds[opposite],
                    "word": words[opposite],
                    "type": (value > 0) ? "비슷한말" : "반대말",
                    "similarity": value
                };
            }
            patchOperations.push({
                operationType: BulkOperationType.Patch,
                id: String(wordIds[i]),
                partitionKey: String(wordIds[i]),
                resourceBody: {
                    operations: [{
                        op: op,
                        path: path,
                        value: patchValue
                    }]
                }
            });
        }
    });

    deleteCases.forEach(eachCase => {
        const { from_sense, to_sense, value } = eachCase;

        const senses = [from_sense, to_sense];
        const wordIds = [senseToWord[from_sense], senseToWord[to_sense]];
        const docs = [wordidToDoc[wordIds[0]], wordidToDoc[wordIds[1]]];
        const words = [docs[0].word_info.word, docs[1].word_info.word];

        for (let i=0; i<2; i++) {
            const opposite = i ? 0 : 1;
            const idxs = findMatches(docs[i], senses[i], wordIds[opposite]);
            let op, path, patchValue;

            if (idxs.length == 4) {
                op = PatchOperationType.remove;
                path = `/word_info/pos_info/${idxs[0]}/comm_pattern_info/${idxs[1]}/sense_info/${idxs[2]}/lexical_info/${idxs[3]}`;
                patchValue = value;
            }
            patchOperations.push({
                operationType: BulkOperationType.Patch,
                id: String(wordIds[i]),
                partitionKey: String(wordIds[i]),
                resourceBody: {
                    operations: [{
                        op: op,
                        path: path,
                        value: patchValue
                    }]
                }
            });
        }
    });

    const patchResult = await container.wordData.items.executeBulkOperations(patchOperations);

    const operations = [];
    // incomplereCase 추가/업데이트
    incompleteCases.forEach(eachCase => {
        operations.push({
            operationType: BulkOperationType.Upsert,
            resourceBody: eachCase
        });
    });
    
    // 완료된 incomplereCase 삭제
    changedIds.forEach(id => {
        operations.push({
            operationType: BulkOperationType.Delete,
            id: id,
            partitionKey: id
        });
    });
    const updateResult = await container.incompleteFeedback.items.executeBulkOperations(operations);

    context.log("putIncompleteCases 완료:", patchResult, updateResult);

  } catch (err) {
    context.log.error("putIncompleteCases 예외 발생:", err);
    throw err;
  }
}
