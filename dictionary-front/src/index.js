import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import App from "./App";

// React 애플리케이션 루트 생성 및 렌더링
const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// 성능 측정 (필요한 경우 활성화)
// Learn more: https://bit.ly/CRA-vitals
// import reportWebVitals from "./reportWebVitals";
// reportWebVitals(console.log);