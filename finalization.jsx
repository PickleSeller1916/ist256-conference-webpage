const { useEffect, useState } = React;

function FinalizationPage() {
  const [cart, setCart] = useState([]);
  const [form, setForm] = useState({
    name: "",
    email: "",
    participation: "",
    selectedProducts: []
  });
  const [errors, setErrors] = useState({});
  const [jsonOutput, setJsonOutput] = useState(null);
  const [status, setStatus] = useState("");

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
      selectedProducts: storedCart.map((item) => item.id)
    }));
  }

  useEffect(() => {
    loadSavedCart();

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

  function handleChange(event) {
    const { name, value } = event.target;
    setForm((prev) => ({
      ...prev,
      [name]: value
    }));
  }

  function toggleProduct(id) {
    setForm((prev) => {
      const nextSelected = prev.selectedProducts.includes(id)
        ? prev.selectedProducts.filter((itemId) => itemId !== id)
        : [...prev.selectedProducts, id];

      return {
        ...prev,
        selectedProducts: nextSelected
      };
    });
  }

  function removeProduct(productId) {
    const nextCart = cart.filter((item) => item.id !== productId);
    setCart(nextCart);
    setForm((prev) => ({
      ...prev,
      selectedProducts: prev.selectedProducts.filter((itemId) => itemId !== productId)
    }));
    localStorage.setItem("conference_cart_items_v1", JSON.stringify(nextCart));
    setStatus("Checkout item removed from the shopping cart.");
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
      selectedProducts: cart
        .filter((item) => form.selectedProducts.includes(item.id))
        .map((item) => ({
          productId: item.id,
          productTitle: item.title,
          productCategory: item.category,
          duration: item.duration,
          speaker: item.speaker,
          price: item.price,
          addedAt: item.addedAt
        })),
      cartSummary: {
        itemCount: form.selectedProducts.length,
        total: cart
          .filter((item) => form.selectedProducts.includes(item.id))
          .reduce((sum, item) => sum + Number(item.price || 0), 0)
          .toFixed(2)
      }
    };

    setJsonOutput(payload);
    localStorage.setItem("conference_finalization_v1", JSON.stringify(payload));

    try {
      const response = await fetch("https://jsonplaceholder.typicode.com/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error("Network error");
      }

      setStatus("Checkout submitted successfully.");
    } catch (error) {
      setStatus("Checkout JSON was generated and an AJAX request was attempted.");
    }
  }

  return (
    <div className="container py-4">
      <div className="card p-4 shadow-sm">
        <h2 className="mb-3">Conference Checkout Finalization</h2>
        <p className="text-muted">
          This page uses only your saved shopping cart data to build the final checkout.
        </p>

        <div className="d-flex gap-2 mb-3">
          <button
            type="button"
            className="btn btn-outline-secondary btn-sm"
            onClick={loadSavedCart}
          >
            Refresh Cart Data
          </button>
        </div>

        <div className="mb-3">
          <h5>Shopping Cart Summary</h5>
          {cart.length === 0 ? (
            <p className="text-muted mb-0">No saved shopping cart items were found yet.</p>
          ) : (
            <ul className="list-group">
              {cart.map((item) => (
                <li key={item.id} className="list-group-item d-flex justify-content-between align-items-start gap-3">
                  <span>
                    <strong>{item.title}</strong>
                    <span className="text-muted"> - {item.category}</span>
                    <span className="d-block small text-muted">
                      Duration: {item.duration || "N/A"} | Speaker: {item.speaker || "N/A"}
                    </span>
                  </span>
                  <div className="text-end">
                    <div className="mb-2">${item.price}</div>
                    <button
                      type="button"
                      className="btn btn-sm btn-outline-danger"
                      onClick={() => removeProduct(item.id)}
                    >
                      Remove
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <form onSubmit={handleSubmit}>
          <div className="mb-3">
            <label className="form-label">Full Name</label>
            <input
              name="name"
              className={`form-control ${errors.name ? "is-invalid" : ""}`}
              value={form.name}
              onChange={handleChange}
            />
            {errors.name && <div className="invalid-feedback">{errors.name}</div>}
          </div>

          <div className="mb-3">
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

          <div className="mb-3">
            <label className="form-label">Participation Type</label>
            <select
              name="participation"
              className={`form-select ${errors.participation ? "is-invalid" : ""}`}
              value={form.participation}
              onChange={handleChange}
            >
              <option value="">Select one...</option>
              <option value="in-person">In-Person</option>
              <option value="virtual">Virtual</option>
              <option value="vip">VIP</option>
            </select>
            {errors.participation && (
              <div className="invalid-feedback">{errors.participation}</div>
            )}
          </div>

          <div className="mb-3">
            <label className="form-label">Select Shopping Cart Items</label>
            <div className="border rounded p-3">
              {cart.length === 0 && (
                <p className="text-muted mb-0">No saved shopping cart items are available.</p>
              )}

              {cart.map((item) => (
                <div key={item.id} className="form-check">
                  <input
                    type="checkbox"
                    className="form-check-input"
                    id={`cart-item-${item.id}`}
                    checked={form.selectedProducts.includes(item.id)}
                    onChange={() => toggleProduct(item.id)}
                  />
                  <label className="form-check-label" htmlFor={`cart-item-${item.id}`}>
                    {item.title} - {item.category} - ${item.price}
                  </label>
                </div>
              ))}
            </div>
            {errors.selectedProducts && (
              <div className="text-danger small mt-1">{errors.selectedProducts}</div>
            )}
          </div>

          <button type="submit" className="btn btn-primary">Submit Checkout</button>
        </form>

        {status && <div className="alert alert-info mt-3 mb-0">{status}</div>}
      </div>

      {jsonOutput && (
        <div className="mt-4">
          <h5>Generated JSON</h5>
          <pre className="bg-light p-3 border rounded">
            {JSON.stringify(jsonOutput, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}

const finalizationRoot = document.getElementById("finalization-root");

if (finalizationRoot) {
  ReactDOM.createRoot(finalizationRoot).render(<FinalizationPage />);
}
