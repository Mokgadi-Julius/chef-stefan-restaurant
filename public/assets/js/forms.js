const API_BASE = '/api';

// Handle catering form
document.addEventListener('DOMContentLoaded', function() {
  const bookingForm = document.getElementById('catering-form');
  if (bookingForm) {
    // Load menu booking data if available
    loadMenuBookingData();
    
    bookingForm.addEventListener('submit', async function(e) {
      e.preventDefault();
      
      const formData = new FormData(this);
      
      // Get menu booking data from session storage
      const menuBookingData = JSON.parse(sessionStorage.getItem('menuBookingData') || '{}');
      
      const bookingData = {
        customer_name: formData.get('name'),
        customer_email: formData.get('email'),
        customer_phone: formData.get('phone'),
        event_type: formData.get('event') || 'Private Dining',
        event_date: formData.get('date'),
        event_time: formData.get('time'),
        location: formData.get('location') || 'Client Location',
        meal_type: formData.get('meal_type'),
        occasion: formData.get('occasion'),
        dietary_restrictions: formData.get('dietary_restrictions'),
        food_style: formData.get('food_style'),
        additional_info: formData.get('additional_info'),
        selected_dishes: menuBookingData.items || null,
        total_amount: menuBookingData.totalAmount || 0
      };

      try {
        const response = await fetch(`${API_BASE}/catering-inquiry`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(bookingData)
        });

        const result = await response.json();
        
        if (response.ok) {
          showPopupNotification(
            'Catering Inquiry Sent!',
            'Thank you! We will contact you shortly to discuss your bespoke menu and confirm all details.',
            'success'
          );
          
          // Clear menu booking data from session storage
          sessionStorage.removeItem('menuBookingData');
          
          // Reset form
          this.reset();
          
          // Hide menu items summary if it was displayed
          hideMenuSummary();
          
        } else {
          showPopupNotification(
            'Failed to Send Inquiry',
            result.error || 'Something went wrong. Please try again.',
            'error'
          );
        }
      } catch (error) {
        console.error('Error:', error);
        showPopupNotification(
          'Connection Error',
          'Failed to send catering inquiry. Please check your connection and try again.',
          'error'
        );
      }
    });
  }


  // Handle contact form
  const contactForm = document.getElementById('contact-form');
  if (contactForm) {
    contactForm.addEventListener('submit', async function(e) {
      e.preventDefault();
      
      const formData = new FormData(this);
      const contactData = {
        name: formData.get('name'),
        email: formData.get('email'),
        subject: formData.get('subject'),
        message: formData.get('message')
      };

      try {
        const response = await fetch(`${API_BASE}/contact`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(contactData)
        });

        const result = await response.json();
        
        if (response.ok) {
          showPopupNotification(
            'Message Sent Successfully!',
            'Thank you for contacting Private Chef Stefan. We will get back to you shortly.',
            'success'
          );
          this.reset();
        } else {
          showPopupNotification(
            'Failed to Send Message',
            result.error || 'Something went wrong. Please try again.',
            'error'
          );
        }
      } catch (error) {
        console.error('Error:', error);
        showPopupNotification(
          'Connection Error',
          'Failed to send message. Please check your connection and try again.',
          'error'
        );
      }
    });
  }
});

// Popup notification system
function showPopupNotification(title, message, type = 'success', duration = 5000) {
  // Remove existing notifications
  const existingNotifications = document.querySelectorAll('.popup-notification');
  existingNotifications.forEach(notification => {
    notification.classList.remove('show');
    setTimeout(() => notification.remove(), 400);
  });

  // Create notification element
  const notification = document.createElement('div');
  notification.className = `popup-notification ${type}`;
  
  // Choose icon based on type
  let icon = '';
  switch(type) {
    case 'success':
      icon = '✓';
      break;
    case 'error':
      icon = '✕';
      break;
    case 'info':
      icon = 'ℹ';
      break;
    default:
      icon = '✓';
  }
  
  notification.innerHTML = `
    <div class="popup-notification-content">
      <div class="popup-notification-icon">${icon}</div>
      <div class="popup-notification-text">
        <div class="popup-notification-title">${title}</div>
        <div class="popup-notification-message">${message}</div>
      </div>
    </div>
    <button class="popup-notification-close" onclick="closeNotification(this)">×</button>
    <div class="popup-notification-progress"></div>
  `;
  
  // Add to page
  document.body.appendChild(notification);
  
  // Trigger animation
  setTimeout(() => {
    notification.classList.add('show');
  }, 100);
  
  // Auto-remove after duration
  setTimeout(() => {
    closeNotification(notification.querySelector('.popup-notification-close'));
  }, duration);
}

