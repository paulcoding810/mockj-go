// API Client and Application Logic
class MockJGoClient {
    constructor(baseUrl = window.location.origin) {
        this.baseUrl = baseUrl;
    }

    async request(endpoint, options = {}) {
        const url = `${this.baseUrl}${endpoint}`;
        const config = {
            headers: {
                'Content-Type': 'application/json',
                ...options.headers,
            },
            ...options,
        };

        try {
            const response = await fetch(url, config);
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || data.message || `HTTP ${response.status}`);
            }

            return data;
        } catch (error) {
            console.error('API request failed:', error);
            throw error;
        }
    }

    async createJson(jsonContent, password, expiresInHours = 720) {
        const expires = new Date();
        expires.setHours(expires.getHours() + parseInt(expiresInHours));

        return this.request('/api/json', {
            method: 'POST',
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
            method: 'PUT',
            body: JSON.stringify({
                json: jsonContent,
                password: password,
                expires: expires.toISOString(),
            }),
        });
    }

    async deleteJson(id, password) {
        return this.request(`/api/json/${id}`, {
            method: 'DELETE',
            body: JSON.stringify({
                password: password,
            }),
        });
    }
}

// Toast Notification System
class ToastManager {
    constructor() {
        this.container = document.getElementById('toastContainer');
    }

    show(message, type = 'info', duration = 5000) {
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        
        const icons = {
            success: '✅',
            error: '❌',
            warning: '⚠️',
            info: 'ℹ️',
        };

        toast.innerHTML = `
            <div class="toast-content">
                <span class="toast-icon">${icons[type]}</span>
                <span class="toast-message">${message}</span>
            </div>
        `;

        this.container.appendChild(toast);

        setTimeout(() => {
            toast.style.animation = 'slideIn 0.3s ease reverse';
            setTimeout(() => {
                if (toast.parentNode) {
                    toast.parentNode.removeChild(toast);
                }
            }, 300);
        }, duration);
    }

    success(message) {
        this.show(message, 'success');
    }

    error(message) {
        this.show(message, 'error', 8000);
    }

    warning(message) {
        this.show(message, 'warning');
    }

    info(message) {
        this.show(message, 'info');
    }
}

// JSON Validator and Formatter
class JsonHelper {
    static validate(jsonString) {
        try {
            JSON.parse(jsonString);
            return { valid: true, error: null };
        } catch (error) {
            return { valid: false, error: error.message };
        }
    }

    static format(jsonString) {
        try {
            const parsed = JSON.parse(jsonString);
            return JSON.stringify(parsed, null, 2);
        } catch (error) {
            return jsonString;
        }
    }

    static isValid(jsonString) {
        return this.validate(jsonString).valid;
    }
}

// Application Controller
class MockJGoApp {
    constructor() {
        this.client = new MockJGoClient();
        this.toast = new ToastManager();
        this.currentEndpoint = null;
        
        this.init();
    }

    init() {
        this.bindEvents();
        this.setupJsonValidation();
        this.loadFromUrl();
    }

    bindEvents() {
        // Create form
        document.getElementById('createForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleCreate();
        });

        // Format button
        document.getElementById('formatBtn').addEventListener('click', () => {
            this.formatJson();
        });

        // Copy URL button
        document.getElementById('copyUrlBtn').addEventListener('click', () => {
            this.copyUrl();
        });

