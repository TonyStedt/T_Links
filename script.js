// State
let links = JSON.parse(localStorage.getItem('linker_links')) || [];
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
function init() {
    renderIconSelector();
    updateView();
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

// Save to LocalStorage
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
linkForm.addEventListener('submit', (e) => {
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
        // Update
        const index = links.findIndex(l => l.id === editingId);
        if (index !== -1) {
            links[index] = newLink;
        }
    } else {
        // Add
        links.push(newLink);
        currentFilter = 'All'; // Reset filter when adding new item
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
window.deleteLink = (id) => {
    if (confirm('Are you sure you want to delete this link?')) {
        links = links.filter(l => l.id !== id);
        updateView();
    }
};

// Event Listeners
addBtn.addEventListener('click', () => openModal(false));
closeModalBtn.addEventListener('click', closeModal);
cancelBtn.addEventListener('click', closeModal);

// Close modal on outside click
modalOverlay.addEventListener('click', (e) => {
    if (e.target === modalOverlay) closeModal();
});

// Run Init
init();
