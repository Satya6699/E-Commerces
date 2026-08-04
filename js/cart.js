// Sri Lavanya Nursery - Shopping Cart Management

let cart = JSON.parse(localStorage.getItem('nurseryCart')) || [];
let wishlist = JSON.parse(localStorage.getItem('nurseryWishlist')) || [];
const phoneNumber = "8466899624";
// When true, allow backend API calls; set `window.hasBackend = true` when a backend is available
const CART_HAS_BACKEND = window.hasBackend === true;
var API_BASE = window.API_BASE || '';
const CART_CLIENT_ID = window.CLIENT_ID || (window.CLIENT_ID = 'client-' + (localStorage.getItem('clientId') || Date.now().toString()));

// Add item to cart
function addToCart(plantName, sourceElement) {
    const plant = typeof getPlantByName === 'function' ? getPlantByName(plantName) : null;

    if (!plant) {
        window.location.href = `plant-details.html?plant=${encodeURIComponent(plantName)}`;
        return;
    }

    const existing = JSON.parse(localStorage.getItem('nurseryCart') || '[]');
    const match = existing.find(item => item.name === plant.name && item.size === '');
    if (match) {
        match.quantity = (match.quantity || 1) + 1;
    } else {
        existing.push({
            name: plant.name,
            cat: plant.cat,
            image: plant.image,
            size: '',
            quantity: 1000,
            unit_price_cents: (plant.price * 100) || 0
        });
    }

    cart = existing;
    localStorage.setItem('nurseryCart', JSON.stringify(existing));
    if (sourceElement) animateAddToCart(sourceElement, plant.image);
    triggerCartFeedback();
    if (typeof updateCartUI === 'function') updateCartUI();
    if (typeof showToast === 'function') showToast(`${plant.name} added to cart`);
}

function triggerCartFeedback() {
    const cartCount = document.getElementById('cart-count');
    if (cartCount) {
        cartCount.classList.remove('hidden');
        cartCount.animate([
            { transform: 'scale(1)', opacity: 1 },
            { transform: 'scale(1.4)', opacity: 0.8 },
            { transform: 'scale(1)', opacity: 1 }
        ], { duration: 320, easing: 'ease-out' });
    }
    playAddToCartSound();
}

function playAddToCartSound() {
    try {
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();

        oscillator.type = 'triangle';
        oscillator.frequency.setValueAtTime(600, audioCtx.currentTime);
        gainNode.gain.setValueAtTime(0.0001, audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.2, audioCtx.currentTime + 0.02);
        gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.15);

        oscillator.connect(gainNode);
        gainNode.connect(audioCtx.destination);
        oscillator.start();
        oscillator.stop(audioCtx.currentTime + 0.15);
    } catch (e) {
        console.warn('Add-to-cart sound failed:', e.message);
    }
}

function animateAddToCart(sourceElement, imageUrl) {
    const cartButton = document.querySelector('.cart-button');
    const cartCount = document.getElementById('cart-count');
    if (!sourceElement || !cartButton) return;

    const sourceRect = sourceElement.getBoundingClientRect();
    const cartRect = cartButton.getBoundingClientRect();
    const flyer = document.createElement('div');

    flyer.className = 'add-to-cart-flyer';
    flyer.style.left = `${sourceRect.left + sourceRect.width / 2 - 28}px`;
    flyer.style.top = `${sourceRect.top + sourceRect.height / 2 - 28}px`;
    flyer.style.backgroundImage = imageUrl ? `url(${imageUrl})` : 'none';
    flyer.style.backgroundSize = 'cover';
    flyer.style.backgroundPosition = 'center';

    document.body.appendChild(flyer);

    requestAnimationFrame(() => {
        const deltaX = cartRect.left + cartRect.width / 2 - (sourceRect.left + sourceRect.width / 2);
        const deltaY = cartRect.top + cartRect.height / 2 - (sourceRect.top + sourceRect.height / 2);
        flyer.style.transform = `translate(${deltaX}px, ${deltaY}px) scale(0.2)`;
        flyer.style.opacity = '0';
    });

    flyer.addEventListener('transitionend', () => {
        flyer.remove();
        if (cartCount) {
            cartCount.classList.add('cart-count-bump');
            setTimeout(() => cartCount.classList.remove('cart-count-bump'), 340);
        }
    });
}

