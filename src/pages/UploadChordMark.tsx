// src/pages/UploadChordMarkRTDB.tsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { db } from "@/lib/firebase/databaseConfiguration";
import { ref as dbRef, get, set } from "firebase/database";

/**
 * Uploader ChordMark → RTDB (sans Storage)
 *
 * • Import .cmd/.cho/.txt ou coller du texte
 * • Aperçu rendu par parseChordMark + RubyLine (identique à ta version)
 * • Écrit directement dans RTDB → chordMark/{id}
 *   { titre, style?, bpm?, tonalite?, signature?, raw, updatedAt }
 */

// ── Types méta ───────────────────────────────────────────────────────────────
type ChordMeta = {
  titre: string;
  style?: string;
  bpm?: number;
  tonalite?: string;
  signature?: string;
};

// ── Parser & Renderer (reprend fidèlement ton sous-ensemble) ────────────────
type SectionCode = "v" | "c" | "b" | "i" | "o" | "p";
const SECTION_NAMES: Record<SectionCode, string> = {
  v: "Verse",
  c: "Chorus",
  b: "Bridge",
  i: "Intro",
  o: "Outro",
  p: "Pre-Chorus",
};

type Line =
  | { type: "section"; name: string }
  | { type: "inline"; elements: { text: string; chord?: string }[] };

function parseChordTokens(line: string): string[] {
  return line
    .replace(/\|/g, " ")
    .trim()
    .split(/\s+/)
    .map((tok) => tok.replace(/\.+$/g, ""))
    .filter(Boolean);
}

function splitByUnderscore(lyrics: string): string[] {
  const parts: string[] = [];
  let cur = "";
  for (const ch of lyrics) {
    if (ch === "_") {
      parts.push(cur);
      cur = "";
    } else {
      cur += ch;
    }
  }
  parts.push(cur);
  return parts;
}

