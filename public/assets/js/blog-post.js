/**
 * Blog Post JavaScript - Chef Stefan
 * Handles individual blog post display
 */

class BlogPost {
    constructor() {
        this.postSlug = null;
        this.post = null;
        this.init();
    }

    init() {
        console.log('Initializing Blog Post...');
        
        // Get slug from URL
        const urlParams = new URLSearchParams(window.location.search);
        this.postSlug = urlParams.get('slug');
        
        if (!this.postSlug) {
            this.showError('No blog post specified');
            return;
        }
        
        this.loadBlogPost();
        this.initializeAOS();
        
        console.log('Blog Post initialized successfully');
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

    async loadBlogPost() {
        try {
            this.showLoadingState();
            
            const response = await fetch(`/api/blog/posts/${this.postSlug}`);
            
            if (!response.ok) {
                if (response.status === 404) {
                    this.showError('Blog post not found');
                } else {
                    this.showError('Failed to load blog post');
                }
                return;
            }
            
            this.post = await response.json();
            this.renderBlogPost();
            this.updateMetaTags();
            this.loadRelatedPosts();
            
        } catch (error) {
            console.error('Error loading blog post:', error);
            this.showError('Failed to load blog post');
        }
    }

    renderBlogPost() {
        const container = document.getElementById('blogPostContent');
        if (!container) return;

        const publishedDate = this.post.published_at ? 
            new Date(this.post.published_at).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            }) : 'Not published';

        const readingTime = this.post.reading_time || 5;

        const postHTML = `
            <article class="blog-post" data-aos="fade-up">
                
                <!-- Post Header -->
                <header class="post-header mb-5">
                    ${this.post.featured_image ? `
                        <div class="post-image mb-4">
                            <img src="${this.post.featured_image}" alt="${this.escapeHtml(this.post.title)}" class="img-fluid rounded">
                            <div class="post-image-overlay">
                                <div class="post-category" style="background-color: ${this.post.category_color || '#cda45e'};">
                                    ${this.post.category_name || 'Uncategorized'}
                                </div>
                            </div>
                        </div>
                    ` : ''}
                    
                    <h1 class="post-title">${this.escapeHtml(this.post.title)}</h1>
                    
                    <div class="post-meta">
                        <div class="post-meta-item">
                            <i class="bi bi-person-circle"></i>
                            <span>by ${this.post.author_name || 'Chef Stefan'}</span>
                        </div>
                        <div class="post-meta-item">
                            <i class="bi bi-calendar"></i>
                            <span>${publishedDate}</span>
                        </div>
                        <div class="post-meta-item">
                            <i class="bi bi-clock"></i>
                            <span>${readingTime} min read</span>
                        </div>
                        <div class="post-meta-item">
                            <i class="bi bi-eye"></i>
                            <span>${this.post.view_count || 0} views</span>
                        </div>
                        ${this.post.category_name ? `
                            <div class="post-meta-item">
                                <i class="bi bi-tag"></i>
                                <span style="color: ${this.post.category_color || '#cda45e'};">
                                    ${this.post.category_name}
                                </span>
                            </div>
                        ` : ''}
                    </div>
                    
                    ${this.post.excerpt ? `
                        <div class="post-excerpt">
                            <p class="lead">${this.escapeHtml(this.post.excerpt)}</p>
                        </div>
                    ` : ''}
                </header>
                
                <!-- Post Content -->
                <div class="post-content">
                    ${this.post.content}
                </div>
                
                <!-- Post Tags -->
                ${this.post.tags && this.post.tags.length > 0 ? `
                    <div class="post-tags mt-5">
                        <h5>Tags:</h5>
                        <div class="tags-list">
                            ${this.post.tags.map(tag => `
                                <span class="tag">#${tag.trim()}</span>
                            `).join('')}
                        </div>
                    </div>
                ` : ''}
                
                <!-- Social Share -->
                <div class="post-share mt-5">
                    <h5>Share this post:</h5>
                    <div class="share-buttons">
                        <button class="btn btn-share btn-facebook" onclick="shareOnFacebook()">
                            <i class="bi bi-facebook"></i> Facebook
                        </button>
                        <button class="btn btn-share btn-twitter" onclick="shareOnTwitter()">
                            <i class="bi bi-twitter"></i> Twitter
                        </button>
                        <button class="btn btn-share btn-linkedin" onclick="shareOnLinkedIn()">
                            <i class="bi bi-linkedin"></i> LinkedIn
                        </button>
                        <button class="btn btn-share btn-email" onclick="shareViaEmail()">
                            <i class="bi bi-envelope"></i> Email
                        </button>
                        <button class="btn btn-share btn-copy" onclick="copyLink()">
                            <i class="bi bi-link-45deg"></i> Copy Link
                        </button>
                    </div>
                </div>
                
            </article>
        `;

