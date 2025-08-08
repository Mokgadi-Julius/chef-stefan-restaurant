/**
* Template Name: Restaurantly - v3.1.0
* Template URL: https://bootstrapmade.com/restaurantly-restaurant-template/
* Author: BootstrapMade.com
* License: https://bootstrapmade.com/license/
*/
(function() {
  "use strict";

  /**
   * Easy selector helper function
   */
  const select = (el, all = false) => {
    el = el.trim()
    if (all) {
      return [...document.querySelectorAll(el)]
    } else {
      return document.querySelector(el)
    }
  }

  /**
   * Easy event listener function
   */
  const on = (type, el, listener, all = false) => {
    let selectEl = select(el, all)
    if (selectEl) {
      if (all) {
        selectEl.forEach(e => e.addEventListener(type, listener))
      } else {
        selectEl.addEventListener(type, listener)
      }
    }
  }

  /**
   * Easy on scroll event listener 
   */
  const onscroll = (el, listener) => {
    el.addEventListener('scroll', listener)
  }

  /**
   * Navbar links active state on scroll
   */
  let navbarlinks = select('#navbar .scrollto', true)
  const navbarlinksActive = () => {
    let position = window.scrollY + 200
    navbarlinks.forEach(navbarlink => {
      if (!navbarlink.hash) return
      let section = select(navbarlink.hash)
      if (!section) return
      if (position >= section.offsetTop && position <= (section.offsetTop + section.offsetHeight)) {
        navbarlink.classList.add('active')
      } else {
        navbarlink.classList.remove('active')
      }
    })
  }
  window.addEventListener('load', navbarlinksActive)
  onscroll(document, navbarlinksActive)

  /**
   * Scrolls to an element with header offset
   */
  const scrollto = (el) => {
    let header = select('#header')
    let offset = header.offsetHeight

    let elementPos = select(el).offsetTop
    window.scrollTo({
      top: elementPos - offset,
      behavior: 'smooth'
    })
  }

  /**
   * Toggle .header-scrolled class to #header when page is scrolled
   */
  let selectHeader = select('#header')
  let selectTopbar = select('#topbar')
  if (selectHeader) {
    const headerScrolled = () => {
      if (window.scrollY > 100) {
        selectHeader.classList.add('header-scrolled')
        if (selectTopbar) {
          selectTopbar.classList.add('topbar-scrolled')
        }
      } else {
        selectHeader.classList.remove('header-scrolled')
        if (selectTopbar) {
          selectTopbar.classList.remove('topbar-scrolled')
        }
      }
    }
    window.addEventListener('load', headerScrolled)
    onscroll(document, headerScrolled)
  }

  /**
   * Back to top button
   */
  let backtotop = select('.back-to-top')
  if (backtotop) {
    const toggleBacktotop = () => {
      if (window.scrollY > 100) {
        backtotop.classList.add('active')
      } else {
        backtotop.classList.remove('active')
      }
    }
    window.addEventListener('load', toggleBacktotop)
    onscroll(document, toggleBacktotop)
  }

  /**
   * Mobile nav toggle
   */
  on('click', '.mobile-nav-toggle', function(e) {
    select('#navbar').classList.toggle('navbar-mobile')
    this.classList.toggle('bi-list')
    this.classList.toggle('bi-x')
  })

  /**
   * Mobile nav dropdowns activate
   */
  on('click', '.navbar .dropdown > a', function(e) {
    if (select('#navbar').classList.contains('navbar-mobile')) {
      e.preventDefault()
      this.nextElementSibling.classList.toggle('dropdown-active')
    }
  }, true)

  /**
   * Scrool with ofset on links with a class name .scrollto
   */
  on('click', '.scrollto', function(e) {
    if (select(this.hash)) {
      e.preventDefault()

      let navbar = select('#navbar')
      if (navbar.classList.contains('navbar-mobile')) {
        navbar.classList.remove('navbar-mobile')
        let navbarToggle = select('.mobile-nav-toggle')
        navbarToggle.classList.toggle('bi-list')
        navbarToggle.classList.toggle('bi-x')
      }
      scrollto(this.hash)
    }
  }, true)

  /**
   * Scroll with ofset on page load with hash links in the url
   */
  window.addEventListener('load', () => {
    if (window.location.hash) {
      if (select(window.location.hash)) {
        scrollto(window.location.hash)
      }
    }
  });

  /**
   * Preloader
   */
  let preloader = select('#preloader');
  if (preloader) {
    window.addEventListener('load', () => {
      preloader.remove()
    });
  }

  /**
   * Menu isotope and filter
   */
  window.addEventListener('load', () => {
    let menuContainer = select('.menu-container');
    if (menuContainer) {
      let menuIsotope = new Isotope(menuContainer, {
        itemSelector: '.menu-item',
        layoutMode: 'fitRows'
      });

      let menuFilters = select('#menu-flters li', true);

      on('click', '#menu-flters li', function(e) {
        e.preventDefault();
        menuFilters.forEach(function(el) {
          el.classList.remove('filter-active');
        });
        this.classList.add('filter-active');

        menuIsotope.arrange({
          filter: this.getAttribute('data-filter')
        });
        menuIsotope.on('arrangeComplete', function() {
          AOS.refresh()
        });
      }, true);
    }

  });

  /**
   * Initiate glightbox 
   */
  const glightbox = GLightbox({
    selector: '.glightbox'
  });

  /**
   * Events slider
   */
  new Swiper('.events-slider', {
    speed: 600,
    loop: true,
    autoplay: {
      delay: 10000,
      disableOnInteraction: false
    },
    slidesPerView: 'auto',
    pagination: {
      el: '.swiper-pagination',
      type: 'bullets',
      clickable: true
    }
  });

  /**
   * Testimonials slider
   */
  new Swiper('.testimonials-slider', {
    speed: 600,
    loop: true,
    autoplay: {
      delay: 5000,
      disableOnInteraction: false
    },
    slidesPerView: 'auto',
    pagination: {
      el: '.swiper-pagination',
      type: 'bullets',
      clickable: true
    },
    breakpoints: {
      320: {
        slidesPerView: 1,
        spaceBetween: 20
      },

      1200: {
        slidesPerView: 3,
        spaceBetween: 20
      }
    }
  });

  /**
   * Initiate gallery lightbox 
   */
  const galleryLightbox = GLightbox({
    selector: '.gallery-lightbox'
  });

  /**
   * Animation on scroll
   */
  window.addEventListener('load', () => {
    AOS.init({
      duration: 1000,
      easing: 'ease-in-out',
      once: true,
      mirror: false
    })
  });

})()

