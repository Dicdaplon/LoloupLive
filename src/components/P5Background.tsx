// src/components/P5Background.tsx
import { useEffect, useRef } from 'react';
import p5 from 'p5';

export default function P5Background() {
  const containerRef = useRef<HTMLDivElement>(null);
  const sketchRef = useRef<p5 | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const sketch = (p: p5) => {
      const noteChars = ['♪', '♫', '♩', '♬'] as const;
      type NoteChar = (typeof noteChars)[number];

      class NoteParticle {
        x: number;
        y: number;
        speed: number;
        alpha: number;
        char: NoteChar;
        size: number;
        color: p5.Color;

        constructor() {
          this.x = p.random(p.width);
          this.y = p.height + 20;
          this.speed = p.random(0.5, 2);
          this.alpha = 255;
          this.char = noteChars[Math.floor(p.random(noteChars.length))];
          this.size = p.random(16, 24);
          this.color = p.color(p.random(200, 255), p.random(100, 255), p.random(200, 255));
        }
        update() {
          this.y -= this.speed;
          this.alpha -= 1.5;
        }
        display() {
          p.push();
          p.textFont('Georgia', 25);
          p.noStroke();
          p.fill(p.red(this.color), p.green(this.color), p.blue(this.color), this.alpha);
          p.textSize(this.size);
          p.text(this.char as string, this.x, this.y);
          p.pop();
        }
        isDead() {
          return this.alpha <= 0;
        }
      }

      let notes: NoteParticle[] = [];

      p.setup = () => {
        p.createCanvas(p.windowWidth, p.windowHeight);
      };

      p.windowResized = () => {
        p.resizeCanvas(p.windowWidth, p.windowHeight);
      };

      p.draw = () => {
        p.background(28, 32, 37, 180);

        if (p.random(1) < 0.1) {
          notes.push(new NoteParticle());
        }

        for (let i = notes.length - 1; i >= 0; i--) {
          const n = notes[i];
          n.update();
          n.display();
          if (n.isDead()) notes.splice(i, 1);
        }
      };
    };

    sketchRef.current = new p5(sketch, containerRef.current);

    return () => {
      sketchRef.current?.remove();
      sketchRef.current = null;
    };
  }, []);

  return (
    <div
      ref={containerRef}
      style={{
        position: 'fixed',
        inset: '0',
        zIndex: -5,
        pointerEvents: 'none',
      }}
    />
  );
}