// Remove item from cart
function removeFromCart(plantName, size = '') {
    cart = cart.filter(item => !(item.name === plantName && (!size || item.size === size)));
    localStorage.setItem('nurseryCart', JSON.stringify(cart));
    updateCartUI();
}

// Update item quantity
function updateQuantity(plantName, size = '', quantity) {
    const item = cart.find(p => p.name === plantName && (!size || p.size === size));
    if (item) {
        let q = parseInt(quantity);
        if (isNaN(q)) q = 0;
        q = Math.max(0, Math.min(1000, q));
        item.quantity = q;
        localStorage.setItem('nurseryCart', JSON.stringify(cart));
        updateCartUI();
    }
}

// Refined cart UI renderer
async function updateCartUI() {
    cart = JSON.parse(localStorage.getItem('nurseryCart')) || [];
    const cartCount = document.getElementById('cart-count');
    const cartItems = document.getElementById('cart-items');
    const orderBtn = document.getElementById('order-btn-cart');
    const checkoutBtn = document.getElementById('checkout-btn-cart');

    if (!cartItems) return;

    if (cart.length === 0) {
        if (cartCount) cartCount.classList.add('hidden');
        cartItems.innerHTML = `
            <div class="empty-state py-10">
                <i class="fas fa-shopping-basket"></i>
                <p class="font-semibold">Your cart is empty</p>
                <a href="#shop" onclick="toggleCart()" class="text-green-700 font-bold">Browse plants</a>
            </div>
        `;
        if (orderBtn) orderBtn.disabled = true;
        if (checkoutBtn) checkoutBtn.disabled = true;
        return;
    }

    if (CART_HAS_BACKEND) {
        try {
            fetch(API_BASE + '/api/client/storage', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ key: 'nurseryCart', value: cart, clientId: CART_CLIENT_ID })
            });
        } catch (e) { }
    }

    const totalItems = cart.reduce((sum, item) => sum + (item.quantity || 1), 0);
    if (cartCount) {
        cartCount.classList.remove('hidden');
        cartCount.textContent = totalItems;
    }

    let productsMap = {};
    if (CART_HAS_BACKEND) {
        try {
            const p = await fetch(API_BASE + '/api/products');
            if (p.ok) {
                const plist = await p.json();
                plist.forEach(pp => { productsMap[pp.name] = pp; });
            }
        } catch (e) { }
    }

    let totalCents = 0;
    cartItems.innerHTML = `
        <div class="cart-summary mb-4">
            <div class="flex items-center justify-between gap-3">
                <div>
                    <p class="text-sm font-semibold">My Cart</p>
                    <p class="text-xs text-gray-500">${totalItems} item${totalItems === 1 ? '' : 's'} added</p>
                </div>
                <div class="text-green-700 text-sm font-semibold">Subtotal</div>
            </div>
        </div>
    ` + cart.map((item, idx) => {
        const prod = productsMap[item.name] || {};
        const unit = prod.price_cents || (item.unit_price_cents || 0);
        const subtotal = unit * (item.quantity || 1);
        totalCents += subtotal;
        const priceDisplay = unit ? `INR ${(unit / 100).toFixed(2)}` : 'Contact';

        return `
            <div class="cart-line-item">
                <img src="${item.image}" alt="${item.name}" onerror="this.onerror=null;this.src=IMG_PLACEHOLDER">
                <div>
                    <p class="font-bold text-sm">${item.name}</p>
                    <p class="text-xs text-gray-500">${item.cat || 'Plant'}</p>
                    ${item.size ? `<p class="text-xs text-green-600 font-semibold">${item.size}</p>` : ''}
                    <div class="flex items-center gap-2 mt-2">
                        <label class="text-xs text-gray-500" for="cart-qty-${idx}">Qty</label>
                        <input id="cart-qty-${idx}" type="number" min="0" max="1000" value="${item.quantity || 1}" onchange="updateQuantity('${item.name}', '${item.size || ''}', this.value)" class="qty-input text-xs">
                        <button type="button" onclick="removeFromCart('${item.name}', '${item.size || ''}')" class="text-red-500 text-xs hover:text-red-700" aria-label="Remove ${item.name}">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
                <div class="cart-line-price text-right">
                    <div class="text-sm text-gray-700">${priceDisplay}</div>
                    <div class="text-sm font-semibold">INR ${(subtotal / 100).toFixed(2)}</div>
                </div>
            </div>`;
    }).join('');

    cartItems.innerHTML += `
        <div class="pt-4 border-t mt-4">
            <div class="flex justify-between items-center">
                <div class="text-sm text-gray-600">Total</div>
                <div class="text-lg font-bold">INR ${(totalCents / 100).toFixed(2)}</div>
            </div>
        </div>
    `;

    if (orderBtn) orderBtn.disabled = false;
    if (checkoutBtn) checkoutBtn.disabled = false;
}

