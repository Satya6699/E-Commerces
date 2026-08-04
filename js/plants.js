// Sri Lavanya Nursery - Plant Data & Filtering

let plants = [];
// Inline SVG placeholder for images that fail to load
const IMG_PLACEHOLDER = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300"><rect width="100%25" height="100%25" fill="%23e5e7eb"/><text x="50%25" y="50%25" dominant-baseline="middle" text-anchor="middle" fill="%23666" font-size="20" font-family="Arial">No%20Image</text></svg>';

// Category mapping from database format to short format
const categoryMap = {
    'Indoor Plants': 'indoor',
    'Outdoor Plants': 'outdoor',
    'Flowering Plants': 'flowering',
    'Fruit Plants': 'fruits',
    'Decoration Plants': 'decoration'
};

const categoryLabels = {
    all: 'All plants',
    indoor: 'Indoor',
    outdoor: 'Outdoor',
    flowering: 'Flowering',
    fruits: 'Fruits',
    decoration: 'Decoration'
};

const seedPlantNames = [
    'papaya',
    'mango',
    'guava',
    'lemon',
    'chili',
    'tomato',
    'cucumber',
    'mint',
    'basil'
];

function escapeHTML(text) {
    if (!text) return '';
    return String(text).replace(/[&<>"']/g, (char) => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
    }[char]));
}

