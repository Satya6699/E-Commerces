// Sri Lavanya Nursery - Homepage Interactive Features

// ===== FEATURED/BEST SELLERS CAROUSEL =====
function populateFeaturedCarousel() {
    const carousel = document.getElementById('featured-carousel');
    if (!carousel) return;
    
    // Get all plants from the global plants array (loaded by plants.js)
    let plants = window.plants || [];
    
    // If no plants loaded yet, try localStorage
    if (plants.length === 0 && localStorage.getItem('plants')) {
        plants = JSON.parse(localStorage.getItem('plants'));
    }
    
    if (plants.length === 0) {
        carousel.innerHTML = '<p class="col-span-full text-center text-gray-500 py-8">Loading featured plants...</p>';
        return;
    }
    
    // Get top 4-6 plants (select variety of categories)
    const featured = [];
    const categories = ['indoor', 'flowering', 'outdoor', 'fruits'];
    
    // Try to get one plant from each category, then fill remaining with any plants
    for (let cat of categories) {
        const plant = plants.find(p => p.cat === cat && !featured.includes(p));
        if (plant && featured.length < 6) {
            featured.push(plant);
        }
    }
    
    // Fill remaining slots with any plants
    while (featured.length < 6 && featured.length < plants.length) {
        for (let plant of plants) {
            if (!featured.includes(plant)) {
                featured.push(plant);
                if (featured.length >= 6) break;
            }
        }
    }
    
    if (featured.length === 0) {
        carousel.innerHTML = '<p class="col-span-full text-center text-gray-500 py-8">No plants available</p>';
        return;
    }
    
    carousel.innerHTML = featured.map(plant => `
        <div class="featured-plant-card relative">
            <span class="badge">Popular</span>
            <img src="${plant.image}" alt="${plant.name}" class="w-full" onerror="this.src='data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%22400%22 height=%22300%22><rect width=%22100%25%22 height=%22100%25%22 fill=%22%23e5e7eb%22/></svg>'">
            <div class="content">
                <div>
                    <h4>${plant.name}</h4>
                    <p>${plant.description || 'Quality plant from our nursery'}</p>
                </div>
                <button type="button" class="action" onclick="addToCart('${plant.name.replace(/'/g, "\\'")}')">
                    <i class="fas fa-shopping-cart mr-1"></i> Add to Cart
                </button>
            </div>
        </div>
    `).join('');
}

// ===== FAQ ACCORDION =====
function toggleFAQ(button) {
    const content = button.nextElementSibling;
    const icon = button.querySelector('i');
    
    // Close all other FAQs
    document.querySelectorAll('[onclick*="toggleFAQ"]').forEach(btn => {
        if (btn !== button) {
            btn.classList.remove('active');
            btn.nextElementSibling.classList.add('hidden');
            btn.querySelector('i').style.transform = 'rotate(0deg)';
        }
    });
    
    // Toggle current FAQ
    button.classList.toggle('active');
    content.classList.toggle('hidden');
    icon.style.transform = button.classList.contains('active') ? 'rotate(180deg)' : 'rotate(0deg)';
}

// ===== NEWSLETTER SIGNUP =====
function handleNewsletterSignup(event) {
    event.preventDefault();
    const form = event.target;
    const email = form.querySelector('input[type="email"]').value;
    
    if (!email) return;
    
    // Store newsletter signup (in real app, would send to backend)
    let subscribers = JSON.parse(localStorage.getItem('newsletter_subscribers') || '[]');
    if (!subscribers.includes(email)) {
        subscribers.push(email);
        localStorage.setItem('newsletter_subscribers', JSON.stringify(subscribers));
    }
    
    // Show success message
    const button = form.querySelector('button');
    const originalText = button.textContent;
    button.textContent = '✓ Subscribed!';
    button.disabled = true;
    form.querySelector('input').value = '';
    
    // Reset after 3 seconds
    setTimeout(() => {
        button.textContent = originalText;
        button.disabled = false;
    }, 3000);
}

