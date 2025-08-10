/**
 * Blog JavaScript - Chef Stefan
 * Handles dynamic blog functionality
 */

class BlogManager {
    constructor() {
        this.currentPage = 1;
        this.currentCategory = null;
        this.currentSearch = '';
        this.postsPerPage = 6;
        this.init();
    }

    init() {
        console.log('Initializing Blog Manager...');
        
        this.loadCategories();
        this.loadBlogPosts();
        this.initializeEventListeners();
        this.initializeAOS();
        
        console.log('Blog Manager initialized successfully');
    }

    initializeEventListeners() {
        // Search functionality
        const searchInput = document.getElementById('blogSearch');
        if (searchInput) {
            searchInput.addEventListener('keyup', (e) => {
                if (e.key === 'Enter') {
                    this.handleSearch();
                }
            });
        }

        const searchBtn = document.getElementById('searchBtn');
        if (searchBtn) {
            searchBtn.addEventListener('click', () => this.handleSearch());
        }

        // Category filtering
        document.addEventListener('click', (e) => {
            if (e.target.matches('.category-filter')) {
                e.preventDefault();
                const category = e.target.dataset.category;
                this.filterByCategory(category);
            }
        });

        // Load more functionality
        const loadMoreBtn = document.getElementById('loadMoreBtn');
        if (loadMoreBtn) {
            loadMoreBtn.addEventListener('click', () => this.loadMorePosts());
        }
    }

    initializeAOS() {
        if (typeof AOS !== 'undefined') {
            AOS.init({
                duration: 800,
                easing: 'slide',
                once: true,
                mirror: false
            });
        }
    }

    async loadCategories() {
        try {
            const response = await fetch('/api/blog/categories');
            const categories = await response.json();
            
            this.renderCategoriesFilter(categories);
            this.renderCategoriesSidebar(categories);
            
        } catch (error) {
            console.error('Error loading categories:', error);
        }
    }

    renderCategoriesFilter(categories) {
        const filterContainer = document.getElementById('categoryFilters');
        if (!filterContainer) return;

        const filtersHTML = `
            <div class="d-flex flex-wrap justify-content-center gap-2 mb-4">
                <button class="btn btn-outline-primary category-filter ${!this.currentCategory ? 'active' : ''}" 
                        data-category="">
                    All Posts
                </button>
                ${categories.map(category => `
                    <button class="btn btn-outline-primary category-filter ${this.currentCategory === category.slug ? 'active' : ''}" 
                            data-category="${category.slug}"
                            style="border-color: ${category.color}; color: ${category.color};">
                        ${category.name}
                        <span class="badge ms-1" style="background-color: ${category.color};">${category.post_count}</span>
                    </button>
                `).join('')}
            </div>
        `;
        
        filterContainer.innerHTML = filtersHTML;
    }

    renderCategoriesSidebar(categories) {
        const sidebar = document.getElementById('categoriesSidebar');
        if (!sidebar) return;

        const sidebarHTML = categories.map(category => `
            <div class="category-item d-flex justify-content-between align-items-center p-3 mb-2 rounded" 
                 style="background: linear-gradient(135deg, ${category.color}15, ${category.color}05); border-left: 4px solid ${category.color};">
                <div>
                    <h6 class="mb-1">
                        <a href="#" class="category-filter text-decoration-none" 
                           data-category="${category.slug}" 
                           style="color: ${category.color};">
                            ${category.name}
                        </a>
                    </h6>
                    <small class="text-muted">${category.description || 'Discover amazing content'}</small>
                </div>
                <span class="badge rounded-pill" style="background-color: ${category.color};">
                    ${category.post_count}
                </span>
            </div>
        `).join('');

        sidebar.innerHTML = sidebarHTML;
    }

    async loadBlogPosts(append = false) {
        try {
            const params = new URLSearchParams({
                page: this.currentPage,
                limit: this.postsPerPage
            });

            if (this.currentCategory) {
                params.append('category', this.currentCategory);
            }

            if (this.currentSearch) {
                params.append('search', this.currentSearch);
            }

            this.showLoadingState();

            const response = await fetch(`/api/blog/posts?${params}`);
            const data = await response.json();

            if (append) {
                this.appendPosts(data.posts);
            } else {
                this.renderBlogPosts(data.posts);
            }
            
            this.updateLoadMoreButton(data.pagination);
            this.updateResultsInfo(data.pagination);

        } catch (error) {
            console.error('Error loading blog posts:', error);
            this.showErrorState();
        }
    }

