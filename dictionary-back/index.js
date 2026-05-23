const express = require("express");
const cors = require("cors");
const path = require('path');
const { default: axios } = require("axios");

const {
    queryWordByName,
    queryWordById,
    isAlreadySubmitted,
    saveSessionFeedback,
    saveSingleFeedback,
    verifySenseCode,
    getCase
} = require("./cosmosQuery");

const {
  authUser,
  getUserTrustScore
} = require("./firebaseQuery");


const app = express();
const PORT = 5001;

// 빌드된 React 앱을 서빙
app.use(express.static(path.join(__dirname, "..", 'build')));

app.use(cors({
  origin: "http://localhost",
  methods: ["GET", "POST"],
  credentials: true
}));

app.use(express.json({ limit: '10kb' })); // JSON 본문을 파싱
app.use(express.urlencoded({ limit: '1kb', extended: true })); // URL 인코딩된 데이터를 파싱

app.use((req, res, next) => {
  res.set('X-DNS-Prefetch-Control', 'off');
  next();
});

// 단어 검색 API: 검색어로 데이터 조회
app.get("/api/words", async (req, res) => {
  const queryWord = req.query.word;

  if (!queryWord) {
    return res.status(400).json({ message: "Query string not provided" });
  }
  
  const result = await queryWordByName(queryWord);
  console.log(result);

  if (result) {
    return res.status(200).json(result);
  } else {
    return res.status(404).json({ message: "Word not found" });
  }

});

app.get("/api/word/:wordId", async (req, res) => {
  let wordId = req.params.wordId

  try {
    parseInt(req.params.wordId);
  }
  catch {
    return res.status(400).json({ message: "Invalid query"});
  }

  console.log(wordId)
  const result = await queryWordById(wordId);
  console.log(result);

  if (result) {
    return res.status(200).json(result);
  } else {
    return res.status(404).json({ message: "No such word exists"});
  }

});


function getRandomItems(array, n) {
    const result = new Set();
    while (result.size < n) {
        const item = array[Math.floor(Math.random() * array.length)];
        result.add(item);
    }
    return Array.from(result);
}


app.get("/api/getsurvey", authUser, async (req, res) => {
  try {
    if (req.get('Purpose') === 'prefetch' || req.method === 'HEAD') {
      return res.status(204).end();
    }
    console.log("start getsurvey");
    console.log(await isAlreadySubmitted(req.user.uid));
    if (await isAlreadySubmitted(req.user.uid)){
      return res.status(409).json({ message: "The survey has already been submitted"});
    }
    console.log("not submitted");

    const userTrustScore = await getUserTrustScore(req.user.uid);

    const numCases = 10
    const numTests = Math.min(numCases-1, Math.floor(userTrustScore * numCases));
    const numValidations = Math.max(numCases-numTests, 1);
    console.log(userTrustScore);

    console.log(await getCase());
    const { testCases, validationCases } = await getCase();

    const data = getRandomItems(
      getRandomItems(JSON.parse(testCases), numTests)
      .concat(getRandomItems(JSON.parse(validationCases), numValidations)),
      numCases
    );
      
    return res.status(200).json(data);

  } catch(err) {
    console.log(err);
    return res.status(500).json({ message: "An error occurred during processing"});
  }
  
});

function verifySubmit(submitData) {
  try {
    return (Number.isInteger(submitData.from_sense)
      && Number.isInteger(submitData.to_sense)
      && submitData.value > -5
      && submitData.value < 5
    );
  } catch {
    return 0
  }
}

function scaleToSimilarity(num) {
  const table = {
    1: 0.65,
    2: 0.75,
    3: 0.85,
    4: 0.95
  };

  if (num === 0) {
    return 0;
  }
  const abs = Math.abs(num);
  const base = table[abs];
  return Math.sign(num) * base;
}

app.post("/api/submitsurvey", authUser, async (req, res) => {
  try {
    if (await isAlreadySubmitted(req.user.uid)){
      return res.status(409).json({ message: "The survey has already been submitted"});
    }

    const answers = req.body.answers;

    if (!answers.every(verifySubmit)) {
      return res.status(400).json({ message: "Invalid data"});
    }

    answers.forEach((answer) => {
      answer.value = scaleToSimilarity(value);
    })

    await saveSessionFeedback(req.user.uid, answers);
    return res.status(200).json({ message: "Successfully submited"});

  } catch(err) {
    console.log(err);
    return res.status(500).json({ message: "An error occurred during processing submitsurvey"});
  }
  
});
app.post("/api/submitFeedback", authUser, async (req, res) => {
  try {
    let {from_sense, to_sense, value } = req.body;

    try {
      from_sense = parseInt(from_sense, 10);
      to_sense = parseInt(to_sense, 10);
      if (!verifySenseCode(from_sense, to_sense)) {
        throw Error();
      }

    } catch {
      return res.status(400).json({ message: "Invalid code"});
    }

    value = scaleToSimilarity(value);
    if (from_sense > to_sense) {
      let temp = from_sense;
      from_sense = to_sense;
      to_sense = temp;
    }

    await saveSingleFeedback(req.user.uid, from_sense, to_sense, value);
    return res.status(200).json({ message: "Successfully submited"});

  } catch(err) {
    console.log(err);
    return res.status(500).json({ message: "An error occurred during processing submitFeedback"});
  }
  
});

// 모든 다른 요청은 index.html로 리디렉션
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, "..", 'build', 'index.html'));
});


// 서버 시작
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});

