const options = {
    roles: ["AI", "ML", "NLP", "Data", "Computer Vision",
    "Software", "AI/ML", "Machine Learning", "Scientist",
    "GenAI", "Generative", "SDE", "SWE", "Perception"],

    excludeRoles: ["intern", "senior", "manager", "staff", "sr."],

    excludeCompanies: ["Boeing"],

    excludeTerms: ["3+", "4+", "5+", "6+", "Full Stack"],

    includeTerms: ["hiring", "hire", "job"],

    sites: ["boards.greenhouse.io",
    "myworkdayjobs.com/en-US",
    "jobs.lever.com",
    "jobs.ashbyhq.com",
    "jobs.apple.com",
    "amazon.jobs/en",
    "careers.microsoft.com",
    "x.com",
    "angel.co",
    "linkedin.com",
    "indeed.com",
    "monster.com",
    "glassdoor.com",
    ]
};

// Track custom options separately
let customOptions = {};

// Category display names
const categoryNames = {
    roles: 'Roles',
    excludeRoles: 'Exclude Roles',
    excludeCompanies: 'Exclude Companies',
    excludeTerms: 'Exclude Terms',
    includeTerms: 'Include Terms',
    sites: 'Sites'
};

function createFormOptions() {
    const form = document.getElementById('searchForm');
    const actionButtons = document.querySelector('.job-search-actions');

    Object.keys(options).forEach(category => {
        let fieldset = document.getElementById(`fieldset-${category}`);
        if (!fieldset) {
            fieldset = document.createElement('fieldset');
            fieldset.id = `fieldset-${category}`;
            fieldset.className = 'job-fieldset';

            // Create collapsible header
            const header = document.createElement('div');
            header.className = 'fieldset-header';
            header.onclick = () => toggleFieldset(category);

            const headerLeft = document.createElement('div');
            headerLeft.className = 'fieldset-header-left';

            const legend = document.createElement('legend');
            legend.textContent = categoryNames[category] || category;

            headerLeft.appendChild(legend);

            const chevron = document.createElement('span');
            chevron.className = 'fieldset-chevron';
            chevron.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"></polyline></svg>';

            header.appendChild(headerLeft);
            header.appendChild(chevron);
            fieldset.appendChild(header);

            // Create content container
            const content = document.createElement('div');
            content.className = 'fieldset-content';
            content.id = `content-${category}`;
            fieldset.appendChild(content);

            form.insertBefore(fieldset, actionButtons);
        } else {
            // Clear existing content
            const content = document.getElementById(`content-${category}`);
            if (content) {
                content.innerHTML = '';
            }
        }

        const content = document.getElementById(`content-${category}`);

        // Add master checkbox
        addMasterCheckbox(content, category);

        // Add options
        options[category].forEach(value => {
            const isCustom = customOptions[category]?.includes(value);
            addOptionToFieldset(content, category, value, isCustom);
        });

        // Set default checked states
        if (['roles', 'excludeRoles', 'excludeTerms'].includes(category)) {
            Array.from(document.querySelectorAll(`input[name="${category}"]`)).forEach(input => input.checked = true);
        }
        if (category === 'sites') {
            Array.from(document.querySelectorAll(`input[name="${category}"]`)).slice(0, 3).forEach(input => input.checked = true);
        }

        updateSelectionCount(category);
    });
}

function addOptionToFieldset(container, category, value, isCustom = false) {
    const div = document.createElement('div');
    div.className = 'option-tag' + (isCustom ? ' custom-option' : '');
    const id = `${category}-${value.replace(/\W+/g, '').toLowerCase()}`;

    div.innerHTML = `
        <input type="checkbox" id="${id}" name="${category}" value="${value}" onchange="updateSelectionCount('${category}')">
        <label for="${id}">${value}</label>
        ${isCustom ? `<button type="button" class="option-delete" title="Remove option" onclick="event.stopPropagation();removeOption('${category}','${value}')">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
        </button>` : ''}
    `;
    container.appendChild(div);

    const masterCheckbox = document.getElementById(`master-${category}`);
    if (masterCheckbox?.checked) div.querySelector('input').checked = true;
}

function addMasterCheckbox(container, category) {
    const masterId = `master-${category}`;
    const div = document.createElement('div');
    div.className = 'master-checkbox';
    div.innerHTML = `<input type="checkbox" id="${masterId}" name="${masterId}"><label for="${masterId}">Select All</label>`;

    div.querySelector('input').addEventListener('change', function() {
        document.querySelectorAll(`input[name="${category}"]`).forEach(cb => cb.checked = this.checked);
        updateSelectionCount(category);
    });
    container.appendChild(div);
}

function toggleFieldset(category) {
    const fieldset = document.getElementById(`fieldset-${category}`);
    fieldset.classList.toggle('collapsed');
}

function updateSelectionCount(category) {
    const checked = document.querySelectorAll(`input[name="${category}"]:checked`).length;
    const total = document.querySelectorAll(`input[name="${category}"]`).length;

    // Update master checkbox state
    const masterCheckbox = document.getElementById(`master-${category}`);
    if (masterCheckbox) {
        masterCheckbox.checked = checked === total && total > 0;
        masterCheckbox.indeterminate = checked > 0 && checked < total;
    }
}

