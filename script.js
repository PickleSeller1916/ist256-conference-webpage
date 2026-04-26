document.addEventListener("DOMContentLoaded", () => {
  "use strict";

  initMemberForm();
  initSessionCatalog();
  initShoppingCartPage();

  function initMemberForm() {
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

    async function submitForm() {
      const data = {
        name: fields.name.value.trim(),
        email: fields.email.value.trim(),
        age: fields.age.value.trim(),
        org: fields.org.value.trim(),
        phone: fields.phone.value.trim(),
      };

      if (!data.name || !data.email || !data.age || !data.org) {
        alert("Please fill in all required fields marked with *");
        return;
      }

      try {
        const response = await fetch("/api/members", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data)
        });

        if (response.ok) {
          form.reset();
          alert("Registration successful! Member data saved to database.");
        } else {
          const err = await response.json();
          alert("Error: " + (err.message || "Failed to save member."));
        }
      } catch (err) {
        console.error("Database connection failed:", err);
        alert("Could not connect to the server.");
      }
    }

    if (saveBtn) {
      saveBtn.type = "button";
      saveBtn.addEventListener("click", submitForm);
    }

    form.addEventListener("submit", (e) => {
      e.preventDefault();
      submitForm();
    });
  }

  function initSessionCatalog() {
    const catalogForm = document.querySelector('form.row.g-3');
    const tableBody = document.getElementById("tableBody");
    const searchInput = document.getElementById("search");

    if (!catalogForm || !tableBody) return;

    async function loadSessions() {
      try {
        const response = await fetch("/api/products");
        if (!response.ok) return;
        const sessions = await response.json();
        renderTable(sessions);
      } catch (err) {
        console.error("Failed to load sessions:", err);
      }
    }

    function renderTable(sessions) {
      const term = searchInput ? searchInput.value.toLowerCase() : "";
      tableBody.innerHTML = sessions
        .filter(s => 
          s.title.toLowerCase().includes(term) || 
          s.speaker.toLowerCase().includes(term) ||
          s.category.toLowerCase().includes(term)
        )
        .map(s => `
          <tr>
            <td>${s._id ? s._id.substring(s._id.length - 6) : 'N/A'}</td>
            <td>${s.title}</td>
            <td>${s.category}</td>
            <td>${s.duration}</td>
            <td>$${Number(s.price).toFixed(2)}</td>
            <td>${s.speaker}</td>
          </tr>
        `).join("");
    }

    catalogForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const data = {
        title: document.getElementById("title").value.trim(),
        category: document.getElementById("category").value.trim(),
        duration: document.getElementById("duration").value.trim(),
        price: parseFloat(document.getElementById("price").value),
        speaker: document.getElementById("speaker").value.trim(),
      };

      try {
        const response = await fetch("/api/products", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data)
        });
        
        if (response.ok) {
          catalogForm.reset();
          loadSessions();
        }
      } catch (err) {
        console.error("Failed to save product:", err);
      }
    });

    if (searchInput) {
      searchInput.addEventListener("input", () => loadSessions());
    }

    loadSessions();
  }

  function initShoppingCartPage() {
    const productDisplay = document.getElementById("productDisplay");
    const cartContainer = document.getElementById("cartItemsContainer");
    const searchInput = document.getElementById("searchInput");
    const STORAGE_KEY = "conference_cart_items_v1";

    if (!productDisplay || !cartContainer) return;

    async function loadProducts() {
      try {
        const response = await fetch("/api/products");
        if (!response.ok) return;
        const products = await response.json();
        renderProducts(products);
      } catch (err) {
        console.error("Failed to load products for cart:", err);
      }
    }

    function renderProducts(products) {
      const term = searchInput ? searchInput.value.toLowerCase() : "";
      productDisplay.innerHTML = products
        .filter(p => p.title.toLowerCase().includes(term))
        .map(p => `
          <div class="col-md-6">
            <div class="card h-100 shadow-sm">
              <div class="card-body">
                <h5 class="card-title">${p.title}</h5>
                <p class="text-muted mb-2 small">${p.speaker} | ${p.duration}</p>
                <div class="d-flex justify-content-between align-items-center mt-3">
                  <span class="fw-bold text-primary">$${Number(p.price).toFixed(2)}</span>
                  <button class="btn btn-sm btn-outline-primary add-to-cart" 
                    data-id="${p._id}" 
                    data-title="${p.title}" 
                    data-price="${p.price}">Add to Cart</button>
                </div>
              </div>
            </div>
          </div>
        `).join("");
    }

    productDisplay.addEventListener("click", (e) => {
      if (e.target.classList.contains("add-to-cart")) {
        const item = {
          id: e.target.dataset.id,
          title: e.target.dataset.title,
          price: e.target.dataset.price
        };
        addToCart(item);
      }
    });

    function addToCart(item) {
      let cart = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
      const exists = cart.find(i => i.id === item.id);
      if (!exists) {
        cart.push(item);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(cart));
        renderCart();
      }
    }

    function renderCart() {
      const cart = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
      if (cart.length === 0) {
        cartContainer.innerHTML = '<p class="text-muted small">No items added yet.</p>';
        return;
      }
      cartContainer.innerHTML = cart.map(item => `
        <div class="d-flex justify-content-between align-items-center border-bottom py-2">
          <div>
            <div class="small fw-bold">${item.title}</div>
            <div class="text-muted extra-small">$${Number(item.price).toFixed(2)}</div>
          </div>
          <button class="btn btn-link btn-sm text-danger p-0 remove-item" data-id="${item.id}">Remove</button>
        </div>
      `).join("");
    }

    cartContainer.addEventListener("click", (e) => {
      if (e.target.classList.contains("remove-item")) {
        let cart = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
        cart = cart.filter(item => item.id !== e.target.dataset.id);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(cart));
        renderCart();
      }
    });

    if (searchInput) {
      searchInput.addEventListener("input", loadProducts);
    }

    loadProducts();
    renderCart();
  }
});
