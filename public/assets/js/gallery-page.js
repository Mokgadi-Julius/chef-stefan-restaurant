/**
 * Gallery Page JavaScript - Chef Stefan
 * Modern gallery with filtering, search, and view modes
 */

class GalleryPage {
    constructor() {
        this.images = [];
        this.filteredImages = [];
        this.currentFilter = 'all';
        this.currentView = 'grid';
        this.searchTerm = '';
        this.imagesPerPage = 12;
        this.currentPage = 1;
        this.totalPages = 1;
        this.lightbox = null;
        
        this.init();
    }

    async init() {
        console.log('Initializing Gallery Page...');
        
        // Load all gallery images from the directory
        await this.loadGalleryImages();
        
        // Generate dynamic filter buttons based on available categories
        this.generateFilterButtons();
        
        // Initialize components
        this.initializeEventListeners();
        this.initializeLightbox();
        this.showLoading(false);
        
        // Load initial images
        this.filterImages();
        this.renderImages();
        
        console.log('Gallery Page initialized successfully');
    }

    async loadGalleryImages() {
        try {
            const response = await fetch('http://localhost:3000/api/gallery');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const galleryImages = await response.json();
            
            // Transform API data to match expected format
            this.images = galleryImages.map(image => ({
                id: image.id,
                filename: image.image_path.split('/').pop(),
                src: image.image_path,
                alt: image.description || image.title,
                category: image.type || 'food',
                title: image.title,
                description: image.description,
                featured: image.featured === 1
            }));

            // Update total count in hero section
            const totalImagesElement = document.getElementById('totalImages');
            if (totalImagesElement) {
                totalImagesElement.textContent = this.images.length;
            }

            console.log(`Loaded ${this.images.length} images from backend`);
        } catch (error) {
            console.error('Error loading gallery images from backend:', error);
            // Fallback to empty array if backend is not available
            this.images = [];
            this.showError('Unable to load gallery images. Please try again later.');
        }
    }

    generateFilterButtons() {
        // Get unique categories from loaded images
        const categories = [...new Set(this.images.map(img => img.category))];
        const filterButtonsContainer = document.getElementById('filterButtons');
        
        if (!filterButtonsContainer) return;
        
        // Category configurations
        const categoryConfig = {
            food: { icon: 'bi-cup-hot', label: 'Food Artistry' },
            events: { icon: 'bi-calendar-event', label: 'Events' },
            kitchen: { icon: 'bi-house', label: 'Behind Scenes' },
            presentation: { icon: 'bi-stars', label: 'Presentations' },
            desserts: { icon: 'bi-cake', label: 'Desserts' },
            appetizers: { icon: 'bi-leaf', label: 'Appetizers' },
            beverages: { icon: 'bi-cup', label: 'Beverages' }
        };
        
        // Keep the "All Images" button and add dynamic category buttons
        const allButton = filterButtonsContainer.querySelector('[data-filter="all"]');
        filterButtonsContainer.innerHTML = '';
        filterButtonsContainer.appendChild(allButton);
        
        // Add category buttons
        categories.forEach(category => {
            const config = categoryConfig[category] || { icon: 'bi-image', label: category.charAt(0).toUpperCase() + category.slice(1) };
            const button = document.createElement('button');
            button.className = 'filter-btn';
            button.dataset.filter = category;
            button.innerHTML = `
                <i class="bi ${config.icon}"></i>
                <span>${config.label}</span>
            `;
            filterButtonsContainer.appendChild(button);
        });
        
        console.log(`Generated ${categories.length} category filter buttons`);
    }

    categorizeImage(filename) {
        const name = filename.toLowerCase();
        
        // Simple categorization based on filename patterns
        if (name.includes('gallery-')) {
            return 'food';
        } else if (name.includes('whatsapp') && name.includes('13.08')) {
            return 'events';
        } else if (name.includes('whatsapp') && name.includes('13.14')) {
            return 'presentation';
        } else if (name.includes('whatsapp') && name.includes('15.45')) {
            return 'kitchen';
        } else {
            return 'food'; // default category
        }
    }

    generateImageTitle(filename, category) {
        const categoryTitles = {
            food: 'Culinary Artistry',
            events: 'Event Catering',
            kitchen: 'Behind the Scenes',
            presentation: 'Elegant Presentation'
        };
        
        return categoryTitles[category] || 'Chef Stefan\'s Creation';
    }

