import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import API from "../api";
import Header from "../components/Header";
import "../styles/SearchResultsPage.css";
import { saveSearchHistory } from "../saveHistory";

const SearchResultsPage = ({ userInfo, onLogout }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const searchWord = queryParams.get("word");

  const [searchResults, setSearchResults] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!searchWord) return;

    setLoading(true);  // 요청 시작
    API.get(`/api/words?word=${searchWord}`)
      .then((response) => {
        const saveHistory = async (word) => {
          await saveSearchHistory(word);
        };
        saveHistory(searchWord);
        const data = response.data;
        if (Array.isArray(data)) {
          setSearchResults(data);
        } else {
          setSearchResults([data]);
        }
        setError(null);
      })
      .catch((err) => {
        setSearchResults([]);
        setError(err.response?.data?.message || "검색 실패");
      })
      .finally(() => {
        setLoading(false);  // 요청 완료
      });
  }, [searchWord]);

  return (
    <div className="search-results-page">
      <Header userInfo={userInfo} onLogout={onLogout} />

      <div className="header-search-bar">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const newSearchWord = e.target.elements[0].value.trim();
            if (newSearchWord) {
              navigate(`/search?word=${newSearchWord}`);
            } else {
              alert("검색어를 입력해주세요!");
            }
          }}
        >
          <input
            type="text"
            placeholder="검색어를 입력하세요..."
            className="header-search-input"
          />
          <button type="submit" className="header-search-button">
            검색
          </button>
        </form>
      </div>

      <div className="results-container">
        {error ? (
          <div className="no-results">
            <h1>{error}</h1>
          </div>
        ) : loading ? (
          <p>검색 중...</p>
        ) : searchResults.length > 0 ? (
          <div className="results-content">
            {searchResults.map((result, index) => (
              <div
                key={index}
                className="result-item"
                onClick={() =>
                  navigate(`/word/${result.id}`)
                }
              >
                <h2>{searchWord}</h2>
                <p>{result.definition || ""}</p>
              </div>
            ))}
          </div>
        ) : (
          <p>검색 결과가 없습니다</p>
        )}
      </div>
    </div>
  );
};

export default SearchResultsPage;
