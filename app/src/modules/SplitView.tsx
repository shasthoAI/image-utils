import * as React from "react";
import { Section } from "../components/Section";
import { Dropzone } from "../components/Dropzone";
import { SelectedFiles } from "../components/SelectedFiles";
import { useLocalStorage } from "../hooks/useLocalStorage";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Label } from "../components/ui/label";
import { Input } from "../components/ui/input";
import { Kbd } from "../components/ui/kbd";
import { Separator } from "../components/ui/separator";
import { Grid } from "../components/Grid";
import { Scissors, Play, Trash2, SplitSquareHorizontal } from "lucide-react";


export const SplitView: React.FC = () => {
  const [files, setFiles] = React.useState<File[]>([]);
  const [parts, setParts] = useLocalStorage<number>("ui.split.parts", 6);
  const [top, setTop] = useLocalStorage<number>("ui.split.top", 0);
  const [results, setResults] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(false);

  const submit = async () => {
    try {
      setLoading(true);
      const fd = new FormData();
      (files || []).forEach((f) => fd.append("files", f));
      fd.append("parts", String(parts));
      fd.append("topOffset", String(top));
      const r = await fetch("/api/split", { method: "POST", body: fd });
      const j = await r.json();
      if (!r.ok) {
        return;
      }
      setResults(j.results || []);
    } catch (e) {
      console.warn("Split failed", e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Section
        title="Image Splitting"
        description="Split images horizontally into multiple parts"
        actions={
          <Button 
            onClick={submit} 
            variant="default" 
            disabled={loading || !(files && files.length)}
            className="gap-2"
          >
            {loading ? (
              <>
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-background border-t-transparent" />
                Processing...
              </>
            ) : (
              <>
                <Play className="h-4 w-4" />
                Split Images
              </>
            )}
          </Button>
        }
      >
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-4">
            <div>
              <Label className="text-base font-medium">Select Images</Label>
              <p className="text-sm text-muted-foreground mb-3">Choose images to split horizontally (JPEG, PNG, WebP supported)</p>
              <Dropzone accept="image/*" onFiles={(fs) => setFiles((fs as any) as File[])} label="Drop images here or click to select" supportedText="Supported: JPEG, PNG, WebP images only" />
            </div>
            {files && files.length > 0 && (
              <div>
                <SelectedFiles files={files} onRemove={(idx) => setFiles((prev) => prev.filter((_, i) => i !== idx))} />
              </div>
            )}
          </div>
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <SplitSquareHorizontal className="h-5 w-5" />
                Split Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="parts-input">Number of Parts</Label>
                  <Kbd>Horizontal</Kbd>
                </div>
                <Input 
                  id="parts-input"
                  type="number" 
                  value={parts} 
                  onChange={(e) => setParts(parseInt(e.target.value || "6"))} 
                  min="2"
                  max="20"
                />
                <p className="text-xs text-muted-foreground">Split image into equal horizontal parts</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="offset-input">Top Offset (px)</Label>
                <Input 
                  id="offset-input"
                  type="number" 
                  value={top} 
                  onChange={(e) => setTop(parseInt(e.target.value || "0"))} 
                  min="0"
                  max="500"
                />
                <p className="text-xs text-muted-foreground">Skip pixels from the top before splitting</p>
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

      {results.map((r, i) => (
        <Section 
          key={i} 
          title={r.original}
          description={`Split into ${r.partDetails?.length || r.parts?.length || 0} parts`}
        >
          {r.partDetails ? (
            <Grid items={r.partDetails.map((p: any) => ({ 
              name: p.name, 
              sizeKB: p.sizeKB, 
              viewUrl: p.viewUrl, 
              downloadUrl: p.downloadUrl 
            }))} />
          ) : (
            <Card>
              <CardContent className="p-6 text-center">
                <Scissors className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">
                  {r.parts?.length || 0} parts created
                </p>
              </CardContent>
            </Card>
          )}
        </Section>
      ))}
    </div>
  );
};

