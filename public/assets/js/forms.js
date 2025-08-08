const API_BASE = '/api';

// Handle book a table form
document.addEventListener('DOMContentLoaded', function() {
  const bookingForm = document.querySelector('form[action="forms/book-a-table.php"]');
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
        const response = await fetch(`${API_BASE}/bookings`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(bookingData)
        });

        const result = await response.json();
        
        if (response.ok) {
          showMessage('Your catering inquiry was sent. We will contact you shortly to discuss your bespoke menu and confirm details. Thank you!', 'success');
          
          // Clear menu booking data from session storage
          sessionStorage.removeItem('menuBookingData');
          
          // Reset form
          this.reset();
          
          // Hide menu items summary if it was displayed
          hideMenuSummary();
          
        } else {
          showMessage(result.error || 'Failed to send booking request', 'error');
        }
      } catch (error) {
        console.error('Error:', error);
        showMessage('Failed to send booking request. Please try again.', 'error');
      }
    });
  }

  // Handle simple table booking form
  const tableBookingForm = document.querySelector('form[action="forms/book-a-table.php"]:not([data-menu-booking])');
  if (tableBookingForm && !tableBookingForm.hasAttribute('data-menu-booking')) {
    tableBookingForm.addEventListener('submit', async function(e) {
      e.preventDefault();
      
      const formData = new FormData(this);
      const bookingData = {
        name: formData.get('name'),
        email: formData.get('email'),
        phone: formData.get('phone'),
        date: formData.get('date'),
        time: formData.get('time'),
        people: formData.get('people'),
        occasion: formData.get('occasion') || formData.get('message'),
        dietary_requirements: formData.get('dietary') || formData.get('dietary_requirements'),
        special_requests: formData.get('requests') || formData.get('special_requests')
      };

      try {
        const response = await fetch(`${API_BASE}/book-table`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(bookingData)
        });

        const result = await response.json();
        
        if (response.ok) {
          showMessage(result.message || 'Your booking request has been sent successfully! We will contact you soon to confirm.', 'success');
          this.reset();
        } else {
          showMessage(result.error || 'Failed to send booking request', 'error');
        }
      } catch (error) {
        console.error('Error:', error);
        showMessage('Failed to send booking request. Please try again.', 'error');
      }
    });
  }

  // Handle contact form
  const contactForm = document.querySelector('form[action="forms/contact.php"]');
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
          showMessage(result.message || 'Your message has been sent successfully!', 'success');
          this.reset();
        } else {
          showMessage(result.error || 'Failed to send message', 'error');
        }
      } catch (error) {
        console.error('Error:', error);
        showMessage('Failed to send message', 'error');
      }
    });
  }
});

// Show message function
function showMessage(message, type) {
  // Remove existing messages
  const existingMessage = document.querySelector('.form-message');
  if (existingMessage) {
    existingMessage.remove();
  }

  // Create new message element
  const messageDiv = document.createElement('div');
  messageDiv.className = `form-message alert ${type === 'success' ? 'alert-success' : 'alert-danger'}`;
  messageDiv.textContent = message;
  
  // Insert message before the form
  const form = document.querySelector('form');
  if (form) {
    form.parentNode.insertBefore(messageDiv, form);
    
    // Auto-remove message after 5 seconds
    setTimeout(() => {
      messageDiv.remove();
    }, 5000);
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
  showMessage('Menu selection cleared', 'info');
}