import * as React from "react";

export const SelectedFiles: React.FC<{ files: File[]; onRemove: (index: number) => void }> = ({ files, onRemove }) => {
  return (
    <div>
      <div className="text-xs text-muted-foreground mb-2">{files.length} file(s) selected</div>
      <ul className="flex flex-wrap gap-2">
        {files.map((f, i) => (
          <li key={i} className="inline-flex items-center gap-2 max-w-full px-2 py-1 border border-border rounded-md bg-background text-xs">
            <span className="truncate max-w-[220px]" title={`${f.name} — ${formatBytes(f.size)}`}>
              {f.name}
            </span>
            <span className="text-muted-foreground">{formatBytes(f.size)}</span>
            <button
              type="button"
              className="ml-1 rounded p-0.5 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
              aria-label={`Remove ${f.name}`}
              onClick={() => onRemove(i)}
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="14" height="14" className="pointer-events-none">
                <path fill="currentColor" d="M18.3 5.71L12 12.01l-6.3-6.3-1.4 1.41 6.3 6.3-6.3 6.3 1.4 1.41 6.3-6.3 6.3 6.3 1.41-1.41-6.3-6.3 6.3-6.3z" />
              </svg>
            </button>
          </li>
        ))}
      </ul>
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

