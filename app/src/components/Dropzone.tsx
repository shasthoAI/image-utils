import * as React from "react";

type Props = {
  onFiles: (files: File[]) => void;
  accept?: string;
  label?: string;
  className?: string;
  supportedText?: string;
};

export const Dropzone: React.FC<Props> = ({ onFiles, accept, label = "Drop files here or click to select", className = "", supportedText }) => {
  const [drag, setDrag] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDrag(false);
    const fs = Array.from(e.dataTransfer.files || []);
    if (fs.length) onFiles(fs);
  };
  return (
    <div
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

