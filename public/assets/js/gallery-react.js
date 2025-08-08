/**
 * React-based Gallery Management for Chef Stefan's Website
 * Enhanced version with real-time updates and no caching issues
 */

const API_BASE = 'http://localhost:3000/api';

// Load React gallery component for homepage
function loadReactGallery() {
    const { useState, useEffect } = React;
    
    function HomepageGallery() {
        const [images, setImages] = useState([]);
        const [loading, setLoading] = useState(true);
        const [lightbox, setLightbox] = useState(null);
        
        // Load gallery images
        const loadGallery = async () => {
            try {
                setLoading(true);
                const response = await fetch(`${API_BASE}/gallery`);
                const allImages = await response.json();
                
                // Filter for homepage display images first, then featured, then latest
                let displayImages = allImages.filter(img => img.displayOnIndex).slice(0, 8);
                if (displayImages.length < 4) {
                    const featuredImages = allImages.filter(img => img.featured && !img.displayOnIndex).slice(0, 8 - displayImages.length);
                    displayImages = [...displayImages, ...featuredImages];
                }
                if (displayImages.length < 4) {
                    const remainingImages = allImages.filter(img => !img.displayOnIndex && !img.featured).slice(0, 8 - displayImages.length);
                    displayImages = [...displayImages, ...remainingImages];
                }
                
                setImages(displayImages);
            } catch (error) {
                console.error('Error loading gallery:', error);
                // Load fallback images if API fails
                loadFallbackImages();
            } finally {
                setLoading(false);
            }
        };
        
        // Fallback images
        const loadFallbackImages = () => {
            const fallbackImages = [
                { 
                    _id: 'fallback-1',
                    title: 'Gourmet Dish Presentation', 
                    description: 'Fine dining private chef Cape Town',
                    path: 'assets/img/gallery/gallery-1.jpeg',
                    featured: true
                },
                { 
                    _id: 'fallback-2',
                    title: 'Elegant Table Setting', 
                    description: 'Bespoke dinner party Stellenbosch',
                    path: 'assets/img/gallery/gallery-2.jpeg',
                    featured: true
                },
                { 
                    _id: 'fallback-3',
                    title: 'Luxury Canapés', 
                    description: 'Corporate catering Cape Town',
                    path: 'assets/img/gallery/gallery-3.jpeg',
                    featured: false
                },
                { 
                    _id: 'fallback-4',
                    title: 'Professional Kitchen', 
                    description: 'Private chef services Paarl',
                    path: 'assets/img/gallery/gallery-4.jpeg',
                    featured: false
                }
            ];
            setImages(fallbackImages);
        };
        
        // Initialize lightbox
        useEffect(() => {
            if (images.length > 0 && window.GLightbox) {
                // Cleanup existing lightbox
                if (lightbox) {
                    lightbox.destroy();
                }
                
                // Create new lightbox
                const newLightbox = GLightbox({
                    selector: '.gallery-lightbox',
                    touchNavigation: true,
                    loop: true,
                    autoplayVideos: true,
                });
                
                setLightbox(newLightbox);
            }
        }, [images]);
        
        useEffect(() => {
            loadGallery();
            // Auto-refresh every 60 seconds to show new uploads
            const interval = setInterval(loadGallery, 60000);
            return () => clearInterval(interval);
        }, []);
        
        if (loading) {
            return (
                <div className="text-center py-5">
                    <div className="spinner-border text-primary" role="status">
                        <span className="visually-hidden">Loading...</span>
                    </div>
                    <p className="mt-3 text-muted">Loading gallery...</p>
                </div>
            );
        }
        
        if (images.length === 0) {
            return (
                <div className="text-center py-5">
                    <i className="fas fa-images fa-3x text-muted mb-3"></i>
                    <h5 className="text-muted">Gallery coming soon</h5>
                    <p className="text-muted">Check back for amazing culinary creations!</p>
                </div>
            );
        }
        
        return (
            <div className="row" data-aos="fade-up">
                {images.map(image => (
                    <div key={image._id} className="col-lg-3 col-md-4 mb-4" data-aos="zoom-in" data-aos-delay="100">
                        <div className="gallery-item position-relative overflow-hidden rounded-3 shadow-sm">
                            {image.featured && (
                                <div className="position-absolute top-0 end-0 m-2 z-index-2">
                                    <span className="badge bg-warning text-dark">
                                        <i className="fas fa-star me-1"></i>Featured
                                    </span>
                                </div>
                            )}
                            
                            <a 
                                href={image.path} 
                                className="gallery-lightbox d-block"
                                data-gallery="gallery"
                                data-title={image.title}
                                data-description={image.description}
                                style={{textDecoration: 'none'}}
                            >
                                <img 
                                    src={image.path} 
                                    alt={`${image.title} - ${image.description}`} 
                                    className="img-fluid w-100"
                                    style={{
                                        height: '250px', 
                                        objectFit: 'cover',
                                        transition: 'transform 0.3s ease'
                                    }}
                                    loading="lazy"
                                    onError={(e) => {
                                        e.target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjI1MCIgdmlld0JveD0iMCAwIDMwMCAyNTAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIzMDAiIGhlaWdodD0iMjUwIiBmaWxsPSIjRjhGOUZBIi8+CjxwYXRoIGQ9Ik0xNTAgMTI1QzE1Ni42MjcgMTI1IDE2MiAxMTkuNjI3IDE2MiAxMTNTMTU2LjYyNyAxMDEgMTUwIDEwMVMxMzggMTA2LjM3MyAxMzggMTEzUzE0My4zNzMgMTI1IDE1MCAxMjVaIiBmaWxsPSIjRDFENURCIi8+CjxwYXRoIGQ9Ik0xMjUgOTBIMTc1QzE4MS42MjcgOTAgMTg3IDk1LjM3MyAxODcgMTAyVjE0MkMxODcgMTQ4LjYyNyAxODEuNjI3IDE1NCAxNzUgMTU0SDEyNUMxMTguMzczIDE1NCAxMTMgMTQ4LjYyNyAxMTMgMTQyVjEwMkMxMTMgOTUuMzczIDExOC4zNzMgOTAgMTI1IDkwWiIgZmlsbD0iI0QxRDVEQiIvPgo8L3N2Zz4K';
                                    }}
                                />
                                
                                <div className="gallery-overlay position-absolute top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center text-center text-white"
                                     style={{
                                         background: 'linear-gradient(135deg, rgba(212, 165, 116, 0.9), rgba(184, 149, 106, 0.9))',
                                         opacity: 0,
                                         transition: 'opacity 0.3s ease'
                                     }}>
                                    <div className="gallery-info p-3">
                                        <h4 className="h5 mb-2 fw-bold" style={{textShadow: '0 2px 4px rgba(0,0,0,0.3)'}}>{image.title}</h4>
                                        {image.description && (
                                            <p className="mb-3 small" style={{textShadow: '0 1px 2px rgba(0,0,0,0.3)'}}>{image.description}</p>
                                        )}
                                        <span className="btn btn-light btn-sm">
                                            <i className="fas fa-search-plus me-2"></i>View Full
                                        </span>
                                    </div>
                                </div>
                            </a>
                        </div>
                    </div>
                ))}
            </div>
        );
    }
    
    // Render the React component
    const container = document.getElementById('galleryContainer');
    if (container && window.React && window.ReactDOM) {
        ReactDOM.render(React.createElement(HomepageGallery), container);
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    const galleryContainer = document.getElementById('galleryContainer');
    
    if (galleryContainer) {
        // Check if React is available
        if (window.React && window.ReactDOM) {
            loadReactGallery();
        } else {
            // Fallback to original gallery loading
            console.log('React not available, using fallback gallery');
            loadIndexGallery();
        }
    }
});

// Add hover effects with CSS
const galleryStyles = `
<style>
.gallery-item:hover img {
    transform: scale(1.05);
}

.gallery-item:hover .gallery-overlay {
    opacity: 1 !important;
}

.gallery-item {
    transition: transform 0.3s ease;
    cursor: pointer;
}

.gallery-item:hover {
    transform: translateY(-5px);
}

.z-index-2 {
    z-index: 2;
}

@keyframes fadeIn {
    from { opacity: 0; transform: translateY(20px); }
    to { opacity: 1; transform: translateY(0); }
}

.gallery-item {
    animation: fadeIn 0.6s ease forwards;
}

.gallery-item:nth-child(1) { animation-delay: 0.1s; }
.gallery-item:nth-child(2) { animation-delay: 0.2s; }
.gallery-item:nth-child(3) { animation-delay: 0.3s; }
.gallery-item:nth-child(4) { animation-delay: 0.4s; }
</style>
`;

// Inject styles
document.head.insertAdjacentHTML('beforeend', galleryStyles);