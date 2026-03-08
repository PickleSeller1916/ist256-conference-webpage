/* ================================================================
   script.js — XYZ Conference Spring 2026

   STRUCTURE OVERVIEW:
   ┌─────────────────────────────────────────────────────────────┐
   │  SECTION 1  — Page Navigation    (runs at page load)       │
   │  SECTION 2  — Storage Helpers    (runs at page load)       │
   │  SECTION 3  — Utility Helpers    (runs at page load)       │
   │  SECTION 4  — Validation Helpers (runs at page load)       │
   │  SECTION 5  — renderDirectory placeholder                  │
   │                                                             │
   │  SECTION 6  — initForms()  ← DEFINED here,                │
   │               but only EXECUTES when the user first        │
   │               clicks "Register Now"                        │
   │    ├─ 6a  DOM References                                   │
   │    ├─ 6b  Live Validation (blur listeners)                 │
   │    ├─ 6c  Submit Button listener                           │
   │    ├─ 6d  renderDirectory (real definition)                │
   │    ├─ 6e  Search Input listener                            │
   │    ├─ 6f  Delete function                                  │
   │    ├─ 6g  Edit Modal                                       │
   │    └─ 6h  Initial render call                             │
   └─────────────────────────────────────────────────────────────┘
================================================================ */


/* ================================================================
   SECTION 1 — PAGE NAVIGATION
   Runs immediately when the page loads.
   showPage() switches between the Home and Forms views.
   When 'forms' is shown for the first time, it calls initForms().
================================================================ */

// Guard flag — ensures initForms() only ever runs once
let formsInitialized = false;

function showPage(id) {
  // Hide all pages, show the selected one
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.getElementById('page-' + id).classList.add('active');

  // Update nav button active states
  document.getElementById('nav-home').classList.toggle('active', id === 'home');
  document.getElementById('nav-forms').classList.toggle('active', id === 'forms');

  window.scrollTo(0, 0);

  if (id === 'f') {
    if (!formsInitialized) {
      initForms();              // First visit: wire up all DOM listeners
      formsInitialized = true;
    } else {
      renderDirectory();        // Return visit: just refresh the list
    }
  }
}


/* ================================================================
   SECTION 2 — STORAGE HELPERS
   Safe to define at page load — these never touch the DOM.
   All reads and writes to localStorage go through these functions.
================================================================ */

const STORAGE_KEY = 'xyz_conf_attendees';

// Read the attendee array from localStorage.
// Returns [] if nothing is stored yet, or if JSON is malformed.
function loadAttendees() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  } catch {
    return [];
  }
}

// Write the attendee array back to localStorage as a JSON string.
function saveAttendees(list) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

// Generate a unique ID for a new attendee entry.
function generateId() {
  return 'att_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7);
}


/* ================================================================
   SECTION 3 — UTILITY HELPERS
   Safe to define at page load — pure logic, no DOM queries.
================================================================ */

// Extract up-to-2-letter initials from a full name.
// e.g. "Jane Doe" → "JD"
function initials(name) {
  return name.trim()
    .split(/\s+/)
    .slice(0, 2)
    .map(word => word[0].toUpperCase())
    .join('');
}

// Escape HTML special characters before injecting user text into innerHTML.
// Prevents XSS attacks from malicious input.
function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}


/* ================================================================
   SECTION 4 — VALIDATION HELPERS
   Safe to define at page load — pure logic, no DOM queries.
   Each validator returns true (valid) or false (invalid) and
   applies .error / .success CSS classes to the input element.
================================================================ */

function setFieldState(inputEl, errorEl, valid, message) {
  inputEl.classList.toggle('error',   !valid);
  inputEl.classList.toggle('success',  valid);
  errorEl.textContent = message;
  errorEl.classList.toggle('visible', !valid);
  return valid;
}

// Name — at least 2 non-whitespace characters
function validateName(val, inputEl, errorEl) {
  const ok = val.trim().length >= 2;
  return setFieldState(inputEl, errorEl, ok,
    'Please enter your full name (at least 2 characters).');
}

// Email — must match a basic email pattern
function validateEmail(val, inputEl, errorEl) {
  const ok = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val.trim());
  return setFieldState(inputEl, errorEl, ok,
    'Please enter a valid email address.');
}

// Age — whole number between 1 and 120
function validateAge(val, inputEl, errorEl) {
  const n  = Number(val);
  const ok = Number.isInteger(n) && n >= 1 && n <= 120;
  return setFieldState(inputEl, errorEl, ok,
    'Please enter a valid age (1–120).');
}