        // View form
        document.getElementById('viewForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleView();
        });

        // Update form
        document.getElementById('updateForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleUpdate();
        });

        // Delete form
        document.getElementById('deleteForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleDelete();
        });

        // Navigation buttons
        document.getElementById('viewJsonBtn').addEventListener('click', () => {
            this.showSection('viewSection');
            if (this.currentEndpoint) {
                document.getElementById('viewId').value = this.currentEndpoint.id;
            }
        });

        document.getElementById('updateJsonBtn').addEventListener('click', () => {
            this.showSection('updateSection');
            if (this.currentEndpoint) {
                document.getElementById('updateId').value = this.currentEndpoint.id;
            }
        });

        document.getElementById('deleteJsonBtn').addEventListener('click', () => {
            this.showSection('deleteSection');
            if (this.currentEndpoint) {
                document.getElementById('deleteId').value = this.currentEndpoint.id;
            }
        });
    }

    setupJsonValidation() {
        const jsonEditor = document.getElementById('jsonContent');
        const validationStatus = document.getElementById('validationStatus');
        const updateJsonEditor = document.getElementById('updateJson');

        const validateJson = (textarea, statusElement) => {
            const validation = JsonHelper.validate(textarea.value);
            
            if (textarea.value.trim() === '') {
                statusElement.textContent = '';
                statusElement.className = 'validation-status';
                return true;
            }

            if (validation.valid) {
                statusElement.textContent = '✓ Valid JSON';
                statusElement.className = 'validation-status valid';
                return true;
            } else {
                statusElement.textContent = `✗ ${validation.error}`;
                statusElement.className = 'validation-status invalid';
                return false;
            }
        };

        jsonEditor.addEventListener('input', () => {
            validateJson(jsonEditor, validationStatus);
        });

        updateJsonEditor.addEventListener('input', () => {
            const updateValidation = document.getElementById('updateValidation');
            if (!updateValidation) {
                const statusDiv = document.createElement('div');
                statusDiv.id = 'updateValidation';
                statusDiv.className = 'validation-status';
                updateJsonEditor.parentNode.appendChild(statusDiv);
            }
            validateJson(updateJsonEditor, document.getElementById('updateValidation'));
        });
    }

    formatJson() {
        const jsonEditor = document.getElementById('jsonContent');
        const formatted = JsonHelper.format(jsonEditor.value);
        jsonEditor.value = formatted;
        
        // Trigger validation
        jsonEditor.dispatchEvent(new Event('input'));
        
        this.toast.success('JSON formatted successfully');
    }

    async handleCreate() {
        const jsonContent = document.getElementById('jsonContent').value;
        const password = document.getElementById('password').value;
        const expiresIn = document.getElementById('expiresIn').value;

        // Validate JSON
        if (!JsonHelper.isValid(jsonContent)) {
            this.toast.error('Invalid JSON format');
            return;
        }

        try {
            this.setLoading('createForm', true);
            
            const response = await this.client.createJson(jsonContent, password, expiresIn);
            this.currentEndpoint = response.data;
            
            this.showResult(response.data);
            this.toast.success('Endpoint created successfully!');
            
            // Update URL
            const url = new URL(window.location);
            url.searchParams.set('id', response.data.id);
            window.history.pushState({}, '', url);
            
        } catch (error) {
            this.toast.error(`Failed to create endpoint: ${error.message}`);
        } finally {
            this.setLoading('createForm', false);
        }
    }

    async handleView() {
        const id = document.getElementById('viewId').value;

        if (!id) {
            this.toast.error('Please enter an endpoint ID');
            return;
        }

        try {
            this.setLoading('viewForm', true);
            
            const response = await this.client.getJson(id);
            this.showViewResult(response.data);
            
            this.toast.success('JSON loaded successfully');
            
        } catch (error) {
            this.toast.error(`Failed to load JSON: ${error.message}`);
        } finally {
            this.setLoading('viewForm', false);
        }
    }

    async handleUpdate() {
        const id = document.getElementById('updateId').value;
        const jsonContent = document.getElementById('updateJson').value;
        const password = document.getElementById('updatePassword').value;
        const expiresIn = document.getElementById('updateExpires').value;

        if (!id || !jsonContent || !password) {
            this.toast.error('Please fill in all required fields');
            return;
        }

        // Validate JSON
        if (!JsonHelper.isValid(jsonContent)) {
            this.toast.error('Invalid JSON format');
            return;
        }

        try {
            this.setLoading('updateForm', true);
            
            const response = await this.client.updateJson(id, jsonContent, password, expiresIn);
            
            this.toast.success('Endpoint updated successfully!');
            
            // Clear form
            document.getElementById('updateForm').reset();
            
            // Show updated result
            this.showResult(response.data);
            
        } catch (error) {
            this.toast.error(`Failed to update endpoint: ${error.message}`);
        } finally {
            this.setLoading('updateForm', false);
        }
    }

    async handleDelete() {
        const id = document.getElementById('deleteId').value;
        const password = document.getElementById('deletePassword').value;

        if (!id || !password) {
            this.toast.error('Please enter both ID and password');
            return;
        }

        if (!confirm('Are you sure you want to delete this endpoint? This action cannot be undone.')) {
            return;
        }

        try {
            this.setLoading('deleteForm', true);
            
            await this.client.deleteJson(id, password);
            
            this.toast.success('Endpoint deleted successfully');
            
            // Clear form and hide sections
            document.getElementById('deleteForm').reset();
            document.getElementById('resultSection').style.display = 'none';
            this.currentEndpoint = null;
            
            // Update URL
            const url = new URL(window.location);
            url.searchParams.delete('id');
            window.history.pushState({}, '', url);
            
        } catch (error) {
            this.toast.error(`Failed to delete endpoint: ${error.message}`);
        } finally {
            this.setLoading('deleteForm', false);
        }
    }

    showResult(endpoint) {
        const resultSection = document.getElementById('resultSection');
        const endpointUrl = document.getElementById('endpointUrl');
        const endpointId = document.getElementById('endpointId');
        const createdTime = document.getElementById('createdTime');
        const expiresTime = document.getElementById('expiresTime');

        endpointUrl.value = `${window.location.origin}/api/json/${endpoint.id}`;
        endpointId.textContent = endpoint.id;
        createdTime.textContent = new Date(endpoint.createdAt).toLocaleString();
        expiresTime.textContent = new Date(endpoint.expires).toLocaleString();

        resultSection.style.display = 'block';
        resultSection.scrollIntoView({ behavior: 'smooth' });
    }

    showViewResult(endpoint) {
        const viewResult = document.getElementById('viewResult');
        const viewJsonContent = document.getElementById('viewJsonContent');
        const viewCreated = document.getElementById('viewCreated');
        const viewModified = document.getElementById('viewModified');
        const viewExpires = document.getElementById('viewExpires');

        viewJsonContent.textContent = JSON.stringify(JSON.parse(endpoint.json), null, 2);
        viewCreated.textContent = new Date(endpoint.createdAt).toLocaleString();
        viewModified.textContent = new Date(endpoint.modifiedAt).toLocaleString();
        viewExpires.textContent = new Date(endpoint.expires).toLocaleString();

        viewResult.style.display = 'block';
        viewResult.scrollIntoView({ behavior: 'smooth' });
    }

    copyUrl() {
        const endpointUrl = document.getElementById('endpointUrl');
        
        endpointUrl.select();
        endpointUrl.setSelectionRange(0, 99999);
        
        try {
            document.execCommand('copy');
            this.toast.success('URL copied to clipboard!');
        } catch (error) {
            // Fallback for modern browsers
            navigator.clipboard.writeText(endpointUrl.value).then(() => {
                this.toast.success('URL copied to clipboard!');
            }).catch(() => {
                this.toast.error('Failed to copy URL');
            });
        }
    }

    showSection(sectionId) {
        // Hide all sections
        const sections = ['resultSection', 'viewSection', 'updateSection', 'deleteSection'];
        sections.forEach(id => {
            const section = document.getElementById(id);
            if (section) {
                section.style.display = 'none';
            }
        });

        // Show target section
        const targetSection = document.getElementById(sectionId);
        if (targetSection) {
            targetSection.style.display = 'block';
            targetSection.scrollIntoView({ behavior: 'smooth' });
        }
    }

    setLoading(formId, loading) {
        const form = document.getElementById(formId);
        const submitBtn = form.querySelector('button[type="submit"]');
        
        if (loading) {
            submitBtn.disabled = true;
            submitBtn.textContent = 'Loading...';
            form.classList.add('loading');
        } else {
            submitBtn.disabled = false;
            submitBtn.textContent = submitBtn.id === 'deleteForm' ? 'Delete Endpoint' : 
                                   submitBtn.id === 'updateForm' ? 'Update Endpoint' :
                                   submitBtn.id === 'viewForm' ? 'Load JSON' :
                                   'Create Endpoint';
            form.classList.remove('loading');
        }
    }

    loadFromUrl() {
        const urlParams = new URLSearchParams(window.location.search);
        const id = urlParams.get('id');
        
        if (id) {
            // Auto-load the endpoint from URL
            document.getElementById('viewId').value = id;
            this.handleView();
        }
    }
}

// Initialize application when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    new MockJGoApp();
});

// Handle browser back/forward buttons
window.addEventListener('popstate', () => {
    const urlParams = new URLSearchParams(window.location.search);
    const id = urlParams.get('id');
    
    if (id) {
        document.getElementById('viewId').value = id;
        // Optionally auto-load again
    }
});

// Keyboard shortcuts
document.addEventListener('keydown', (e) => {
    // Ctrl/Cmd + Enter to submit forms
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        const activeElement = document.activeElement;
        if (activeElement && activeElement.tagName === 'TEXTAREA') {
            const form = activeElement.closest('form');
            if (form) {
                form.dispatchEvent(new Event('submit'));
            }
        }
    }
    
    // Escape to clear forms
    if (e.key === 'Escape') {
        const activeElement = document.activeElement;
        if (activeElement && activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA') {
            activeElement.blur();
        }
    }
});