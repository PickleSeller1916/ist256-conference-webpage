const { useEffect, useMemo, useState } = React;

function FinalizationPage() {
  const [cart, setCart] = useState([]);
  const [form, setForm] = useState({
    name: "",
    email: "",
    participation: "",
    paymentType: "",
    cardName: "",
    cardNumber: "",
    expiry: "",
    cvv: "",
    selectedProducts: []
  });
  const [errors, setErrors] = useState({});
  const [serverOrder, setServerOrder] = useState(null);
  const [status, setStatus] = useState({ type: "", message: "" });
  const [submitting, setSubmitting] = useState(false);
  const [apiDebug, setApiDebug] = useState("");
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
          participation: parsed.participation || "",
          paymentType: parsed.payment?.paymentType || "",
          cardName: parsed.payment?.cardName || "",
          cardNumber: parsed.payment?.cardLastFour ? `****${parsed.payment.cardLastFour}` : "",
          expiry: parsed.payment?.expiry || ""
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

    if (!form.name.trim()) nextErrors.name = "Please enter your name.";
    if (!form.email.trim()) nextErrors.email = "Please enter your email.";
    if (!form.participation) nextErrors.participation = "Select a participation type.";
    if (!form.paymentType) nextErrors.paymentType = "Select a payment method.";
    if (!form.cardName.trim()) nextErrors.cardName = "Please enter the name on card.";

    const digitsOnly = form.cardNumber.replace(/\D/g, "");
    if (!digitsOnly) {
      nextErrors.cardNumber = "Please enter a card number.";
    } else if (digitsOnly.length < 13 || digitsOnly.length > 19) {
      nextErrors.cardNumber = "Enter a valid card number.";
    }

    if (!/^(0[1-9]|1[0-2])\/\d{2}$/.test(form.expiry.trim())) {
      nextErrors.expiry = "Use MM/YY format.";
    }

    if (!/^\d{3,4}$/.test(form.cvv.trim())) {
      nextErrors.cvv = "Enter a valid 3 or 4 digit CVV.";
    }

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
      payment: {
        paymentType: form.paymentType,
        cardName: form.cardName.trim(),
        cardLastFour: form.cardNumber.replace(/\D/g, "").slice(-4),
        expiry: form.expiry.trim()
      },
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
      await verifyBackendConnection(setApiDebug);

      const response = await apiFetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      }, setApiDebug);

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
          Backend target: <code>{describeApiTargets()}</code>
          <br />
          Run <code>node server.js</code> and open <code>http://localhost:3000/checkout.html</code> for the full integrated frontend/backend flow.
        </div>

        {apiDebug && (
          <div className="alert alert-secondary small">
            <strong>API debug:</strong> {apiDebug}
          </div>
        )}

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
              <label className="form-label">Full Name <span className="required-asterisk">*</span></label>
              <input
                name="name"
                className={`form-control ${errors.name ? "is-invalid" : ""}`}
                value={form.name}
                onChange={handleChange}
              />
              {errors.name && <div className="invalid-feedback">{errors.name}</div>}
            </div>

            <div className="col-md-6">
              <label className="form-label">Email Address <span className="required-asterisk">*</span></label>
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
              <label className="form-label">Participation Type <span className="required-asterisk">*</span></label>
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
              <label className="form-label">Payment Method <span className="required-asterisk">*</span></label>
              <select
                name="paymentType"
                className={`form-select ${errors.paymentType ? "is-invalid" : ""}`}
                value={form.paymentType}
                onChange={handleChange}
              >
                <option value="">Select a card type</option>
                <option value="Credit Card">Credit Card</option>
                <option value="Debit Card">Debit Card</option>
              </select>
              {errors.paymentType && (
                <div className="invalid-feedback">{errors.paymentType}</div>
              )}
            </div>

            <div className="col-md-6">
              <label className="form-label">Name on Card <span className="required-asterisk">*</span></label>
              <input
                name="cardName"
                className={`form-control ${errors.cardName ? "is-invalid" : ""}`}
                value={form.cardName}
                onChange={handleChange}
              />
              {errors.cardName && <div className="invalid-feedback">{errors.cardName}</div>}
            </div>

            <div className="col-md-6">
              <label className="form-label">Card Number <span className="required-asterisk">*</span></label>
              <input
                name="cardNumber"
                inputMode="numeric"
                className={`form-control ${errors.cardNumber ? "is-invalid" : ""}`}
                value={form.cardNumber}
                onChange={handleChange}
                placeholder="4111 1111 1111 1111"
              />
              {errors.cardNumber && (
                <div className="invalid-feedback">{errors.cardNumber}</div>
              )}
            </div>

            <div className="col-md-3">
              <label className="form-label">Expiry <span className="required-asterisk">*</span></label>
              <input
                name="expiry"
                className={`form-control ${errors.expiry ? "is-invalid" : ""}`}
                value={form.expiry}
                onChange={handleChange}
                placeholder="MM/YY"
              />
              {errors.expiry && <div className="invalid-feedback">{errors.expiry}</div>}
            </div>

            <div className="col-md-3">
              <label className="form-label">CVV <span className="required-asterisk">*</span></label>
              <input
                name="cvv"
                inputMode="numeric"
                className={`form-control ${errors.cvv ? "is-invalid" : ""}`}
                value={form.cvv}
                onChange={handleChange}
                placeholder="123"
              />
              {errors.cvv && <div className="invalid-feedback">{errors.cvv}</div>}
            </div>

            <div className="col-md-6">
              <label className="form-label">Submission Summary</label>
              <div className="form-control bg-light h-100">
                <div>Items selected: {selectedCartItems.length}</div>
                <div>Total: ${totalAmount}</div>
                <div>Payment: {form.paymentType || "Not selected yet"}</div>
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

