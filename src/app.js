// Configuration
const API_BASE_URL = 'https://thingsapi.azure1.dev/api/Things';
const POLL_INTERVAL = 60000; // 60 seconds
const UK_CENTER = [54.5, -3.5]; // Approximate center of UK
const UK_ZOOM = 6;

// State
let map = null;
let markers = {};
let alarms = [];
let pollTimer = null;
let selectedAlarmId = null;

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    initMap();
    setupEventListeners();
    loadAlarms();
    startPolling();
});

// Initialize Leaflet map
function initMap() {
    map = L.map('map').setView(UK_CENTER, UK_ZOOM);
    
    // Add OpenStreetMap tiles
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 18,
    }).addTo(map);
}

// Setup event listeners
function setupEventListeners() {
    // Add Alarm button
    document.getElementById('add-alarm-btn').addEventListener('click', openAddAlarmModal);
    
    // Refresh button
    document.getElementById('refresh-btn').addEventListener('click', () => {
        loadAlarms();
    });
    
    // Add Alarm form
    document.getElementById('add-alarm-form').addEventListener('submit', handleAddAlarm);
    
    // Modal close buttons
    document.querySelectorAll('.close').forEach(closeBtn => {
        closeBtn.addEventListener('click', closeModals);
    });
    
    // Cancel buttons
    document.querySelectorAll('.cancel-btn').forEach(cancelBtn => {
        cancelBtn.addEventListener('click', closeModals);
    });
    
    // Delete confirmation
    document.getElementById('confirm-delete-btn').addEventListener('click', handleDeleteAlarm);
    
    // Close modal when clicking outside
    window.addEventListener('click', function(event) {
        if (event.target.classList.contains('modal')) {
            closeModals();
        }
    });
}

// Load alarms from API
async function loadAlarms() {
    try {
        const response = await fetch(API_BASE_URL);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        alarms = data;
        
        updateMap();
        updateStats();
        updateLastUpdateTime();
        
    } catch (error) {
        console.error('Error loading alarms:', error);
        showError('Failed to load alarms. Please try again.');
    }
}

// Update map with current alarms
function updateMap() {
    // Remove markers that no longer exist
    Object.keys(markers).forEach(id => {
        if (!alarms.find(alarm => alarm.thingid === parseInt(id))) {
            map.removeLayer(markers[id]);
            delete markers[id];
        }
    });
    
    // Add or update markers
    alarms.forEach(alarm => {
        if (alarm.latitude && alarm.longitude) {
            if (markers[alarm.thingid]) {
                // Update existing marker
                const marker = markers[alarm.thingid];
                marker.setLatLng([alarm.latitude, alarm.longitude]);
                marker.getPopup().setContent(createPopupContent(alarm));
            } else {
                // Create new marker
                const marker = createMarker(alarm);
                markers[alarm.thingid] = marker;
            }
        }
    });
}

// Create a marker for an alarm
function createMarker(alarm) {
    const icon = createIcon(alarm.status);
    
    const marker = L.marker([alarm.latitude, alarm.longitude], { icon })
        .addTo(map)
        .bindPopup(createPopupContent(alarm));
    
    return marker;
}

// Create custom icon based on status
function createIcon(status) {
    let iconColor = 'blue'; // default
    
    if (status === 'green') {
        iconColor = 'green';
    } else if (status === 'amber') {
        iconColor = 'orange';
    } else if (status === 'red') {
        iconColor = 'red';
    }
    
    return L.divIcon({
        className: 'custom-marker',
        html: `<div style="
            background-color: ${iconColor};
            width: 25px;
            height: 25px;
            border-radius: 50% 50% 50% 0;
            transform: rotate(-45deg);
            border: 2px solid white;
            box-shadow: 0 2px 5px rgba(0,0,0,0.3);
        "></div>`,
        iconSize: [25, 25],
        iconAnchor: [12, 25],
        popupAnchor: [0, -25]
    });
}