// Toggle cart sidebar
function toggleCart() {
    const sidebar = document.getElementById('cart-sidebar');
    const overlay = document.getElementById('cart-overlay');
    sidebar.classList.toggle('translate-x-full');
    overlay.classList.toggle('hidden');
}

function toggleWishlistSidebar() {
    const sidebar = document.getElementById('wishlist-sidebar');
    const overlay = document.getElementById('wishlist-overlay');
    if (!sidebar || !overlay) return;
    sidebar.classList.toggle('translate-x-full');
    overlay.classList.toggle('hidden');
}

function updateWishlistUI() {
    wishlist = JSON.parse(localStorage.getItem('nurseryWishlist') || '[]');
    const count = wishlist.length;
    const badge = document.getElementById('wishlist-count');
    const listEl = document.getElementById('wishlist-items');

    if (badge) {
        badge.textContent = count;
        if (count > 0) {
            badge.classList.remove('hidden');
        } else {
            badge.classList.add('hidden');
        }
    }

    if (!listEl) return;
    if (count === 0) {
        listEl.innerHTML = `<div class="text-center text-gray-500 py-10">Your wishlist is empty.</div>`;
        return;
    }

    listEl.innerHTML = wishlist.map((item, idx) => `
            <div class="wishlist-line-item mb-4 border-b pb-3">
                <div class="flex items-center gap-3">
                    <img src="${item.image}" alt="${item.name}" class="w-16 h-16 object-cover rounded">
                    <div class="flex-1">
                        <p class="font-semibold text-sm">${item.name}</p>
                        <p class="text-xs text-gray-500">${item.cat || 'Plant'}${item.size ? ' • ' + item.size : ''}</p>
                    </div>
                </div>
                <div class="mt-3 flex items-center gap-2">
                    <button type="button" onclick="removeFromWishlist('${item.name}', '${item.size || ''}')" class="text-red-600 text-xs hover:text-red-800">Remove</button>
                    <button type="button" onclick="addToCartFromWishlist('${item.name}', '${item.size || ''}')" class="text-green-600 text-xs hover:text-green-800">Move to cart</button>
                </div>
            </div>`).join('');
}

function saveWishlist() {
    localStorage.setItem('nurseryWishlist', JSON.stringify(wishlist));
}

function isWishlisted(plantName, size = '') {
    return wishlist.some(item => item.name === plantName && item.size === size);
}

function addToWishlist(plantName, size = '', sourceElement) {
    const plant = typeof getPlantByName === 'function' ? getPlantByName(plantName) : null;
    if (!plant) return;
    const match = wishlist.find(item => item.name === plant.name && item.size === size);
    if (!match) {
        wishlist.push({
            name: plant.name,
            cat: plant.cat,
            image: plant.image,
            size: size || '',
            quantity: 1,
            unit_price_cents: (plant.price * 100) || 0
        });
        saveWishlist();
        updateWishlistUI();
        if (typeof showToast === 'function') showToast(`${plant.name} added to wishlist`);
    } else {
        removeFromWishlist(plantName, size);
    }
}

function removeFromWishlist(plantName, size = '') {
    wishlist = wishlist.filter(item => !(item.name === plantName && item.size === size));
    saveWishlist();
    updateWishlistUI();
    if (typeof showToast === 'function') showToast(`${plantName} removed from wishlist`);
}

function toggleWishlist(plantName, size = '', sourceElement) {
    if (isWishlisted(plantName, size)) {
        removeFromWishlist(plantName, size);
    } else {
        addToWishlist(plantName, size, sourceElement);
    }
}

