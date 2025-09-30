import React, { useEffect } from "react";
import { Link } from "react-router-dom";

const LEETCHI_URL =
  "https://www.leetchi.com/fr/c/collectif-loloup-1954857?utm_source=copylink&utm_medium=social_sharing&utm_campaign=pot";
const INSTA_URL = "https://www.instagram.com/loloup_prod/";

/**
 * Page d'infos — version React avec CTA Leetchi + Instagram.
 * - Garde .scrollable, .info-content
 * - Ajoute un bloc CTA (don) en haut + bouton flottant
 */
export default function Info() {
  useEffect(() => {
    // (Optionnel) injection du fond animé si besoin
    // const script = document.createElement("script");
    // script.src = "/assets/js/visual/background.js";
    // script.async = true;
    // document.body.appendChild(script);
    // return () => { document.body.removeChild(script); };
  }, []);

  return (
    <div className="scrollable">
      <div id="background-holder" />

      {/* Styles locaux (légers) pour le CTA et les boutons */}
      <style>{`
        .cta-card {
          background: rgba(0,0,0,0.55);
          border: 1px solid rgba(255,255,255,0.12);
          border-radius: 16px;
          padding: 16px;
          margin-bottom: 20px;
          box-shadow: 0 6px 20px rgba(0,0,0,0.25);
          backdrop-filter: blur(6px);
        }
        .cta-title {
          margin: 0 0 8px 0;
          font-size: 1.25rem;
          line-height: 1.2;
        }
        .cta-text {
          margin: 0 0 12px 0;
          opacity: 0.9;
        }
        .cta-actions {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
        }
        .btn-pill {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 10px 14px;
          border-radius: 999px;
          text-decoration: none;
          font-weight: 600;
          letter-spacing: 0.2px;
          transition: transform 0.12s ease, opacity 0.2s ease;
          border: 1px solid rgba(255,255,255,0.18);
        }
        .btn-donate {
          background: linear-gradient(90deg, #ff2bd1, #00f0ff);
          color: #111;
        }
        .btn-insta {
          background: rgba(255,255,255,0.08);
          color: #fff;
        }
        .btn-pill:hover { transform: translateY(-1px); opacity: 0.95; }
        .fine {
          font-size: 0.9rem;
          opacity: 0.8;
        }
        /* Bouton flottant (don) */
        .floating-donate {
          position: fixed;
          right: 16px;
          bottom: 16px;
          z-index: 60;
          background: linear-gradient(90deg, #ff2bd1, #00f0ff);
          color: #111;
          border: none;
          border-radius: 999px;
          padding: 12px 16px;
          font-weight: 800;
          text-decoration: none;
          box-shadow: 0 8px 28px rgba(0,0,0,0.35);
        }
        .floating-donate:hover { transform: translateY(-1px); }
        /* Responsif */
        @media (min-width: 720px) {
          .cta-row {
            display: grid;
            grid-template-columns: 1fr auto;
            align-items: center;
            gap: 16px;
          }
        }
      `}</style>

      <main className="info-content">
        {/* 💜 Bloc CTA Don */}
        <section className="cta-card">
          <div className="cta-row">
            <div>
              <h2 className="cta-title">💜 Soutenir le collectif</h2>
              <p className="cta-text">
                Contribue librement à la caisse commune pour le local, le matos
                et nos prochaines jams. Chaque euro compte. Merci !
              </p>
              <div className="cta-actions">
                <a
                  className="btn-pill btn-donate"
                  href={LEETCHI_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Ouvrir la cagnotte Leetchi"
                >
                  🎁 Contribuer sur Leetchi
                </a>
                <a
                  className="btn-pill btn-insta"
                  href={INSTA_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Ouvrir Instagram Loloup Prod"
                >
                  📸 Suivre @loloup_prod
                </a>
              </div>
              <p className="fine" style={{ marginTop: 8 }}>
                Pas de montant imposé — don au nom du collectif (pot hébergé via
                Leetchi).
              </p>
            </div>
            {/* (Optionnel) Zone QR si tu ajoutes une image plus tard */}
            {/* <img src="/assets/img/qr-leetchi.png" alt="QR code Leetchi" width={120} height={120} style={{borderRadius: 12, opacity: 0.9}}/> */}
          </div>
        </section>

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
            Les dates sont annoncées sur Instagram&nbsp;:&nbsp;
            <a
              href={INSTA_URL}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Instagram Loloup Prod"
            >
              <strong>@loloup_prod</strong>
            </a>
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
            Photos, vidéos et prochaines dates&nbsp;:&nbsp;
            <a
              href={INSTA_URL}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Instagram Loloup Prod"
            >
              <strong>@loloup_prod</strong>
            </a>
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
