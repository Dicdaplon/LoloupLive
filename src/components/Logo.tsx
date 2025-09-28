import React, { useEffect, useRef, useState } from "react";
import logoUrl from "../../public/HDexportLogo.png";

type Props = {
  size?: number;
  zIndex?: number;
  className?: string;
  auto?: boolean;            // auto déclenchement périodique
  intervalMs?: number;       // période auto
  messageCooldownMs?: number;// cooldown entre deux messages
  // Si tu préfères passer un chemin custom (sinon BASE_URL + data/HDexportLogo.png)
  srcUrl?: string;
};

const DEFAULT_MESSAGES = [
  "Ahouuuuuuu 🎵",
  "Loloup t'observe… 👀",
  "Qui a mangé\nmon capodastre ? 🐺",
  "Ceci est une\nrépétition générale\npour la pleine lune 🌕",
  "Wolf mode: ON 🔥",
  "Attention : ce logo\nmord (en rythme) 🎶",
  "Ceci n’est pas un chien",
  "il vaut mieux\ndire bonjour",
  "Nann valait mieux\ndire bonjour",
  "Le saviez-vous ?\nWonderwall est interdit\npar la convention de Genève",
  "Un accord de Wonderwall =\n5 minutes de punition",
  "Le saviez-vous ?\nLes guitaristes règlent leur\naccordage plus longtemps\nqu’ils ne jouent",
  "Le saviez-vous ?\nLes batteurs comptent\njusqu’à 4, mais pas plus",
  "Le saviez-vous ?\nLes bassistes existent\n(vraiment)",
  "Le saviez-vous ?\nPlus un musicien joue fort,\nplus il croit jouer juste",
  "Micro ouvert,\ndanger maximal",
  "Encore une intro\nde 3 minutes",
  "Le saviez-vous ?\nLes claviéristes ont\ntoujours trop de câbles",
  "Le saviez-vous ?\nUn harmoniciste peut\ncaler un blues même\npendant ton discours\nde mariage.",
  "Le saviez-vous ?\nUn violoniste accorde\nson instrument pendant\nles deux moitié\ndu concert.",
  "Le saviez-vous ?\nEn jazz, si tu reconnais\nle morceau, c’est que\nt’es trop carré.",
  "Le saviez-vous ?\nUn standard de jazz\ncommence au piano et\nfinit quand tout\nle monde est partis.",
  "Le saviez-vous ?\nLes rockeurs considèrent que\n“laver ses cheveux” est un acte bourgeois.",
  "Le saviez-vous ?\nTout rockeur a déjà cassé\nune guitare sur scène,\nmême si c’était juste\nune guitare Décathlon.",
  "Le saviez-vous ?\nUn rockeur ne vieillit pas,\nil jaunit comme une vieille\npochette vinyle.",
  "Le saviez-vous ?\nUn metalleux peut survivre\nun mois avec trois bières,\nun paquet de Monster Munch\net un T-shirt de Motörhead.",
  "Le saviez-vous ?\nEn Metal, plus le logo d’un groupe\nest illisible, plus il est “true”.",
  "Le saviez-vous ?\nLes metalleux hibernent\nde novembre à juin,\npuis migrent tous au Hellfest.",
  "Le saviez-vous ?\nLes jazzmen peuvent improviser\nun solo sur le bip\nde la caisse enregistreuse.",
  "Le saviez-vous ?\nQuand un jazzman est à l’heure,\nc’est qu’il est en avance\nde trois mesures.",
  "Le saviez-vous ?\nLes jazzmen appellent “standard”\nun morceau que personne\nne connaît.",
  "Le saviez-vous ?\nUn concert de jazz peut durer\n3 heures et contenir\n2 chansons.",
  "Le saviez-vous ?\nUn bluesman a toujours l’air\nd’avoir raté son bus,\nsa vie et son mariage…\ndans cet ordre.",
  "Le saviez-vous ?\nLes bluesmen transforment\nn’importe quelle météo\nen “ciel triste”.",
  "Le saviez-vous ?\nChaque chanson de blues parle\nsoit d’une femme partie,\nsoit d’un chien mort,\nparfois des deux.",
  "Le saviez-vous ?\nLes musiciens funk peuvent porter\nplus de paillettes qu’un sapin\nde Noël sous acide.",
  "Le saviez-vous ?\nLe funk ne se joue pas :\nil se transpire.",
  "Le saviez-vous ?\nLes musiciens funk ne vieillissent pas,\nils s’évaporent en vapeur de sueur\nparfumée au patchouli.",
  "Le saviez-vous ?\nDans la chanson française,\nla pluie est un personnage principal.",
  "Le saviez-vous ?\nLes textes de chanson française\nsont si poétiques que personne\nne sait vraiment de quoi ils parlent.",
  "Le saviez-vous ?\nUn chanteur français ne respire pas :\nil soupire en rimes.",
  "Il n’y a pas de fausses notes !\n… seulement des notes mal placées,\nmal choisies et qui n’ont rien à faire là.",
  "Le saviez-vous ?\nUne arythmie n’est pas\nune nuance de jeu.\nVeuillez consulter.",
  "Today is *not* gonna be the day.\nArrêtez ça tout de suite.",
  "Le premier qui crie\nROOOOOXanne entre\nsur ma liste rouge.",
  "Le saviez-vous ?\nLes bassistes à 5 cordes sont\ndes guitaristes qui n’ont pas\nréussi à se racheter un jeu.",
  "La batterie, c’est facile :\nil suffit de taper…\nmais au bon endroit,\nau bon moment,\net pas trop fort.",
  "Le métronome n’est pas votre ennemi…\nle batteur peut le devenir.",
  "La basse à 4 cordes, c’est classique.\nÀ 5, c’est suspect.\nÀ 6, c’est un aveu.",
  "Le saviez-vous ?\nLe silence est aussi une note.\nLa préférée des voisins.",
  "Les pianistes comptent toujours\nsur leurs dix doigts.\nLes autres, sur la chance."
];

