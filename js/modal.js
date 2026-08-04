// Sri Lavanya Nursery - Product Details Modal

let modalSelectedPlant = null;

// Care information by category and plant
const careByCategoryIndex = {
    indoor: { sunlight: 'Bright, indirect light', watering: 'Water sparingly — allow top 2 inches of soil to dry between waterings', soil: 'Well-draining potting mix', humidity: 'Moderate', tips: ['Avoid direct harsh sunlight.', 'Rotate pot every few weeks.'] },
    outdoor: { sunlight: 'Full sun to partial shade', watering: 'Water deeply but less frequently', soil: 'Loamy, well-draining soil', humidity: 'Varies', tips: ['Protect young plants from extreme sun.'] },
    flowering: { sunlight: 'Bright light; several hours of sun', watering: 'Keep soil consistently moist while flowering', soil: 'Fertile, well-draining soil', humidity: 'Moderate', tips: ['Deadhead spent flowers.'] },
    fruits: { sunlight: 'Full sun (6+ hours)', watering: 'Regular deep watering; adjust for rainfall', soil: 'Deep, fertile, well-draining soil', humidity: 'Moderate', tips: ['Protect from late frosts; fertilize seasonally.'] },
    decoration: { sunlight: 'Varies — bright indirect preferred', watering: 'Light to moderate; allow slight drying', soil: 'Well-draining potting mix', humidity: 'Moderate', tips: ['Wipe leaves occasionally.'] }
};

const careByPlantIndex = {
    'Snake Plant': { sunlight: 'Low to bright indirect light', watering: 'Very infrequent — once every 2-4 weeks', soil: 'Sandy, well-draining mix', humidity: 'Low to moderate', tips: ['Tolerates neglect; avoid overwatering.'] },
    'Aloe Vera': { sunlight: 'Bright indirect to some direct sun', watering: 'Allow soil to dry completely between waterings; infrequent', soil: 'Cactus/succulent well-draining mix', humidity: 'Low', tips: ['Avoid cold temperatures.'] },
    'Spider Plant': { sunlight: 'Bright indirect light', watering: 'Water when top inch of soil dries', soil: 'Well-draining potting mix', humidity: 'Moderate', tips: ['Great for hanging baskets.'] }
};

// Show details modal
function showDetailsModal(name, image, category) {
    modalSelectedPlant = { name, image, category };
    document.getElementById('modal-plant-name').textContent = name;
    document.getElementById('modal-plant-cat').textContent = category;
    document.getElementById('modal-plant-image').src = image;

    const care = careByPlantIndex[name] || careByCategoryIndex[category] || {};
    const sunlight = care.sunlight || 'Moderate light';
    const watering = care.watering || 'Water as needed; avoid waterlogging';
    const soil = care.soil || 'Well-draining soil';
    const humidity = care.humidity || 'Moderate';
    const tips = care.tips || [];

    let html = `<p><strong>Sunlight:</strong> ${sunlight}</p>`;
    html += `<p><strong>Watering:</strong> ${watering}</p>`;
    html += `<p><strong>Soil:</strong> ${soil}</p>`;
    html += `<p><strong>Humidity:</strong> ${humidity}</p>`;
    if (tips.length) {
        html += '<div class="mt-2"><strong>Tips:</strong><ul class="list-disc ml-5">';
        tips.forEach(t => html += `<li>${t}</li>`);
        html += '</ul></div>';
    }

    document.getElementById('modal-care-content').innerHTML = html;
    document.getElementById('modal-more-link').href = `plant-details.html?plant=${encodeURIComponent(name)}`;
    document.getElementById('detail-modal').classList.remove('hidden');
    document.getElementById('detail-modal').classList.add('flex');
}

// Close details modal
function closeDetailsModal() {
    document.getElementById('detail-modal').classList.add('hidden');
    document.getElementById('detail-modal').classList.remove('flex');
    modalSelectedPlant = null;
}

// Add to cart from modal
function addFromModalToCart() {
    if (!modalSelectedPlant) return;
    // Go to plant-details page for full selection (size/variety)
    window.location.href = `plant-details.html?plant=${encodeURIComponent(modalSelectedPlant.name)}`;
}

// Close modal when clicking outside
document.addEventListener('DOMContentLoaded', () => {
    const modal = document.getElementById('detail-modal');
    if (modal) {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                closeDetailsModal();
            }
        });
    }
});
