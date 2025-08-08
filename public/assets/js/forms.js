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
          showMessage(result.message || 'Your catering inquiry was sent. We will contact you shortly to discuss your bespoke menu and confirm details. Thank you!', 'success', 'catering-form');
          
          // Clear menu booking data from session storage
          sessionStorage.removeItem('menuBookingData');
          
          // Reset form
          this.reset();
          
          // Hide menu items summary if it was displayed
          hideMenuSummary();
          
        } else {
          showMessage(result.error || 'Failed to send catering inquiry', 'error', 'catering-form');
        }
      } catch (error) {
        console.error('Error:', error);
        showMessage('Failed to send catering inquiry. Please try again.', 'error', 'catering-form');
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
          showMessage(result.message || 'Your message has been sent successfully!', 'success', 'contact-form');
          this.reset();
        } else {
          showMessage(result.error || 'Failed to send message', 'error', 'contact-form');
        }
      } catch (error) {
        console.error('Error:', error);
        showMessage('Failed to send message', 'error', 'contact-form');
      }
    });
  }
});

// Show message function
function showMessage(message, type, formId = null) {
  // Remove existing messages
  const existingMessages = document.querySelectorAll('.form-message');
  existingMessages.forEach(msg => msg.remove());

  // Create new message element
  const messageDiv = document.createElement('div');
  messageDiv.className = `form-message alert ${type === 'success' ? 'alert-success' : 'alert-danger'}`;
  messageDiv.innerHTML = `<strong>${type === 'success' ? 'Success!' : 'Error!'}</strong> ${message}`;
  messageDiv.style.cssText = 'margin: 20px 0; padding: 15px; border-radius: 5px; font-weight: 500;';
  
  // Insert message before the specific form or find the active form
  let targetForm = formId ? document.getElementById(formId) : document.querySelector('form');
  if (targetForm) {
    targetForm.parentNode.insertBefore(messageDiv, targetForm);
    
    // Scroll to message
    messageDiv.scrollIntoView({ behavior: 'smooth', block: 'center' });
    
    // Auto-remove message after 6 seconds
    setTimeout(() => {
      if (messageDiv.parentNode) {
        messageDiv.remove();
      }
    }, 6000);
  }
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
  showMessage('Menu selection cleared', 'info', 'catering-form');
}