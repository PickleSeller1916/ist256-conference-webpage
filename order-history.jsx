const { useEffect, useMemo, useState } = React;

const ORDER_API_BASE =
  window.location.protocol === "http:" || window.location.protocol === "https:"
    ? ""
    : "http://localhost:3000";

function OrderHistoryPage() {
  const [orders, setOrders] = useState([]);
  const [emailFilter, setEmailFilter] = useState("");
  const [status, setStatus] = useState({ type: "", message: "" });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const savedFinalization = localStorage.getItem("conference_finalization_v1");
    if (savedFinalization) {
      try {
        const parsed = JSON.parse(savedFinalization);
        setEmailFilter(parsed.customerEmail || "");
      } catch (error) {
        // Ignore invalid local storage values.
      }
    }

    loadOrders();
  }, []);

  const filteredOrders = useMemo(() => {
    const term = emailFilter.trim().toLowerCase();
    if (!term) return orders;
    return orders.filter((order) =>
      String(order.customerEmail || "").toLowerCase().includes(term)
    );
  }, [emailFilter, orders]);

  async function loadOrders() {
    setLoading(true);
    setStatus({ type: "", message: "" });

    try {
      const response = await fetch(`${ORDER_API_BASE}/api/orders`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Unable to load orders.");
      }

      setOrders(Array.isArray(data) ? data : []);
    } catch (error) {
      setStatus({
        type: "danger",
        message: error.message || "Unable to connect to the Node.js backend."
      });
    } finally {
      setLoading(false);
    }
  }

  function badgeClass(statusValue) {
    if (statusValue === "approved") return "bg-success";
    if (statusValue === "declined") return "bg-danger";
    return "bg-warning text-dark";
  }

  return (
    <div className="container py-4">
      <div className="d-flex flex-wrap justify-content-between align-items-start gap-3 mb-4">
        <div>
          <h1 className="h2 mb-2">Conference Order History</h1>
          <p className="text-muted mb-0">
            View each submitted registration, its selected sessions, and the current admin decision.
          </p>
        </div>
        <div className="d-flex gap-2">
          <a href="checkout.html" className="btn btn-outline-primary">Back to Checkout</a>
          <a href="approval.html" className="btn btn-outline-dark">Admin Approval</a>
        </div>
      </div>

      <div className="card border-0 shadow-sm mb-4">
        <div className="card-body">
          <div className="row g-3 align-items-end">
            <div className="col-md-8">
              <label className="form-label">Filter by Customer Email</label>
              <input
                type="email"
                className="form-control"
                placeholder="Search your submissions by email"
                value={emailFilter}
                onChange={(event) => setEmailFilter(event.target.value)}
              />
            </div>
            <div className="col-md-4 d-grid">
              <button type="button" className="btn btn-secondary" onClick={loadOrders}>
                Refresh Order History
              </button>
            </div>
          </div>
        </div>
      </div>

      {status.message && <div className={`alert alert-${status.type}`}>{status.message}</div>}

      {loading ? (
        <div className="alert alert-info">Loading conference orders...</div>
      ) : filteredOrders.length === 0 ? (
        <div className="alert alert-warning">
          No orders matched the current filter. Submit a checkout order first, or clear the email filter.
        </div>
      ) : (
        <div className="row g-4">
          {filteredOrders
            .slice()
            .reverse()
            .map((order) => (
              <div key={order.id} className="col-12">
                <div className="card border-0 shadow-sm h-100">
                  <div className="card-body">
                    <div className="d-flex flex-wrap justify-content-between gap-3 mb-3">
                      <div>
                        <h2 className="h5 mb-1">{order.customerName}</h2>
                        <div className="text-muted small">{order.customerEmail}</div>
                        <div className="text-muted small">
                          Submitted: {new Date(order.submittedAt).toLocaleString()}
                        </div>
                      </div>
                      <div className="text-end">
                        <div className="small text-muted mb-1">Order ID</div>
                        <div className="fw-semibold">{order.id}</div>
                        <span className={`badge ${badgeClass(order.status)} mt-2 text-uppercase`}>
                          {order.status}
                        </span>
                      </div>
                    </div>

                    <div className="row g-3">
                      <div className="col-md-4">
                        <div className="border rounded p-3 h-100 bg-light">
                          <div className="fw-semibold mb-2">Registration Info</div>
                          <div>Participation: {order.participation}</div>
                          <div>Items: {order.cartSummary?.itemCount || 0}</div>
                          <div>Total: ${Number(order.cartSummary?.total || 0).toFixed(2)}</div>
                          {order.reviewedAt && (
                            <div className="small text-muted mt-2">
                              Reviewed: {new Date(order.reviewedAt).toLocaleString()}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="col-md-8">
                        <div className="border rounded p-3 h-100">
                          <div className="fw-semibold mb-2">Selected Sessions / Products</div>
                          <div className="table-responsive">
                            <table className="table table-sm mb-0">
                              <thead>
                                <tr>
                                  <th>Title</th>
                                  <th>Category</th>
                                  <th>Duration</th>
                                  <th>Speaker</th>
                                  <th>Price</th>
                                </tr>
                              </thead>
                              <tbody>
                                {order.selectedProducts.map((item) => (
                                  <tr key={`${order.id}-${item.productId}-${item.addedAt || item.productTitle}`}>
                                    <td>{item.productTitle}</td>
                                    <td>{item.productCategory}</td>
                                    <td>{item.duration}</td>
                                    <td>{item.speaker || "TBA"}</td>
                                    <td>${Number(item.price || 0).toFixed(2)}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
        </div>
      )}
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("order-history-root")).render(<OrderHistoryPage />);