async function readJsonResponse(response) {
  const contentType = response.headers.get("content-type") || "";
  const bodyText = await response.text();

  if (!contentType.includes("application/json")) {
    throw new Error(
      "The page reached a web server, but not the Node.js API. Start `node server.js` and open the site from http://localhost:3001."
    );
  }

  return bodyText ? JSON.parse(bodyText) : {};
}

async function verifyBackendConnection(setApiDebug) {
  try {
    const response = await apiFetch("/api/health", { method: "GET" }, setApiDebug);

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
    return "This page is opened directly from a file. The backend will be more reliable if you open the site from http://localhost:3001/checkout.html instead.";
  }

  if (protocol === "https:" && !(isLocalHost && (port === "3001" || port === "3000"))) {
    return "This page is being served over HTTPS, but the backend uses http://localhost:3001. Some browsers block that mixed-content request. Open the project from http://localhost:3001/checkout.html.";
  }

  if (protocol === "http:" && !(isLocalHost && (port === "3001" || port === "3000"))) {
    return `This page is running from ${window.location.origin}, but the Node backend is expected at http://localhost:3001. To avoid failed requests, open the checkout page from http://localhost:3001/checkout.html.`;
  }

  return "";
}

function buildFetchHelpMessage(error) {
  const { protocol, hostname, port } = window.location;
  const isLocalHost =
    hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1";

  if (protocol === "file:") {
    return "Failed to fetch because the page is running from a local file instead of the Node server. Start `node server.js` and open http://localhost:3001/checkout.html.";
  }

  if (protocol === "https:" && !(isLocalHost && (port === "3001" || port === "3000"))) {
    return "Failed to fetch because the page is on HTTPS while the backend is on http://localhost:3001. Open the project from http://localhost:3001/checkout.html.";
  }

  return "Failed to fetch the Node.js backend. Make sure `node server.js` is running and open the page from http://localhost:3001/checkout.html.";
}

async function apiFetch(pathname, options, setApiDebug) {
  const candidates = getApiCandidates();
  let lastResponse = null;
  let lastError = null;
  const attempts = [];

  for (const base of candidates) {
    try {
      const response = await fetch(`${base}${pathname}`, options);
      const contentType = response.headers.get("content-type") || "";
      attempts.push(`${base}${pathname} -> ${response.status} ${contentType || "no-content-type"}`);

      if (contentType.includes("application/json")) {
        if (setApiDebug) {
          setApiDebug(`Using ${base}${pathname}`);
        }
        return response;
      }

      lastResponse = response;
    } catch (error) {
      lastError = error;
      attempts.push(`${base}${pathname} -> ${error.message}`);
    }
  }

  if (setApiDebug) {
    setApiDebug(attempts.join(" | "));
  }

  if (lastResponse) {
    return lastResponse;
  }

  throw lastError || new Error("Unable to contact the API.");
}

function getApiCandidates() {
  const candidates = [];
  const { origin, protocol } = window.location;
  const manualOverride = window.localStorage.getItem("conference_api_base_override");
  const queryOverride = new URLSearchParams(window.location.search).get("api");

  if (queryOverride) {
    candidates.push(queryOverride.replace(/\/$/, ""));
  }

  if (manualOverride) {
    candidates.push(manualOverride.replace(/\/$/, ""));
  }

  if (protocol === "http:" || protocol === "https:") {
    candidates.push(origin);
  }

  if (!candidates.includes("http://localhost:3001")) {
    candidates.push("http://localhost:3001");
  }

  if (!candidates.includes("http://localhost:3000")) {
    candidates.push("http://localhost:3000");
  }

  return candidates;
}

function describeApiTargets() {
  return getApiCandidates().map((base) => `${base}/api/orders`).join(" or ");
}

ReactDOM.createRoot(document.getElementById("finalization-root")).render(<FinalizationPage />);