function buildSearchUrl() {
    const get = name => document.querySelectorAll(`input[name="${name}"]:checked`);
    const afterDate = document.getElementById('afterDate').value;
    const queryParts = [];

    const sites = get('sites');
    if (sites.length) queryParts.push(`( ${[...sites].map(s => `site:${s.value}`).join(' OR ')} )`);

    const roles = get('roles');
    if (roles.length) queryParts.push(`(${[...roles].map(r => `"${r.value}"`).join(' OR ')})`);

    const includeTerms = get('includeTerms');
    if (includeTerms.length) queryParts.push(`(${[...includeTerms].map(t => `"${t.value}"`).join(' OR ')})`);

    const excludeItems = [...get('excludeRoles'), ...get('excludeCompanies'), ...get('excludeTerms')];
    const excludeQuery = excludeItems.map(item => {
        const val = item.value.startsWith('-') ? item.value.slice(1) : item.value;
        return ` -"${val}"`;
    }).join('');
    if (excludeQuery) queryParts.push(excludeQuery);
    if (afterDate) queryParts.push(` after:${afterDate}`);

    return `https://www.google.com/search?q=${encodeURIComponent(queryParts.join(' '))}`;
}

function generateSearch() {
    const searchUrl = buildSearchUrl();
    const urlEl = document.getElementById('searchUrl');
    urlEl.textContent = searchUrl;
    urlEl.style.display = 'block';
    window.open(searchUrl, '_blank');
}

function copySearchUrl() {
    const urlEl = document.getElementById('searchUrl');
    if (!urlEl.textContent) generateSearchUrl();

    navigator.clipboard.writeText(urlEl.textContent).then(() => {
        const btn = document.getElementById('copyBtn');
        const originalHTML = btn.innerHTML;
        btn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg> Copied!';
        btn.classList.add('copied');
        setTimeout(() => {
            btn.innerHTML = originalHTML;
            btn.classList.remove('copied');
        }, 2000);
    });
}

function generateSearchUrl() {
    const searchUrl = buildSearchUrl();
    const urlEl = document.getElementById('searchUrl');
    urlEl.textContent = searchUrl;
    urlEl.style.display = 'block';
    return searchUrl;
}

function loadOptionsFromLocalStorage() {
    const saved = localStorage.getItem('jobSearchOptions');
    const savedCustom = localStorage.getItem('jobSearchCustomOptions');
    if (saved) Object.assign(options, JSON.parse(saved));
    if (savedCustom) customOptions = JSON.parse(savedCustom);
}

function populateOptionCategories() {
    const select = document.getElementById('optionCategory');
    Object.keys(options).forEach(cat => {
        select.innerHTML += `<option value="${cat}">${categoryNames[cat] || cat}</option>`;
    });
}

function addOption() {
    const category = document.getElementById('optionCategory').value;
    const newOption = document.getElementById('newOption').value.trim();
    if (!newOption || !category || !options[category] || options[category].includes(newOption)) return;

    options[category].push(newOption);
    customOptions[category] = customOptions[category] || [];
    customOptions[category].push(newOption);
    updateLocalStorage();

    const content = document.getElementById(`content-${category}`);
    if (content) addOptionToFieldset(content, category, newOption, true);
    document.getElementById('newOption').value = '';
    updateSelectionCount(category);
}

function removeOption(category, value) {
    const idx = options[category].indexOf(value);
    if (idx > -1) options[category].splice(idx, 1);

    if (customOptions[category]) {
        const customIdx = customOptions[category].indexOf(value);
        if (customIdx > -1) customOptions[category].splice(customIdx, 1);
    }
    updateLocalStorage();

    const id = `${category}-${value.replace(/\W+/g, '').toLowerCase()}`;
    document.getElementById(id)?.closest('.option-tag')?.remove();
    updateSelectionCount(category);
}

function updateLocalStorage() {
    localStorage.setItem('jobSearchOptions', JSON.stringify(options));
    localStorage.setItem('jobSearchCustomOptions', JSON.stringify(customOptions));
}

function addEnterKeyListener() {
    document.getElementById('newOption').addEventListener('keypress', e => {
        if (e.key === 'Enter') { e.preventDefault(); addOption(); }
    });
}

function setupDatePresets() {
    const presetBtns = document.querySelectorAll('.preset-btn');
    const dateInput = document.getElementById('afterDate');

    presetBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const date = new Date();
            date.setDate(date.getDate() - parseInt(btn.dataset.days));
            dateInput.value = date.toISOString().split('T')[0];
            presetBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
        });
    });

    dateInput.addEventListener('change', () => {
        const diffDays = Math.round((new Date().setHours(0,0,0,0) - new Date(dateInput.value)) / 86400000);
        presetBtns.forEach(btn => btn.classList.toggle('active', parseInt(btn.dataset.days) === diffDays));
    });
}

document.addEventListener('DOMContentLoaded', () => {
    loadOptionsFromLocalStorage();
    createFormOptions();
    populateOptionCategories();
    addEnterKeyListener();
    setupDatePresets();
});

function clearLocalStorage() {
    localStorage.removeItem('jobSearchOptions');
    localStorage.removeItem('jobSearchCustomOptions');
    location.reload();
}
