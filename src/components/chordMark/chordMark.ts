// src/lib/firebase/chordMark.ts
export type ChordMarkDoc = {
  /** Titre affiché (obligatoire côté UI, sert à slugifier l'id si non fourni) */
  title: string;
  /** Contenu au format ChordMark (texte brut) */
  content: string;

  /** Métadonnées facultatives */
  bpm?: number;
  key?: string;       // ex: "C", "Gm", etc.
  style?: string;     // ex: "funk", "blues", ...
  updatedAt?: number; // Date.now()
  meta?: Record<string, unknown>;
};

/** Chemin RTDB de la collection */
export const CHORDMARK_COLLECTION = "chordmark";

/** Slugify identique à la logique Paroles (id ou titre en URL) */
export function slugify(input: string): string {
  return String(input ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}