// Organization — at least 2 non-whitespace characters
function validateOrg(val, inputEl, errorEl) {
  const ok = val.trim().length >= 2;
  return setFieldState(inputEl, errorEl, ok,
    '⚠ Please enter your institution or organization.');
}

// Phone — optional field.
// Empty → always valid (clears styling). Filled → loose phone pattern.
function validatePhone(val, inputEl, errorEl) {
  if (!val.trim()) {
    inputEl.classList.remove('error', 'success');
    errorEl.classList.remove('visible');
    return true;
  }
  const ok = /^[\d\s\-\+\(\)\.]{7,20}$/.test(val.trim());
  return setFieldState(inputEl, errorEl, ok,
    'Phone number format looks invalid.');
}


/* ================================================================
   SECTION 5 — renderDirectory PLACEHOLDER
   Declared here as `let` so that:
     • showPage() can call renderDirectory() on return visits
       (after initForms has assigned the real function to it)
     • initForms() can assign the real implementation below
================================================================ */

let renderDirectory;


/* ================================================================
   SECTION 6 — initForms()
   ─────────────────────────────────────────────────────────────────
   ↓↓↓  THIS IS WHERE initForms() IS PLACED  ↓↓↓

   The function is DEFINED here so JavaScript knows it exists,
   but its BODY does NOT execute until showPage('forms') calls it
   for the very first time.

   WHY: Every getElementById call inside would return null if run
   at page load, because the forms page starts hidden (display:none).
   Deferring to initForms() guarantees all elements exist before
   we attach any event listeners to them.
================================================================ */

