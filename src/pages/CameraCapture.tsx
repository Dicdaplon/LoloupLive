// src/components/CameraSnapClassic.tsx
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { storage, db } from '@/lib/firebase/databaseConfiguration';
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import { ref as dbRef, push as dbPush } from 'firebase/database';
import { getAuth, onAuthStateChanged, signInAnonymously } from 'firebase/auth';
import gifshot from 'gifshot';
import { sendMessage } from '@/components/chat/chatService';

/**
 * Resolver utile seulement pour LECTURE de valeurs legacy (gs://, /o?name=…).
 */
async function resolveStorageUrl(input: string): Promise<string> {
  if (!input) return '';
  if (input.startsWith('gs://')) {
    const [, ...rest] = input.replace('gs://', '').split('/');
    const path = rest.join('/');
    return getDownloadURL(storageRef(storage, path));
  }
  try {
    const u = new URL(input);
    if (u.hostname.includes('firebasestorage.googleapis.com') && u.searchParams.has('token')) {
      return input;
    }
    if (u.hostname.includes('firebasestorage.googleapis.com') && u.searchParams.has('name')) {
      const path = u.searchParams.get('name')!;
      return getDownloadURL(storageRef(storage, path));
    }
    const m = u.pathname.match(/\/o\/(.+)/);
    if (u.hostname.includes('firebasestorage.googleapis.com') && m) {
      const encoded = m[1].split('?')[0];
      const path = decodeURIComponent(encoded);
      return getDownloadURL(storageRef(storage, path));
    }
    return input;
  } catch {
    return getDownloadURL(storageRef(storage, input));
  }
}

const GIF_PRESETS = {
  short: {
    label: 'GIF 2s',
    captureMs: 2000,   // durée pendant laquelle on CAPTURE
    frames: 10,        // nombre de photos
    gifDurationMs: 2000, // durée totale de lecture du GIF (peut être différente)
  },
  long: {
    label: 'GIF 4s',
    captureMs: 4000,
    frames: 15,
    gifDurationMs: 4000,
  },
} as const;

// Helper : convertir un dataURL (gifUrl) en Blob
function dataURLToBlob(dataUrl: string): Blob {
  const [header, base64] = dataUrl.split(',');
  const mimeMatch = header.match(/data:(.*);base64/);
  const mime = mimeMatch ? mimeMatch[1] : 'application/octet-stream';
  const binary = atob(base64);
  const len = binary.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new Blob([bytes], { type: mime });
}

