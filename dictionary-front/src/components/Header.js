import React from "react";
import { useNavigate } from "react-router-dom";
import logo from "../assets/icon.png"; // 로고 이미지 경로
import "../styles/Header.css"; // CSS 파일 import

const Header = ({ userInfo, onLogout }) => {
  const navigate = useNavigate();

  return (
    <header className="header">
      <div
        className="header-logo"
        onClick={() => navigate("/")}
        style={{ cursor: "pointer" }}
      >
        <img src={logo} alt="로고" className="logo-image" />
        <span className="logo-text">유반사전</span>
      </div>
      <div className="header-buttons">
        {userInfo ? (
          <>
            <button
              className="header-button logout"
              onClick={() => {
                onLogout();
                navigate("/");
              }}
            >
              로그아웃
            </button>
            <button
              className="header-button"
              onClick={() => navigate("/mypage")}
            >
              마이페이지
            </button>
          </>
        ) : (
          <>
            <button
              className="header-button"
              onClick={() => navigate("/login")}
            >
              로그인
            </button>
            <button
              className="header-button"
              onClick={() => navigate("/mypage")}
            >
              마이페이지
            </button>
          </>
        )}
      </div>
    </header>
  );
};

export default Header;
