// Survey.js
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import API from "../api";
import "../styles/Survey.css"; // CSS 파일 import
import Header from "../components/Header";

const SCALE_COLORS = [
  "#e53935",
  "#ef5350",
  "#e57373",
  "#ef9a9a",
  "#e0e0e0",
  "#bbdefb",
  "#64b5f6",
  "#42a5f5",
  "#1e88e5",
];

const SCALE_LABELS = [
  "완전히 정반대 의미임",
  "상당히 반의어에 가까움",
  "어느 정도 반의어에 가까움",
  "약간 반대 의미가 있음",
  "관계 없음",
  "약간 비슷한 의미가 있음",
  "꽤 비슷한 의미임",
  "몹시 비슷한 의미임",
  "완전히 같은 의미임",
];

console.log("enter")
export default function Survey({ userInfo, onLogout }) {
  const navigate = useNavigate();
  const [pages, setPages] = useState([]);
  const [pageIdx, setPageIdx] = useState(0);
  const [answers, setAnswers] = useState(null);
  const [error, setError] = useState(null);

  const { token } = JSON.parse(localStorage.getItem("userInfo") || "{}");

  useEffect(() => {
      if (token) {
      API
        .get(`/api/getsurvey`,
          {headers: {
              "Authorization": `Bearer ${token}`,
            }
          }
        )
        .then(res => {
          console.log(res)
          const wordCases = res.data.map(item => ({
            word1: item.from_word,
            meaning1: item.from_def,
            word2: item.to_word,
            meaning2: item.to_def,
          }));
          const answerForm = res.data.map(item => ({
            from_sense: item.from_sense,
            to_sense: item.to_sense,
            value: null,
          }));
          
          console.log(wordCases)
          setPages(wordCases);
          setAnswers(answerForm);

        })
        .catch((err) => {
          console.error(err);
          setError(err.response?.data?.message);
        });
      } else {
        alert("로그인이 필요합니다.");
        navigate(`/login`)
      }
      
  }, [token, navigate]);

  // ───────── 점수 선택
  const handleSelect = (value) => {
    setAnswers(prev =>
      prev.map((item, i) =>
        i === pageIdx
          ? { ...item, value }
          : item
      )
    );
  };

  // ───────── 페이지 이동
  const goPrev = () => setPageIdx((idx) => Math.max(0, idx - 1));
  const goNext = () => setPageIdx((idx) => Math.min(pages.length - 1, idx + 1));

  // ───────── 제출
  const handleSubmit = async () => {
    try {
      console.log(answers);
      await fetch("/api/submitsurvey", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ answers }),
      });
      alert("제출이 완료되었습니다.");
      navigate("/");
    } catch (err) {
      console.error(err);
      alert("제출 중 오류가 발생했습니다. 다시 시도해 주세요.");
    }
  };

  if (error) {
    return <div className="error">문제가 발생했습니다: {error}</div>;
  }
  if (!token) {
    return null;
  }
  if (pages.length === 0) {
    // API 응답 전 로딩 UI
    return (
    <div className="survey-page">
    <Header userInfo={userInfo} onLogout={onLogout} />
    <div className="card-container">
      <div className="survey-card">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
          <div>
            <label className="word-label"></label>
            <textarea
              readOnly
              value=""
              className="word-meaning"
              rows={5}
            />
          </div>
          <div>
            <label className="word-label"></label>
            <textarea
              readOnly
              value=""
              className="word-meaning"
              rows={5}
            />
          </div>
        </div>

        <p className="survey-question"></p>

        <div className="scale-container">
          <p></p>
          {SCALE_COLORS.map((color, idx) => {
            return (
              <div
                className={`scale-button`}
                style={{ backgroundColor: "#e0e0e0" }}
              />
            );
          })}
          <p></p>
        </div>
        <div className="selection-label">
          {""}
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 24 }}>
          <button>
            ◀&nbsp;이전
          </button>

          {
            <button>
              다음&nbsp;▶
            </button>
          }
        </div>
      </div>
    </div>
    </div>);
  }

  // 현재 페이지 정보
  const current = pages[pageIdx];
  const currentAnswer = answers[pageIdx]?.value;

  return (
    <div className="survey-page">
    <Header userInfo={userInfo} onLogout={onLogout} />
    <div className="card-container">
      <div className="survey-card">
        
        {/* ───────── 단어 & 의미 ───────── */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
          {/* 단어 1 */}
          <div>
            <label className="word-label">{current.word1}</label>
            <textarea
              readOnly
              value={current.meaning1}
              className="word-meaning"
              rows={5}
            />
          </div>
          {/* 단어 2 */}
          <div>
            <label className="word-label">{current.word2}</label>
            <textarea
              readOnly
              value={current.meaning2}
              className="word-meaning"
              rows={5}
            />
          </div>
        </div>

        <p className="survey-question">두 단어는 어떤 관계입니까?</p>

        <div className="scale-container">
          <p>반대말 ◀</p>
          {SCALE_COLORS.map((color, idx) => {
            const isSelected = currentAnswer === idx;
            return (
              <div
                key={idx}
                onClick={() => handleSelect(idx)}
                className={`scale-button${isSelected ? " selected" : ""}`}
                style={{ backgroundColor: color }}
              />
            );
          })}
          <p>▶ 비슷한 말</p>
        </div>

        {/* ───────── 선택된 라벨 표시 ───────── */}
        <div className="selection-label">
          {currentAnswer !== null ? SCALE_LABELS[currentAnswer] : "점수를 선택해 주세요"}
        </div>

        {/* ───────── 네비게이션 ───────── */}
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 24 }}>
          <button
            onClick={goPrev}
            disabled={pageIdx === 0}
            className="nav-btn"
          >
            ◀&nbsp;이전
          </button>

          {pageIdx < pages.length - 1 ? (
            <button
              onClick={goNext}
              disabled={currentAnswer === null}
              className="nav-btn"
            >
              다음&nbsp;▶
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={answers.some(a => a.value === null)}
              className="submit-btn"
            >
              제출하기
            </button>
          )}
        </div>
      </div>
    </div>
    </div>
  );
}
