import React, { useEffect, useRef } from "react";
import p5 from "p5";
import { useNavigate } from "react-router-dom";

// ✅ Import ESM depuis /src (PAS depuis /public)
import cameraUrl from "../assets/image/Photo.png";

const AccueilSketch: React.FC = () => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const p5Ref = useRef<p5 | null>(null);
  const startedRef = useRef(false); // évite double instanciation en dev

  // React Router navigate
  const navigate = useNavigate();
  const navigateRef = useRef(navigate);
  useEffect(() => {
    navigateRef.current = navigate;
  }, [navigate]);

  useEffect(() => {
    if (!containerRef.current) return;
    if (startedRef.current) return;
    startedRef.current = true;

    const sketch = (p: p5) => {
      class CircleButton {
        baseSize = 100;
        pulse = p.random(p.TWO_PI);
        constructor(
          public label: string,
          public link: string,
          public x: number,
          public y: number,
          public c: p5.Color
        ) {}
        update() {
          this.pulse += 0.05;
        }
        display() {
          const size = this.baseSize + p.sin(this.pulse) * 10;
          p.push();
          p.noStroke();
          for (let i = 8; i >= 1; i--) {
            p.fill(p.red(this.c), p.green(this.c), p.blue(this.c), 8);
            p.ellipse(
              this.x + p.random(-0.5, 0.5),
              this.y + p.random(-0.5, 0.5),
              size + i * 6
            );
          }
          p.pop();

          p.push();
          p.noStroke();
          p.fill(255, 0, 0, 100);
          p.ellipse(this.x + 2, this.y - 1, size);
          p.fill(0, 255, 255, 100);
          p.ellipse(this.x - 2, this.y + 1, size);
          p.pop();

          p.fill(this.c);
          p.ellipse(this.x, this.y, size);

          // --- Texte bouton ---
          p.push();
          p.textFont("Baloo 2");
          p.textSize(18);
          p.textStyle(p.BOLD);
          p.fill(0, 0, 0, 180);
          p.text(this.label, this.x + 2, this.y + 2);
          p.fill(255);
          p.text(this.label, this.x, this.y);
          p.pop();
        }
        isHovered(px: number, py: number) {
          const size = this.baseSize + p.sin(this.pulse) * 10;
          return p.dist(px, py, this.x, this.y) < size / 2;
        }
      }

      class MinorButton {
        baseSize = 60;
        pulse = p.random(p.TWO_PI);
        constructor(
          public label: string,
          public link: string,
          public x: number,
          public y: number,
          public c: p5.Color
        ) {}
        update() {
          this.pulse += 0.05;
        }
        display() {
          const size = this.baseSize + p.sin(this.pulse) * 5;
          const jx = p.random(-0.8, 0.8),
            jy = p.random(-0.8, 0.8);

          p.push();
          p.noFill();
          p.strokeWeight(1.5);
          for (let i = 3; i >= 1; i--) {
            p.stroke(p.red(this.c), p.green(this.c), p.blue(this.c), 10 * i);
            p.ellipse(this.x + jx, this.y + jy, size + i * 6);
          }
          p.pop();

          p.push();
          p.stroke(this.c);
          p.strokeWeight(1.5);
          p.noFill();
          p.ellipse(this.x, this.y, size);
          p.pop();

          if (cameraIcon) {
            p.push();
            p.imageMode(p.CENTER);
            p.image(cameraIcon, this.x, this.y, size * 0.9, size * 0.9);
            p.pop();
          }
        }
        isHovered(px: number, py: number) {
          const size = this.baseSize + p.sin(this.pulse) * 10;
          return p.dist(px, py, this.x, this.y) < size / 2;
        }
      }

      let buttons: Array<CircleButton | MinorButton> = [];
      let cameraIcon: p5.Image | null = null;
      let ready = false;

      function repositionButtons() {
        const isPortrait = p.height > p.width;
        if (buttons.length !== 5) return;
        if (!isPortrait) {
          buttons[0].x = p.width * 0.25;
          buttons[0].y = p.height / 2;
          buttons[1].x = p.width * 0.41;
          buttons[1].y = p.height / 2;
          buttons[2].x = p.width * 0.57;
          buttons[2].y = p.height / 2;
          buttons[3].x = p.width * 0.73;
          buttons[3].y = p.height / 2;
          buttons[4].x = p.width * 0.88;
          buttons[4].y = p.height / 1.4;
        } else {
          buttons[0].x = p.width / 2;
          buttons[0].y = p.height * 0.35;
          buttons[1].x = p.width / 2;
          buttons[1].y = p.height * 0.51;
          buttons[2].x = p.width / 2;
          buttons[2].y = p.height * 0.67;
          buttons[3].x = p.width / 2;
          buttons[3].y = p.height * 0.83;
          buttons[4].x = p.width * 0.83;
          buttons[4].y = p.height / 1.69;
        }
      }

      p.setup = () => {
        const canvas = p.createCanvas(p.windowWidth, p.windowHeight);
        (canvas.elt as HTMLCanvasElement).setAttribute("data-homebuttons", "1");

        canvas.style("z-index", "5");
        canvas.style("position", "fixed");
        canvas.style("top", "0");
        canvas.style("left", "0");
        canvas.style("pointer-events", "auto");
        if (containerRef.current) canvas.parent(containerRef.current);

        p.noStroke();
        p.textAlign(p.CENTER, p.CENTER);
        p.textSize(36);
        p.textFont("Baloo 2");
        p.textStyle(p.BOLD);

        p.loadImage(
          cameraUrl,
          (img) => {
            cameraIcon = img;
          },
          () => {
            console.warn("[HomeButtons] camera icon failed to load:", cameraUrl);
          }
        );

        buttons = [
          new CircleButton("Grilles", "/grilles", p.width * 0.3, p.height / 2, p.color("#FF5F9E")),
          new CircleButton("Paroles", "/paroles", p.width * 0.5, p.height / 2, p.color("#00F0FF")),
          new CircleButton("Tabs", "/tabs", p.width * 0.5, p.height / 2, p.color("#c353daff")),
          new CircleButton("Infos", "/info", p.width * 0.7, p.height / 2, p.color("#FFF275")),
          new MinorButton("Photo !", "/camera", p.width * 0.9, p.height / 1.4, p.color("#B388EB")),
        ];

        repositionButtons();
        ready = true;
      };

      p.draw = () => {
        p.clear();
        if (!ready) {
          p.fill(255);
          p.text("Chargement…", p.width / 2, p.height / 2);
          return;
        }

        // --- Titre ---
        p.push();
        p.textFont("Baloo 2");
        p.textSize(36);
        p.textStyle(p.BOLD);
        p.fill(0, 0, 0, 180);
        p.text("Loloup LIVE", p.width / 2 + 2, 34);
        p.fill(255);
        p.text("Loloup LIVE", p.width / 2, 32);
        p.pop();

        for (const b of buttons) {
          b.update();
          b.display();
        }
      };

      p.mousePressed = () => {
        if (!ready) return;
        for (const b of buttons) {
          if (b.isHovered(p.mouseX, p.mouseY)) {
            if (b.link.startsWith("/")) {
              navigateRef.current(b.link);
            } else {
              window.location.href = b.link;
            }
            return;
          }
        }
      };

      p.windowResized = () => {
        p.resizeCanvas(p.windowWidth, p.windowHeight);
        if (ready) repositionButtons();
      };

      const onOrient = () => {
        setTimeout(() => {
          p.resizeCanvas(p.windowWidth, p.windowHeight);
          if (ready) repositionButtons();
        }, 200);
      };
      window.addEventListener("orientationchange", onOrient);
      (p as any)._onRemove = () =>
        window.removeEventListener("orientationchange", onOrient);
    };

    p5Ref.current = new p5(sketch);

    return () => {
      try {
        if (p5Ref.current && (p5Ref.current as any)._onRemove) {
          (p5Ref.current as any)._onRemove();
        }
        p5Ref.current?.remove();
      } catch {}
      p5Ref.current = null;
      startedRef.current = false;

      document
        .querySelectorAll('canvas[data-homebuttons="1"]')
        .forEach((c) => c.parentElement?.removeChild(c));
    };
  }, []);

  return <div ref={containerRef} />;
};

export default AccueilSketch;
