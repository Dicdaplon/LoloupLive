import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import EdgePeekSheet from "../components/Overlay";

import { db } from "@/lib/firebase/app";         // ← RTDB
import { ref, onValue } from "firebase/database";

/* ================================
 * Constantes
 * ================================ */
const QUERY_PARAM_SONG = "song";
const MS_PER_MINUTE = 60000;
const REPEAT_MEASURE_SYMBOL = "%";

/* ================================
 * Types
 * ================================ */
type Line = { mesures: string[]; repetitions?: number };
type Song = {
  titre: string;
  style?: string;
  bpm?: number;
  tonalite?: string;
  difficulte?: string;
  signature?: string;
  indication?: string;
  grille: Line[];
};

/* ================================
 * Helpers
 * ================================ */
function expandPercents(measures: string[]): string[] {
  const out: string[] = [];
  for (let i = 0; i < measures.length; i++) {
    const raw = (measures[i] || "").trim();
    out.push(raw === REPEAT_MEASURE_SYMBOL ? out[i - 1] ?? "" : raw);
  }
  return out;
}

/* ================================
 * Composant
 * ================================ */
export default function Grilles(): JSX.Element {
  // Liste récupérée depuis RTDB
  const [songList, setSongList] = useState<Song[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIndex, setSelectedIndex] = useState<number | "">("");

  // Lecture temps réel de /chords
  useEffect(() => {
    const chordsRef = ref(db, "chords");
    const unsub = onValue(
      chordsRef,
      (snap) => {
        const val = snap.val() || {};
        // val = { "id": {titre, grille, ...}, ... } → on garde juste les valeurs
        const arr = Object.values(val) as Song[];
        // Tri par titre pour une liste stable
        arr.sort((a, b) => (a?.titre || "").localeCompare(b?.titre || ""));
        setSongList(arr);
        setLoading(false);
      },
      () => setLoading(false)
    );
    return () => unsub();
  }, []);

  // Sélection via ?song= dans l’URL, si présent
  useEffect(() => {
    if (!songList.length) return;
    const sp = new URLSearchParams(location.search);
    const requested = sp.get(QUERY_PARAM_SONG);
    if (!requested) return;
    const idx = songList.findIndex((s) => (s.titre || "").toLowerCase() === requested.toLowerCase());
    if (idx >= 0) setSelectedIndex(idx);
  }, [songList]);

  const selectedSong: Song | null = typeof selectedIndex === "number" ? songList[selectedIndex] : null;

  // Tempo LED (blink à BPM)
  const [isTempoTickOn, setIsTempoTickOn] = useState(false);
  const bpmRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    bpmRef.current = selectedSong?.bpm;
  }, [selectedSong?.bpm]);

  useEffect(() => {
    let timeoutId: number | undefined;

    const scheduleNextBlink = () => {
      const currentBpm = bpmRef.current ?? 0;
      if (currentBpm > 0) {
        setIsTempoTickOn((prev) => !prev);
        const periodMs = MS_PER_MINUTE / currentBpm;
        timeoutId = window.setTimeout(scheduleNextBlink, periodMs);
      }
    };

    scheduleNextBlink();
    return () => { if (timeoutId) clearTimeout(timeoutId); };
  }, [selectedSong?.bpm]);

  // Lignes rendues (expand % + répétitions)
const renderedLines = useMemo(() => {
  if (!selectedSong) return [];
  return (selectedSong.grille || []).map((gridLine) => ({
    mesures: expandPercents(gridLine.mesures || []),
    rep: Math.max(1, gridLine.repetitions ?? 1), // juste pour l'affichage du badge
  }));
}, [selectedSong]);

  // Sync URL quand on change de sélection
  useEffect(() => {
    if (typeof selectedIndex !== "number") return;
    const s = songList[selectedIndex];
    if (!s) return;
    const sp = new URLSearchParams(location.search);
    sp.set(QUERY_PARAM_SONG, s.titre);
    history.replaceState({}, "", `?${sp.toString()}`);
  }, [selectedIndex, songList]);

  return (
    <div className="scrollable">
      {/* Sélecteur */}
      <section id="selection-container">
        <h1>Choisis ton morceau</h1>
        {loading ? (
          <div>Chargement…</div>
        ) : (
          <select
            id="selector"
            value={selectedIndex}
            onChange={(e) => {
              const { value } = e.target;
              setSelectedIndex(value === "" ? "" : Number(value));
            }}
          >
            <option value="">-- Sélectionne un titre --</option>
            {songList.map((songItem, i) => (
              <option key={`${songItem.titre}-${i}`} value={i}>
                {songItem.titre}
                {songItem.tonalite ? ` — ${songItem.tonalite}` : ""}
                {typeof songItem.bpm === "number" ? ` (${songItem.bpm} BPM)` : ""}
              </option>
            ))}
          </select>
        )}
      </section>

      {/* Grille */}
      {selectedSong && (
        <section id="grille-section">
          <div id="morceau-infos">
            <h2 id="titre">{selectedSong.titre}</h2>
            <p id="description">
              {[
                selectedSong.style,
                selectedSong.tonalite,
                selectedSong.signature,
                selectedSong.indication,
                selectedSong.difficulte,
              ].filter(Boolean).join(" • ")}
              {selectedSong.bpm ? ` • ${selectedSong.bpm} BPM` : ""}
            </p>
            <div id="tempo-led" className={isTempoTickOn ? "active" : ""} />
          </div>

          <div id="grille-container">
            {renderedLines.map((line, li) => (
              <div key={li} className="ligne">
                {line.mesures.map((cell, ci) => (
                  <div key={ci} className="cellule">{cell}</div>
                ))}
                {line.rep > 1 && <div className="repetition-badge">×{line.rep}</div>}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* EdgePeek overlay */}
      <div style={{ position: "fixed", top: 12, right: 12, zIndex: 1000 }}>
        <EdgePeekSheet />
      </div>

      {/* Back button */}
      <Link to="/" id="navigation-overlay" aria-label="Retour à l’accueil">⬅️</Link>
    </div>
  );
}
