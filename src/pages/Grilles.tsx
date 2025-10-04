import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import EdgePeekSheet from '../components/Overlay';

import { db } from '@/lib/firebase/databaseConfiguration';
import { ref, onValue } from 'firebase/database';

/* ================================
 * Constants
 * ================================ */
const QUERY_PARAM_SONG = 'song';
const MS_PER_MINUTE = 60000;
const REPEAT_MEASURE_SYMBOL = '%';
const OVERLAY_OFFSET_PX = 12;
const OVERLAY_Z_INDEX = 1000;

/* ================================
 * Types
 * ================================ */
type Line = { mesures: string[]; repetitions?: number };
type Song = {
  // NOTE: Field names follow the data shape stored in RTDB (do not rename).
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

/**
 * Expand "%" repeat symbols by copying the previous measure.
 * The input array is not mutated; a new array is returned.
 *
 * @param {string[]} measures - Measures for a single line (may contain "%").
 * @returns {string[]} A new array where "%" is replaced with the previous value.
 */
function expandPercents(measures: string[]): string[]
{
  const out: string[] = [];

  for (let i = 0; i < measures.length; i++)
  {
    const raw = (measures[i] || '').trim();

    if (raw === REPEAT_MEASURE_SYMBOL)
    {
      out.push(out[i - 1] ?? '');
    }
    else
    {
      out.push(raw);
    }
  }

  return out;
}

/* ================================
 * Component
 * ================================ */

/**
 * Grilles page:
 * - Live reads chords list from RTDB (`/chords`)
 * - Select a song (URL-synced via ?song=)
 * - Renders grid with "%" expansion and repetition badges
 * - Blinks tempo LED based on BPM
 */
export default function Grilles(): JSX.Element
{
  // List read from RTDB
  const [songList, setSongList] = useState<Song[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIndex, setSelectedIndex] = useState<number | ''>('');

  // Realtime read of /chords
  useEffect(() =>
  {
    const chordsRef = ref(db, 'chords');

    const unsubscribe = onValue(
      chordsRef,
      (snap) =>
      {
        const val = snap.val() || {};
        // val = { "id": {titre, grille, ...}, ... } → keep only values
        const arr = Object.values(val) as Song[];

        // Stable sort by title
        arr.sort((a, b) => (a?.titre || '').localeCompare(b?.titre || ''));

        setSongList(arr);
        setLoading(false);
      },
      () =>
      {
        setLoading(false);
      }
    );

    return () =>
    {
      unsubscribe();
    };
  }, []);

  // Selection via ?song= in URL, if present
  useEffect(() =>
  {
    if (songList.length === 0)
    {
      return;
    }

    const sp = new URLSearchParams(location.search);
    const requested = sp.get(QUERY_PARAM_SONG);

    if (!requested)
    {
      return;
    }

    const idx = songList.findIndex((s) =>
      (s.titre || '').toLowerCase() === requested.toLowerCase()
    );

    if (idx >= 0)
    {
      setSelectedIndex(idx);
    }
  }, [songList]);

  const selectedSong: Song | null =
    typeof selectedIndex === 'number' ? songList[selectedIndex] : null;

  // Tempo LED (blink at BPM)
  const [isTempoTickOn, setIsTempoTickOn] = useState(false);
  const bpmRef = useRef<number | undefined>(undefined);

  useEffect(() =>
  {
    bpmRef.current = selectedSong?.bpm;
  }, [selectedSong?.bpm]);

  useEffect(() =>
  {
    let timeoutId: number | undefined;

    const scheduleNextBlink = () =>
    {
      const currentBpm = bpmRef.current ?? 0;

      if (currentBpm > 0)
      {
        setIsTempoTickOn((prev) => !prev);

        const periodMs = MS_PER_MINUTE / currentBpm;
        timeoutId = window.setTimeout(scheduleNextBlink, periodMs);
      }
    };

    scheduleNextBlink();

    return () =>
    {
      if (timeoutId)
      {
        clearTimeout(timeoutId);
      }
    };
  }, [selectedSong?.bpm]);

  // Rendered lines (expand % + repetitions)
  const renderedLines = useMemo(() =>
  {
    if (!selectedSong)
    {
      return [];
    }

    return (selectedSong.grille || []).map((gridLine) =>
    {
      return {
        mesures: expandPercents(gridLine.mesures || []),
        // "rep" used only for the badge display
        rep: Math.max(1, gridLine.repetitions ?? 1),
      };
    });
  }, [selectedSong]);

  // Sync URL when selection changes
  useEffect(() =>
  {
    if (typeof selectedIndex !== 'number')
    {
      return;
    }

    const s = songList[selectedIndex];

    if (!s)
    {
      return;
    }

    const sp = new URLSearchParams(location.search);
    sp.set(QUERY_PARAM_SONG, s.titre);
    history.replaceState({}, '', `?${sp.toString()}`);
  }, [selectedIndex, songList]);

  return (
    <div className="scrollable">
      {/* Selector */}
      <section id="selection-container">
        <h1>Choisis ton morceau</h1>

        {loading
          ? (
            <div>Chargement…</div>
            )
          : (
            <select
              id="selector"
              value={selectedIndex}
              onChange={(e) =>
              {
                const { value } = e.target;
                setSelectedIndex(value === '' ? '' : Number(value));
              }}
            >
              <option value="">-- Sélectionne un titre --</option>
              {songList.map((songItem, i) =>
              {
                return (
                  <option key={`${songItem.titre}-${i}`} value={i}>
                    {songItem.titre}
                    {songItem.tonalite ? ` — ${songItem.tonalite}` : ''}
                    {typeof songItem.bpm === 'number' ? ` (${songItem.bpm} BPM)` : ''}
                  </option>
                );
              })}
            </select>
            )}
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
                .join(' • ')}
              {selectedSong.bpm ? ` • ${selectedSong.bpm} BPM` : ''}
            </p>

            <div id="tempo-led" className={isTempoTickOn ? 'active' : ''} />
          </div>

          <div id="grille-container">
            {renderedLines.map((line, li) =>
            {
              return (
                <div key={li} className="ligne">
                  {line.mesures.map((cell, ci) =>
                  {
                    return (
                      <div key={ci} className="cellule">
                        {cell}
                      </div>
                    );
                  })}
                  {line.rep > 1 && <div className="repetition-badge">×{line.rep}</div>}
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* EdgePeek overlay */}
      <div
        style={{
          position: 'fixed',
          top: OVERLAY_OFFSET_PX,
          right: OVERLAY_OFFSET_PX,
          zIndex: OVERLAY_Z_INDEX,
        }}
      >
        <EdgePeekSheet />
      </div>
    </div>
  );
}
