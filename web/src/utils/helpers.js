// JSON utilities
export const JsonHelper = {
  validate(jsonString) {
    try {
      JSON.parse(jsonString);
      return { valid: true, error: null };
    } catch (error) {
      return { valid: false, error: error.message };
    }
  },

  format(jsonString) {
    try {
      const parsed = JSON.parse(jsonString);
      return JSON.stringify(parsed, null, 2);
    } catch (error) {
      return jsonString;
    }
  },

  isValid(jsonString) {
    return this.validate(jsonString).valid;
  },

  formatForDisplay(jsonString) {
    try {
      const parsed = JSON.parse(jsonString);
      return JSON.stringify(parsed, null, 2);
    } catch (error) {
      return jsonString;
    }
  },
};

// Date utilities
export const DateHelper = {
  formatDateTime(dateString) {
    return new Date(dateString).toLocaleString();
  },

  formatRelative(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diff = date - now;

    if (diff < 0) {
      return "Expired";
    }

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

    if (days > 0) {
      return `${days} day${days > 1 ? "s" : ""} ${hours} hour${hours > 1 ? "s" : ""}`;
    } else if (hours > 0) {
      return `${hours} hour${hours > 1 ? "s" : ""}`;
    } else {
      return "Less than 1 hour";
    }
  },
};

// Clipboard utilities
export const ClipboardHelper = {
  async copy(text) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (err) {
      // Fallback for older browsers
      const textArea = document.createElement("textarea");
      textArea.value = text;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand("copy");
      document.body.removeChild(textArea);
      return true;
    }
  },
};

// Local storage utilities for recent endpoints
export const StorageHelper = {
  RECENT_ENDPOINTS_KEY: "mockj-recent-endpoints",
  MAX_RECENT_ITEMS: 10,

  getRecentEndpoints() {
    try {
      const stored = localStorage.getItem(this.RECENT_ENDPOINTS_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error("Error reading recent endpoints:", error);
      return [];
    }
  },

  saveRecentEndpoint(endpoint) {
    try {
      const recents = this.getRecentEndpoints();

      // Remove existing item with same ID if it exists
      const filteredRecents = recents.filter((item) => item.id !== endpoint.id);

      // Add new item at the beginning
      const updatedRecents = [endpoint, ...filteredRecents];

      // Keep only the most recent items
      const limitedRecents = updatedRecents.slice(0, this.MAX_RECENT_ITEMS);

      localStorage.setItem(
        this.RECENT_ENDPOINTS_KEY,
        JSON.stringify(limitedRecents),
      );
      return limitedRecents;
    } catch (error) {
      console.error("Error saving recent endpoint:", error);
      return [];
    }
  },

  cleanupExpiredEndpoints() {
    try {
      const recents = this.getRecentEndpoints();
      const now = new Date();

      const validRecents = recents.filter((endpoint) => {
        if (!endpoint.expires) return true;
        return new Date(endpoint.expires) > now;
      });

      if (validRecents.length !== recents.length) {
        localStorage.setItem(
          this.RECENT_ENDPOINTS_KEY,
          JSON.stringify(validRecents),
        );
      }

      return validRecents;
    } catch (error) {
      console.error("Error cleaning up expired endpoints:", error);
      return [];
    }
  },

  removeRecentEndpoint(id) {
    try {
      const recents = this.getRecentEndpoints();
      const filteredRecents = recents.filter((item) => item.id !== id);
      localStorage.setItem(
        this.RECENT_ENDPOINTS_KEY,
        JSON.stringify(filteredRecents),
      );
      return filteredRecents;
    } catch (error) {
      console.error("Error removing recent endpoint:", error);
      return [];
    }
  },

  clearRecentEndpoints() {
    try {
      localStorage.removeItem(this.RECENT_ENDPOINTS_KEY);
      return [];
    } catch (error) {
      console.error("Error clearing recent endpoints:", error);
      return [];
    }
  },
};
