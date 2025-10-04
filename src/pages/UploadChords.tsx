import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { db } from '@/lib/firebase/databaseConfiguration';
import { ref, set, get } from 'firebase/database';

// -Constants

const MAXMEASURESDIPLAYED = 16;
const MAXDIFFERENTPARTS = 3;
// ── Types / helpers ──────────────────────────────────────────────────────────
type MesureBlock = { mesures: string[]; repetitions?: number };
type ChordDoc = {
  titre: string;
  style?: string;
  bpm?: number;
  tonalite?: string;
  difficulte?: string;
  signature?: string;
  grille: MesureBlock[];
  updatedAt?: number;
};

/**
 * Convert a string into a "slug" (no special characters) safe for use in URLs and Firebase RTDB keys.
 *
 * @param input Any string
 * @returns A URL- and RTDB-safe slug, "Été déjà là" → "ete-deja-la"
 */
function slugify(input: string): string {
  return String(input ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}
function isStringArray(x: unknown): x is string[] {
  return Array.isArray(x) && x.every((v) => typeof v === 'string');
}
function validateChordDoc(
  data: unknown
): { ok: true; value: ChordDoc } | { ok: false; errors: string[] } {
  const errs: string[] = [];
  const d = data as Partial<ChordDoc>;
  if (!d || typeof d !== 'object')
    return { ok: false, errors: ['Payload invalide (doit être un objet).'] };

  if (typeof d.titre !== 'string' || !d.titre.trim())
    errs.push("champ 'titre' requis (string non vide).");

  if (!Array.isArray(d.grille)) {
    errs.push("champ 'grille' requis (array).");
  } else {
    d.grille.forEach((blk, i) => {
      if (!blk || typeof blk !== 'object') {
        errs.push(`grille[${i}] doit être un objet.`);
        return;
      }
      if (!isStringArray(blk.mesures))
        errs.push(`grille[${i}].mesures doit être un tableau de strings.`);
      if (blk.repetitions != null && typeof blk.repetitions !== 'number')
        errs.push(`grille[${i}].repetitions doit être un number (optionnel).`);
    });
  }

  if (d.bpm != null && typeof d.bpm !== 'number') errs.push('bpm doit être un number.');
  (['style', 'tonalite', 'difficulte', 'signature'] as const).forEach((k) => {
    const v = d[k];
    if (v != null && typeof v !== 'string') errs.push(`${k} doit être un string.`);
  });

  return errs.length ? { ok: false, errors: errs } : { ok: true, value: d as ChordDoc };
}

const EXAMPLE_JSON = `{
  "titre": "Jardin d'hiver",
  "style": "Jazz",
  "bpm": 75,
  "tonalite": "C#7",
  "difficulte": "Intermédiaire",
  "signature": "4/4",
  "grille": [
    { "mesures": ["C#7", "%", "F#m7", "%"], "repetitions": 4 },
    { "mesures": ["Bm7", "E7", "AMaj7", "%"], "repetitions": 2 }
  ]
}`;

// ── Anti-spam (temps mini entre envois) ──────────────────────────────────────
const MIN_INTERVAL_MS = 10_000; // 15s (ajuste si besoin)

// ── Composant ────────────────────────────────────────────────────────────────
export default function UploadChordsRTDB() {
  const [text, setText] = useState<string>(EXAMPLE_JSON);
  const [parsed, setParsed] = useState<ChordDoc | null>(null);
  const [docId, setDocId] = useState<string>('');
  const [overwrite, setOverwrite] = useState<boolean>(true);
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [resultMsg, setResultMsg] = useState<string>('');

  // Cooldown persistant
  const lastSendRef = useRef<number>(Number(localStorage.getItem('chords.lastUploadTs') || 0));
  const [coolingLeft, setCoolingLeft] = useState<number>(0);
  useEffect(() => {
    const id = window.setInterval(() => {
      const left = Math.max(0, MIN_INTERVAL_MS - (Date.now() - lastSendRef.current));
      setCoolingLeft(left);
    }, 250);
    return () => window.clearInterval(id);
  }, []);

  // Fichier -> textarea
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const onFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const txt = await file.text();
      setText(txt);
      setParsed(null);
      setErrors([]);
      setResultMsg('');
    } catch (err: any) {
      setErrors([`Lecture fichier: ${err?.message || err}`]);
    } finally {
      e.target.value = '';
    }
  }, []);

  // Valider JSON
  const doValidate = useCallback(() => {
    setResultMsg('');
    try {
      const json = JSON.parse(text);
      const res = validateChordDoc(json);
      if (!res.ok) {
        setErrors(res.errors);
        setParsed(null);
        return;
      }
      setErrors([]);
      setParsed(res.value);
      if (!docId && res.value.titre) setDocId(slugify(res.value.titre));
    } catch (e: any) {
      setErrors([`JSON invalide: ${e?.message || e}`]);
      setParsed(null);
    }
  }, [text, docId]);

  // Aperçu des lignes
  const previewLines = useMemo(() => {
    if (!parsed) return [];
    return parsed.grille.map((blk, i) => ({
      i,
      rep: blk.repetitions ?? 1,
      measures: blk.mesures,
    }));
  }, [parsed]);

  // Upload RTDB
  const doUpload = useCallback(async () => {
    // anti-spam
    {
      const now = Date.now();
      const elapsed = now - lastSendRef.current;
      if (elapsed < MIN_INTERVAL_MS) {
        const secs = Math.ceil((MIN_INTERVAL_MS - elapsed) / 1000);
        setErrors([`Anti-spam : attends ${secs}s avant un nouvel envoi.`]);
        return;
      }
    }

    // Forcer une validation si besoin
    let current = parsed;
    if (!current) {
      try {
        const json = JSON.parse(text);
        const res = validateChordDoc(json);
        if (!res.ok) {
          setErrors(res.errors);
          return;
        }
        current = res.value;
        setParsed(current);
      } catch (e: any) {
        setErrors([`JSON invalide: ${e?.message || e}`]);
        return;
      }
    }

    const id = (docId || slugify(current.titre)).trim();
    if (!id) {
      setErrors(["L'ID du document est vide."]);
      return;
    }
    if (/[.#$\[\]]/.test(id)) {
      setErrors(['ID invalide : ne doit pas contenir . # $ [ ]']);
      return;
    }

    setBusy(true);
    setErrors([]);
    setResultMsg('');
    try {
      const chordRef = ref(db, `chords/${id}`);
      if (!overwrite) {
        const snap = await get(chordRef);
        if (snap.exists()) {
          setErrors([`Le morceau '${id}' existe déjà.`]);
          setBusy(false);
          return;
        }
      }
      await set(chordRef, { ...current, updatedAt: Date.now() });
      lastSendRef.current = Date.now();
      localStorage.setItem('chords.lastUploadTs', String(lastSendRef.current));
      setResultMsg(`✔️ Upload OK → /chords/${id}`);
    } catch (err: any) {
      setErrors([`Erreur RTDB: ${err?.code ?? 'unknown'} — ${err?.message || err}`]);
    } finally {
      setBusy(false);
    }
  }, [parsed, text, docId, overwrite]);

  return (
    <main className="u-container">
      <h1>Uploader une grille JSON</h1>

      <section className="u-panel">
        <div className="u-row">
          <label>Fichier JSON</label>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json,.json"
            onChange={onFileChange}
          />
        </div>

        <div className="u-row">
          <label>Contenu JSON</label>
          <textarea
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              setParsed(null);
              setErrors([]);
              setResultMsg('');
            }}
            rows={14}
            spellCheck={false}
            className="u-textarea"
            placeholder="Colle ton JSON ici…"
          />
        </div>

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
          <button onClick={doValidate} className="u-btn">
            Valider
          </button>
          <button
            onClick={doUpload}
            disabled={!parsed || busy || coolingLeft > 0}
            className="u-btn u-btn-primary"
          >
            {busy
              ? 'Envoi…'
              : coolingLeft > 0
                ? `Attends ${Math.ceil(coolingLeft / 1000)}s`
                : 'Envoyer !'}
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
        {!parsed ? (
          <p className="u-dim">Valide d’abord le JSON pour voir un aperçu.</p>
        ) : (
          <div className="u-preview">
            <div className="u-meta">
              <div className="u-title">{parsed.titre}</div>
              <div className="u-tags">
                {parsed.style && <span>Style: {parsed.style}</span>}
                {typeof parsed.bpm === 'number' && <span>BPM: {parsed.bpm}</span>}
                {parsed.tonalite && <span>Tonalité: {parsed.tonalite}</span>}
                {parsed.signature && <span>Signature: {parsed.signature}</span>}
                {parsed.difficulte && <span>Niveau: {parsed.difficulte}</span>}
              </div>
            </div>

            <div className="u-lines">
              {previewLines.map((row) => (
                <div key={row.i} className="u-line">
                  {row.rep > 1 && <span className="u-badge">×{row.rep}</span>}
                  <div className="u-measures">
                    {row.measures.flatMap((m, i) =>
                      m.split('\\').map((h, j) => (
                        <span key={`${i}-${j}`} className="u-chip">
                          {h.trim()}
                        </span>
                      ))
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      <section className="u-panel">
        <h2>Aide rapide (JSON)</h2>
        <p>
          Colle un texte au <b>format JSON</b> qui décrit ta grille. Utilise “Valider” pour vérifier
          la syntaxe et la forme. Règles simples :
        </p>
        <ul>
          <li>
            <b>titre</b> (obligatoire) : nom du morceau.
          </li>
          <li>
            <b>grille</b> (obligatoire) : liste de blocs, chaque bloc a <code>mesures</code> (ex:{' '}
            <code>["Am","Dm","E7","Am"]</code>) et optionnellement <code>repetitions</code> (combien
            de fois répéter le bloc).
          </li>
          <li>
            Pour une <b>demi-mesure</b>, sépare avec un antislash <code>"C\\G"</code> → affichera 2
            demi-mesures.
          </li>
          <li>
            Champs optionnels : <code>style</code>, <code>bpm</code>, <code>tonalite</code>,{' '}
            <code>difficulte</code>, <code>signature</code>.
          </li>
        </ul>

        <p>Outils utiles (ouvrent dans un nouvel onglet) :</p>
        <ul>
          <li>
            <a href="https://jsonlint.com" target="_blank" rel="noreferrer">
              JSONLint
            </a>{' '}
            — vérifie la syntaxe.
          </li>
          <li>
            <a href="https://jsonformatter.org" target="_blank" rel="noreferrer">
              JSON Formatter
            </a>{' '}
            — met en forme/valide.
          </li>
        </ul>

        <p>Exemple minimal :</p>
        <pre className="u-code" style={{ whiteSpace: 'pre-wrap' }}>
          {`{
  "titre": "Blues en A",
  "grille": [
    { "mesures": ["A7","D7","A7","A7"] },
    { "mesures": ["D7","D7","A7","A7"] },
    { "mesures": ["E7","D7","A7","E7"], "repetitions": 2 }
  ]
}`}
        </pre>
      </section>
    </main>
  );
}
