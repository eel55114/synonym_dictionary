// Survey.js
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import API from "../api";
import "../styles/Survey.css";
import Header from "../components/Header";

const SCALE_COLORS = [
  "#e53935",
  "#ef5350",
  "#e57373",
  "#ef9a9a",
  "#e0e0e0",
  "#94c6ef",
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
  const [pageIdx, setPageIdx] = useState(0);
  const [pages, setPages] = useState([]);
  const [answers, setAnswers] = useState([]);
  const [error, setError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { token } = JSON.parse(localStorage.getItem("userInfo") || "{}");

  useEffect(() => {
    if (!token) {
      setError("로그인이 필요합니다.");
      return;
    }
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
        switch (err?.response?.status) {
          case 401: setError("로그인 정보가 올바르지 않습니다."); break;
          case 409: setError("이번 조사 기간에 이미 응답을 제출하셨습니다."); break;
          default: setError(err.response?.data?.message);
        }
        console.error(err);
      });
  }, [token]);

  useEffect(() => {
    if (error) {
      alert(error);
      navigate("/");
    }
  }, [error, navigate]);

  /* ③ 토큰이 아예 없으면 즉시 리다이렉트 */
  useEffect(() => {
    if (!token) navigate("/login");
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
    setIsSubmitting(true);
    try {
      console.log(answers);
      await API.post(
        "/api/submitsurvey",
        { answers },
        { headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
          }}
      );
      alert("제출이 완료되었습니다.");
      navigate("/");
    } catch (err) {
      console.error(err);
      alert("제출 중 오류가 발생했습니다. 다시 시도해 주세요.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // 현재 페이지 정보
  const isLoading = pages.length === 0;
  const current = pages[pageIdx] || {
    word1: " ",
    meaning1: " ",
    word2: " ",
    meaning2: " ",
  };
  const currentAnswer = answers[pageIdx]?.value ?? null;

  return (
    <div className="survey-page">
        <Header userInfo={userInfo} onLogout={onLogout} />
        <div className="card-container">
        <div className="survey-card">
            {/* ─── 단어 & 의미 ─── */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
            <div>
                <label className="word-label">{current.word1 || (isLoading ? "로딩 중…" : "")}</label>
                <textarea
                readOnly
                value={current.meaning1}
                className="word-meaning"
                rows={5}
                />
            </div>
            <div>
                <label className="word-label">{current.word2 || (isLoading ? "로딩 중…" : "")}</label>
                <textarea
                readOnly
                value={current.meaning2}
                className="word-meaning"
                rows={5}
                />
            </div>
            </div>

            <p className="survey-question">{
              isLoading ? " " : "두 단어는 어떤 관계입니까?"
            }</p>

            {/* ─── 스케일 ─── */}
            <div className="scale-container">
            <p>  반대말 ◀</p>
            {SCALE_COLORS.map((color, idx) => {
              const value = idx - 4;
              const isSelected = currentAnswer === value;
              return (
                <button
                  key={idx}
                  onClick={() => !isLoading && handleSelect(value)}
                  disabled={isLoading}
                  className={`scale-button b${idx}${isSelected ? " selected" : ""}`}
                  style={{ backgroundColor: color }}
                />
              );
            })}
            <p>▶ 비슷한 말</p>
            </div>

            {/* ─── 선택된 라벨 ─── */}
            <div className="selection-label">
              {currentAnswer !== null
                ? SCALE_LABELS[currentAnswer + 4]
                : "점수를 선택해 주세요"}
            </div>

            {/* ─── 네비게이션/제출 ─── */}
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 24 }}>
            <button onClick={goPrev} disabled={isLoading || pageIdx === 0} className="nav-btn">
                ◀ 이전
            </button>

            {pageIdx < pages.length - 1 ? (
                <button
                onClick={goNext}
                disabled={isLoading || currentAnswer === null}
                className="nav-btn"
                >
                다음 ▶
                </button>
            ) : (
                <button
                onClick={handleSubmit}
                disabled={isLoading || answers.some(a => a.value === null) || isSubmitting}
                className="submit-btn"
                >
                {isSubmitting ? "제출 중" : "제출하기"}
                </button>
            )}
            </div>
        </div>
        </div>
    </div>
    );
}