const CameraSnapClassic: React.FC = () => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [disabled, setDisabled] = useState(false);

  const [gifUrl, setGifUrl] = useState<string | null>(null);
  const [makingGif, setMakingGif] = useState(false);
  const [uploadingGif, setUploadingGif] = useState(false);

  // ---- Auth anonyme auto
  useEffect(() => {
    const auth = getAuth();
    let unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        try {
          await signInAnonymously(auth);
        } catch (e) {
          console.warn('Anonymous sign-in failed:', e);
        }
      }
    });
    return () => unsub?.();
  }, []);

  // ---- Démarrage caméra (avec fallback)
  const startCamera = useCallback(async () => {
    const video = videoRef.current;
    if (!video) return;

    const tryStart = async (constraints: MediaStreamConstraints) => {
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      video.srcObject = stream;
      (video as any).playsInline = true;
      video.muted = true;
      await video.play().catch(() => {});
      video.onloadedmetadata = () => {
        console.log('🎥 Résolution :', `${video.videoWidth}x${video.videoHeight}`);
      };
    };

    try {
      await tryStart({
        video: { facingMode: { ideal: 'environment' }, width: { ideal: 1920 }, height: { ideal: 1080 } },
        audio: false,
      });
    } catch (e1: any) {
      console.warn('⚠️ Fallback SD :', e1?.message ?? e1);
      try {
        await tryStart({ video: true, audio: false });
      } catch (e2: any) {
        console.error('Erreur caméra :', e2);
        alert('Erreur d’accès caméra : ' + (e2?.message ?? e2));
      }
    }
  }, []);

  useEffect(() => {
    if (!navigator.mediaDevices?.getUserMedia) {
      alert('Cette plateforme ne supporte pas la caméra (getUserMedia).');
      return;
    }
    startCamera();

    return () => {
      const video = videoRef.current;
      const stream = video?.srcObject as MediaStream | null;
      stream?.getTracks().forEach(t => t.stop());
      if (video) video.srcObject = null;
    };
  }, [startCamera]);

  // ---- Helpers Blob
  function canvasToBlob(
    canvas: HTMLCanvasElement,
    type: 'image/jpeg' | 'image/png' | 'image/webp' = 'image/jpeg',
    quality = 1.0
  ): Promise<Blob> {
    return new Promise((resolve, reject) =>
      canvas.toBlob(b => (b ? resolve(b) : reject(new Error('toBlob failed'))), type, quality)
    );
  }

  function createCompressedBlobFromCanvas(
    canvas: HTMLCanvasElement,
    quality = 0.6,
    maxWidth = 1000
  ): Promise<Blob> {
    return new Promise((resolve, reject) => {
      const ratio = Math.min(1, maxWidth / canvas.width);
      const w = Math.round(canvas.width * ratio);
      const h = Math.round(canvas.height * ratio);

      const tmp = document.createElement('canvas');
      tmp.width = w;
      tmp.height = h;

      const ctx = tmp.getContext('2d');
      if (!ctx) return reject(new Error('2D context unavailable'));
      ctx.drawImage(canvas, 0, 0, w, h);

      tmp.toBlob(
        blob => (blob ? resolve(blob) : reject(new Error('toBlob failed'))),
        'image/jpeg',
        quality
      );
    });
  }

  // ---- Capture + upload photo + DB + overlay
  const onSnap = useCallback(async () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    if (video.readyState < 2) {
      alert('📷 La caméra n’est pas encore prête !');
      return;
    }

    setDisabled(true);

    // Flash visuel
    const flash = document.createElement('div');
    flash.style.position = 'fixed';
    flash.style.inset = '0';
    flash.style.background = '#fff';
    flash.style.opacity = '0.7';
    flash.style.zIndex = '9999';
    flash.style.transition = 'opacity .4s ease';
    document.body.appendChild(flash);
    requestAnimationFrame(() => {
      flash.style.opacity = '0';
      setTimeout(() => flash.remove(), 400);
    });

    try {
      // Snapshot
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('2D context unavailable');
      ctx.drawImage(video, 0, 0);

      const originalBlob = await canvasToBlob(canvas, 'image/jpeg', 1.0);

      const ts = Date.now();
      const originalPath = `originals/photo-${ts}.jpg`;
      const originalRef = storageRef(storage, originalPath);

      await uploadBytes(originalRef, originalBlob, { contentType: 'image/jpeg' });

      const urlOriginal = await getDownloadURL(originalRef);

      const auth = getAuth();
      const uid = auth.currentUser?.uid ?? 'anon';
      const userName = localStorage.getItem('name') ?? 'Invité';

      await dbPush(dbRef(db, 'photos'), {
        url: urlOriginal,
        storagePath: originalPath,
        createdAt: Date.now(),
        width: video.videoWidth,
        height: video.videoHeight,
        type: 'photo',
        originalUrl: urlOriginal,
        storagePaths: { original: originalPath },
        userAgent: navigator.userAgent,
        uid,
      });

      await sendMessage(`photo:${urlOriginal}`, { userId: uid, userName });

      alert('📸 Photo envoyée !');
    } catch (err: any) {
      console.error('❌ Erreur upload :', err);
      alert('Erreur lors de l’envoi : ' + (err?.message ?? err));
    } finally {
      setDisabled(false);
    }
  }, []);

  // ---- Générique : faire un GIF local
  type GifOptions = { captureMs: number; frames: number; gifDurationMs: number };

  const makeGif = useCallback(async ({ captureMs, frames, gifDurationMs }: GifOptions) => {
  const video = videoRef.current;
  const canvas = canvasRef.current;
  if (!video || !canvas) return;

  if (video.readyState < 2) {
    alert('📷 La caméra n’est pas encore prête !');
    return;
  }

  setMakingGif(true);
  setGifUrl(null);

  try {
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('2D context unavailable');

    const images: string[] = [];
    const targetWidth = 400;
    const ratio = targetWidth / video.videoWidth;
    const w = targetWidth;
    const h = Math.round(video.videoHeight * ratio);

    canvas.width = w;
    canvas.height = h;

    // temps entre chaque capture
    const delayPerFrameCaptureMs = captureMs / frames;

    for (let i = 0; i < frames; i++) {
      ctx.drawImage(video, 0, 0, w, h);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
      images.push(dataUrl);

      // eslint-disable-next-line no-await-in-loop
      await new Promise(resolve => setTimeout(resolve, delayPerFrameCaptureMs));
    }

    // temps d'affichage par frame dans le GIF
    const frameDisplayMs = gifDurationMs / frames;
    const intervalSeconds = frameDisplayMs / 1000;

    await new Promise<void>((resolve, reject) => {
      gifshot.createGIF(
        {
          images,
          interval: intervalSeconds, // durée par frame en secondes
          gifWidth: w,
          gifHeight: h,
        },
        (obj: any) => {
          if (obj.error) {
            console.error('Erreur GIF:', obj.errorMsg || obj.error);
            reject(new Error(obj.errorMsg || 'Erreur GIF'));
          } else {
            setGifUrl(obj.image); // dataURL du GIF
            resolve();
          }
        }
      );
    });
  } catch (err: any) {
    console.error('❌ Erreur création GIF :', err);
    alert('Erreur lors de la création du GIF : ' + (err?.message ?? err));
  } finally {
    setMakingGif(false);
  }
}, []);


  // ---- NEW : upload du GIF vers Storage /gif
  const uploadGif = useCallback(async () => {
    if (!gifUrl) {
      alert('Aucun GIF à envoyer. Crée-en un d’abord 🙂');
      return;
    }

    setUploadingGif(true);
    try {
      const blob = dataURLToBlob(gifUrl); // "image/gif"
      const ts = Date.now();
      const gifPath = `gif/gif-${ts}.gif`;
      const gifRef = storageRef(storage, gifPath);

      await uploadBytes(gifRef, blob, { contentType: 'image/gif' });
      const url = await getDownloadURL(gifRef);

      console.log('GIF uploadé :', gifPath, url);
      alert('🎞️ GIF uploadé dans Storage/gif !');
      // pour l’instant, on ne fait PAS de DB ni de chat
    } catch (err: any) {
      console.error('❌ Erreur upload GIF :', err);
      alert('Erreur lors de l’upload du GIF : ' + (err?.message ?? err));
    } finally {
      setUploadingGif(false);
    }
  }, [gifUrl]);

  return (
    <div>
      <video
        ref={videoRef}
        id="video"
        autoPlay
        playsInline
        muted
        style={{
          position: 'fixed',
          inset: 0,
          width: '100vw',
          height: '100vh',
          objectFit: 'cover',
          zIndex: 1,
          background: 'black',
        }}
      />
      <canvas ref={canvasRef} id="canvas" style={{ display: 'none' }} />

      {/* Bouton photo classique */}
      <button
        id="snap"
        onClick={onSnap}
        disabled={disabled}
        style={{
          position: 'fixed',
          left: '50%',
          transform: 'translateX(-50%)',
          bottom: 'max(1.2rem, env(safe-area-inset-bottom))',
          zIndex: 2,
          width: 'clamp(56px, 9vw, 72px)',
          height: 'clamp(56px, 9vw, 72px)',
          borderRadius: '50%',
          border: '2px solid #00fff0',
          background: 'rgba(0,0,0,0.35)',
          color: '#cfffff',
          fontSize: 'clamp(1.2rem, 3.6vw, 1.6rem)',
          display: 'grid',
          placeItems: 'center',
          boxShadow: '0 0 12px rgba(0,255,255,0.6), inset 0 0 12px rgba(0,255,255,0.25)',
          transition: 'transform .18s ease, box-shadow .25s ease, background .25s ease',
          WebkitTapHighlightColor: 'transparent',
          cursor: disabled ? 'not-allowed' : 'pointer',
        }}
        aria-label="Prendre une photo et l’envoyer"
      >
        {disabled ? '⏳' : '📤'}
      </button>

      {/* Boutons GIF 2s / 5s */}
      <button
        onClick={() => makeGif(GIF_PRESETS.short)}
        disabled={disabled || makingGif}
        style={{
          position: 'fixed',
          right: '1.5rem',
          bottom: 'max(1.2rem, env(safe-area-inset-bottom))',
          zIndex: 2,
          padding: '8px 14px',
          borderRadius: 999,
          border: '1px solid #00fff0',
          background: 'rgba(0,0,0,0.6)',
          color: '#cfffff',
          fontSize: '0.85rem',
          fontWeight: 600,
          boxShadow: '0 0 8px rgba(0,255,255,0.5)',
          cursor: disabled || makingGif ? 'not-allowed' : 'pointer',
          marginLeft: '0.5rem',
        }}
      >
        {makingGif ? 'GIF…' : GIF_PRESETS.short.label}
      </button>

      <button
        onClick={() => makeGif(GIF_PRESETS.long)}
        disabled={disabled || makingGif}
        style={{
          position: 'fixed',
          right: '1.5rem',
          bottom: 'calc(max(1.2rem, env(safe-area-inset-bottom)) + 2.7rem)',
          zIndex: 2,
          padding: '8px 14px',
          borderRadius: 999,
          border: '1px solid #00fff0',
          background: 'rgba(0,0,0,0.6)',
          color: '#cfffff',
          fontSize: '0.85rem',
          fontWeight: 600,
          boxShadow: '0 0 8px rgba(0,255,255,0.5)',
          cursor: disabled || makingGif ? 'not-allowed' : 'pointer',
          marginLeft: '0.5rem',
        }}
      >
        {makingGif ? 'GIF…' : GIF_PRESETS.long.label}
      </button>

      {/* Prévisualisation + upload GIF */}
      {gifUrl && (
        <div
          style={{
            position: 'fixed',
            top: '1rem',
            right: '1rem',
            zIndex: 3,
            background: 'rgba(0,0,0,0.7)',
            padding: '8px',
            borderRadius: 8,
            boxShadow: '0 0 12px rgba(0,0,0,0.6)',
          }}
        >
          <div style={{ color: '#cfffff', fontSize: 12, marginBottom: 4 }}>
            Prévisualisation GIF
          </div>
          <img
            src={gifUrl}
            alt="Prévisualisation GIF"
            style={{ maxWidth: '200px', borderRadius: 4, display: 'block', marginBottom: 6 }}
          />
          <button
            onClick={uploadGif}
            disabled={uploadingGif}
            style={{
              padding: '6px 10px',
              borderRadius: 6,
              border: '1px solid #00fff0',
              background: 'rgba(0,0,0,0.8)',
              color: '#cfffff',
              fontSize: 12,
              fontWeight: 600,
              cursor: uploadingGif ? 'not-allowed' : 'pointer',
            }}
          >
            {uploadingGif ? 'Envoi…' : 'Envoyer ce GIF'}
          </button>
        </div>
      )}
    </div>
  );
};

export default CameraSnapClassic;
