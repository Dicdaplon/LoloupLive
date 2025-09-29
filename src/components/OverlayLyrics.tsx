// EdgePeekActions.tsx
import * as Dialog from "@radix-ui/react-dialog";
import { useCallback } from "react";
import { useNavigate } from "react-router-dom";
import "../assets/css/overlay.css";
import UploadLyricsRTDB from "../pages/UploadLyrics"


export default function OverlayLyrics() {
    const navigate = useNavigate();
  const onAction = useCallback((which: "A" | "B" | "C") => {
    console.log("Action", which);
  }, []);

  return (
    <Dialog.Root>
      <Dialog.Trigger className="edge-trigger" aria-label="Ouvrir le menu d’actions">
        <span aria-hidden>❯</span>
      </Dialog.Trigger>

      <Dialog.Portal>
        <Dialog.Overlay className="edge-overlay" />
        <Dialog.Content className="edge-drawer" aria-describedby={undefined}>
          <Dialog.Title className="sr-only">Action !</Dialog.Title>
          <div className="edge-actions">
            <Dialog.Close asChild>
              <button
                className="edge-btn"
                onClick={() => navigate("/uploadLyrics")} 
              >
                Ajouter Paroles
              </button>
            </Dialog.Close>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
