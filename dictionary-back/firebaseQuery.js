const admin = require('firebase-admin');
const serviceAccount = require("./adminsdk.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore()


async function authUser(req, res, next) {
  const authHeader = req.headers.authorization || "";
  if (!authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "No Bearer token found in Authorization header" });
  }

  const idToken = authHeader.split("Bearer ")[1].trim();

  try {
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    req.user = decodedToken; 
    return next();
  } catch (error) {
    // console.error("ID 토큰 검증 실패:", error);
    return res.status(401).json({ error: "Invalid or expired ID token" });
  }
}

async function getUserTrustScore(uid) {
  const userDoc = db.collection('trustScore').doc(uid);
  const result = (await userDoc.get()).data();

  let trustScore = 1;
  // const duration = (Timestamp.now().seconds - result.createdAt.seconds)/86400;
  const now = Math.floor(Date.now() / 1000);
  const duration = Math.floor((now - result.createdAt.seconds) / 86400);
  const submitted = result.submitted;
  const bias = result.bias;

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

module.exports = {authUser, getUserTrustScore};