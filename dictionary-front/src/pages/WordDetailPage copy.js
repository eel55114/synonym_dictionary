import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import API from "../api";
import * as d3 from "d3";
import Header from "../components/Header";
import "../styles/WordDetailPage.css";
import { saveSearchHistory, saveFavorite } from "../saveHistory";
import { fetchHistory } from "../fetchWordList";

const WordDetailPage = () => {
  const navigate = useNavigate();
  const { word } = useParams();
  const location = useLocation();
  const d3Container = useRef(null);

  const [wordData, setWordData] = useState(location.state?.wordData || null);
  const [error, setError] = useState(null);
  const [expandedIndices, setExpandedIndices] = useState({});
  const [currentPage, setCurrentPage] = useState({});
  const [sortModes, setSortModes] = useState({});
  const [userInfo, setUserInfo] = useState(null);
  const [favoriteWordIds, setFavoriteWordIds] = useState([]);

  const handleLogout = () => {
    localStorage.removeItem("userInfo");
    setUserInfo(null);
  };

  useEffect(() => {
    const user = localStorage.getItem("userInfo");
    if (user) {
      setUserInfo(JSON.parse(user));
    }
  }, []);
  useEffect(() => {
    setWordData(null);
    setError(null);
    setExpandedIndices({});
    setCurrentPage({});
    setSortModes({});

    if (word) {
      API
        .get(`/api/word/${word}`)
        .then((response) => {
          setWordData(response.data[0]);
          setError(null);
        })
        .catch((err) => {
          setWordData(null);
          setError(err.response?.data?.message || "잘못된 경로입니다.");
        });
    }
  }, [word]);
  useEffect(() => {
    const loadHistory = async () => {
      const { _, favorite } = await fetchHistory();
      setFavoriteWordIds(favorite);
    };
    
  }, [userInfo])
  
  const isFavorite = wordData && favoriteWordIds.some(item => item.id === wordData.id);
  


  useEffect(() => {
    if (wordData && d3Container.current) {
      const svg = d3.select(d3Container.current);
      svg.selectAll("*").remove();

      const width = 600;
      const height = 600;

      const centralNode = {
        id: wordData.word_info.word,
        group: 0,
        radius: 30,
      };

      let relatedWords = [];

      wordData.word_info.pos_info.forEach((pos) => {
        pos.comm_pattern_info.forEach((pattern) => {
          pattern.sense_info.forEach((sense) => {
            sense.lexical_info.forEach((lex) => {
              relatedWords.push({
                id: lex.word,
                similarity: lex.similarity,
                type: lex.type,
                group: 1,
              });
            });
          });
        });
      });

      const nodes = [centralNode, ...relatedWords];
      const links = relatedWords.map((d) => ({
        source: wordData.word_info.word,
        target: d.id,
        similarity: d.similarity,
      }));

      const simulation = d3
        .forceSimulation(nodes)
        .force("link", d3.forceLink(links).id((d) => d.id).distance((d) => 200 - 100 * d.similarity))
        .force("charge", d3.forceManyBody().strength(-100))
        .force("center", d3.forceCenter(width / 2, height / 2));

      const link = svg.append("g").attr("stroke", "#aaa").selectAll("line")
        .data(links).join("line").attr("stroke-width", 2);

      const node = svg.append("g").attr("stroke", "#fff").attr("stroke-width", 1.5)
        .selectAll("circle").data(nodes).join("circle")
        .attr("r", (d) => (d.group === 0 ? d.radius : 13))
        .attr("fill", (d) => {
          if (d.group === 0) return "#007bff";
          if (d.type === "반대말") return "#ff4d4d";
          return "#ffcc00";
        })
        .style("cursor", (d) => (d.group === 0 ? "default" : "pointer"))
        .on("click", (event, d) => {
          if (d.group !== 0) {
            navigate(`/word/${d.id}`);
          }
        })
        .on("mouseover", function (event, d) {
          d3.select(this)
            .transition()
            .duration(200)
            .attr("r", d.group === 0 ? d.radius : 18); // hover 시 더 크게
        })
        .on("mouseout", function (event, d) {
          d3.select(this)
            .transition()
            .duration(200)
            .attr("r", d.group === 0 ? d.radius : 13); // 원래 크기로
        })
        .call(
          d3.drag()
            .on("start", (event, d) => {
              if (!event.active) simulation.alphaTarget(0.3).restart();
              d.fx = d.x;
              d.fy = d.y;
            })
            .on("drag", (event, d) => {
              d.fx = event.x;
              d.fy = event.y;
            })
            .on("end", (event, d) => {
              if (!event.active) simulation.alphaTarget(0);
              d.fx = null;
              d.fy = null;
            })
        );

      const label = svg.append("g").selectAll("text").data(nodes).join("text")
        .text((d) => d.id).attr("font-size", 12).attr("text-anchor", "middle");

      simulation.on("tick", () => {
        link.attr("x1", (d) => d.source.x).attr("y1", (d) => d.source.y)
          .attr("x2", (d) => d.target.x).attr("y2", (d) => d.target.y);

        node.attr("cx", (d) => d.x).attr("cy", (d) => d.y);
        label.attr("x", (d) => d.x).attr("y", (d) => d.y - 15);
      });
    }
  }, [wordData]);

  const openPopup = () => {
    const { token } = JSON.parse(localStorage.getItem("userInfo") || "{}");
    if (!token) {
      alert("로그인이 필요합니다.");
      return;
    }
    const width = 700;
    const height = 450;
    const left = window.screenX + (window.innerWidth - width) / 2;
    const top = window.screenY + (window.innerHeight - height) / 2;
    const features = `width=${width},height=${height},left=${left},top=${top},resizable,scrollbars`;
    const popup = window.open(
      `${window.location.origin}/feedback`, 
      '정정 제안', 
      features
    );
    if (!popup) {
      alert('팝업 차단을 해제해 주세요.');
    }
  };

  const copyToClipboard = async (code) => {
    await navigator.clipboard.writeText(code);
    alert(`어휘 코드가 클립보드에 복사되었습니다: ${code}`);
  };

  const toggleSortMode = (senseKey) => {
    setSortModes((prev) => {
      const prevMode = prev[senseKey] || "abs-desc";
      let nextMode;
      if (prevMode === "abs-desc") nextMode = "asc";
      else if (prevMode === "asc") nextMode = "desc";
      else nextMode = "abs-desc";
      return {
        ...prev,
        [senseKey]: nextMode,
      };
    });
    setCurrentPage((prev) => ({
      ...prev,
      [senseKey]: 0,
    }));
  };

 // 즐겨찾기 등록, 해제
  const handleFavoriteClick = (isF, uid, wordId, word) => {
    if(isF) {
      const save = async () => {
        setFavoriteWordIds(favoriteWordIds.filter(item => item.id !== wordId));
        await saveFavorite(favoriteWordIds)
      }
      save();
    } else {
       const save = async () => {
        setFavoriteWordIds([{id:wordId, word:word}].concat(favoriteWordIds));
        await saveFavorite(favoriteWordIds)
      }
      save();
    }
  }

  // 정렬 모드 라벨 반환 함수: 인자로 mode 전달
  const getSortLabel = (mode) => {
    if (mode === "abs-desc") return "관련성순";
    if (mode === "asc") return "반대말 먼저";
    if (mode === "desc") return "비슷한 말 먼저";
    return "";
  };

  const classifyRelevance = (similarity) => {
    similarity = Math.abs(similarity);
    if (similarity >= 0.85) {
      return "높음";
    } else if (similarity >= 0.7) {
      return "보통";
    } else {
      return "낮음";
    }
  };

  const getCircleColor = (similarity) => {
    if (similarity < 0) return "red-circle";
    return "blue-circle";
  };

  const toggleExpand = (senseKey) => {
    setExpandedIndices((prevState) => ({
      ...prevState,
      [senseKey]: !prevState[senseKey],
    }));
    setCurrentPage((prevState) => ({
      ...prevState,
      [senseKey]: 0,
    }));
  };

  const changePage = (senseKey, direction) => {
    setCurrentPage((prevState) => ({
      ...prevState,
      [senseKey]: (prevState[senseKey] || 0) + direction,
    }));
  };

  if (error) {
    return (
      <div className="word-detail-page">
        <Header userInfo={userInfo} onLogout={handleLogout} />
        <div className="error-container">
          <p className="error-message">{error}</p>
        </div>
      </div>
    );
  }

  if (!wordData) {
    return (
      <div className="word-detail-page">
        <Header userInfo={userInfo} onLogout={handleLogout} />
        <div className="loading-container">
          <p>결과를 찾는 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="word-detail-page">
      <Header userInfo={userInfo} onLogout={handleLogout} />
      <div className="back-button-container">
        <button className="back-button" onClick={() => navigate(-1)}>
          이전
        </button>
        <button className="feedback-button" onClick={openPopup}>
          정정 제안
        </button>
      </div>

      <main className="detail-container">
        <div className="word-content">
          <div className="word-block">
            <div className="word-header">
              <h1>
                <div>
                {wordData.word_info.word}
                {wordData.word_info.original_language && (
                  <span className="original-language">
                    ({wordData.word_info.original_language})
                  </span>
                  )}
                </div>
                {userInfo && (
                  <button onClick={(e) => {
                    e.stopPropagation();
                    handleFavoriteClick(isFavorite, userInfo.email, wordData.target_code, wordData.word_info);
                  }}>
                    {isFavorite ? "★" : "☆"}
                  </button>
                )}
              </h1>
              {wordData.word_info.pronunciation && (
                <p className="pronunciation">
                  <b>발음:</b> [{wordData.word_info.pronunciation}]
                </p>
              )}
            </div>

            {wordData.word_info.pos_info.map((pos, posIndex) => (
              <div key={posIndex} className="pos-section">
                <div className="pos-label">{pos.pos}</div>

                {pos.comm_pattern_info.map((pattern, patternIndex) => (
                  <div key={patternIndex}>
                    {pattern.pattern && (
                      <div className="pattern-text">
                        {patternIndex + 1}. {pattern.pattern}
                      </div>
                    )}
                    <div className="sense-list">
                      {pattern.sense_info.map((sense, senseIndex) => {
                        const senseKey = `${posIndex}-${patternIndex}-${senseIndex}`;
                        const sortMode = sortModes[senseKey] || "abs-desc";

                        const itemsPerPage = 10;
                        let sortedItems = [...sense.lexical_info];
                        if (sortMode === "abs-desc") {
                          sortedItems.sort(
                            (a, b) =>
                              Math.abs(b.similarity) - Math.abs(a.similarity)
                          );
                        } else if (sortMode === "asc") {
                          sortedItems.sort((a, b) => a.similarity - b.similarity);
                        } else if (sortMode === "desc") {
                          sortedItems.sort((a, b) => b.similarity - a.similarity);
                        }
                        const startIndex = (currentPage[senseKey] || 0) * itemsPerPage;
                        const endIndex = startIndex + itemsPerPage;
                        const currentItems = sortedItems.slice(startIndex, endIndex);

                        return (
                          <div key={senseKey} className="sense-item">
                            {/* sense 제목 */}
                            <div className="sense-def-container">
                              <span className="sense-numbered">
                                {senseIndex + 1}. {sense.definition}
                              </span>
                              <button
                                onClick={(e) => {copyToClipboard(sense.sense_code)}}
                              >📋
                              </button>
                            </div>

                            {/* 미리보기 및 정렬 버튼 */}
                            <div className="lexical-info-preview" style={{ alignItems: "center" }}>
                              {sense.lexical_info.slice(0, 3).map((item) => (
                                <div key={item.word} className="lexical-info-block">
                                  <div
                                    className={`circle ${getCircleColor(item.similarity)}`}
                                  ></div>
                                  <span>{item.word}</span>
                                </div>
                              ))}
                              {sense.lexical_info.length > 3 && (
                                <>
                                  <button
                                    className="toggle-button"
                                    onClick={() => toggleExpand(senseKey)}
                                  >
                                    {expandedIndices[senseKey] ? "접기" : "더보기"}
                                  </button>
                                </>
                              )}
                            </div>

                            {expandedIndices[senseKey] && (
                              <div className="expanded-lexical-info">
                                <div className="expanded-sort-container">
                                  <button
                                    className="sort-button"
                                    onClick={() => toggleSortMode(senseKey)}
                                  >
                                    정렬: {getSortLabel(sortMode)}
                                  </button>
                                </div>
                                <div className="lexical-info-table">
                                  {/* 왼쪽 열: 5개 */}
                                  <div className="left-column">
                                    <div className="table-header">
                                      <span>관련성</span>
                                      <span>관계 유형</span>
                                      <span>어휘</span>
                                    </div>
                                    {currentItems.slice(0, 5).map((item, idx) => (
                                      <div key={idx} className="lexical-info-row">
                                        <span
                                          className={`relevance ${
                                            classifyRelevance(item.similarity) ===
                                            "높음"
                                              ? "high"
                                              : classifyRelevance(item.similarity) ===
                                                "보통"
                                              ? "medium"
                                              : "low"
                                          }`}
                                        >
                                          {classifyRelevance(item.similarity)}
                                        </span>
                                        <span className="relation-type">
                                          {item.type}
                                        </span>
                                        <div className="lexical-word">
                                          <div
                                            className={`circle ${getCircleColor(
                                              item.similarity
                                            )}`}
                                          ></div>
                                          <span onClick={(e) => {
                                            e.stopPropagation();
                                            navigate(`/word/${item.link_target_code}`);
                                          }}>{item.word}</span>
                                        </div>
                                      </div>
                                    ))}
                                  </div>

                                  {/* 구분선 */}
                                  <div className="separator"></div>

                                  {/* 오른쪽 열: 다음 5개 */}
                                  <div className="right-column">
                                    <div className="table-header">
                                      <span>관련성</span>
                                      <span>관계 유형</span>
                                      <span>어휘</span>
                                    </div>
                                    {currentItems.slice(5, 10).map((item, idx) => (
                                      <div key={idx} className="lexical-info-row">
                                        <span
                                          className={`relevance ${
                                            classifyRelevance(item.similarity) ===
                                            "높음"
                                              ? "high"
                                              : classifyRelevance(item.similarity) ===
                                                "보통"
                                              ? "medium"
                                              : "low"
                                          }`}
                                        >
                                          {classifyRelevance(item.similarity)}
                                        </span>
                                        <span className="relation-type">
                                          {item.type}
                                        </span>
                                        <div className="lexical-word">
                                          <div
                                            className={`circle ${getCircleColor(
                                              item.similarity
                                            )}`}
                                          ></div>
                                          <span onClick={(e) => {
                                              e.stopPropagation();
                                              navigate(`/word/${item.link_target_code}`);
                                            }}>{item.word}</span>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                                <div className="pagination-buttons">
                                  <button
                                    onClick={() => changePage(senseKey, -1)}
                                    disabled={startIndex === 0}
                                  >
                                    ◀
                                  </button>
                                  <span>
                                    {Math.ceil(startIndex / itemsPerPage) + 1}/
                                    {Math.ceil(sortedItems.length / itemsPerPage)}
                                  </span>
                                  <button
                                    onClick={() => changePage(senseKey, 1)}
                                    disabled={endIndex >= sortedItems.length}
                                  >
                                    ▶
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>

        {/* 시각화 그래프 영역 */}
        <div className="graph-container">
          <svg ref={d3Container} width={800} height={800}></svg>
        </div>
      </main>
    </div>
  );
};

export default WordDetailPage;
