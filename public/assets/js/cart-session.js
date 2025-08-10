/**
 * Cart Session JavaScript - Chef Stefan
 * Manages cart display and booking form functionality
 */

class CartSession {
    constructor() {
        this.cartData = null;
        this.init();
    }

    init() {
        console.log('Initializing Cart Session...');
        
        this.loadCartData();
        this.renderCart();
        this.initializeEventListeners();
        this.initializeAOS();
        this.setMinDate();
        
        console.log('Cart Session initialized successfully');
    }

    loadCartData() {
        const savedData = sessionStorage.getItem('menuBookingData');
        if (savedData) {
            try {
                this.cartData = JSON.parse(savedData);
                console.log('Cart data loaded:', this.cartData);
            } catch (e) {
                console.warn('Could not load cart data:', e);
                this.cartData = null;
            }
        }
    }

    renderCart() {
        const cartItemsList = document.getElementById('cartItemsList');
        const emptyCartState = document.getElementById('emptyCartState');
        const cartSummary = document.getElementById('cartSummary');
        const cartTotalAmount = document.getElementById('cartTotalAmount');
        const cartTotalItems = document.getElementById('cartTotalItems');

        if (!this.cartData || !this.cartData.items || this.cartData.items.length === 0) {
            // Show empty cart state
            cartItemsList.innerHTML = '';
            emptyCartState.style.display = 'block';
            cartSummary.style.display = 'none';
            return;
        }

        // Hide empty state and show content
        emptyCartState.style.display = 'none';
        cartSummary.style.display = 'block';

        // Render cart items
        cartItemsList.innerHTML = this.cartData.items.map((item, index) => `
            <div class="cart-item-card" data-aos="fade-up" data-aos-delay="${index * 100}">
                <div class="cart-item-info">
                    <div class="cart-item-details-section">
                        <div class="cart-item-name">${item.dish}</div>
                        <div class="cart-item-details">R${item.price.toLocaleString()} per serving</div>
                    </div>
                    
                    <div class="cart-item-controls">
                        <div class="quantity-control">
                            <button class="quantity-btn" onclick="cartSession.updateQuantity('${item.dish}', ${item.quantity - 1})">
                                <i class="bi bi-dash"></i>
                            </button>
                            <span class="quantity-display">${item.quantity}</span>
                            <button class="quantity-btn" onclick="cartSession.updateQuantity('${item.dish}', ${item.quantity + 1})">
                                <i class="bi bi-plus"></i>
                            </button>
                        </div>
                        
                        <div class="cart-item-price">
                            <div class="item-price">R${item.price.toLocaleString()} each</div>
                            <div class="item-total">R${item.totalPrice.toLocaleString()}</div>
                        </div>
                        
                        <button class="quantity-btn" style="background: #dc3545;" onclick="cartSession.removeItem('${item.dish}')" title="Remove item">
                            <i class="bi bi-trash"></i>
                        </button>
                    </div>
                </div>
            </div>
        `).join('');

        // Update summary
        const totalItems = this.cartData.items.reduce((total, item) => total + item.quantity, 0);
        cartTotalAmount.textContent = this.cartData.totalAmount.toLocaleString();
        cartTotalItems.textContent = totalItems;
    }

    updateQuantity(dishName, newQuantity) {
        if (!this.cartData || !this.cartData.items) return;

        const itemIndex = this.cartData.items.findIndex(item => item.dish === dishName);
        if (itemIndex === -1) return;

        if (newQuantity <= 0) {
            // Remove item
            this.removeItem(dishName);
            return;
        }

        // Update quantity
        this.cartData.items[itemIndex].quantity = newQuantity;
        this.cartData.items[itemIndex].totalPrice = this.cartData.items[itemIndex].price * newQuantity;
        
        // Recalculate total
        this.cartData.totalAmount = this.cartData.items.reduce((total, item) => total + item.totalPrice, 0);
        
        // Save and re-render
        this.saveCartData();
        this.renderCart();
        
        this.showNotification('Cart updated successfully', 'success');
    }

    removeItem(dishName) {
        if (!this.cartData || !this.cartData.items) return;

        const itemIndex = this.cartData.items.findIndex(item => item.dish === dishName);
        if (itemIndex === -1) return;

        // Remove item
        this.cartData.items.splice(itemIndex, 1);
        
        // Recalculate total
        this.cartData.totalAmount = this.cartData.items.reduce((total, item) => total + item.totalPrice, 0);
        
        // Save and re-render
        this.saveCartData();
        this.renderCart();
        
        this.showNotification('Item removed from cart', 'info');
    }

    clearCart() {
        const confirmClear = confirm('Are you sure you want to clear your entire cart?');
        if (!confirmClear) return;

        sessionStorage.removeItem('menuBookingData');
        this.cartData = null;
        this.renderCart();
        
        this.showNotification('Cart cleared successfully', 'info');
    }

    saveCartData() {
        if (this.cartData && this.cartData.items && this.cartData.items.length > 0) {
            sessionStorage.setItem('menuBookingData', JSON.stringify(this.cartData));
        } else {
            sessionStorage.removeItem('menuBookingData');
        }
    }

