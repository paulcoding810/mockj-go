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
  }
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
      return 'Expired';
    }
    
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    
    if (days > 0) {
      return `${days} day${days > 1 ? 's' : ''} ${hours} hour${hours > 1 ? 's' : ''}`;
    } else if (hours > 0) {
      return `${hours} hour${hours > 1 ? 's' : ''}`;
    } else {
      return 'Less than 1 hour';
    }
  }
};

// Clipboard utilities
export const ClipboardHelper = {
  async copy(text) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (err) {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = text;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      return true;
    }
  }
};