/**
 * Simple Gallery Carousel - Backend Integrated
 */
let currentImageIndex = 0;
let autoSlideInterval;

// Gallery images - will be loaded from backend
let galleryImages = [];

// Load gallery images from backend
async function loadGalleryImagesFromAPI() {
  try {
    const response = await fetch('/api/gallery');
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const backendImages = await response.json();
    
    // Transform backend data to image paths for carousel use
    galleryImages = backendImages.map(image => image.image_path);
    
    console.log(`Loaded ${galleryImages.length} images from backend for carousel`);
    
    // If no images from backend, use fallback
    if (galleryImages.length === 0) {
      useFallbackImages();
    }
  } catch (error) {
    console.error('Error loading gallery images from backend:', error);
    useFallbackImages();
  }
}

// Fallback images if backend is not available
function useFallbackImages() {
  galleryImages = [
    'assets/img/gallery/gallery-1.jpeg',
    'assets/img/gallery/gallery-2.jpeg',
    'assets/img/gallery/gallery-3.jpeg',
    'assets/img/gallery/gallery-4.jpeg',
    'assets/img/gallery/gallery-5.jpeg',
    'assets/img/gallery/gallery-6.jpeg',
    'assets/img/gallery/gallery-7.jpeg',
    'assets/img/gallery/gallery-8.jpeg'
  ];
  console.log('Using fallback gallery images');
}

// Initialize gallery when page loads
document.addEventListener('DOMContentLoaded', async function() {
  // First load images from backend
  await loadGalleryImagesFromAPI();
  
  // Then initialize the gallery
  initializeGallery();
});

