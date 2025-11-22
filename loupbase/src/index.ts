import { onObjectFinalized } from "firebase-functions/storage";
import { initializeApp } from "firebase-admin/app";
import { getStorage } from "firebase-admin/storage";
import sharp from "sharp";
import * as os from "os";
import * as path from "path";
import * as fs from "fs";

initializeApp();

export const processImageOnUpload = onObjectFinalized(
  {
    region: "us-central1",
    bucket: "lolouptalk.firebasestorage.app"
  },
  async (event) => {
    const fileBucket = event.data.bucket;        // nom du bucket
    const filePath = event.data.name || "";      // chemin du fichier dans le bucket
    const contentType = event.data.contentType || "";

    console.log("Nouveau fichier :", filePath, contentType);

    // 1) On ne traite que les images
    if (!contentType.startsWith("image/")) {
      console.log("Pas une image → ignoré");
      return;
    }

    // 2) On ne traite que le dossier "originals/"
    if (!filePath.startsWith("originals/")) {
      console.log("Fichier hors de originals/ → ignoré");
      return;
    }

    const fileName = path.basename(filePath);

    // Fichiers temporaires
    const tempOriginal = path.join(os.tmpdir(), fileName);
    const tempCompressed = path.join(os.tmpdir(), "compressed-" + fileName);
    const tempThumb = path.join(os.tmpdir(), "thumb-" + fileName);

    // Chemins finaux dans Storage
    const compressedPath = `compressed/${fileName}`;
    const thumbPath = `thumb/${fileName}`;

    const bucket = getStorage().bucket(fileBucket);

    try {
      // Télécharger l’original
      await bucket.file(filePath).download({ destination: tempOriginal });
      console.log("Téléchargé :", tempOriginal);

      // Version compressée
      await sharp(tempOriginal)
        .resize({ width: 1600, withoutEnlargement: true })
        .jpeg({ quality: 80 })
        .toFile(tempCompressed);

      console.log("Compressé :", tempCompressed);

      // Version miniature
      await sharp(tempOriginal)
        .resize({ width: 400, height: 400, fit: "cover" })
        .jpeg({ quality: 50 })
        .toFile(tempThumb);

      console.log("Thumb :", tempThumb);

      // Upload vers Storage
      await bucket.upload(tempCompressed, {
        destination: compressedPath,
        metadata: { contentType },
      });

      await bucket.upload(tempThumb, {
        destination: thumbPath,
        metadata: { contentType },
      });

      console.log("Upload OK →", compressedPath, thumbPath);

    } catch (err) {
      console.error("Erreur :", err);

    } finally {
      // Nettoyage des fichiers temporaires
      [tempOriginal, tempCompressed, tempThumb].forEach((p) => {
        if (fs.existsSync(p)) fs.unlinkSync(p);
      });
    }
  }
);