    initializeEventListeners() {
        // Book Now button
        const bookNowBtn = document.getElementById('bookNowBtn');
        if (bookNowBtn) {
            bookNowBtn.addEventListener('click', () => this.showBookingForm());
        }

        // Clear Cart button
        const clearCartBtn = document.getElementById('clearCartBtn');
        if (clearCartBtn) {
            clearCartBtn.addEventListener('click', () => this.clearCart());
        }

        // Close booking form
        const closeBookingForm = document.getElementById('closeBookingForm');
        if (closeBookingForm) {
            closeBookingForm.addEventListener('click', () => this.hideBookingForm());
        }

        // Close modal when clicking outside
        const bookingFormModal = document.getElementById('bookingFormModal');
        if (bookingFormModal) {
            bookingFormModal.addEventListener('click', (e) => {
                if (e.target === bookingFormModal) {
                    this.hideBookingForm();
                }
            });
        }

        // Booking form submission
        const cartBookingForm = document.getElementById('cartBookingForm');
        if (cartBookingForm) {
            cartBookingForm.addEventListener('submit', (e) => this.handleBookingSubmission(e));
        }

        // Escape key to close modal
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.hideBookingForm();
            }
        });
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

    setMinDate() {
        const dateInput = document.getElementById('eventDate');
        if (dateInput) {
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            const minDate = tomorrow.toISOString().split('T')[0];
            dateInput.setAttribute('min', minDate);
        }
    }

    showBookingForm() {
        if (!this.cartData || !this.cartData.items || this.cartData.items.length === 0) {
            this.showNotification('Your cart is empty. Please add some items first.', 'warning');
            return;
        }

        const modal = document.getElementById('bookingFormModal');
        if (modal) {
            modal.style.display = 'block';
            document.body.style.overflow = 'hidden';
        }
    }

    hideBookingForm() {
        const modal = document.getElementById('bookingFormModal');
        if (modal) {
            modal.style.display = 'none';
            document.body.style.overflow = 'auto';
        }
    }

    async handleBookingSubmission(event) {
        event.preventDefault();

        const form = event.target;
        const formData = new FormData(form);

        // Prepare booking data
        const bookingData = {
            customer_name: formData.get('customerName'),
            customer_email: formData.get('customerEmail'),
            customer_phone: formData.get('customerPhone'),
            event_date: formData.get('eventDate'),
            event_time: formData.get('eventTime'),
            guest_count: parseInt(formData.get('guestCount')),
            location: formData.get('eventLocation'),
            special_requests: formData.get('specialRequests'),
            selected_dishes: this.cartData.items,
            total_amount: this.cartData.totalAmount,
            booking_source: 'cart_session'
        };

        console.log('Submitting booking:', bookingData);

        try {
            // Show loading state
            const submitBtn = form.querySelector('button[type="submit"]');
            const originalText = submitBtn.innerHTML;
            submitBtn.innerHTML = '<i class="bi bi-hourglass-split"></i> Sending...';
            submitBtn.disabled = true;

            const response = await fetch('/api/cart-booking', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(bookingData)
            });

            const result = await response.json();

            // Restore button
            submitBtn.innerHTML = originalText;
            submitBtn.disabled = false;

            if (response.ok) {
                this.showNotification(
                    'Booking request sent successfully! We will contact you shortly to confirm your reservation.',
                    'success',
                    8000
                );
                
                // Clear cart and close form
                sessionStorage.removeItem('menuBookingData');
                this.cartData = null;
                this.hideBookingForm();
                form.reset();
                this.renderCart();
                
            } else {
                this.showNotification(
                    result.error || 'Failed to send booking request. Please try again.',
                    'error'
                );
            }

        } catch (error) {
            console.error('Booking submission error:', error);
            
            // Restore button
            const submitBtn = form.querySelector('button[type="submit"]');
            submitBtn.innerHTML = '<i class="bi bi-send"></i> Send Booking Request';
            submitBtn.disabled = false;
            
            this.showNotification(
                'Connection error. Please check your internet connection and try again.',
                'error'
            );
        }
    }

    showNotification(message, type = 'success', duration = 5000) {
        // Remove existing notifications
        const existingNotifications = document.querySelectorAll('.cart-notification');
        existingNotifications.forEach(notification => {
            notification.remove();
        });

        // Create notification element
        const notification = document.createElement('div');
        notification.className = `cart-notification cart-notification-${type}`;
        
        // Choose icon based on type
        let icon = '';
        let bgColor = '';
        switch(type) {
            case 'success':
                icon = 'bi-check-circle';
                bgColor = '#28a745';
                break;
            case 'error':
                icon = 'bi-exclamation-triangle';
                bgColor = '#dc3545';
                break;
            case 'warning':
                icon = 'bi-exclamation-triangle';
                bgColor = '#ffc107';
                break;
            case 'info':
                icon = 'bi-info-circle';
                bgColor = '#17a2b8';
                break;
            default:
                icon = 'bi-check-circle';
                bgColor = '#28a745';
        }
        
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${bgColor};
            color: white;
            padding: 15px 20px;
            border-radius: 10px;
            z-index: 10000;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            display: flex;
            align-items: center;
            gap: 10px;
            max-width: 400px;
            transform: translateX(100%);
            transition: transform 0.3s ease;
        `;
        
        notification.innerHTML = `
            <i class="bi ${icon}"></i>
            <span>${message}</span>
        `;
        
        // Add to page
        document.body.appendChild(notification);
        
        // Trigger animation
        setTimeout(() => {
            notification.style.transform = 'translateX(0)';
        }, 100);
        
        // Auto-remove after duration
        setTimeout(() => {
            notification.style.transform = 'translateX(100%)';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.remove();
                }
            }, 300);
        }, duration);
    }
}

// Initialize cart session when DOM is loaded
let cartSession;
document.addEventListener('DOMContentLoaded', () => {
    cartSession = new CartSession();
});