// Initialize the simple gallery
function initializeGallery() {
  console.log(`Initializing gallery with ${galleryImages.length} images`);
  
  // Check if gallery elements exist before initializing
  const prevImg = document.getElementById('prevImg');
  const currentImg = document.getElementById('currentImg');
  const nextImg = document.getElementById('nextImg');
  
  if (!prevImg || !currentImg || !nextImg) {
    console.log('Gallery elements not found on this page, skipping gallery initialization');
    return;
  }
  
  // Set initial images
  updateGalleryImages();
  
  // Start auto-slide
  startAutoSlide();
  
  // Add click listeners to side images (reuse variables from above)
  
  if (prevImg) {
    prevImg.addEventListener('click', previousImage);
  }
  
  if (nextImg) {
    nextImg.addEventListener('click', nextImage);
  }
  
  // Pause auto-slide on hover
  const gallery = document.querySelector('.simple-gallery');
  if (gallery) {
    gallery.addEventListener('mouseenter', () => {
      clearInterval(autoSlideInterval);
    });
    
    gallery.addEventListener('mouseleave', () => {
      startAutoSlide();
    });
    
    // Add touch/swipe support
    addTouchSupport(gallery);
  }
  
  console.log('Gallery initialized successfully');
}

// Update the three visible images
function updateGalleryImages() {
  const prevImg = document.getElementById('prevImg');
  const currentImg = document.getElementById('currentImg');
  const nextImg = document.getElementById('nextImg');
  
  if (!prevImg || !currentImg || !nextImg) {
    console.error('Gallery image elements not found');
    return;
  }
  
  // Calculate indices
  const prevIndex = (currentImageIndex - 1 + galleryImages.length) % galleryImages.length;
  const nextIndex = (currentImageIndex + 1) % galleryImages.length;
  
  // Update image sources with error handling
  // Backend images already include full path, fallback images need base path
  const isBackendPath = (path) => path.startsWith('/uploads/') || path.startsWith('http');
  const getImagePath = (path) => isBackendPath(path) ? path : `assets/img/gallery/${path}`;
  
  prevImg.src = getImagePath(galleryImages[prevIndex]);
  prevImg.onerror = function() { this.src = 'assets/img/gallery/gallery-1.jpeg'; };
  
  currentImg.src = getImagePath(galleryImages[currentImageIndex]);
  currentImg.onerror = function() { this.src = 'assets/img/gallery/gallery-2.jpeg'; };
  
  nextImg.src = getImagePath(galleryImages[nextIndex]);
  nextImg.onerror = function() { this.src = 'assets/img/gallery/gallery-3.jpeg'; };
  
  console.log(`Updated images: prev=${prevIndex}, current=${currentImageIndex}, next=${nextIndex}`);
}

// Navigate to next image
function nextImage() {
  currentImageIndex = (currentImageIndex + 1) % galleryImages.length;
  updateGalleryImages();
  resetAutoSlide();
}

// Navigate to previous image
function previousImage() {
  currentImageIndex = (currentImageIndex - 1 + galleryImages.length) % galleryImages.length;
  updateGalleryImages();
  resetAutoSlide();
}

// Start auto-slide
function startAutoSlide() {
  autoSlideInterval = setInterval(() => {
    nextImage();
  }, 4000); // Change image every 4 seconds
}

// Reset auto-slide
function resetAutoSlide() {
  clearInterval(autoSlideInterval);
  startAutoSlide();
}

// Touch/swipe support
function addTouchSupport(element) {
  let startX = 0;
  let startY = 0;
  let distX = 0;
  let distY = 0;
  
  element.addEventListener('touchstart', function(e) {
    startX = e.changedTouches[0].clientX;
    startY = e.changedTouches[0].clientY;
  }, { passive: true });
  
  element.addEventListener('touchend', function(e) {
    distX = e.changedTouches[0].clientX - startX;
    distY = e.changedTouches[0].clientY - startY;
    
    // Check if it's a horizontal swipe (not vertical scroll)
    if (Math.abs(distX) > Math.abs(distY) && Math.abs(distX) > 50) {
      if (distX > 0) {
        previousImage(); // Swipe right - previous image
      } else {
        nextImage(); // Swipe left - next image
      }
    }
  }, { passive: true });
}

// Keyboard navigation
document.addEventListener('keydown', function(e) {
  if (e.key === 'ArrowLeft') {
    previousImage();
  } else if (e.key === 'ArrowRight') {
    nextImage();
  }
});