function addToCartFromWishlist(plantName, size = '') {
    const plant = typeof getPlantByName === 'function' ? getPlantByName(plantName) : null;
    if (!plant) return;
    const existing = JSON.parse(localStorage.getItem('nurseryCart') || '[]');
    const match = existing.find(item => item.name === plant.name && item.size === size);
    if (match) {
        match.quantity = (match.quantity || 1) + 1;
    } else {
        existing.push({
            name: plant.name,
            cat: plant.cat,
            image: plant.image,
            size: size || '',
            quantity: 1,
            unit_price_cents: (plant.price * 100) || 0
        });
    }
    cart = existing;
    localStorage.setItem('nurseryCart', JSON.stringify(existing));
    updateCartUI();
    removeFromWishlist(plantName, size);
    if (typeof showToast === 'function') showToast(`${plant.name} moved to cart`);
}

// Order from cart via WhatsApp with database persistence
async function orderFromCart() {
    cart = JSON.parse(localStorage.getItem('nurseryCart') || '[]');
    if (cart.length === 0) return;
    if (typeof isCustomerLoggedIn === 'function' && !isCustomerLoggedIn()) {
        window.location.href = `login.html?returnUrl=${encodeURIComponent(window.location.href)}`;
        return;
    }
    
    // Prepare items for database
    let productsMap = {};
    if (CART_HAS_BACKEND) {
        try {
            const p = await fetch(API_BASE + '/api/products');
            if (p.ok) {
                const plist = await p.json();
                plist.forEach(pp => { productsMap[pp.name] = pp; });
            }
        } catch (e) {
            console.warn('Could not fetch product prices', e.message);
        }
    }

    // Calculate total and prepare order items
    let totalCents = 0;
    const orderItems = cart.map(item => {
        const prod = productsMap[item.name] || {};
        const priceCents = prod.price_cents || (item.unit_price_cents || 0);
        const subtotal = priceCents * (item.quantity || 1);
        totalCents += subtotal;
        return {
            productId: prod.id || item.plantId || null,
            quantity: item.quantity || 1,
            priceCents: priceCents
        };
    });

    const orderComment = document.getElementById('order-comment') ? document.getElementById('order-comment').value.trim() : '';
    // Get customer info
    const customer = typeof getCurrentCustomer === 'function' ? getCurrentCustomer() : null;
    const customerId = customer ? customer.id : null;
    
    // Save order to database and capture server order number
    let serverOrderNumber = null;
    if (CART_HAS_BACKEND) {
        try {
            const orderRes = await fetch(API_BASE + '/api/orders', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    items: orderItems,
                    totalCents: totalCents,
                    customerId: customerId,
                    deliveryAddress: customer?.address || '',
                    notes: orderComment
                })
            });
            
            if (orderRes.ok) {
                const orderData = await orderRes.json();
                serverOrderNumber = orderData.orderNumber || orderData.order_number || null;
                showToast(`Order #${serverOrderNumber || 'created'} created successfully!`);
            }
        } catch (e) {
            console.warn('Could not save order to database:', e.message);
        }
    }
    
    // Still send WhatsApp message for confirmation
    if (typeof isCustomerLoggedIn === 'function' && !isCustomerLoggedIn()) {
        window.location.href = `login.html?returnUrl=${encodeURIComponent(window.location.href)}`;
        return;
    }
    if (window.decrementPlantStock) {
        cart.forEach(item => {
            if (item.name) {
                window.decrementPlantStock(item.name, item.quantity || 1);
            }
        });
    }
    let message = "🌱 *Order Summary from Sri Lavanya Nursery* 🌱\n\n";
    message += `Order#: ${serverOrderNumber || ''}\n\n`;
    message += "Hello, I would like to order the following plants:\n\n";
    
    cart.forEach((item, index) => {
        const priceCents = productsMap[item.name]?.price_cents || (item.unit_price_cents || 0);
        message += `${index + 1}. *${item.name}*\n`;
        message += `   📁 Category: ${item.cat}\n`;
        message += `   📦 Quantity: ${item.quantity}\n`;
        if (item.size) {
            message += `   📏 Size: ${item.size}\n`;
        }
        message += `   💰 Price: INR ${(priceCents / 100).toFixed(2)}\n`;
        message += `   🧾 Item total: INR ${(priceCents * (item.quantity || 1) / 100).toFixed(2)}\n`;
        message += "\n";
    });
    
    message += `Total: INR ${(totalCents / 100).toFixed(2)}\n\n`;
    message += "Please confirm the details and send your delivery address.\n";
    if (orderComment) {
        message += `\nNote: ${orderComment}\n`;
    }
    message += "Thank you!";
    
    const encodedMessage = encodeURIComponent(message);
    
    // Clear cart after order
    cart = [];
    localStorage.setItem('nurseryCart', JSON.stringify(cart));
    updateCartUI();
    toggleCart();
    
    // Redirect to WhatsApp and include server order number when available
    const waUrl = `https://wa.me/${phoneNumber}?text=${encodedMessage}`;
    window.location.href = waUrl;
}

