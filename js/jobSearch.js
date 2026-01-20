const options = {

    roles: ["AI", "ML", "NLP", "data", "Computer Vision", 
    "software", "AI/ML", "Machine Learning", "scientist",
    "GenAI", "Generative", "SDE", "SWE", "Perception"],

    // roleTypes: ["Grad", "New", "New Grad"],

    excludeRoles: ["intern", "senior", "manager", "staff", "Sr.", ],

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
    "twitter.com",
    "angel.co",
    "linkedin.com",
    "indeed.com",
    "monster.com",
    "glassdoor.com",
    "ziprecruiter.com",
    ]

};

function createFormOptions() {
    const form = document.getElementById('searchForm');
    Object.keys(options).forEach(category => {
        let fieldset = document.getElementById(`fieldset-${category}`);
        if (!fieldset) {
            fieldset = document.createElement('fieldset');
            fieldset.id = `fieldset-${category}`;
            const legend = document.createElement('legend');
            legend.textContent = category.charAt(0).toUpperCase() + category.slice(1).replace(/([A-Z])/g, ' $1').trim();
            fieldset.appendChild(legend);
            form.insertBefore(fieldset, form.children[form.children.length - 1]);
        } else {
            // Clear existing options to avoid duplication
            while (fieldset.firstChild) {
                fieldset.removeChild(fieldset.lastChild);
            }
        }

        addMasterCheckbox(fieldset, category); // Add master checkbox here

        // Add or re-add options
        options[category].forEach(value => {
            addOptionToFieldset(fieldset, category, value);
        });

        // Check options based on category criteria
        if (['roles', 'excludeRoles', 'excludeTerms'].includes(category)) {
            Array.from(document.querySelectorAll(`input[name="${category}"]`)).forEach(input => input.checked = true);
        }
        // check first three sites
        if (category === 'sites') {
            Array.from(document.querySelectorAll(`input[name="${category}"]`)).slice(0, 3).forEach(input => input.checked = true);
        }
    });
}



function addOptionToFieldset(fieldset, category, value) {
    const div = document.createElement('div');
    const input = document.createElement('input');
    const label = document.createElement('label');
    const id = `${category}-${value.replace(/\W+/g, '').toLowerCase()}`;

    input.type = 'checkbox';
    input.id = id;
    input.name = category;
    input.value = value;

    label.htmlFor = id;
    label.textContent = value;

    div.appendChild(input);
    div.appendChild(label);
    fieldset.appendChild(div);

    const masterCheckbox = document.getElementById(`master-${category}`);
    const isChecked = masterCheckbox && masterCheckbox.checked;
    if (isChecked) {
        input.checked = true; // Ensure new options match the master checkbox state
    }
}


document.addEventListener('DOMContentLoaded', createFormOptions);


function generateSearch() {
    const roles = document.querySelectorAll('input[name="roles"]:checked');
    // const roleTypes = document.querySelectorAll('input[name="roleTypes"]:checked');
    const excludeRoles = document.querySelectorAll('input[name="excludeRoles"]:checked');
    const excludeCompanies = document.querySelectorAll('input[name="excludeCompanies"]:checked');
    const sites = document.querySelectorAll('input[name="sites"]:checked');
    const afterDate = document.getElementById('afterDate').value;
    const excludeTerms = document.querySelectorAll('input[name="excludeTerms"]:checked');
    const includeTerms = document.querySelectorAll('input[name="includeTerms"]:checked');
    // const beforeDate = document.getElementById('beforeDate').value;
    let dateQuery = '';

    let queryParts = [];

    // Add site filters
    if (sites.length) {
        // join using (site:site1 OR site:site2 OR ...)
        queryParts.push(`( ${Array.from(sites, site => `site:${site.value}`).join(' OR ')} )`);
        // queryParts = queryParts.concat(Array.from(sites, site => `${site.value}`));
    }

    if (roles.length) {
        queryParts.push(`(${Array.from(roles, role => `"${role.value}"`).join(' OR ')})`);
    }
    // if (roleTypes.length) {
    //     queryParts.push(`(${Array.from(roleTypes, type => `"${type.value}"`).join(' OR ')})`);
    // }
    
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
    // if (beforeDate) {
    //     dateQuery += ` before:${beforeDate}`;
    // }

    // Append the dateQuery to the existing query
    if (dateQuery) {
        queryParts.push(dateQuery);
    }
    
    // Construct the final query
    const finalQuery = queryParts.join(' ');
    const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(finalQuery)}`;


    // Display or use the URL as needed
    document.getElementById('searchUrl').textContent = searchUrl;
    // Open the search in a new tab/window
    window.open(searchUrl, '_blank');
}


function addMasterCheckbox(fieldset, category) {
    const masterDiv = document.createElement('div');
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
    });

    masterLabel.htmlFor = masterId;
    masterLabel.textContent = category.charAt(0).toUpperCase() + category.slice(1).replace(/([A-Z])/g, ' $1').trim();
    masterLabel.style.fontWeight = 'bold'; // Optional: Make the label visually distinct
    masterLabel.style.fontSize = '1.2em'; // Optional: Make the label visually distinct
    masterCheckbox.style.transform = 'scale(1.3)';

    masterDiv.appendChild(masterCheckbox);
    masterDiv.appendChild(masterLabel);
    fieldset.insertBefore(masterDiv, fieldset.firstChild); // Insert the master checkbox at the top of the fieldset
}


function loadOptionsFromLocalStorage() {
    const savedOptions = localStorage.getItem('jobSearchOptions');
    if (savedOptions) {
        Object.assign(options, JSON.parse(savedOptions));
    }
}

function populateOptionCategories() {
    const select = document.getElementById('optionCategory');
    Object.keys(options).forEach(category => {
        const option = document.createElement('option');
        option.value = category;
        option.textContent = category.charAt(0).toUpperCase() + category.slice(1).replace(/([A-Z])/g, ' $1').trim();
        select.appendChild(option);
    });
}

function addOption() {
    const category = document.getElementById('optionCategory').value;
    const newOption = document.getElementById('newOption').value.trim();
    if (newOption && category && options[category]) {
        if (!options[category].includes(newOption)) { // Prevent duplicate options
            options[category].push(newOption);
            updateLocalStorage();
            const fieldset = document.getElementById(`fieldset-${category}`);
            // Ensure fieldset is correctly identified and updated
            if (fieldset) {
                addOptionToFieldset(fieldset, category, newOption);
            }
            document.getElementById('newOption').value = ''; // Clear the textbox
        }
    }

}


function updateLocalStorage() {
    localStorage.setItem('jobSearchOptions', JSON.stringify(options));
}

function addEnterKeyListener() {
    const newOptionInput = document.getElementById('newOption');
    newOptionInput.addEventListener('keypress', function(event) {
        if (event.key === "Enter") {
            event.preventDefault(); // Prevent the default form submit behavior
            addOption();
        }
    });
}


document.addEventListener('DOMContentLoaded', () => {
    loadOptionsFromLocalStorage();
    createFormOptions();
    populateOptionCategories();
    addEnterKeyListener();
});

// add function to clear local storage

function clearLocalStorage() {
    localStorage.removeItem('jobSearchOptions');
    location.reload();
}