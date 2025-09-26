import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";

// ⚠️ Adapte le chemin si ton JSON est ailleurs
import morceaux from "../data/tablatures.json";

type Morceau = {
  id?: string;
  titre: string;
  style?: string;
  bpm?: number;
  tonalite?: string;
  mesures?: number;     // optionnel si "notes" suffit
  notes: string[];      // tableau de mesures sous forme de texte (supporte "\\")
  description?: string; // optionnel
};

function normalizeTitle(t: string) {
  return t.replace(/\s+/g, " ").trim();
}

function useQuerySong(options: Morceau[]) {
  const [initialKey, setInitialKey] = useState<number | null>(null);
  useEffect(() => {
    const url = new URL(window.location.href);
    const q = url.searchParams.get("song");
    if (!q) return;
    const wanted = q.toLowerCase();
    const i = options.findIndex(
      (m) =>
        (m.id && m.id.toLowerCase() === wanted) ||
        (m.titre && m.titre.toLowerCase() === wanted)
    );
    if (i >= 0) setInitialKey(i);
  }, [options]);
  return initialKey;
}

export default function Grilles() {
  // 1) Options depuis le JSON
  const morceauxList: Morceau[] = useMemo(() => {
    if (Array.isArray(morceaux)) return morceaux as Morceau[];
    // Si ton JSON est { "morceaux": [...] }
    if ((morceaux as any).morceaux) return (morceaux as any).morceaux as Morceau[];
    return [];
  }, []);

  // 2) Sélection
  const [index, setIndex] = useState<number | "">("");
  const initialFromQuery = useQuerySong(morceauxList);
  useEffect(() => {
    if (initialFromQuery !== null) setIndex(initialFromQuery);
  }, [initialFromQuery]);

  const courant = typeof index === "number" ? morceauxList[index] : null;

  // 3) Sync URL quand on choisit un morceau
  useEffect(() => {
    if (typeof index !== "number") return;
    const m = morceauxList[index];
    if (!m) return;
    const url = new URL(window.location.href);
    url.searchParams.set("song", (m.id ?? m.titre).replace(/\s+/g, "_"));
    window.history.replaceState({}, "", url.toString());
  }, [index, morceauxList]);

  // 4) LED Tempo
  const [tick, setTick] = useState(false);
  const bpmRef = useRef<number | undefined>(undefined);
  useEffect(() => {
    bpmRef.current = courant?.bpm;
  }, [courant?.bpm]);
  useEffect(() => {
    let timer: number | undefined;
    const loop = () => {
      const bpm = bpmRef.current ?? 0;
      if (bpm > 0) {
        setTick((t) => !t);
        const period = 60000 / bpm; // ms par battement
        timer = window.setTimeout(loop, period);
      } else {
        timer = undefined;
      }
    };
    loop();
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [courant?.bpm]); // relance quand le morceau change

  // 5) Fond animé (reprise du HTML)
  useEffect(() => {
    const script = document.createElement("script");
    script.src = "/src/assets/js/visual/background.js";
    script.async = true;
    document.body.appendChild(script);
    return () => {
      document.body.removeChild(script);
    };
  }, []);

  // 6) Rendu d’une mesure : support des demi-mesures via "\\"
  function renderMesure(text: string, i: number) {
    const parts = text.split("\\").map((s) => normalizeTitle(s));
    if (parts.length === 1) {
      return (
        <div key={i} className="mesure">
          <span className="mesure-text">{parts[0]}</span>
        </div>
      );
    }
    // demi-mesures
    return (
      <div key={i} className="mesure demi">
        <div className="half">{parts[0]}</div>
        <div className="half">{parts[1]}</div>
      </div>
    );
  }

  return (
    <div className="scrollable">
      <div id="background-holder" />

      {/* Sélection du morceau */}
      <section id="selection-container">
        <h1>Choisis ton morceau</h1>

        <select
          id="selector"
          value={index}
          onChange={(e) => {
            const v = e.target.value;
            setIndex(v === "" ? "" : Number(v));
          }}
        >
          <option value="">-- Sélectionne un titre --</option>
          {morceauxList.map((m, i) => (
            <option key={m.id ?? m.titre} value={i}>
              {m.titre}
              {m.tonalite ? ` — ${m.tonalite}` : ""} {m.bpm ? ` (${m.bpm} BPM)` : ""}
            </option>
          ))}
        </select>
      </section>

      {/* Grille */}
      {courant && (
        <section id="grille-section">
          <div id="morceau-infos">
            <h2 id="titre">{courant.titre}</h2>
            <p id="description">
              {[courant.style, courant.tonalite]
                .filter(Boolean)
                .join(" • ")}
              {courant.bpm ? ` • ${courant.bpm} BPM` : ""}
            </p>
            <div
              id="tempo-led"
              aria-label="Tempo"
              title={courant.bpm ? `${courant.bpm} BPM` : "Tempo"}
              style={{
                width: 16,
                height: 16,
                borderRadius: 9999,
                marginTop: 4,
                background: tick ? "rgba(0,255,255,0.9)" : "rgba(255,0,0,0.7)",
                boxShadow: tick
                  ? "0 0 12px rgba(0,255,255,0.9)"
                  : "0 0 8px rgba(255,0,0,0.7)",
                transition: "box-shadow 80ms linear, background 80ms linear",
              }}
            />
          </div>

          <div id="grille-container" className="grille">
            {courant.notes?.map((mes, i) => renderMesure(mes, i))}
          </div>
        </section>
      )}

      {/* Bouton retour overlay */}
      <Link to="/" id="navigation-overlay" aria-label="Retour à l’accueil">
        ⬅️
      </Link>
    </div>
  );
}
