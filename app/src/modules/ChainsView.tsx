import * as React from "react";
import { Section } from "../components/Section";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Label } from "../components/ui/label";
import { Input } from "../components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Separator } from "../components/ui/separator";
import { Dropzone } from "../components/Dropzone";
import { SelectedFiles } from "../components/SelectedFiles";
import { ChainStepEditor, type ChainStep } from "../components/ChainStepEditor";
import { ProgressBar } from "../components/ProgressBar";
import { Plus, Save, Play, FileText, Trash2 } from "lucide-react";

export const ChainsView: React.FC = () => {
  const [chains, setChains] = React.useState<any[]>([]);
  const [selected, setSelected] = React.useState<string>("");
  const [files, setFiles] = React.useState<File[]>([]);
  const [result, setResult] = React.useState<any>();
  const [progress, setProgress] = React.useState<{ executionId: string; stepCount: number; currentStep: number; status: string } | null>(null);
  const pollRef = React.useRef<any>(null);
  const [chainName, setChainName] = React.useState("");
  const [steps, setSteps] = React.useState<ChainStep[]>([]);

  React.useEffect(() => {
    const ac = new AbortController();
    (async () => {
      try {
        const r = await fetch("/api/chains", { signal: ac.signal });
        if (!r.ok) throw new Error(`HTTP error! status: ${r.status}`);
        const j = await r.json();
        if (!ac.signal.aborted) setChains(j);
      } catch (e: any) {
        if (e?.name !== "AbortError" && !ac.signal.aborted) {
          console.warn("Failed to load chains", e);
        }
      }
    })();
    return () => ac.abort();
  }, []);

  const run = async () => {
    if (!selected) return;
    try {
      const fd = new FormData();
      (files || []).forEach((f) => fd.append("files", f));
      const r = await fetch(`/api/chains/${selected}/execute-async`, { method: "POST", body: fd });
      if (!r.ok) throw new Error(`HTTP error! status: ${r.status}`);
      const j = await r.json();
      setResult(undefined);
      setProgress({ executionId: j.executionId, stepCount: j.stepCount, currentStep: 0, status: "running" });
      if (pollRef.current) clearTimeout(pollRef.current);
      const poll = async () => {
        try {
          const s = await fetch(`/api/chain-executions/${j.executionId}`);
          const data = await s.json();
          setProgress((p) => (p ? { ...p, currentStep: data.current_step ?? 0, status: data.status } : null));
          if (data.status === "completed") {
            setResult({ results: data.results });
            pollRef.current = null;
            return;
          }
          if (data.status === "failed") {
            pollRef.current = null;
            return;
          }
          pollRef.current = setTimeout(poll, 700);
        } catch (err) {
          pollRef.current = setTimeout(poll, 1200);
        }
      };
      poll();
    } catch (e) {
      console.warn("Failed to execute chain", e);
      setResult({ error: "Failed to execute chain" });
    }
  };

  return (
    <div className="space-y-4">
      <Section
        title="Create Chain"
        actions={
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={() => setSteps((s) => [...s, { tool: "compress", config: { compressionLevel: "medium", convertToWebP: false, grayscale: false } }])} className="gap-2">
              <Plus className="h-4 w-4" />
              Add Step
            </Button>
            <Button
              size="sm"
              variant="default"
              onClick={async () => {
                if (!chainName || steps.length === 0) return;
                try {
                  const r = await fetch("/api/chains", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: chainName, steps }) });
                  if (!r.ok) throw new Error("Failed to save");
                  setChainName("");
                  setSteps([]);
                  const j = await (await fetch("/api/chains")).json();
                  setChains(j);
                } catch (e) {
                  console.warn("Failed to save chain", e);
                }
              }}
              disabled={!chainName || steps.length === 0}
              className="gap-2"
            >
              <Save className="h-4 w-4" />
              Save Chain
            </Button>
          </div>
        }
      >
        <div className="grid gap-6 lg:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Chain Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="chain-name">Chain Name</Label>
                <Input 
                  id="chain-name"
                  value={chainName} 
                  onChange={(e) => setChainName(e.target.value)} 
                  placeholder="e.g., PDF → Split → Compress" 
                />
              </div>
              <Separator />
              <div className="text-sm text-muted-foreground">
                <p className="mb-2">Create automated workflows by chaining multiple image processing steps together.</p>
                <p>Available tools: Compress, Split, PDF Convert</p>
              </div>
            </CardContent>
          </Card>
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-base font-medium">Processing Steps</Label>
              <span className="text-sm text-muted-foreground">{steps.length} steps</span>
            </div>
            {steps.length === 0 && (
              <Card>
                <CardContent className="p-6 text-center">
                  <FileText className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">No steps configured yet.</p>
                  <p className="text-xs text-muted-foreground mt-1">Click "Add Step" to start building your workflow.</p>
                </CardContent>
              </Card>
            )}
            {steps.map((step, idx) => (
              <ChainStepEditor key={idx} index={idx} step={step} onChange={(ns) => setSteps((prev) => prev.map((s, i) => (i === idx ? ns : s)))} onRemove={() => setSteps((prev) => prev.filter((_, i) => i !== idx))} />
            ))}
          </div>
        </div>
      </Section>

      {progress && (
        <Section title="Execution Progress">
          <ProgressBar current={progress.currentStep} total={progress.stepCount} status={progress.status} />
        </Section>
      )}

      <Section 
        title="Execute Chain" 
        description="Select a saved chain and upload files to process"
        actions={
          <Button 
            onClick={run} 
            variant="default" 
            disabled={!selected || !!progress}
            className="gap-2"
          >
            <Play className="h-4 w-4" />
            Execute Chain
          </Button>
        }
      >
        <div className="grid gap-6 lg:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Chain Selection</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="chain-select">Choose Chain</Label>
                <Select value={selected} onValueChange={setSelected}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a chain..." />
                  </SelectTrigger>
                  <SelectContent>
                    {chains.map((c: any) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="text-sm text-muted-foreground">
                <p>Upload files if your selected chain requires input files.</p>
              </div>
            </CardContent>
          </Card>
          <div className="lg:col-span-2 space-y-4">
            <div>
              <Label className="text-base font-medium">Input Files</Label>
              <p className="text-sm text-muted-foreground mb-3">Select files to process through the chain</p>
              <Dropzone 
                onFiles={(fs) => setFiles((fs as any) as File[])} 
                label="Drop files here or click to select" 
                supportedText="Supported: Images and PDF files"
                accept="image/*,.pdf"
              />
            </div>
            {files && files.length > 0 && (
              <div>
                <SelectedFiles files={files} onRemove={(idx) => setFiles((prev) => prev.filter((_, i) => i !== idx))} />
              </div>
            )}
          </div>
        </div>
      </Section>

      {result && (
        <Section title="Result">
          <pre className="text-xs whitespace-pre-wrap bg-gray-50 p-3 rounded border overflow-auto max-h-96">{JSON.stringify(result, null, 2)}</pre>
        </Section>
      )}
    </div>
  );
};

