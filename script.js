document.addEventListener("DOMContentLoaded", () => {
  "use strict";

  initMemberForm();
  initSessionCatalog();
  initShoppingCartPage();

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
          showError(input, "Please complete this field.");
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
          showSessionError(input, "Please complete this field.");
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

  function initShoppingCartPage() {
    const searchInput = document.getElementById("searchInput");
    const productDisplay = document.getElementById("productDisplay");
    const cartItemsContainer = document.getElementById("cartItemsContainer");
    const transportDataBtn = document.getElementById("transportDataBtn");
    const productForm = document.getElementById("productForm");
    const resetProductFormBtn = document.getElementById("resetProductForm");
    const formFields = {
      id: document.getElementById("productId"),
      title: document.getElementById("productTitle"),
      category: document.getElementById("productCategory"),
      duration: document.getElementById("productDuration"),
      price: document.getElementById("productPrice"),
      speaker: document.getElementById("productSpeaker"),
      description: document.getElementById("productDescription")
    };

    if (!searchInput || !productDisplay || !cartItemsContainer) {
      return;
    }

    const PRODUCT_STORAGE_KEY = "conference_store_products_v1";
    const CART_STORAGE_KEY = "conference_cart_items_v1";
    let storageEnabled = true;

    const starterProducts = [
      {
        id: "CONF-101",
        title: "Opening Keynote Access",
        category: "Keynote Session",
        duration: "60 Minutes",
        price: "49.00",
        speaker: "Dr. Maya Bennett",
        description: "Reserved seating for the conference opening keynote focused on innovation strategy."
      },
      {
        id: "CONF-205",
        title: "AI in Event Planning Workshop",
        category: "Workshop",
        duration: "90 Minutes",
        price: "79.00",
        speaker: "Jordan Lee",
        description: "Hands-on workshop covering automation, attendee insights, and AI tools for conference teams."
      },
      {
        id: "CONF-310",
        title: "Speaker Success Toolkit",
        category: "Event Materials",
        duration: "Digital Download",
        price: "25.00",
        speaker: "Conference Staff",
        description: "Downloadable presentation templates, planning checklists, and speaker briefing materials."
      },
      {
        id: "CONF-415",
        title: "VIP Networking Lunch",
        category: "Networking Event",
        duration: "75 Minutes",
        price: "59.00",
        speaker: "Hosted Experience",
        description: "Small-group networking lunch with speakers, sponsors, and conference organizers."
      }
    ];

    seedProducts();

    let allProducts = loadProducts();
    let cart = loadCart();

    const statusArea = createStatusArea();
    const payloadArea = createPayloadArea();

    renderProducts(allProducts);
    renderCart();

    if (window.jQuery) {
      window.jQuery(searchInput).on("input", function () {
        renderProducts(filterProducts(this.value));
      });
    } else {
      searchInput.addEventListener("input", function () {
        renderProducts(filterProducts(this.value));
      });
    }

    if (productForm) {
      productForm.addEventListener("submit", (event) => {
        event.preventDefault();
        saveProductFromForm();
      });
    }

    if (resetProductFormBtn) {
      resetProductFormBtn.addEventListener("click", resetProductForm);
    }

    productDisplay.addEventListener("click", (event) => {
      const addButton = event.target.closest("button[data-product-id]");
      const editButton = event.target.closest("button[data-edit-id]");
      const deleteButton = event.target.closest("button[data-delete-id]");

      if (addButton) {
        addToCart(addButton.dataset.productId);
        return;
      }

      if (editButton) {
        loadProductIntoForm(editButton.dataset.editId);
        return;
      }

      if (deleteButton) {
        deleteProduct(deleteButton.dataset.deleteId);
      }
    });

    cartItemsContainer.addEventListener("click", (event) => {
      const button = event.target.closest("button[data-remove-id]");
      if (!button) return;

      removeFromCart(button.dataset.removeId);
    });

    if (transportDataBtn) {
      transportDataBtn.addEventListener("click", transportCartData);
    }

    function seedProducts() {
      const catalogSessions = loadCatalogSessions();
      const existing = readJson(PRODUCT_STORAGE_KEY, []);
      const merged = [...starterProducts];

      catalogSessions.forEach((session) => {
        if (!validateProductFields(session)) return;
        if (!merged.some((item) => item.id === session.id)) {
          merged.push({
            id: session.id,
            title: session.title.trim(),
            category: session.category.trim(),
            duration: session.duration.trim(),
            price: String(session.price).trim(),
            speaker: (session.speaker || "").trim(),
            description: `${session.category} session for conference attendees.`
          });
        }
      });

      existing.forEach((item) => {
        if (!validateProductFields(item)) return;
        if (!merged.some((entry) => entry.id === item.id)) {
          merged.push(item);
        }
      });

      writeJson(PRODUCT_STORAGE_KEY, merged);
    }

    function loadCatalogSessions() {
      const sessions = readJson("conference_sessions_v1", []);
      return Array.isArray(sessions) ? sessions : [];
    }

    function loadProducts() {
      const products = readJson(PRODUCT_STORAGE_KEY, []);
      return Array.isArray(products) ? products.filter(validateProductFields) : [];
    }

    function loadCart() {
      const items = readJson(CART_STORAGE_KEY, []);
      return Array.isArray(items) ? items : [];
    }

    function saveCart() {
      writeJson(CART_STORAGE_KEY, cart);
    }

    function filterProducts(query) {
      const term = String(query || "").trim().toLowerCase();
      if (!term) return allProducts;

      if (window.jQuery) {
        return window.jQuery.grep(allProducts, (product) => {
          return [product.title, product.category, product.speaker, product.description]
            .join(" ")
            .toLowerCase()
            .includes(term);
        });
      }

      return allProducts.filter((product) => {
        return [product.title, product.category, product.speaker, product.description]
          .join(" ")
          .toLowerCase()
          .includes(term);
      });
    }

    function renderProducts(products) {
      productDisplay.innerHTML = "";

      if (!products.length) {
        productDisplay.innerHTML = '<div class="col-12"><div class="alert alert-warning mb-0">No conference items matched your search.</div></div>';
        return;
      }

      products.forEach((product) => {
        const card = document.createElement("div");
        card.className = "col-md-6";
        card.innerHTML = `
          <article class="card h-100 border-0 shadow-sm">
            <div class="card-body">
              <div class="d-flex justify-content-between align-items-start gap-3">
                <div>
                  <span class="badge text-bg-primary mb-2">${safeCart(product.category)}</span>
                  <h5 class="card-title mb-1">${safeCart(product.title)}</h5>
                  <p class="text-muted small mb-2">ID: ${safeCart(product.id)}</p>
                </div>
                <strong class="text-primary">$${formatPrice(product.price)}</strong>
              </div>
              <p class="mb-2">${safeCart(product.description || "Conference item ready for attendee checkout.")}</p>
              <p class="small text-muted mb-3">Duration: ${safeCart(product.duration)} | Speaker: ${safeCart(product.speaker || "TBA")}</p>
              <div class="d-grid gap-2">
                <button type="button" class="btn btn-outline-primary" data-product-id="${safeAttr(product.id)}">Add to Cart</button>
                <button type="button" class="btn btn-outline-secondary" data-edit-id="${safeAttr(product.id)}">Load Into Form</button>
                <button type="button" class="btn btn-outline-danger" data-delete-id="${safeAttr(product.id)}">Delete Product</button>
              </div>
            </div>
          </article>
        `;
        productDisplay.appendChild(card);
      });
    }

    function renderCart() {
      cartItemsContainer.innerHTML = "";

      if (!cart.length) {
        cartItemsContainer.innerHTML = '<p class="text-muted small">No items added yet.</p>';
        payloadArea.value = "[]";
        return;
      }

      cart.forEach((item) => {
        const row = document.createElement("div");
        row.className = "border rounded p-3 mb-3";
        row.innerHTML = `
          <div class="d-flex justify-content-between gap-3">
            <div>
              <h6 class="mb-1">${safeCart(item.title)}</h6>
              <p class="small text-muted mb-1">${safeCart(item.category)} | ${safeCart(item.duration)}</p>
              <p class="small mb-0">Speaker: ${safeCart(item.speaker || "TBA")}</p>
            </div>
            <div class="text-end">
              <div class="fw-semibold mb-2">$${formatPrice(item.price)}</div>
              <button type="button" class="btn btn-sm btn-outline-danger" data-remove-id="${safeAttr(item.id)}">Remove</button>
            </div>
          </div>
        `;
        cartItemsContainer.appendChild(row);
      });

      const summary = document.createElement("div");
      summary.className = "alert alert-light border mb-0";
      summary.innerHTML = `
        <div class="d-flex justify-content-between">
          <span>Total Items</span>
          <strong>${cart.length}</strong>
        </div>
        <div class="d-flex justify-content-between">
          <span>Estimated Total</span>
          <strong>$${formatPrice(cart.reduce((sum, item) => sum + Number(item.price || 0), 0))}</strong>
        </div>
      `;
      cartItemsContainer.appendChild(summary);

      payloadArea.value = JSON.stringify(buildPayload(), null, 2);
    }

    function addToCart(productId) {
      const selected = allProducts.find((product) => product.id === productId);
      if (!selected) {
        showStatus("Unable to add the selected conference item.", "danger");
        return;
      }

      cart.push({
        id: selected.id,
        title: selected.title,
        category: selected.category,
        duration: selected.duration,
        price: formatPrice(selected.price),
        speaker: selected.speaker || "",
        addedAt: new Date().toISOString()
      });

      saveCart();
      renderCart();
      showStatus(`${selected.title} was added to the shopping cart.`, "success");
    }

    function removeFromCart(productId) {
      const index = cart.findIndex((item) => item.id === productId);
      if (index === -1) return;

      const removed = cart.splice(index, 1)[0];
      saveCart();
      renderCart();
      showStatus(`${removed.title} was removed from the shopping cart.`, "warning");
    }

    function deleteProduct(productId) {
      const productIndex = allProducts.findIndex((product) => product.id === productId);
      if (productIndex === -1) {
        showStatus("That conference product could not be found.", "danger");
        return;
      }

      const removedProduct = allProducts.splice(productIndex, 1)[0];
      cart = cart.filter((item) => item.id !== productId);

      writeJson(PRODUCT_STORAGE_KEY, allProducts);
      saveCart();
      renderProducts(filterProducts(searchInput.value));
      renderCart();

      if (formFields.id && formFields.id.value.trim() === productId) {
        resetProductForm();
      }

      showStatus(`${removedProduct.title} was deleted from the product collection.`, "warning");
    }

    function saveProductFromForm() {
      clearProductErrors();
      if (!validateProductForm()) {
        showStatus("Please correct the product form fields before saving.", "danger");
        return;
      }

      const product = {
        id: formFields.id.value.trim(),
        title: formFields.title.value.trim(),
        category: formFields.category.value.trim(),
        duration: formFields.duration.value.trim(),
        price: formatPrice(formFields.price.value.trim()),
        speaker: formFields.speaker.value.trim(),
        description: formFields.description.value.trim()
      };

      const existingIndex = allProducts.findIndex((item) => item.id === product.id);
      if (existingIndex >= 0) {
        allProducts[existingIndex] = product;
      } else {
        allProducts.push(product);
      }

      writeJson(PRODUCT_STORAGE_KEY, allProducts);
      renderProducts(filterProducts(searchInput.value));
      resetProductForm();
      showStatus(`${product.title} was saved to the product JSON collection.`, "success");
    }

    function validateProductForm() {
      let ok = true;

      if (!formFields.id.value.trim()) {
        showProductError(formFields.id, "Please enter a product ID.");
        ok = false;
      } else if (!/^[A-Za-z0-9-]+$/.test(formFields.id.value.trim())) {
        showProductError(formFields.id, "Use letters, numbers, or dashes only.");
        ok = false;
      }

      if (!formFields.title.value.trim()) {
        showProductError(formFields.title, "Please enter a product title.");
        ok = false;
      }

      if (!formFields.category.value.trim()) {
        showProductError(formFields.category, "Please enter a category.");
        ok = false;
      }

      if (!formFields.duration.value.trim()) {
        showProductError(formFields.duration, "Please enter a duration.");
        ok = false;
      }

      if (!formFields.price.value.trim()) {
        showProductError(formFields.price, "Please enter a price.");
        ok = false;
      } else if (Number(formFields.price.value) < 0) {
        showProductError(formFields.price, "Price must be 0 or more.");
        ok = false;
      }

      if (!formFields.description.value.trim()) {
        showProductError(formFields.description, "Please enter a description.");
        ok = false;
      }

      return ok;
    }

    function loadProductIntoForm(productId) {
      if (!productForm) return;

      const selected = allProducts.find((product) => product.id === productId);
      if (!selected) return;

      clearProductErrors();
      formFields.id.value = selected.id;
      formFields.title.value = selected.title;
      formFields.category.value = selected.category;
      formFields.duration.value = selected.duration;
      formFields.price.value = selected.price;
      formFields.speaker.value = selected.speaker || "";
      formFields.description.value = selected.description || "";
      window.scrollTo({ top: 0, behavior: "smooth" });
      showStatus(`${selected.title} loaded into the form for updates.`, "info");
    }

    function resetProductForm() {
      if (!productForm) return;
      productForm.reset();
      clearProductErrors();
    }

    function showProductError(input, message) {
      input.classList.add("is-invalid");
      const feedback = document.createElement("div");
      feedback.className = "invalid-feedback d-block";
      feedback.setAttribute("data-product-err", "1");
      feedback.textContent = message;
      input.insertAdjacentElement("afterend", feedback);
    }

    function clearProductErrors() {
      Object.values(formFields).forEach((field) => {
        if (field) {
          field.classList.remove("is-invalid");
        }
      });

      if (productForm) {
        productForm.querySelectorAll("[data-product-err='1']").forEach((node) => node.remove());
      }
    }

    function buildPayload() {
      return cart.map((item, index) => ({
        lineNumber: index + 1,
        productId: item.id,
        productName: item.title,
        category: item.category,
        duration: item.duration,
        speaker: item.speaker,
        price: Number(item.price),
        addedAt: item.addedAt
      }));
    }

    function buildRegistrationPayload(formData) {
      return {
        submittedAt: new Date().toISOString(),
        attendee: {
          name: formData.name,
          email: formData.email
        },
        participationType: formData.participationType,
        publicationPreference: formData.publicationPreference,
        sessionPreferences: formData.sessionPreferences,
        rsvpNotes: formData.notes,
        confirmAttendance: formData.confirmAttendance,
        itemCount: cart.length,
        orderTotal: Number(formatPrice(cart.reduce((sum, item) => sum + Number(item.price || 0), 0))),
        items: buildPayload()
      };
    }

    function transportCartData() {
      const payload = {
        submittedAt: new Date().toISOString(),
        itemCount: cart.length,
        orderTotal: Number(formatPrice(cart.reduce((sum, item) => sum + Number(item.price || 0), 0))),
        items: buildPayload()
      };

      payloadArea.value = JSON.stringify(payload, null, 2);

      if (!cart.length) {
        showStatus("Add at least one conference product before checkout.", "danger");
        return;
      }

      if (!window.jQuery || !window.jQuery.ajax) {
        showStatus("jQuery AJAX is not available on this page yet.", "danger");
        return;
      }

      showStatus("Preparing JSON payload for the future RESTful API...", "info");

      window.jQuery.ajax({
        url: "https://jsonplaceholder.typicode.com/posts",
        method: "POST",
        data: JSON.stringify(payload),
        contentType: "application/json; charset=UTF-8",
        dataType: "json",
        timeout: 4000
      }).done(() => {
        showStatus("Cart data transported successfully.", "success");
      }).fail(() => {
        showStatus("AJAX request prepared and attempted. The API endpoint is not active yet, so the JSON payload is shown below for submission testing.", "secondary");
      });
    }

    function mountInlineCheckoutSection() {
      const section = document.getElementById("inlineCheckoutSection");
      if (!section) return;

      section.insertAdjacentHTML(
        "beforeend",
        `
          <div class="row g-4 mt-1">
            <div class="col-lg-7">
              <form id="inlineCheckoutForm" novalidate>
                <div class="row g-3">
                  <div class="col-md-6">
                    <label for="inlineName" class="form-label">Full Name <span class="required-asterisk">*</span></label>
                    <input type="text" id="inlineName" name="name" class="form-control" placeholder="Jordan Lee">
                  </div>
                  <div class="col-md-6">
                    <label for="inlineEmail" class="form-label">Email Address <span class="required-asterisk">*</span></label>
                    <input type="email" id="inlineEmail" name="email" class="form-control" placeholder="jordan@example.com">
                  </div>
                  <div class="col-md-6">
                    <label for="inlineParticipation" class="form-label">Participation Type <span class="required-asterisk">*</span></label>
                    <select id="inlineParticipation" name="participationType" class="form-select">
                      <option value="">Select an option</option>
                      <option value="In-Person">In-Person</option>
                      <option value="Virtual">Virtual</option>
                      <option value="VIP">VIP</option>
                    </select>
                  </div>
                  <div class="col-md-6">
                    <label for="inlinePublication" class="form-label">Publication Preference <span class="required-asterisk">*</span></label>
                    <select id="inlinePublication" name="publicationPreference" class="form-select">
                      <option value="">Select a preference</option>
                      <option value="Public attendee list">Public attendee list</option>
                      <option value="Private attendee list">Private attendee list</option>
                      <option value="Email updates only">Email updates only</option>
                    </select>
                  </div>
                  <div class="col-12">
                    <label class="form-label">Session Preferences <span class="required-asterisk">*</span></label>
                    <div id="inlineSessionOptions"></div>
                  </div>
                  <div class="col-12">
                    <label for="inlineNotes" class="form-label">RSVP Notes</label>
                    <textarea id="inlineNotes" name="notes" rows="4" class="form-control" placeholder="Add arrival notes, accessibility requests, or other details."></textarea>
                  </div>
                  <div class="col-12">
                    <div class="form-check">
                      <input type="checkbox" id="inlineConfirm" name="confirmAttendance" class="form-check-input">
                      <label for="inlineConfirm" class="form-check-label">I confirm that the information above is correct. <span class="required-asterisk">*</span></label>
                    </div>
                  </div>
                  <div class="col-12 d-flex flex-wrap gap-2">
                    <button type="submit" class="btn btn-success">Submit Registration from Cart</button>
                    <button type="button" id="resetInlineCheckout" class="btn btn-outline-secondary">Reset Finalization Form</button>
                  </div>
                </div>
              </form>
              <div id="inlineCheckoutErrors" class="alert alert-danger small mt-3 d-none"></div>
              <div id="inlineCheckoutStatus" class="alert alert-info small mt-3">Use this form to submit your final conference registration directly from the shopping cart.</div>
            </div>
            <div class="col-lg-5">
              <h5>Registration JSON</h5>
              <p class="small text-muted">This JSON object is prepared and sent to the RESTful API using AJAX.</p>
              <textarea id="inlineCheckoutPayload" class="form-control" rows="18" readonly></textarea>
            </div>
          </div>
        `
      );

      const form = document.getElementById("inlineCheckoutForm");
      const sessionOptions = document.getElementById("inlineSessionOptions");
      const errorsBox = document.getElementById("inlineCheckoutErrors");
      const statusBox = document.getElementById("inlineCheckoutStatus");
      const payloadBox = document.getElementById("inlineCheckoutPayload");
      const resetBtn = document.getElementById("resetInlineCheckout");

      renderSessionOptions();

      form.addEventListener("submit", (event) => {
        event.preventDefault();
        submitInlineCheckout();
      });

      resetBtn.addEventListener("click", () => {
        form.reset();
        errorsBox.classList.add("d-none");
        errorsBox.innerHTML = "";
        payloadBox.value = "";
        statusBox.className = "alert alert-info small mt-3";
        statusBox.textContent = "Use this form to submit your final conference registration directly from the shopping cart.";
      });

      function renderSessionOptions() {
        const sessionTitles = [...new Set(cart.map((item) => item.title).filter(Boolean))];
        const fallbackSessions = [
          "Opening Keynote",
          "AI in Event Planning Workshop",
          "VIP Networking Lunch"
        ];
        const allSessions = [...new Set([...sessionTitles, ...fallbackSessions])];

        sessionOptions.innerHTML = allSessions
          .map((title, index) => {
            return `
              <div class="form-check">
                <input type="checkbox" class="form-check-input" id="inlineSession${index}" name="sessionPreference" value="${safeAttr(title)}">
                <label class="form-check-label" for="inlineSession${index}">${safeCart(title)}</label>
              </div>
            `;
          })
          .join("");
      }

      function submitInlineCheckout() {
        const formData = {
          name: form.elements.name.value.trim(),
          email: form.elements.email.value.trim(),
          participationType: form.elements.participationType.value,
          publicationPreference: form.elements.publicationPreference.value,
          notes: form.elements.notes.value.trim(),
          confirmAttendance: form.elements.confirmAttendance.checked,
          sessionPreferences: Array.from(
            form.querySelectorAll("input[name='sessionPreference']:checked")
          ).map((input) => input.value)
        };

        const problems = validateInlineCheckout(formData);
        if (problems.length) {
          errorsBox.classList.remove("d-none");
          errorsBox.innerHTML = problems.map((problem) => `<div>${safeCart(problem)}</div>`).join("");
          statusBox.className = "alert alert-danger small mt-3";
          statusBox.textContent = "Please fix the finalization form before submitting.";
          return;
        }

        errorsBox.classList.add("d-none");
        errorsBox.innerHTML = "";

        const payload = buildRegistrationPayload(formData);
        payloadBox.value = JSON.stringify(payload, null, 2);

        window.jQuery.ajax({
          url: "https://jsonplaceholder.typicode.com/posts",
          method: "POST",
          data: JSON.stringify(payload),
          contentType: "application/json; charset=UTF-8",
          dataType: "json",
          timeout: 5000
        }).done(() => {
          statusBox.className = "alert alert-success small mt-3";
          statusBox.textContent = "Your registration was prepared and sent by AJAX directly from the shopping cart page.";
        }).fail(() => {
          statusBox.className = "alert alert-secondary small mt-3";
          statusBox.textContent = "The registration JSON was created and an AJAX request was attempted from the shopping cart page.";
        });
      }
    }

    function updateInlineCheckoutSessions() {
      const sessionOptions = document.getElementById("inlineSessionOptions");
      if (!sessionOptions) return;

      const sessionTitles = [...new Set(cart.map((item) => item.title).filter(Boolean))];
      const fallbackSessions = [
        "Opening Keynote",
        "AI in Event Planning Workshop",
        "VIP Networking Lunch"
      ];
      const allSessions = [...new Set([...sessionTitles, ...fallbackSessions])];

      sessionOptions.innerHTML = allSessions
        .map((title, index) => {
          return `
            <div class="form-check">
              <input type="checkbox" class="form-check-input" id="inlineSession${index}" name="sessionPreference" value="${safeAttr(title)}">
              <label class="form-check-label" for="inlineSession${index}">${safeCart(title)}</label>
            </div>
          `;
        })
        .join("");
    }

    function validateInlineCheckout(data) {
      const problems = [];
      const validEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email);

      if (!cart.length) {
        problems.push("Add at least one conference item to the shopping cart.");
      }

      if (!data.name) {
        problems.push("Please enter your full name.");
      }

      if (!data.email || !validEmail) {
        problems.push("Please enter a valid email address.");
      }

      if (!data.participationType) {
        problems.push("Choose a participation type.");
      }

      if (!data.publicationPreference) {
        problems.push("Choose a publication preference.");
      }

      if (!data.sessionPreferences.length) {
        problems.push("Select at least one session preference.");
      }

      if (!data.confirmAttendance) {
        problems.push("Confirm that the registration information is correct.");
      }

      return problems;
    }

    function validateProductFields(product) {
      if (!product || typeof product !== "object") return false;

      const required = ["id", "title", "category", "duration", "price"];
      return required.every((key) => String(product[key] || "").trim() !== "") && Number(product.price) >= 0;
    }

    function createStatusArea() {
      let area = document.getElementById("cartStatus");
      if (area) return area;

      area = document.createElement("div");
      area.id = "cartStatus";
      area.className = "alert alert-info small mt-3";
      area.textContent = "Search the catalog and add conference products to your cart.";
      if (transportDataBtn) {
        transportDataBtn.insertAdjacentElement("afterend", area);
      } else {
        cartItemsContainer.parentElement.appendChild(area);
      }
      return area;
    }

    function createPayloadArea() {
      let wrapper = document.getElementById("payloadPreviewWrap");
      if (wrapper) {
        return wrapper.querySelector("textarea");
      }

      wrapper = document.createElement("section");
      wrapper.id = "payloadPreviewWrap";
      wrapper.className = "mt-4";
      wrapper.innerHTML = `
        <h5>JSON Payload Preview</h5>
        <p class="small text-muted">This document is prepared for transport to a future RESTful API using AJAX.</p>
        <textarea id="payloadPreview" class="form-control" rows="12" readonly></textarea>
      `;

      cartItemsContainer.parentElement.appendChild(wrapper);
      return wrapper.querySelector("textarea");
    }

    function showStatus(message, type) {
      const storageNote = storageEnabled
        ? ""
        : " Local storage is unavailable in this browser session, so data may not persist after refresh.";
      statusArea.className = `alert alert-${type} small mt-3`;
      statusArea.textContent = message + storageNote;
    }

    function readJson(key, fallback) {
      try {
        const raw = localStorage.getItem(key);
        return raw ? JSON.parse(raw) : fallback;
      } catch {
        storageEnabled = false;
        return fallback;
      }
    }

    function writeJson(key, value) {
      try {
        localStorage.setItem(key, JSON.stringify(value));
        storageEnabled = true;
        return true;
      } catch {
        storageEnabled = false;
        return false;
      }
    }

    function formatPrice(value) {
      return Number(value || 0).toFixed(2);
    }

    function safeCart(value) {
      return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#39;");
    }

    function safeAttr(value) {
      return safeCart(value);
    }
  }

});
