import * as React from "react";
import { Section } from "../components/Section";
import { Dropzone } from "../components/Dropzone";
import { SelectedFiles } from "../components/SelectedFiles";
import { useLocalStorage } from "../hooks/useLocalStorage";
import { useToast } from "../hooks/useToast";
import { Button } from "../components/ui/button";
import { Switch } from "../components/ui/switch";
import { Badge } from "../components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Label } from "../components/ui/label";
import { Separator } from "../components/ui/separator";
import { CompareSlider } from "../components/CompareSlider";
import { Play, RotateCcw, Trash2, Download, ExternalLink } from "lucide-react";

type CompressResult = {
  original: string;
  compressed?: string;
  success: boolean;
  originalUrl?: string;
  compressedViewUrl?: string;
  compressedUrl?: string;
  originalSizeKB?: string;
  compressedSizeKB?: string;
  compressionRatio?: string;
  error?: string;
};

const Spinner = () => (
  <svg className="animate-spin h-4 w-4 text-white" viewBox="0 0 24 24">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
  </svg>
);

export const CompressView: React.FC = () => {
  const [files, setFiles] = React.useState<File[]>([]);
  const [level, setLevel] = useLocalStorage<'medium' | 'high' | 'extreme'>("ui.compress.level", "medium");
  const [webp, setWebp] = useLocalStorage<boolean>("ui.compress.webp", false);
  const [gray, setGray] = useLocalStorage<boolean>("ui.compress.gray", false);
  const [results, setResults] = React.useState<CompressResult[]>([]);
  const [loading, setLoading] = React.useState(false);
  const toast = useToast();

  const presets: { name: string; apply: () => void }[] = [
    { name: "Balanced", apply: () => { setLevel("medium"); setWebp(true); setGray(false); } },
    { name: "Max Save", apply: () => { setLevel("extreme"); setWebp(true); setGray(true); } },
    { name: "High Quality", apply: () => { setLevel("high"); setWebp(false); setGray(false); } },
  ];

  const submit = async () => {
    try {
      setLoading(true);
      const fd = new FormData();
      (files || []).forEach((f) => fd.append("files", f));
      fd.append("level", level);
      fd.append("webp", String(webp));
      fd.append("grayscale", String(gray));
      const r = await fetch("/api/compress", { method: "POST", body: fd });
      const j = await r.json();
      if (!r.ok) {
        toast.setMsg(j.error || "Failed");
        return;
      }
      setResults(j.results || []);
      toast.setMsg("Compression complete");
    } catch (e) {
      console.warn("Compression failed", e);
      toast.setMsg("Compression failed");
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    const onExecute = (e: Event) => {
      const ce = e as CustomEvent<{ scope?: string }>;
      if (ce.detail?.scope && ce.detail.scope !== 'compress') return;
      // Only run if we have files and not already loading
      if (!loading && files && files.length) {
        submit();
      }
    };
    const onNew = (e: Event) => {
      const ce = e as CustomEvent<{ scope?: string }>;
      if (ce.detail?.scope && ce.detail.scope !== 'compress') return;
      setFiles([]);
      setResults([]);
    };
    window.addEventListener('ui:execute', onExecute as EventListener);
    window.addEventListener('ui:new', onNew as EventListener);
    return () => {
      window.removeEventListener('ui:execute', onExecute as EventListener);
      window.removeEventListener('ui:new', onNew as EventListener);
    };
  }, [files, loading]);

  return (
    <div className="space-y-4">
      <Section
        title="Input & Settings"
        actions={
          <div className="flex items-center gap-3">
            <div className="hidden md:flex items-center border rounded-lg overflow-hidden">
              {(["medium", "high", "extreme"] as const).map((v) => (
                <button
                  key={v}
                  onClick={() => setLevel(v)}
                  className={[
                    "px-3 py-2 text-sm font-medium capitalize transition-colors",
                    level === v 
                      ? "bg-primary text-primary-foreground" 
                      : "bg-background hover:bg-muted text-muted-foreground hover:text-foreground"
                  ].join(" ")}
                >
                  {v}
                </button>
              ))}
            </div>
            <Button 
              onClick={submit} 
              variant="default" 
              disabled={loading || !(files && files.length)}
              className="gap-2"
            >
              {loading ? (
                <>
                  <Spinner />
                  Processing...
                </>
              ) : (
                <>
                  <Play className="h-4 w-4" />
                  Compress
                </>
              )}
            </Button>
          </div>
        }
      >
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-4">
            <div>
              <Label className="text-base font-medium">Select Images</Label>
              <p className="text-sm text-muted-foreground mb-3">Choose images to compress (JPEG, PNG, WebP supported)</p>
              <Dropzone scope="compress" accept="image/*" onFiles={(fs) => setFiles((fs as any) as File[])} label="Drop images here or click to select" supportedText="Supported: JPEG, PNG, WebP images only" />
            </div>
            {files && files.length > 0 && (
              <div>
                <SelectedFiles files={files} onRemove={(idx) => setFiles((prev) => prev.filter((_, i) => i !== idx))} />
              </div>
            )}
          </div>
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Compression Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="webp-toggle" className="text-sm font-medium">Convert to WebP</Label>
                <Switch id="webp-toggle" checked={webp} onCheckedChange={setWebp} />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="gray-toggle" className="text-sm font-medium">Convert to Grayscale</Label>
                <Switch id="gray-toggle" checked={gray} onCheckedChange={setGray} />
              </div>
              <Separator />
              <div className="space-y-3">
                <Label className="text-sm font-medium">Quick Presets</Label>
                <div className="grid grid-cols-1 gap-2">
                  {presets.map((p) => (
                    <Button key={p.name} size="sm" variant="outline" onClick={p.apply} className="justify-start">
                      {p.name}
                    </Button>
                  ))}
                </div>
              </div>
              <Separator />
              <Button size="sm" variant="ghost" onClick={() => setFiles([])} className="w-full gap-2">
                <Trash2 className="h-4 w-4" />
                Clear All Files
              </Button>
            </CardContent>
          </Card>
        </div>
      </Section>

      {results.length > 0 && (
        <Section 
          title="Compression Results" 
          description={`Successfully processed ${results.filter(r => r.success).length} of ${results.length} images`}
          actions={
            <Button size="sm" variant="ghost" onClick={() => setResults([])} className="gap-2">
              <RotateCcw className="h-4 w-4" />
              Clear Results
            </Button>
          }
        >
          <div className="grid gap-4">
            {results.map((r, i) => (
              <Card key={i} className={r.success ? "border-green-200 dark:border-green-800" : "border-red-200 dark:border-red-800"}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="font-medium truncate" title={r.original}>
                      {r.original}
                    </div>
                    {r.originalSizeKB && (
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary">{r.originalSizeKB} KB</Badge>
                        {r.compressedSizeKB && <Badge variant="default">{r.compressedSizeKB} KB</Badge>}
                        {r.compressionRatio && <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100">-{r.compressionRatio}%</Badge>}
                      </div>
                    )}
                  </div>
                  {r.success && r.originalUrl && r.compressedViewUrl ? (
                    <div className="space-y-3">
                      <CompareSlider original={r.originalUrl} compressed={r.compressedViewUrl} />
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" asChild className="gap-2">
                          <a href={r.compressedViewUrl} target="_blank">
                            <ExternalLink className="h-4 w-4" />
                            Preview
                          </a>
                        </Button>
                        {r.compressedUrl && (
                          <Button size="sm" variant="default" asChild className="gap-2">
                            <a href={r.compressedUrl}>
                              <Download className="h-4 w-4" />
                              Download
                            </a>
                          </Button>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-lg">
                      {r.error || "Compression failed"}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </Section>
      )}

      {toast.msg && <div className="fixed bottom-6 right-6 bg-gray-900 text-white px-3 py-2 rounded-md shadow">{toast.msg}</div>}
    </div>
  );
};