        container.innerHTML = postHTML;

        // Update breadcrumb
        this.updateBreadcrumb();
    }

    updateBreadcrumb() {
        const breadcrumb = document.getElementById('blogBreadcrumb');
        if (!breadcrumb) return;

        breadcrumb.innerHTML = `
            <nav aria-label="breadcrumb">
                <ol class="breadcrumb">
                    <li class="breadcrumb-item"><a href="index.html">Home</a></li>
                    <li class="breadcrumb-item"><a href="blog.html">Blog</a></li>
                    ${this.post.category_name ? `
                        <li class="breadcrumb-item">
                            <a href="blog.html?category=${this.post.category_slug}">${this.post.category_name}</a>
                        </li>
                    ` : ''}
                    <li class="breadcrumb-item active" aria-current="page">${this.escapeHtml(this.post.title)}</li>
                </ol>
            </nav>
        `;
    }

    updateMetaTags() {
        // Update page title
        document.title = `${this.post.seo_title || this.post.title} | Chef Stefan's Blog`;
        
        // Update meta description
        const metaDescription = document.querySelector('meta[name="description"]');
        if (metaDescription) {
            metaDescription.setAttribute('content', this.post.seo_description || this.post.excerpt || '');
        }

        // Update canonical URL
        const canonical = document.getElementById('canonical-url');
        if (canonical) {
            canonical.setAttribute('href', `https://chefstefan.co.za/blog-post.html?slug=${this.post.slug}`);
        }

        // Update Open Graph tags
        const ogTitle = document.getElementById('og-title');
        const ogDescription = document.getElementById('og-description');
        const ogUrl = document.getElementById('og-url');
        const ogImage = document.getElementById('og-image');

        if (ogTitle) ogTitle.setAttribute('content', this.post.title);
        if (ogDescription) ogDescription.setAttribute('content', this.post.excerpt || '');
        if (ogUrl) ogUrl.setAttribute('content', `https://chefstefan.co.za/blog-post.html?slug=${this.post.slug}`);
        if (ogImage && this.post.featured_image) ogImage.setAttribute('content', this.post.featured_image);

        // Update Twitter Card tags
        const twitterTitle = document.getElementById('twitter-title');
        const twitterDescription = document.getElementById('twitter-description');
        const twitterUrl = document.getElementById('twitter-url');
        const twitterImage = document.getElementById('twitter-image');

        if (twitterTitle) twitterTitle.setAttribute('content', this.post.title);
        if (twitterDescription) twitterDescription.setAttribute('content', this.post.excerpt || '');
        if (twitterUrl) twitterUrl.setAttribute('content', `https://chefstefan.co.za/blog-post.html?slug=${this.post.slug}`);
        if (twitterImage && this.post.featured_image) twitterImage.setAttribute('content', this.post.featured_image);
    }

    async loadRelatedPosts() {
        try {
            const response = await fetch(`/api/blog/posts?category=${this.post.category_slug}&limit=3`);
            const data = await response.json();
            
            // Filter out current post
            const relatedPosts = data.posts.filter(post => post.slug !== this.postSlug);
            
            this.renderRelatedPosts(relatedPosts.slice(0, 3));
            
        } catch (error) {
            console.error('Error loading related posts:', error);
        }
    }

    renderRelatedPosts(posts) {
        const container = document.getElementById('relatedPosts');
        if (!container || posts.length === 0) return;

        const relatedHTML = `
            <section class="related-posts" data-aos="fade-up">
                <h3>Related Posts</h3>
                <div class="row">
                    ${posts.map(post => {
                        const publishedDate = post.published_at ? 
                            new Date(post.published_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) :
                            'Recent';
                        
                        return `
                            <div class="col-md-4">
                                <article class="related-post-card">
                                    ${post.featured_image ? `
                                        <div class="related-post-image">
                                            <img src="${post.featured_image}" alt="${this.escapeHtml(post.title)}" class="img-fluid">
                                        </div>
                                    ` : `
                                        <div class="related-post-image related-post-no-image" style="background: linear-gradient(135deg, ${post.category_color || '#cda45e'}22, ${post.category_color || '#cda45e'}11);">
                                            <i class="bi bi-journal-text" style="color: ${post.category_color || '#cda45e'};"></i>
                                        </div>
                                    `}
                                    
                                    <div class="related-post-content">
                                        <div class="related-post-meta">
                                            <span>${publishedDate}</span>
                                            <span>•</span>
                                            <span>${post.reading_time || 5} min read</span>
                                        </div>
                                        <h4><a href="blog-post.html?slug=${post.slug}">${this.escapeHtml(post.title)}</a></h4>
                                        <p>${this.escapeHtml((post.excerpt || '').substring(0, 80))}...</p>
                                    </div>
                                </article>
                            </div>
                        `;
                    }).join('')}
                </div>
            </section>
        `;

        container.innerHTML = relatedHTML;
    }

    showLoadingState() {
        const container = document.getElementById('blogPostContent');
        if (!container) return;

        container.innerHTML = `
            <div class="text-center py-5">
                <div class="spinner-border text-primary" role="status" style="color: #cda45e !important;">
                    <span class="visually-hidden">Loading...</span>
                </div>
                <p class="mt-3 text-muted">Loading blog post...</p>
            </div>
        `;
    }

    showError(message) {
        const container = document.getElementById('blogPostContent');
        if (!container) return;

        container.innerHTML = `
            <div class="text-center py-5">
                <div class="text-danger mb-3">
                    <i class="bi bi-exclamation-triangle" style="font-size: 3rem;"></i>
                </div>
                <h2>${message}</h2>
                <p class="text-muted mb-4">The requested blog post could not be found or loaded.</p>
                <a href="blog.html" class="btn btn-primary">
                    <i class="bi bi-arrow-left"></i> Back to Blog
                </a>
            </div>
        `;
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

// Social sharing functions
function shareOnFacebook() {
    const url = encodeURIComponent(window.location.href);
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${url}`, '_blank', 'width=600,height=400');
}

function shareOnTwitter() {
    const url = encodeURIComponent(window.location.href);
    const text = encodeURIComponent(document.title);
    window.open(`https://twitter.com/intent/tweet?url=${url}&text=${text}`, '_blank', 'width=600,height=400');
}

function shareOnLinkedIn() {
    const url = encodeURIComponent(window.location.href);
    const title = encodeURIComponent(document.title);
    window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${url}&title=${title}`, '_blank', 'width=600,height=400');
}

function shareViaEmail() {
    const subject = encodeURIComponent(document.title);
    const body = encodeURIComponent(`Check out this blog post: ${window.location.href}`);
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
}

function copyLink() {
    navigator.clipboard.writeText(window.location.href).then(() => {
        // Show temporary success message
        const btn = event.target.closest('.btn-copy');
        const originalText = btn.innerHTML;
        btn.innerHTML = '<i class="bi bi-check"></i> Copied!';
        btn.style.backgroundColor = '#28a745';
        
        setTimeout(() => {
            btn.innerHTML = originalText;
            btn.style.backgroundColor = '';
        }, 2000);
    }).catch(() => {
        alert('Link copied: ' + window.location.href);
    });
}

// Initialize blog post when DOM is loaded
let blogPost;
document.addEventListener('DOMContentLoaded', () => {
    blogPost = new BlogPost();
});