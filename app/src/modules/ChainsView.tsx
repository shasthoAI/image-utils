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
import { ChainResults } from "../components/ChainResults";
import { Plus, Save, Play, FileText, Trash2, ChevronDown, ChevronUp, Settings, Link } from "lucide-react";

export const ChainsView: React.FC = () => {
  const [chains, setChains] = React.useState<any[]>([]);
  const [selected, setSelected] = React.useState<string>("");
  const [files, setFiles] = React.useState<File[]>([]);
  const [result, setResult] = React.useState<any>();
  const [progress, setProgress] = React.useState<{ executionId: string; stepCount: number; currentStep: number; status: string } | null>(null);
  const pollRef = React.useRef<any>(null);
  
  // Creation form state
  const [showCreation, setShowCreation] = React.useState(false);
  const [chainName, setChainName] = React.useState("");
  const [steps, setSteps] = React.useState<ChainStep[]>([]);

  React.useEffect(() => {
    const loadChains = async () => {
      try {
        const r = await fetch("/api/chains");
        if (!r.ok) throw new Error(`HTTP error! status: ${r.status}`);
        const j = await r.json();
        setChains(j);
        // Auto-show creation form if no chains exist
        if (j.length === 0) {
          setShowCreation(true);
        }
      } catch (e: any) {
        console.warn("Failed to load chains", e);
      }
    };
    loadChains();
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

  const saveChain = async () => {
    if (!chainName || steps.length === 0) return;
    try {
      const r = await fetch("/api/chains", { 
        method: "POST", 
        headers: { "Content-Type": "application/json" }, 
        body: JSON.stringify({ name: chainName, steps }) 
      });
      if (!r.ok) throw new Error("Failed to save");
      setChainName("");
      setSteps([]);
      setShowCreation(false);
      // Reload chains
      const chainsResponse = await fetch("/api/chains");
      const chainsData = await chainsResponse.json();
      setChains(chainsData);
    } catch (e) {
      console.warn("Failed to save chain", e);
    }
  };

  return (
    <div className="space-y-4">
      {/* Existing Chains Overview */}
      {chains.length > 0 && (
        <Section
          title="Saved Tool Chains"
          description={`${chains.length} automated workflows available`}
          actions={
            <Button 
              size="sm" 
              variant="outline" 
              onClick={() => setShowCreation(!showCreation)}
              className="gap-2"
            >
              <Plus className="h-4 w-4" />
              {showCreation ? 'Hide Creation' : 'Create New Chain'}
            </Button>
          }
        >
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {chains.map((chain: any) => (
              <Card 
                key={chain.id} 
                className={`cursor-pointer transition-all ${
                  selected === chain.id 
                    ? 'ring-2 ring-primary border-primary' 
                    : 'hover:border-primary/50'
                }`}
                onClick={() => setSelected(selected === chain.id ? "" : chain.id)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">{chain.name}</CardTitle>
                    <div className="flex items-center gap-1">
                      <Link className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">{chain.steps?.length || 0}</span>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="flex flex-wrap gap-1">
                    {(chain.steps || []).map((step: any, idx: number) => (
                      <div key={idx} className="text-xs bg-muted px-2 py-1 rounded capitalize">
                        {step.tool}
                      </div>
                    ))}
                  </div>
                  <div className="text-xs text-muted-foreground mt-2">
                    Created {new Date(chain.created_at).toLocaleDateString()}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </Section>
      )}

      {/* Chain Creation Form (Collapsible) */}
      {showCreation && (
        <Section
          title="Create New Chain"
          description="Build automated workflows by chaining multiple image processing steps"
          actions={
            <div className="flex items-center gap-2">
              <Button 
                size="sm" 
                variant="outline" 
                onClick={() => setSteps((s) => [...s, { tool: "compress", config: { compressionLevel: "medium", convertToWebP: false, grayscale: false } }])}
                className="gap-2"
              >
                <Plus className="h-4 w-4" />
                Add Step
              </Button>
              <Button
                size="sm"
                variant="default"
                onClick={saveChain}
                disabled={!chainName || steps.length === 0}
                className="gap-2"
              >
                <Save className="h-4 w-4" />
                Save Chain
              </Button>
              <Button 
                size="sm" 
                variant="ghost" 
                onClick={() => setShowCreation(false)}
                className="gap-2"
              >
                <ChevronUp className="h-4 w-4" />
                Hide
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
                  <p className="mb-2">Available tools:</p>
                  <ul className="text-xs space-y-1">
                    <li>• <strong>Compress:</strong> Reduce image file sizes</li>
                    <li>• <strong>Split:</strong> Divide images horizontally</li>
                    <li>• <strong>PDF Convert:</strong> Extract pages as images</li>
                  </ul>
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
                    <Settings className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                    <p className="text-sm text-muted-foreground">No steps configured yet.</p>
                    <p className="text-xs text-muted-foreground mt-1">Click "Add Step" to start building your workflow.</p>
                  </CardContent>
                </Card>
              )}
              {steps.map((step, idx) => (
                <ChainStepEditor 
                  key={idx} 
                  index={idx} 
                  step={step} 
                  onChange={(ns) => setSteps((prev) => prev.map((s, i) => (i === idx ? ns : s)))} 
                  onRemove={() => setSteps((prev) => prev.filter((_, i) => i !== idx))} 
                />
              ))}
            </div>
          </div>
        </Section>
      )}

      {/* Chain Execution */}
      {chains.length > 0 && (
        <>
          {progress && (
            <Section title="Execution Progress">
              <ProgressBar current={progress.currentStep} total={progress.stepCount} status={progress.status} />
            </Section>
          )}

          <Section 
            title="Execute Chain" 
            description={selected ? `Execute "${chains.find(c => c.id === selected)?.name}" with uploaded files` : "Select a chain above to get started"}
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
            {!selected ? (
              <Card>
                <CardContent className="p-6 text-center">
                  <FileText className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">Select a chain from above to get started</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                <div>
                  <Label className="text-base font-medium">Input Files</Label>
                  <p className="text-sm text-muted-foreground mb-3">Upload files to process through the selected chain</p>
                  <Dropzone 
                    onFiles={(fs) => setFiles((fs as any) as File[])} 
                    label="Drop files here or click to select" 
                    supportedText="Supported: Images and PDF files"
                    accept="image/*,.pdf"
                  />
                </div>
                {files && files.length > 0 && (
                  <SelectedFiles files={files} onRemove={(idx) => setFiles((prev) => prev.filter((_, i) => i !== idx))} />
                )}
              </div>
            )}
          </Section>
        </>
      )}

      {/* No chains state */}
      {chains.length === 0 && !showCreation && (
        <Section title="Tool Chains">
          <Card>
            <CardContent className="p-8 text-center">
              <Link className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Tool Chains Created Yet</h3>
              <p className="text-sm text-muted-foreground mb-4 max-w-md mx-auto">
                Create automated workflows by chaining multiple image processing tools together. 
                Perfect for repetitive tasks like converting PDFs to images then compressing them.
              </p>
              <Button onClick={() => setShowCreation(true)} className="gap-2">
                <Plus className="h-4 w-4" />
                Create Your First Chain
              </Button>
            </CardContent>
          </Card>
        </Section>
      )}

      {/* Results */}
      {result && (
        <Section 
          title="Chain Execution Results" 
          description={result.results ? `${result.results.length} steps completed` : "Execution results"}
        >
          {result.results ? (
            <ChainResults results={result.results} />
          ) : result.error ? (
            <Card className="border-red-200 dark:border-red-800">
              <CardContent className="p-4">
                <div className="text-red-600 dark:text-red-400">{result.error}</div>
              </CardContent>
            </Card>
          ) : (
            <div className="text-sm text-muted-foreground">No results to display</div>
          )}
        </Section>
      )}
    </div>
  );
};