// ===== PLANT FINDER QUIZ =====
const quizData = {
    questions: [
        {
            id: 1,
            question: "How much light does your space get?",
            options: [
                { text: "Low light (indirect/shade)", key: "low-light" },
                { text: "Medium light (some sun)", key: "medium-light" },
                { text: "Bright light (lots of sun)", key: "bright-light" }
            ]
        },
        {
            id: 2,
            question: "How often can you water your plant?",
            options: [
                { text: "Frequently (I like to fuss)", key: "frequent" },
                { text: "Regularly (weekly or so)", key: "regular" },
                { text: "Rarely (I forget sometimes)", key: "rare" }
            ]
        },
        {
            id: 3,
            question: "What's your plant experience level?",
            options: [
                { text: "Beginner", key: "beginner" },
                { text: "Intermediate", key: "intermediate" },
                { text: "Expert", key: "expert" }
            ]
        }
    ],
    recommendations: {
        "low-light-frequent-beginner": { plant: "Pothos", reason: "Tolerates low light, forgiving if overwatered, and nearly impossible to kill!" },
        "low-light-regular-beginner": { plant: "Snake Plant", reason: "Thrives in low light, needs minimal watering, and is extremely durable." },
        "low-light-rare-beginner": { plant: "ZZ Plant", reason: "Perfect for neglect, grows in low light, and rarely needs water." },
        "medium-light-frequent-beginner": { plant: "Peace Lily", reason: "Tolerates medium light, likes consistent moisture, and flowers indoors." },
        "medium-light-regular-beginner": { plant: "Spider Plant", reason: "Easy to care for, adapts to various light, and produces cute babies." },
        "medium-light-rare-beginner": { plant: "Dracaena", reason: "Low maintenance, medium light lover, and comes in many varieties." },
        "bright-light-frequent-beginner": { plant: "Bougainvillea", reason: "Loves sunlight and regular watering, produces vibrant flowers." },
        "bright-light-regular-beginner": { plant: "Jasmine", reason: "Sunny spot lover, regular watering, fragrant flowers." },
        "bright-light-rare-beginner": { plant: "Succulents", reason: "Love bright light, need minimal water, very low maintenance." },
        // Intermediate and Expert recommendations (simplified)
        "low-light-frequent-intermediate": { plant: "Anthurium", reason: "Beautiful flowers, tolerates lower light, likes consistent moisture." },
        "medium-light-regular-intermediate": { plant: "Fern", reason: "Classic indoor plant, medium light, regular misting needed." },
        "bright-light-frequent-intermediate": { plant: "Roses", reason: "Need sunlight and regular care, reward you with beautiful blooms." },
        "bright-light-rare-expert": { plant: "Bonsai", reason: "For the dedicated plant parent who loves a challenge!" }
    }
};

let currentQuizQuestion = 0;
let quizAnswers = {};

function startPlantQuiz() {
    currentQuizQuestion = 0;
    quizAnswers = {};
    showQuizQuestion();
    const modal = document.getElementById('quiz-modal');
    if (modal) {
        modal.classList.add('active');
        modal.style.display = 'flex';
    }
}

function showQuizQuestion() {
    const content = document.getElementById('quiz-content');
    if (!content) return;
    
    if (currentQuizQuestion >= quizData.questions.length) {
        showQuizResult();
        return;
    }
    
    const question = quizData.questions[currentQuizQuestion];
    const progress = ((currentQuizQuestion + 1) / quizData.questions.length) * 100;
    
    content.innerHTML = `
        <div class="mb-4">
            <div class="h-2 bg-gray-200 rounded-full overflow-hidden">
                <div class="h-full bg-green-600 transition-all duration-300" style="width: ${progress}%"></div>
            </div>
            <p class="text-xs text-gray-500 mt-2">Question ${currentQuizQuestion + 1} of ${quizData.questions.length}</p>
        </div>
        <div class="quiz-question">
            <h3 class="text-lg font-semibold text-gray-800 mb-4">${question.question}</h3>
            <div class="quiz-options">
                ${question.options.map((option, idx) => `
                    <button type="button" class="quiz-option" onclick="selectQuizOption('${option.key}', ${idx})">
                        ${option.text}
                    </button>
                `).join('')}
            </div>
        </div>
    `;
}

