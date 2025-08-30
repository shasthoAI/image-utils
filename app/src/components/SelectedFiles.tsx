import * as React from "react";
import { FileText, Image as ImageIcon, X } from "lucide-react";

export const SelectedFiles: React.FC<{ files: File[]; onRemove: (index: number) => void }> = ({ files, onRemove }) => {
  return (
    <div>
      <div className="text-xs text-muted-foreground mb-2">{files.length} file(s) selected</div>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
        {files.map((f, i) => (
          <div key={i} className="relative border border-border rounded-md overflow-hidden bg-card">
            <button
              type="button"
              className="absolute top-1 right-1 z-10 inline-flex items-center justify-center h-6 w-6 rounded-md bg-background/80 backdrop-blur border border-border text-foreground/70 hover:text-foreground hover:bg-background transition-colors"
              aria-label={`Remove ${f.name}`}
              onClick={() => onRemove(i)}
            >
              <X className="h-4 w-4" />
            </button>
            <div className="bg-muted flex items-center justify-center w-full aspect-square">
              <PreviewThumb file={f} />
            </div>
            <div className="p-2">
              <div className="text-xs font-medium break-words whitespace-normal" title={f.name}>{f.name}</div>
              <div className="text-[10px] text-muted-foreground">{formatBytes(f.size)}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const PreviewThumb: React.FC<{ file: File }> = ({ file }) => {
  const [url, setUrl] = React.useState<string | null>(null);

  React.useEffect(() => {
    const u = URL.createObjectURL(file);
    setUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [file]);

  const type = (file.type || "").toLowerCase();
  const isImage = type.startsWith("image/");
  const isPdf = type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");

  if (isImage && url) {
    return <img src={url} alt={file.name} className="h-full w-full object-contain" />;
  }

  if (isPdf && url) {
    // Try to render first page preview; fall back to icon if not supported
    return (
      <object data={url + "#page=1&zoom=80"} type="application/pdf" className="h-full w-full">
        <div className="flex items-center justify-center h-full w-full text-muted-foreground">
          <FileText className="h-6 w-6 mr-2" /> PDF
        </div>
      </object>
    );
  }

  return (
    <div className="flex items-center justify-center h-full w-full text-muted-foreground">
      <ImageIcon className="h-6 w-6 mr-2" /> No preview
    </div>
  );
};

function formatBytes(n: number) {
  const units = ["B", "KB", "MB", "GB"];
  let v = n;
  let u = 0;
  while (v >= 1024 && u < units.length - 1) {
    v /= 1024;
    u++;
  }
  return `${Math.round(v * 10) / 10} ${units[u]}`;
}
