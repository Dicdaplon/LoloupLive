import React, { useEffect, useMemo, useState } from "react";

// ===== Helpers WebCrypto =====
async function sha256PBKDF2(password: string, saltB64: string, iterations: number): Promise<string> {
  const enc = new TextEncoder();
  const salt = Uint8Array.from(atob(saltB64), c => c.charCodeAt(0));

  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    enc.encode(password),
    "PBKDF2",
    false,
    ["deriveBits"]
  );

  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", hash: "SHA-256", salt, iterations },
    keyMaterial,
    256 // 256 bits => 32 bytes
  );

  // ArrayBuffer -> base64
  const bytes = new Uint8Array(bits);
  let bin = "";
  bytes.forEach(b => (bin += String.fromCharCode(b)));
  return btoa(bin);
}

function randomSaltB64(len = 16): string {
  const salt = new Uint8Array(len);
  crypto.getRandomValues(salt);
  let bin = "";
  salt.forEach(b => (bin += String.fromCharCode(b)));
  return btoa(bin);
}

function uuid(): string {
  // UUID v4 simple
  if ("randomUUID" in crypto) return crypto.randomUUID();
  const a = new Uint8Array(16);
  crypto.getRandomValues(a);
  a[6] = (a[6] & 0x0f) | 0x40;
  a[8] = (a[8] & 0x3f) | 0x80;
  const h = Array.from(a, b => b.toString(16).padStart(2, "0"));
  return `${h[0]}${h[1]}${h[2]}${h[3]}-${h[4]}${h[5]}-${h[6]}${h[7]}-${h[8]}${h[9]}-${h[10]}${h[11]}${h[12]}${h[13]}${h[14]}${h[15]}`;
}

// ===== Types & storage =====
type LocalUser = {
  userId: string;
  userName: string;
  salt: string;          // base64
  iterations: number;    // e.g., 120_000
  hashB64: string;       // PBKDF2-SHA256(password, salt, iterations) en base64
  algo: "PBKDF2-SHA256";
};

const STORAGE_KEY = "jam.localUser";

function loadLocalUser(): LocalUser | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function saveLocalUser(u: LocalUser) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(u));
  // Compat avec ton chat:
  localStorage.setItem("uid", u.userId);
  localStorage.setItem("name", u.userName);
}

function clearLocalUser() {
  localStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem("uid");
  localStorage.removeItem("name");
}

// ===== Composant =====
type Props = {
  onAuth?: (user: { userId: string; userName: string }) => void;
  /** Désactive l’auto-notification quand un utilisateur existe déjà (utile en modal) */
  autoNotifyExisting?: boolean;        // NEW
  /** Force l’onglet “login” ou “signup” à l’ouverture */
  initialMode?: "login" | "signup";    // NEW
};

