const { useEffect, useState } = React;

function FinalizationPage() {
  const [sessions, setSessions] = useState([]);
  const [cart, setCart] = useState([]);
  const [form, setForm] = useState({
    name: "",
    email: "",
    participation: "",
    selectedSessions: []
  });
  const [errors, setErrors] = useState({});
  const [jsonOutput, setJsonOutput] = useState(null);
  const [status, setStatus] = useState("");

  useEffect(() => {
    let storedSessions = [];
    let storedCart = [];

    try {
      storedSessions = JSON.parse(localStorage.getItem("conference_sessions_v1")) || [];
    } catch (error) {
      storedSessions = [];
    }

    try {
      storedCart = JSON.parse(localStorage.getItem("conference_cart_items_v1")) || [];
    } catch (error) {
      storedCart = [];
    }

    storedSessions = Array.isArray(storedSessions) ? storedSessions : [];
    storedCart = Array.isArray(storedCart) ? storedCart : [];

    setSessions(storedSessions);
    setCart(storedCart);
    setForm((prev) => ({
      ...prev,
      selectedSessions: storedCart.map((item) => item.id)
    }));
  }, []);

  function handleChange(event) {
    const { name, value } = event.target;
    setForm((prev) => ({
      ...prev,
      [name]: value
    }));
  }

  function toggleSession(id) {
    setForm((prev) => {
      const nextSelected = prev.selectedSessions.includes(id)
        ? prev.selectedSessions.filter((sessionId) => sessionId !== id)
        : [...prev.selectedSessions, id];

      return {
        ...prev,
        selectedSessions: nextSelected
      };
    });
  }

  function validate() {
    const nextErrors = {};

    if (!form.name.trim()) nextErrors.name = "Name is required.";
    if (!form.email.trim()) nextErrors.email = "Email is required.";
    if (!form.participation) nextErrors.participation = "Select a participation type.";
    if (!form.selectedSessions.length) {
      nextErrors.selectedSessions = "Select at least one session.";
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (!validate()) return;

    const payload = {
      name: form.name.trim(),
      email: form.email.trim(),
      participation: form.participation,
      sessions: form.selectedSessions,
      cartSummary: cart.map((item) => ({
        id: item.id,
        title: item.title,
        price: item.price
      }))
    };

    setJsonOutput(payload);

    try {
      const response = await fetch("https://jsonplaceholder.typicode.com/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error("Network error");
      }

      setStatus("Registration submitted successfully.");
    } catch (error) {
      setStatus("JSON was generated and an AJAX request was attempted.");
    }
  }

  return (
    <div className="container py-4">
      <div className="card p-4 shadow-sm">
        <h2 className="mb-3">Conference Registration Finalization</h2>
        <p className="text-muted">
          This React finalization component is loaded from <code>finalization.jsx</code>.
        </p>

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
            <label className="form-label">Select Sessions</label>
            <div className="border rounded p-3">
              {sessions.length === 0 && (
                <p className="text-muted mb-0">No sessions available.</p>
              )}

              {sessions.map((session) => (
                <div key={session.id} className="form-check">
                  <input
                    type="checkbox"
                    className="form-check-input"
                    id={`session-${session.id}`}
                    checked={form.selectedSessions.includes(session.id)}
                    onChange={() => toggleSession(session.id)}
                  />
                  <label className="form-check-label" htmlFor={`session-${session.id}`}>
                    {session.title} - {session.category}
                  </label>
                </div>
              ))}
            </div>
            {errors.selectedSessions && (
              <div className="text-danger small mt-1">{errors.selectedSessions}</div>
            )}
          </div>

          <button type="submit" className="btn btn-primary">Submit Registration</button>
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