function selectQuizOption(optionKey, index) {
    const question = quizData.questions[currentQuizQuestion];
    quizAnswers[currentQuizQuestion] = optionKey;
    
    // Highlight selected option
    const options = document.querySelectorAll('.quiz-option');
    options.forEach((opt, idx) => {
        if (idx === index) {
            opt.classList.add('selected');
        } else {
            opt.classList.remove('selected');
        }
    });
    
    // Move to next question after 300ms
    setTimeout(() => {
        currentQuizQuestion++;
        showQuizQuestion();
    }, 300);
}

function showQuizResult() {
    const content = document.getElementById('quiz-content');
    if (!content) return;
    
    // Build recommendation key from answers
    const answerKey = Object.values(quizAnswers).join('-');
    let recommendation = quizData.recommendations[answerKey] || quizData.recommendations["medium-light-regular-beginner"];
    
    // If exact match not found, try partial matches
    if (!quizData.recommendations[answerKey]) {
        // Try with first two answers
        const partialKey = [quizAnswers[0], quizAnswers[1], "beginner"].join('-');
        recommendation = quizData.recommendations[partialKey] || recommendation;
    }
    
    content.innerHTML = `
        <div class="quiz-result">
            <i class="fas fa-check-circle text-3xl text-green-600 mb-3 block"></i>
            <h3>Your Perfect Plant Match:</h3>
            <p class="text-2xl font-bold text-green-700 mb-3">${recommendation.plant}</p>
            <p class="text-gray-700 mb-4">${recommendation.reason}</p>
            <button type="button" onclick="goToPlantDetails('${recommendation.plant}')">
                <i class="fas fa-shopping-cart mr-2"></i> Buy ${recommendation.plant}
            </button>
            <button type="button" onclick="closeModal('quiz-modal')" style="background: #e5e7eb; color: #374151; margin-left: 0.5rem; padding: 0.6rem 1.5rem; border-radius: 0.5rem; font-weight: 600; border: none; cursor: pointer;">
                Continue Shopping
            </button>
        </div>
    `;
}

function goToPlantDetails(plantName) {
    if (!plantName) return;
    window.location.href = `plant-details.html?plant=${encodeURIComponent(plantName)}`;
}

function addQuizPlantAndClose(plantName) {
    // Redirect to plant details page and close modal
    closeModal('quiz-modal');
    goToPlantDetails(plantName);
}

function findAndAddQuizPlant(plantName) {
    // The addToCart function from cart.js handles finding the plant by name
    addToCart(plantName);
}

function addToCartByName(plantName) {
    // Simple wrapper for adding plants from featured carousel
    addToCart(plantName);
}

// ===== MODAL HELPERS =====
function showModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.add('active');
        modal.style.display = 'flex';
    }
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('active');
        modal.style.display = 'none';
    }
}

// Close modals when clicking outside
document.addEventListener('click', function(event) {
    if (event.target.classList.contains('care-guide-modal') || event.target.id === 'quiz-modal') {
        if (event.target === event.currentTarget) {
            event.target.classList.remove('active');
            event.target.style.display = 'none';
        }
    }
});

// Initialize featured carousel when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    // Wait for plants to load from plants.js
    setTimeout(populateFeaturedCarousel, 500);
});

// Re-populate featured carousel if plants load later
window.addEventListener('plantsLoaded', function() {
    populateFeaturedCarousel();
});
