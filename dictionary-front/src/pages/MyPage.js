import React, { useEffect, useState } from "react";
import logo from "../assets/icon.png";
import { fetchHistory } from "../fetchWordList"; // Firestore에서 검색 이력 불러오기

const MyPage = () => {
  const [userInfo, setUserInfo] = useState(null);
  const [searchHistory, setSearchHistory] = useState([]);
  const [favoriteWord, setFavoriteWord] = useState([]); // 즐겨찾기 단어 목록
  

  // 사용자 정보 가져오기
  useEffect(() => {
    const userData = localStorage.getItem("userInfo");
    if (userData) {
      setUserInfo(JSON.parse(userData));
      const parsedUser = JSON.parse(userData);
      setUserInfo(parsedUser);
      // 최근 검색 이력 로드
      const loadHistory = async () => {
        const { history, favorite } = await fetchHistory();
        setSearchHistory(history.slice(0, 5));
        setFavoriteWord(favorite.slice(0, 5));
      };
      loadHistory();

      // const loadFavorite = async () => {
      //   const favorite = await fetchFavorite();
      //   setFavoriteWordIds(favorite.slice(0, 5));
      // };
      // loadFavorite();

    } else {
      alert("로그인이 필요합니다.");
      window.location.href = "/login";
    }
  }, []);

  // 로그아웃 함수
  const handleLogout = () => {
    localStorage.removeItem("userInfo");
    alert("로그아웃되었습니다.");
    window.location.href = "/";
  };

  if (!userInfo) {
    return <div>사용자 정보를 불러오는 중...</div>;
  }

  return (
    <div
      style={{
        backgroundColor: "#EDF1FD",
        minHeight: "100vh",
        fontFamily: "'Roboto', sans-serif",
      }}
    >
      {/* 헤더 */}
      <header
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          height: "60px",
          padding: "20px",
          backgroundColor: "#FFFFFF",
          boxShadow: "0 2px 4px rgba(0, 0, 0, 0.1)",
        }}
      >
        {/* 왼쪽 로고 */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            cursor: "pointer",
          }}
          onClick={() => (window.location.href = "/")}
        >
          <img
            src={logo}
            alt="로고"
            style={{ width: "50px", height: "50px", marginRight: "10px" }}
          />
          <span style={{ fontSize: "20px", fontWeight: "bold" }}>유반사전</span>
        </div>

        <h1 style={{ fontSize: "24px", fontWeight: "bold", margin: "0", color: "#333333" }}>
          마이페이지
        </h1>

        {/* 로그아웃 버튼 */}
        <button
          onClick={handleLogout}
          style={{
            padding: "10px 20px",
            backgroundColor: "#FF5722",
            color: "white",
            border: "none",
            borderRadius: "5px",
            cursor: "pointer",
          }}
        >
          로그아웃
        </button>
      </header>

      {/* 본문 */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          // minHeight: "calc(100vh - 100px)",
        }}
      >
        <div
          style={{
            backgroundColor: "white",
            padding: "40px",
            marginTop: "100px",
            borderRadius: "30px",
            boxShadow: "0 4px 10px rgba(0, 0, 0, 0.1)",
            width: "360px",
            minHeight: "320px",
            display: "flex",
            flexDirection: "column",
            position: "relative",
          }}
        >
          {/* 프로필 이미지 */}
          <img
            src={userInfo.photoURL}
            alt="프로필"
            style={{
              width: "90px",
              height: "90px",
              borderRadius: "50%",
              border: "3px solid #2196F3",
              position: "absolute",
              top: "25%",
              left: "50%",
              transform: "translate(-50%, -50%)",
            }}
          />

          {/* 이름과 이메일 */}
          <div
            style={{
              marginTop: "130px",
              padding: "0 20px",
              textAlign: "left",
            }}
          >
            <p style={{ fontSize: "22px", marginBottom: "15px", color: "#333" }}>
              이름: {userInfo.name}
            </p>
            <p style={{ fontSize: "20px", color: "#666" }}>이메일: {userInfo.email}</p>

            {/* 검색 이력 */}
            <div style={{ marginTop: "30px" }}>
              <h3 style={{ fontSize: "18px", color: "#444" }}>최근 검색 이력</h3>
              {searchHistory.length === 0 ? (
                <p style={{ fontSize: "16px", color: "#888" }}>검색 이력이 없습니다.</p>
              ) : (
                <ul style={{lineHeight: "1.8", display: "flex", gap: "10px" }}>
                  {searchHistory.map((item, index) => (
                    <li
                      key={index}
              style={{
                        fontSize: "16px",
                        color: "#333",
                        cursor: "pointer",
                        textDecoration: "underline",
              }}
                      onClick={() => (window.location.href = `/search?word=${item}`)}
                    >
                      {item}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 즐겨찾기 단어 목록 */}
      <h2 style={{ textAlign: "center", marginTop: "40px" }}>즐겨찾기 단어 목록</h2>
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "center",
          gap: "10px",
          padding: "20px",
        }}
      >
        {favoriteWord.length === 0 ? (
          <h3>즐겨찾기한 단어가 없습니다.</h3>
        ) : (
          favoriteWord.map((item, idx) => (
            <div className="word-card"
              style={{
                display: "flex",
                justifyContent: "center",
                flexDirection: "column",
                padding: "20px",
                gap: "10px",
                width: "80px",
                height: "50px",
                borderRadius: "10px",
                backgroundColor: "white"
              }}
              onClick={() => (window.location.href = `/word/${item.id}`)}>
              <span 
                style={{
                  color: "#2196f3"
                }}>{ item.word }</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default MyPage;