// Close notification function
function closeNotification(button) {
  const notification = button.closest('.popup-notification');
  notification.classList.remove('show');
  setTimeout(() => {
    if (notification.parentNode) {
      notification.remove();
    }
  }, 400);
}

// Show message function (updated to use popup)
function showMessage(message, type, formId = null) {
  const title = type === 'success' ? 'Success!' : type === 'error' ? 'Error!' : 'Info!';
  showPopupNotification(title, message, type);
}

// Load menu booking data and display it in the booking form
function loadMenuBookingData() {
  const menuBookingData = sessionStorage.getItem('menuBookingData');
  
  if (menuBookingData) {
    try {
      const data = JSON.parse(menuBookingData);
      
      if (data.items && data.items.length > 0) {
        displayMenuSummary(data);
      }
    } catch (error) {
      console.error('Error loading menu booking data:', error);
    }
  }
}

// Display selected menu items in the booking form
function displayMenuSummary(bookingData) {
  // Create menu summary section
  const bookingForm = document.querySelector('#book-a-table');
  if (!bookingForm) return;

  // Check if summary already exists
  let existingSummary = document.getElementById('menu-booking-summary');
  if (existingSummary) {
    existingSummary.remove();
  }

  const summarySection = document.createElement('div');
  summarySection.id = 'menu-booking-summary';
  summarySection.className = 'menu-booking-summary mb-4 p-4 rounded';
  
  const itemsHtml = bookingData.items.map(item => `
    <div class="menu-summary-item d-flex justify-content-between align-items-center mb-2">
      <div>
        <strong>${item.dish}</strong>
        <span class="text-muted"> x${item.quantity}</span>
      </div>
      <div class="text-end">
        <span class="fw-bold">R${item.totalPrice.toLocaleString()}</span>
      </div>
    </div>
  `).join('');

  summarySection.innerHTML = `
    <div class="menu-summary-header d-flex justify-content-between align-items-center mb-3">
      <h5 class="mb-0">
        <i class="bi bi-cart-check text-success"></i>
        Selected Menu Items (${bookingData.items.length})
      </h5>
      <button type="button" class="btn btn-sm btn-outline-secondary" onclick="clearMenuBooking()">
        <i class="bi bi-x"></i> Clear Menu
      </button>
    </div>
    <div class="menu-items-list">
      ${itemsHtml}
    </div>
    <hr>
    <div class="menu-summary-total d-flex justify-content-between align-items-center">
      <strong>Total Amount:</strong>
      <strong class="text-success">R${bookingData.totalAmount.toLocaleString()}</strong>
    </div>
    <small class="text-muted">
      <i class="bi bi-info-circle"></i>
      These items will be included in your catering request. Final pricing may vary based on your requirements.
    </small>
  `;

  // Insert summary before the form
  const formContainer = document.querySelector('#book-a-table .section-title');
  if (formContainer) {
    formContainer.parentNode.insertBefore(summarySection, formContainer.nextSibling);
  }
}

// Hide menu summary
function hideMenuSummary() {
  const summary = document.getElementById('menu-booking-summary');
  if (summary) {
    summary.remove();
  }
}

// Clear menu booking data
function clearMenuBooking() {
  sessionStorage.removeItem('menuBookingData');
  hideMenuSummary();
  showPopupNotification(
    'Menu Cleared',
    'Your menu selection has been cleared successfully.',
    'info',
    3000
  );
}