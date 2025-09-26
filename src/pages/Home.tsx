import P5Background from '../components/P5Background' 
import AccueilSketch from '../components/HomeButtons'
import Logo from "../components/Logo";
import ChatOverlay from "../components/chat/ChatOverlay";
import ChatInput from "../components/chat/ChatInput";


export default function Home() {
  return (
    <div style={{ position: 'relative', minHeight: '100dvh' }}>
      <P5Background />
       <AccueilSketch/>
        <Logo size={110} floating glow draggable to="/" />
          <ChatOverlay />
      <ChatInput />
        
      <main style={{ position: 'relative', zIndex: 2, display: 'grid', placeItems: 'center', height: '100dvh' }}>
      </main>
    </div>
  )
}