import * as React from "react";

export const CompareSlider: React.FC<{ original: string; compressed: string }> = ({ original, compressed }) => {
  const [pct, setPct] = React.useState(50);
  const ref = React.useRef<HTMLDivElement>(null);
  const dragging = React.useRef(false);

  const setFromClientX = (clientX: number) => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const raw = ((clientX - rect.left) / rect.width) * 100;
    const next = Math.max(0, Math.min(100, Math.round(raw)));
    setPct(next);
  };

  const onMouseDown = (e: React.MouseEvent) => {
    dragging.current = true;
    setFromClientX(e.clientX);
    const onMove = (ev: MouseEvent) => dragging.current && setFromClientX(ev.clientX);
    const onUp = () => {
      dragging.current = false;
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  };

  const onTouchStart = (e: React.TouchEvent) => {
    dragging.current = true;
    setFromClientX(e.touches[0].clientX);
    const onMove = (ev: TouchEvent) => dragging.current && setFromClientX(ev.touches[0].clientX);
    const onUp = () => {
      dragging.current = false;
      window.removeEventListener("touchmove", onMove);
      window.removeEventListener("touchend", onUp);
    };
    window.addEventListener("touchmove", onMove, { passive: true });
    window.addEventListener("touchend", onUp);
  };

  const step = (delta: number) => setPct((p) => Math.max(0, Math.min(100, p + delta)));

  return (
    <div
      ref={ref}
      className="relative inline-block w-full max-w-3xl rounded-xl overflow-hidden border border-border bg-card select-none"
      onMouseDown={onMouseDown}
      onTouchStart={onTouchStart}
    >
      <img src={compressed} className="block w-full" />
      <div className="absolute inset-y-0 left-0 overflow-hidden" style={{ clipPath: `inset(0 ${100 - pct}% 0 0)` }}>
        <img src={original} className="block w-full h-full object-cover" />
      </div>
      <div className="absolute inset-y-0" style={{ left: `${pct}%`, transform: "translateX(-50%)" }}>
        <div className="w-px h-full bg-primary shadow-[0_0_0_1px_rgba(0,0,0,0.1)]" />
      </div>
      <button
        type="button"
        aria-label="Adjust compare"
        onKeyDown={(e) => {
          if (e.key === "ArrowLeft") {
            e.preventDefault();
            step(e.shiftKey ? -10 : -1);
          }
          if (e.key === "ArrowRight") {
            e.preventDefault();
            step(e.shiftKey ? 10 : 1);
          }
          if (e.key === "Home") {
            e.preventDefault();
            setPct(0);
          }
          if (e.key === "End") {
            e.preventDefault();
            setPct(100);
          }
        }}
        className="absolute top-1/2 -translate-y-1/2 flex items-center justify-center w-8 h-8 rounded-full bg-background/90 shadow border border-border left-1/2"
        style={{ left: `${pct}%`, transform: "translate(-50%, -50%)" }}
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16" className="text-foreground">
          <path fill="currentColor" d="M10 6l-6 6 6 6V6zm4 12l6-6-6-6v12z" />
        </svg>
      </button>
      <div className="absolute left-3 top-3 text-xs font-semibold text-foreground bg-background/80 backdrop-blur px-2 py-0.5 rounded border border-border">Original</div>
      <div className="absolute right-3 top-3 text-xs font-semibold text-foreground bg-background/80 backdrop-blur px-2 py-0.5 rounded border border-border">Compressed</div>
      <div className="absolute -top-2 left-1/2 -translate-x-1/2 text-[10px] text-foreground bg-background/90 border border-border rounded px-1 py-0.5 shadow">{pct}%</div>
    </div>
  );
};

