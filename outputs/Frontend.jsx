import React, { useState, useEffect } from "react";

// Safe environment variable handling for Vite or CRA
const API_URL =
  (typeof import !== "undefined" && import.meta.env && import.meta.env.VITE_API_URL) ||
  (typeof process !== "undefined" && process.env.REACT_APP_API_URL) ||
  "/api";

async function request(path, options = {}, token) {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.message || "Something went wrong.");
  return body;
}

function formatClock(seconds) {
  const safe = Math.max(0, seconds);
  return `${Math.floor(safe / 60)}:${String(safe % 60).padStart(2, "0")}`;
}

function AuthScreen({ onAuthenticated }) {
  const [isRegistering, setIsRegistering] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", password: "", role: "student" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event) {
    event.preventDefault();
    setError("");
    if (!/^\S+@\S+\.\S+$/.test(form.email) || form.password.length < 6) {
      setError("Use a valid email and a password with at least 6 characters.");
      return;
    }
    setLoading(true);
    try {
      const result = await request(isRegistering ? "/auth/register" : "/auth/login", {
        method: "POST",
        body: JSON.stringify(isRegistering ? form : { email: form.email, password: form.password }),
      });
      onAuthenticated(result);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="auth">
      <section className="panel">
        <h1>AI Debate Coach</h1>
        <p>Practice, host, and review stronger debates.</p>
        <form onSubmit={submit}>
          {isRegistering && (
            <input
              placeholder="Your name"
              value={form.name}
              required
              onChange={e => setForm({ ...form, name: e.target.value })}
            />
          )}
          <input
            type="email"
            placeholder="Email address"
            value={form.email}
            required
            onChange={e => setForm({ ...form, email: e.target.value })}
          />
          <input
            type="password"
            placeholder="Password (6+ characters)"
            value={form.password}
            required
            onChange={e => setForm({ ...form, password: e.target.value })}
          />
          {isRegistering && (
            <select
              value={form.role}
              onChange={e => setForm({ ...form, role: e.target.value })}
            >
              <option value="student">Student</option>
              <option value="educator">Educator</option>
              <option value="hoster">Hoster</option>
            </select>
          )}
          {error && <p className="error" role="alert">{error}</p>}
          <button disabled={loading}>
            {loading ? "Please wait…" : isRegistering ? "Create account" : "Sign in"}
          </button>
        </form>
        <button className="link" onClick={() => setIsRegistering(!isRegistering)}>
          {isRegistering ? "Already have an account? Sign in" : "Need an account? Register"}
        </button>
      </section>
    </main>
  );
}

function DebateRoom({ debate, token, onClose }) {
  const [current, setCurrent] = useState(0);
  const [remaining, setRemaining] = useState((debate.speakers[0]?.minutes || 3) * 60);
  const [paused, setPaused] = useState(false);
  const [messages, setMessages] = useState([]);
  const [message, setMessage] = useState("");
  const [note, setNote] = useState("");
  const [notes, setNotes] = useState([]);
  const speaker = debate.speakers[current] || { name: "Unknown", side: "N/A", minutes: 3 };

  useEffect(() => {
    request(`/debates/${debate.id}/messages`, {}, token).then(setMessages).catch(console.error);
    request(`/debates/${debate.id}/notes`, {}, token).then(setNotes).catch(console.error);
  }, [debate.id, token]);

  useEffect(() => {
    if (paused) return;
    const id = setInterval(() => setRemaining(value => value > 0 ? value - 1 : value), 1000);
    return () => clearInterval(id);
  }, [paused]);

  useEffect(() => { if (remaining === 0) nextSpeaker(); }, [remaining]);

  function nextSpeaker() {
    const next = (current + 1) % debate.speakers.length;
    setCurrent(next);
    setRemaining((debate.speakers[next]?.minutes || 3) * 60);
  }

  async function sendMessage(event) {
    event.preventDefault();
    if (!message.trim()) return;
    try {
      const saved = await request(
        `/debates/${debate.id}/messages`,
        { method: "POST", body: JSON.stringify({ body: message }) },
        token
      );
      setMessages([...messages, saved]);
      setMessage("");
    } catch (err) {
      alert(err.message);
    }
  }

  async function addNote(event) {
    event.preventDefault();
    if (!note.trim()) return;
    try {
      const saved = await request(
        `/debates/${debate.id}/notes`,
        { method: "POST", body: JSON.stringify({ body: note, speakerId: speaker?.id }) },
        token
      );
      setNotes([saved, ...notes]);
      setNote("");
    } catch (err) {
      alert(err.message);
    }
  }

  async function end() {
    await request(`/debates/${debate.id}/end`, { method: "PATCH" }, token);
    onClose();
  }

  return (
    <main>
      <header>
        <h1>{debate.topic}</h1>
        <button onClick={end}>End debate</button>
      </header>
      <div className="room">
        <section className="panel">
          <p className="eyebrow">NOW SPEAKING · {speaker?.side}</p>
          <h2>{speaker?.name}</h2>
          <div className="timer">{formatClock(remaining)}</div>
          <button onClick={() => setPaused(!paused)}>{paused ? "Resume" : "Pause"}</button>
          <button className="secondary" onClick={nextSpeaker}>Next speaker</button>
          <p>Order: {debate.speakers.map((item, index) => <span className={index === current ? "active" : ""} key={item.id}> {item.name} </span>)}</p>
        </section>
        <section className="panel">
          <h2>Room chat</h2>
          <div className="log">{messages.map(item => <p key={item.id}><b>{item.author_name}:</b> {item.body}</p>)}</div>
          <form onSubmit={sendMessage}><input value={message} onChange={e => setMessage(e.target.value)} placeholder="Write a message" /><button>Send</button></form>
        </section>
        <section className="panel">
          <h2>Private notes</h2>
          <form onSubmit={addNote}><input value={note} onChange={e => setNote(e.target.value)} placeholder={`Note about ${speaker?.name || "speaker"}`} /><button>Add</button></form>
          <div className="log">{notes.map(item => <p key={item.id}><b>{item.speaker_name || "General"}:</b> {item.body}</p>)}</div>
        </section>
      </div>
    </main>
  );
}

