// API Client for Chef Stefan Admin Panel

class APIClient {
    constructor(baseURL = '') {
        this.baseURL = baseURL;
        this.timeout = 30000; // 30 seconds timeout
    }

    // Generic fetch wrapper with error handling
    async request(endpoint, options = {}) {
        const url = `${this.baseURL}/api${endpoint}`;
        
        const defaultOptions = {
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            },
            timeout: this.timeout
        };

        // Don't set Content-Type for FormData
        if (options.body instanceof FormData) {
            delete defaultOptions.headers['Content-Type'];
        }

        const config = {
            ...defaultOptions,
            ...options
        };

        try {
            const response = await fetch(url, config);
            
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
            }

            // Handle empty responses
            const contentType = response.headers.get('content-type');
            if (contentType && contentType.includes('application/json')) {
                return await response.json();
            } else {
                return await response.text();
            }
        } catch (error) {
            console.error('API Request failed:', error);
            throw error;
        }
    }

    // Categories API
    async getCategories() {
        return this.request('/categories');
    }

    async createCategory(categoryData) {
        return this.request('/categories', {
            method: 'POST',
            body: JSON.stringify(categoryData)
        });
    }

    async updateCategory(categoryId, categoryData) {
        return this.request(`/categories/${categoryId}`, {
            method: 'PUT',
            body: JSON.stringify(categoryData)
        });
    }

    async deleteCategory(categoryId) {
        return this.request(`/categories/${categoryId}`, {
            method: 'DELETE'
        });
    }

    // Menu Items API
    async getMenuItems() {
        return this.request('/menu-items');
    }

    async createMenuItem(menuItemData) {
        const formData = new FormData();
        
        // Append all fields to FormData
        Object.keys(menuItemData).forEach(key => {
            if (key === 'image' && menuItemData[key] instanceof File) {
                formData.append('image', menuItemData[key]);
            } else {
                formData.append(key, menuItemData[key]);
            }
        });

        return this.request('/menu-items', {
            method: 'POST',
            body: formData
        });
    }

    async updateMenuItem(itemId, menuItemData) {
        const formData = new FormData();
        
        // Append all fields to FormData
        Object.keys(menuItemData).forEach(key => {
            if (key === 'image' && menuItemData[key] instanceof File) {
                formData.append('image', menuItemData[key]);
            } else {
                formData.append(key, menuItemData[key]);
            }
        });

        return this.request(`/menu-items/${itemId}`, {
            method: 'PUT',
            body: formData
        });
    }

    async deleteMenuItem(itemId) {
        return this.request(`/menu-items/${itemId}`, {
            method: 'DELETE'
        });
    }

    // Gallery API
    async getGalleryImages() {
        return this.request('/gallery');
    }

    async uploadGalleryImages(imagesData) {
        const formData = new FormData();
        
        // Handle multiple images
        imagesData.forEach((imageData, index) => {
            if (imageData.file instanceof File) {
                formData.append('images', imageData.file);
                formData.append(`title`, imageData.title || '');
                formData.append(`description`, imageData.description || '');
                formData.append(`type`, imageData.type || 'food');
                formData.append(`featured`, imageData.featured || false);
            }
        });

        return this.request('/gallery', {
            method: 'POST',
            body: formData
        });
    }

    async updateGalleryImage(imageId, imageData) {
        return this.request(`/gallery/${imageId}`, {
            method: 'PUT',
            body: JSON.stringify(imageData)
        });
    }

    async deleteGalleryImage(imageId) {
        return this.request(`/gallery/${imageId}`, {
            method: 'DELETE'
        });
    }

    // Users API
    async getUsers() {
        return this.request('/users');
    }

    async createUser(userData) {
        return this.request('/users', {
            method: 'POST',
            body: JSON.stringify(userData)
        });
    }

    async updateUser(userId, userData) {
        return this.request(`/users/${userId}`, {
            method: 'PUT',
            body: JSON.stringify(userData)
        });
    }

    async deleteUser(userId) {
        return this.request(`/users/${userId}`, {
            method: 'DELETE'
        });
    }

    // Statistics API
    async getStatistics() {
        return this.request('/stats');
    }
}

// Create global API client instance
window.apiClient = new APIClient();

