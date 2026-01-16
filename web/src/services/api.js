// API Client
class MockJGoClient {
  constructor(baseUrl = window.location.origin) {
    this.baseUrl = baseUrl;
  }

  async request(endpoint, options = {}) {
    const url = `${this.baseUrl}${endpoint}`;
    const config = {
      headers: {
        "Content-Type": "application/json",
        ...options.headers,
      },
      ...options,
    };

    try {
      const response = await fetch(url, config);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || data.message || `HTTP ${response.status}`,
        );
      }

      return data;
    } catch (error) {
      console.error("API request failed:", error);
      throw error;
    }
  }

  async createJson(jsonContent, password, expiresInHours = 720) {
    const expires = new Date();
    expires.setHours(expires.getHours() + parseInt(expiresInHours));

    return this.request("/api/json", {
      method: "POST",
      body: JSON.stringify({
        json: jsonContent,
        password: password || undefined,
        expires: expires.toISOString(),
      }),
    });
  }

  async getJson(id) {
    return this.request(`/api/json/${id}`);
  }

  async updateJson(id, jsonContent, password, expiresInHours = 720) {
    const expires = new Date();
    expires.setHours(expires.getHours() + parseInt(expiresInHours));

    return this.request(`/api/json/${id}`, {
      method: "PUT",
      body: JSON.stringify({
        json: jsonContent,
        password: password,
        expires: expires.toISOString(),
      }),
    });
  }

  async deleteJson(id, password) {
    return this.request(`/api/json/${id}`, {
      method: "DELETE",
      body: JSON.stringify({
        password: password,
      }),
    });
  }
}

export default MockJGoClient;
