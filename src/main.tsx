import React from 'react';
import ReactDOM from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import App from './App.tsx';

import './assets/css/constantColors.css';
import './assets/css/style.css';
import './assets/css/info.css';
import './assets/css/paroles.css';
import './assets/css/chords.css';
import './assets/css/chordMark.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    {/* HashRouter = gestion de la navigation */}
    <HashRouter>
      <App />
    </HashRouter>
  </React.StrictMode>
);
