import { useState, useEffect, useCallback } from "react";

const API = "http://localhost:8000/api";

async function apiFetch(path, options = {}, token = null) {
  const headers = { "Content-Type": "application/json", ...options.headers };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const res = await fetch(`${API}${path}`, { ...options, headers });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || "Request failed");
  }
  return res.json();
}

async function apiUpload(path, formData, token = null) {
  const headers = {};
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const res = await fetch(`${API}${path}`, { method: "POST", headers, body: formData });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || "Upload failed");
  }
  return res.json();
}

const icons = {
  shield: "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z",
  map: "M1 6v16l7-4 8 4 7-4V2l-7 4-8-4-7 4z M8 2v16 M16 6v16",
  alert: "M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z M12 9v4 M12 17h.01",
  check: "M22 11.08V12a10 10 0 11-5.93-9.14 M22 4L12 14.01l-3-3",
  upload: "M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4 M17 8l-5-5-5 5 M12 3v12",
  eye: "M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z M12 9a3 3 0 100 6 3 3 0 000-6z",
  x: "M18 6L6 18 M6 6l12 12",
  camera: "M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z M12 13a3 3 0 100-6 3 3 0 000 6z",
  lock: "M19 11H5a2 2 0 00-2 2v7a2 2 0 002 2h14a2 2 0 002-2v-7a2 2 0 00-2-2z M7 11V7a5 5 0 0110 0v4",
  user: "M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2 M12 11a4 4 0 100-8 4 4 0 000 8z",
  satellite: "M13 7L9.8 9.8l-4.6-2-5.2 5.2 2 4.6L5 21l5.2-5.2-2-4.6 2.8-3.2z M21 3L13 7l4 4 4-8z",
  clock: "M12 22a10 10 0 100-20 10 10 0 000 20z M12 6v6l4 2",
  coins: "M12 2a10 10 0 100 20A10 10 0 0012 2z M12 6v6l4 2",
  layers: "M12 2L2 7l10 5 10-5-10-5z M2 17l10 5 10-5 M2 12l10 5 10-5",
  refresh: "M23 4v6h-6 M1 20v-6h6 M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15",
  login: "M15 3h4a2 2 0 012 2v14a2 2 0 01-2 2h-4 M10 17l5-5-5-5 M15 12H3",
  logout: "M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4 M16 17l5-5-5-5 M21 12H9",
};

const SVGIcon = ({ name, size = 16, color = "currentColor" }) => {
  const d = icons[name];
  if (!d) return null;
  const paths = d.split(" M ").map((p, i) => (i === 0 ? p : "M " + p));
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      {paths.map((path, i) => <path key={i} d={path} />)}
    </svg>
  );
};

const Badge = ({ children, color = "blue" }) => {
  const colors = {
    blue: "bg-blue-500/20 text-blue-300 border-blue-500/30",
    red: "bg-red-500/20 text-red-300 border-red-500/30",
    yellow: "bg-yellow-500/20 text-yellow-300 border-yellow-500/30",
    green: "bg-green-500/20 text-green-300 border-green-500/30",
    orange: "bg-orange-500/20 text-orange-300 border-orange-500/30",
    gray: "bg-gray-500/20 text-gray-400 border-gray-500/30",
    purple: "bg-purple-500/20 text-purple-300 border-purple-500/30",
  };
  return <span className={`text-xs px-2 py-0.5 rounded border font-mono font-medium ${colors[color]}`}>{children}</span>;
};

const GlowDot = ({ color = "red", pulse = true }) => {
  const c = { red: "bg-red-500", yellow: "bg-yellow-400", green: "bg-green-400", blue: "bg-blue-400", orange: "bg-orange-400" };
  return (
    <span className="relative flex h-2.5 w-2.5">
      {pulse && <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${c[color]} opacity-60`}></span>}
      <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${c[color]}`}></span>
    </span>
  );
};

const Spinner = () => (
  <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="10" strokeOpacity="0.25" />
    <path d="M12 2a10 10 0 0110 10" />
  </svg>
);

const ErrorBanner = ({ msg, onClose }) => (
  <div className="flex items-center gap-3 px-4 py-3 rounded-xl mb-4" style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)" }}>
    <SVGIcon name="alert" size={16} color="#ef4444" />
    <p className="text-red-400 text-sm flex-1">{msg}</p>
    {onClose && <button onClick={onClose}><SVGIcon name="x" size={14} color="#ef4444" /></button>}
  </div>
);

const useAuth = () => {
  const [token, setToken]   = useState(() => localStorage.getItem("gg_token"));
  const [role, setRole]     = useState(() => localStorage.getItem("gg_role"));
  const [userId, setUserId] = useState(() => localStorage.getItem("gg_uid"));

  const login = async (username, password) => {
    const data = await apiFetch("/auth/login", { method: "POST", body: JSON.stringify({ username, password }) });
    localStorage.setItem("gg_token", data.access_token);
    localStorage.setItem("gg_role",  data.role);
    localStorage.setItem("gg_uid",   data.user_id);
    setToken(data.access_token); setRole(data.role); setUserId(data.user_id);
    return data;
  };

  const logout = () => {
    ["gg_token","gg_role","gg_uid"].forEach(k => localStorage.removeItem(k));
    setToken(null); setRole(null); setUserId(null);
  };

  return { token, role, userId, login, logout, isLoggedIn: !!token };
};

const LoginModal = ({ onLogin, onClose, authHook }) => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState("");

  const handleLogin = async () => {
    if (!username || !password) return;
    setLoading(true); setError("");
    try { const data = await authHook.login(username, password); onLogin(data); }
    catch (e) { setError(e.message); }
    finally { setLoading(false); }
  };

  const presets = [
    { label: "Police Officer", user: "officer_sharma", pass: "police123", color: "#60a5fa" },
    { label: "State Admin",    user: "state_admin",    pass: "state123",  color: "#a78bfa" },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(8px)" }}>
      <div style={{ background: "#0d1117", border: "1px solid rgba(255,255,255,0.1)", width: 400 }} className="rounded-2xl p-6">
        <div className="flex items-center justify-between mb-5">
          <h3 style={{ fontFamily: "'Space Mono', monospace", color: "#00ffaa" }} className="font-bold text-lg">Staff Login</h3>
          <button onClick={onClose}><SVGIcon name="x" size={18} color="#6b7280" /></button>
        </div>
        {error && <ErrorBanner msg={error} onClose={() => setError("")} />}
        <div className="space-y-3 mb-4">
          <input value={username} onChange={e => setUsername(e.target.value)} placeholder="Username"
            className="w-full rounded-lg px-3 py-2.5 text-sm text-gray-200 placeholder-gray-600 outline-none"
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }} />
          <input value={password} onChange={e => setPassword(e.target.value)} placeholder="Password" type="password"
            onKeyDown={e => e.key === "Enter" && handleLogin()}
            className="w-full rounded-lg px-3 py-2.5 text-sm text-gray-200 placeholder-gray-600 outline-none"
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }} />
        </div>
        <div className="flex gap-2 mb-4">
          {presets.map(p => (
            <button key={p.user} onClick={() => { setUsername(p.user); setPassword(p.pass); }}
              className="flex-1 py-1.5 rounded-lg text-xs font-mono"
              style={{ background: `${p.color}15`, border: `1px solid ${p.color}30`, color: p.color }}>
              {p.label}
            </button>
          ))}
        </div>
        <button onClick={handleLogin} disabled={loading}
          className="w-full py-3 rounded-xl font-mono font-bold text-sm tracking-widest flex items-center justify-center gap-2 disabled:opacity-50"
          style={{ background: "linear-gradient(135deg,#00ffaa,#0077ff)", color: "#000" }}>
          {loading ? <Spinner /> : <SVGIcon name="login" size={15} color="#000" />}
          {loading ? "LOGGING IN…" : "LOGIN →"}
        </button>
      </div>
    </div>
  );
};

