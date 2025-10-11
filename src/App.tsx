import { Routes, Route, Link } from 'react-router-dom';
import Home from './pages/Home';
import Paroles from './pages/Paroles';
import Info from './pages/Info';
import AppLayout from './components/AppLayout';
import Grilles from './pages/Grilles';
import ThreeTest from './devTest/ThreeTest';
import PixiTest from './devTest/PixiTest';
import UploadChordsRTDB from './pages/UploadChords';
import UploadLyricsRTDB from './pages/UploadLyrics';
import CameraSnapClassic from './pages/CameraCapture';
import LoloupBox from './pages/LoloupBox';
import Compteur from './pages/game';
import ParolesPage from './pages/chordMark';
import ChordMarkRTDB from './pages/chordMarkRDTB';
import UploadChordMarkPage from './pages/UploadChordMark';

export default function App() {
  return (
    <div>
      {/* Affiche la page selon l’URL */}
      <Routes>
        <Route element={<AppLayout />}>
          <Route path="/" element={<Home />} />
          <Route path="/paroles" element={<Paroles />} />
          <Route path="/info" element={<Info />} />
          <Route path="/grilles" element={<Grilles />} />
          <Route path="/threeTest" element={<ThreeTest />} />
          <Route path="/pixiTest" element={<PixiTest />} />
          <Route path="/uploadChords" element={<UploadChordsRTDB />} />
          <Route path="/uploadLyrics" element={<UploadLyricsRTDB />} />
          <Route path="/compteur" element={<Compteur />} />
          <Route path="/cameraCapture" element={<CameraSnapClassic />} />
          <Route path="/loloupBox" element={<LoloupBox />} />
          <Route path="/parolesPage" element={<ParolesPage />} />
          <Route path="/tabs" element={<ChordMarkRTDB />} />
          <Route path="/uploadChordMarkPage" element={<UploadChordMarkPage />} />
        </Route>
      </Routes>
    </div>
  );
}
