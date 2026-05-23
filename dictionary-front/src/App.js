import React, { useState, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import MainPage from "./pages/MainPage";
import Login from "./components/Login/Login";
import MyPage from "./pages/MyPage";
import SearchResultsPage from "./pages/SearchResultsPage";
import WordDetailPage from "./pages/WordDetailPage";
import Survey from "./pages/Survey";
import Feedback from "./pages/Feedback";

function App() {
  const [userInfo, setUserInfo] = useState(null);

   // 로그인 상태 확인
  useEffect(() => {
    const storedUserInfo = localStorage.getItem("userInfo");
    if (storedUserInfo) {
      setUserInfo(JSON.parse(storedUserInfo));
    }
  }, []);

  const handleLogin = (user) => {
    setUserInfo(user);
    localStorage.setItem("userInfo", JSON.stringify(user)); // 로그인 정보 저장
  };

  const handleLogout = () => {
    localStorage.removeItem("userInfo");
    setUserInfo(null);
    window.location.href = "/"; // 로그아웃 후 메인 페이지로 이동
  };

return (
    <Router>
      <Routes>
        <Route
          path="/"
          element={<MainPage userInfo={userInfo} onLogout={handleLogout} />}
        />
        <Route
          path="/login"
          element={<Login onLogin={handleLogin} />}
        />
        <Route
          path="/mypage"
          element={<MyPage userInfo={userInfo} onLogout={handleLogout} />}
        />
        <Route
          path="/search"
          element={<SearchResultsPage userInfo={userInfo} onLogout={handleLogout} />}
        />
        <Route
          path="/word/:word"
          element={<WordDetailPage userInfo={userInfo} onLogout={handleLogout} />}
        />
        <Route
          path="/survey"
          element={<Survey userInfo={userInfo} onLogout={handleLogout} />}
        />
        <Route
          path="/feedback"
          element={<Feedback userInfo={userInfo} onLogout={handleLogout} />}
        />
      </Routes>
    </Router>
  );
}

export default App;