const NavBar = ({ page, setPage, auth, onLoginClick, onLogout }) => {
  const tabs = [
    { id: 1, label: "Citizen Portal", icon: "user" },
    { id: 2, label: "Police Command", icon: "shield" },
    { id: 3, label: "State Oversight", icon: "eye" },
  ];
  const roleColor = { police: "#60a5fa", state: "#a78bfa", citizen: "#00ffaa" };
  return (
    <header style={{ background: "rgba(5,7,15,0.97)", borderBottom: "1px solid rgba(0,255,170,0.12)" }} className="sticky top-0 z-40 backdrop-blur-xl">
      <div className="max-w-screen-xl mx-auto flex items-center justify-between px-6 py-3">
        <div className="flex items-center gap-3">
          <div style={{ background: "linear-gradient(135deg,#00ffaa,#0077ff)" }} className="w-8 h-8 rounded-lg flex items-center justify-center">
            <SVGIcon name="satellite" size={16} color="#000" />
          </div>
          <div>
            <span style={{ fontFamily: "'Space Mono', monospace", letterSpacing: "0.12em", color: "#00ffaa" }} className="text-sm font-bold">GeoGuard</span>
            <span className="text-gray-600 text-xs ml-2 font-mono">v2.4.1 · LIVE API</span>
          </div>
        </div>
        <nav className="flex gap-1">
          {tabs.map(t => (
            <button key={t.id} onClick={() => setPage(t.id)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-200"
              style={{
                background: page === t.id ? "rgba(0,255,170,0.12)" : "transparent",
                color: page === t.id ? "#00ffaa" : "#6b7280",
                border: page === t.id ? "1px solid rgba(0,255,170,0.25)" : "1px solid transparent",
                fontFamily: "'Space Mono', monospace", fontSize: "11px", letterSpacing: "0.05em"
              }}>
              <SVGIcon name={t.icon} size={13} color={page === t.id ? "#00ffaa" : "#6b7280"} />
              {t.label}
            </button>
          ))}
        </nav>
        <div className="flex items-center gap-3">
          {auth.isLoggedIn ? (
            <>
              <div className="flex items-center gap-2">
                <GlowDot color="green" />
                <span className="text-xs font-mono" style={{ color: roleColor[auth.role] || "#00ffaa" }}>{auth.role?.toUpperCase()}</span>
              </div>
              <button onClick={onLogout} className="flex items-center gap-1.5 text-xs font-mono text-gray-500 hover:text-gray-300">
                <SVGIcon name="logout" size={13} color="currentColor" /> Logout
              </button>
            </>
          ) : (
            <button onClick={onLoginClick}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono"
              style={{ background: "rgba(0,255,170,0.08)", border: "1px solid rgba(0,255,170,0.2)", color: "#00ffaa" }}>
              <SVGIcon name="login" size={12} color="#00ffaa" /> Staff Login
            </button>
          )}
        </div>
      </div>
    </header>
  );
};

const CitizenPortal = () => {
  const [step, setStep]       = useState("form");
  const [tipId, setTipId]     = useState("");
  const [form, setForm]       = useState({ coords: "", description: "", file: null });
  const [analyzing, setAnalyzing] = useState(0);
  const [aiStatus, setAiStatus]   = useState(null);
  const [bankDetails, setBankDetails] = useState({ bank_account: "", bank_ifsc: "", bank_holder: "" });
  const [rewardSubmitted, setRewardSubmitted] = useState(false);
  const [error, setError]     = useState("");
  const [loading, setLoading] = useState(false);
  const [trackId, setTrackId] = useState("");
  const [trackedTip, setTrackedTip] = useState(null);

  const handleSubmit = async () => {
    if (!form.description) return;
    setLoading(true); setError("");
    try {
      const fd = new FormData();
      fd.append("description", form.description);
      if (form.coords) {
        const parts = form.coords.split(",");
        if (parts.length === 2) {
          fd.append("latitude",  parseFloat(parts[0].trim()));
          fd.append("longitude", parseFloat(parts[1].trim()));
        }
      }
      if (form.file) fd.append("image", form.file);
      const tip = await apiUpload("/tips/submit", fd);
      setTipId(tip.id); setStep("analyzing");
      let pct = 0;
      const iv = setInterval(() => { pct += Math.random() * 12 + 4; setAnalyzing(Math.min(95, Math.floor(pct))); }, 300);
      let attempts = 0;
      const poll = setInterval(async () => {
        attempts++;
        try {
          const status = await apiFetch(`/tips/${tip.id}/ai-status`);
          if (status.score !== 0 || attempts > 8) {
            clearInterval(poll); clearInterval(iv);
            setAnalyzing(100); setAiStatus(status);
            setTimeout(() => setStep("success"), 600);
          }
        } catch {}
      }, 1500);
    } catch (e) { setError(e.message); setStep("form"); }
    finally { setLoading(false); }
  };

  const handleBankLink = async () => {
    if (!bankDetails.bank_account || !bankDetails.bank_ifsc || !bankDetails.bank_holder) return;
    setLoading(true);
    try {
      await apiFetch(`/tips/${tipId}/bank`, { method: "POST", body: JSON.stringify(bankDetails) });
      setRewardSubmitted(true);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  };

  const handleTrack = async () => {
    if (!trackId.trim()) return;
    try {
      const tip = await apiFetch(`/tips/${trackId.trim()}`);
      setTrackedTip(tip);
    } catch { setTrackedTip({ error: "Tip not found" }); }
  };

  const statusColor = { pending:"yellow", verified:"green", ai_failed:"red", rewarded:"purple" };
  const analyzeSteps = ["Stripping EXIF metadata…","Analyzing pixel noise…","Deepfake detection (FakeCatcher)…","Cross-referencing GPS…","Encrypting submission…"];

  return (
    <div className="min-h-screen" style={{ background: "radial-gradient(ellipse at 20% 20%, rgba(0,60,40,0.18) 0%, transparent 50%), #05070f" }}>
      <div className="max-w-2xl mx-auto px-4 py-10">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 bg-green-500/10 border border-green-500/20 rounded-full px-4 py-1.5 mb-4">
            <GlowDot color="green" /><span className="text-green-400 text-xs font-mono tracking-widest">END-TO-END ENCRYPTED · ANONYMOUS</span>
          </div>
          <h1 style={{ fontFamily: "'Space Mono', monospace", color: "#fff" }} className="text-3xl font-bold mb-2">Report Illegal Mining</h1>
          <p className="text-gray-500 text-sm">Your identity is never stored. Tips are linked only to a random ID.</p>
        </div>

        <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }} className="rounded-xl p-4 mb-6">
          <p className="text-gray-500 text-xs font-mono mb-2">TRACK EXISTING TIP</p>
          <div className="flex gap-2">
            <input value={trackId} onChange={e => setTrackId(e.target.value)} placeholder="Enter Tip ID e.g. MIN-4829"
              className="flex-1 rounded-lg px-3 py-2 text-sm font-mono text-gray-200 placeholder-gray-600 outline-none"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }} />
            <button onClick={handleTrack} className="px-4 py-2 rounded-lg text-xs font-mono font-bold"
              style={{ background: "rgba(0,255,170,0.08)", border: "1px solid rgba(0,255,170,0.2)", color: "#00ffaa" }}>TRACK</button>
          </div>
          {trackedTip && (
            <div className="mt-3 p-3 rounded-lg" style={{ background: "rgba(0,0,0,0.3)" }}>
              {trackedTip.error ? <p className="text-red-400 text-xs font-mono">{trackedTip.error}</p> : (
                <div className="flex items-center justify-between">
                  <span style={{ fontFamily: "'Space Mono', monospace", color: "#00ffaa" }} className="text-sm font-bold">#{trackedTip.id}</span>
                  <Badge color={statusColor[trackedTip.status] || "gray"}>{trackedTip.status?.toUpperCase()}</Badge>
                  {trackedTip.reward_amount && <span className="text-yellow-400 text-xs font-mono">₹{trackedTip.reward_amount?.toLocaleString()}</span>}
                </div>
              )}
            </div>
          )}
        </div>

        {error && <ErrorBanner msg={error} onClose={() => setError("")} />}

        {step === "form" && (
          <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }} className="rounded-2xl p-6 space-y-5">
            <div>
              <label className="block text-xs font-mono text-gray-400 mb-2 tracking-widest uppercase">GPS Coordinates (optional)</label>
              <input value={form.coords} onChange={e => setForm({ ...form, coords: e.target.value })} placeholder="e.g. 27.4756, 80.2347"
                className="w-full rounded-lg px-4 py-3 text-sm font-mono text-gray-200 placeholder-gray-600 outline-none"
                style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }} />
            </div>
            <div>
              <label className="block text-xs font-mono text-gray-400 mb-2 tracking-widest uppercase">Description *</label>
              <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={3}
                placeholder="Describe what you saw — time, type of equipment, number of people..."
                className="w-full rounded-lg px-4 py-3 text-sm text-gray-200 placeholder-gray-600 outline-none resize-none"
                style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }} />
            </div>
            <div>
              <label className="block text-xs font-mono text-gray-400 mb-2 tracking-widest uppercase">Upload Photo / Video</label>
              <div style={{ border: "2px dashed rgba(0,255,170,0.15)", background: "rgba(0,255,170,0.02)" }} className="rounded-xl p-5 text-center">
                <input type="file" accept="image/*,video/*" onChange={e => setForm({ ...form, file: e.target.files[0] })} className="hidden" id="file-up" />
                <label htmlFor="file-up" className="cursor-pointer">
                  <SVGIcon name="camera" size={28} color="#00ffaa55" />
                  <p className="text-gray-600 text-sm mt-2 font-mono">{form.file ? form.file.name : "Click to upload"}</p>
                  <p className="text-gray-700 text-xs mt-1">EXIF stripped automatically · Max 50MB</p>
                </label>
              </div>
            </div>
            <div style={{ background: "rgba(0,119,255,0.06)", border: "1px solid rgba(0,119,255,0.15)" }} className="rounded-xl p-4 flex gap-3">
              <SVGIcon name="lock" size={16} color="#60a5fa" />
              <p className="text-blue-300/80 text-xs leading-relaxed">Submission encrypted before leaving your device. No personal data collected. Random Tip ID generated.</p>
            </div>
            <button onClick={handleSubmit} disabled={!form.description || loading}
              className="w-full py-3.5 rounded-xl font-mono font-bold text-sm tracking-widest flex items-center justify-center gap-2 disabled:opacity-40"
              style={{ background: form.description ? "linear-gradient(135deg,#00ffaa,#0077ff)" : "#1f2937", color: form.description ? "#000" : "#6b7280" }}>
              {loading ? <Spinner /> : null}{loading ? "SUBMITTING…" : "SUBMIT ANONYMOUS TIP →"}
            </button>
          </div>
        )}

        {step === "analyzing" && (
          <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }} className="rounded-2xl p-8 text-center">
            <div className="relative w-20 h-20 mx-auto mb-4">
              <svg className="w-20 h-20 -rotate-90" viewBox="0 0 80 80">
                <circle cx="40" cy="40" r="34" fill="none" stroke="rgba(0,255,170,0.1)" strokeWidth="4" />
                <circle cx="40" cy="40" r="34" fill="none" stroke="#00ffaa" strokeWidth="4"
                  strokeDasharray={`${2 * Math.PI * 34}`}
                  strokeDashoffset={`${2 * Math.PI * 34 * (1 - analyzing / 100)}`}
                  style={{ transition: "stroke-dashoffset 0.3s ease" }} />
              </svg>
              <span style={{ fontFamily: "'Space Mono', monospace", color: "#00ffaa" }} className="absolute inset-0 flex items-center justify-center text-lg font-bold">{analyzing}%</span>
            </div>
            <h3 style={{ fontFamily: "'Space Mono', monospace", color: "#00ffaa" }} className="text-lg font-bold mb-1">AI Pre-Check Running</h3>
            <p className="text-gray-500 text-sm">{analyzeSteps[Math.min(4, Math.floor(analyzing / 22))]}</p>
            <p className="text-gray-600 text-xs mt-2 font-mono">Tip ID saved to database: #{tipId}</p>
          </div>
        )}

        {step === "success" && (
          <div className="space-y-5">
            <div style={{ background: "rgba(0,255,170,0.05)", border: "1px solid rgba(0,255,170,0.2)" }} className="rounded-2xl p-6 text-center">
              <div style={{ background: "rgba(0,255,170,0.1)", border: "2px solid rgba(0,255,170,0.3)" }} className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <SVGIcon name="check" size={28} color="#00ffaa" />
              </div>
              <h3 style={{ fontFamily: "'Space Mono', monospace", color: "#00ffaa" }} className="text-xl font-bold mb-1">Tip Saved to Database</h3>
              <p className="text-gray-500 text-sm mb-4">Save your Tip ID — it's the only way to track your report.</p>
              <div style={{ background: "rgba(0,0,0,0.4)", border: "1px solid rgba(0,255,170,0.3)" }} className="rounded-xl p-4 inline-block">
                <span className="text-gray-500 text-xs font-mono block mb-1">YOUR TIP ID</span>
                <span style={{ fontFamily: "'Space Mono', monospace", color: "#00ffaa", fontSize: "28px", letterSpacing: "0.15em" }} className="font-black">#{tipId}</span>
              </div>
              <div className="mt-3 flex gap-2 justify-center flex-wrap">
                {aiStatus?.passed ? <Badge color="green">AI VERIFIED ✓</Badge> : <Badge color="yellow">AI PENDING</Badge>}
                <Badge color="blue">IN DATABASE</Badge><Badge color="purple">ANONYMOUS</Badge>
              </div>
              {aiStatus && (
                <p className="text-xs font-mono mt-2" style={{ color: aiStatus.passed ? "#10b981" : "#ef4444" }}>
                  Deepfake score: {(aiStatus.score * 100).toFixed(1)}% — {aiStatus.message}
                </p>
              )}
            </div>
            <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }} className="rounded-2xl p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <SVGIcon name="coins" size={18} color="#f59e0b" />
                  <h4 style={{ fontFamily: "'Space Mono', monospace" }} className="text-sm font-bold text-white">Claim Reward</h4>
                </div>
                <Badge color="yellow">₹5,000 – ₹50,000</Badge>
              </div>
              {!rewardSubmitted ? (
                <div className="space-y-3">
                  <input value={bankDetails.bank_account} onChange={e => setBankDetails({ ...bankDetails, bank_account: e.target.value })} placeholder="Account Number"
                    className="w-full rounded-lg px-3 py-2.5 text-sm font-mono text-gray-200 placeholder-gray-600 outline-none"
                    style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }} />
                  <div className="grid grid-cols-2 gap-3">
                    <input value={bankDetails.bank_ifsc} onChange={e => setBankDetails({ ...bankDetails, bank_ifsc: e.target.value })} placeholder="IFSC Code (11 chars)"
                      className="rounded-lg px-3 py-2.5 text-sm font-mono text-gray-200 placeholder-gray-600 outline-none"
                      style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }} />
                    <input value={bankDetails.bank_holder} onChange={e => setBankDetails({ ...bankDetails, bank_holder: e.target.value })} placeholder="Account Holder Name"
                      className="rounded-lg px-3 py-2.5 text-sm text-gray-200 placeholder-gray-600 outline-none"
                      style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }} />
                  </div>
                  <button onClick={handleBankLink} disabled={loading}
                    className="w-full py-2.5 rounded-xl text-sm font-mono font-bold tracking-wider flex items-center justify-center gap-2 disabled:opacity-50"
                    style={{ background: "rgba(245,158,11,0.15)", border: "1px solid rgba(245,158,11,0.3)", color: "#f59e0b" }}>
                    {loading ? <Spinner /> : null} LINK BANK TO TIP #{tipId}
                  </button>
                </div>
              ) : (
                <div className="text-center py-3">
                  <SVGIcon name="lock" size={20} color="#10b981" />
                  <p className="text-green-400 text-sm font-mono mt-2">Bank details linked in database</p>
                  <p className="text-gray-600 text-xs mt-1">Reward auto-triggered on state verification.</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const PoliceCommand = ({ auth, onLoginNeeded }) => {
  const [alerts, setAlerts]     = useState([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState("");
  const [selected, setSelected] = useState(null);
  const [filter, setFilter]     = useState("all");
  const [showResolveModal, setShowResolveModal] = useState(false);
  const [resolving, setResolving]   = useState(null);
  const [videoFile, setVideoFile]   = useState(null);
  const [firFile, setFirFile]       = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchAlerts = useCallback(async () => {
    try {
      const data = await apiFetch("/alerts/public/list");
      setAlerts(data);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchAlerts(); const iv = setInterval(fetchAlerts, 10000); return () => clearInterval(iv); }, [fetchAlerts]);

  const dispatch = async (alertId) => {
    if (!auth.isLoggedIn) { onLoginNeeded(); return; }
    setActionLoading(true);
    try {
      await apiFetch("/drones/dispatch", { method: "POST", body: JSON.stringify({ alert_id: alertId }) }, auth.token);
      await fetchAlerts();
    } catch (e) { setError(e.message); }
    finally { setActionLoading(false); }
  };

  const acceptCase = async (alertId) => {
    if (!auth.isLoggedIn) { onLoginNeeded(); return; }
    setActionLoading(true);
    try {
      await apiFetch(`/alerts/${alertId}/accept`, { method: "POST" }, auth.token);
      await fetchAlerts();
    } catch (e) { setError(e.message); }
    finally { setActionLoading(false); }
  };

  const submitResolve = async () => {
    if (!videoFile || !firFile) { setError("Both video and FIR document are required"); return; }
    setActionLoading(true);
    try {
      const caseData = await apiFetch("/cases/", { method: "POST", body: JSON.stringify({ alert_id: resolving, suspects_count: 1, mining_type: "Other" }) }, auth.token);
      const fd = new FormData();
      fd.append("video", videoFile); fd.append("fir", firFile);
      await apiUpload(`/cases/${caseData.id}/evidence`, fd, auth.token);
      setShowResolveModal(false); setResolving(null); setVideoFile(null); setFirFile(null);
      await fetchAlerts();
    } catch (e) { setError(e.message); }
    finally { setActionLoading(false); }
  };

  const statusColor = { unverified:"yellow", drone_en_route:"blue", drone_verifying:"orange", confirmed:"red", accepted:"orange", resolved:"green" };
  const statusLabel = { unverified:"UNVERIFIED", drone_en_route:"DRONE EN ROUTE", drone_verifying:"VERIFYING…", confirmed:"CONFIRMED", accepted:"CASE ACCEPTED", resolved:"RESOLVED" };
  const severityColors = { critical:"red", high:"orange", medium:"yellow", low:"blue" };
  const filteredAlerts = filter === "all" ? alerts : alerts.filter(a => a.type === filter);
  const activeCount = alerts.filter(a => a.status !== "resolved").length;

  const mapDots = alerts.filter(a => a.latitude && a.longitude).map(a => {
    const minLat=27.2, maxLat=27.9, minLng=79.9, maxLng=81.0;
    return { x: ((a.longitude-minLng)/(maxLng-minLng))*80+10, y: (1-(a.latitude-minLat)/(maxLat-minLat))*80+10, type:a.type, id:a.id, status:a.status };
  });

  return (
    <div className="min-h-screen" style={{ background: "#05070f" }}>
      <div style={{ background:"rgba(255,255,255,0.02)", borderBottom:"1px solid rgba(255,255,255,0.05)" }} className="px-6 py-3">
        <div className="max-w-screen-xl mx-auto flex items-center justify-between">
          <span style={{ fontFamily:"'Space Mono', monospace", color:"#fff" }} className="text-sm font-bold">Rajasthan Police · Khetri District HQ</span>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2"><GlowDot color="red" />
              <span className="text-red-400 text-xs font-mono font-bold">{activeCount} ACTIVE ALERTS</span></div>
            {!auth.isLoggedIn && (
              <button onClick={onLoginNeeded} className="text-xs font-mono px-3 py-1.5 rounded-lg"
                style={{ background:"rgba(0,255,170,0.08)", border:"1px solid rgba(0,255,170,0.2)", color:"#00ffaa" }}>LOGIN TO ACT</button>
            )}
            <button onClick={fetchAlerts}><SVGIcon name="refresh" size={14} color="#6b7280" /></button>
          </div>
        </div>
      </div>
      {error && <div className="max-w-screen-xl mx-auto px-6 pt-4"><ErrorBanner msg={error} onClose={() => setError("")} /></div>}
      <div className="max-w-screen-xl mx-auto px-6 py-5 flex gap-5" style={{ height:"calc(100vh - 120px)" }}>
        <div className="flex-1 flex flex-col gap-4">
          <div style={{ background:"rgba(255,255,255,0.02)", border:"1px solid rgba(255,255,255,0.06)" }} className="rounded-2xl p-4 flex-1 relative overflow-hidden">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <SVGIcon name="map" size={14} color="#00ffaa" />
                <span style={{ fontFamily:"'Space Mono', monospace" }} className="text-xs font-bold text-white tracking-widest">LIVE THREAT MAP · {alerts.length} ALERTS · REAL DATA</span>
              </div>
              <div className="flex gap-3 text-xs font-mono">
                <span className="flex items-center gap-1.5 text-red-400"><span className="w-2 h-2 rounded-full bg-red-500 inline-block"></span>Satellite</span>
                <span className="flex items-center gap-1.5 text-yellow-400"><span className="w-2 h-2 rounded-full bg-yellow-400 inline-block"></span>Citizen</span>
                <span className="flex items-center gap-1.5 text-blue-400"><span className="w-2 h-2 rounded-full bg-blue-400 inline-block animate-pulse"></span>Drone</span>
              </div>
            </div>
            <div className="relative w-full rounded-xl overflow-hidden" style={{ height:"calc(100% - 40px)", background:"linear-gradient(160deg,#0a1628 0%,#081a12 40%,#0d1a08 70%,#0a1628 100%)" }}>
              {[...Array(8)].map((_,i) => <div key={i} style={{ position:"absolute", top:`${(i+1)*12.5}%`, left:0, right:0, height:"1px", background:"rgba(0,255,170,0.04)" }} />)}
              {[...Array(10)].map((_,i) => <div key={i} style={{ position:"absolute", left:`${(i+1)*10}%`, top:0, bottom:0, width:"1px", background:"rgba(0,255,170,0.04)" }} />)}
              <div style={{ position:"absolute", top:"20%", left:"15%", width:"25%", height:"30%", background:"rgba(0,80,40,0.2)", borderRadius:"40% 60% 70% 30%", filter:"blur(12px)" }} />
              <div style={{ position:"absolute", top:"40%", left:"50%", width:"30%", height:"25%", background:"rgba(0,60,30,0.18)", borderRadius:"60% 40% 30% 70%", filter:"blur(16px)" }} />
              {loading ? (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-gray-500 text-sm font-mono flex items-center gap-2"><Spinner />Loading from database…</div>
                </div>
              ) : mapDots.map((dot, i) => {
                const colors = { satellite:"#ef4444", citizen:"#facc15" };
                const color = ["drone_en_route","drone_verifying"].includes(dot.status) ? "#60a5fa" : colors[dot.type] || "#9ca3af";
                const isSel = selected === dot.id;
                return (
                  <div key={i} onClick={() => setSelected(dot.id)} style={{ position:"absolute", left:`${dot.x}%`, top:`${dot.y}%`, transform:"translate(-50%,-50%)", cursor:"pointer", zIndex: isSel?10:1 }}>
                    <span className="relative flex" style={{ width:isSel?20:14, height:isSel?20:14 }}>
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-50" style={{ background:color }}></span>
                      <span className="relative inline-flex rounded-full w-full h-full border-2" style={{ background:color, borderColor:isSel?"#fff":"transparent" }}></span>
                    </span>
                  </div>
                );
              })}
              <div style={{ position:"absolute", bottom:12, right:12, background:"rgba(0,0,0,0.5)", border:"1px solid rgba(255,255,255,0.1)", borderRadius:6, padding:"4px 10px" }}>
                <span className="text-gray-500 text-xs font-mono">localhost:8000 · Auto-refresh 10s</span>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-4 gap-3">
            {[
              { label:"CITIZEN TIPS", val:alerts.filter(a=>a.type==="citizen").length, color:"#facc15", icon:"user" },
              { label:"SATELLITE HITS", val:alerts.filter(a=>a.type==="satellite").length, color:"#ef4444", icon:"satellite" },
              { label:"DRONES ACTIVE", val:alerts.filter(a=>["drone_en_route","drone_verifying"].includes(a.status)).length, color:"#60a5fa", icon:"layers" },
              { label:"RESOLVED", val:alerts.filter(a=>a.status==="resolved").length, color:"#10b981", icon:"check" },
            ].map(s => (
              <div key={s.label} style={{ background:"rgba(255,255,255,0.02)", border:"1px solid rgba(255,255,255,0.06)" }} className="rounded-xl p-4 flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background:`${s.color}15` }}>
                  <SVGIcon name={s.icon} size={16} color={s.color} />
                </div>
                <div>
                  <div style={{ fontFamily:"'Space Mono', monospace", color:s.color }} className="text-xl font-black">{s.val}</div>
                  <div className="text-gray-600 text-xs font-mono">{s.label}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="w-80 flex flex-col gap-3" style={{ overflowY:"auto" }}>
          <div className="flex items-center justify-between">
            <span style={{ fontFamily:"'Space Mono', monospace" }} className="text-xs font-bold text-white tracking-widest">LIVE ALERT FEED</span>
            <div className="flex gap-1">
              {["all","citizen","satellite"].map(f => (
                <button key={f} onClick={() => setFilter(f)} className="text-xs font-mono px-2 py-1 rounded"
                  style={{ background:filter===f?"rgba(0,255,170,0.1)":"transparent", color:filter===f?"#00ffaa":"#6b7280", border:`1px solid ${filter===f?"rgba(0,255,170,0.2)":"transparent"}` }}>{f}</button>
              ))}
            </div>
          </div>
          {loading && <div className="text-center text-gray-600 text-sm font-mono py-8 flex items-center justify-center gap-2"><Spinner />Loading…</div>}
          {filteredAlerts.map(a => (
            <div key={a.id} onClick={() => setSelected(a.id)}
              style={{ background:selected===a.id?"rgba(0,255,170,0.04)":"rgba(255,255,255,0.02)", border:`1px solid ${selected===a.id?"rgba(0,255,170,0.2)":"rgba(255,255,255,0.06)"}`, cursor:"pointer" }}
              className="rounded-xl p-4 space-y-3 transition-all">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <span style={{ fontFamily:"'Space Mono', monospace", color:"#00ffaa" }} className="text-xs font-bold">#{a.id}</span>
                  <p className="text-white text-xs font-medium mt-0.5">{a.location}</p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <Badge color={severityColors[a.severity]}>{a.severity?.toUpperCase()}</Badge>
                  <span className="text-gray-600 text-xs font-mono">{new Date(a.created_at).toLocaleTimeString("en-IN",{hour:"2-digit",minute:"2-digit"})}</span>
                </div>
              </div>
              <p className="text-gray-500 text-xs leading-relaxed">{a.description}</p>
              <div className="flex items-center gap-2">
                <GlowDot color={statusColor[a.status]||"gray"} pulse={a.status!=="resolved"} />
                <span className="text-xs font-mono" style={{ color:a.status==="resolved"?"#10b981":a.status==="confirmed"?"#ef4444":"#9ca3af" }}>{statusLabel[a.status]||a.status?.toUpperCase()}</span>
              </div>
              <div className="space-y-2">
                {a.status==="unverified" && (
                  <button onClick={e=>{e.stopPropagation();dispatch(a.id);}} disabled={actionLoading}
                    className="w-full py-2 rounded-lg text-xs font-mono font-bold flex items-center justify-center gap-1 disabled:opacity-50"
                    style={{ background:"rgba(96,165,250,0.1)", border:"1px solid rgba(96,165,250,0.25)", color:"#60a5fa" }}>
                    {actionLoading?<Spinner/>:null} DISPATCH NIGHT-VISION DRONE
                  </button>
                )}
                {(a.status==="drone_en_route"||a.status==="drone_verifying") && (
                  <div className="w-full py-2 rounded-lg text-xs font-mono text-center animate-pulse"
                    style={{ background:"rgba(96,165,250,0.06)", border:"1px solid rgba(96,165,250,0.2)", color:"#60a5fa" }}>
                    {a.status==="drone_en_route"?"DRONE EN ROUTE…":"DRONE VERIFYING…"}
                  </div>
                )}
                {a.status==="confirmed" && (
                  <button onClick={e=>{e.stopPropagation();acceptCase(a.id);}} disabled={actionLoading}
                    className="w-full py-2 rounded-lg text-xs font-mono font-bold disabled:opacity-50"
                    style={{ background:"rgba(239,68,68,0.1)", border:"1px solid rgba(239,68,68,0.25)", color:"#ef4444" }}>ACCEPT CASE</button>
                )}
                {a.status==="accepted" && (
                  <button onClick={e=>{e.stopPropagation();if(!auth.isLoggedIn){onLoginNeeded();return;}setResolving(a.id);setShowResolveModal(true);}} disabled={actionLoading}
                    className="w-full py-2 rounded-lg text-xs font-mono font-bold"
                    style={{ background:"rgba(16,185,129,0.1)", border:"1px solid rgba(16,185,129,0.25)", color:"#10b981" }}>UPLOAD PROOF & CLOSE</button>
                )}
                {a.status==="resolved" && (
                  <div className="w-full py-2 rounded-lg text-xs font-mono text-center" style={{ background:"rgba(16,185,129,0.06)", color:"#10b981" }}>CASE CLOSED</div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {showResolveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background:"rgba(0,0,0,0.7)", backdropFilter:"blur(8px)" }}>
          <div style={{ background:"#0d1117", border:"1px solid rgba(255,255,255,0.1)", maxWidth:480, width:"90%" }} className="rounded-2xl p-6">
            <div className="flex items-center justify-between mb-5">
              <h3 style={{ fontFamily:"'Space Mono', monospace", color:"#fff" }} className="font-bold">Resolve Case · #{resolving}</h3>
              <button onClick={()=>setShowResolveModal(false)}><SVGIcon name="x" size={18} color="#6b7280" /></button>
            </div>
            {error && <ErrorBanner msg={error} onClose={()=>setError("")} />}
            <div className="space-y-4">
              <div style={{ border:"2px dashed rgba(0,255,170,0.2)", background:"rgba(0,255,170,0.02)" }} className="rounded-xl p-5 text-center">
                <input type="file" accept="video/*" id="vid-up" className="hidden" onChange={e=>setVideoFile(e.target.files[0])} />
                <label htmlFor="vid-up" className="cursor-pointer block">
                  <SVGIcon name="camera" size={22} color="#00ffaa66" />
                  <p className="text-white text-sm font-medium mt-2">{videoFile?videoFile.name:"Upload Suspect Video"}</p>
                  <p className="text-gray-600 text-xs mt-1">MP4 / MOV · Required</p>
                </label>
              </div>
              <div style={{ border:"2px dashed rgba(96,165,250,0.2)", background:"rgba(96,165,250,0.02)" }} className="rounded-xl p-5 text-center">
                <input type="file" accept=".pdf,image/*" id="fir-up" className="hidden" onChange={e=>setFirFile(e.target.files[0])} />
                <label htmlFor="fir-up" className="cursor-pointer block">
                  <SVGIcon name="upload" size={22} color="#60a5fa66" />
                  <p className="text-white text-sm font-medium mt-2">{firFile?firFile.name:"Upload Scanned FIR Document"}</p>
                  <p className="text-gray-600 text-xs mt-1">PDF / Image · Required</p>
                </label>
              </div>
              <button onClick={submitResolve} disabled={actionLoading||!videoFile||!firFile}
                className="w-full py-3 rounded-xl font-mono font-bold text-sm tracking-widest flex items-center justify-center gap-2 disabled:opacity-40"
                style={{ background:"linear-gradient(135deg,#10b981,#0077ff)", color:"#fff" }}>
                {actionLoading?<Spinner/>:null} SUBMIT & CLOSE CASE →
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const StateOversight = ({ auth, onLoginNeeded }) => {
  const [cases, setCases]   = useState([]);
  const [stats, setStats]   = useState(null);
  const [selected, setSelected] = useState(null);
  const [detail, setDetail] = useState(null);
  const [loading, setLoading]   = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError]   = useState("");

  const fetchData = useCallback(async () => {
    try {
      if (auth.isLoggedIn && auth.role === "state") {
        const [caseList, statsData] = await Promise.all([
          apiFetch("/oversight/cases", {}, auth.token),
          apiFetch("/oversight/stats", {}, auth.token),
        ]);
        setCases(caseList); setStats(statsData);
      } else {
        const caseList = await apiFetch("/cases/", {}, auth.token).catch(() => []);
        setCases(caseList);
      }
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }, [auth.token, auth.isLoggedIn, auth.role]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const loadDetail = async (caseId) => {
    setSelected(caseId); setDetail(null);
    if (auth.isLoggedIn && auth.role === "state") {
      try { const d = await apiFetch(`/oversight/cases/${caseId}`, {}, auth.token); setDetail(d); }
      catch (e) { setError(e.message); }
    }
  };

  const review = async (action) => {
    if (!auth.isLoggedIn) { onLoginNeeded(); return; }
    setActionLoading(true);
    try {
      await apiFetch(`/oversight/cases/${selected}/review`, { method:"POST", body:JSON.stringify({action, review_notes:`State review: ${action}`}) }, auth.token);
      await fetchData(); if (selected) loadDetail(selected);
    } catch (e) { setError(e.message); }
    finally { setActionLoading(false); }
  };

  const statusStyles = { open:{color:"#9ca3af",label:"OPEN"}, pending_review:{color:"#facc15",label:"PENDING"}, verified:{color:"#10b981",label:"VERIFIED"}, flagged:{color:"#ef4444",label:"FLAGGED"} };

  return (
    <div className="min-h-screen" style={{ background:"#05070f" }}>
      <div style={{ background:"rgba(255,255,255,0.02)", borderBottom:"1px solid rgba(255,255,255,0.05)" }} className="px-6 py-3">
        <div className="max-w-screen-xl mx-auto flex items-center justify-between">
          <span style={{ fontFamily:"'Space Mono', monospace", color:"#fff" }} className="text-sm font-bold">State Police · Anti-Mining Oversight Board · Rajasthan</span>
          <div className="flex items-center gap-3">
            {(!auth.isLoggedIn||auth.role!=="state") ? (
              <button onClick={onLoginNeeded} className="text-xs font-mono px-3 py-1.5 rounded-lg"
                style={{ background:"rgba(167,139,250,0.1)", border:"1px solid rgba(167,139,250,0.2)", color:"#a78bfa" }}>LOGIN AS STATE ADMIN</button>
            ) : <Badge color="purple">CLEARANCE: LEVEL 5</Badge>}
            <button onClick={fetchData}><SVGIcon name="refresh" size={14} color="#6b7280" /></button>
          </div>
        </div>
      </div>
      {error && <div className="max-w-screen-xl mx-auto px-6 pt-4"><ErrorBanner msg={error} onClose={()=>setError("")} /></div>}

      <div className="max-w-screen-xl mx-auto px-6 py-5 flex gap-5">
        <div className="w-72">
          <div className="mb-4 flex items-center gap-2">
            <SVGIcon name="layers" size={14} color="#a78bfa" />
            <span style={{ fontFamily:"'Space Mono', monospace" }} className="text-xs font-bold text-white tracking-widest">CASE QUEUE · DATABASE</span>
          </div>
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-8 text-gray-600 text-sm font-mono"><Spinner/>Loading…</div>
          ) : (
            <div className="space-y-3">
              {cases.length===0 && <p className="text-gray-600 text-sm font-mono text-center py-8">No cases yet</p>}
              {cases.map(c => {
                const ss = statusStyles[c.status]||{color:"#9ca3af",label:c.status?.toUpperCase()};
                return (
                  <div key={c.id} onClick={()=>loadDetail(c.id)}
                    style={{ background:selected===c.id?"rgba(167,139,250,0.06)":"rgba(255,255,255,0.02)", border:`1px solid ${selected===c.id?"rgba(167,139,250,0.25)":"rgba(255,255,255,0.06)"}`, cursor:"pointer" }}
                    className="rounded-xl p-4 space-y-2 transition-all">
                    <div className="flex items-center justify-between">
                      <span style={{ fontFamily:"'Space Mono', monospace", color:"#a78bfa" }} className="text-xs font-bold">{c.id}</span>
                      <span style={{ color:ss.color, fontFamily:"'Space Mono', monospace" }} className="text-xs font-bold">{ss.label}</span>
                    </div>
                    <p className="text-gray-500 text-xs font-mono">{c.station} · {c.mining_type}</p>
                    <div className="flex gap-2">
                      <Badge color={c.fir_path?"green":"red"}>{c.fir_path?"FIR ✓":"FIR ✗"}</Badge>
                      <Badge color={c.video_path?"green":"red"}>{c.video_path?"VID ✓":"VID ✗"}</Badge>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          {stats && (
            <div style={{ background:"rgba(255,255,255,0.02)", border:"1px solid rgba(255,255,255,0.06)" }} className="rounded-xl p-4 mt-4 space-y-3">
              <p style={{ fontFamily:"'Space Mono', monospace" }} className="text-xs font-bold text-white tracking-widest">LIVE STATS</p>
              {[
                {label:"Total Cases",val:stats.total_cases,color:"#a78bfa"},
                {label:"Pending Review",val:stats.pending_review,color:"#facc15"},
                {label:"Verified",val:stats.verified,color:"#10b981"},
                {label:"Corruption Flags",val:stats.flagged,color:"#ef4444"},
                {label:"Rewards Triggered",val:stats.rewards_triggered,color:"#f59e0b"},
              ].map(s=>(
                <div key={s.label} className="flex items-center justify-between">
                  <span className="text-gray-500 text-xs font-mono">{s.label}</span>
                  <span style={{ color:s.color, fontFamily:"'Space Mono', monospace" }} className="text-sm font-bold">{s.val}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex-1">
          {!selected && (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <SVGIcon name="eye" size={40} color="#374151" />
                <p className="text-gray-600 text-sm font-mono mt-4">Select a case to review</p>
                {(!auth.isLoggedIn||auth.role!=="state") && <p className="text-gray-700 text-xs font-mono mt-2">Login as State Admin to see full details</p>}
              </div>
            </div>
          )}
          {selected && !detail && auth.isLoggedIn && auth.role==="state" && (
            <div className="flex items-center justify-center h-40">
              <div className="flex items-center gap-2 text-gray-500 font-mono text-sm"><Spinner/>Loading case detail…</div>
            </div>
          )}
          {selected && !detail && (!auth.isLoggedIn||auth.role!=="state") && (
            <div style={{ background:"rgba(255,255,255,0.02)", border:"1px solid rgba(255,255,255,0.06)" }} className="rounded-2xl p-8 text-center">
              <SVGIcon name="lock" size={32} color="#374151" />
              <p className="text-gray-500 text-sm font-mono mt-4">Login as State Admin to view full case details</p>
              <button onClick={onLoginNeeded} className="mt-4 px-6 py-2 rounded-xl text-xs font-mono font-bold"
                style={{ background:"rgba(167,139,250,0.1)", border:"1px solid rgba(167,139,250,0.2)", color:"#a78bfa" }}>LOGIN AS STATE ADMIN</button>
            </div>
          )}
          {selected && detail && (
            <div style={{ background:"rgba(255,255,255,0.02)", border:"1px solid rgba(255,255,255,0.06)" }} className="rounded-2xl p-5">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <div className="flex items-center gap-3 mb-1">
                    <span style={{ fontFamily:"'Space Mono', monospace", color:"#a78bfa" }} className="text-lg font-black">{detail.case.id}</span>
                    {detail.tip && <Badge color="blue">TIP: {detail.tip.id}</Badge>}
                    {detail.case.status==="verified" && <Badge color="green">STATE VERIFIED ✓</Badge>}
                    {detail.case.status==="flagged" && <Badge color="red">FLAGGED</Badge>}
                  </div>
                  <p className="text-white font-medium">{detail.alert?.location}</p>
                  <p className="text-gray-500 text-xs font-mono mt-0.5">{detail.case.mining_type} · {detail.case.suspects_count} suspects</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div style={{ background:"rgba(250,204,21,0.04)", border:"1px solid rgba(250,204,21,0.15)" }} className="rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-2 h-2 rounded-full bg-yellow-400"></div>
                    <span style={{ fontFamily:"'Space Mono', monospace" }} className="text-xs font-bold text-yellow-300">ORIGINAL TIP</span>
                  </div>
                  {detail.tip ? (
                    <div className="space-y-2">
                      <div style={{ background:"rgba(0,0,0,0.3)", border:"1px solid rgba(255,255,255,0.06)" }} className="rounded-lg p-3">
                        <span className="text-gray-500 text-xs font-mono block">Tip ID</span>
                        <span style={{ fontFamily:"'Space Mono', monospace", color:"#00ffaa" }} className="text-sm font-bold">#{detail.tip.id}</span>
                      </div>
                      <div style={{ background:"rgba(0,0,0,0.3)", border:"1px solid rgba(255,255,255,0.06)" }} className="rounded-lg p-3">
                        <span className="text-gray-500 text-xs font-mono block mb-1">Description</span>
                        <p className="text-gray-300 text-xs leading-relaxed">{detail.tip.description}</p>
                      </div>
                      <div style={{ background:"rgba(0,0,0,0.3)", border:"1px solid rgba(255,255,255,0.06)" }} className="rounded-lg p-3 flex items-center justify-between">
                        <span className="text-gray-500 text-xs font-mono">AI Score</span>
                        <span className="text-xs font-mono" style={{ color:detail.tip.ai_score<0.5?"#10b981":"#ef4444" }}>
                          {detail.tip.ai_score?`${(detail.tip.ai_score*100).toFixed(1)}% fake`:"N/A"}
                        </span>
                      </div>
                      <Badge color={detail.tip.has_bank?"green":"gray"}>{detail.tip.has_bank?"BANK LINKED ✓":"NO BANK"}</Badge>
                    </div>
                  ) : <p className="text-gray-600 text-xs font-mono">No citizen tip linked</p>}
                </div>
                <div style={{ background:"rgba(96,165,250,0.04)", border:"1px solid rgba(96,165,250,0.15)" }} className="rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-2 h-2 rounded-full bg-blue-400"></div>
                    <span style={{ fontFamily:"'Space Mono', monospace" }} className="text-xs font-bold text-blue-300">POLICE EVIDENCE</span>
                  </div>
                  <div className="space-y-2">
                    <div style={{ background:"rgba(0,0,0,0.3)", border:"1px solid rgba(255,255,255,0.06)" }} className="rounded-lg p-3">
                      <span className="text-gray-500 text-xs font-mono block">Station</span>
                      <span className="text-white text-sm">{detail.case.station}</span>
                    </div>
                    <div style={{ background:"rgba(0,0,0,0.3)", border:detail.case.has_video?"1px solid rgba(16,185,129,0.2)":"1px dashed rgba(239,68,68,0.3)" }} className="rounded-lg p-3 flex items-center justify-between">
                      <span className="text-gray-500 text-xs font-mono">Video Evidence</span>
                      <span className={`text-xs font-mono ${detail.case.has_video?"text-green-400":"text-red-400"}`}>{detail.case.has_video?"UPLOADED ✓":"MISSING ⚠"}</span>
                    </div>
                    <div style={{ background:"rgba(0,0,0,0.3)", border:detail.case.has_fir?"1px solid rgba(16,185,129,0.2)":"1px dashed rgba(239,68,68,0.3)" }} className="rounded-lg p-3 flex items-center justify-between">
                      <span className="text-gray-500 text-xs font-mono">FIR Document</span>
                      <span className={`text-xs font-mono ${detail.case.has_fir?"text-green-400":"text-red-400"}`}>{detail.case.has_fir?"ATTACHED ✓":"NOT UPLOADED ⚠"}</span>
                    </div>
                    {detail.case.notes && (
                      <div style={{ background:"rgba(0,0,0,0.3)", border:"1px solid rgba(255,255,255,0.06)" }} className="rounded-lg p-3">
                        <span className="text-gray-500 text-xs font-mono block mb-1">Officer Notes</span>
                        <p className="text-gray-300 text-xs">{detail.case.notes}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              {(!detail.case.has_video||!detail.case.has_fir) && (
                <div style={{ background:"rgba(239,68,68,0.06)", border:"1px solid rgba(239,68,68,0.2)" }} className="rounded-xl p-4 mb-4 flex gap-3">
                  <SVGIcon name="alert" size={16} color="#ef4444" />
                  <p className="text-red-400 text-xs leading-relaxed">Evidence integrity concern — {!detail.case.has_video&&"video missing "}{!detail.case.has_fir&&"FIR not uploaded"}. Consider flagging.</p>
                </div>
              )}
              {detail.case.reward_triggered && (
                <div style={{ background:"rgba(245,158,11,0.06)", border:"1px solid rgba(245,158,11,0.2)" }} className="rounded-xl p-3 mb-4">
                  <p className="text-yellow-400 text-xs font-mono">REWARD TRIGGERED: {new Date(detail.case.reward_triggered).toLocaleString()}</p>
                </div>
              )}
              {detail.case.status==="pending_review" && auth.isLoggedIn && auth.role==="state" && (
                <div className="grid grid-cols-2 gap-3">
                  <button onClick={()=>review("verify")} disabled={actionLoading}
                    className="py-3.5 rounded-xl font-mono font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-50"
                    style={{ background:"rgba(16,185,129,0.1)", border:"1px solid rgba(16,185,129,0.3)", color:"#10b981" }}>
                    {actionLoading?<Spinner/>:null} VERIFY + TRIGGER REWARD
                  </button>
                  <button onClick={()=>review("flag")} disabled={actionLoading}
                    className="py-3.5 rounded-xl font-mono font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-50"
                    style={{ background:"rgba(239,68,68,0.1)", border:"1px solid rgba(239,68,68,0.3)", color:"#ef4444" }}>
                    {actionLoading?<Spinner/>:null} FLAG FOR CORRUPTION
                  </button>
                </div>
              )}
              {detail.case.status==="verified" && (
                <div style={{ background:"rgba(16,185,129,0.06)", border:"1px solid rgba(16,185,129,0.2)" }} className="rounded-xl p-4 text-center">
                  <p className="text-green-400 font-mono font-bold text-sm">STATE VERIFIED · Citizen Reward Auto-Triggered</p>
                </div>
              )}
              {detail.case.status==="flagged" && (
                <div style={{ background:"rgba(239,68,68,0.06)", border:"1px solid rgba(239,68,68,0.2)" }} className="rounded-xl p-4 text-center">
                  <p className="text-red-400 font-mono font-bold text-sm">FLAGGED · Anti-Corruption Bureau Notified</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default function GeoGuard() {
  const [page, setPage]           = useState(1);
  const [showLogin, setShowLogin] = useState(false);
  const auth = useAuth();

  useEffect(() => {
    const link = document.createElement("link");
    link.href = "https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&display=swap";
    link.rel = "stylesheet";
    document.head.appendChild(link);
  }, []);

  const handleLogin = (data) => {
    setShowLogin(false);
    if (data.role === "police") setPage(2);
    if (data.role === "state")  setPage(3);
  };

  return (
    <div style={{ fontFamily: "system-ui, sans-serif" }}>
      <NavBar page={page} setPage={setPage} auth={auth} onLoginClick={() => setShowLogin(true)} onLogout={auth.logout} />
      {page === 1 && <CitizenPortal />}
      {page === 2 && <PoliceCommand auth={auth} onLoginNeeded={() => setShowLogin(true)} />}
      {page === 3 && <StateOversight auth={auth} onLoginNeeded={() => setShowLogin(true)} />}
      {showLogin && <LoginModal onLogin={handleLogin} onClose={() => setShowLogin(false)} authHook={auth} />}
    </div>
  );
}
