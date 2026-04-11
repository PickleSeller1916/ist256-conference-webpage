const { useEffect, useMemo, useState } = React;

const API_BASE = resolveApiBase();

function FinalizationPage() {
  const [cart, setCart] = useState([]);
  const [form, setForm] = useState({
    name: "",
    email: "",
    participation: "",
    selectedProducts: []
  });
  const [errors, setErrors] = useState({});
  const [serverOrder, setServerOrder] = useState(null);
  const [status, setStatus] = useState({ type: "", message: "" });
  const [submitting, setSubmitting] = useState(false);
  const environmentWarning = getEnvironmentWarning();

  function loadSavedCart() {
    let storedCart = [];

    try {
      storedCart = JSON.parse(localStorage.getItem("conference_cart_items_v1")) || [];
    } catch (error) {
      storedCart = [];
    }

    storedCart = Array.isArray(storedCart) ? storedCart : [];
    setCart(storedCart);
    setForm((prev) => ({
      ...prev,
      selectedProducts: storedCart.map(getCartItemKey)
    }));
  }

  useEffect(() => {
    loadSavedCart();

    const savedFinalization = localStorage.getItem("conference_finalization_v1");
    if (savedFinalization) {
      try {
        const parsed = JSON.parse(savedFinalization);
        setForm((prev) => ({
          ...prev,
          name: parsed.customerName || "",
          email: parsed.customerEmail || "",
          participation: parsed.participation || ""
        }));
      } catch (error) {
        // Ignore invalid local storage values.
      }
    }

    function syncCart() {
      loadSavedCart();
    }

    window.addEventListener("focus", syncCart);
    window.addEventListener("storage", syncCart);

    return () => {
      window.removeEventListener("focus", syncCart);
      window.removeEventListener("storage", syncCart);
    };
  }, []);

  const selectedCartItems = useMemo(() => {
    return cart.filter((item) => form.selectedProducts.includes(getCartItemKey(item)));
  }, [cart, form.selectedProducts]);

  const totalAmount = useMemo(() => {
    return selectedCartItems
      .reduce((sum, item) => sum + Number(item.price || 0), 0)
      .toFixed(2);
  }, [selectedCartItems]);

  function handleChange(event) {
    const { name, value } = event.target;
    setForm((prev) => ({
      ...prev,
      [name]: value
    }));
  }

  function toggleProduct(itemKey) {
    setForm((prev) => {
      const nextSelected = prev.selectedProducts.includes(itemKey)
        ? prev.selectedProducts.filter((selectedKey) => selectedKey !== itemKey)
        : [...prev.selectedProducts, itemKey];

      return {
        ...prev,
        selectedProducts: nextSelected
      };
    });
  }

  function removeProduct(itemKey) {
    const nextCart = cart.filter((item) => getCartItemKey(item) !== itemKey);
    setCart(nextCart);
    setForm((prev) => ({
      ...prev,
      selectedProducts: prev.selectedProducts.filter((selectedKey) => selectedKey !== itemKey)
    }));
    localStorage.setItem("conference_cart_items_v1", JSON.stringify(nextCart));
    setStatus({ type: "warning", message: "Checkout item removed from the shopping cart." });
  }

  function validate() {
    const nextErrors = {};

    if (!form.name.trim()) nextErrors.name = "Name is required.";
    if (!form.email.trim()) nextErrors.email = "Email is required.";
    if (!form.participation) nextErrors.participation = "Select a participation type.";
    if (!form.selectedProducts.length) {
      nextErrors.selectedProducts = "Select at least one shopping cart item.";
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (!validate()) return;

    const payload = {
      customerName: form.name.trim(),
      customerEmail: form.email.trim(),
      participation: form.participation,
      selectedProducts: selectedCartItems.map((item) => ({
        productId: item.id,
        productTitle: item.title,
        productCategory: item.category,
        duration: item.duration,
        speaker: item.speaker,
        price: Number(item.price || 0),
        addedAt: item.addedAt
      })),
      cartSummary: {
        itemCount: selectedCartItems.length,
        total: totalAmount
      }
    };

    setSubmitting(true);
    setServerOrder(null);
    localStorage.setItem("conference_finalization_v1", JSON.stringify(payload));

    try {
      await verifyBackendConnection();

      const response = await fetch(`${API_BASE}/api/orders`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const data = await readJsonResponse(response);

      if (!response.ok) {
        throw new Error(data.message || "Unable to submit the checkout.");
      }

      setServerOrder(data);
      setStatus({
        type: "success",
        message: `Checkout submitted successfully. Order ${data.id} is now pending admin approval.`
      });
    } catch (error) {
      setStatus({
        type: "danger",
        message:
          error.message ||
          "Unable to reach the Node.js backend. Start server.js and try again."
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="container py-4">
      <div className="card p-4 shadow-sm border-0">
        <div className="d-flex flex-wrap justify-content-between align-items-start gap-3 mb-3">
          <div>
            <h2 className="mb-2">Conference Checkout Finalization</h2>
            <p className="text-muted mb-0">
              Submit your conference registration to the Node.js backend so it can appear in order history and the admin approval dashboard.
            </p>
          </div>
          <div className="d-flex gap-2">
            <a href="order-history.html" className="btn btn-outline-primary btn-sm">
              View Order History
            </a>
            <a href="approval.html" className="btn btn-outline-dark btn-sm">
              Admin Approval Page
            </a>
          </div>
        </div>

        <div className="alert alert-info">
          Backend target: <code>{`${API_BASE || window.location.origin}/api/orders`}</code>
          <br />
          Run <code>node server.js</code> and open <code>http://localhost:3000/checkout.html</code> for the full integrated frontend/backend flow.
        </div>

        {environmentWarning && (
          <div className="alert alert-warning">
            {environmentWarning}
          </div>
        )}

        <div className="d-flex gap-2 mb-3">
          <button
            type="button"
            className="btn btn-outline-secondary btn-sm"
            onClick={loadSavedCart}
          >
            Refresh Cart Data
          </button>
        </div>

        <div className="mb-4">
          <h5>Shopping Cart Summary</h5>
          {cart.length === 0 ? (
            <p className="text-muted mb-0">No saved shopping cart items were found yet.</p>
          ) : (
            <ul className="list-group">
              {cart.map((item) => {
                const itemKey = getCartItemKey(item);
                const checked = form.selectedProducts.includes(itemKey);

                return (
                  <li
                    key={itemKey}
                    className="list-group-item d-flex justify-content-between align-items-start gap-3"
                  >
                    <div className="form-check">
                      <input
                        id={`select-${itemKey}`}
                        type="checkbox"
                        className="form-check-input"
                        checked={checked}
                        onChange={() => toggleProduct(itemKey)}
                      />
                      <label htmlFor={`select-${itemKey}`} className="form-check-label">
                        <strong>{item.title}</strong>
                        <span className="text-muted"> - {item.category}</span>
                        <span className="d-block small text-muted">
                          Duration: {item.duration || "N/A"} | Speaker: {item.speaker || "N/A"}
                        </span>
                      </label>
                    </div>
                    <div className="text-end">
                      <div className="mb-2">${Number(item.price || 0).toFixed(2)}</div>
                      <button
                        type="button"
                        className="btn btn-sm btn-outline-danger"
                        onClick={() => removeProduct(itemKey)}
                      >
                        Remove
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
          {errors.selectedProducts && (
            <div className="text-danger small mt-2">{errors.selectedProducts}</div>
          )}
        </div>

        <form onSubmit={handleSubmit}>
          <div className="row g-3">
            <div className="col-md-6">
              <label className="form-label">Full Name</label>
              <input
                name="name"
                className={`form-control ${errors.name ? "is-invalid" : ""}`}
                value={form.name}
                onChange={handleChange}
              />
              {errors.name && <div className="invalid-feedback">{errors.name}</div>}
            </div>

            <div className="col-md-6">
              <label className="form-label">Email Address</label>
              <input
                name="email"
                type="email"
                className={`form-control ${errors.email ? "is-invalid" : ""}`}
                value={form.email}
                onChange={handleChange}
              />
              {errors.email && <div className="invalid-feedback">{errors.email}</div>}
            </div>

            <div className="col-md-6">
              <label className="form-label">Participation Type</label>
              <select
                name="participation"
                className={`form-select ${errors.participation ? "is-invalid" : ""}`}
                value={form.participation}
                onChange={handleChange}
              >
                <option value="">Select an option</option>
                <option value="In-Person">In-Person</option>
                <option value="Virtual">Virtual</option>
                <option value="VIP">VIP</option>
              </select>
              {errors.participation && (
                <div className="invalid-feedback">{errors.participation}</div>
              )}
            </div>

            <div className="col-md-6">
              <label className="form-label">Submission Summary</label>
              <div className="form-control bg-light h-100">
                <div>Items selected: {selectedCartItems.length}</div>
                <div>Total: ${totalAmount}</div>
              </div>
            </div>
          </div>

          <div className="mt-4 d-flex flex-wrap gap-2">
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? "Submitting..." : "Submit Conference Order"}
            </button>
            <a href="cart.html" className="btn btn-outline-secondary">
              Back to Cart
            </a>
          </div>
        </form>

        {status.message && (
          <div className={`alert alert-${status.type} mt-4 mb-0`}>{status.message}</div>
        )}

        {serverOrder && (
          <div className="mt-4">
            <h5>Saved Order JSON</h5>
            <pre className="bg-dark text-light rounded p-3 small mb-0">
              {JSON.stringify(serverOrder, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}

function getCartItemKey(item) {
  return `${item.id}__${item.addedAt || "saved"}`;
}

function resolveApiBase() {
  const { hostname, port, protocol } = window.location;
  const isLocalHost =
    hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1";

  if ((protocol === "http:" || protocol === "https:") && isLocalHost && port === "3000") {
    return "";
  }

  return "http://localhost:3000";
}

async function readJsonResponse(response) {
  const contentType = response.headers.get("content-type") || "";
  const bodyText = await response.text();

  if (!contentType.includes("application/json")) {
    throw new Error(
      "The page reached a web server, but not the Node.js API. Start `node server.js` and open the site from http://localhost:3000."
    );
  }

  return bodyText ? JSON.parse(bodyText) : {};
}

async function verifyBackendConnection() {
  try {
    const response = await fetch(`${API_BASE}/api/health`, {
      method: "GET"
    });

    const data = await readJsonResponse(response);
    if (!response.ok || !data.ok) {
      throw new Error("Backend health check failed.");
    }
  } catch (error) {
    throw new Error(buildFetchHelpMessage(error));
  }
}

function getEnvironmentWarning() {
  const { protocol, hostname, port } = window.location;
  const isLocalHost =
    hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1";

  if (protocol === "file:") {
    return "This page is opened directly from a file. The backend will be more reliable if you open the site from http://localhost:3000/checkout.html instead.";
  }

  if (protocol === "https:" && !(isLocalHost && port === "3000")) {
    return "This page is being served over HTTPS, but the backend uses http://localhost:3000. Some browsers block that mixed-content request. Open the project from http://localhost:3000/checkout.html.";
  }

  if (protocol === "http:" && !(isLocalHost && port === "3000")) {
    return `This page is running from ${window.location.origin}, but the Node backend is expected at http://localhost:3000. To avoid failed requests, open the checkout page from http://localhost:3000/checkout.html.`;
  }

  return "";
}

function buildFetchHelpMessage(error) {
  const { protocol, hostname, port } = window.location;
  const isLocalHost =
    hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1";

  if (protocol === "file:") {
    return "Failed to fetch because the page is running from a local file instead of the Node server. Start `node server.js` and open http://localhost:3000/checkout.html.";
  }

  if (protocol === "https:" && !(isLocalHost && port === "3000")) {
    return "Failed to fetch because the page is on HTTPS while the backend is on http://localhost:3000. Open the project from http://localhost:3000/checkout.html.";
  }

  return "Failed to fetch the Node.js backend. Make sure `node server.js` is running and open the page from http://localhost:3000/checkout.html.";
}

ReactDOM.createRoot(document.getElementById("finalization-root")).render(<FinalizationPage />);
