import * as React from "react";

export const ProgressBar: React.FC<{ current: number; total: number; status: string }> = ({ current, total, status }) => {
  const pct = Math.min(100, Math.round((status === "completed" ? 1 : total ? current / total : 0) * 100));
  return (
    <div className="space-y-1">
      <div className="h-2 w-full bg-muted rounded">
        <div className={`h-2 rounded ${status === "failed" ? "bg-destructive" : "bg-primary"}`} style={{ width: `${pct}%` }} />
      </div>
      <div className="text-xs text-muted-foreground">{status === "failed" ? "Failed" : `Step ${Math.min(current + 1, total)} of ${total}`}</div>
    </div>
  );
};