function jsArg(value) {
    return JSON.stringify(String(value || '')).replace(/"/g, '&quot;');
}

function formatPlantPrice(price) {
    const numericPrice = Number(price);
    if (!Number.isFinite(numericPrice) || numericPrice <= 0) return 'Contact';
    return `INR ${numericPrice.toFixed(0)}`;
}

function renderPlantCard(plant) {
    const plantName = escapeHTML(plant.name);
    const category = escapeHTML(plant.category || categoryLabels[plant.cat] || plant.cat);
    const description = escapeHTML(plant.description || 'Premium quality plant');
    const image = escapeHTML(plant.image || IMG_PLACEHOLDER);
    const stock = Number(plant.stock);
    const stockText = Number.isFinite(stock) && stock > 0 ? `${stock} in stock` : 'Ask availability';
    const nameArg = jsArg(plant.name);
    const imageArg = jsArg(plant.image || IMG_PLACEHOLDER);
    const categoryArg = jsArg(plant.cat || plant.category || '');
    
    // Check if plant is a new arrival (first 3 plants or has is_new flag)
    const isNewArrival = plant.is_new || (plants.length > 0 && plants.indexOf(plant) < 3);
    const newBadgeHTML = isNewArrival ? '<span class="new-arrival-badge">New</span>' : '';

    return `
        <article class="plant-card bg-white overflow-hidden relative">
            ${newBadgeHTML}
            <div class="plant-media">
                <img src="${image}" alt="${plantName}" onerror="this.onerror=null;this.src=IMG_PLACEHOLDER">
            </div>
            <div class="p-4">
                <div>
                    <span class="plant-category">${category}</span>
                    <h4>${plantName}</h4>
                    <p class="plant-description">${description}</p>
                    <div class="plant-meta-row">
                        <span class="plant-price">${formatPlantPrice(plant.price)}</span>
                        <span class="plant-stock"><i class="fas fa-seedling mr-1"></i>${escapeHTML(stockText)}</span>
                    </div>
                </div>
                <div class="plant-card-actions">
                    <button type="button" onclick="viewGallery(${nameArg})" class="soft-btn flex items-center justify-center gap-2">
                        <i class="fas fa-images"></i> Gallery
                    </button>
                    <button type="button" onclick="showDetailsModal(${nameArg}, ${imageArg}, ${categoryArg})" class="soft-btn flex items-center justify-center gap-2">
                        <i class="fas fa-info-circle"></i> Details
                    </button>
                    <button type="button" onclick="toggleWishlist(${nameArg}, '')" class="soft-btn flex items-center justify-center gap-2">
                        <i class="fas fa-heart"></i> Wishlist
                    </button>
                    <button type="button" onclick="addToCart(${nameArg}, this)" class="add-btn flex items-center justify-center gap-2">
                        <i class="fas fa-shopping-cart"></i> Add to Cart
                    </button>
                </div>
            </div>
        </article>
    `;
}

function renderPlantGrid(filtered, emptyIcon, emptyMessage) {
    const grid = document.getElementById('plant-grid');
    if (!grid) return;

    if (filtered.length === 0) {
        grid.innerHTML = `
            <div class="col-span-full empty-state">
                <i class="fas ${emptyIcon}"></i>
                <p class="text-lg font-semibold">${escapeHTML(emptyMessage)}</p>
            </div>
        `;
        return;
    }

    grid.innerHTML = filtered.map(renderPlantCard).join('');
}

// Load plants from plants-database.json
async function loadPlantsDatabase() {
    try {
        // Prefer persisted plants state in localStorage when available
        const storedPlants = localStorage.getItem('plants');
        if (storedPlants) {
            try {
                const parsed = JSON.parse(storedPlants);
                if (Array.isArray(parsed) && parsed.length > 0) {
                    plants = parsed;
                    window.plants = plants;
                    window.getPlantByName = getPlantByName;
                    window.IMG_PLACEHOLDER = IMG_PLACEHOLDER;
                    plantsLoaded = true;
                    window.dispatchEvent(new Event('plantsLoaded'));
                    const plantGrid = document.getElementById('plant-grid');
                    if (plantGrid) {
                        filterPlants('all');
                    }
                    return;
                }
            } catch (e) {
                console.warn('Could not parse stored plant state:', e.message);
            }
        }

        // Try multiple paths to handle different page locations
        let response;
        const paths = ['plants-database.json', '../plants-database.json', '/plants-database.json'];
        
        for (let path of paths) {
            try {
                response = await fetch(path);
                if (response.ok) break;
            } catch (e) {
                // Try next path
            }
        }
        
        if (!response || !response.ok) throw new Error('Failed to load database from all paths');
        
        const data = await response.json();
        
        // Transform database format to frontend format
        plants = data.plants.map(plant => ({
            id: plant.id,
            name: plant.name,
            cat: categoryMap[plant.category] || 'other',
            category: plant.category,
            description: plant.short_description,
            image: plant.image,
            images: plant.images || [],
            price: plant.price,
            stock: plant.stock
        }));
        
        // Expose to window for other pages
        window.plants = plants;
        window.getPlantByName = getPlantByName;
        window.IMG_PLACEHOLDER = IMG_PLACEHOLDER;
        
        console.log(`Loaded ${plants.length} plants from database`);
        plantsLoaded = true;
        window.dispatchEvent(new Event('plantsLoaded'));
        
        // Only filter if we're on index.html (check if plant-grid exists)
        const plantGrid = document.getElementById('plant-grid');
        if (plantGrid) {
            filterPlants('all');
        }
    } catch (error) {
        console.error('Error loading plants database:', error);
        plantsLoaded = true;
        window.dispatchEvent(new Event('plantsLoaded'));
        const plantGrid = document.getElementById('plant-grid');
        if (plantGrid) {
            filterPlants('all');
        }
        // Don't alert, just log the error
        console.error('Failed to load plants database:', error.message);
    }
}

// Flag to indicate plants are loaded
let plantsLoaded = false;

window.addEventListener('DOMContentLoaded', () => {
    loadPlantsDatabase();
});

// Promise that resolves when plants are fully loaded
const plantsReadyPromise = new Promise((resolve) => {
    let waitTime = 0;
    const maxWaitTime = 5000; // Wait up to 5 seconds
    
    const checkPlantsLoaded = setInterval(() => {
        waitTime += 50;
        if (plantsLoaded || waitTime >= maxWaitTime) {
            clearInterval(checkPlantsLoaded);
            resolve();
        }
    }, 50); // Check every 50ms instead of 10ms
});

// Expose promise on window so other pages (plant-details) can wait for it
window.plantsReadyPromise = plantsReadyPromise;

// Filter plants by category
function filterPlants(category) {
    const grid = document.getElementById('plant-grid');
    const buttons = document.querySelectorAll('.filter-btn');
    if (!grid) return;

    if (!plantsLoaded && plants.length === 0) {
        grid.innerHTML = `
            <div class="col-span-full loading-state">
                <i class="fas fa-seedling"></i>
                <p>Loading fresh plants...</p>
            </div>
        `;
        return;
    }

    buttons.forEach(btn => btn.classList.remove('active'));
    const categoryBtn = document.getElementById(`btn-${category}`);
    if (categoryBtn) categoryBtn.classList.add('active');

    // Clear search input when clicking category
    const searchInput = document.getElementById('search-input');
    if (searchInput) searchInput.value = '';

    let filtered;

    if (category === 'all') {
        filtered = plants;
    } else if (category === 'seeds') {
        filtered = plants.filter(p => {
            const name = p.name.toLowerCase();
            return p.cat === 'seeds' || p.category.toLowerCase().includes('seed') || seedPlantNames.some(seedName => name.includes(seedName));
        });
    } else if (category === 'baby-plants') {
        filtered = plants.filter(p => {
            const name = p.name.toLowerCase();
            return p.cat === 'baby-plants' || babyPlantKeywords.some(keyword => name.includes(keyword));
        });
    } else {
        filtered = plants.filter(p => p.cat === category);
    }

    renderPlantGrid(filtered, 'fa-leaf', 'No plants found in this category');
}

// Search plants by name
function searchPlants(searchTerm) {
    const grid = document.getElementById('plant-grid');
    if (!grid) return;

    if (searchTerm.trim() === '') {
        filterPlants('all');
        return;
    }

    const lowerSearchTerm = searchTerm.toLowerCase();
    const filtered = plants.filter(p => 
        p.name.toLowerCase().includes(lowerSearchTerm) ||
        p.description.toLowerCase().includes(lowerSearchTerm)
    );

    if (filtered.length === 0) {
        renderPlantGrid(filtered, 'fa-search', 'No plants found matching your search');
        return;
    }

    renderPlantGrid(filtered, 'fa-leaf', 'Plants matching your search');
}

// Get a plant by name
function getPlantByName(plantName) {
    return plants.find(p => p.name === plantName);
}

function savePlantsToLocalStorage() {
    try {
        localStorage.setItem('plants', JSON.stringify(plants));
    } catch (e) {
        console.warn('Could not save plants to localStorage:', e.message);
    }
}

function decrementPlantStock(plantName, quantity = 1) {
    const plant = getPlantByName(plantName);
    if (!plant) return 0;
    plant.stock = Math.max(0, Number(plant.stock || 0) - Number(quantity || 1));
    savePlantsToLocalStorage();
    window.plants = plants;

    const grid = document.getElementById('plant-grid');
    if (grid) {
        const activeButton = document.querySelector('.filter-btn.active');
        const activeCategory = activeButton ? activeButton.id.replace('btn-', '') : 'all';
        filterPlants(activeCategory);
    }
    return plant.stock;
}
window.decrementPlantStock = decrementPlantStock;

// Add item to cart directly from list view (guest-friendly)
function addToCart(plantName) {
    const plant = getPlantByName(plantName);
    if (!plant) return;

    const key = 'nurseryCart';
    const existing = JSON.parse(localStorage.getItem(key) || '[]');
    const match = existing.find(it => it.name === plant.name && it.size === '');
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
    localStorage.setItem(key, JSON.stringify(existing));
    triggerCartFeedback();
    if (typeof updateCartUI === 'function') updateCartUI();
    if (typeof showToast === 'function') showToast('Added to cart');
}

// View plant gallery
function viewGallery(plantName) {
    const plant = getPlantByName(plantName);
    if (!plant) return;
    
    // Get gallery modal
    const modal = document.getElementById('gallery-modal');
    if (!modal) return;
    
    // Set gallery title
    const title = document.getElementById('gallery-title');
    if (title) title.textContent = plant.name;
    
    // Generate image gallery
    const galleryContainer = document.getElementById('gallery-images');
    if (galleryContainer) {
        // Generate 3-5 placeholder images based on the main image
        // In production, you would fetch these from the database
        const images = plant.images || [
            plant.image,
            plant.image,
            plant.image,
            plant.image,
            plant.image
        ];
        
        galleryContainer.innerHTML = '';
        images.forEach((img, idx) => {
            if (img && idx < 5) {
                const imgDiv = document.createElement('div');
                imgDiv.className = 'gallery-item';
                imgDiv.innerHTML = `
                    <div class="border-2 border-gray-200 rounded-lg overflow-hidden">
                        <img src="${img}" alt="${plant.name} - Image ${idx + 1}" onerror="this.onerror=null;this.src=IMG_PLACEHOLDER" class="w-full h-full object-contain object-center">
                    </div>
                `;
                galleryContainer.appendChild(imgDiv);
            }
        });
    }
    
    // Show modal
    modal.classList.add('active');
}
// Close gallery modal
function closeGalleryModal() {
    const modal = document.getElementById('gallery-modal');
    if (modal) {
        modal.classList.remove('active');
    }
}

// Close gallery modal when clicking outside
document.addEventListener('DOMContentLoaded', () => {
    const galleryModal = document.getElementById('gallery-modal');
    if (galleryModal) {
        galleryModal.addEventListener('click', (e) => {
            if (e.target === galleryModal) {
                closeGalleryModal();
            }
        });
    }
});
