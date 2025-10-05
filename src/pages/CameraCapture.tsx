// src/components/CameraSnapClassic.tsx
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { storage, db } from '@/lib/firebase/databaseConfiguration';
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import { ref as dbRef, push as dbPush } from 'firebase/database';

/**
 * Resolver utile seulement pour LECTURE de valeurs legacy (gs://, /o?name=…).
 * Ici on n’en a pas besoin dans le flux d’upload (on stocke directement les URLs signées).
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

const CameraSnapClassic: React.FC = () => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [disabled, setDisabled] = useState(false);

  // ---- Démarrage caméra (avec fallback)
  const startCamera = useCallback(async () => {
    const video = videoRef.current;
    if (!video) return;

    const tryStart = async (constraints: MediaStreamConstraints) => {
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      video.srcObject = stream;
      (video as any).playsInline = true; // iOS
      video.muted = true;                // iOS autoplay
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

  // ---- Capture + upload + push DB (URLs signées seulement)
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

      const [originalBlob, compressedBlob] = await Promise.all([
        canvasToBlob(canvas, 'image/jpeg', 1.0),
        createCompressedBlobFromCanvas(canvas, 0.6, 1000),
      ]);

      const ts = Date.now();
      const originalRef = storageRef(storage, `originals/photo-${ts}.jpg`);
      const compressedRef = storageRef(storage, `compressed/photo-${ts}.jpg`);

      // Uploads (le SDK gère les métadonnées + type)
      await Promise.all([
        uploadBytes(originalRef, originalBlob, { contentType: 'image/jpeg' }),
        uploadBytes(compressedRef, compressedBlob, { contentType: 'image/jpeg' }),
      ]);

      // URLs signées (tokenisées) — à utiliser telles quelles dans <img src="...">
      const [urlOriginal, urlCompressed] = await Promise.all([
        getDownloadURL(originalRef),
        getDownloadURL(compressedRef),
      ]);

      // Un seul push DB, propre + rétro-compat 'text:photo:<url>'
      await dbPush(dbRef(db, 'messages'), {
        type: 'photo',
        originalUrl: urlOriginal,
        compressedUrl: urlCompressed,
        text: 'photo:' + urlCompressed,
        createdAt: ts,
      });

      alert('📸 Photo envoyée !');
    } catch (err: any) {
      console.error('❌ Erreur upload :', err);
      alert('Erreur lors de l’envoi : ' + (err?.message ?? err));
    } finally {
      setDisabled(false);
    }
  }, []);

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
    </div>
  );
};

export default CameraSnapClassic;