function Dashboard({ session, onLogout }) {
  const [debates, setDebates] = useState([]);
  const [active, setActive] = useState(null);
  const [topic, setTopic] = useState("");
  const [format, setFormat] = useState("Open debate");
  const [error, setError] = useState("");
  const token = session.token;

  async function load() {
    try {
      setDebates(await request("/debates", {}, token));
    } catch (err) {
      setError(err.message);
    }
  }

  useEffect(() => { load(); }, [token]);

  async function create(event) {
    event.preventDefault();
    try {
      const result = await request("/debates", {
        method: "POST",
        body: JSON.stringify({
          topic,
          format,
          speakers: [
            { name: session.user.name, side: "Proposition", minutes: 3 },
            { name: "Opponent", side: "Opposition", minutes: 3 }
          ]
        })
      }, token);
      setActive(result);
      setTopic("");
    } catch (err) {
      setError(err.message);
    }
  }

  if (active) return <DebateRoom debate={active} token={token} onClose={() => { setActive(null); load(); }} />;

  return (
    <main>
      <header>
        <div>
          <h1>AI Debate Coach</h1>
          <p>Welcome, {session.user.name}.</p>
        </div>
        <button onClick={onLogout}>Sign out</button>
      </header>
      <div className="layout">
        <section className="panel">
          <h2>Start a debate</h2>
          <form onSubmit={create}>
            <input value={topic} required onChange={e => setTopic(e.target.value)} placeholder="Debate topic" />
            <input value={format} required onChange={e => setFormat(e.target.value)} placeholder="Format" />
            <button>Create live room</button>
          </form>
          {error && <p className="error">{error}</p>}
        </section>
        <section className="panel">
          <h2>Your debates</h2>
          {debates.length ? debates.map(item => <article className="debate" key={item.id}><b>{item.topic}</b><span>{item.format} · {item.status}</span><button onClick={() => request(`/debates/${item.id}`, {}, token).then(setActive).catch(err => setError(err.message))}>Open</button></article>) : <p>No debates yet.</p>}
        </section>
      </div>
    </main>
  );
}

export default function App() {
  const [session, setSession] = useState(() => {
    try { return JSON.parse(localStorage.getItem("debate_session")); }
    catch { return null; }
  });

  function authenticate(data) {
    localStorage.setItem("debate_session", JSON.stringify(data));
    setSession(data);
  }
  function logout() {
    localStorage.removeItem("debate_session");
    setSession(null);
  }

  return (
    <>
      <style>{`*{box-sizing:border-box}body{margin:0;background:#f5f7fb;color:#172033;font:16px system-ui,sans-serif}main{max-width:1100px;margin:auto;padding:32px}header{display:flex;justify-content:space-between;align-items:center;margin-bottom:24px}.auth{min-height:100vh;display:grid;place-items:center}.auth .panel{width:min(440px,100%)}.panel{background:#fff;border-radius:14px;padding:24px;box-shadow:0 4px 20px #17203316}.layout,.room{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:20px}form{display:grid;gap:12px}input,select,button{border:1px solid #cbd5e1;border-radius:8px;padding:11px;font:inherit}button{background:#2563eb;color:#fff;border:0;cursor:pointer}.secondary,.link{background:transparent;color:#2563eb}.link{padding:12px 0}.error{color:#b91c1c}.timer{font-size:52px;font-weight:700;margin:20px 0}.active{font-weight:700;color:#2563eb}.log{height:220px;overflow:auto;border-block:1px solid #e2e8f0;margin:14px 0}.debate{display:grid;gap:7px;padding:12px 0;border-bottom:1px solid #e2e8f0}.eyebrow{font-size:12px;font-weight:700;color:#2563eb}`}</style>
      {session ? <Dashboard session={session} onLogout={logout} /> : <AuthScreen onAuthenticated={authenticate} />}
    </>
  );
}
