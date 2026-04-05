import { useState, useEffect } from "react";

export default function FinalizationPage() {
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

  // Load sessions + cart from localStorage
  useEffect(() => {
    const storedSessions = JSON.parse(localStorage.getItem("conference_sessions_v1")) || [];
    const storedCart = JSON.parse(localStorage.getItem("conference_cart_items_v1")) || [];

    setSessions(storedSessions);
    setCart(storedCart);

    // Pre-select sessions already in cart
    const cartSessionIds = storedCart.map(item => item.id);
    setForm(prev => ({ ...prev, selectedSessions: cartSessionIds }));
  }, []);

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  function toggleSession(id) {
    setForm(prev => {
      const selected = prev.selectedSessions.includes(id)
        ? prev.selectedSessions.filter(s => s !== id)
        : [...prev.selectedSessions, id];
      return { ...prev, selectedSessions: selected };
    });
  }

  function validate() {
    const e = {};

    if (!form.name.trim()) e.name = "Name is required.";
    if (!form.email.trim()) e.email = "Email is required.";
    if (!form.participation) e.participation = "Select a participation type.";
    if (form.selectedSessions.length === 0)
      e.selectedSessions = "Select at least one session.";

    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!validate()) return;

    const payload = {
      name: form.name.trim(),
      email: form.email.trim(),
      participation: form.participation,
      sessions: form.selectedSessions,
      cartSummary: cart.map(item => ({
        id: item.id,
        title: item.title,
        price: item.price
      }))
    };

    setJsonOutput(payload);

    try {
      const response = await fetch("/api/finalize-registration", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!response.ok) throw new Error("Network error");

      setStatus("Registration submitted successfully!");
    } catch (err) {
      setStatus("Error submitting registration.");
    }
  }

  return (
    <div className="container py-4">
      <h2 className="mb-4">Conference Registration Finalization</h2>

      <form onSubmit={handleSubmit} className="card p-4 shadow-sm">

        {/* Name */}
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

        {/* Email */}
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

        {/* Participation Type */}
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

        {/* Session Selection */}
        <div className="mb-3">
          <label className="form-label">Select Sessions</label>
          <div className="border rounded p-3">
            {sessions.length === 0 && (
              <p className="text-muted">No sessions available.</p>
            )}

            {sessions.map(session => (
              <div key={session.id} className="form-check">
                <input
                  type="checkbox"
                  className="form-check-input"
                  id={session.id}
                  checked={form.selectedSessions.includes(session.id)}
                  onChange={() => toggleSession(session.id)}
                />
                <label className="form-check-label" htmlFor={session.id}>
                  {session.title} — {session.category}
                </label>
              </div>
            ))}
          </div>

          {errors.selectedSessions && (
            <div className="text-danger small mt-1">{errors.selectedSessions}</div>
          )}
        </div>

        <button className="btn btn-primary">Submit Registration</button>
      </form>

      {/* Status Message */}
      {status && <div className="alert alert-info mt-3">{status}</div>}

      {/* JSON Output */}
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
