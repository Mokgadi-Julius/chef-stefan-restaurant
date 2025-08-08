/**
 * Dynamic Gallery Management for Chef Stefan's Website
 * Loads images from backend API and displays them beautifully
 */

const API_BASE = '/api';

// Load gallery images for index page (featured images only)
async function loadIndexGallery() {
    try {
        const response = await fetch(`${API_BASE}/gallery`);
        const images = await response.json();
        
        // Filter for homepage display images first, then featured, then latest
        let displayImages = images.filter(img => img.displayOnIndex).slice(0, 8);
        if (displayImages.length < 4) {
            const featuredImages = images.filter(img => img.featured && !img.displayOnIndex).slice(0, 8 - displayImages.length);
            displayImages = [...displayImages, ...featuredImages];
        }
        if (displayImages.length < 4) {
            const remainingImages = images.filter(img => !img.displayOnIndex && !img.featured).slice(0, 8 - displayImages.length);
            displayImages = [...displayImages, ...remainingImages];
        }
        
        displayIndexGallery(displayImages);
    } catch (error) {
        console.error('Error loading gallery:', error);
        loadFallbackGallery();
    }
}

// Display gallery images on index page
function displayIndexGallery(images) {
    const container = document.getElementById('galleryContainer');
    if (!container) return;
    
    if (images.length === 0) {
        loadFallbackGallery();
        return;
    }
    
    container.innerHTML = images.map(image => `
        <div class="col-lg-3 col-md-4" data-aos="zoom-in" data-aos-delay="100">
            <div class="gallery-item">
                <a href="${image.path}" class="gallery-lightbox" data-gall="gallery-item">
                    <img src="${image.path}" alt="${image.title} - ${image.description}" class="img-fluid" loading="lazy">
                    <div class="gallery-overlay">
                        <div class="gallery-info">
                            <h4>${image.title}</h4>
                            <p>${image.description || 'Chef Stefan\'s culinary creation'}</p>
                        </div>
                    </div>
                </a>
            </div>
        </div>
    `).join('');
    
    // Reinitialize lightbox for new images
    if (typeof GLightbox !== 'undefined') {
        GLightbox({
            selector: '.gallery-lightbox'
        });
    }
}

// Fallback gallery with existing images
function loadFallbackGallery() {
    const container = document.getElementById('galleryContainer');
    if (!container) return;
    
    const fallbackImages = [
        { 
            src: 'assets/img/gallery/gallery-1.jpeg', 
            title: 'Gourmet Dish Presentation', 
            description: 'Fine dining private chef Cape Town' 
        },
        { 
            src: 'assets/img/gallery/gallery-2.jpeg', 
            title: 'Elegant Table Setting', 
            description: 'Bespoke dinner party Stellenbosch' 
        },
        { 
            src: 'assets/img/gallery/gallery-3.jpeg', 
            title: 'Luxury Canapés', 
            description: 'Corporate catering Cape Town' 
        },
        { 
            src: 'assets/img/gallery/gallery-4.jpeg', 
            title: 'Professional Kitchen', 
            description: 'Private chef services Paarl' 
        },
        { 
            src: 'assets/img/gallery/gallery-5.jpeg', 
            title: 'Fresh Ingredients', 
            description: 'Weekly meal preparation Cape Town' 
        },
        { 
            src: 'assets/img/gallery/gallery-6.jpeg', 
            title: 'Chef at Work', 
            description: 'Holiday catering Somerset West' 
        },
        { 
            src: 'assets/img/gallery/gallery-7.jpeg', 
            title: 'Plating Techniques', 
            description: 'Executive chef Cape Town' 
        },
        { 
            src: 'assets/img/gallery/gallery-8.jpeg', 
            title: '5-Star Presentation', 
            description: 'Private chef Western Cape' 
        }
    ];
    
    container.innerHTML = fallbackImages.map(image => `
        <div class="col-lg-3 col-md-4" data-aos="zoom-in" data-aos-delay="100">
            <div class="gallery-item">
                <a href="${image.src}" class="gallery-lightbox" data-gall="gallery-item">
                    <img src="${image.src}" alt="${image.title} - ${image.description}" class="img-fluid" loading="lazy">
                    <div class="gallery-overlay">
                        <div class="gallery-info">
                            <h4>${image.title}</h4>
                            <p>${image.description}</p>
                        </div>
                    </div>
                </a>
            </div>
        </div>
    `).join('');
}

// Load gallery when page loads
document.addEventListener('DOMContentLoaded', function() {
    if (document.getElementById('galleryContainer')) {
        loadIndexGallery();
    }
});

// Add some CSS for gallery overlays
const galleryStyles = `
<style>
.gallery-item {
    position: relative;
    overflow: hidden;
    border-radius: 10px;
    box-shadow: 0 4px 15px rgba(0,0,0,0.1);
    transition: all 0.3s ease;
}

.gallery-item:hover {
    transform: translateY(-5px);
    box-shadow: 0 8px 25px rgba(0,0,0,0.15);
}

.gallery-overlay {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: linear-gradient(135deg, rgba(212, 165, 116, 0.9), rgba(184, 149, 106, 0.9));
    opacity: 0;
    transition: all 0.3s ease;
    display: flex;
    align-items: center;
    justify-content: center;
    text-align: center;
    color: white;
}

.gallery-item:hover .gallery-overlay {
    opacity: 1;
}

.gallery-info h4 {
    font-size: 1.2rem;
    font-weight: 600;
    margin-bottom: 0.5rem;
    text-shadow: 0 2px 4px rgba(0,0,0,0.3);
}

.gallery-info p {
    font-size: 0.9rem;
    margin-bottom: 0;
    text-shadow: 0 1px 2px rgba(0,0,0,0.3);
}

.btn:hover {
    transform: translateY(-2px);
    box-shadow: 0 12px 30px rgba(212, 165, 116, 0.4) !important;
}
</style>
`;

// Inject styles
document.head.insertAdjacentHTML('beforeend', galleryStyles);