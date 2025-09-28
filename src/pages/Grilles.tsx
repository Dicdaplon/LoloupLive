import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
// Vite/TS can import JSON directly
import data from "../data/tablatures.json";
import   
  EdgePeekSheet
 from '../components/Overlay'
/* ================================
 * Constants
 * ================================ */

/** URL query parameter used to select a song. */
const QUERY_PARAM_SONG = "song";
/** Milliseconds in one minute (for BPM timing). */
const MS_PER_MINUTE = 60000;
/** Symbol used to repeat the previous measure in a line. */
const REPEAT_MEASURE_SYMBOL = "%";

/* ================================
 * Types
 * ================================ */

/** One line (row) of the chord grid, e.g., ["Am", "%", "F", "E"]. */
type Line = {
  mesures: string[];      // ex: ["Am","%","F","E"]
  repetitions?: number;   // ex: 2
};

/** A song (grid metadata + lines). */
type Song = {
  titre: string;
  style?: string;
  bpm?: number;
  tonalite?: string;
  difficulte?: string;
  signature?: string;     // "4/4"
  indication?: string;    // ex: "Capo 3"
  grille: Line[];
};

/* ================================
 * Helpers
 * ================================ */

/**
 * Ensure we always work with an array of Song.
 * The project's JSON is already an array; this just guards the type.
 */
function normalizeList(input: unknown): Song[] {
  return Array.isArray(input) ? (input as Song[]) : [];
}

/**
 * Replace "%" tokens by the previous measure inside a single line.
 * If "%" appears in the first position, it resolves to an empty string.
 */
function expandPercents(measures: string[]): string[] {
  const expandedMeasures: string[] = [];
  for (let measureIndex = 0; measureIndex < measures.length; measureIndex++) {
    const rawValue = (measures[measureIndex] || "").trim();
    if (rawValue === REPEAT_MEASURE_SYMBOL) {
      expandedMeasures.push(expandedMeasures[measureIndex - 1] ?? "");
    } else {
      expandedMeasures.push(rawValue);
    }
  }
  return expandedMeasures;
}

/**
 * Duplicate a line N times (with a minimum of 1).
 * Returns an array of cloned arrays (no mutation).
 * (Kept for parity with original code; currently unused.)
 */
function repeatLine(line: string[], times = 1): string[][] {
  const repeatCount = Math.max(1, times | 0);
  return Array.from({ length: repeatCount }, () => [...line]);
}

/* ================================
 * Component
 * ================================ */

export default function Grilles(): JSX.Element {
  const songList = useMemo(() => normalizeList(data), []);

  // selection (via ?song=Title in URL if present)
  const [selectedIndex, setSelectedIndex] = useState<number | "">("");

  useEffect(() => {
    const currentUrl = new URL(window.location.href);
    const requestedTitle = currentUrl.searchParams.get(QUERY_PARAM_SONG);
    if (!requestedTitle) return;

    const foundIndex = songList.findIndex(
      (songItem) => songItem.titre.toLowerCase() === requestedTitle.toLowerCase()
    );
    if (foundIndex >= 0) setSelectedIndex(foundIndex);
  }, [songList]);

  const selectedSong: Song | null =
    typeof selectedIndex === "number" ? songList[selectedIndex] : null;

//// Tempo Blink  (/TODO Extract in a components ?)

  // Tempo LED (blinks at BPM)
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
    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [selectedSong?.bpm]);


  ///////


  // Build render-ready lines (expanded % + repeated)
  const renderedLines = useMemo(() => {
    if (!selectedSong) return [];
    const lineBlocks: { mesures: string[]; rep: number }[] = [];

    for (const gridLine of selectedSong.grille) {
      const expandedMeasures = expandPercents(gridLine.mesures || []);
      const repetitionCount = Math.max(1, gridLine.repetitions ?? 1);
      for (let repetitionIndex = 0; repetitionIndex < repetitionCount; repetitionIndex++) {
        lineBlocks.push({ mesures: expandedMeasures, rep: repetitionCount });
      }
    }
    return lineBlocks;
  }, [selectedSong]);

  // Sync URL when user picks a song in the <select>
  useEffect(() => {
    if (typeof selectedIndex !== "number") return;
    const selected = songList[selectedIndex];
    if (!selected) return;

    const currentUrl = new URL(window.location.href);
    currentUrl.searchParams.set(QUERY_PARAM_SONG, selected.titre);
    window.history.replaceState({}, "", currentUrl.toString());
  }, [selectedIndex, songList]);

  return (
    <div className="scrollable">
      {/* Selector */}
      <section id="selection-container">
        <h1>Choisis ton morceau</h1>
        <select
          id="selector"
          value={selectedIndex}
          onChange={(event) => {
            const { value } = event.target;
            setSelectedIndex(value === "" ? "" : Number(value));
          }}
        >
          <option value="">-- Sélectionne un titre --</option>
          {songList.map((songItem, songIndex) => (
            <option key={songItem.titre} value={songIndex}>
              {songItem.titre}
              {songItem.tonalite ? ` — ${songItem.tonalite}` : ""}
              {songItem.bpm ? ` (${songItem.bpm} BPM)` : ""}
            </option>
          ))}
        </select>
      </section>

      {/* Grid */}
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
              ]
                .filter(Boolean)
                .join(" • ")}
              {selectedSong.bpm ? ` • ${selectedSong.bpm} BPM` : ""}
            </p>
            <div id="tempo-led" className={isTempoTickOn ? "active" : ""} />
          </div>

          <div id="grille-container">
            {renderedLines.map((renderedLine, lineIndex) => (
              <div key={lineIndex} className="ligne">
                {renderedLine.mesures.map((cellContent, cellIndex) => (
                  <div key={cellIndex} className="cellule">
                    {cellContent}
                  </div>
                ))}
                {renderedLine.rep > 1 && (
                  <div className="repetition-badge">×{renderedLine.rep}</div>
                )}
              </div>
            ))}
          </div>
        </section>
      )}
<div
        style={{
          position: "fixed",
          top: 12,
          right: 12,
          zIndex: 1000,
        }}
      >
        <EdgePeekSheet />
   
      </div>
      {/* Back button overlay */}
      <Link to="/" id="navigation-overlay" aria-label="Retour à l’accueil">
        ⬅️
      </Link>
    </div>
  );
}
