import { getFirestore, doc, runTransaction, getDoc, updateDoc } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const db = getFirestore();
const auth = getAuth();

export async function saveSearchHistory(word) {
  const uid = auth.currentUser.uid;

  const docRef = doc(db, "users", uid);
  try {
    await runTransaction(db, async (transaction) => {
      const docSnap = await transaction.get(docRef);
      if (!docSnap.exists()) {
        return;
      }

      const data = docSnap.data();
      let history = data.history;

      const filtered = history.filter(item => {
        return item !== word;
      });

      filtered.unshift(word);
      transaction.update(docRef, { history: filtered });
    });
  } catch (error) {
    console.error("저장 실패:", error);
  }
}

export async function saveFavorite(wordList) {
  const uid = auth.currentUser.uid;
  const docRef = doc(db, "users", uid);
  try {
    const docSnap = await getDoc(docRef);
    if (!docSnap.exists()) {
      return;
    }
    await updateDoc(docRef, {
      favorite: wordList
    });
  } catch (error) {
    console.error("저장 실패:", error);
  }
}