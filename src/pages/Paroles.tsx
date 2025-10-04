import React, { useEffect, useMemo, useState } from 'react';
import { db } from '@/lib/firebase/databaseConfiguration';
import { ref, onValue } from 'firebase/database';
import OverlayLyrics from '../components/OverlayLyrics';
import { Link } from 'react-router-dom';

// format RTDB: /lyrics/<id> → { title?: string, lyrics: string, updatedAt?: number }
type LyricDoc = {
  title?: string;
  lyrics: string;
  updatedAt?: number;
};

function slugify(input: string): string {
  return String(input ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

export default function ParolesRTDB() {
  const [list, setList] = useState<Array<{ id: string; data: LyricDoc }>>([]);
  const [selectedId, setSelectedId] = useState<string>('');

  // charge /lyrics
  useEffect(() => {
    const r = ref(db, 'lyrics');
    const off = onValue(r, (snap) => {
      const val = (snap.val() || {}) as Record<string, LyricDoc>;
      const arr = Object.entries(val).map(([id, data]) => ({ id, data }));
      arr.sort((a, b) => (a.data.title || a.id).localeCompare(b.data.title || b.id));
      setList(arr);
    });
    return () => off();
  }, []);

  // lecture param ?song= (peut être id ou titre)
  useEffect(() => {
    if (!list.length) return;
    const sp = new URLSearchParams(location.search);
    const q = sp.get('song');
    if (!q) return;
    const slugQ = slugify(q);
    const hit = list.find(
      (x) => x.id.toLowerCase() === slugQ || slugify(x.data.title || '') === slugQ
    );
    if (hit) setSelectedId(hit.id);
  }, [list]);

  const current = useMemo(
    () => list.find((x) => x.id === selectedId)?.data || null,
    [list, selectedId]
  );

  // sync URL quand on change
  useEffect(() => {
    if (!selectedId) return;
    const item = list.find((x) => x.id === selectedId);
    const label = item?.data.title || selectedId;
    const sp = new URLSearchParams(location.search);
    sp.set('song', label);
    history.replaceState({}, '', `?${sp.toString()}`);
  }, [selectedId, list]);

  // --- Rendu par paragraphes (≥ une ligne vide = nouveau paragraphe) ---
  const neonClasses = ['paroles-neonA', 'paroles-neonB', 'paroles-neonC'];
  const paragraphs = useMemo(() => {
    const raw = current?.lyrics ?? '';
    // coupe sur une OU plusieurs lignes vides (éventuels espaces)
    return raw.split(/\r?\n\s*\r?\n/g).map((block) => block.split(/\r?\n/));
  }, [current?.lyrics]);

  return (
    <section id="section" className="scrollable">
      <h1>🎤 Paroles</h1>

      <div id="selection-container">
        <select id="selector" value={selectedId} onChange={(e) => setSelectedId(e.target.value)}>
          <option value="" disabled>
            -- Choisis un titre --
          </option>
          {list.map(({ id, data }) => (
            <option key={id} value={id}>
              {data.title || id}
            </option>
          ))}
        </select>
      </div>

      {/* rendu: couleur par PARAGRAPHE (cycle A/B/C) */}
      <div id="contenu-paroles">
        {paragraphs.map((lines, pi) => {
          const klass = neonClasses[pi % neonClasses.length];
          return (
            <div key={`p-${pi}`} style={{ marginBottom: '0.5rem' }}>
              {lines.map((ln, li) => (
                <div key={`p-${pi}-l-${li}`} className={klass} style={{ whiteSpace: 'pre-wrap' }}>
                  {ln === '' ? '\u00A0' : ln}
                </div>
              ))}
            </div>
          );
        })}
      </div>
      {/* EdgePeek overlay */}
      <div style={{ position: 'fixed', top: 12, right: 12, zIndex: 1000 }}>
        <OverlayLyrics />
      </div>

      {/* Back button */}
      <Link to="/" id="navigation-overlay" aria-label="Retour à l’accueil">
        ⬅️
      </Link>
    </section>
  );
}
