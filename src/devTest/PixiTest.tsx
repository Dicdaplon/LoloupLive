import React from "react";
import { Application, extend } from "@pixi/react";
import { Container, Sprite, Text, Texture, TextStyle } from "pixi.js";

// Déclarer les classes qu'on utilise
extend({ Container, Sprite, Text });

const PixiHello: React.FC = () => {
  return (
    <div style={{ width: "100%", height: "100vh" }}>
      <Application
        resizeTo={window}   // le canvas prend toute la fenêtre
        backgroundColor={0x0b0f1a}
      >
        <container x={100} y={100}>
          <text
            text="Hello Pixi 👋"
            style={new TextStyle({ fill: 0xffffff, fontSize: 36, fontWeight: "700" })}
          />
        </container>

        <sprite
          texture={Texture.WHITE}
          x={200}
          y={200}
          width={100}
          height={100}
          tint={0x7f5af0}
        />
      </Application>
    </div>
  );
};

export default PixiHello;
