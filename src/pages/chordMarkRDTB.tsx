// src/pages/ChordMarkRTDB.tsx
import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { db } from "@/lib/firebase/databaseConfiguration";
import { ref as dbRef, onValue, off } from "firebase/database";
import {
  CHORDMARK_COLLECTION,
  ChordMarkDoc,
  slugify,
} from "@/components/chordMark/chordMark";

/* ================== Mini parser ChordMark (sous-ensemble) ==================
   - #v/#c/#b/#i/#o/#p sections
   - lignes d'accords: C.. Am.. (tolère | et ignore . pour la durée visuelle)
   - % répète la dernière ligne d'accords
   - paroles: "_" = endroit du prochain accord
=============================================================================*/
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
    .map((tok) => tok.replace(/\.+$/g, "")) // retire les durées visuelles
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
        SECTION_NAMES[code] +
        (["i", "o"].includes(code) ? "" : ` ${counts[code]}`);
      out.push({ type: "section", name: label });
      continue;
    }

    if (line.trim() === "%") {
      pendingChords = lastChords ? [...lastChords] : [];
      continue;
    }

    // heuristique: ligne d'accords
    if (/^[\sA-Ga-g0-9#bmjduasor\/\.\|\+\(\)]+$/.test(line)) {
      const chords = parseChordTokens(line);
      if (chords.length) {
        pendingChords = chords;
        lastChords = chords;
      }
      continue;
    }

    // paroles → fabrique une ligne inline
    const chords = pendingChords ?? lastChords ?? [];
    const parts = splitByUnderscore(line);
    const elems: { text: string; chord?: string }[] = [];
    for (let i = 0; i < parts.length; i++) {
      elems.push({ text: parts[i], chord: chords[i] });
    }
    out.push({ type: "inline", elements: elems });
    pendingChords = null; // consommé
  }
  return out;
}

/** Sépare un segment en espaces de tête, cœur (mot), et queue (espaces + ponctuation) */
function splitCore(s: string) {
  const m = s.match(/^(\s*)(.*?)([\s.,;:!?…]*)$/);
  return { lead: m?.[1] ?? "", core: m?.[2] ?? "", trail: m?.[3] ?? "" };
}

/** Rendu inline: accords AU-DESSUS du mot via <ruby>, sans inclure espaces/ponctuation */
function RubyLine({
  elements,
}: {
  elements: { text: string; chord?: string }[];
}) {
  return (
    <div className="cm-line">
      {elements.map((el, i) => {
        const { lead, core, trail } = splitCore(el.text);
        const hasCoreOrChord = core || el.chord;
        return (
          <React.Fragment key={i}>
            {lead && <span className="cm-sp">{lead}</span>}
            {hasCoreOrChord ? (
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

/** 🔧 Corrige les contenus collés ou contenant des "\n" littéraux depuis Firebase */
function normalizeSrc(input: string): string {
  return (input ?? "")
    .replace(/\\n/g, "\n") // "\n" → vrai retour
    .replace(/\r\n?/g, "\n") // CRLF/CR → LF
    .replace(/\s*#([vcbiop])\b/gi, (m, c) => `\n#${c.toLowerCase()}\n`)
    .replace(/\s*%\s*/g, "\n%\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/* =============================== Page RTDB =============================== */

type Row = { id: string; data: ChordMarkDoc };

export default function ChordMarkRTDB() {
  const [list, setList] = useState<Row[]>([]);
  const [selectedId, setSelectedId] = useState("");

  // Lecture /chordmark
  useEffect(() => {
    const r = dbRef(db, CHORDMARK_COLLECTION);

    const handle = (snap: any) => {
      const val = (snap.val() || {}) as Record<string, ChordMarkDoc>;
      const arr = Object.entries(val).map(([id, data]) => ({ id, data }));
      arr.sort((a, b) =>
        (a.data.title || a.id).localeCompare(b.data.title || b.id)
      );
      setList(arr);
    };

    onValue(r, handle, (err) => console.error("RTDB onValue error:", err));
    return () => off(r, "value", handle);
  }, []);

  // Auto-sélection via ?song=
  useEffect(() => {
    if (!list.length) return;
    const sp = new URLSearchParams(location.search);
    const q = sp.get("song");
    if (!q) return;
    const slugQ = slugify(q);
    const hit = list.find(
      (x) =>
        x.id.toLowerCase() === slugQ ||
        slugify(x.data.title || "") === slugQ
    );
    if (hit) setSelectedId(hit.id);
  }, [list]);

  const current = useMemo(
    () => list.find((x) => x.id === selectedId)?.data || null,
    [list, selectedId]
  );

  // Sync URL
  useEffect(() => {
    if (!selectedId) return;
    const item = list.find((x) => x.id === selectedId);
    const label = item?.data.title || selectedId;
    const sp = new URLSearchParams(location.search);
    sp.set("song", label);
    history.replaceState({}, "", `?${sp.toString()}`);
  }, [selectedId, list]);

  // Parsing pour le rendu custom
  const lines = useMemo(() => {
    const raw = current?.content || "";
    const src = normalizeSrc(raw);
    return parseChordMark(src);
  }, [current?.content]);

  return (
    <section id="section" className="scrollable">
      <h1>🎼 ChordMark</h1>

      <div id="selection-container">
        <select
          id="selector"
          value={selectedId}
          onChange={(e) => setSelectedId(e.target.value)}
        >
          <option value="" disabled>
            -- Choisis un morceau --
          </option>
          {list.map(({ id, data }) => (
            <option key={id} value={id}>
              {data.title || id}
            </option>
          ))}
        </select>
      </div>

      {current ? (
        <article style={{ marginTop: "1rem" }}>
          <div style={{ opacity: 0.8, fontSize: ".9rem" }}>
            {current.style ? <span>Style: {current.style} · </span> : null}
            {current.key ? <span>Tonalité: {current.key} · </span> : null}
            {current.bpm ? <span>{current.bpm} BPM</span> : null}
          </div>

          <main className="cm-root" style={{ marginTop: ".75rem" }}>
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
          </main>
        </article>
      ) : (
        <p style={{ marginTop: "1rem", opacity: 0.8 }}>
          Sélectionne un morceau pour l’afficher.
        </p>
      )}

      <div style={{ marginTop: "1rem" }}>
        <Link to="/chordmark/edit">✏️ Ajouter / Modifier</Link>
      </div>

      <Link to="/" id="navigation-overlay" aria-label="Retour à l’accueil">
        ⬅️
      </Link>
    </section>
  );
}
