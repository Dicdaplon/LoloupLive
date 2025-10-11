// src/pages/ParolesPage.tsx
import React from "react";

/* ===== Mini parser ChordMark (sous-ensemble) =====
   - #v/#c/#b/#i/#o/#p sections
   - lignes d'accords: C.. Am.. (on tolère les | et on ignore les . pour l'affichage)
   - % répète la dernière ligne d'accords
   - paroles: "_" = endroit du prochain accord
*/
type SectionCode = "v" | "c" | "b" | "i" | "o" | "p";
const SECTION_NAMES: Record<SectionCode, string> = {
  v: "Verse", c: "Chorus", b: "Bridge", i: "Intro", o: "Outro", p: "Pre-Chorus",
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
    if (ch === "_") { parts.push(cur); cur = ""; }
    else { cur += ch; }
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
      const label = SECTION_NAMES[code] + (["i", "o"].includes(code) ? "" : ` ${counts[code]}`);
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
      if (chords.length) { pendingChords = chords; lastChords = chords; }
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
  const m = s.match(/^(\s*)(.*?)([\s.,;:!?…]*)$/); // la ponctuation finale part en "trail"
  return { lead: m?.[1] ?? "", core: m?.[2] ?? "", trail: m?.[3] ?? "" };
}

/** Rendu inline: accords AU-DESSUS du mot via <ruby>, sans inclure les espaces/ponctuation */
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

export default function ParolesPage() {
  const src = `
#v
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
Halle_lu_u_jah
`;

  const lines = React.useMemo(() => parseChordMark(src), [src]);

  return (
    <main className="cm-root">
      <section className="cm-card">
        {lines.map((ln, idx) =>
          ln.type === "section" ? (
            <h3 className="cm-section" key={idx}>{ln.name}</h3>
          ) : (
            <RubyLine key={idx} elements={ln.elements} />
          )
        )}
      </section>
    </main>
  );
}
