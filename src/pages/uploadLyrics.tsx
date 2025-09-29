import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { db } from "@/lib/firebase/app";
import { ref, get, set } from "firebase/database";

function slugify(input: string): string {
  return String(input ?? "")
    .toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

// ── Anti-spam (temps mini entre envois) ──────────────────────────────────────
const MIN_INTERVAL_MS = 10_000; // 10s (aligne si tu veux la même valeur que Chords)

export default function UploadLyricsRTDB() {
  const [title, setTitle] = useState("");
  const [lyrics, setLyrics] = useState("");
  const [id, setId] = useState("");
  const [overwrite, setOverwrite] = useState(true);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string>("");
  const [err, setErr] = useState<string>("");

  const fileRef = useRef<HTMLInputElement | null>(null);

  // Cooldown persistant (mêmes mécaniques que UploadChords)
  const lastSendRef = useRef<number>(Number(localStorage.getItem("lyrics.lastUploadTs") || 0));
  const [coolingLeft, setCoolingLeft] = useState<number>(0);
  useEffect(() => {
    const id = window.setInterval(() => {
      const left = Math.max(0, MIN_INTERVAL_MS - (Date.now() - lastSendRef.current));
      setCoolingLeft(left);
    }, 250);
    return () => window.clearInterval(id);
  }, []);

  const suggestedId = useMemo(() => {
    if (id.trim()) return id.trim();
    if (title.trim()) return slugify(title);
    return "";
  }, [id, title]);

  const onPickFile = useCallback(() => fileRef.current?.click(), []);
  const onFile = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    try {
      const text = await f.text();
      setLyrics(text);
      if (!title) setTitle(f.name.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " "));
      if (!id) setId(slugify(f.name.replace(/\.[^.]+$/, "")));
      setMsg(""); setErr("");
    } catch (error: any) {
      setErr(error?.message || String(error));
    } finally {
      e.target.value = "";
    }
  }, [title, id]);

  const doSend = useCallback(async () => {
    setErr(""); setMsg("");

    // anti-spam (identique Chords)
    {
      const now = Date.now();
      const elapsed = now - lastSendRef.current;
      if (elapsed < MIN_INTERVAL_MS) {
        const secs = Math.ceil((MIN_INTERVAL_MS - elapsed) / 1000);
        setErr(`Anti-spam : attends ${secs}s avant un nouvel envoi.`);
        return;
      }
    }

    const finalId = suggestedId;
    if (!finalId) { setErr("ID vide (remplis Titre ou ID)."); return; }
    if (/[.#$\[\]]/.test(finalId)) { setErr("ID invalide : interdit . # $ [ ]"); return; }
    if (!lyrics.trim()) { setErr("Paroles vides."); return; }

    setBusy(true);
    try {
      const r = ref(db, `lyrics/${finalId}`);
      if (!overwrite) {
        const snap = await get(r);
        if (snap.exists()) { setErr(`'${finalId}' existe déjà.`); setBusy(false); return; }
      }
      await set(r, {
        title: title.trim() || undefined,
        lyrics,
        updatedAt: Date.now(),
      });
      // maj cooldown
      lastSendRef.current = Date.now();
      localStorage.setItem("lyrics.lastUploadTs", String(lastSendRef.current));

      setMsg(`✔️ Upload OK → /lyrics/${finalId}`);
    } catch (e: any) {
      setErr(e?.message || String(e));
    } finally {
      setBusy(false);
    }
  }, [lyrics, overwrite, suggestedId, title]);

  return (
    <main className="u-container">
      <h1>Uploader des paroles (TXT)</h1>

      <section className="u-panel">
        <div className="u-row u-row-inline">
          <div className="u-field">
            <label>Titre (affiché)</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex: All of Me" />
          </div>
          <div className="u-field">
            <label>ID (optionnel)</label>
            <input value={id} onChange={(e) => setId(e.target.value)} placeholder="auto: slug du titre" />
            <div className="u-hint">ID utilisé: <code>{suggestedId || "(vide)"}</code></div>
          </div>
        </div>

        <div className="u-row u-row-inline">
          <button className="u-btn" onClick={onPickFile}>Choisir un .txt</button>
          <label className="u-check">
            <input type="checkbox" checked={overwrite} onChange={(e) => setOverwrite(e.target.checked)} />
            Overwrite si existe
          </label>
          <input ref={fileRef} type="file" accept=".txt,text/plain" className="hidden" onChange={onFile} />
        </div>

        <div className="u-row">
          <label>Paroles (texte)</label>
          <textarea
            rows={14}
            value={lyrics}
            onChange={(e) => setLyrics(e.target.value)}
            placeholder="Colle les paroles ici…"
            className="u-textarea"
          />
        </div>

        <div className="u-row u-row-inline">
          <button
            className="u-btn u-btn-primary"
            disabled={busy || coolingLeft > 0}
            onClick={doSend}
          >
            {busy ? "Envoi…" : coolingLeft > 0 ? `Attends ${Math.ceil(coolingLeft/1000)}s` : "Envoyer"}
          </button>
        </div>

        {err && <div className="u-alert u-alert-error">{err}</div>}
        {msg && <div className="u-alert u-alert-success">{msg}</div>}
      </section>

      <section className="u-panel">
        <h2>Aperçu rapide</h2>
        <div className="u-title">{title || "(sans titre)"}</div>
        <div className="u-preview" style={{border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8}}>
          {(lyrics || "").split(/\r?\n/).map((ln, i) => (
            <div key={i} style={{
              padding: "4px 8px",
              background: i % 2 === 0 ? "rgba(255,255,255,0.06)" : "transparent",
              whiteSpace: "pre-wrap",
            }}>{ln}</div>
          ))}
        </div>
      </section>
    </main>
  );
}
