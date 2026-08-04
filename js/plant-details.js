// Plant details page logic
(function(){
    let currentPlant = null;
    let selectedSize = '';
    window.selectedSize = selectedSize;
    let galleryImages = [];
    let lightboxCurrentIndex = 0;
    const IMG_PLACEHOLDER = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300"><rect width="100%25" height="100%25" fill="%23e5e7eb"/><text x="50%25" y="50%25" dominant-baseline="middle" text-anchor="middle" fill="%23666" font-size="20" font-family="Arial">No%20Image</text></svg>';
    const PD_HAS_BACKEND = window.hasBackend === true;
    var API_BASE = window.API_BASE || '';

    function getParam(name) {
        const params = new URLSearchParams(window.location.search);
        return params.get(name);
    }

    function el(id){ return document.getElementById(id); }

    function loadPlantDetails(){
        let pname = getParam('plant');
        if (!pname) {
            // Fallback: use first plant if available (guest/test convenience)
            if (window.plants && window.plants.length) {
                pname = window.plants[0].name;
            } else {
                document.body.innerHTML = '<div class="p-12 text-center">No plant specified. <a href="index.html">Go back</a></div>';
                return;
            }
        }

        const decoded = decodeURIComponent(pname);
        // getPlantByName is provided by js/plants.js
        console.log('Looking for plant:', decoded);
        console.log('Plants available:', window.plants ? window.plants.length : 'No plants loaded');
        
        currentPlant = window.getPlantByName ? getPlantByName(decoded) : null;

        if (!currentPlant) {
            // Try case-insensitive search as fallback
            if (window.plants) {
                currentPlant = window.plants.find(p => p.name.toLowerCase() === decoded.toLowerCase());
            }
        }

        if (!currentPlant) {
            const plantList = window.plants ? window.plants.map(p => p.name).join(', ') : 'No plants loaded';
            console.error('Plant not found. Available plants:', plantList);
            document.body.innerHTML = '<div class="p-12 text-center"><p>Plant not found.</p><p class="text-sm text-gray-600 mt-2">Available plants: ' + plantList + '</p><a href="index.html" class="text-green-600 hover:text-green-700 mt-4 inline-block">Go back</a></div>';
            return;
        }

        // Setup gallery images (use images array if available)
        galleryImages = currentPlant.images && currentPlant.images.length ? currentPlant.images : [currentPlant.image];
        const mainImg = el('plant-image');
        mainImg.src = galleryImages[0] || IMG_PLACEHOLDER;
        mainImg.onerror = function(){ this.onerror = null; this.src = IMG_PLACEHOLDER; };

        // render thumbnails
        const thumbs = el('thumbs');
        thumbs.innerHTML = '';
        galleryImages.forEach((src, idx) => {
            const btn = document.createElement('button');
            btn.className = 'rounded overflow-hidden border-2 border-gray-200 hover:border-green-600 transition-all';
            btn.style.minWidth = '72px';
            btn.style.height = '56px';
            btn.style.padding = '0';
            btn.style.background = 'white';
            btn.innerHTML = `<img src="${src}" alt="thumb-${idx}" class="w-full h-full object-contain object-center">`;
            btn.onclick = (e) => { lightboxCurrentIndex = idx; mainImg.src = src; e.stopPropagation(); };
            thumbs.appendChild(btn);
        });
        el('plant-name').textContent = currentPlant.name;
        el('plant-category').textContent = currentPlant.cat || '';
        el('care-content').textContent = `General care for ${currentPlant.name}: Bright, indirect light; moderate watering; well-draining soil.`;

        // Default to a size so add-to-cart works without an extra click
        selectedSize = 'Small';
        window.selectedSize = selectedSize;
        el('selected-size').textContent = 'Small';
        const defaultSizeBtn = el('size-small');
        if (defaultSizeBtn) defaultSizeBtn.classList.add('bg-green-200');

        const qtyInput = el('quantity');
        if (qtyInput) {
            qtyInput.min = '0';
            qtyInput.max = '1000';
            qtyInput.addEventListener('input', () => {
                let raw = qtyInput.value;
                if (raw === '') return;
                let value = parseInt(raw, 10);
                if (Number.isNaN(value)) {
                    qtyInput.value = '';
                    return;
                }
                value = Math.max(0, Math.min(1000, value));
                if (qtyInput.value !== String(value)) {
                    qtyInput.value = value;
                }
            });
        }

        // ensure cart UI sync
        if (typeof updateCartUI === 'function') updateCartUI();
    }

    // Expose for external triggers/tests
    window.loadPlantDetails = loadPlantDetails;

    window.selectSize = function(size){
        selectedSize = size;
        window.selectedSize = selectedSize;
        el('selected-size').textContent = size;
        document.querySelectorAll('.size-btn').forEach(b=>b.classList.remove('bg-green-200'));
        const btn = document.getElementById('size-' + size.toLowerCase());
        if (btn) btn.classList.add('bg-green-200');
    }

    window.openLightbox = function(){
        const lb = el('lightbox');
        lb.classList.remove('hidden');
        el('lightbox-image').src = galleryImages[lightboxCurrentIndex] || IMG_PLACEHOLDER;
        document.body.style.overflow = 'hidden';
    }

    window.closeLightbox = function(event){
        if (event && event.target !== el('lightbox')) return;
        el('lightbox').classList.add('hidden');
        document.body.style.overflow = 'auto';
    }

    window.lightboxNext = function(){
        lightboxCurrentIndex = (lightboxCurrentIndex + 1) % galleryImages.length;
        el('lightbox-image').src = galleryImages[lightboxCurrentIndex] || IMG_PLACEHOLDER;
    }

    window.lightboxPrev = function(){
        lightboxCurrentIndex = (lightboxCurrentIndex - 1 + galleryImages.length) % galleryImages.length;
        el('lightbox-image').src = galleryImages[lightboxCurrentIndex] || IMG_PLACEHOLDER;
    }

    window.addThisToCart = function(sourceElement){
        if (!currentPlant) return;

        // Default to small size if none selected
        if (!selectedSize) {
            selectedSize = 'Small';
            const defaultBtn = el('size-small');
            if (defaultBtn) defaultBtn.classList.add('bg-green-200');
            el('selected-size').textContent = 'Small';
        }
        
        // Allow adding to cart even when not logged in (guest flow)
        let qty = parseInt(el('quantity').value);
        if (isNaN(qty)) qty = 0;
        qty = Math.max(1, Math.min(1000, qty));
        if (qty < 1 || qty > 1000) {
            if (typeof showToast === 'function') showToast('Quantity must be between 1 and 1000');
            return;
        }
        const key = 'nurseryCart';
        const existing = JSON.parse(localStorage.getItem(key) || '[]');
        const match = existing.find(it => it.name === currentPlant.name && it.size === selectedSize);
        if (match) {
            match.quantity = (match.quantity || 1) + qty;
        } else {
            existing.push({
                name: currentPlant.name,
                cat: currentPlant.cat,
                image: currentPlant.image,
                size: selectedSize,
                quantity: qty,
                unit_price_cents: (currentPlant.price * 100) || 0
            });
        }
        cart = existing;
        localStorage.setItem(key, JSON.stringify(existing));
        if (sourceElement) animateAddToCart(sourceElement, currentPlant.image);
        triggerCartFeedback();
        if (typeof updateCartUI === 'function') updateCartUI();
        if (typeof showToast === 'function') showToast(`Added to cart`);
    }

    window.orderThisNow = function(){
        if (!currentPlant) return;
        
        // Validate that size is selected
        if (!selectedSize) {
            if (typeof showToast === 'function') showToast('Please select a size');
            return;
        }
        
        // Get customer and quantity
        const customer = typeof getCurrentCustomer === 'function' ? getCurrentCustomer() : null;
        let qty = parseInt(el('quantity').value);
        if (isNaN(qty)) qty = 0;
        qty = Math.max(1, Math.min(1000, qty));
        if (qty < 1 || qty > 1000) {
            if (typeof showToast === 'function') showToast('Quantity must be between 1 and 1000');
            return;
        }
        
        // Create order item
        const orderItem = {
            name: currentPlant.name,
            cat: currentPlant.cat,
            image: currentPlant.image,
            size: selectedSize || '',
            quantity: qty,
            price: (currentPlant.price * 100) || 0
        };
        
        if (typeof isCustomerLoggedIn === 'function' && !isCustomerLoggedIn()) {
            window.location.href = `login.html?returnUrl=${encodeURIComponent(window.location.href)}`;
            return;
        }

        const productComment = el('product-comment') ? el('product-comment').value.trim() : '';

        // Save order using orders.js if available
        let order = null;
        if (typeof createOrder === 'function') {
            order = createOrder([orderItem], 'whatsapp', customer?.phone || '', customer?.email || '', productComment);
            
            // Link order to customer if logged in
            if (customer && order && typeof linkOrderToCustomer === 'function') {
                linkOrderToCustomer(order.id, customer.id);
            }
            if (typeof showToast === 'function') showToast('Order created');
        }
        
        // Prepare to capture server order number and id when saving
        let serverOrderNumber = null;
        let serverOrderId = null;
        
        // Try creating a Stripe checkout for single item; fallback to WhatsApp
        (async ()=>{
                const productComment = el('product-comment') ? el('product-comment').value.trim() : '';
        // First, attempt to save order to backend and capture orderNumber
                if (PD_HAS_BACKEND) {
                    try {
                        const token = localStorage.getItem('authToken');
                        const headers = { 'Content-Type': 'application/json' };
                        if (token) headers['Authorization'] = 'Bearer ' + token;

                        const payload = {
                            items: [{ productId: null, quantity: qty, priceCents: orderItem.price }],
                            totalCents: orderItem.price * qty,
                            customerId: customer ? customer.id : null,
                            deliveryAddress: customer?.address || '',
                            notes: productComment
                        };

                        const saveRes = await fetch(API_BASE + '/api/orders', {
                            method: 'POST',
                            headers,
                            body: JSON.stringify(payload)
                        });
                        if (saveRes.ok) {
                            try {
                                const saved = await saveRes.json();
                                serverOrderNumber = saved.orderNumber || saved.order_number || (saved.data && saved.data.orderNumber) || null;
                                serverOrderId = saved.orderId || saved.orderId || saved.order_id || null;
                                if (serverOrderNumber && typeof showToast === 'function') showToast('Order saved to server');
                                // Persist server linkage into local order record
                                if (typeof setOrderServerInfo === 'function' && order) {
                                    try { setOrderServerInfo(order.id, serverOrderId, serverOrderNumber); } catch (e) { console.warn('Could not set order server info', e.message); }
                                }
                            } catch (e) { console.warn('Could not parse saved order response'); }
                        } else {
                            console.warn('Saving order to server failed');
                        }
                    } catch (e) {
                        console.warn('Error saving order to backend:', e.message);
                    }
                } else {
                    console.warn('Skipping backend order save: no backend available');
                }

                // Then attempt checkout session creation
                if (PD_HAS_BACKEND) {
                    try {
                        const unit_price_cents = (currentPlant.price * 100) || 0;
                        const res = await fetch(API_BASE + '/api/checkout/create-session', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ items: [{ name: currentPlant.name, quantity: 1, unit_price_cents } ] })
                        });
                        const data = await res.json();
                        if (data && data.url) {
                            // Only follow known/expected checkout URLs (avoid redirecting to unexpected sites)
                            try {
                                const checkoutUrl = new URL(data.url);
                                const host = checkoutUrl.hostname || '';
                                const trusted = host.includes('stripe') || host.includes('checkout') || host.includes('stripepay');
                                if (trusted) {
                                    window.location.href = data.url;
                                    return;
                                } else {
                                    console.warn('Untrusted checkout URL, falling back to WhatsApp:', data.url);
                                }
                            } catch (e) {
                                console.warn('Invalid checkout URL returned, falling back to WhatsApp');
                            }
                        }
                    } catch (e) {
                        console.warn('Checkout not available', e.message);
                    }
                } else {
                    console.warn('Skipping backend checkout: window.hasBackend not set');
                }

            if (window.decrementPlantStock) {
                window.decrementPlantStock(currentPlant.name, qty);
            }
            const phone = typeof phoneNumber !== 'undefined' ? phoneNumber : '8466899624';
            let message = `🌱 Order from Sri Lavanya Nursery\n\n`;
            message += `Order#: ${serverOrderNumber || (order && order.order_number) || ''}\n\n`;
            message += `*${currentPlant.name}*\n`;
            if (selectedSize) message += `Size: ${selectedSize}\n`;
            message += `Category: ${currentPlant.cat || ''}\n`;
            message += `Price: INR ${Number(currentPlant.price).toFixed(2)}\n`;
            message += `Quantity: ${qty}\n`;
            if (qty > 1) {
                message += `Total: INR ${(Number(currentPlant.price) * qty).toFixed(2)}\n`;
            }
            message += "\n";
            if (productComment) {
                message += `Note: ${productComment}\n\n`;
            }
            message += 'Please confirm the details and send your delivery address.';
            const url = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
            window.location.href = url;
        })();
    }

    // Keyboard navigation for lightbox
    document.addEventListener('keydown', (e) => {
        const lb = el('lightbox');
        if (lb.classList.contains('hidden')) return;
        if (e.key === 'ArrowRight') lightboxNext();
        if (e.key === 'ArrowLeft') lightboxPrev();
        if (e.key === 'Escape') closeLightbox();
    });

    // Touch swipe for thumbnails on mobile
    let touchStartX = 0;
    const thumbs = el('thumbs');
    if (thumbs) {
        thumbs.addEventListener('touchstart', (e) => { touchStartX = e.touches[0].clientX; });
        thumbs.addEventListener('touchend', (e) => {
            const touchEndX = e.changedTouches[0].clientX;
            if (touchStartX - touchEndX > 50) thumbs.scrollLeft += 100;
            if (touchEndX - touchStartX > 50) thumbs.scrollLeft -= 100;
        });
    }

    window.addEventListener('DOMContentLoaded', () => {
        // Wait for plants to be loaded before accessing them
        if (window.plantsReadyPromise) {
            window.plantsReadyPromise.then(() => {
                console.log('Plants loaded, loading plant details...');
                loadPlantDetails();
                // If returning from login with postAdd=1, attempt to add automatically
                const postAdd = getParam('postAdd');
                if (postAdd === '1') {
                    // Delay slightly to allow DOM to finish rendering
                    setTimeout(() => {
                        if (window.addThisToCart) window.addThisToCart();
                    }, 300);
                }
            }).catch((err) => {
                console.error('Error waiting for plants:', err);
                loadPlantDetails();
            });
        } else {
            // Fallback if plantsReadyPromise doesn't exist
            console.warn('plantsReadyPromise not found, attempting to load plant details directly');
            loadPlantDetails();
            const postAdd = getParam('postAdd');
            if (postAdd === '1') {
                setTimeout(() => {
                    if (window.addThisToCart) window.addThisToCart();
                }, 300);
            }
        }
    });
})();
