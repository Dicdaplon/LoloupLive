// src/components/GalleryGif.tsx
import React, { useEffect, useState } from "react";
import { storage } from "@/lib/firebase/databaseConfiguration";
import {
  ref as storageRef,
  list,
  getDownloadURL,
  deleteObject,
} from "firebase/storage";
import { Link } from "react-router-dom";

type GifItem = {
  url: string;
  path: string;
};

export default function GalleryGif() {
  const [gifs, setGifs] = useState<GifItem[]>([]);
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const [nextPageToken, setNextPageToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const GIFS_PER_PAGE = 30;

  const fetchGifs = async () => {
    if (loading) return;
    setLoading(true);

    // 👉 On liste le dossier "gif"
    const listRef = storageRef(storage, "gif");

    try {
      const res = await list(listRef, {
        maxResults: GIFS_PER_PAGE,
        pageToken: nextPageToken ?? undefined,
      });

      const gifObjs: GifItem[] = await Promise.all(
        res.items.map(async (itemRef) => ({
          url: await getDownloadURL(itemRef),
          path: itemRef.fullPath, // ex: "gif/gif-123456.gif"
        }))
      );

      setGifs((prev) => [...prev, ...gifObjs]);
      setNextPageToken(res.nextPageToken || null);
    } catch (error) {
      console.error("Erreur chargement GIFs:", error);
    }

    setLoading(false);
  };

  useEffect(() => {
    fetchGifs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    function onScroll() {
      if (loading || !nextPageToken) return;
      if (
        window.innerHeight + window.scrollY >=
        document.body.offsetHeight - 200
      ) {
        fetchGifs();
      }
    }
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, [loading, nextPageToken]);

  const handleDelete = async () => {
    if (selectedIdx === null) return;
    const gifObj = gifs[selectedIdx];
    if (!gifObj) return;

    try {
      await deleteObject(storageRef(storage, gifObj.path));

      setGifs((prev) => prev.filter((_, i) => i !== selectedIdx));
      setSelectedIdx(null);
    } catch (error) {
      console.error("Erreur suppression:", error);
      alert("Erreur lors de la suppression");
    }
  };

  return (
    <>
      {/* Grille de GIFs */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))",
          gap: 10,
          padding: 10,
          zIndex: 500,
        }}
      >
        {gifs.map((gif, idx) => (
          <img
            key={gif.path}
            src={gif.url}
            alt={`GIF ${idx}`}
            loading="lazy"
            style={{
              width: "100%",
              borderRadius: 8,
              cursor: "pointer",
              zIndex: 500,
            }}
            onClick={() => setSelectedIdx(idx)}
          />
        ))}
      </div>

      {loading && (
        <div style={{ textAlign: "center", padding: 20, zIndex: 500 }}>
          Chargement...
        </div>
      )}

      {/* Overlay plein écran pour un GIF */}
      {selectedIdx !== null && gifs[selectedIdx] && (
        <div
          onClick={() => setSelectedIdx(null)}
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(0,0,0,0.8)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 500,
            cursor: "zoom-out",
            flexDirection: "column",
          }}
        >
          <img
            src={gifs[selectedIdx].url}
            alt="GIF"
            style={{
              maxWidth: "90vw",
              maxHeight: "80vh",
              borderRadius: 12,
              boxShadow: "0 0 30px black",
              marginBottom: 20,
              zIndex: 500,
            }}
            onClick={(e) => e.stopPropagation()}
          />
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (
                window.confirm(
                  "Supprimer ce GIF ? Cette action est immédiate !"
                )
              ) {
                handleDelete();
              }
            }}
            style={{
              zIndex: 500,
              padding: "12px 24px",
              border: 0,
              borderRadius: 8,
              background: "#f44336",
              color: "white",
              fontWeight: 600,
              fontSize: 18,
              cursor: "pointer",
              boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
              marginBottom: 12,
            }}
          >
            Supprimer ce GIF
          </button>

          <Link to="/" id="navigation-overlay" aria-label="Retour à l’accueil">
            ⬅️
          </Link>
        </div>
      )}
    </>
  );
}
