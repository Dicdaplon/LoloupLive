import React, { useEffect, useState } from "react";
import { storage } from "@/lib/firebase/databaseConfiguration";
import {
  ref as storageRef,
  list,
  getDownloadURL,
  deleteObject,
} from "firebase/storage";
import { Link } from "react-router-dom";

type GalleryImage = {
  thumbUrl: string;
  fullUrl: string;
  thumbPath: string;
  fullPath: string;
};

export default function Gallery1() {
  const [images, setImages] = useState<GalleryImage[]>([]);
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const [nextPageToken, setNextPageToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const IMAGES_PER_PAGE = 30;

  const fetchImages = async () => {
    if (loading) return;
    setLoading(true);

    // 👉 On liste maintenant le dossier "thumb"
    const listRef = storageRef(storage, "thumb");

    try {
      const res = await list(listRef, {
        maxResults: IMAGES_PER_PAGE,
        pageToken: nextPageToken ?? undefined,
      });

      const imgObjs: GalleryImage[] = await Promise.all(
        res.items.map(async (itemRef) => {
          // thumb
          const thumbUrl = await getDownloadURL(itemRef);
          const thumbPath = itemRef.fullPath; // ex: "thumb/photo-123.jpg"

          // chemin de la version compressée correspondante
          const fullPath = thumbPath.replace(/^thumb\//, "compressed/");

          // on essaie de récupérer l'URL de la compressed,
          // sinon on retombe sur le thumb (au cas où).
          let fullUrl = thumbUrl;
          try {
            const fullRef = storageRef(storage, fullPath);
            fullUrl = await getDownloadURL(fullRef);
          } catch (e) {
            console.warn("Pas de version compressed pour", fullPath, e);
          }

          return {
            thumbUrl,
            fullUrl,
            thumbPath,
            fullPath,
          };
        })
      );

      setImages((prev) => [...prev, ...imgObjs]);
      setNextPageToken(res.nextPageToken || null);
    } catch (error) {
      console.error("Erreur chargement images:", error);
    }

    setLoading(false);
  };

  useEffect(() => {
    fetchImages();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    function onScroll() {
      if (loading || !nextPageToken) return;
      if (
        window.innerHeight + window.scrollY >=
        document.body.offsetHeight - 200
      ) {
        fetchImages();
      }
    }
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, [loading, nextPageToken]);

  const handleDelete = async () => {
    if (selectedIdx === null) return;
    const imgObj = images[selectedIdx];
    if (!imgObj) return;

    try {
      // On supprime d'abord le thumb
      await deleteObject(storageRef(storage, imgObj.thumbPath));

      // Puis on tente de supprimer la compressed correspondante
      try {
        await deleteObject(storageRef(storage, imgObj.fullPath));
      } catch (e) {
        console.warn("Impossible de supprimer la version compressed:", e);
      }

      setImages((prev) => prev.filter((_, i) => i !== selectedIdx));
      setSelectedIdx(null);
    } catch (error) {
      console.error("Erreur suppression:", error);
      alert("Erreur lors de la suppression");
    }
  };

  return (
    <>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))",
          gap: 10,
          padding: 10,
          zIndex: 500,
        }}
      >
        {images.map((img, idx) => (
          <img
            key={img.thumbPath}
            src={img.thumbUrl} // 👉 miniatures = thumb
            alt={`Image ${idx}`}
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

      {selectedIdx !== null && images[selectedIdx] && (
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
            src={images[selectedIdx].fullUrl} // 👉 grand format = compressed
            alt="Grand format"
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
                  "Supprimer cette photo ? Cette action est immédiate !"
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
            }}
          >
            Supprimer cette photo
          </button>

          <Link to="/" id="navigation-overlay" aria-label="Retour à l’accueil">
            ⬅️
          </Link>
        </div>
      )}
    </>
  );
}
