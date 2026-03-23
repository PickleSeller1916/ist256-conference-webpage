document.addEventListener("DOMContentLoaded", () => {
  "use strict";

  initMemberForm();
  initSessionCatalog();

  function initMemberForm() {
    const STORAGE_KEY = "conference_members_v2";
    const form = document.getElementById("f");
    if (!form) return;

    const fields = {
      name: document.getElementById("name"),
      email: document.getElementById("email"),
      age: document.getElementById("age"),
      org: document.getElementById("org"),
      phone: document.getElementById("phone"),
    };

    if (!fields.name || !fields.email || !fields.age || !fields.org || !fields.phone) {
      return;
    }

    const saveBtn = form.querySelector("button");
    let editId = null;

    const ui = ensureResultsUI();
    const tbody = ui.tbody;
    const cancelBtn = ui.cancelBtn;

    let members = loadMembers();
    render();

    if (saveBtn) {
      saveBtn.type = "button";
      saveBtn.addEventListener("click", submitForm);
    }

    form.addEventListener("submit", (e) => {
      e.preventDefault();
      submitForm();
    });

    cancelBtn.addEventListener("click", resetForm);

    tbody.addEventListener("click", (e) => {
      const btn = e.target.closest("button[data-action]");
      if (!btn) return;

      const id = btn.dataset.id;
      if (btn.dataset.action === "edit") startEdit(id);
      if (btn.dataset.action === "delete") removeMember(id);
    });

    function submitForm() {
      clearErrors();
      if (!validate()) return;

      const data = {
        id: editId || makeId(),
        name: fields.name.value.trim(),
        email: fields.email.value.trim(),
        age: fields.age.value.trim(),
        org: fields.org.value.trim(),
        phone: fields.phone.value.trim(),
      };

      if (editId) {
        members = members.map((m) => (m.id === editId ? data : m));
      } else {
        members.push(data);
      }

      saveMembers(members);
      render();
      resetForm();
    }

    function validate() {
      let ok = true;

      ["name", "email", "age", "org"].forEach((key) => {
        const input = fields[key];
        if (!input.value.trim()) {
          showError(input, "Required");
          ok = false;
        }
      });

      const email = fields.email.value.trim();
      const validEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
      if (email && !validEmail) {
        showError(fields.email, "Invalid email");
        ok = false;
      }

      return ok;
    }

    function showError(input, text) {
      input.classList.add("is-invalid");
      const msg = document.createElement("div");
      msg.className = "invalid-feedback d-block";
      msg.dataset.err = "1";
      msg.textContent = text;
      input.insertAdjacentElement("afterend", msg);
    }

    function clearErrors() {
      Object.values(fields).forEach((f) => f.classList.remove("is-invalid"));
      form.querySelectorAll("[data-err='1']").forEach((n) => n.remove());
    }

    function startEdit(id) {
      const m = members.find((x) => x.id === id);
      if (!m) return;

      fields.name.value = m.name;
      fields.email.value = m.email;
      fields.age.value = m.age;
      fields.org.value = m.org;
      fields.phone.value = m.phone || "";

      editId = id;
      if (saveBtn) saveBtn.textContent = "Update Member";
      cancelBtn.classList.remove("d-none");
      window.scrollTo({ top: 0, behavior: "smooth" });
    }

    function removeMember(id) {
      members = members.filter((m) => m.id !== id);
      saveMembers(members);
      render();
      if (editId === id) resetForm();
    }

    function render() {
      tbody.innerHTML = "";

      if (!members.length) {
        tbody.innerHTML =
          '<tr><td colspan="6" class="text-center text-muted">No entries yet.</td></tr>';
        return;
      }

      members.forEach((m) => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
          <td>${safe(m.name)}</td>
          <td>${safe(m.email)}</td>
          <td>${safe(m.age)}</td>
          <td>${safe(m.org)}</td>
          <td>${safe(m.phone || "-")}</td>
          <td>
            <button type="button" class="btn btn-sm btn-warning me-1" data-action="edit" data-id="${m.id}">Edit</button>
            <button type="button" class="btn btn-sm btn-danger" data-action="delete" data-id="${m.id}">Delete</button>
          </td>
        `;
        tbody.appendChild(tr);
      });
    }

    function ensureResultsUI() {
      let cancel = document.getElementById("cancelEdit");
      if (!cancel) {
        cancel = document.createElement("button");
        cancel.type = "button";
        cancel.id = "cancelEdit";
        cancel.className = "btn btn-secondary ms-2 d-none";
        cancel.textContent = "Cancel";
        form.appendChild(cancel);
      }

      let tb = document.getElementById("memberTableBody");
      if (!tb) {
        const wrap = document.createElement("div");
        wrap.className = "mt-4 table-responsive";
        wrap.innerHTML = `
          <h4>Submitted Members</h4>
          <table class="table table-striped">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Age</th>
                <th>Organization/Address</th>
                <th>Phone</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody id="memberTableBody"></tbody>
          </table>
        `;
        form.insertAdjacentElement("afterend", wrap);
        tb = wrap.querySelector("#memberTableBody");
      }

      return { tbody: tb, cancelBtn: cancel };
    }

    function resetForm() {
      form.reset();
      clearErrors();
      editId = null;
      if (saveBtn) saveBtn.textContent = "Save and submit form";
      cancelBtn.classList.add("d-none");
    }

    function loadMembers() {
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        const arr = raw ? JSON.parse(raw) : [];
        return Array.isArray(arr) ? arr : [];
      } catch {
        return [];
      }
    }

    function saveMembers(arr) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(arr));
    }

    function makeId() {
      return "m_" + Date.now() + "_" + Math.random().toString(36).slice(2, 8);
    }

    function safe(v) {
      return String(v)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#39;");
    }
  }

  function initSessionCatalog() {
    const STORAGE_KEY = "conference_sessions_v1";

    const titleInput = document.getElementById("title");
    const categoryInput = document.getElementById("category");
    const durationInput = document.getElementById("duration");
    const priceInput = document.getElementById("price");
    const speakerInput = document.getElementById("speaker");
    const tableBody = document.getElementById("tableBody");
    const searchElement = document.getElementById("search");

    if (
      !titleInput ||
      !categoryInput ||
      !durationInput ||
      !priceInput ||
      !speakerInput ||
      !tableBody
    ) {
      return;
    }

    const form = titleInput.closest("form");
    if (!form) return;

    const table = tableBody.closest("table");
    const idDisplay = form.querySelector('input[disabled]');
    const submitBtn = form.querySelector('button[type="submit"]');
    const searchInput = window.jQuery ? $("#search") : null;

    let sessions = loadSessions();
    let editId = null;

    addActionsHeader();
    addCancelButton();
    renderSessions(sessions);

    form.addEventListener("submit", (e) => {
      e.preventDefault();
      submitSessionForm();
    });

    if (searchInput) {
      searchInput.on("input", function () {
        renderSessions(filterSessions($(this).val()));
      });
    } else if (searchElement) {
      searchElement.addEventListener("input", function () {
        renderSessions(filterSessions(this.value));
      });
    }

    tableBody.addEventListener("click", (e) => {
      const btn = e.target.closest("button[data-action]");
      if (!btn) return;

      const id = btn.dataset.id;
      if (btn.dataset.action === "edit") startEdit(id);
      if (btn.dataset.action === "delete") removeSession(id);
    });

    function submitSessionForm() {
      clearSessionErrors();
      if (!validateSessionForm()) return;

      const session = {
        id: editId || makeSessionId(),
        title: titleInput.value.trim(),
        category: categoryInput.value.trim(),
        duration: durationInput.value.trim(),
        price: priceInput.value.trim(),
        speaker: speakerInput.value.trim(),
      };

      if (editId) {
        sessions = sessions.map((item) => (item.id === editId ? session : item));
      } else {
        sessions.push(session);
      }

      saveSessions(sessions);
      renderSessions(filterSessions(searchElement ? searchElement.value : ""));
      resetSessionForm();
    }

    function validateSessionForm() {
      let ok = true;

      [titleInput, categoryInput, durationInput, priceInput].forEach((input) => {
        if (!input.value.trim()) {
          showSessionError(input, "Required");
          ok = false;
        }
      });

      if (priceInput.value.trim() && Number(priceInput.value) < 0) {
        showSessionError(priceInput, "Fee must be 0 or more");
        ok = false;
      }

      return ok;
    }

    function showSessionError(input, text) {
      input.classList.add("is-invalid");
      const msg = document.createElement("div");
      msg.className = "invalid-feedback d-block";
      msg.setAttribute("data-catalog-err", "1");
      msg.textContent = text;
      input.insertAdjacentElement("afterend", msg);
    }

    function clearSessionErrors() {
      [titleInput, categoryInput, durationInput, priceInput, speakerInput].forEach((input) => {
        input.classList.remove("is-invalid");
      });
      form.querySelectorAll("[data-catalog-err='1']").forEach((node) => node.remove());
    }

    function renderSessions(list) {
      tableBody.innerHTML = "";

      if (!list.length) {
        tableBody.innerHTML =
          '<tr><td colspan="7" class="text-center text-muted">No sessions found.</td></tr>';
        return;
      }

      list.forEach((session) => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
          <td>${safeSession(session.id)}</td>
          <td>${safeSession(session.title)}</td>
          <td>${safeSession(session.category)}</td>
          <td>${safeSession(session.duration)}</td>
          <td>$${safeSession(session.price)}</td>
          <td>${safeSession(session.speaker || "-")}</td>
          <td>
            <button type="button" class="btn btn-sm btn-warning me-1" data-action="edit" data-id="${session.id}">Edit</button>
            <button type="button" class="btn btn-sm btn-danger" data-action="delete" data-id="${session.id}">Delete</button>
          </td>
        `;
        tableBody.appendChild(tr);
      });
    }

    function startEdit(id) {
      const session = sessions.find((item) => item.id === id);
      if (!session) return;

      editId = id;
      if (idDisplay) idDisplay.value = session.id;
      titleInput.value = session.title;
      categoryInput.value = session.category;
      durationInput.value = session.duration;
      priceInput.value = session.price;
      speakerInput.value = session.speaker || "";

      if (submitBtn) submitBtn.textContent = "Update Session";
      const cancelBtn = document.getElementById("cancelCatalogEdit");
      if (cancelBtn) cancelBtn.classList.remove("d-none");
      window.scrollTo({ top: 0, behavior: "smooth" });
    }

    function removeSession(id) {
      sessions = sessions.filter((item) => item.id !== id);
      saveSessions(sessions);
      renderSessions(filterSessions(searchElement ? searchElement.value : ""));

      if (editId === id) {
        resetSessionForm();
      }
    }

    function resetSessionForm() {
      form.reset();
      clearSessionErrors();
      editId = null;
      if (idDisplay) idDisplay.value = "Auto-generated";
      if (submitBtn) submitBtn.textContent = "Submit";

      const cancelBtn = document.getElementById("cancelCatalogEdit");
      if (cancelBtn) cancelBtn.classList.add("d-none");
    }

    function filterSessions(query) {
      const term = String(query || "").trim().toLowerCase();
      if (!term) return sessions;

      return sessions.filter((session) => {
        return (
          session.title.toLowerCase().includes(term) ||
          session.category.toLowerCase().includes(term)
        );
      });
    }

    function addActionsHeader() {
      if (!table) return;

      const headRow = table.querySelector("thead tr");
      if (!headRow) return;

      const hasActions = Array.from(headRow.children).some(
        (th) => th.textContent.trim() === "Actions"
      );
      if (hasActions) return;

      const th = document.createElement("th");
      th.textContent = "Actions";
      headRow.appendChild(th);
    }

    function addCancelButton() {
      if (document.getElementById("cancelCatalogEdit") || !submitBtn) return;

      const cancelBtn = document.createElement("button");
      cancelBtn.type = "button";
      cancelBtn.id = "cancelCatalogEdit";
      cancelBtn.className = "btn btn-secondary ms-2 d-none";
      cancelBtn.textContent = "Cancel";

      submitBtn.insertAdjacentElement("afterend", cancelBtn);
      cancelBtn.addEventListener("click", resetSessionForm);
    }

    function loadSessions() {
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        const arr = raw ? JSON.parse(raw) : [];
        return Array.isArray(arr) ? arr : [];
      } catch {
        return [];
      }
    }

    function saveSessions(arr) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(arr));
    }

    function makeSessionId() {
      return "SES-" + Date.now().toString().slice(-6);
    }

    function safeSession(value) {
      return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#39;");
    }
  }
});
