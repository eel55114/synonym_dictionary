import { getFirestore, doc, getDoc } from "firebase/firestore";
import { getAuth, onAuthStateChanged } from "firebase/auth";

const db = getFirestore();
const auth = getAuth();

export async function fetchHistory() {
  return new Promise((resolve) => {
    onAuthStateChanged(auth, async (user) => {
      if (!user) {
        console.warn("사용자가 로그인되어 있지 않음");
        return resolve([]);
      }
      try {
        // 문서 ID가 user.uid인 users/{user.uid} 문서 참조
        const docRef = doc(db, "users", user.uid);
        const docSnap = await getDoc(docRef);

        if (!docSnap.exists()) {
          console.log("해당 ID의 문서가 없음");
          return resolve({ history:[], favorite:[] });
        }
        
        const { history, favorite } = docSnap.data();
        console.log("검색 이력(배열) 불러오기 성공:");
        resolve({ history, favorite });
      } catch (error) {
        console.error("검색 이력 불러오기 실패:", error);
        resolve({ history:[], favorite:[] });
      }
    });
  });
}