import React from "react";
import { GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { auth } from "../../firebase/firebase-config";
import googleImg from "../../assets/google-button.png"; // Google 로그인 이미지
import logo from "../../assets/icon.png"; // 로고 이미지 import

const Login = ({ onLogin }) => {
  const handleGoogleLogin = async () => {
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      console.log("구글 사용자 정보:", user);

      const userInfo = {
        name: user.displayName,
        email: user.email,
        photoURL: user.photoURL,
        token: await user.getIdToken()
      };
      localStorage.setItem("userInfo", JSON.stringify(userInfo));

      onLogin(userInfo); // 로그인 후 부모 컴포넌트에 로그인 정보 전달

      window.location.href = "/"; // 로그인 후 홈으로 이동
    } catch (error) {
      console.error("Google 로그인 오류:", error);
    }
  };

  return (
    <div
      style={{
        backgroundColor: "#EDF1FD",
        height: "100vh",
        fontFamily: "Arial, sans-serif",
      }}
    >
      {/* 상단 헤더 */}
      <header
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "100px", // 마이페이지 상단 바와 동일한 높이
          backgroundColor: "#FFFFFF",
          boxShadow: "0 2px 4px rgba(0, 0, 0, 0.1)",
          position: "relative",
        }}
      >
        {/* 로고 */}
        <div
          style={{
            position: "absolute",
            left: "20px",
            display: "flex",
            alignItems: "center",
            cursor: "pointer",
          }}
          onClick={() => (window.location.href = "/")}
        >
          <img
            src={logo}
            alt="로고"
            style={{
              width: "50px",
              height: "50px",
              marginRight: "10px",
            }}
          />
          <span style={{ fontSize: "20px", fontWeight: "bold" }}>유반사전</span>
        </div>

        {/* 로그인 제목 */}
        <h1
          style={{
            fontSize: "24px",
            fontWeight: "bold",
            margin: "0",
            color: "#333333",
          }}
        >
          로그인
        </h1>
      </header>

      {/* 본문 */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          height: "calc(100vh - 100px)", // 헤더 높이 제외한 나머지
          padding: "20px",
        }}
      >
        {/* Google 로그인 버튼 */}
        <button
          onClick={handleGoogleLogin}
          style={{
            border: "none",
            background: "none",
            marginBottom: "40px",
            borderRadius: "15px",
            overflow: "hidden",
            cursor: "pointer",
          }}
        >
          <img src={googleImg} alt="Google로 시작하기" style={{ width: "300px", borderRadius: "15px" }} />
        </button>
      </div>
    </div>
  );
};

export default Login;
