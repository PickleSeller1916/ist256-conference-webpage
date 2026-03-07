/* 
   script.js — XYZ Conference Spring 2026
 */

'use strict';

/* ----------------------------------------------------------------
   1. CONSTANTS & STORAGE KEY
---------------------------------------------------------------- */

/** Key used to store the attendee JSON array in localStorage */
const STORAGE_KEY = 'xyz_conf_attendees';


/* ----------------------------------------------------------------
   2. STORAGE HELPERS
   All reads and writes go through these two functions so the rest
   of the code never touches localStorage directly.
---------------------------------------------------------------- */

/**
 * Load the attendee list from localStorage.
 * Returns an empty array if nothing is stored yet, or if the
 * stored value cannot be parsed as JSON.
 * @returns {Array} list of attendee objects
 */
function loadAttendees() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  } catch {
    return [];
  }
}

/**
 * Persist the attendee list to localStorage as a JSON string.
 * @param {Array} list — array of attendee objects to save
 */
function saveAttendees(list) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

/**
 * Generate a unique ID string for a new attendee.
 * Combines the current timestamp with a short random suffix.
 * @returns {string} e.g. "att_1712345678900_x3k9f"
 */
function generateId() {
  return 'att_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7);
}


/* ----------------------------------------------------------------
   3. UTILITY HELPERS
---------------------------------------------------------------- */

/**
 * Return the first-letter initials of a name (up to 2 words).
 * Used to populate the avatar circle on each attendee card.
 * @param {string} name
 * @returns {string} e.g. "Jane Doe" → "JD"
 */
function initials(name) {
  return name.trim()
    .split(/\s+/)
    .slice(0, 2)
    .map(word => word[0].toUpperCase())
    .join('');
}

/**
 * Escape special HTML characters in a string to prevent XSS when
 * injecting user-supplied data into innerHTML.
 * @param {string} str
 * @returns {string} safely escaped string
 */
function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}


/* ----------------------------------------------------------------
   4. VALIDATION HELPERS
   Each validator:
     - Accepts the raw field value, the <input> element, and its
       paired error <div>.
     - Applies CSS classes  .error / .success  to the input.
     - Shows or hides the error message div via .visible class.
     - Returns true (valid) or false (invalid).
---------------------------------------------------------------- */

/**
 * Apply visual valid/invalid state to a field.
 * @param {HTMLElement} inputEl  — the form input
 * @param {HTMLElement} errorEl  — the sibling error message div
 * @param {boolean}     valid    — whether the field passes
 * @param {string}      message  — error message to display
 * @returns {boolean} the value of `valid`
 */
function setFieldState(inputEl, errorEl, valid, message) {
  inputEl.classList.toggle('error',   !valid);
  inputEl.classList.toggle('success',  valid);
  errorEl.textContent = message;
  errorEl.classList.toggle('visible', !valid);
  return valid;
}

/**
 * Validate: Attendee Name — must be at least 2 non-whitespace chars.
 */
function validateName(val, inputEl, errorEl) {
  const ok = val.trim().length >= 2;
  return setFieldState(
    inputEl, errorEl, ok,
    '⚠ Please enter your full name (at least 2 characters).'
  );
}

/**
 * Validate: Email Address — must match a basic email pattern.
 */
function validateEmail(val, inputEl, errorEl) {
  const ok = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val.trim());
  return setFieldState(
    inputEl, errorEl, ok,
    '⚠ Please enter a valid email address.'
  );
}

/**
 * Validate: Age — must be a whole number between 1 and 120.
 */
function validateAge(val, inputEl, errorEl) {
  const n  = Number(val);
  const ok = Number.isInteger(n) && n >= 1 && n <= 120;
  return setFieldState(
    inputEl, errorEl, ok,
    '⚠ Please enter a valid age (1–120).'
  );
}

/**
 * Validate: Organization — must be at least 2 non-whitespace chars.
 */
function validateOrg(val, inputEl, errorEl) {
  const ok = val.trim().length >= 2;
  return setFieldState(
    inputEl, errorEl, ok,
    '⚠ Please enter your institution or organization.'
  );
}

/**
 * Validate: Phone — optional field.
 * If empty → always valid (clears any prior error state).
 * If filled → must match a loose phone pattern (digits, spaces,
 *             hyphens, parentheses, dots; 7–20 characters).
 */
function validatePhone(val, inputEl, errorEl) {
  if (!val.trim()) {
    // Optional — treat blank as valid, just clear styling
    inputEl.classList.remove('error', 'success');
    errorEl.classList.remove('visible');
    return true;
  }
  const ok = /^[\d\s\-\+\(\)\.]{7,20}$/.test(val.trim());
  return setFieldState(
    inputEl, errorEl, ok,
    '⚠ Phone number format looks invalid.'
  );
}


/* ----------------------------------------------------------------
   5. DOM REFERENCES — Registration Form
---------------------------------------------------------------- */

