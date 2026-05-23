import axios from 'axios';

const API = axios.create({
  baseURL: "https://dict.hsb.kr",
  // baseURL: "http://localhost:5001",
  withCredentials: true,
});

export default API;
