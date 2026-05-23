import React from "react";
import { useNavigate } from "react-router-dom";
import Header from "../components/Header";
import "../styles/MainPage.css";
import getNextSurvey from "../getNextSurvey";

const MainPage = ({ userInfo, onLogout }) => {
  const navigate = useNavigate();

  const handleInitialClick = (initial) => {
    navigate(`/search-by-initial?initial=${initial}`);
  };

  const { days, hours } = getNextSurvey();

  return (
    <div className="main-page">
      <Header userInfo={userInfo} onLogout={onLogout} />
      <main className="main">
        {/* 검색바 */}
        <div className="search-bar">
          <form
            className="search-form"
            onSubmit={(e) => {
              e.preventDefault();
              const searchWord = e.target.elements[0].value.trim();
              if (searchWord) {
                navigate(`/search?word=${searchWord}`);
              } else {
                alert("검색어를 입력해주세요!");
              }
            }}
          >
            <input
              type="text"
              placeholder="검색어를 입력하세요..."
              className="search-input"
            />
            <button type="submit" className="search-button">
              검색
            </button>
          </form>
        </div >
        <div className="survey-container">
            <button className="survey-button" onClick={()=>navigate("/survey")}>단어 개선에 참여해 주세요</button>
            <p className="survey-info">다음 조사까지 {days}일 {hours}시간</p>
        </div>
      </main>
    </div>
  );
};

export default MainPage;
