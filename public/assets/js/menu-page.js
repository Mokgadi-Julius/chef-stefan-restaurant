/**
 * Menu Page JavaScript - Chef Stefan
 * Modern menu with booking functionality and order management
 */

class MenuPage {
    constructor() {
        this.selectedItems = [];
        this.totalAmount = 0;
        
        this.init();
    }

    init() {
        console.log('Initializing Menu Page...');
        
        this.initializeEventListeners();
        this.updateBookingSummary();
        
        console.log('Menu Page initialized successfully');
    }

    initializeEventListeners() {
        // Use event delegation for dynamically loaded buttons
        const self = this;
        document.addEventListener('click', function(e) {
            if (e.target.matches('.btn-book-item') || e.target.closest('.btn-book-item')) {
                e.preventDefault();
                const button = e.target.matches('.btn-book-item') ? e.target : e.target.closest('.btn-book-item');
                const dish = button.dataset.dish;
                const priceStr = button.dataset.price;
                // Remove 'R' prefix if present and convert to number
                const price = parseFloat(priceStr.replace('R', ''));
                
                console.log('Book button clicked:', { dish, priceStr, price });
                
                if (dish && !isNaN(price)) {
                    self.addToOrder(dish, price, button);
                } else {
                    console.error('Invalid dish data:', { dish, priceStr, price });
                }
            }
        });

        // Cart controls
        const cartToggle = document.getElementById('cartToggle');
        if (cartToggle) {
            cartToggle.addEventListener('click', () => this.toggleCart());
        }

        const cartClose = document.getElementById('cartClose');
        if (cartClose) {
            cartClose.addEventListener('click', () => this.closeCart());
        }

        const clearCart = document.getElementById('clearCart');
        if (clearCart) {
            clearCart.addEventListener('click', () => this.clearOrder());
        }

        const proceedToBooking = document.getElementById('proceedToBooking');
        if (proceedToBooking) {
            proceedToBooking.addEventListener('click', () => this.proceedToBooking());
        }

        // Make cart header clickable to toggle
        const cartHeader = document.getElementById('cartHeader');
        if (cartHeader) {
            cartHeader.addEventListener('click', () => this.toggleCart());
        }

        // Cart button controls
        const showCartBtn = document.getElementById('showCartBtn');
        if (showCartBtn) {
            showCartBtn.addEventListener('click', () => this.showCart());
        }

        // Tab switching with smooth animations
        const menuTabs = document.querySelectorAll('#menu-tabs .nav-link');
        menuTabs.forEach(tab => {
            tab.addEventListener('shown.bs.tab', (e) => {
                // Trigger AOS refresh for new content
                if (typeof AOS !== 'undefined') {
                    setTimeout(() => {
                        AOS.refresh();
                    }, 100);
                }
            });
        });
    }

    addToOrder(dish, price, buttonElement) {
        // Check if item already exists
        const existingItem = this.selectedItems.find(item => item.dish === dish);
        
        if (existingItem) {
            // Increase quantity
            existingItem.quantity += 1;
            existingItem.totalPrice = existingItem.price * existingItem.quantity;
        } else {
            // Add new item
            this.selectedItems.push({
                dish: dish,
                price: price,
                quantity: 1,
                totalPrice: price
            });
        }

        // Update button state
        this.updateButtonState(buttonElement, true);
        
        // Update summary
        this.updateBookingSummary();
        
        // Show success feedback
        this.showAddedFeedback(buttonElement);
        
        console.log(`Added ${dish} to order`);
    }

    removeFromOrder(dish) {
        const itemIndex = this.selectedItems.findIndex(item => item.dish === dish);
        
        if (itemIndex > -1) {
            this.selectedItems.splice(itemIndex, 1);
            
            // Reset button state
            const buttonElement = document.querySelector(`[data-dish="${dish}"]`);
            if (buttonElement) {
                this.updateButtonState(buttonElement, false);
            }
            
            this.updateBookingSummary();
            console.log(`Removed ${dish} from order`);
        }
    }

