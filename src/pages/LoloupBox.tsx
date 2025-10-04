import React, { useEffect, useState } from "react";

const TIMER=1000;
export default function LoloupBox()
{
  const [money, setMoney] = useState(0);
  const [guitars, setGuitars] = useState(0);
  const [guitarPrice, setGuitarPrice] = useState(10);
  useEffect(() =>
  {
    const intervalId = setInterval(() =>
    {
      setMoney((c) => c + 1+guitars); 
    }, TIMER);

    return () =>
    {
      clearInterval(intervalId);
    };
  }, []); 

  function spendMoney()
  {
    setMoney(0);
  }

    function plantGuitar()
  {
    setGuitars(guitars+1);
    setMoney(money-guitarPrice);
    setGuitarPrice(guitarPrice*1.25);
  }

  return (
    <div style={{ textAlign: "center", color: "#0ff" }}>
      <h2>Compteur auto</h2>
      <p style={{ fontSize: "2rem" }}>{money}</p>
      < button  onClick={spendMoney}> </button>
      < button  onClick={plantGuitar}> </button>
    </div>
  );
}