export default function LocalAuth({
  onAuth,
  autoNotifyExisting = true,
  initialMode,
}: Props) {
  const existing0 = loadLocalUser();
  const [existing, setExisting] = useState<LocalUser | null>(existing0);
  const [mode, setMode] = useState<"login" | "signup">(
    initialMode ?? (existing0 ? "login" : "signup")
  );
  const [userName, setUserName] = useState(existing0?.userName ?? "");
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Auto-notify si déjà connecté (désactivable)
  useEffect(() => {
    if (!autoNotifyExisting) return;
    if (existing && onAuth) onAuth({ userId: existing.userId, userName: existing.userName });
  }, [existing, onAuth, autoNotifyExisting]);

  const iterations = useMemo(() => 120_000, []); // PBKDF2 ~120k (ajuste selon perfs device)

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!userName.trim() || !password) {
      setError("Pseudo et mot de passe requis.");
      return;
    }
    try {
      setPending(true);
      const salt = randomSaltB64(16);
      const hashB64 = await sha256PBKDF2(password, salt, iterations);
      const user: LocalUser = {
        userId: uuid(),
        userName: userName.trim(),
        salt,
        iterations,
        hashB64,
        algo: "PBKDF2-SHA256",
      };
      saveLocalUser(user);
      setExisting(user);
      setMode("login");
      setPassword("");
      if (onAuth) onAuth({ userId: user.userId, userName: user.userName });
    } catch (err) {
      console.error(err);
      setError("Échec de l'inscription.");
    } finally {
      setPending(false);
    }
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const u = loadLocalUser();
    if (!u) {
      setError("Aucun compte local. Crée un compte d’abord.");
      setMode("signup");
      return;
    }
    if (!password) {
      setError("Mot de passe requis.");
      return;
    }
    try {
      setPending(true);
      const computed = await sha256PBKDF2(password, u.salt, u.iterations);
      if (computed !== u.hashB64) {
        setError("Mot de passe invalide.");
        return;
      }
      // on autorise la mise à jour du pseudo si modifié
      if (userName.trim() && userName.trim() !== u.userName) {
        const updated = { ...u, userName: userName.trim() };
        saveLocalUser(updated);
        setExisting(updated);
        if (onAuth) onAuth({ userId: updated.userId, userName: updated.userName });
      } else {
        saveLocalUser(u);
        setExisting(u);
        if (onAuth) onAuth({ userId: u.userId, userName: u.userName });
      }
      setPassword("");
    } catch (err) {
      console.error(err);
      setError("Échec de la connexion.");
    } finally {
      setPending(false);
    }
  }

  function handleLogout() {
    clearLocalUser();
    setExisting(null);
    setUserName("");
    setPassword("");
    setMode("signup");
    if (onAuth) onAuth({ userId: "", userName: "" });
  }

  // UI ultra simple
  if (existing && mode === "login") {
    return (
      <div style={cardStyle}>
        <div style={{ marginBottom: 8, opacity: 0.8 }}>Connecté en local</div>
        <div style={{ fontWeight: 600 }}>{existing.userName}</div>
        <button onClick={handleLogout} style={btnStyle}>Se déconnecter</button>
      </div>
    );
  }

  return (
    <form onSubmit={mode === "signup" ? handleSignup : handleLogin} style={cardStyle}>
      <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
        <button
          type="button"
          onClick={() => setMode("signup")}
          style={{ ...tabStyle, ...(mode === "signup" ? tabActive : {}) }}
        >
          Créer un compte
        </button>
        <button
          type="button"
          onClick={() => setMode("login")}
          style={{ ...tabStyle, ...(mode === "login" ? tabActive : {}) }}
        >
          Se connecter
        </button>
      </div>

      <label style={labelStyle}>Pseudo</label>
      <input
        value={userName}
        onChange={(e) => setUserName(e.target.value)}
        placeholder="Ton pseudo"
        autoComplete="username"
        style={inputStyle}
      />

      <label style={labelStyle}>Mot de passe</label>
      <input
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        type="password"
        placeholder="········"
        autoComplete={mode === "signup" ? "new-password" : "current-password"}
        enterKeyHint={mode === "signup" ? "done" : "go"}
        style={inputStyle}
      />

      {error && <div style={{ color: "#ff4d4f", fontSize: 12, marginTop: 6 }}>{error}</div>}

      <button disabled={pending} style={btnStyle}>
        {pending ? "…" : mode === "signup" ? "Créer" : "Se connecter"}
      </button>

      <div style={{ fontSize: 11, opacity: 0.7, marginTop: 8 }}>
        Local uniquement — hash PBKDF2 + sel stocké dans le navigateur.
      </div>
    </form>
  );
}

// ===== Styles inline minimalistes =====
const cardStyle: React.CSSProperties = {
  width: "min(92vw, 420px)",
  margin: "12px auto",
  padding: "12px 14px",
  borderRadius: 12,
  background: "rgba(255,255,255,0.9)",
  boxShadow: "0 8px 24px rgba(0,0,0,0.15)",
  display: "flex",
  flexDirection: "column",
  gap: 6
};
const labelStyle: React.CSSProperties = { fontSize: 12, opacity: 0.8, marginTop: 6 };
const inputStyle: React.CSSProperties = {
  padding: "10px 12px",
  borderRadius: 10,
  border: "1px solid rgba(0,0,0,0.1)",
  fontSize: 15
};
const btnStyle: React.CSSProperties = {
  marginTop: 10,
  padding: "10px 12px",
  borderRadius: 10,
  border: "1px solid rgba(0,0,0,0.15)",
  background: "white",
  fontSize: 15,
  cursor: "pointer"
};
const tabStyle: React.CSSProperties = {
  flex: 1,
  padding: "8px 10px",
  borderRadius: 8,
  border: "1px solid rgba(0,0,0,0.1)",
  background: "white",
  cursor: "pointer",
  fontSize: 13
};
const tabActive: React.CSSProperties = {
  background: "black",
  color: "white",
  borderColor: "black"
};
