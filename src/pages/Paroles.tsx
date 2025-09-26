import React, { useMemo, useState, useEffect } from "react";
import P5Background from '../components/P5Background'

// 1) Charge toutes les paroles *.txt en RAW via Vite
//    -> clés = chemins (ex: "/src/data/paroles/All_of_me.txt")
//    -> valeurs = contenu du fichier
const parolesModules = import.meta.glob("../assets/paroles/*.txt", {
  as: "raw",
  eager: true,
}) as Record<string, string>;

type Option = {
  key: string;      // clé du glob (chemin)
  title: string;    // titre affiché dans le select
  filename: string; // nom de fichier
};


function filenameToTitle(name: string) {
  // "All_of_me.txt" -> "All of me"
  const base = name.replace(/\.txt$/i, "");
  return base.replace(/[_-]+/g, " ").replace(/\s+/g, " ").trim();
}
export default function Paroles() {
  // 2) Options dérivées des fichiers trouvés
  const options: Option[] = useMemo(() => {
    return Object.keys(parolesModules)
      .map((key) => {
        const filename = key.split("/").pop() || key;
        return {
          key,
          filename,
          title: filenameToTitle(filename),
        };
      })
      .sort((a, b) => a.title.localeCompare(b.title));
  }, []);

  // 3) Sélection initiale depuis l’URL ?song= (facultatif)
  const [selectedKey, setSelectedKey] = useState<string>("");

  useEffect(() => {
    const url = new URL(window.location.href);
    const q = url.searchParams.get("song");
    if (q) {
      const match = options.find(
        (o) =>
          o.filename.toLowerCase() === q.toLowerCase() ||
          o.title.toLowerCase() === q.toLowerCase()
      );
      if (match) {
        setSelectedKey(match.key);
        return;
      }
    }
    // Par défaut: rien sélectionné (on garde le placeholder)
  }, [options]);

  // 4) Contenu courant
  const content = selectedKey ? parolesModules[selectedKey] : "";

  // 5) Sync de l’URL (optionnel mais pratique)
  useEffect(() => {
    if (!selectedKey) return;
    const opt = options.find((o) => o.key === selectedKey);
    if (!opt) return;
    const url = new URL(window.location.href);
    url.searchParams.set("song", opt.filename);
    window.history.replaceState({}, "", url.toString());
  }, [selectedKey, options]);

  return (
    <section id="paroles-section" className="scrollable">
      <h1>🎤 Paroles</h1>

      <div id="selection-container-paroles">
        <select
          id="selector-paroles"
          value={selectedKey}
          onChange={(e) => setSelectedKey(e.target.value)}
        >
          <option value="" disabled>
            -- Choisis un morceau --
          </option>
          {options.map((o) => (
            <option key={o.key} value={o.key}>
              {o.title}
            </option>
          ))}
        </select>
      </div>

      <pre id="contenu-paroles" className="paroles">
        {content || ""}
      </pre>

      {/* Lien retour (même id que l’ancien overlay si tu as du CSS) */}
      <a href="/index.html" id="navigation-overlay" aria-label="Retour">
        ⬅️
      </a>
    
    </section>


    
    
  );
}
