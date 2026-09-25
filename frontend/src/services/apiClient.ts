import axios from "axios";

export const getBackendHost = () => {
  if (typeof window !== "undefined" && window.location && window.location.hostname) {
    return window.location.hostname;
  }
  return "localhost";
};

export const getApiUrl = () => {
  const envUrl = import.meta.env.VITE_API_URL;
  if (envUrl && !envUrl.includes("localhost") && !envUrl.includes("127.0.0.1")) {
    return envUrl;
  }
  const host = getBackendHost();
  return `http://${host}:8080/api`;
};

export const getBackendBaseUrl = () => {
  return getApiUrl().replace(/\/api\/?$/, "");
};

export const getWsUrl = () => {
  const envWs = import.meta.env.VITE_WS_URL;
  if (envWs && !envWs.includes("localhost") && !envWs.includes("127.0.0.1")) {
    return envWs;
  }
  const host = getBackendHost();
  const protocol = typeof window !== "undefined" && window.location && window.location.protocol === "https:" ? "wss:" : "ws:";
  return `${protocol}//${host}:8080/ws`;
};

export const getTyphoonApiUrl = () => {
  // Always route to Go backend (/api/typhoon) so Gemini and Claude run 24/7 on Cloud (Render)
  // without needing local GPU or localtunnel, while Typhoon is proxied seamlessly.
  const envTyphoon = import.meta.env.VITE_TYPHOON_API_URL;
  if (envTyphoon && envTyphoon.startsWith("http") && !envTyphoon.includes("loca.lt")) {
    return envTyphoon;
  }
  return `${getApiUrl()}/typhoon`;
};

const apiClient = axios.create({
  baseURL: getApiUrl(),
  headers: { "Content-Type": "application/json" },
  timeout: 15000,
});

apiClient.interceptors.request.use((config) => {
  config.baseURL = getApiUrl();
  const token = localStorage.getItem("token");

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

export const WS_URL = getWsUrl();

export default apiClient;
