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

    const input = document.createElement('input');
    const label = document.createElement('label');
    const id = `${category}-${value.replace(/\W+/g, '').toLowerCase()}`;

    input.type = 'checkbox';
    input.id = id;
    input.name = category;
    input.value = value;
    input.onchange = () => updateSelectionCount(category);

    label.htmlFor = id;
    label.textContent = value;

    div.appendChild(input);
    div.appendChild(label);

    // Add delete button for custom options
    if (isCustom) {
        const deleteBtn = document.createElement('button');
        deleteBtn.type = 'button';
        deleteBtn.className = 'option-delete';
        deleteBtn.title = 'Remove option';
        deleteBtn.innerHTML = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>';
        deleteBtn.onclick = (e) => {
            e.stopPropagation();
            removeOption(category, value);
        };
        div.appendChild(deleteBtn);
    }

    container.appendChild(div);

    const masterCheckbox = document.getElementById(`master-${category}`);
    if (masterCheckbox && masterCheckbox.checked) {
        input.checked = true;
    }
}

function addMasterCheckbox(container, category) {
    const masterDiv = document.createElement('div');
    masterDiv.className = 'master-checkbox';

    const masterCheckbox = document.createElement('input');
    const masterLabel = document.createElement('label');
    const masterId = `master-${category}`;

    masterCheckbox.type = 'checkbox';
    masterCheckbox.id = masterId;
    masterCheckbox.name = `master-${category}`;
    masterCheckbox.addEventListener('change', function() {
        const allCheckboxes = document.querySelectorAll(`input[name="${category}"]`);
        allCheckboxes.forEach(checkbox => {
            checkbox.checked = masterCheckbox.checked;
        });
        updateSelectionCount(category);
    });

    masterLabel.htmlFor = masterId;
    masterLabel.textContent = 'Select All';

    masterDiv.appendChild(masterCheckbox);
    masterDiv.appendChild(masterLabel);
    container.appendChild(masterDiv);
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

function generateSearch() {
    const roles = document.querySelectorAll('input[name="roles"]:checked');
    const excludeRoles = document.querySelectorAll('input[name="excludeRoles"]:checked');
    const excludeCompanies = document.querySelectorAll('input[name="excludeCompanies"]:checked');
    const sites = document.querySelectorAll('input[name="sites"]:checked');
    const afterDate = document.getElementById('afterDate').value;
    const excludeTerms = document.querySelectorAll('input[name="excludeTerms"]:checked');
    const includeTerms = document.querySelectorAll('input[name="includeTerms"]:checked');
    let dateQuery = '';
    let queryParts = [];

    if (sites.length) {
        queryParts.push(`( ${Array.from(sites, site => `site:${site.value}`).join(' OR ')} )`);
    }

    if (roles.length) {
        queryParts.push(`(${Array.from(roles, role => `"${role.value}"`).join(' OR ')})`);
    }

    if (includeTerms.length) {
        queryParts.push(`(${Array.from(includeTerms, term => `"${term.value}"`).join(' OR ')})`);
    }

    let excludeQuery = '';

    excludeRoles.forEach(role => {
        excludeQuery += ` -"${role.value.startsWith('-') ? role.value.slice(1) : role.value}"`;
    });

    excludeCompanies.forEach(company => {
        excludeQuery += ` -"${company.value.startsWith('-') ? company.value.slice(1) : company.value}"`;
    });

    excludeTerms.forEach(term => {
        excludeQuery += ` -"${term.value.startsWith('-') ? term.value.slice(1) : term.value}"`;
    });

    if (excludeQuery) {
        queryParts.push(excludeQuery);
    }

    if (afterDate) {
        dateQuery += ` after:${afterDate}`;
    }

    if (dateQuery) {
        queryParts.push(dateQuery);
    }

    const finalQuery = queryParts.join(' ');
    const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(finalQuery)}`;

    const urlEl = document.getElementById('searchUrl');
    urlEl.textContent = searchUrl;
    urlEl.style.display = 'block';

    window.open(searchUrl, '_blank');
}

function copySearchUrl() {
    const urlEl = document.getElementById('searchUrl');
    const url = urlEl.textContent;

    if (!url) {
        // Generate URL first if not exists
        generateSearchUrl();
    }

    const textToCopy = urlEl.textContent;
    if (textToCopy) {
        navigator.clipboard.writeText(textToCopy).then(() => {
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
}

function generateSearchUrl() {
    const roles = document.querySelectorAll('input[name="roles"]:checked');
    const excludeRoles = document.querySelectorAll('input[name="excludeRoles"]:checked');
    const excludeCompanies = document.querySelectorAll('input[name="excludeCompanies"]:checked');
    const sites = document.querySelectorAll('input[name="sites"]:checked');
    const afterDate = document.getElementById('afterDate').value;
    const excludeTerms = document.querySelectorAll('input[name="excludeTerms"]:checked');
    const includeTerms = document.querySelectorAll('input[name="includeTerms"]:checked');
    let dateQuery = '';
    let queryParts = [];

    if (sites.length) {
        queryParts.push(`( ${Array.from(sites, site => `site:${site.value}`).join(' OR ')} )`);
    }

    if (roles.length) {
        queryParts.push(`(${Array.from(roles, role => `"${role.value}"`).join(' OR ')})`);
    }

    if (includeTerms.length) {
        queryParts.push(`(${Array.from(includeTerms, term => `"${term.value}"`).join(' OR ')})`);
    }

    let excludeQuery = '';
    excludeRoles.forEach(role => {
        excludeQuery += ` -"${role.value.startsWith('-') ? role.value.slice(1) : role.value}"`;
    });
    excludeCompanies.forEach(company => {
        excludeQuery += ` -"${company.value.startsWith('-') ? company.value.slice(1) : company.value}"`;
    });
    excludeTerms.forEach(term => {
        excludeQuery += ` -"${term.value.startsWith('-') ? term.value.slice(1) : term.value}"`;
    });

    if (excludeQuery) queryParts.push(excludeQuery);
    if (afterDate) dateQuery += ` after:${afterDate}`;
    if (dateQuery) queryParts.push(dateQuery);

    const finalQuery = queryParts.join(' ');
    const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(finalQuery)}`;

    const urlEl = document.getElementById('searchUrl');
    urlEl.textContent = searchUrl;
    urlEl.style.display = 'block';

    return searchUrl;
}