// Utility functions for common UI patterns
class UIHelpers {
    static showAlert(message, type = 'info', duration = 5000) {
        const alertDiv = document.createElement('div');
        alertDiv.className = `alert alert-${type} alert-dismissible fade show position-fixed`;
        alertDiv.style.cssText = 'top: 20px; right: 20px; z-index: 9999; max-width: 400px;';
        alertDiv.innerHTML = `
            <i class="fas fa-${this.getAlertIcon(type)} me-2"></i>
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
        `;
        
        document.body.appendChild(alertDiv);

        // Auto remove
        setTimeout(() => {
            if (alertDiv.parentNode) {
                alertDiv.remove();
            }
        }, duration);

        return alertDiv;
    }

    static getAlertIcon(type) {
        const icons = {
            'success': 'check-circle',
            'error': 'exclamation-triangle',
            'danger': 'exclamation-triangle',
            'warning': 'exclamation-triangle',
            'info': 'info-circle'
        };
        return icons[type] || 'info-circle';
    }

    static showLoading(element, text = 'Loading...') {
        if (element) {
            element.innerHTML = `
                <div class="d-flex align-items-center justify-content-center p-3">
                    <div class="spinner-border spinner-border-sm me-2" role="status"></div>
                    <span>${text}</span>
                </div>
            `;
        }
    }

    static hideLoading(element, originalContent = '') {
        if (element) {
            element.innerHTML = originalContent;
        }
    }

    static confirmAction(message, title = 'Confirm Action') {
        return new Promise((resolve) => {
            const modalId = 'confirmModal_' + Date.now();
            const modalHtml = `
                <div class="modal fade" id="${modalId}" tabindex="-1">
                    <div class="modal-dialog">
                        <div class="modal-content">
                            <div class="modal-header">
                                <h5 class="modal-title">${title}</h5>
                                <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                            </div>
                            <div class="modal-body">
                                <p>${message}</p>
                            </div>
                            <div class="modal-footer">
                                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                                <button type="button" class="btn btn-danger" id="confirmBtn">Confirm</button>
                            </div>
                        </div>
                    </div>
                </div>
            `;

            document.body.insertAdjacentHTML('beforeend', modalHtml);
            const modal = new bootstrap.Modal(document.getElementById(modalId));
            
            document.getElementById('confirmBtn').onclick = () => {
                modal.hide();
                resolve(true);
            };

            modal._element.addEventListener('hidden.bs.modal', () => {
                document.getElementById(modalId).remove();
                resolve(false);
            });

            modal.show();
        });
    }

    static formatPrice(price) {
        return new Intl.NumberFormat('en-ZA', {
            style: 'currency',
            currency: 'ZAR'
        }).format(price);
    }

    static formatDate(dateString) {
        return new Intl.DateTimeFormat('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        }).format(new Date(dateString));
    }

    static formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    static createImagePreview(file) {
        return new Promise((resolve, reject) => {
            if (!file.type.startsWith('image/')) {
                reject(new Error('File is not an image'));
                return;
            }

            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    }

    static debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    static validateEmail(email) {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(email);
    }

    static validateForm(formElement) {
        const inputs = formElement.querySelectorAll('input[required], select[required], textarea[required]');
        let isValid = true;
        
        inputs.forEach(input => {
            if (!input.value.trim()) {
                input.classList.add('is-invalid');
                isValid = false;
            } else {
                input.classList.remove('is-invalid');
                
                // Special validation for email
                if (input.type === 'email' && !this.validateEmail(input.value)) {
                    input.classList.add('is-invalid');
                    isValid = false;
                }
            }
        });
        
        return isValid;
    }
}

// Make UIHelpers globally available
window.UIHelpers = UIHelpers;

// Global error handler
window.addEventListener('unhandledrejection', event => {
    console.error('Unhandled promise rejection:', event.reason);
    UIHelpers.showAlert('An unexpected error occurred. Please try again.', 'danger');
});

// Network status monitoring
window.addEventListener('online', () => {
    UIHelpers.showAlert('Connection restored', 'success', 3000);
});

window.addEventListener('offline', () => {
    UIHelpers.showAlert('You are offline. Some features may not work.', 'warning');
});