const nameInput  = document.getElementById('name');
const emailInput = document.getElementById('email');
const ageInput   = document.getElementById('age');
const orgInput   = document.getElementById('org');
const phoneInput = document.getElementById('phone');

const errName  = document.getElementById('err-name');
const errEmail = document.getElementById('err-email');
const errAge   = document.getElementById('err-age');
const errOrg   = document.getElementById('err-org');
const errPhone = document.getElementById('err-phone');


/* ----------------------------------------------------------------
   6. LIVE VALIDATION — validate each field as the user leaves it
---------------------------------------------------------------- */

nameInput.addEventListener('blur',
  () => validateName(nameInput.value,   nameInput,  errName));

emailInput.addEventListener('blur',
  () => validateEmail(emailInput.value, emailInput, errEmail));

ageInput.addEventListener('blur',
  () => validateAge(ageInput.value,     ageInput,   errAge));

orgInput.addEventListener('blur',
  () => validateOrg(orgInput.value,     orgInput,   errOrg));

phoneInput.addEventListener('blur',
  () => validatePhone(phoneInput.value, phoneInput, errPhone));


/* ----------------------------------------------------------------
   7. FORM SUBMISSION
   Runs all validators; if any fail the submit is aborted and the
   error messages remain visible. On success, the attendee object
   is built, saved to localStorage, and the directory re-renders.
---------------------------------------------------------------- */

document.getElementById('submitBtn').addEventListener('click', () => {

  // --- Validate all fields at once ---
  const v1 = validateName(nameInput.value,   nameInput,  errName);
  const v2 = validateEmail(emailInput.value, emailInput, errEmail);
  const v3 = validateAge(ageInput.value,     ageInput,   errAge);
  const v4 = validateOrg(orgInput.value,     orgInput,   errOrg);
  const v5 = validatePhone(phoneInput.value, phoneInput, errPhone);

  // Abort if any required field is invalid
  if (!(v1 && v2 && v3 && v4 && v5)) return;

  // --- Build attendee object (stored as JSON) ---
  const attendee = {
    id:        generateId(),
    name:      nameInput.value.trim(),
    email:     emailInput.value.trim(),
    age:       Number(ageInput.value),
    org:       orgInput.value.trim(),
    phone:     phoneInput.value.trim(),
    timestamp: new Date().toISOString()   // ISO date string for JSON portability
  };

  // --- Persist to localStorage ---
  const list = loadAttendees();
  list.push(attendee);
  saveAttendees(list);

  // --- Reset form inputs ---
  [nameInput, emailInput, ageInput, orgInput, phoneInput].forEach(el => {
    el.value = '';
    el.classList.remove('success', 'error');
  });

  // --- Show success toast, auto-hide after 3.5 s ---
  const toast = document.getElementById('successToast');
  toast.classList.add('visible');
  setTimeout(() => toast.classList.remove('visible'), 3500);

  // --- Refresh the attendee directory ---
  renderDirectory();
});


/* ----------------------------------------------------------------
   8. DIRECTORY RENDERING
   Reads the attendee JSON from localStorage, optionally filters by
   a search string, then builds and inserts one card per attendee.
---------------------------------------------------------------- */

const attendeeGrid = document.getElementById('attendeeGrid');
const emptyState   = document.getElementById('emptyState');
const countDisplay = document.getElementById('countDisplay');
const searchInput  = document.getElementById('searchInput');

/**
 * Build and display the attendee directory.
 * @param {string} [filter=''] — optional search string;
 *   matches against name and organization (case-insensitive)
 */
function renderDirectory(filter = '') {
  const list  = loadAttendees();
  const query = filter.toLowerCase().trim();

  // Apply search filter when a query is present
  const filtered = query
    ? list.filter(a =>
        a.name.toLowerCase().includes(query) ||
        a.org.toLowerCase().includes(query)
      )
    : list;

  // Update count badge
  countDisplay.textContent = filtered.length;

  // Remove old cards (leave the emptyState div in place)
  [...attendeeGrid.querySelectorAll('.attendee-card')].forEach(el => el.remove());

  // Show empty state if no results
  if (filtered.length === 0) {
    emptyState.style.display = '';
    return;
  }

  emptyState.style.display = 'none';

  // Build one card per attendee
  filtered.forEach((a, idx) => {
    const card = document.createElement('div');
    card.className = 'attendee-card';
    // Stagger the slide-in animation for each card
    card.style.animationDelay = `${idx * 0.04}s`;

    card.innerHTML = `
      <div class="attendee-avatar">${initials(a.name)}</div>
      <div class="attendee-info">
        <div class="attendee-name">${escHtml(a.name)}</div>
        <div class="attendee-meta">${escHtml(a.email)} · Age ${a.age}</div>
        <div class="attendee-meta">
          ${escHtml(a.org)}${a.phone ? ' · ' + escHtml(a.phone) : ''}
        </div>
      </div>
      <div class="attendee-badge">Registered</div>
      <div class="card-actions">
        <button class="btn-edit"   data-id="${a.id}" title="Edit attendee">✏️</button>
        <button class="btn-delete" data-id="${a.id}" title="Remove attendee">🗑</button>
      </div>
    `;

    attendeeGrid.appendChild(card);
  });

  // Attach event listeners to the freshly rendered buttons
  attendeeGrid.querySelectorAll('.btn-edit').forEach(btn => {
    btn.addEventListener('click', () => openEditModal(btn.dataset.id));
  });

  attendeeGrid.querySelectorAll('.btn-delete').forEach(btn => {
    btn.addEventListener('click', () => deleteAttendee(btn.dataset.id));
  });
}