    initializeEventListeners() {
        // Filter buttons
        const filterButtons = document.querySelectorAll('.filter-btn');
        filterButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const filter = e.currentTarget.dataset.filter;
                this.setFilter(filter);
            });
        });

        // Search input
        const searchInput = document.getElementById('searchInput');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.setSearchTerm(e.target.value);
            });
        }

        // View toggle buttons
        const gridViewBtn = document.getElementById('gridViewBtn');
        const masonryViewBtn = document.getElementById('masonryViewBtn');
        
        if (gridViewBtn) {
            gridViewBtn.addEventListener('click', () => this.setView('grid'));
        }
        
        if (masonryViewBtn) {
            masonryViewBtn.addEventListener('click', () => this.setView('masonry'));
        }

        // Pagination event listeners will be added dynamically

        // Lazy loading with Intersection Observer
        this.initializeLazyLoading();
    }

    initializeLightbox() {
        // Initialize GLightbox for gallery images
        this.lightbox = GLightbox({
            selector: '.gallery-lightbox',
            touchNavigation: true,
            loop: true,
            autoplayVideos: false,
            descPosition: 'bottom'
        });
    }

    initializeLazyLoading() {
        if ('IntersectionObserver' in window) {
            this.imageObserver = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        const img = entry.target;
                        const src = img.dataset.src;
                        if (src) {
                            img.src = src;
                            img.removeAttribute('data-src');
                            img.classList.remove('lazy');
                            this.imageObserver.unobserve(img);
                        }
                    }
                });
            });
        }
    }

    setFilter(filter) {
        this.currentFilter = filter;
        this.currentPage = 1;
        
        // Update active filter button
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-filter="${filter}"]`).classList.add('active');
        
        this.filterImages();
        this.renderImages();
    }

    setSearchTerm(term) {
        this.searchTerm = term.toLowerCase();
        this.currentPage = 1;
        this.filterImages();
        this.renderImages();
    }

    setView(view) {
        this.currentView = view;
        
        // Update view toggle buttons
        document.querySelectorAll('.btn-group .btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.getElementById(`${view}ViewBtn`).classList.add('active');
        
        // Show/hide appropriate view containers
        const gridView = document.getElementById('gridView');
        const masonryView = document.getElementById('masonryView');
        
        if (view === 'grid') {
            gridView.style.display = 'block';
            masonryView.style.display = 'none';
        } else {
            gridView.style.display = 'none';
            masonryView.style.display = 'block';
        }
        
        this.renderImages();
    }

    filterImages() {
        this.filteredImages = this.images.filter(image => {
            // Filter by category
            const categoryMatch = this.currentFilter === 'all' || image.category === this.currentFilter;
            
            // Filter by search term
            const searchMatch = this.searchTerm === '' || 
                image.title.toLowerCase().includes(this.searchTerm) ||
                image.alt.toLowerCase().includes(this.searchTerm) ||
                image.category.toLowerCase().includes(this.searchTerm);
            
            return categoryMatch && searchMatch;
        });
        
        // Calculate total pages
        this.totalPages = Math.ceil(this.filteredImages.length / this.imagesPerPage);
        
        console.log(`Filtered to ${this.filteredImages.length} images, ${this.totalPages} pages`);
    }

    renderImages() {
        const container = this.currentView === 'grid' ? 
            document.getElementById('galleryGrid') : 
            document.getElementById('masonryLayout');
        
        if (!container) return;
        
        // Clear container
        container.innerHTML = '';
        
        // Show loading
        this.showLoading(true);
        
        // Render images with delay for smooth loading
        setTimeout(() => {
            const startIndex = (this.currentPage - 1) * this.imagesPerPage;
            const endIndex = startIndex + this.imagesPerPage;
            const imagesToShow = this.filteredImages.slice(startIndex, endIndex);
            
            imagesToShow.forEach((image, index) => {
                const imageElement = this.createImageElement(image, index);
                container.appendChild(imageElement);
                
                // Observe for lazy loading
                if (this.imageObserver) {
                    const img = imageElement.querySelector('img');
                    if (img) {
                        this.imageObserver.observe(img);
                    }
                }
            });
            
            this.showLoading(false);
            this.updatePagination();
            
            // Reinitialize lightbox for new images
            if (this.lightbox) {
                this.lightbox.reload();
            }
            
            // Trigger AOS refresh for animations
            if (typeof AOS !== 'undefined') {
                AOS.refresh();
            }
            
        }, 300);
    }

    createImageElement(image, index) {
        const imageDiv = document.createElement('div');
        imageDiv.className = this.currentView === 'grid' ? 'gallery-item' : 'masonry-item';
        imageDiv.setAttribute('data-aos', 'fade-up');
        imageDiv.setAttribute('data-aos-delay', (index % 12) * 50);
        
        imageDiv.innerHTML = `
            <div class="gallery-img-container">
                <img 
                    data-src="${image.src}" 
                    alt="${image.alt}" 
                    class="lazy gallery-img"
                    loading="lazy"
                >
                <div class="gallery-overlay">
                    <div class="gallery-info">
                        <h4>${image.title}</h4>
                        <p>Chef Stefan's Culinary Art</p>
                    </div>
                    <div class="gallery-actions">
                        <a href="${image.src}" class="gallery-lightbox" data-gallery="gallery-${image.category}">
                            <i class="bi bi-eye"></i>
                        </a>
                    </div>
                </div>
            </div>
        `;
        
        return imageDiv;
    }

    setPage(page) {
        if (page < 1 || page > this.totalPages) return;
        
        this.currentPage = page;
        this.renderImages();
        
        // Scroll to top of gallery
        const galleryContent = document.querySelector('.gallery-content-section');
        if (galleryContent) {
            galleryContent.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    }

    updatePagination() {
        const loadMoreContainer = document.getElementById('loadMoreContainer');
        
        if (this.totalPages <= 1) {
            loadMoreContainer.style.display = 'none';
            return;
        }
        
        // Create pagination HTML
        let paginationHtml = `
            <nav aria-label="Gallery pagination">
                <ul class="pagination justify-content-center">
        `;
        
        // Previous button
        const prevDisabled = this.currentPage === 1 ? 'disabled' : '';
        paginationHtml += `
            <li class="page-item ${prevDisabled}">
                <a class="page-link" href="#" data-page="${this.currentPage - 1}" aria-label="Previous">
                    <span aria-hidden="true">&laquo;</span>
                </a>
            </li>
        `;
        
        // Page numbers
        const startPage = Math.max(1, this.currentPage - 2);
        const endPage = Math.min(this.totalPages, this.currentPage + 2);
        
        for (let i = startPage; i <= endPage; i++) {
            const active = i === this.currentPage ? 'active' : '';
            paginationHtml += `
                <li class="page-item ${active}">
                    <a class="page-link" href="#" data-page="${i}">${i}</a>
                </li>
            `;
        }
        
        // Next button
        const nextDisabled = this.currentPage === this.totalPages ? 'disabled' : '';
        paginationHtml += `
            <li class="page-item ${nextDisabled}">
                <a class="page-link" href="#" data-page="${this.currentPage + 1}" aria-label="Next">
                    <span aria-hidden="true">&raquo;</span>
                </a>
            </li>
        `;
        
        paginationHtml += `
                </ul>
            </nav>
            <div class="pagination-info text-center mt-3">
                <small class="text-muted">
                    Showing ${((this.currentPage - 1) * this.imagesPerPage) + 1} to 
                    ${Math.min(this.currentPage * this.imagesPerPage, this.filteredImages.length)} 
                    of ${this.filteredImages.length} images
                </small>
            </div>
        `;
        
        loadMoreContainer.innerHTML = paginationHtml;
        loadMoreContainer.style.display = 'block';
        
        // Add click event listeners to pagination links
        const paginationLinks = loadMoreContainer.querySelectorAll('.page-link');
        paginationLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const page = parseInt(e.target.dataset.page);
                if (!isNaN(page)) {
                    this.setPage(page);
                }
            });
        });
    }

    showLoading(show) {
        const loadingContainer = document.getElementById('loadingContainer');
        if (loadingContainer) {
            loadingContainer.style.display = show ? 'flex' : 'none';
        }
    }

    showError(message) {
        // Remove existing error messages
        const existingError = document.querySelector('.gallery-error');
        if (existingError) {
            existingError.remove();
        }

        // Create error element
        const errorDiv = document.createElement('div');
        errorDiv.className = 'gallery-error alert alert-warning text-center';
        errorDiv.innerHTML = `
            <div class="container">
                <i class="bi bi-exclamation-triangle me-2"></i>
                ${message}
            </div>
        `;
        
        // Insert after gallery filters
        const filtersSection = document.querySelector('.gallery-filters-section');
        if (filtersSection) {
            filtersSection.parentNode.insertBefore(errorDiv, filtersSection.nextSibling);
        }
    }
}

// Initialize gallery when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new GalleryPage();
});