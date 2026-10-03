/**
 * LinkAlias Centralized REST API Service Layer
 * Target Backend: http://127.0.0.1:8000
 */

const API_BASE_URL = "http://127.0.0.1:8000";

export const getToken = () => localStorage.getItem("linkalias_jwt_token");
export const setToken = (token) => localStorage.setItem("linkalias_jwt_token", token);
export const removeToken = () => localStorage.removeItem("linkalias_jwt_token");

/**
 * Generic fetch wrapper with automatic Authorization Bearer headers and 401 handling
 */
async function request(endpoint, options = {}) {
  const token = getToken();
  const headers = {
    "Content-Type": "application/json",
    "Accept": "application/json",
    ...options.headers,
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (response.status === 401) {
    removeToken();
    if (window.location.pathname !== "/login" && window.location.pathname !== "/register") {
      window.location.href = "/login?expired=true";
    }
    throw new Error("Session expired. Please log in again.");
  }

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.detail || `Request failed with status ${response.status}`);
  }

  return data;
}

export const api = {
  // Authentication APIs
  register: async (name, email, password) => {
    return await request("/auth/register", {
      method: "POST",
      body: JSON.stringify({ name, email, password }),
    });
  },

  login: async (email, password) => {
    const data = await request("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    if (data.access_token) {
      setToken(data.access_token);
    }
    return data;
  },

  getMe: async () => {
    return await request("/auth/me", { method: "GET" });
  },

  logout: () => {
    removeToken();
    window.location.href = "/login";
  },

  // Alias Management APIs
  getAliases: async () => {
    return await request("/aliases", { method: "GET" });
  },

  getAliasByUrl: async (url) => {
    return await request(`/aliases/by-url?url=${encodeURIComponent(url)}`, { method: "GET" });
  },

  createAlias: async (url, alias) => {
    return await request("/aliases", {
      method: "POST",
      body: JSON.stringify({ url, alias }),
    });
  },

  updateAlias: async (url, alias) => {
    return await request("/aliases", {
      method: "PUT",
      body: JSON.stringify({ url, alias }),
    });
  },

  deleteAlias: async (url) => {
    return await request("/aliases", {
      method: "DELETE",
      body: JSON.stringify({ url }),
    });
  },

  // Platform Preferences APIs
  getPlatformPreferences: async () => {
    return await request("/preferences/platforms", { method: "GET" });
  },

  updatePlatformPreferences: async (enabledPlatforms) => {
    return await request("/preferences/platforms", {
      method: "PUT",
      body: JSON.stringify({ enabled_platforms: enabledPlatforms }),
    });
  }
};