// Re-render whenever the search box changes
searchInput.addEventListener('input', () => renderDirectory(searchInput.value));


/* ----------------------------------------------------------------
   9. DELETE
   Asks the user to confirm, then removes the matching attendee
   from localStorage and re-renders the directory.
---------------------------------------------------------------- */

/**
 * Delete an attendee by ID after a confirmation prompt.
 * @param {string} id — the attendee's unique ID
 */
function deleteAttendee(id) {
  if (!confirm('Remove this attendee from the directory?')) return;

  const updated = loadAttendees().filter(a => a.id !== id);
  saveAttendees(updated);
  renderDirectory(searchInput.value);
}


/* ----------------------------------------------------------------
   10. EDIT MODAL
   Opens a pre-filled modal for the selected attendee.
   Re-validates on save and writes the updated record back to
   localStorage before closing and re-rendering.
---------------------------------------------------------------- */

const editModal   = document.getElementById('editModal');
const editNameEl  = document.getElementById('edit-name');
const editEmailEl = document.getElementById('edit-email');
const editAgeEl   = document.getElementById('edit-age');
const editOrgEl   = document.getElementById('edit-org');
const editPhoneEl = document.getElementById('edit-phone');

const editErrName  = document.getElementById('edit-err-name');
const editErrEmail = document.getElementById('edit-err-email');
const editErrAge   = document.getElementById('edit-err-age');
const editErrOrg   = document.getElementById('edit-err-org');

/** Tracks which attendee is currently being edited */
let editingId = null;

/**
 * Open the edit modal and pre-populate it with the attendee's
 * current data.
 * @param {string} id — the attendee's unique ID
 */
function openEditModal(id) {
  const attendee = loadAttendees().find(a => a.id === id);
  if (!attendee) return;

  editingId = id;

  // Pre-fill modal fields with existing values
  editNameEl.value  = attendee.name;
  editEmailEl.value = attendee.email;
  editAgeEl.value   = attendee.age;
  editOrgEl.value   = attendee.org;
  editPhoneEl.value = attendee.phone || '';

  // Clear any leftover validation state from a previous edit
  [editNameEl, editEmailEl, editAgeEl, editOrgEl, editPhoneEl].forEach(el => {
    el.classList.remove('error', 'success');
  });
  [editErrName, editErrEmail, editErrAge, editErrOrg].forEach(el => {
    el.classList.remove('visible');
  });

  editModal.classList.add('open');
}

/** Close the modal and clear the editing context. */
function closeEditModal() {
  editModal.classList.remove('open');
  editingId = null;
}

// Close on Cancel button
document.getElementById('cancelEdit').addEventListener('click', closeEditModal);

// Close when clicking the dark backdrop (outside the modal box)
editModal.addEventListener('click', e => {
  if (e.target === editModal) closeEditModal();
});

// Save Changes — validate then update localStorage
document.getElementById('saveEdit').addEventListener('click', () => {

  // Validate all required edit fields
  const v1 = validateName(editNameEl.value,   editNameEl,  editErrName);
  const v2 = validateEmail(editEmailEl.value, editEmailEl, editErrEmail);
  const v3 = validateAge(editAgeEl.value,     editAgeEl,   editErrAge);
  const v4 = validateOrg(editOrgEl.value,     editOrgEl,   editErrOrg);

  if (!(v1 && v2 && v3 && v4)) return;

  // Map over the list, replacing only the edited attendee
  const updated = loadAttendees().map(a => {
    if (a.id !== editingId) return a;
    return {
      ...a,                              // keep id and timestamp
      name:  editNameEl.value.trim(),
      email: editEmailEl.value.trim(),
      age:   Number(editAgeEl.value),
      org:   editOrgEl.value.trim(),
      phone: editPhoneEl.value.trim()
    };
  });

  saveAttendees(updated);
  closeEditModal();
  renderDirectory(searchInput.value);
});


/* ----------------------------------------------------------------
   11. INITIALISE
   Render whatever is already in localStorage when the page loads.
---------------------------------------------------------------- */
renderDirectory();