    renderBlogPosts(posts) {
        const container = document.getElementById('blogPostsContainer');
        if (!container) return;

        if (posts.length === 0) {
            container.innerHTML = this.getEmptyState();
            return;
        }

        const postsHTML = posts.map((post, index) => this.createPostCard(post, index)).join('');
        container.innerHTML = postsHTML;

        // Re-initialize AOS for new content
        setTimeout(() => {
            if (typeof AOS !== 'undefined') {
                AOS.refresh();
            }
        }, 100);
    }

    appendPosts(posts) {
        const container = document.getElementById('blogPostsContainer');
        if (!container) return;

        const postsHTML = posts.map((post, index) => this.createPostCard(post, index + (this.currentPage - 1) * this.postsPerPage)).join('');
        container.insertAdjacentHTML('beforeend', postsHTML);

        // Re-initialize AOS for new content
        setTimeout(() => {
            if (typeof AOS !== 'undefined') {
                AOS.refresh();
            }
        }, 100);
    }

    createPostCard(post, index) {
        const publishedDate = post.published_at ? new Date(post.published_at).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        }) : 'Not published';

        const readingTime = post.reading_time || 5;
        const excerpt = post.excerpt || post.content.replace(/<[^>]*>/g, '').substring(0, 150) + '...';

        return `
            <div class="col-lg-4 col-md-6" data-aos="fade-up" data-aos-delay="${(index % 3) * 100}">
                <article class="blog-card h-100">
                    ${post.featured_image ? `
                        <div class="blog-card-image">
                            <img src="${post.featured_image}" alt="${this.escapeHtml(post.title)}" class="img-fluid">
                            <div class="blog-card-overlay">
                                <div class="blog-card-category" style="background-color: ${post.category_color || '#cda45e'};">
                                    ${post.category_name || 'Uncategorized'}
                                </div>
                            </div>
                        </div>
                    ` : `
                        <div class="blog-card-image blog-card-no-image" style="background: linear-gradient(135deg, ${post.category_color || '#cda45e'}22, ${post.category_color || '#cda45e'}11);">
                            <div class="blog-card-overlay">
                                <div class="blog-card-category" style="background-color: ${post.category_color || '#cda45e'};">
                                    ${post.category_name || 'Uncategorized'}
                                </div>
                                <div class="blog-icon">
                                    <i class="bi bi-journal-text" style="color: ${post.category_color || '#cda45e'};"></i>
                                </div>
                            </div>
                        </div>
                    `}
                    
                    <div class="blog-card-content">
                        <div class="blog-card-meta">
                            <span><i class="bi bi-calendar"></i> ${publishedDate}</span>
                            <span><i class="bi bi-clock"></i> ${readingTime} min read</span>
                            <span><i class="bi bi-eye"></i> ${post.view_count || 0} views</span>
                        </div>
                        
                        <h3 class="blog-card-title">
                            <a href="blog-post.html?slug=${post.slug}">${this.escapeHtml(post.title)}</a>
                        </h3>
                        
                        <p class="blog-card-excerpt">${this.escapeHtml(excerpt)}</p>
                        
                        <div class="blog-card-footer">
                            <div class="blog-card-author">
                                <i class="bi bi-person-circle"></i>
                                <span>by ${post.author_name || 'Chef Stefan'}</span>
                            </div>
                            <a href="blog-post.html?slug=${post.slug}" class="blog-read-more">
                                Read More <i class="bi bi-arrow-right"></i>
                            </a>
                        </div>
                    </div>
                </article>
            </div>
        `;
    }

    showLoadingState() {
        const container = document.getElementById('blogPostsContainer');
        if (!container) return;

        const loadingHTML = `
            <div class="col-12 text-center py-5">
                <div class="spinner-border text-primary" role="status" style="color: #cda45e !important;">
                    <span class="visually-hidden">Loading...</span>
                </div>
                <p class="mt-3 text-muted">Loading delicious content...</p>
            </div>
        `;

        container.innerHTML = loadingHTML;
    }

    showErrorState() {
        const container = document.getElementById('blogPostsContainer');
        if (!container) return;

        const errorHTML = `
            <div class="col-12 text-center py-5">
                <div class="text-danger mb-3">
                    <i class="bi bi-exclamation-triangle" style="font-size: 3rem;"></i>
                </div>
                <h4>Oops! Something went wrong</h4>
                <p class="text-muted">We couldn't load the blog posts. Please try again later.</p>
                <button class="btn btn-primary" onclick="location.reload()">
                    <i class="bi bi-arrow-clockwise"></i> Retry
                </button>
            </div>
        `;

        container.innerHTML = errorHTML;
    }

    getEmptyState() {
        return `
            <div class="col-12 text-center py-5">
                <div class="text-muted mb-3">
                    <i class="bi bi-journal-x" style="font-size: 4rem; color: #cda45e;"></i>
                </div>
                <h4>No Posts Found</h4>
                <p class="text-muted">
                    ${this.currentSearch ? `No posts found matching "${this.currentSearch}".` : 
                      this.currentCategory ? 'No posts found in this category.' : 
                      'No blog posts available at the moment.'}
                </p>
                ${(this.currentSearch || this.currentCategory) ? `
                    <button class="btn btn-outline-primary" onclick="blogManager.clearFilters()">
                        <i class="bi bi-arrow-clockwise"></i> Show All Posts
                    </button>
                ` : ''}
            </div>
        `;
    }

    updateLoadMoreButton(pagination) {
        const loadMoreBtn = document.getElementById('loadMoreBtn');
        if (!loadMoreBtn) return;

        if (pagination.hasNextPage) {
            loadMoreBtn.style.display = 'block';
            loadMoreBtn.disabled = false;
            loadMoreBtn.innerHTML = '<i class="bi bi-plus-circle"></i> Load More Posts';
        } else {
            loadMoreBtn.style.display = 'none';
        }
    }

    updateResultsInfo(pagination) {
        const resultsInfo = document.getElementById('resultsInfo');
        if (!resultsInfo) return;

        if (pagination.totalPosts === 0) {
            resultsInfo.innerHTML = '';
            return;
        }

        const start = ((pagination.currentPage - 1) * this.postsPerPage) + 1;
        const end = Math.min(pagination.currentPage * this.postsPerPage, pagination.totalPosts);

        resultsInfo.innerHTML = `
            <div class="text-center text-muted mb-4">
                Showing ${start} to ${end} of ${pagination.totalPosts} posts
                ${this.currentCategory ? ` in "${this.getCategoryName(this.currentCategory)}"` : ''}
                ${this.currentSearch ? ` matching "${this.currentSearch}"` : ''}
            </div>
        `;
    }

    handleSearch() {
        const searchInput = document.getElementById('blogSearch');
        if (!searchInput) return;

        this.currentSearch = searchInput.value.trim();
        this.currentPage = 1;
        this.loadBlogPosts();
        
        // Update URL without page reload
        this.updateURL();
    }

    filterByCategory(category) {
        this.currentCategory = category;
        this.currentPage = 1;
        this.loadBlogPosts();
        
        // Update active state
        document.querySelectorAll('.category-filter').forEach(btn => {
            btn.classList.remove('active');
        });
        
        document.querySelector(`[data-category="${category || ''}"]`)?.classList.add('active');
        
        // Update URL
        this.updateURL();
    }

    loadMorePosts() {
        this.currentPage++;
        this.loadBlogPosts(true);
    }

    clearFilters() {
        this.currentCategory = null;
        this.currentSearch = '';
        this.currentPage = 1;
        
        // Clear search input
        const searchInput = document.getElementById('blogSearch');
        if (searchInput) {
            searchInput.value = '';
        }
        
        // Update active state
        document.querySelectorAll('.category-filter').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector('[data-category=""]')?.classList.add('active');
        
        this.loadBlogPosts();
        this.updateURL();
    }

    updateURL() {
        const url = new URL(window.location);
        
        if (this.currentCategory) {
            url.searchParams.set('category', this.currentCategory);
        } else {
            url.searchParams.delete('category');
        }
        
        if (this.currentSearch) {
            url.searchParams.set('search', this.currentSearch);
        } else {
            url.searchParams.delete('search');
        }
        
        window.history.replaceState({}, '', url);
    }

    getCategoryName(slug) {
        // This should be populated when categories are loaded
        // For now, return the slug capitalized
        return slug.charAt(0).toUpperCase() + slug.slice(1);
    }

    escapeHtml(text) {
        const map = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        };
        return text ? text.replace(/[&<>"']/g, function(m) { return map[m]; }) : '';
    }
}

// Initialize blog manager when DOM is loaded
let blogManager;
document.addEventListener('DOMContentLoaded', () => {
    blogManager = new BlogManager();
    
    // Handle URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    const category = urlParams.get('category');
    const search = urlParams.get('search');
    
    if (category) {
        blogManager.currentCategory = category;
    }
    
    if (search) {
        blogManager.currentSearch = search;
        const searchInput = document.getElementById('blogSearch');
        if (searchInput) {
            searchInput.value = search;
        }
    }
});