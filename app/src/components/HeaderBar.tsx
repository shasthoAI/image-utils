import * as React from "react";
import { Button } from "./ui/button";
import { Kbd } from "./ui/kbd";
import { ThemeToggle } from "./theme-toggle";

export const HeaderBar: React.FC<{ title: string; onOpenPalette: () => void }> = ({ title, onOpenPalette }) => {
  const isElectron = typeof window !== 'undefined' && (window as any).appWindow;
  return (
    <div className={`flex items-center justify-between border rounded-lg bg-card p-3 ${isElectron ? '' : ''}`}>
      <div className="flex items-center gap-3">
        {isElectron && (
          <div className="flex items-center gap-2 no-drag">
            {/* macOS-style window controls */}
            <button
              aria-label="Close"
              className="h-3 w-3 rounded-full bg-red-500 hover:bg-red-600"
              onClick={(e) => { e.stopPropagation(); (window as any).appWindow?.close(); }}
            />
            <button
              aria-label="Minimize"
              className="h-3 w-3 rounded-full bg-amber-400 hover:bg-amber-500"
              onClick={(e) => { e.stopPropagation(); (window as any).appWindow?.minimize(); }}
            />
            <button
              aria-label="Maximize"
              className="h-3 w-3 rounded-full bg-green-500 hover:bg-green-600"
              onClick={(e) => { e.stopPropagation(); (window as any).appWindow?.maximizeOrRestore(); }}
            />
          </div>
        )}
        <div className={`text-sm text-muted-foreground ${isElectron ? 'drag select-none' : ''}`}>
          <span className="font-semibold text-foreground">{title}</span>
          <span className="ml-2 hidden md:inline">
            Quick keys: <Kbd>1</Kbd>…<Kbd>5</Kbd>, <Kbd>J</Kbd> jobs, <Kbd>⌘</Kbd>
            <Kbd>K</Kbd> palette
          </span>
        </div>
      </div>
      <div className="flex items-center gap-2 no-drag">
        <ThemeToggle />
        <Button variant="ghost" size="sm" className="no-drag" onClick={onOpenPalette}>
          Search actions
        </Button>
      </div>
    </div>
  );
};
