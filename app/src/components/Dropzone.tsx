import * as React from "react";

type Props = {
  onFiles: (files: File[]) => void;
  accept?: string;
  label?: string;
  className?: string;
  supportedText?: string;
  scope?: string; // optional scope key for global shortcuts
};

export const Dropzone: React.FC<Props> = ({ onFiles, accept, label = "Drop files here or click to select", className = "", supportedText, scope }) => {
  const [drag, setDrag] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const wrapperRef = React.useRef<HTMLDivElement>(null);
  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDrag(false);
    const fs = Array.from(e.dataTransfer.files || []);
    if (fs.length) onFiles(fs);
  };

  React.useEffect(() => {
    const onOpen = (e: Event) => {
      const ce = e as CustomEvent<{ scope?: string }>;
      if (ce.detail && scope && ce.detail.scope && ce.detail.scope !== scope) return;
      const el = wrapperRef.current as HTMLElement | null;
      // Only trigger if visible in the current layout
      const isVisible = !!el && el.offsetParent !== null;
      if (isVisible) {
        inputRef.current?.click();
      }
    };
    window.addEventListener('ui:open-file-picker', onOpen as EventListener);
    return () => window.removeEventListener('ui:open-file-picker', onOpen as EventListener);
  }, [scope]);
  return (
    <div
      ref={wrapperRef}
      onDragOver={(e) => {
        e.preventDefault();
        setDrag(true);
      }}
      onDragLeave={() => setDrag(false)}
      onDrop={onDrop}
      onClick={() => inputRef.current?.click()}
      className={[
        "flex flex-col items-center justify-center border-2 border-dashed rounded-lg p-6 text-sm cursor-pointer select-none transition-colors",
        drag ? "border-primary bg-primary/10" : "border-border hover:bg-muted/50",
        className,
      ].join(" ")}
    >
      <div className="text-foreground font-medium">{label}</div>
      <div className="text-xs text-muted-foreground mt-1">{supportedText || "Supported: images, pdf"}</div>
      <input
        ref={inputRef}
        type="file"
        multiple
        accept={accept}
        className="hidden"
        onChange={(e) => onFiles(Array.from(e.target.files || []))}
      />
    </div>
  );
};
