// State
let links = [];
let currentFilter = 'All';
let editingId = null;

// Available Icons for the selector
const availableIcons = [
    'link', 'github', 'youtube', 'twitter', 'facebook', 'linkedin', 
    'instagram', 'dribbble', 'figma', 'codepen', 'trello', 'slack', 
    'mail', 'book', 'video', 'image', 'code', 'database', 'cloud', 
    'smartphone', 'monitor', 'cpu', 'headphones', 'music', 'star',
    'heart', 'briefcase', 'coffee', 'pen-tool', 'camera', 'globe'
];

// DOM Elements
const linksGrid = document.getElementById('linksGrid');
const categoryFilters = document.getElementById('categoryFilters');
const addBtn = document.getElementById('addBtn');
const exportBtn = document.getElementById('exportBtn');
const importBtn = document.getElementById('importBtn');
const importFile = document.getElementById('importFile');
const modalOverlay = document.getElementById('modalOverlay');
const closeModalBtn = document.getElementById('closeModalBtn');
const cancelBtn = document.getElementById('cancelBtn');
const linkForm = document.getElementById('linkForm');
const iconSelector = document.getElementById('iconSelector');
const modalTitle = document.getElementById('modalTitle');

// Form inputs
const linkIdInput = document.getElementById('linkId');
const linkNameInput = document.getElementById('linkName');
const linkUrlInput = document.getElementById('linkUrl');
const linkDescInput = document.getElementById('linkDesc');
const linkCategoryInput = document.getElementById('linkCategory');
const linkIconInput = document.getElementById('linkIcon');

// Initialize App
async function init() {
    renderIconSelector();
    await fetchLinks();
    updateView();
}

async function fetchLinks() {
    try {
        const response = await fetch('/api/links');
        if (response.ok) {
            links = await response.json();
            saveData(); // Save backup
        } else {
            console.error('API Error, falling back to local storage.');
            links = JSON.parse(localStorage.getItem('linker_links')) || [];
        }
    } catch (e) {
        console.error('Fetch error, falling back to local storage.', e);
        links = JSON.parse(localStorage.getItem('linker_links')) || [];
    }
}

// Render Icon Selector in Modal
function renderIconSelector() {
    iconSelector.innerHTML = availableIcons.map(icon => `
        <div class="icon-option" data-icon="${icon}" title="${icon}">
            <i data-feather="${icon}"></i>
        </div>
    `).join('');
    
    // Default selection
    if (!linkIconInput.value) {
        selectIcon('link');
    }

    // Add click events to icons
    document.querySelectorAll('.icon-option').forEach(el => {
        el.addEventListener('click', () => selectIcon(el.dataset.icon));
    });
}

function selectIcon(iconName) {
    document.querySelectorAll('.icon-option').forEach(el => {
        el.classList.remove('selected');
        if (el.dataset.icon === iconName) {
            el.classList.add('selected');
        }
    });
    linkIconInput.value = iconName;
}

// Update View (Categories and Links)
function updateView() {
    renderFilters();
    renderLinks();
    feather.replace(); // Refresh icons
    saveData();
}

// Render Category Filters
function renderFilters() {
    const categories = ['All', ...new Set(links.map(link => link.category))];
    
    // Ensure currentFilter exists, if not reset to 'All'
    if (!categories.includes(currentFilter)) {
        currentFilter = 'All';
    }

    categoryFilters.innerHTML = categories.map(cat => `
        <button class="filter-btn ${cat === currentFilter ? 'active' : ''}" data-category="${cat}">
            ${cat}
        </button>
    `).join('');

    // Add filter click events
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            currentFilter = e.target.dataset.category;
            updateView();
        });
    });
}

// Render Links Grid
function renderLinks() {
    const filteredLinks = currentFilter === 'All' 
        ? links 
        : links.filter(link => link.category === currentFilter);

    if (filteredLinks.length === 0) {
        linksGrid.innerHTML = `
            <div class="empty-state">
                <i data-feather="inbox"></i>
                <p>No links found. Add your first URL to get started!</p>
            </div>
        `;
        return;
    }

    linksGrid.innerHTML = filteredLinks.map(link => `
        <a href="${link.url}" target="_blank" rel="noopener noreferrer" class="card">
            <div class="card-header">
                <div class="card-icon">
                    <i data-feather="${link.icon}"></i>
                </div>
                <div class="card-actions" onclick="event.preventDefault()">
                    <button class="action-btn edit-btn" onclick="editLink('${link.id}')" title="Edit">
                        <i data-feather="edit-2"></i>
                    </button>
                    <button class="action-btn delete-btn" onclick="deleteLink('${link.id}')" title="Delete">
                        <i data-feather="trash-2"></i>
                    </button>
                </div>
            </div>
            
            <div class="card-content">
                <h3 class="card-title">${link.name}</h3>
                ${link.description ? `<p class="card-desc">${link.description}</p>` : ''}
            </div>
            
            <div class="card-footer">
                <span class="card-category">${link.category}</span>
                <i data-feather="external-link" class="card-link-icon"></i>
            </div>
        </a>
    `).join('');
}

