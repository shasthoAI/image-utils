import * as React from "react";
import { Dialog, DialogContent, DialogTitle } from "./ui/dialog";
import { Kbd } from "./ui/kbd";

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
};

export const ShortcutsDialog: React.FC<Props> = ({ open, onOpenChange }) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogTitle>Keyboard Shortcuts</DialogTitle>
        <div className="mt-4 grid grid-cols-1 gap-2 text-sm">
          <div className="flex items-center justify-between">
            <span>Switch to Compress / Split / PDF / Chains / Jobs</span>
            <span className="inline-flex gap-1"><Kbd>1</Kbd><Kbd>2</Kbd><Kbd>3</Kbd><Kbd>4</Kbd><Kbd>5</Kbd></span>
          </div>
          <div className="flex items-center justify-between">
            <span>Open Command Palette</span>
            <span className="inline-flex gap-1"><Kbd>⌘</Kbd><Kbd>K</Kbd> or <Kbd>Ctrl</Kbd><Kbd>K</Kbd></span>
          </div>
          <div className="flex items-center justify-between">
            <span>Open file selector (current tool)</span>
            <Kbd>Space</Kbd>
          </div>
          <div className="flex items-center justify-between">
            <span>Run current tool</span>
            <Kbd>Enter</Kbd>
          </div>
          <div className="flex items-center justify-between">
            <span>New/Clear files and results</span>
            <span className="inline-flex gap-1"><Kbd>⌘</Kbd><Kbd>N</Kbd> or <Kbd>Ctrl</Kbd><Kbd>N</Kbd></span>
          </div>
          <div className="flex items-center justify-between">
            <span>Show keyboard shortcuts</span>
            <Kbd>?</Kbd>
          </div>
          <div className="flex items-center justify-between">
            <span>Go to Jobs</span>
            <Kbd>J</Kbd>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

