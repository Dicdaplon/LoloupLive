import React from 'react';
import '../assets/css/button.css';
import { useNavigate } from 'react-router-dom';

export default function HomeButtons() {
  const navigate = useNavigate();

  const go = (path: string) => () => navigate(path);

  return (
    <main className="home">
      <h1 className="home__title">Loloup LIVE</h1>

      <div className="home__grid">
        <button className="neon-btn neon-btn--pink" onClick={go('/grilles')}>
          Grilles
        </button>
        <button className="neon-btn neon-btn--cyan" onClick={go('/paroles')}>
          Paroles
        </button>
        <button className="neon-btn neon-btn--purple" onClick={go('/tabs')}>
          Tabs
        </button>
        <button className="neon-btn neon-btn--yellow" onClick={go('/info')}>
          Infos
        </button>
      </div>

      {/* Bouton caméra circulaire */}
      <button
        className="cam-fab"
        aria-label="Ouvrir la caméra"
        onClick={go('/cameraCapture')}
      ></button>
    </main>
  );
}
