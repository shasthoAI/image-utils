import * as React from "react";
import { Button } from "./ui/button";
import { Kbd } from "./ui/kbd";
import { ThemeToggle } from "./theme-toggle";

export const HeaderBar: React.FC<{ title: string; onOpenPalette: () => void }> = ({ title, onOpenPalette }) => {
  return (
    <div className="flex items-center justify-between border rounded-lg bg-card p-3">
      <div className="text-sm text-muted-foreground">
        <span className="font-semibold text-foreground">{title}</span>
        <span className="ml-2 hidden md:inline">
          Quick keys: <Kbd>1</Kbd>…<Kbd>5</Kbd>, <Kbd>J</Kbd> jobs, <Kbd>⌘</Kbd>
          <Kbd>K</Kbd> palette
        </span>
      </div>
      <div className="flex items-center gap-2">
        <ThemeToggle />
        <Button variant="ghost" size="sm" onClick={onOpenPalette}>
          Search actions
        </Button>
      </div>
    </div>
  );
};

