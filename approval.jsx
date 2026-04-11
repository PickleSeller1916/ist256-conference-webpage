const { useEffect, useState } = React;

const APPROVAL_API_BASE = resolveApiBase();

function ApprovalPage() {
  const [pendingOrders, setPendingOrders] = useState([]);
  const [status, setStatus] = useState({ type: "", message: "" });
  const [loading, setLoading] = useState(true);
  const [activeOrderId, setActiveOrderId] = useState("");

  useEffect(() => {
    loadPendingOrders();
  }, []);

  async function loadPendingOrders() {
    setLoading(true);

    try {
      const response = await fetch(`${APPROVAL_API_BASE}/api/orders/pending`);
      const data = await readJsonResponse(response);

      if (!response.ok) {
        throw new Error(data.message || "Unable to load pending orders.");
      }

      setPendingOrders(Array.isArray(data) ? data : []);
      setStatus({ type: "", message: "" });
    } catch (error) {
      setStatus({
        type: "danger",
        message: error.message || "Unable to connect to the Node.js backend."
      });
    } finally {
      setLoading(false);
    }
  }

  async function updateStatus(orderId, nextStatus) {
    setActiveOrderId(orderId);

    try {
      const response = await fetch(`${APPROVAL_API_BASE}/api/orders/${orderId}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus })
      });

      const data = await readJsonResponse(response);

      if (!response.ok) {
        throw new Error(data.message || "Unable to update order status.");
      }

      setPendingOrders((prev) => prev.filter((order) => order.id !== orderId));
      setStatus({
        type: "success",
        message: `Order ${data.id} was marked as ${data.status}.`
      });
    } catch (error) {
      setStatus({
        type: "danger",
        message: error.message || "Unable to save the approval decision."
      });
    } finally {
      setActiveOrderId("");
    }
  }

  return (
    <div className="container py-4">
      <div className="d-flex flex-wrap justify-content-between align-items-start gap-3 mb-4">
        <div>
          <h1 className="h2 mb-2">Admin Approval Dashboard</h1>
          <p className="text-muted mb-0">
            Review pending conference registrations and approve or decline them one by one.
          </p>
        </div>
        <div className="d-flex gap-2">
          <a href="checkout.html" className="btn btn-outline-primary">Checkout</a>
          <a href="order-history.html" className="btn btn-outline-secondary">Order History</a>
        </div>
      </div>

      <div className="card border-0 shadow-sm mb-4">
        <div className="card-body d-flex flex-wrap justify-content-between align-items-center gap-3">
          <div>
            <div className="small text-muted">Pending submissions</div>
            <div className="display-6 mb-0">{pendingOrders.length}</div>
          </div>
          <button type="button" className="btn btn-dark" onClick={loadPendingOrders}>
            Refresh Pending Queue
          </button>
        </div>
      </div>

      {status.message && <div className={`alert alert-${status.type}`}>{status.message}</div>}

      {loading ? (
        <div className="alert alert-info">Loading pending orders...</div>
      ) : pendingOrders.length === 0 ? (
        <div className="alert alert-success">
          There are no pending conference orders waiting for review.
        </div>
      ) : (
        <div className="row g-4">
          {pendingOrders.map((order) => (
            <div key={order.id} className="col-12">
              <div className="card border-0 shadow-sm">
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
                      <div className="small text-muted">Order ID</div>
                      <div className="fw-semibold">{order.id}</div>
                      <span className="badge bg-warning text-dark mt-2 text-uppercase">
                        {order.status}
                      </span>
                    </div>
                  </div>

                  <div className="row g-3 mb-3">
                    <div className="col-md-4">
                      <div className="border rounded p-3 bg-light h-100">
                        <div className="fw-semibold mb-2">Registration Details</div>
                        <div>Participation: {order.participation}</div>
                        <div>Items: {order.cartSummary?.itemCount || 0}</div>
                        <div>Total: ${Number(order.cartSummary?.total || 0).toFixed(2)}</div>
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

                  <div className="d-flex flex-wrap gap-2">
                    <button
                      type="button"
                      className="btn btn-success"
                      disabled={activeOrderId === order.id}
                      onClick={() => updateStatus(order.id, "approved")}
                    >
                      {activeOrderId === order.id ? "Saving..." : "Approve"}
                    </button>
                    <button
                      type="button"
                      className="btn btn-danger"
                      disabled={activeOrderId === order.id}
                      onClick={() => updateStatus(order.id, "declined")}
                    >
                      {activeOrderId === order.id ? "Saving..." : "Decline"}
                    </button>
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

ReactDOM.createRoot(document.getElementById("approval-root")).render(<ApprovalPage />);

function resolveApiBase() {
  const { hostname, origin, port, protocol } = window.location;
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