function loadOptionsFromLocalStorage() {
    const savedOptions = localStorage.getItem('jobSearchOptions');
    const savedCustom = localStorage.getItem('jobSearchCustomOptions');
    if (savedOptions) {
        Object.assign(options, JSON.parse(savedOptions));
    }
    if (savedCustom) {
        customOptions = JSON.parse(savedCustom);
    }
}

function populateOptionCategories() {
    const select = document.getElementById('optionCategory');
    Object.keys(options).forEach(category => {
        const option = document.createElement('option');
        option.value = category;
        option.textContent = categoryNames[category] || category;
        select.appendChild(option);
    });
}

function addOption() {
    const category = document.getElementById('optionCategory').value;
    const newOption = document.getElementById('newOption').value.trim();
    if (newOption && category && options[category]) {
        if (!options[category].includes(newOption)) {
            options[category].push(newOption);

            // Track as custom option
            if (!customOptions[category]) {
                customOptions[category] = [];
            }
            customOptions[category].push(newOption);

            updateLocalStorage();
            const content = document.getElementById(`content-${category}`);
            if (content) {
                addOptionToFieldset(content, category, newOption, true);
            }
            document.getElementById('newOption').value = '';
            updateSelectionCount(category);
        }
    }
}

function removeOption(category, value) {
    // Remove from options
    const idx = options[category].indexOf(value);
    if (idx > -1) {
        options[category].splice(idx, 1);
    }

    // Remove from custom options
    if (customOptions[category]) {
        const customIdx = customOptions[category].indexOf(value);
        if (customIdx > -1) {
            customOptions[category].splice(customIdx, 1);
        }
    }

    updateLocalStorage();

    // Remove from DOM
    const id = `${category}-${value.replace(/\W+/g, '').toLowerCase()}`;
    const input = document.getElementById(id);
    if (input) {
        input.closest('.option-tag').remove();
    }

    updateSelectionCount(category);
}

function updateLocalStorage() {
    localStorage.setItem('jobSearchOptions', JSON.stringify(options));
    localStorage.setItem('jobSearchCustomOptions', JSON.stringify(customOptions));
}

function addEnterKeyListener() {
    const newOptionInput = document.getElementById('newOption');
    newOptionInput.addEventListener('keypress', function(event) {
        if (event.key === "Enter") {
            event.preventDefault();
            addOption();
        }
    });
}

function setupDatePresets() {
    const presetBtns = document.querySelectorAll('.preset-btn');
    const dateInput = document.getElementById('afterDate');

    presetBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const days = parseInt(btn.dataset.days);
            const date = new Date();
            date.setDate(date.getDate() - days);
            dateInput.value = date.toISOString().split('T')[0];

            // Update active state
            presetBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
        });
    });

    // Update preset highlight when date manually changes
    dateInput.addEventListener('change', () => {
        const inputDate = new Date(dateInput.value);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const diffDays = Math.round((today - inputDate) / (1000 * 60 * 60 * 24));

        presetBtns.forEach(btn => {
            if (parseInt(btn.dataset.days) === diffDays) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });
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