// Show toast notification
function showToast(message) {
    const toast = document.getElementById('toast');
    const toastMessage = document.getElementById('toast-message');
    
    toastMessage.textContent = message;
    toast.classList.remove('hidden');
    
    setTimeout(() => {
        toast.classList.add('hidden');
    }, 2500);
}

// Show order confirmation modal with cancel option
function showOrderModal(order) {
    // Remove existing modal
    const existing = document.getElementById('order-modal');
    if (existing) existing.remove();

    const modal = document.createElement('div');
    modal.id = 'order-modal';
    modal.className = 'fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50';
    modal.innerHTML = `
        <div class="bg-white rounded-lg shadow-lg max-w-lg w-full p-6">
            <h3 class="text-lg font-bold mb-2">Order Created</h3>
            <p class="text-sm text-gray-600 mb-4">Order#: <span id="modal-order-number">${order.orderNumber || ''}</span></p>
            <div id="modal-order-items" class="mb-4 text-sm text-gray-700"></div>
            <div class="flex gap-3 justify-end">
                <button id="modal-cancel-order" class="px-4 py-2 bg-red-500 text-white rounded">Cancel Order</button>
                <button id="modal-continue" class="px-4 py-2 bg-green-600 text-white rounded">Continue to WhatsApp</button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    const itemsContainer = document.getElementById('modal-order-items');
    if (itemsContainer && order.items) {
        itemsContainer.innerHTML = order.items.map(i => `• ${i.quantity} x ${i.name || i.productId || ''} ${i.size ? '('+i.size+')':''}`).join('<br>');
    }

    document.getElementById('modal-continue').onclick = () => {
        // proceed to WhatsApp (message already prepared on order object)
        window.location.href = order.whatsappUrl;
    };

    document.getElementById('modal-cancel-order').onclick = async () => {
        // Attempt server cancel if server orderId and auth token present
        const token = localStorage.getItem('authToken');
        if (order.serverOrderId && token) {
            try {
                const res = await fetch(API_BASE + '/api/admin/orders/' + order.serverOrderId + '/status', {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
                    body: JSON.stringify({ status: 'cancelled' })
                });
                if (res.ok) {
                    showToast('Order cancelled successfully');
                    modal.remove();
                    return;
                } else {
                    const j = await res.json().catch(()=>({}));
                    showToast('Could not cancel order on server: ' + (j.error || res.status));
                    return;
                }
            } catch (e) {
                console.warn('Cancel request failed', e.message);
                showToast('Cancel failed');
                return;
            }
        }

        // Fallback: mark as cancelled in local storage orders if present
        const ordersJson = localStorage.getItem('nurseryOrders');
        if (ordersJson) {
            const orders = JSON.parse(ordersJson);
            const ord = orders.find(o => (o.order_number && o.order_number === order.orderNumber) || o.id === order.localId);
            if (ord) {
                ord.status = 'cancelled';
                localStorage.setItem('nurseryOrders', JSON.stringify(orders));
                showToast('Order marked cancelled locally');
                modal.remove();
                return;
            }
        }

        showToast('Order cancelled locally');
        modal.remove();
    };
}
    function showOrderModal(message, onContinue, onCancel) {
        const modal = document.createElement('div');
        modal.className = 'order-modal';
        modal.innerHTML = `
            <div class="order-modal-content">
                <p>${message}</p>
                <div class="order-modal-actions">
                    <button id="order-continue">Continue</button>
                    <button id="order-cancel">Cancel</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);

        document.getElementById('order-continue').addEventListener('click', () => {
            document.body.removeChild(modal);
            onContinue && onContinue();
        });
        document.getElementById('order-cancel').addEventListener('click', async () => {
            document.body.removeChild(modal);
            if (typeof onCancel === 'function') {
                try {
                    await onCancel();
                } catch (err) {
                    console.error('Order cancel handler failed', err);
                }
            }
        });
    }

// Initialize cart and wishlist on page load
window.addEventListener('DOMContentLoaded', () => {
    updateCartUI();
    updateWishlistUI();
});
