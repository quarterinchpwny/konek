import axios from "axios";

const storageKey = "authToken";

export const getAuthToken = () => localStorage.getItem(storageKey);

export const setAuthToken = (token: string | null) => {
  if (token) {
    localStorage.setItem(storageKey, token);
    return;
  }

  localStorage.removeItem(storageKey);
};

const injectAuthHeader = (headers: Headers, token: string | null) => {
  if (token && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${token}`);
  }
};

export const setupApiAuth = () => {
  axios.interceptors.request.use((config) => {
    const token = getAuthToken();
    if (token) {
      config.headers = config.headers ?? {};
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  });

  const nativeFetch = window.fetch.bind(window);
  window.fetch = (input: RequestInfo | URL, init?: RequestInit) => {
    const headers = new Headers(init?.headers);
    injectAuthHeader(headers, getAuthToken());
    return nativeFetch(input, {
      ...init,
      headers,
    });
  };
};

export const buildBackendWebSocketUrl = (params: Record<string, string>) => {
  const baseUrl = import.meta.env.VITE_API_BASE_URL;
  const apiUrl = new URL(baseUrl);
  const wsProtocol = apiUrl.protocol === "https:" ? "wss:" : "ws:";
  const wsUrl = new URL(apiUrl.pathname.replace(/\/api\/?$/, ""), `${wsProtocol}//${apiUrl.host}`);

  Object.entries(params).forEach(([key, value]) => {
    wsUrl.searchParams.set(key, value);
  });
  return wsUrl.toString();
};

export const createAuthenticatedWebSocket = (url: string) => {
  const token = getAuthToken();
  if (!token) {
    throw new Error("Authentication required");
  }

  return new WebSocket(url, token);
};

export const fetchAuthorizedBlob = async (url: string) => {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}`);
  }

  return await response.blob();
};