    updateQuantity(dish, newQuantity) {
        const item = this.selectedItems.find(item => item.dish === dish);
        
        if (item) {
            if (newQuantity <= 0) {
                this.removeFromOrder(dish);
            } else {
                item.quantity = newQuantity;
                item.totalPrice = item.price * newQuantity;
                this.updateBookingSummary();
            }
        }
    }

    updateButtonState(buttonElement, isAdded) {
        if (isAdded) {
            buttonElement.innerHTML = '<i class="bi bi-check-circle"></i> Added';
            buttonElement.classList.add('added');
        } else {
            buttonElement.innerHTML = '<i class="bi bi-plus-circle"></i> Add to Order';
            buttonElement.classList.remove('added');
        }
    }

    showAddedFeedback(buttonElement) {
        const originalContent = buttonElement.innerHTML;
        buttonElement.innerHTML = '<i class="bi bi-check-circle"></i> Added!';
        buttonElement.classList.add('added');
        
        setTimeout(() => {
            const item = this.selectedItems.find(item => item.dish === buttonElement.dataset.dish);
            if (item && item.quantity > 1) {
                buttonElement.innerHTML = `<i class="bi bi-check-circle"></i> Added (${item.quantity})`;
            }
        }, 1000);
    }

    updateBookingSummary() {
        const floatingCart = document.getElementById('floatingCart');
        const cartItems = document.getElementById('cartItems');
        const cartTotal = document.getElementById('cartTotal');
        const cartItemCount = document.getElementById('cartItemCount');
        const cartButton = document.getElementById('cartButton');
        const cartBadge = document.getElementById('cartBadge');
        const cartBtnTotal = document.getElementById('cartBtnTotal');
        
        if (this.selectedItems.length === 0) {
            if (floatingCart) floatingCart.style.display = 'none';
            if (cartButton) cartButton.style.display = 'none';
            return;
        }
        
        // Calculate total
        this.totalAmount = this.selectedItems.reduce((total, item) => total + item.totalPrice, 0);
        const totalItems = this.selectedItems.reduce((total, item) => total + item.quantity, 0);
        
        // Update cart button
        if (cartButton && cartBadge && cartBtnTotal) {
            cartBadge.textContent = totalItems;
            cartBtnTotal.textContent = this.totalAmount.toLocaleString();
            
            // Show cart button if cart is closed, hide if cart is open
            const isCartVisible = floatingCart && floatingCart.style.display !== 'none';
            cartButton.style.display = isCartVisible ? 'none' : 'block';
        }
        
        // Show cart
        if (floatingCart) floatingCart.style.display = 'block';
        
        // Update total display
        if (cartTotal) {
            cartTotal.textContent = this.totalAmount.toLocaleString();
        }
        
        // Update item count
        if (cartItemCount) {
            cartItemCount.textContent = totalItems;
        }
        
        // Update items list
        if (cartItems) {
            cartItems.innerHTML = this.selectedItems.map(item => `
                <div class="cart-item">
                    <div class="cart-item-info">
                        <div class="cart-item-name">${item.dish}</div>
                        <div class="cart-item-price">R${item.price.toLocaleString()} each</div>
                    </div>
                    <div class="cart-item-controls">
                        <button class="btn btn-sm btn-quantity" onclick="menuPage.updateQuantity('${item.dish}', ${item.quantity - 1})">
                            <i class="bi bi-dash"></i>
                        </button>
                        <span class="cart-item-quantity">${item.quantity}</span>
                        <button class="btn btn-sm btn-quantity" onclick="menuPage.updateQuantity('${item.dish}', ${item.quantity + 1})">
                            <i class="bi bi-plus"></i>
                        </button>
                        <button class="btn btn-sm btn-remove" onclick="menuPage.removeFromOrder('${item.dish}')">
                            <i class="bi bi-x"></i>
                        </button>
                    </div>
                    <div class="cart-item-total">R${item.totalPrice.toLocaleString()}</div>
                </div>
            `).join('');
        }
    }