// Create popup content for a marker
function createPopupContent(alarm) {
    const statusClass = alarm.status || 'unknown';
    const text = alarm.text || 'No description available';
    const safeName = escapeHtml(alarm.name || 'Unnamed Alarm');
    const safeNameForJs = safeName.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
    
    // Safely format coordinates with null checks
    const lat = alarm.latitude != null ? alarm.latitude.toFixed(6) : 'N/A';
    const lng = alarm.longitude != null ? alarm.longitude.toFixed(6) : 'N/A';
    
    // Validate image URL (only allow http/https)
    const safeImageUrl = alarm.image && isValidImageUrl(alarm.image) ? escapeHtml(alarm.image) : '';
    
    return `
        <div class="popup-content">
            <h3>${safeName}</h3>
            <p><strong>Status:</strong> <span class="popup-status ${statusClass}">${statusClass}</span></p>
            <p><strong>Location:</strong> ${lat}, ${lng}</p>
            ${text ? `<p><strong>Description:</strong> ${escapeHtml(text)}</p>` : ''}
            ${safeImageUrl ? `<p><img src="${safeImageUrl}" alt="Alarm image" style="max-width: 100%; margin-top: 0.5rem; border-radius: 4px;"></p>` : ''}
            <div class="popup-actions">
                <button class="btn btn-danger" onclick="openDeleteModal(${alarm.thingid}, '${safeNameForJs}')">Delete</button>
            </div>
        </div>
    `;
}

// Validate image URL to prevent XSS
function isValidImageUrl(url) {
    if (!url || typeof url !== 'string') return false;
    try {
        const parsedUrl = new URL(url);
        // Only allow http and https protocols
        return parsedUrl.protocol === 'http:' || parsedUrl.protocol === 'https:';
    } catch (e) {
        return false;
    }
}

// Open Add Alarm modal
function openAddAlarmModal() {
    document.getElementById('add-alarm-modal').style.display = 'block';
    
    // Set default location to UK center with click on map option
    document.getElementById('alarm-latitude').value = UK_CENTER[0];
    document.getElementById('alarm-longitude').value = UK_CENTER[1];
}

// Handle Add Alarm form submission
async function handleAddAlarm(event) {
    event.preventDefault();
    
    const formData = new FormData(event.target);
    const alarm = {
        name: formData.get('name'),
        latitude: parseFloat(formData.get('latitude')),
        longitude: parseFloat(formData.get('longitude')),
        text: formData.get('text') || '',
        status: formData.get('status'),
        image: '',
        data: ''
    };
    
    try {
        const response = await fetch(API_BASE_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(alarm)
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        closeModals();
        event.target.reset();
        
        // Reload alarms to get the new one
        setTimeout(() => loadAlarms(), 500);
        
        showSuccess('Alarm added successfully!');
        
    } catch (error) {
        console.error('Error adding alarm:', error);
        showError('Failed to add alarm. Please try again.');
    }
}

// Open Delete Confirmation modal
function openDeleteModal(alarmId, alarmName) {
    selectedAlarmId = alarmId;
    document.getElementById('delete-alarm-name').textContent = alarmName;
    document.getElementById('delete-modal').style.display = 'block';
}

// Handle Delete Alarm
async function handleDeleteAlarm() {
    if (!selectedAlarmId) return;
    
    try {
        const response = await fetch(`${API_BASE_URL}/${selectedAlarmId}`, {
            method: 'DELETE'
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        closeModals();
        selectedAlarmId = null;
        
        // Reload alarms to refresh the map
        setTimeout(() => loadAlarms(), 500);
        
        showSuccess('Alarm deleted successfully!');
        
    } catch (error) {
        console.error('Error deleting alarm:', error);
        showError('Failed to delete alarm. Please try again.');
    }
}

// Close all modals
function closeModals() {
    document.querySelectorAll('.modal').forEach(modal => {
        modal.style.display = 'none';
    });
}

// Update statistics
function updateStats() {
    const alarmCount = alarms.length;
    const greenCount = alarms.filter(a => a.status === 'green').length;
    const amberCount = alarms.filter(a => a.status === 'amber').length;
    const redCount = alarms.filter(a => a.status === 'red').length;
    
    document.getElementById('alarm-count').textContent = 
        `Total: ${alarmCount} (🟢 ${greenCount} | 🟠 ${amberCount} | 🔴 ${redCount})`;
}

// Update last update time
function updateLastUpdateTime() {
    const now = new Date();
    const timeString = now.toLocaleTimeString();
    document.getElementById('last-update').textContent = `Last updated: ${timeString}`;
}

// Start polling for updates
function startPolling() {
    if (pollTimer) {
        clearInterval(pollTimer);
    }
    
    pollTimer = setInterval(() => {
        loadAlarms();
    }, POLL_INTERVAL);
}

// Utility function to escape HTML
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Show success message
function showSuccess(message) {
    // Simple alert for now - could be enhanced with a toast notification
    console.log('Success:', message);
    alert(message);
}

// Show error message
function showError(message) {
    // Simple alert for now - could be enhanced with a toast notification
    console.error('Error:', message);
    alert(message);
}

// Make functions available globally for inline onclick handlers
window.openDeleteModal = openDeleteModal;
