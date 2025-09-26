//import P5Background from '../components/P5Background'
import P5Background from '../components/P5Background' // <-- avec le "s"
import AccueilSketch from '../components/button'

export default function Home() {
  return (
    <div style={{ position: 'relative', minHeight: '100dvh' }}>
      <P5Background />
       <AccueilSketch/>
      <main style={{ position: 'relative', zIndex: 2, display: 'grid', placeItems: 'center', height: '100dvh' }}>
      </main>
    </div>
  )
}