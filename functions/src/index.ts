import { onObjectFinalized } from "firebase-functions/storage";
import { initializeApp } from "firebase-admin/app";
import { getStorage } from "firebase-admin/storage";
import sharp from "sharp";
import * as os from "os";
import * as path from "path";
import * as fs from "fs";
import { onRequest } from "firebase-functions/v2/https";

initializeApp();

// =====================================================
// 1) Fonction déclenchée à chaque nouvel upload
// =====================================================
export const processImageOnUpload = onObjectFinalized(
  {
    region: "us-central1",
    bucket: "lolouptalk.firebasestorage.app",
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

      // Version compressée (max 1600px, qualité 80)
      await sharp(tempOriginal)
        .resize({ width: 1600, withoutEnlargement: true })
        .jpeg({ quality: 80 })
        .toFile(tempCompressed);

      console.log("Compressé :", tempCompressed);

      // Version miniature (carrée 400x400, qualité ~70 pour ~20–45 Ko)
      await sharp(tempOriginal)
        .resize({ width: 400, height: 400, fit: "cover", position: "centre" })
        .jpeg({ quality: 70 })
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

// =====================================================
// 2) Fonction batch : traiter toutes les images de originals/
// =====================================================
export const processAllOriginals = onRequest(
  {
    region: "us-central1",
    timeoutSeconds: 540, // jusqu'à 9 minutes si besoin
    memory: "1GiB",
  },
  async (req, res) => {
    const bucket = getStorage().bucket("lolouptalk.firebasestorage.app");

    console.log("→ Traitement global lancé…");

    // Liste tous les fichiers du dossier originals/
    const [files] = await bucket.getFiles({ prefix: "originals/" });

    let processed = 0;
    let skipped = 0;

    for (const file of files) {
      const filePath = file.name; // ex: originals/photo.jpg
      const fileName = filePath.split("/").pop();
      if (!fileName) continue;

      const compressedPath = `compressed/${fileName}`;
      const thumbPath = `thumb/${fileName}`;

      // Vérifie si les versions existent déjà
      const [compressedExists] = await bucket.file(compressedPath).exists();
      const [thumbExists] = await bucket.file(thumbPath).exists();

      if (compressedExists && thumbExists) {
        console.log(`→ SKIP: ${fileName} (déjà traité)`);
        skipped++;
        continue;
      }

      console.log(`→ Traitement de ${fileName}`);

      // Télécharger original temporairement
      const tempOriginal = path.join(os.tmpdir(), fileName);
      const tempCompressed = path.join(os.tmpdir(), "compressed-" + fileName);
      const tempThumb = path.join(os.tmpdir(), "thumb-" + fileName);

      await file.download({ destination: tempOriginal });

      // Récupère les métadonnées de l'original
      const [metadata] = await file.getMetadata();

      // Version compressée
      await sharp(tempOriginal)
        .resize({ width: 1600, withoutEnlargement: true })
        .jpeg({ quality: 80 })
        .toFile(tempCompressed);

      await bucket.upload(tempCompressed, {
        destination: compressedPath,
        metadata: {
          contentType: metadata.contentType,
          customMetadata: metadata.customMetadata,
        },
      });

      // Version thumb (carrée, un peu moins compressée)
      await sharp(tempOriginal)
        .resize({ width: 400, height: 400, fit: "cover", position: "centre" })
        .jpeg({ quality: 70 })
        .toFile(tempThumb);

      await bucket.upload(tempThumb, {
        destination: thumbPath,
        metadata: {
          contentType: metadata.contentType,
          customMetadata: metadata.customMetadata,
        },
      });

      // Nettoyage
      [tempOriginal, tempCompressed, tempThumb].forEach((p) => {
        if (fs.existsSync(p)) fs.unlinkSync(p);
      });

      processed++;
    }

    console.log("→ FIN DU BATCH !");
    console.log(`Traitée : ${processed}`);
    console.log(`Ignorée : ${skipped}`);

    res.send({
      status: "completed",
      processed,
      skipped,
    });
  }
);
