import * as React from "react";
import { Section } from "../components/Section";
import { Dropzone } from "../components/Dropzone";
import { SelectedFiles } from "../components/SelectedFiles";
import { useLocalStorage } from "../hooks/useLocalStorage";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Label } from "../components/ui/label";
import { Input } from "../components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Separator } from "../components/ui/separator";
import { Grid } from "../components/Grid";
import { FileText, Play, Trash2, Image } from "lucide-react";


export const PdfView: React.FC = () => {
  const [files, setFiles] = React.useState<File[]>([]);
  const [format, setFormat] = useLocalStorage<'png' | 'jpeg'>("ui.pdf.format", "png");
  const [scale, setScale] = useLocalStorage<number>("ui.pdf.scale", 150);
  const [results, setResults] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(false);

  const submit = async () => {
    try {
      setLoading(true);
      const fd = new FormData();
      (files || []).forEach((f) => fd.append("files", f));
      fd.append("format", format);
      fd.append("scale", String(scale));
      const r = await fetch("/api/pdf-split", { method: "POST", body: fd });
      const j = await r.json();
      if (!r.ok) {
        return;
      }
      setResults(j.results || []);
    } catch (e) {
      console.warn("PDF conversion failed", e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Section 
        title="PDF to Image Conversion" 
        description="Convert PDF pages to individual image files"
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
                Convert to Images
              </>
            )}
          </Button>
        }
      >
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-4">
            <div>
              <Label className="text-base font-medium">Select PDF Files</Label>
              <p className="text-sm text-muted-foreground mb-3">Choose PDF files to convert to images</p>
              <Dropzone accept="application/pdf" onFiles={(fs) => setFiles((fs as any) as File[])} label="Drop PDFs here or click to select" supportedText="Supported: PDF files only" />
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
                <Image className="h-5 w-5" />
                Output Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="format-select">Image Format</Label>
                <Select value={format} onValueChange={(value) => setFormat(value as 'png' | 'jpeg')}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select format" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="png">PNG (Lossless)</SelectItem>
                    <SelectItem value="jpeg">JPEG (Smaller files)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="scale-input">Scale (%)</Label>
                <Input 
                  id="scale-input"
                  type="number" 
                  value={scale} 
                  onChange={(e) => setScale(parseInt(e.target.value || "150"))} 
                  min="50"
                  max="300"
                  step="25"
                />
                <p className="text-xs text-muted-foreground">Higher scale = better quality, larger files</p>
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
          description={`Converted ${r.pageDetails?.length || r.pages?.length || 0} pages to images`}
        >
          {r.pageDetails ? (
            <Grid items={r.pageDetails.map((p: any) => ({ 
              name: p.name, 
              sizeKB: p.sizeKB, 
              viewUrl: p.viewUrl, 
              downloadUrl: p.downloadUrl 
            }))} />
          ) : (
            <Card>
              <CardContent className="p-6 text-center">
                <FileText className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">
                  {r.pages?.length || 0} images converted
                </p>
              </CardContent>
            </Card>
          )}
        </Section>
      ))}
    </div>
  );
};

