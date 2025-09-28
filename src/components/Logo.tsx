import React, { useEffect, useRef, useState } from "react";
import logoUrl from "../../public/HDexportLogo.png";

type Props = {
  className?: string;
  auto?: boolean;             // auto-déclenchement périodique
  intervalMs?: number;        // période auto
  messageCooldownMs?: number; // cooldown entre deux messages
  srcUrl?: string;            // chemin custom si besoin
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
  const resolvedSrc = srcUrl ?? logoUrl;

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

    // 1) Récupérer la position du logo
    const rect = logoEl.getBoundingClientRect();

    // 2) Animation shake via ta classe CSS existante
    logoEl.classList.add("shake");
    window.setTimeout(() => logoEl.classList.remove("shake"), 600);

    // 3) Bulle d’info (positionnée en viewport)
    const random = DEFAULT_MESSAGES[Math.floor(Math.random() * DEFAULT_MESSAGES.length)];
    const div = document.createElement("div");
    div.className = "floating-message-loloup";
    div.style.position = "fixed";
    // neutralise la règle transform: translate(-50%,-50%) présente dans ton CSS
    div.style.transform = "none";
    div.innerText = random;

    document.body.appendChild(div);
    window.setTimeout(() => div.classList.add("fade-out"), 4000);
    window.setTimeout(() => div.remove(), 6000);
  };

  // Déclenchement auto
  useEffect(() => {
    showMessage(); // au mount
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
  }, [auto, intervalMs]);

  return ok ? (
    <img
      ref={imgRef}
      id="logo"                 // ← stylé par ton style.css (media queries portrait/paysage, glow, etc.)
      className={className}
      src={resolvedSrc}
      alt="Logo Loloup"
      onClick={showMessage}
      onError={() => setOk(false)}
      draggable={false}
    />
  ) : (
    <div id="logo" className={`logo-placeholder ${className}`}>
      logo introuvable
    </div>
  );
};

export default Logo;