    clearOrder() {
        this.selectedItems = [];
        this.totalAmount = 0;
        
        // Reset all button states
        const allButtons = document.querySelectorAll('.btn-book-item');
        allButtons.forEach(btn => {
            this.updateButtonState(btn, false);
        });
        
        this.updateBookingSummary();
        
        // Show feedback
        this.showNotification('Order cleared successfully', 'info');
    }

    async proceedToBooking() {
        if (this.selectedItems.length === 0) {
            this.showNotification('Please select some items first', 'warning');
            return;
        }
        
        // Prepare booking data
        const bookingData = {
            items: this.selectedItems,
            totalAmount: this.totalAmount,
            timestamp: new Date().toISOString(),
            source: 'menu'
        };
        
        // Store in session storage for the cart session
        sessionStorage.setItem('menuBookingData', JSON.stringify(bookingData));
        
        // Redirect to cart session page
        window.location.href = 'cart.html';
        
        // Show success message
        this.showNotification('Taking you to your cart...', 'success');
    }

    showNotification(message, type = 'success') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `menu-notification menu-notification-${type}`;
        notification.innerHTML = `
            <div class="notification-content">
                <i class="bi bi-${type === 'success' ? 'check-circle' : type === 'warning' ? 'exclamation-triangle' : 'info-circle'}"></i>
                <span>${message}</span>
            </div>
        `;
        
        // Add to page
        document.body.appendChild(notification);
        
        // Show with animation
        setTimeout(() => notification.classList.add('show'), 100);
        
        // Remove after delay
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }

    toggleCart() {
        const cartBody = document.getElementById('cartBody');
        const cartToggle = document.getElementById('cartToggle');
        
        if (cartBody && cartToggle) {
            const isExpanded = cartBody.style.display !== 'none';
            cartBody.style.display = isExpanded ? 'none' : 'block';
            cartToggle.innerHTML = isExpanded ? 
                '<i class="bi bi-chevron-up"></i>' : 
                '<i class="bi bi-chevron-down"></i>';
        }
    }

    showCart() {
        const floatingCart = document.getElementById('floatingCart');
        const cartButton = document.getElementById('cartButton');
        
        if (floatingCart) {
            floatingCart.style.display = 'block';
        }
        
        if (cartButton) {
            cartButton.style.display = 'none';
        }
    }

    closeCart() {
        const floatingCart = document.getElementById('floatingCart');
        const cartButton = document.getElementById('cartButton');
        
        if (floatingCart) {
            floatingCart.style.display = 'none';
        }
        
        // Show cart button if there are items in cart
        if (cartButton && this.selectedItems.length > 0) {
            cartButton.style.display = 'block';
        }
    }

    // Method to load booking data if coming from elsewhere
    loadBookingData() {
        const savedData = sessionStorage.getItem('menuBookingData');
        if (savedData) {
            try {
                const data = JSON.parse(savedData);
                this.selectedItems = data.items || [];
                this.totalAmount = data.totalAmount || 0;
                this.updateBookingSummary();
                
                // Update button states
                this.selectedItems.forEach(item => {
                    const button = document.querySelector(`[data-dish="${item.dish}"]`);
                    if (button) {
                        this.updateButtonState(button, true);
                    }
                });
            } catch (e) {
                console.warn('Could not load saved booking data:', e);
            }
        }
    }
}

// Initialize menu page when DOM is loaded
let menuPage;
document.addEventListener('DOMContentLoaded', () => {
    menuPage = new MenuPage();
    
    // Load any existing booking data
    menuPage.loadBookingData();
});

// Note: Dietary filters and menu categories are now managed through the backend API
// All menu data comes from the database via /api/categories and /api/menu-items endpoints