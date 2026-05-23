import React, { useState } from "react";
import API from "../api";
import { useNavigate } from "react-router-dom";
import "../styles/Survey.css";

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

export default function SinglePageSurvey( { userInfo, onLogout } ) {
  const navigate = useNavigate();
  const [answer, setAnswer] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [value1, setValue1] = useState("");
  const [value2, setValue2] = useState("");

  const token = JSON.parse(localStorage.getItem("userInfo") || "{}").token;

  const handleSelect = (value) => setAnswer(value);

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      await API.post(
        "/api/submitFeedback",
        { 
          from_sense: value1,
          to_sense: value2,
          value: answer
         },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      alert("제출이 완료되었습니다.");
      window.close();
    } catch (err) {
      console.error(err);
      alert("제출 중 오류가 발생했습니다. 다시 시도해 주세요.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (e, setValue) => {
    const input = e.target.value;
    if (/^\d*$/.test(input)) {
      setValue(input);
    }
  };

  return (
    <div className="survey-page">
      <div className="card-container">
        <div className="survey-card">
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
            <div>
              <label className="word-label">단어 1</label>
              <div className="sense-search-container">
                <input type="text" value={value1} inputMode="numeric" onChange={(e) => handleChange(e, setValue1)} className="sense-code"/>
                {/* <button className="get-meaning-btn">조회</button> */}
              </div>
            </div>
            <div>
              <label className="word-label">단어 2</label>
              <div className="sense-search-container">
                <input type="text" value={value2} inputMode="numeric" onChange={(e) => handleChange(e, setValue2)} className="sense-code"/>
                {/* <button className="get-meaning-btn">조회</button> */}
              </div>
            </div>
          </div>

          <p className="survey-question">두 단어는 어떤 관계입니까?</p>

          <div className="scale-container">
            <p>반대말 ◀</p>
            {SCALE_COLORS.map((color, idx) => {
              const value = idx - 4;
              return (
                <button
                  key={idx}
                  onClick={() => handleSelect(value)}
                  className={`scale-button ${answer === value ? "selected" : ""}`}
                  style={{ backgroundColor: color }}
                />
              );
            })}
            <p>▶ 비슷한 말</p>
          </div>

          <div className="selection-label">
            {answer !== null ? SCALE_LABELS[answer + 4] : "점수를 선택해 주세요"}
          </div>

          <div style={{ marginTop: 24, display: "flex", justifyContent: "flex-end"}}>
            <button
              onClick={handleSubmit}
              disabled={answer === null || value1 === null || value2 === null || isSubmitting}
              className="submit-btn"
            >
              {isSubmitting ? "제출 중" : "제출하기"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
