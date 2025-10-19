// src/pages/ChordMarkRTDB.tsx
import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { db } from "@/lib/firebase/databaseConfiguration";
import { ref as dbRef, onValue } from "firebase/database";
import { CHORDMARK_COLLECTION, ChordMarkDoc, slugify } from "@/components/chordMark/chordMark.ts";

// Optionnel : rendu HTML si la lib est dispo
let renderSongHtml: ((src: string) => string) | null = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { renderSong } = require("chord-mark");
  renderSongHtml = (src: string) => renderSong(src);
} catch {
  // pas de dépendance -> fallback <pre>
  renderSongHtml = null;
}

type Row = { id: string; data: ChordMarkDoc };

export default function ChordMarkRTDB() {
  const [list, setList] = useState<Row[]>([]);
  const [selectedId, setSelectedId] = useState("");

  // Charge /chordmark
  useEffect(() => {
    const r = dbRef(db, CHORDMARK_COLLECTION);
    const off = onValue(r, (snap) => {
      const val = (snap.val() || {}) as Record<string, ChordMarkDoc>;
      const arr = Object.entries(val).map(([id, data]) => ({ id, data }));
      arr.sort((a, b) => (a.data.title || a.id).localeCompare(b.data.title || b.id));
      setList(arr);
    });
    return () => off();
  }, []);

  // Sélection via ?song= (id ou titre)
  useEffect(() => {
    if (!list.length) return;
    const sp = new URLSearchParams(location.search);
    const q = sp.get("song");
    if (!q) return;
    const slugQ = slugify(q);
    const hit = list.find(
      (x) => x.id.toLowerCase() === slugQ || slugify(x.data.title || "") === slugQ
    );
    if (hit) setSelectedId(hit.id);
  }, [list]);

  const current = useMemo(
    () => list.find((x) => x.id === selectedId)?.data || null,
    [list, selectedId]
  );

  // Sync URL quand on change
  useEffect(() => {
    if (!selectedId) return;
    const item = list.find((x) => x.id === selectedId);
    const label = item?.data.title || selectedId;
    const sp = new URLSearchParams(location.search);
    sp.set("song", label);
    history.replaceState({}, "", `?${sp.toString()}`);
  }, [selectedId, list]);

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

          {/* Rendu ChordMark */}
          {renderSongHtml ? (
            <div
              style={{ marginTop: ".75rem" }}
              // chord-mark retourne déjà de l'HTML prêt
              dangerouslySetInnerHTML={{ __html: renderSongHtml(current.content) }}
            />
          ) : (
            <pre style={{ marginTop: ".75rem", whiteSpace: "pre-wrap" }}>
              {current.content}
            </pre>
          )}
        </article>
      ) : (
        <p style={{ marginTop: "1rem", opacity: 0.8 }}>
          Sélectionne un morceau pour l’afficher.
        </p>
      )}

      {/* Lien éditeur */}
      <div style={{ marginTop: "1rem" }}>
        <Link to="/chordmark/edit">✏️ Ajouter / Modifier</Link>
      </div>

      {/* Back */}
      <Link to="/" id="navigation-overlay" aria-label="Retour à l’accueil">
        ⬅️
      </Link>
    </section>
  );
}