const Logo: React.FC<Props> = ({
  size = 250,
  zIndex = 9,
  className = "",
  auto = true,
  intervalMs = 30_000,
  messageCooldownMs = 4_000,
  srcUrl,
}) => {
  const imgRef = useRef<HTMLImageElement | null>(null);
  const [ok, setOk] = useState(true);
  const lastClickRef = useRef(0);
  const timerRef = useRef<number | null>(null);

  const resolvedSrc = srcUrl ?? (logoUrl);

  // Styles + animations nécessaires (shake, fade-out, conteneur message)
  const styles: React.CSSProperties = {
    position: "fixed",
    left: "0vw",
    top: "18vw",
    width: size*3,
    height: "auto",
    zIndex,
    cursor: "pointer",
    userSelect: "none",
    pointerEvents: "auto",
    filter: "drop-shadow(0 0 8px rgba(0,240,255,.6))",
  };

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        window.clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, []);

const showMessage = () => {
  const now = Date.now();
  if (now - lastClickRef.current < messageCooldownMs) return;
  lastClickRef.current = now;

  const logoEl = imgRef.current;
  if (!logoEl) return;

  // 1) LIRE LA POSITION AVANT d'ajouter la classe shake
  const rect = logoEl.getBoundingClientRect();

  // 2) Shake (après)
  logoEl.classList.add("loloup-shake");
  setTimeout(() => logoEl.classList.remove("loloup-shake"), 2000);

  // 3) Crée la bulle à une position FIXE (viewport) -> pas de scrollX/scrollY
  const random = DEFAULT_MESSAGES[Math.floor(Math.random() * DEFAULT_MESSAGES.length)];
  const div = document.createElement("div");
  div.className = "floating-message-loloup";
  div.style.position = "fixed";                        // 👈 FIXED, pas absolute
  div.style.left = rect.left + rect.width + "px";     // viewport coords
  div.style.top  = rect.top + rect.height / 3 + "px"; // viewport coords
  div.innerText = random;

  document.body.appendChild(div);

  // fade + remove
  setTimeout(() => div.classList.add("fade-out"), 4000);
  setTimeout(() => div.remove(), 6000);
};

  // Auto show
  useEffect(() => {
    // première fois au mount
    showMessage();
    if (!auto) return;
    timerRef.current = window.setInterval(() => {
      if (!document.hidden) showMessage();
    }, intervalMs);
    return () => {
      if (timerRef.current) {
        window.clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auto, intervalMs]); // volontairement pas dépendant de showMessage

  return (
    <>
      {/* Styles locaux pour animations + bulle */}
     <style>{`
  @keyframes shakeKey {
    0% { transform: translate(0,0) rotate(0deg); }
    20% { transform: translate(1px,-1px) rotate(-1deg); }
    40% { transform: translate(-1px,1px) rotate(1deg); }
    60% { transform: translate(1px,1px) rotate(0deg); }
    80% { transform: translate(-1px,-1px) rotate(1deg); }
    100% { transform: translate(0,0) rotate(0deg); }
  }
  .loloup-shake {
    animation: shakeKey 0.4s ease-in-out 0s 5;
  }

  /* 🔧 FIX: position fixed + pas de scale */
  .floating-message-loloup {
    position: fixed;                 /* <- fixe dans le viewport */
    max-width: 280px;
    white-space: pre-wrap;
    line-height: 1.15;
    z-index: 9999;
    padding: 10px 12px;
    border-radius: 12px;
    font-family: "Baloo 2", system-ui, sans-serif;
    font-size: 14px;
    color: #ffffffff;
    background: rgba(255, 255, 255, 0.02);
    box-shadow: 0 8px 30px rgba(0,0,0,0.25), 0 0 24px rgba(0, 238, 255, 1);
    backdrop-filter: blur(2px);
    transform: translate3d(0,0,0);  /* <- stabilise le rendu */
    will-change: opacity;           /* <- on n'anime plus transform */
    opacity: 0;                     /* <- fade-in */
    animation: msgFadeIn 180ms ease-out forwards;
  }
  .floating-message-loloup::before {
    content: "";
    position: absolute;
    left: -8px; top: 14px;
    width: 0; height: 0;
    border-top: 8px solid transparent;
    border-bottom: 8px solid transparent;
    border-right: 8px solid rgba(255,255,255,0.92);
    filter: drop-shadow(0 0 10px rgba(0,240,255,0.4));
  }
  @keyframes msgFadeIn { from { opacity: 0 } to { opacity: 1 } }

  .floating-message-loloup.fade-out {
    transition: opacity 1000ms ease;
    opacity: 0;
  }
`}</style>

      {ok ? (
        <img
          ref={imgRef}
          src={resolvedSrc}
          alt="Logo Loloup"
          style={styles}
          onClick={showMessage}
          onError={() => setOk(false)}
          draggable={false}
        />
      ) : (
        <div
          style={{
            ...styles,
            width: size,
            height: size,
            background: "rgba(255,255,255,.1)",
            border: "1px dashed rgba(255,255,255,.3)",
            display: "grid",
            placeItems: "center",
            color: "#fff",
            fontSize: 12,
          }}
        >
          logo introuvable
        </div>
      )}
    </>
  );
};

export default Logo;
