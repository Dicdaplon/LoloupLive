// src/components/CameraSnapClassic.tsx
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { storage, db } from '@/lib/firebase/databaseConfiguration';
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import { ref as dbRef, push as dbPush } from 'firebase/database';

/**
 * FIX CORS — Convertit n'importe quel chemin/URL Storage en URL signée via le SDK.
 * Accepte :
 *  - path "compressed/photo-xxx.jpg"
 *  - vieille URL REST ".../o?name=compressed%2Fphoto-xxx.jpg"
 *  - URL REST ".../o/compressed%2Fphoto-xxx.jpg"
 *  - gs://bucket/compressed/photo-xxx.jpg
 *  - déjà une URL signée (la laisse telle quelle)
 */
async function resolveStorageUrl(input: string): Promise<string> {
  if (!input) return '';

  // gs://bucket/path
  if (input.startsWith('gs://')) {
    const parts = input.replace('gs://', '').split('/');
    const path = parts.slice(1).join('/');
    return getDownloadURL(storageRef(storage, path));
  }

  // Essaie de parser comme URL
  try {
    const u = new URL(input);

    // Déjà une URL signée (alt=media & token) → OK
    if (u.hostname.includes('firebasestorage.googleapis.com') && u.searchParams.has('token')) {
      return input;
    }

    // Ancien format '?name=' → extraire le path et passer par SDK
    if (u.hostname.includes('firebasestorage.googleapis.com') && u.searchParams.has('name')) {
      const path = u.searchParams.get('name')!;
      return getDownloadURL(storageRef(storage, path));
    }

    // Format REST /o/<encodedPath> → décoder et passer par SDK
    const m = u.pathname.match(/\/o\/(.+)/);
    if (u.hostname.includes('firebasestorage.googleapis.com') && m) {
      const encoded = m[1].split('?')[0];
      const path = decodeURIComponent(encoded);
      return getDownloadURL(storageRef(storage, path));
    }

    // Autre domaine → ne rien faire
    return input;
  } catch {
    // Pas une URL → c'est probablement un path Storage
    return getDownloadURL(storageRef(storage, input));
  }
}

const CameraSnapClassic: React.FC = () => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [disabled, setDisabled] = useState(false);

  // —— Caméra avec fallback
  const startCamera = useCallback(async () => {
    const video = videoRef.current;
    if (!video) return;

    async function tryStart(constraints: MediaStreamConstraints) {
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      video.srcObject = stream;
      (video as any).playsInline = true; // iOS
      video.muted = true; // iOS autoplay
      await video.play().catch(() => {});
      video.onloadedmetadata = () => {
        // eslint-disable-next-line no-console
        console.log('🎥 Résolution :', video.videoWidth + 'x' + video.videoHeight);
      };
    }

    try {
      await tryStart({
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: false,
      });
    } catch (err: any) {
      console.warn('⚠️ HD non dispo, fallback :', err?.message ?? err);
      try {
        await tryStart({ video: true, audio: false });
      } catch (finalErr: any) {
        console.error('Erreur caméra :', finalErr);
        alert('Erreur d’accès caméra : ' + (finalErr?.message ?? finalErr));
      }
    }
  }, []);

  useEffect(() => {
    if (!('mediaDevices' in navigator) || !navigator.mediaDevices.getUserMedia) {
      alert('Cette plateforme ne supporte pas la caméra (getUserMedia).');
      return;
    }
    startCamera();

    return () => {
      const video = videoRef.current;
      const stream = video?.srcObject as MediaStream | null;
      stream?.getTracks().forEach((t) => t.stop());
      if (video) video.srcObject = null;
    };
  }, [startCamera]);

  // —— Helpers Blobs
  function canvasToBlob(
    canvas: HTMLCanvasElement,
    type: 'image/jpeg' | 'image/png' | 'image/webp' = 'image/jpeg',
    quality = 1.0
  ): Promise<Blob> {
    return new Promise((resolve, reject) =>
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('toBlob failed'))), type, quality)
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
        (blob) => (blob ? resolve(blob) : reject(new Error('toBlob failed'))),
        'image/jpeg',
        quality
      );
    });
  }

  // —— Capture + uploads + push DB
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
    flash.style.background = 'white';
    flash.style.opacity = '0.7';
    flash.style.zIndex = '9999';
    flash.style.transition = 'opacity 0.4s ease';
    document.body.appendChild(flash);
    requestAnimationFrame(() => {
      flash.style.opacity = '0';
      setTimeout(() => flash.remove(), 400);
    });

    try {
      // Dessine la frame vidéo dans le canvas (plein format)
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('2D context unavailable');
      ctx.drawImage(video, 0, 0);

      // Prépare les deux blobs
      const [originalBlob, compressedBlob] = await Promise.all([
        canvasToBlob(canvas, 'image/jpeg', 1.0), // original plein format
        createCompressedBlobFromCanvas(canvas, 0.6, 1000), // compressé
      ]);

      const ts = Date.now();
      const originalPath = `originals/photo-${ts}.jpg`;
      const compressedPath = `compressed/photo-${ts}.jpg`;
      const originalRef = storageRef(storage, originalPath);
      const compressedRef = storageRef(storage, compressedPath);

      // Uploads en parallèle
      await Promise.all([
        uploadBytes(originalRef, originalBlob),
        uploadBytes(compressedRef, compressedBlob),
      ]);

      // URL publique de la version compressée (déjà “safe”)
      const compressedUrlRaw = await getDownloadURL(compressedRef);

      // Par sécurité (et pour neutraliser toute future URL/chemin legacy), on passe par le resolver
      const compressedUrl = await resolveStorageUrl(compressedUrlRaw);

      // Push DB (comme avant)
      await dbPush(dbRef(db, 'messages'), {
        text: 'photo:' + compressedUrl,
        timestamp: Date.now(),
      });

      alert('📸 Photo envoyée ! Elle va s’afficher sur l’écran.');
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
        }}
      >
        {disabled ? '⏳' : '📤'}
      </button>
    </div>
  );
};

export default CameraSnapClassic;
