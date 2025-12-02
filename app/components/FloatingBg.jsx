export default function FloatingBG() {
  return (
    <div className="fixed inset-0 -z-10 pointer-events-none overflow-hidden">
      {/* Blue blob - circle orbit */}
      <img
        src="/blue.png"
        className="absolute w-[450px] opacity-80 animate-orbitBlue"
        style={{ top: "40%", left: "40%" }}
      />

      {/* Pink blob - elliptical orbit */}
      <img
        src="/pink.png"
        className="absolute w-[450px] opacity-80 animate-orbitPink"
        style={{ top: "40%", left: "40%" }}
      />
    </div>
  );
}



