import * as React from "react";
import { Button } from "./ui/button";
import { Switch } from "./ui/switch";

export type ChainTool = "compress" | "split" | "pdf-split";
export type ChainStep = { tool: ChainTool; config: any };

function LabeledField({ label, suffix, children }: { label: string; suffix?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span className="font-medium text-foreground">{label}</span>
        {suffix}
      </div>
      {children}
    </div>
  );
}

export const ChainStepEditor: React.FC<{
  index: number;
  step: ChainStep;
  onChange: (s: ChainStep) => void;
  onRemove: () => void;
}> = ({ index, step, onChange, onRemove }) => {
  const setTool = (tool: ChainTool) => {
    const next: ChainStep = { tool, config: defaultConfig(tool) };
    onChange(next);
  };
  return (
    <div className="border border-border rounded-lg p-3 bg-card">
      <div className="flex items-center justify-between mb-3">
        <div className="inline-flex items-center gap-2">
          <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold grid place-items-center">{index + 1}</span>
          <select className="border border-border rounded-md px-2 py-1 bg-background text-foreground" value={step.tool} onChange={(e) => setTool(e.target.value as ChainTool)}>
            <option value="compress">Image Compression</option>
            <option value="split">Image Splitting</option>
            <option value="pdf-split">PDF to Images</option>
          </select>
        </div>
        <Button size="sm" variant="destructive" onClick={onRemove}>
          Remove
        </Button>
      </div>
      {step.tool === "compress" && (
        <div className="grid gap-3 md:grid-cols-3">
          <LabeledField label="Compression Level">
            <select
              className="border border-border rounded-md px-2 py-1 w-full bg-background text-foreground"
              value={step.config.compressionLevel || "medium"}
              onChange={(e) => onChange({ ...step, config: { ...step.config, compressionLevel: e.target.value } })}
            >
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="extreme">Extreme</option>
            </select>
          </LabeledField>
          <div className="flex items-center justify-between">
            <div className="text-sm text-foreground">Convert to WebP</div>
            <Switch checked={!!step.config.convertToWebP} onCheckedChange={(v) => onChange({ ...step, config: { ...step.config, convertToWebP: v } })} />
          </div>
          <div className="flex items-center justify-between">
            <div className="text-sm text-foreground">Grayscale</div>
            <Switch checked={!!step.config.grayscale} onCheckedChange={(v) => onChange({ ...step, config: { ...step.config, grayscale: v } })} />
          </div>
        </div>
      )}
      {step.tool === "split" && (
        <div className="grid gap-3 md:grid-cols-3">
          <LabeledField label="Parts">
            <input
              type="number"
              className="border border-border rounded-md px-2 py-1 w-full bg-background text-foreground"
              value={step.config.parts ?? 6}
              onChange={(e) => onChange({ ...step, config: { ...step.config, parts: parseInt(e.target.value || "6") } })}
            />
          </LabeledField>
          <LabeledField label="Top Offset (px)">
            <input
              type="number"
              className="border border-border rounded-md px-2 py-1 w-full bg-background text-foreground"
              value={step.config.topOffset ?? 0}
              onChange={(e) => onChange({ ...step, config: { ...step.config, topOffset: parseInt(e.target.value || "0") } })}
            />
          </LabeledField>
          <LabeledField label="Slice Height (px)">
            <input
              type="number"
              className="border border-border rounded-md px-2 py-1 w-full bg-background text-foreground"
              value={step.config.sliceHeight ?? 0}
              onChange={(e) => onChange({ ...step, config: { ...step.config, sliceHeight: parseInt(e.target.value || "0") } })}
            />
          </LabeledField>
        </div>
      )}
      {step.tool === "pdf-split" && (
        <div className="grid gap-3 md:grid-cols-3">
          <LabeledField label="Format">
            <select
              className="border border-border rounded-md px-2 py-1 w-full bg-background text-foreground"
              value={step.config.format || "png"}
              onChange={(e) => onChange({ ...step, config: { ...step.config, format: e.target.value } })}
            >
              <option value="png">PNG</option>
              <option value="jpeg">JPEG</option>
              <option value="tiff">TIFF</option>
            </select>
          </LabeledField>
          <LabeledField label="Scale (DPI)">
            <input
              type="number"
              className="border border-border rounded-md px-2 py-1 w-full bg-background text-foreground"
              value={step.config.scale ?? 150}
              onChange={(e) => onChange({ ...step, config: { ...step.config, scale: parseInt(e.target.value || "150") } })}
            />
          </LabeledField>
        </div>
      )}
    </div>
  );
};

export function defaultConfig(tool: ChainTool) {
  if (tool === "compress") return { compressionLevel: "medium", convertToWebP: false, grayscale: false };
  if (tool === "split") return { parts: 6, topOffset: 0, sliceHeight: 0 };
  return { format: "png", scale: 150 };
}

