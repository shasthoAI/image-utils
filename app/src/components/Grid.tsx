import * as React from "react";

export type GridItem = { name: string; sizeKB?: string; viewUrl: string };
export type GridItemEx = GridItem & { downloadUrl?: string };

export const Grid: React.FC<{ items: GridItemEx[] }> = ({ items }) => (
  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
    {items.map((it, i) => (
      <a
        key={i}
        href={it.viewUrl}
        target="_blank"
        className="group border border-border rounded-lg bg-card overflow-hidden hover:shadow-sm focus:outline-none focus:ring-2 focus:ring-primary transition-all"
      >
        <div className="relative">
          <img src={it.viewUrl} className="w-full h-32 object-cover" />
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition" />
        </div>
        <div className="px-2 py-1 text-xs text-muted-foreground">
          <div className="flex justify-between">
            <span className="truncate" title={it.name}>
              {it.name}
            </span>
            <span>{it.sizeKB ? `${it.sizeKB} KB` : ""}</span>
          </div>
          {it.downloadUrl && (
            <div className="mt-1 flex gap-2">
              <a href={it.viewUrl} target="_blank" className="text-primary hover:underline">
                View
              </a>
              <a href={it.downloadUrl} className="text-primary hover:underline">
                Download
              </a>
            </div>
          )}
        </div>
      </a>
    ))}
  </div>
);

