import React, { useEffect, useRef } from "react";
import * as THREE from "three";

type KeyMap = Record<string, boolean>;

export default function ThreeTest() {
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // --- Base
    const W = containerRef.current.clientWidth;
    const H = containerRef.current.clientHeight;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0b0f1a);

    const camera = new THREE.PerspectiveCamera(60, W / H, 0.1, 400);
    camera.position.set(0, 3, 8);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(W, H);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    containerRef.current.appendChild(renderer.domElement);

    // --- Lights
    scene.add(new THREE.AmbientLight(0xffffff, 0.5));
    const dir = new THREE.DirectionalLight(0xffffff, 1);
    dir.position.set(6, 10, 4);
    scene.add(dir);

    // --- Player (cube)
    const player = new THREE.Mesh(
      new THREE.BoxGeometry(1, 1, 1),
      new THREE.MeshStandardMaterial({ color: 0x5e86ff, metalness: 0.2, roughness: 0.4 })
    );
    player.position.set(0, 1, 0);
    scene.add(player);

    // Ombre simple
    const shadow = new THREE.Mesh(
      new THREE.CircleGeometry(0.7, 32),
      new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.25 })
    );
    shadow.rotation.x = -Math.PI / 2;
    scene.add(shadow);

    // --- Route défilante (segments recyclés)
    const ROAD_WIDTH = 6;
    const SEG_LEN = 30;          // longueur d’un segment
    const SEG_COUNT = 7;         // nb de segments visibles
    const WIDTH_SEG = 16;        // subdivision latérale
    const LEN_SEG = 80;          // subdivision longitudinale (bosses fines)
    const roadSegments: {
      mesh: THREE.Mesh;
      geo: THREE.PlaneGeometry;
      posAttr: THREE.BufferAttribute;
      base: Float32Array;
    }[] = [];

    const roadMat = new THREE.MeshStandardMaterial({
      color: 0x1d2a3a,
      metalness: 0.15,
      roughness: 0.6,
      side: THREE.DoubleSide,
      flatShading: true, // relief plus marqué
    });

    for (let i = 0; i < SEG_COUNT; i++) {
      const geo = new THREE.PlaneGeometry(ROAD_WIDTH, SEG_LEN, WIDTH_SEG, LEN_SEG);
      const mesh = new THREE.Mesh(geo, roadMat);
      mesh.rotation.x = -Math.PI / 2;
      // Empilement vers l’avant (z négatif = devant)
      mesh.position.set(0, 0, -i * SEG_LEN);
      scene.add(mesh);

      const posAttr = geo.attributes.position as THREE.BufferAttribute;
      const base = posAttr.array.slice(0) as Float32Array;
      roadSegments.push({ mesh, geo, posAttr, base });
    }

    // --- “Eau” / décor autour (grands plans plats)
    const sideMat = new THREE.MeshStandardMaterial({
      color: 0x0e2233,
      metalness: 0.1,
      roughness: 0.9,
      side: THREE.DoubleSide,
    });
    const makeSide = (x: number) => {
      const g = new THREE.PlaneGeometry(80, SEG_LEN * SEG_COUNT, 1, 1);
      const m = new THREE.Mesh(g, sideMat);
      m.rotation.x = -Math.PI / 2;
      m.position.set(x, -0.01, -SEG_LEN * (SEG_COUNT - 1) * 0.5);
      scene.add(m);
    };
    makeSide(+ROAD_WIDTH * 0.75 + 20);
    makeSide(-ROAD_WIDTH * 0.75 - 20);

    // --- Vagues (déformation)
    let time = 0;
    const AMP = 1.2;        // amplitude bosses
    const KX = 1.2;         // fréquence latérale
    const KZ = 0.65;        // fréquence longitudinale
    const SPEED_PHASE = 1.6; // vitesse d’animation des vagues

    function waveHeight(x: number, z: number, t: number) {
      // z local (segment) + défilement global géré ailleurs
      return (
        AMP *
        Math.sin(KX * x + 0.5 * Math.sin(0.4 * x + t * 0.7)) *
        Math.cos(KZ * z + t * SPEED_PHASE)
      );
    }

    function updateSegmentHeights(seg: typeof roadSegments[number], zOffset: number, t: number) {
      const arr = seg.posAttr.array as Float32Array;
      for (let i = 0; i < seg.posAttr.count; i++) {
        const ix = i * 3;
        const x = seg.base[ix + 0];           // x local
        const z = seg.base[ix + 2] + zOffset; // z local + offset de défilement
        arr[ix + 1] = waveHeight(x, z, t);    // y
      }
      seg.posAttr.needsUpdate = true;
      seg.geo.computeVertexNormals();
    }

    // --- Contrôles
    const keys: KeyMap = {};
    const onKeyDown = (e: KeyboardEvent) => {
      if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key)) e.preventDefault();
      keys[e.key] = true;
    };
    const onKeyUp = (e: KeyboardEvent) => (keys[e.key] = false);
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);

    // --- Gameplay
    let speed = 8;              // vitesse de défilement (unités/s)
    const MIN_SPEED = 2;
    const MAX_SPEED = 22;
    const LATERAL_ACCEL = 25;
    const LATERAL_FRICTION = 10;
    const LATERAL_LIMIT = (ROAD_WIDTH * 0.5) - 0.6;

    const lateralVel = { x: 0 };

    // caméra suiveuse
    const camOffset = new THREE.Vector3(0, 3.2, 8.5);
    const camTarget = new THREE.Vector3();
    const lookAt = new THREE.Vector3();

    // --- Boucle
    const clock = new THREE.Clock();
    let rafId = 0;
    let scrollZ = 0; // combien la route a “défilé”

    const tick = () => {
      const dt = Math.min(0.033, clock.getDelta());
      time += dt;

      // Vitesse (haut/bas)
      if (keys["ArrowUp"]) speed = Math.min(MAX_SPEED, speed + 10 * dt);
      if (keys["ArrowDown"]) speed = Math.max(MIN_SPEED, speed - 10 * dt);

      // Défilement route
      scrollZ += speed * dt;

      // Recyclage segments + déformation
      for (let i = 0; i < roadSegments.length; i++) {
        const seg = roadSegments[i];
        // position du segment relative au scroll
        const baseZ = -i * SEG_LEN;
        const worldZ = baseZ + (scrollZ % SEG_LEN);
        seg.mesh.position.z = worldZ;

        // quand un segment dépasse la caméra (derrière), il repart devant automatiquement
        // (le modulo ci-dessus crée déjà un carrousel continu)

        // zOffset utilisé pour la déformation (continu, sans couture)
        const zOffset = (seg.mesh.position.z % SEG_LEN) + i * SEG_LEN - scrollZ;
        updateSegmentHeights(seg, zOffset, time);
      }

      // Mouvement latéral du joueur
      let ax = 0;
      if (keys["ArrowLeft"]) ax -= LATERAL_ACCEL;
      if (keys["ArrowRight"]) ax += LATERAL_ACCEL;
      lateralVel.x += ax * dt;
      lateralVel.x *= Math.max(0, 1 - LATERAL_FRICTION * dt);
      player.position.x = THREE.MathUtils.clamp(player.position.x + lateralVel.x * dt, -LATERAL_LIMIT, LATERAL_LIMIT);

      // Hauteur du joueur = surface de la route sous lui (z = 0 autour de la caméra)
      const h = waveHeight(player.position.x, 0, time);
      player.position.y = h + 0.5; // cube 1 de haut

      // Ombre sur la route
      shadow.position.set(player.position.x, h + 0.02, 0);

      // Caméra suit
      camTarget.set(0, 0, 0).add(camOffset); // route “défile”, le joueur reste proche de z=0
      camera.position.lerp(camTarget, 1 - Math.exp(-6 * dt));
      lookAt.lerp(player.position.clone().setZ(player.position.z - 4), 1 - Math.exp(-6 * dt));
      camera.lookAt(lookAt);

      renderer.render(scene, camera);
      rafId = requestAnimationFrame(tick);
    };
    tick();

    // --- Resize
    const onResize = () => {
      if (!containerRef.current) return;
      const w = containerRef.current.clientWidth;
      const h = containerRef.current.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    };
    window.addEventListener("resize", onResize);

    // --- Cleanup
    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      roadSegments.forEach(({ geo }) => geo.dispose());
      (roadMat as THREE.Material).dispose();
      (player.geometry as THREE.BufferGeometry).dispose();
      (player.material as THREE.Material).dispose();
      (shadow.geometry as THREE.BufferGeometry).dispose();
      (shadow.material as THREE.Material).dispose();
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, []);

  return (
    <div
      ref={containerRef}
      style={{ position: "fixed", inset: 0, width: "100vw", height: "100vh", overflow: "hidden", touchAction: "none" }}
    />
  );
}

