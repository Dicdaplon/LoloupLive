import React, { useEffect, useState } from "react";
import { storage } from "@/lib/firebase/databaseConfiguration";
import { ref as storageRef, list, getDownloadURL, deleteObject } from "firebase/storage";
import { Link } from 'react-router-dom';

export default function Gallery1() {
  const [images, setImages] = useState([]);
  const [selectedIdx, setSelectedIdx] = useState(null);
  const [nextPageToken, setNextPageToken] = useState(null);
  const [loading, setLoading] = useState(false);
  const IMAGES_PER_PAGE = 30;

  const fetchImages = async () => {
    if (loading) return;
    setLoading(true);
    const listRef = storageRef(storage, "compressed");
    try {
      const res = await list(listRef, { maxResults: IMAGES_PER_PAGE, pageToken: nextPageToken });
      const imgObjs = await Promise.all(
        res.items.map(async (itemRef) => ({
          url: await getDownloadURL(itemRef),
          path: itemRef.fullPath,
        }))
      );
      setImages(prev => [...prev, ...imgObjs]);
      setNextPageToken(res.nextPageToken || null);
    } catch (error) {
      console.error('Erreur chargement images:', error);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchImages();
  }, []);

  useEffect(() => {
    function onScroll() {
      if (loading || !nextPageToken) return;
      if (window.innerHeight + window.scrollY >= document.body.offsetHeight - 200) {
        fetchImages();
      }
    }
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, [loading, nextPageToken]);

  const handleDelete = async () => {
    const imgObj = images[selectedIdx];
    if (!imgObj) return;
    try {
      await deleteObject(storageRef(storage, imgObj.path));
      setImages(prev => prev.filter((_, i) => i !== selectedIdx));
      setSelectedIdx(null);
    } catch (error) {
      console.error('Erreur suppression:', error);
      alert('Erreur lors de la suppression');
    }
  };

  return (
    <>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 10, padding: 10,zIndex: 500 }}>
        {images.map((img, idx) => (
          <img
            key={img.url}
            src={img.url}
            alt={`Image ${idx}`}
            loading="lazy"
            style={{ width: '100%', borderRadius: 8, cursor: 'pointer',zIndex: 500 }}
            onClick={() => setSelectedIdx(idx)}
          />
        ))}
      </div>
      {loading && <div style={{ textAlign: "center", padding: 20 ,zIndex: 500}}>Chargement...</div>}
      {selectedIdx !== null && images[selectedIdx] && (
        <div
          onClick={() => setSelectedIdx(null)}
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.8)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 500,
            cursor: 'zoom-out',
            flexDirection: 'column',
          }}
        >
          <img
            src={images[selectedIdx].url}
            alt="Grand format"
            style={{ maxWidth: '90vw', maxHeight: '80vh', borderRadius: 12, boxShadow: '0 0 30px black', marginBottom: 20,zIndex: 500 }}
            onClick={e => e.stopPropagation()}
          />
          <button
            onClick={e => {
              e.stopPropagation();
              if (window.confirm("Supprimer cette photo ? Cette action est immédiate !")) {
                handleDelete();
              }
            }}
            style={{
              zIndex: 500,
              padding: '12px 24px',
              border: 0,
              borderRadius: 8,
              background: '#f44336',
              color: 'white',
              fontWeight: 600,
              fontSize: 18,
              cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
            }}
          >
            Supprimer cette photo
          </button>
           {/* Back button */}
      <Link to="/" id="navigation-overlay" aria-label="Retour à l’accueil">
        ⬅️
      </Link>
        </div>
        
      )}
    </>
  );
}