function initForms() {    // ← OPENING brace of initForms()

  /* ------------------------------------------------------------------
     6a. DOM REFERENCES
     All getElementById calls live here — safely deferred until the
     forms page is visible for the first time.
  ------------------------------------------------------------------ */
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


  /* ------------------------------------------------------------------
     6b. LIVE VALIDATION
     Each field is validated as soon as the user clicks away from it
     (on the 'blur' event), giving instant feedback before submit.
  ------------------------------------------------------------------ */
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


  /* ------------------------------------------------------------------
     6c. SUBMIT BUTTON
     Re-validates all fields on click. If everything passes, builds
     the attendee object, saves to localStorage, resets the form,
     shows the success toast, and refreshes the directory.
  ------------------------------------------------------------------ */
  document.getElementById('submitBtn').addEventListener('click', () => {

    // Run every validator — always check all fields before stopping
    const v1 = validateName(nameInput.value,   nameInput,  errName);
    const v2 = validateEmail(emailInput.value, emailInput, errEmail);
    const v3 = validateAge(ageInput.value,     ageInput,   errAge);
    const v4 = validateOrg(orgInput.value,     orgInput,   errOrg);
    const v5 = validatePhone(phoneInput.value, phoneInput, errPhone);

    // Abort if any required field failed
    if (!(v1 && v2 && v3 && v4 && v5)) return;

    // Build the attendee object — this is what gets stored as JSON
    const attendee = {
      id:        generateId(),
      name:      nameInput.value.trim(),
      email:     emailInput.value.trim(),
      age:       Number(ageInput.value),
      org:       orgInput.value.trim(),
      phone:     phoneInput.value.trim(),
      timestamp: new Date().toISOString()
    };

    // Append to the existing list and save back to localStorage
    const list = loadAttendees();
    list.push(attendee);
    saveAttendees(list);

    // Clear all form inputs and remove validation styling
    [nameInput, emailInput, ageInput, orgInput, phoneInput].forEach(el => {
      el.value = '';
      el.classList.remove('success', 'error');
    });

    // Show green success toast, auto-hide after 3.5 seconds
    const toast = document.getElementById('successToast');
    toast.classList.add('visible');
    setTimeout(() => toast.classList.remove('visible'), 3500);

    // Refresh the attendee directory to show the new entry
    renderDirectory();
  });


  /* ------------------------------------------------------------------
     6d. renderDirectory — REAL DEFINITION
     Assigned to the outer `let renderDirectory` from Section 5,
     so showPage() can also call it on subsequent return visits.
  ------------------------------------------------------------------ */
  const attendeeGrid = document.getElementById('attendeeGrid');
  const emptyState   = document.getElementById('emptyState');
  const countDisplay = document.getElementById('countDisplay');
  const searchInput  = document.getElementById('searchInput');

  renderDirectory = function(filter = '') {
    const list  = loadAttendees();
    const query = filter.toLowerCase().trim();

    // Apply search filter when a query is present
    const filtered = query
      ? list.filter(a =>
          a.name.toLowerCase().includes(query) ||
          a.org.toLowerCase().includes(query)
        )
      : list;

    // Update the count label
    countDisplay.textContent = filtered.length;

    // Remove all existing attendee cards (keep emptyState div)
    [...attendeeGrid.querySelectorAll('.attendee-card')].forEach(el => el.remove());

    // Show empty state if no attendees match the query
    if (filtered.length === 0) {
      emptyState.style.display = '';
      return;
    }

    emptyState.style.display = 'none';

    // Build and insert one card per attendee
    filtered.forEach((a, idx) => {
      const card = document.createElement('div');
      card.className = 'attendee-card';
      card.style.animationDelay = `${idx * 0.04}s`;  // stagger the slide-in

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
        </div>`;

      attendeeGrid.appendChild(card);
    });

    // Attach listeners to the freshly rendered edit/delete buttons
    attendeeGrid.querySelectorAll('.btn-edit').forEach(btn =>
      btn.addEventListener('click', () => openEditModal(btn.dataset.id)));

    attendeeGrid.querySelectorAll('.btn-delete').forEach(btn =>
      btn.addEventListener('click', () => deleteAttendee(btn.dataset.id)));
  };


  /* ------------------------------------------------------------------
     6e. SEARCH INPUT
     Filters the directory in real time as the user types.
  ------------------------------------------------------------------ */
  searchInput.addEventListener('input', () => renderDirectory(searchInput.value));


  /* ------------------------------------------------------------------
     6f. DELETE
     Shows a confirmation dialog, removes the attendee from
     localStorage, and re-renders the directory.
  ------------------------------------------------------------------ */
  function deleteAttendee(id) {
    if (!confirm('Remove this attendee from the directory?')) return;
    saveAttendees(loadAttendees().filter(a => a.id !== id));
    renderDirectory(searchInput.value);
  }


  /* ------------------------------------------------------------------
     6g. EDIT MODAL
     Opens pre-filled with the selected attendee's data.
     Re-validates on "Save Changes" before writing back to localStorage.
  ------------------------------------------------------------------ */
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

  let editingId = null;  // tracks which attendee is currently being edited

  function openEditModal(id) {
    const a = loadAttendees().find(a => a.id === id);
    if (!a) return;

    editingId = id;

    // Pre-fill all modal fields with the attendee's existing data
    editNameEl.value  = a.name;
    editEmailEl.value = a.email;
    editAgeEl.value   = a.age;
    editOrgEl.value   = a.org;
    editPhoneEl.value = a.phone || '';

    // Clear any leftover validation styling from a previous edit
    [editNameEl, editEmailEl, editAgeEl, editOrgEl, editPhoneEl]
      .forEach(el => el.classList.remove('error', 'success'));
    [editErrName, editErrEmail, editErrAge, editErrOrg]
      .forEach(el => el.classList.remove('visible'));

    editModal.classList.add('open');
  }

  function closeEditModal() {
    editModal.classList.remove('open');
    editingId = null;
  }

  // Close on Cancel button
  document.getElementById('cancelEdit').addEventListener('click', closeEditModal);

  // Close when clicking the dark backdrop outside the modal box
  editModal.addEventListener('click', e => {
    if (e.target === editModal) closeEditModal();
  });

  // Save Changes — validate first, then overwrite the record in localStorage
  document.getElementById('saveEdit').addEventListener('click', () => {
    const v1 = validateName(editNameEl.value,   editNameEl,  editErrName);
    const v2 = validateEmail(editEmailEl.value, editEmailEl, editErrEmail);
    const v3 = validateAge(editAgeEl.value,     editAgeEl,   editErrAge);
    const v4 = validateOrg(editOrgEl.value,     editOrgEl,   editErrOrg);

    if (!(v1 && v2 && v3 && v4)) return;

    // Map over the list, replacing only the matching attendee
    const updated = loadAttendees().map(a => {
      if (a.id !== editingId) return a;
      return {
        ...a,                              // keep id and timestamp unchanged
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


  /* ------------------------------------------------------------------
     6h. INITIAL RENDER
     Called once at the very end of initForms() to display any
     attendees already saved in localStorage from a previous visit.
  ------------------------------------------------------------------ */
  renderDirectory();

} // ← CLOSING brace of initForms()
  //   Nothing executes below this line at page load.
  //   The entire flow starts from showPage() → initForms().