function parseChordMark(src: string): Line[] {
  const out: Line[] = [];
  const counts: Partial<Record<SectionCode, number>> = {};
  let pendingChords: string[] | null = null;
  let lastChords: string[] | null = null;

  for (const raw of src.split(/\r?\n/)) {
    const line = raw.trimEnd();
    if (!line.trim()) continue;

    const m = line.match(/^#([vcbiop])\s*$/i);
    if (m) {
      const code = m[1].toLowerCase() as SectionCode;
      counts[code] = (counts[code] ?? 0) + 1;
      const label =
        SECTION_NAMES[code] + (["i", "o"].includes(code) ? "" : ` ${counts[code]}`);
      out.push({ type: "section", name: label });
      continue;
    }

    if (line.trim() === "%") {
      pendingChords = lastChords ? [...lastChords] : [];
      continue;
    }

    if (/^[\sA-Ga-g0-9#bmjduasor\/\.\|\+\(\)]+$/.test(line)) {
      const chords = parseChordTokens(line);
      if (chords.length) {
        pendingChords = chords;
        lastChords = chords;
      }
      continue;
    }

    const chords = pendingChords ?? lastChords ?? [];
    const parts = splitByUnderscore(line);
    const elems: { text: string; chord?: string }[] = [];
    for (let i = 0; i < parts.length; i++) {
      elems.push({ text: parts[i], chord: chords[i] });
    }
    out.push({ type: "inline", elements: elems });
    pendingChords = null;
  }
  return out;
}

function splitCore(s: string) {
  const m = s.match(/^(\s*)(.*?)([\s.,;:!?…]*)$/);
  return { lead: m?.[1] ?? "", core: m?.[2] ?? "", trail: m?.[3] ?? "" };
}

function RubyLine({ elements }: { elements: { text: string; chord?: string }[] }) {
  return (
    <div className="cm-line">
      {elements.map((el, i) => {
        const { lead, core, trail } = splitCore(el.text);
        return (
          <React.Fragment key={i}>
            {lead && <span className="cm-sp">{lead}</span>}
            {(core || el.chord) ? (
              <ruby className="cm-inline">
                <span className="cm-ly">{core}</span>
                <rt className="cm-ch">{el.chord ?? ""}</rt>
              </ruby>
            ) : null}
            {trail && <span className="cm-sp">{trail}</span>}
          </React.Fragment>
        );
      })}
    </div>
  );
}

// ── Helpers ─────────────────────────────────────────────────────────────────
function slugify(input: string): string {
  return String(input ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function trimMultiline(s: string) {
  return (s || "").replace(/\r\n?/g, "\n").trim();
}

function naiveParseMeta(src: string): Partial<ChordMeta> {
  const lines = trimMultiline(src).split("\n").slice(0, 20);
  const meta: Partial<ChordMeta> = {};
  for (const line of lines) {
    const L = line.trim();
    const mTitle = /^(?:#\s*)?(?:title|titre)\s*[:=-]\s*(.+)$/i.exec(L);
    if (mTitle && !meta.titre) meta.titre = mTitle[1].trim();
    const mBpm = /\b(bpm)\s*[:=-]\s*(\d{1,3})\b/i.exec(L);
    if (mBpm && !meta.bpm) meta.bpm = Number(mBpm[2]);
    const mKey = /\b(?:key|tonalite|ton)\s*[:=-]\s*([A-G](?:#|b)?m?7?)\b/i.exec(L);
    if (mKey && !meta.tonalite) meta.tonalite = mKey[1];
    const mSig = /\b(?:sig|signature|time|mesure)\s*[:=-]\s*(\d+\s*\/\s*\d+)\b/i.exec(L);
    if (mSig && !meta.signature) meta.signature = mSig[1].replace(/\s+/g, "");
    const mStyle = /\b(?:style|genre)\s*[:=-]\s*(.+)$/i.exec(L);
    if (mStyle && !meta.style) meta.style = mStyle[1].trim();
  }
  if (!meta.titre) {
    const firstNonEmpty = trimMultiline(src).split("\n").find((l) => l.trim());
    if (firstNonEmpty) meta.titre = firstNonEmpty.slice(0, 48);
  }
  return meta;
}

const MIN_INTERVAL_MS = 8000;

export interface UploadChordMarkProps {
  defaultText?: string;
}

export default function UploadChordMarkRTDB({ defaultText }: UploadChordMarkProps) {
  const [raw, setRaw] = useState<string>(
    defaultText ??
      `#v
C.. Am..
I _heard there was a _secret chord
%
That _David played and it _pleased the lord
F... G. C.. G..
But _you don't really care for _music, _do you?

#c
F
Halle_lujah
Am
Halle_lujah
F
Halle_lujah
C.. G.. C.. Am..
Halle_lu_u_jah`
  );
  const [meta, setMeta] = useState<ChordMeta>({ titre: "" });
  const [docId, setDocId] = useState<string>("");
  const [overwrite, setOverwrite] = useState<boolean>(true);
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [resultMsg, setResultMsg] = useState<string>("");

  // Cooldown persistant (comme UploadChords)
  const lastSendRef = useRef<number>(
    Number(localStorage.getItem("chordmark.lastUploadTs") || 0)
  );
  const [coolingLeft, setCoolingLeft] = useState<number>(0);
  useEffect(() => {
    const id = window.setInterval(() => {
      const left = Math.max(0, MIN_INTERVAL_MS - (Date.now() - lastSendRef.current));
      setCoolingLeft(left);
    }, 250);
    return () => window.clearInterval(id);
  }, []);

  // Lecture fichier → textarea
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const onFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const txt = await file.text();
      setRaw(txt);
      setErrors([]);
      setResultMsg("");
    } catch (err: any) {
      setErrors([`Lecture fichier: ${err?.message || err}`]);
    } finally {
      e.target.value = "";
    }
  }, []);

  // Valide et extrait un minimum de métadonnées
  const doValidate = useCallback(() => {
    setResultMsg("");
    const src = trimMultiline(raw);
    if (!src) {
      setErrors(["Le contenu est vide."]);
      return;
    }
    const parsed = naiveParseMeta(src);
    const next: ChordMeta = {
      titre: parsed.titre?.trim() || "Sans titre",
      bpm: typeof parsed.bpm === "number" ? parsed.bpm : undefined,
      tonalite: parsed.tonalite?.trim(),
      signature: parsed.signature?.trim(),
      style: parsed.style?.trim(),
    };
    setMeta(next);
    if (!docId && next.titre) setDocId(slugify(next.titre));
    setErrors([]);
  }, [raw, docId]);

  // Aperçu rendu par TON renderer
  const lines = useMemo(() => parseChordMark(raw), [raw]);

  // Upload → RTDB uniquement
  const doUpload = useCallback(async () => {
    // Anti-spam
    {
      const now = Date.now();
      const elapsed = now - lastSendRef.current;
      if (elapsed < MIN_INTERVAL_MS) {
        const secs = Math.ceil((MIN_INTERVAL_MS - elapsed) / 1000);
        setErrors([`Anti-spam : attends ${secs}s avant un nouvel envoi.`]);
        return;
      }
    }

    const src = trimMultiline(raw);
    if (!src) {
      setErrors(["Le contenu est vide."]);
      return;
    }

    const id = (docId || slugify(meta.titre || "sans-titre")).trim();
    if (!id) {
      setErrors(["ID document vide."]);
      return;
    }
    if (/[.#$\[\]]/.test(id)) {
      setErrors(["ID invalide : ne doit pas contenir . # $ [ ]"]);
      return;
    }

    setBusy(true);
    setErrors([]);
    setResultMsg("");
    try {
      const indexRef = dbRef(db, `chordmark/${id}`);
      if (!overwrite) {
        const snap = await get(indexRef);
        if (snap.exists()) {
          setErrors([`Le morceau '${id}' existe déjà.`]);
          setBusy(false);
          return;
        }
      }

      await set(indexRef, {
        titre: meta.titre || "Sans titre",
        style: meta.style || null,
        bpm: typeof meta.bpm === "number" ? meta.bpm : null,
        tonalite: meta.tonalite || null,
        signature: meta.signature || null,
        raw: src, // on stocke le ChordMark tel quel
        updatedAt: Date.now(),
      });

      lastSendRef.current = Date.now();
      localStorage.setItem("chordmark.lastUploadTs", String(lastSendRef.current));
      setResultMsg(`✔️ Upload OK → /chordmark/${id}`);
    } catch (err: any) {
      setErrors([`Erreur RTDB: ${err?.code ?? "unknown"} — ${err?.message || err}`]);
    } finally {
      setBusy(false);
    }
  }, [raw, meta, docId, overwrite]);

  return (
    <main className="u-container" style={{ maxWidth: 900, margin: "0 auto" }}>
      <h1>Uploader un fichier chordMark (RTDB)</h1>

      <section className="u-panel">
        <div className="u-row">
          <label>Fichier chordMark</label>
          <input
            ref={fileInputRef}
            type="file"
            accept=".cmd,.cho,.txt,text/plain"
            onChange={onFileChange}
          />
        </div>

        <div className="u-row">
          <label>Contenu (coller ici)</label>
          <textarea
            value={raw}
            onChange={(e) => {
              setRaw(e.target.value);
              setResultMsg("");
              setErrors([]);
            }}
            rows={16}
            spellCheck={false}
            className="u-textarea"
            placeholder="#v\nC.. Am..\nI _heard there was a _secret chord\n..."
          />
        </div>

        <fieldset className="u-row u-fieldset">
          <legend>Métadonnées</legend>
          <div className="u-row u-row-inline">
            <div className="u-field">
              <label>Titre</label>
              <input
                value={meta.titre || ""}
                onChange={(e) => setMeta((m) => ({ ...m, titre: e.target.value }))}
                placeholder="Nom du morceau"
              />
            </div>
            <div className="u-field">
              <label>BPM</label>
              <input
                type="number"
                inputMode="numeric"
                value={meta.bpm ?? ""}
                onChange={(e) =>
                  setMeta((m) => ({
                    ...m,
                    bpm: e.target.value ? Number(e.target.value) : undefined,
                  }))
                }
                placeholder="ex: 90"
              />
            </div>
          </div>
          <div className="u-row u-row-inline">
            <div className="u-field">
              <label>Tonalité</label>
              <input
                value={meta.tonalite || ""}
                onChange={(e) => setMeta((m) => ({ ...m, tonalite: e.target.value }))}
                placeholder="ex: Am, C#, F#m7"
              />
            </div>
            <div className="u-field">
              <label>Signature</label>
              <input
                value={meta.signature || ""}
                onChange={(e) => setMeta((m) => ({ ...m, signature: e.target.value }))}
                placeholder="ex: 4/4, 6/8"
              />
            </div>
            <div className="u-field">
              <label>Style</label>
              <input
                value={meta.style || ""}
                onChange={(e) => setMeta((m) => ({ ...m, style: e.target.value }))}
                placeholder="ex: Jazz, Funk"
              />
            </div>
          </div>
        </fieldset>

        <div className="u-row u-row-inline">
          <div className="u-field">
            <label>Document ID</label>
            <input
              value={docId}
              onChange={(e) => setDocId(e.target.value)}
              placeholder="(auto: slug du titre)"
            />
          </div>
          <label className="u-check">
            <input
              type="checkbox"
              checked={overwrite}
              onChange={(e) => setOverwrite(e.target.checked)}
            />
            Overwrite si existe
          </label>
        </div>

        <div className="u-row u-row-inline">
          <button className="u-btn" onClick={doValidate}>
            Valider
          </button>
          <button
            className="u-btn u-btn-primary"
            onClick={doUpload}
            disabled={busy || coolingLeft > 0}
          >
            {busy
              ? "Envoi…"
              : coolingLeft > 0
              ? `Attends ${Math.ceil(coolingLeft / 1000)}s`
              : "Envoyer !"}
          </button>
        </div>

        {errors.length > 0 && (
          <div className="u-alert u-alert-error">
            <b>Erreurs</b>
            <ul>
              {errors.map((e, i) => (
                <li key={i}>{e}</li>
              ))}
            </ul>
          </div>
        )}
        {resultMsg && <div className="u-alert u-alert-success">{resultMsg}</div>}
      </section>

      <section className="u-panel">
        <h2>Prévisualisation</h2>
        <div className="cm-root">
          <section className="cm-card">
            {lines.map((ln, idx) =>
              ln.type === "section" ? (
                <h3 className="cm-section" key={idx}>
                  {ln.name}
                </h3>
              ) : (
                <RubyLine key={idx} elements={ln.elements} />
              )
            )}
          </section>
        </div>
      </section>

      <section className="u-panel">
        <h2>Notes</h2>
        <ul>
          <li>Le contenu est stocké tel quel dans RTDB : <code>chordMark/&lt;id&gt;/raw</code>.</li>
          <li>Les métadonnées sont stockées au même nœud (<code>titre</code>, <code>bpm</code>, <code>tonalite</code>, <code>signature</code>, <code>style</code>).</li>
          <li>Aperçu fidèle à ton composant <code>RubyLine</code> et parseur <code>parseChordMark</code>.</li>
        </ul>
      </section>
    </main>
  );
}
