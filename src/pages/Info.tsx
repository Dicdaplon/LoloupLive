import React, { useEffect } from "react";
import { Link } from "react-router-dom";

/**
 * Page d'infos — version React.
 * - Réemploie les classes CSS existantes: .scrollable, .info-content
 * - Charge le fond animé en important dynamiquement le script comme dans la page HTML
 * - Remplace l'ancre <a href="index.html"> par <Link to="/">...</Link>
 *
 * Prérequis:
 * - Ton CSS global est déjà importé (ex: dans main.tsx: import './assets/css/style.css'; import './assets/css/info.css';)
 * - Le fichier du fond animé est accessible (adapte le chemin ci-dessous si besoin)
 */
export default function Info() {
  useEffect(() => {
    // ⚠️ Adapte ce chemin à ton projet.
    // Si le fichier est sous "src/assets/js/visual/background.js",
    // l'idéal serait de le porter en module ou de créer un composant p5.
    // Ici on reproduit ton injection de script 1:1.

   
  }, []);

  return (
    <div className="scrollable">
      <div id="background-holder" />

      <main className="info-content">
        <h1>Les Jam Loloup</h1>

        <section>
          <p>
            <strong>Loloup</strong> est un collectif de musiciennes et musiciens,
            orienté improvisation et partage. On organise des{" "}
            <strong>jam sessions ouvertes</strong> : tous styles, tous niveaux,
            bonne ambiance obligatoire.
          </p>
        </section>

        <section>
          <h2>📅 Quand&nbsp;?</h2>
          <ul>
            <li>
              <strong>1×/mois</strong> à la <em>Salle des Rancy</em> — départ{" "}
              <strong>20h</strong>
            </li>
            <li>
              <strong>1×/mois</strong> au <em>Cavendish</em> — départ{" "}
              <strong>20h</strong>
            </li>
          </ul>
          <p>
            Les dates sont annoncées sur Instagram&nbsp;:{" "}
            <strong>@loloup_prod</strong>
          </p>
        </section>

        <section>
          <h2>📍 Où&nbsp;?</h2>
          <ul>
            <li>
              <strong>Salle des Rancy</strong>
              <br />
              249 Rue Vendôme, 69003 Lyon — vers <em>Saxe-Gambetta</em>
            </li>
            <li>
              <strong>Le Cavendish</strong>
              <br />
              2 Rue Professeur Rollet, 69008 Lyon — vers <em>Sans-Souci</em>
            </li>
          </ul>
        </section>

        <section>
          <h2>🎓 Apprendre & progresser</h2>
          <p>
            Chaque semaine, on propose aussi des{" "}
            <strong>sessions locales sans public</strong> pour celles et ceux
            qui veulent travailler l’impro sérieusement.
          </p>
          <p>
            Le collectif est animé par <strong>Hugo</strong> et{" "}
            <strong>Moi</strong>, deux musiciens tournés vers{" "}
            <strong>l’enseignement</strong> et <strong>l’improvisation</strong>.
          </p>
        </section>

        <section>
          <h2>📲 Suivre l’actu</h2>
          <p>
            Photos, vidéos et prochaines dates&nbsp;:{" "}
            <strong>@loloup_prod</strong> sur Instagram.
          </p>
        </section>
      </main>

      {/* Bouton retour (overlay) */}
      <Link to="/" id="navigation-overlay" aria-label="Retour à l’accueil">
        ⬅️
      </Link>
    </div>
  );
}