// Save backup to LocalStorage
function saveData() {
    localStorage.setItem('linker_links', JSON.stringify(links));
}

// Modal Handling
function openModal(isEdit = false) {
    modalOverlay.classList.add('active');
    modalTitle.textContent = isEdit ? 'Edit URL' : 'Add New URL';
    if (!isEdit) {
        linkForm.reset();
        linkIdInput.value = '';
        selectIcon('link');
    }
    feather.replace();
}

function closeModal() {
    modalOverlay.classList.remove('active');
    setTimeout(() => {
        linkForm.reset();
        editingId = null;
    }, 300);
}

// Form Submission (Add / Edit)
linkForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const newLink = {
        id: linkIdInput.value || Date.now().toString(),
        name: linkNameInput.value.trim(),
        url: linkUrlInput.value.trim(),
        description: linkDescInput.value.trim(),
        category: linkCategoryInput.value.trim(),
        icon: linkIconInput.value
    };
    
    // Ensure URL has http/https
    if (!newLink.url.match(/^https?:\/\//i)) {
        newLink.url = 'https://' + newLink.url;
    }

    if (editingId) {
        // Update API
        try {
            await fetch(`/api/links/${editingId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newLink)
            });
            const index = links.findIndex(l => l.id === editingId);
            if (index !== -1) {
                links[index] = newLink;
            }
        } catch (err) { console.error('Error updating link', err); }
    } else {
        // Add API
        try {
            await fetch('/api/links', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newLink)
            });
            links.push(newLink);
            currentFilter = 'All'; // Reset filter when adding new item
        } catch (err) { console.error('Error adding link', err); }
    }

    closeModal();
    updateView();
});

// Edit Link
window.editLink = (id) => {
    const link = links.find(l => l.id === id);
    if (!link) return;
    
    editingId = id;
    linkIdInput.value = link.id;
    linkNameInput.value = link.name;
    linkUrlInput.value = link.url;
    linkDescInput.value = link.description || '';
    linkCategoryInput.value = link.category;
    selectIcon(link.icon);
    
    openModal(true);
};

// Delete Link
window.deleteLink = async (id) => {
    if (confirm('Are you sure you want to delete this link?')) {
        try {
            await fetch(`/api/links/${id}`, { method: 'DELETE' });
            links = links.filter(l => l.id !== id);
            updateView();
        } catch (err) { console.error('Error deleting link', err); }
    }
};

// Event Listeners
addBtn.addEventListener('click', () => openModal(false));
closeModalBtn.addEventListener('click', closeModal);
cancelBtn.addEventListener('click', closeModal);

// Export Data
exportBtn.addEventListener('click', () => {
    const dataStr = JSON.stringify(links, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'synapsis_links.json';
    a.click();
    URL.revokeObjectURL(url);
});

// Import Data
importBtn.addEventListener('click', () => {
    importFile.click();
});

importFile.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = async (event) => {
        try {
            const parsedData = JSON.parse(event.target.result);
            if (Array.isArray(parsedData)) {
                const replace = confirm('Do you want to replace existing links with the imported data? Click OK to replace, or Cancel to merge them.');
                try {
                    await fetch('/api/links/bulk', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ replace: replace, links: parsedData })
                    });
                    await fetchLinks(); // Reload from database
                    updateView();
                } catch(err) {
                    console.error('API Error during bulk import', err);
                }
            } else {
                alert('Invalid file format. Please upload a valid JSON file containing an array of links.');
            }
        } catch (error) {
            alert('Error parsing JSON file.');
        }
    };
    reader.readAsText(file);
    importFile.value = ''; // Reset input
});

// Close modal on outside click
modalOverlay.addEventListener('click', (e) => {
    if (e.target === modalOverlay) closeModal();
});

// Run Init
init();
