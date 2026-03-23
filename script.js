document.addEventListener("DOMContentLoaded", () => {
  "use strict";

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
              <th>Name</th><th>Email</th><th>Age</th><th>Organization/Address</th><th>Phone</th><th>Actions</th>
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

if (document.getElementById("title")) {

    const form = document.querySelector("form");

    form.addEventListener("submit", function(e) {
        e.preventDefault();

        let title = document.getElementById("title").value;
        let category = document.getElementById("category").value;
        let duration = document.getElementById("duration").value;
        let price = document.getElementById("price").value;
        let speaker = document.getElementById("speaker").value;

        if (!title || !category || !duration || !price) {
            alert("Please fill all required fields");
            return;
        }

        let session = {
            id: Date.now(),
            title,
            category,
            duration,
            price,
            speaker
        };

        let data = JSON.parse(localStorage.getItem("sessions")) || [];
        data.push(session);
        localStorage.setItem("sessions", JSON.stringify(data));

        displayData();
        form.reset();
    });

    function displayData(filter = "") {
        let data = JSON.parse(localStorage.getItem("sessions")) || [];
        let table = document.getElementById("tableBody");

        if (!table) return;

        table.innerHTML = "";

        data
        .filter(item =>
            item.title.toLowerCase().includes(filter.toLowerCase()) ||
            item.category.toLowerCase().includes(filter.toLowerCase())
        )
        .forEach(item => {
            table.innerHTML += `
                <tr>
                    <td>${item.id}</td>
                    <td>${item.title}</td>
                    <td>${item.category}</td>
                    <td>${item.duration}</td>
                    <td>${item.price}</td>
                    <td>${item.speaker || ""}</td>
                </tr>
            `;
        });
    }

    displayData();

    const search = document.getElementById("search");
    if (search) {
        search.addEventListener("keyup", function() {
            displayData(this.value);
        });
    }
}
