import * as React from "react";
import { Section } from "../components/Section";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Separator } from "../components/ui/separator";
import { Grid } from "../components/Grid";
import { CompareSlider } from "../components/CompareSlider";
import { RefreshCw, Clock, CheckCircle, XCircle, AlertCircle, Eye, Download } from "lucide-react";

type Job = { id: string; type: string; created_at?: string; status?: string; input?: any; chain_execution_id?: string };

export const JobsView: React.FC = () => {
  const [jobs, setJobs] = React.useState<Job[]>([]);
  const [chains, setChains] = React.useState<any[]>([]);
  const [chainDetails, setChainDetails] = React.useState<Record<string, any>>({});

  React.useEffect(() => {
    const ac = new AbortController();
    (async () => {
      try {
        const r = await fetch("/api/jobs", { signal: ac.signal });
        if (!r.ok) throw new Error(`HTTP error! status: ${r.status}`);
        const j = await r.json();
        if (!ac.signal.aborted) setJobs(j);
      } catch (e) {
        // ignore
      }
    })();
    return () => ac.abort();
  }, []);

  React.useEffect(() => {
    (async () => {
      try {
        const r = await fetch("/api/chains");
        if (!r.ok) return;
        const j = await r.json();
        setChains(j);
      } catch {}
    })();
  }, []);

  const refresh = async () => {
    try {
      const j = await (await fetch("/api/jobs")).json();
      setJobs(j);
    } catch {}
  };

  const chainName = (id?: string) => chains.find((c: any) => c.id === id)?.name || id || "-";

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'running':
        return <AlertCircle className="h-4 w-4 text-yellow-500 animate-pulse" />;
      default:
        return <Clock className="h-4 w-4 text-muted-foreground" />;
    }
  };

  return (
    <div className="space-y-6">
      <Section 
        title="Job History" 
        description={`${jobs.length} jobs in total`}
        actions={
          <Button onClick={refresh} variant="outline" size="sm" className="gap-2">
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
        }
      >
        <div className="space-y-4">
          {jobs.length === 0 && (
            <Card>
              <CardContent className="p-8 text-center">
                <Clock className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">No jobs found.</p>
                <p className="text-xs text-muted-foreground mt-1">Jobs will appear here after you process files.</p>
              </CardContent>
            </Card>
          )}
          {jobs.map((c: any) => (
            <Card key={c.id}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg flex items-center gap-2">
                    {getStatusIcon(c.status)}
                    {c.type === "chain" ? chainName(c.chain_id) : c.type}
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    {c.status && (
                      <Badge 
                        variant={c.status === "failed" ? "destructive" : c.status === "completed" ? "default" : "secondary"}
                        className={c.status === "completed" ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100" : ""}
                      >
                        {c.status}
                      </Badge>
                    )}
                    {c.created_at && (
                      <span className="text-sm text-muted-foreground">
                        {new Date(c.created_at).toLocaleString()}
                      </span>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {c.input && (
                  <div className="text-sm bg-muted p-3 rounded-lg font-mono break-all">
                    {JSON.stringify(c.input, null, 2)}
                  </div>
                )}
                <div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={async () => {
                      try {
                        // Jobs are not chain executions; fetch job details and adapt to step-style UI
                        const r = await fetch(`/api/jobs/${c.id}`);
                        if (!r.ok) return;
                        const data = await r.json();

                        const inputs = (data.files || []).filter((f: any) => f.type === 'input');
                        const outputs = (data.files || []).filter((f: any) => f.type === 'output');

                        const toKB = (n: number | undefined) => (n != null ? (n / 1024).toFixed(2) : undefined);

                        let step: any = { tool: c.type, results: [], webFiles: [] };

                        if (c.type === 'compress') {
                          // Map outputs to inputs by filename base (ignoring jobId_ prefix and extension)
                          const inputByBase: Record<string, any> = {};
                          inputs.forEach((f: any) => {
                            const name = String(f.original_name);
                            const base = name.replace(/\.[^.]+$/, '');
                            inputByBase[base] = f;
                          });
                          outputs.forEach((of: any) => {
                            const oname: string = of.original_name; // already basename
                            const stripped = oname.replace(/^.*?_/, '').replace(/\.[^.]+$/, '');
                            const inf = inputByBase[stripped] || inputs[0];
                            step.results.push({
                              original: inf?.original_name,
                              success: true,
                              originalViewUrl: inf ? `/uploads/${inf.path.split('/').pop()}` : undefined,
                              compressedViewUrl: `/outputs/${of.original_name}`,
                              compressedDownloadUrl: `/api/download/${c.id}/${of.original_name}`,
                              originalSizeKB: toKB(inf?.size),
                              compressedSizeKB: toKB(of.size),
                              compressionRatio: inf && of?.size ? (((inf.size - of.size) / inf.size) * 100).toFixed(1) : undefined,
                            });
                          });
                        } else if (c.type === 'split' || c.type === 'pdf-split') {
                          // Show outputs as grid items
                          step.webFiles = outputs.map((of: any) => ({
                            name: of.original_name,
                            sizeKB: toKB(of.size),
                            viewUrl: `/outputs/${c.id}/${of.original_name}`,
                            downloadUrl: `/api/download/${c.id}/${of.original_name}`,
                          }));
                        }

                        setChainDetails((d) => ({ ...d, [c.id]: { id: c.id, results: [step] } }));
                      } catch {}
                    }}
                    className="gap-2"
                  >
                    <Eye className="h-4 w-4" />
                    View Details
                  </Button>
                </div>
                {chainDetails[c.id] && chainDetails[c.id].results && (
                  <div className="space-y-4">
                    <Separator />
                    {chainDetails[c.id].results.map((step: any, idx: number) => (
                      <Card key={idx} className="border-l-4 border-l-primary">
                        <CardHeader>
                          <CardTitle className="text-base">Step {idx + 1}: {step.tool}</CardTitle>
                        </CardHeader>
                        <CardContent>
                          {step.tool === "compress" &&
                            step.results?.map((it: any, i: number) =>
                              it.success && it.originalViewUrl && it.compressedViewUrl ? (
                                <div key={i} className="space-y-3">
                                  <CompareSlider original={it.originalViewUrl} compressed={it.compressedViewUrl} />
                                  {(it.originalSizeKB || it.compressedSizeKB || it.compressionRatio) && (
                                    <div className="flex items-center gap-2">
                                      {it.originalSizeKB && <Badge variant="secondary">{it.originalSizeKB} KB</Badge>}
                                      {it.compressedSizeKB && <Badge variant="default">{it.compressedSizeKB} KB</Badge>}
                                      {it.compressionRatio && (
                                        <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100">
                                          Saved {it.compressionRatio}%
                                        </Badge>
                                      )}
                                    </div>
                                  )}
                                  <div className="flex gap-2">
                                    <Button size="sm" variant="outline" asChild className="gap-2">
                                      <a href={it.compressedViewUrl} target="_blank">
                                        <Eye className="h-4 w-4" />
                                        Preview
                                      </a>
                                    </Button>
                                    {it.compressedDownloadUrl && (
                                      <Button size="sm" variant="default" asChild className="gap-2">
                                        <a href={it.compressedDownloadUrl}>
                                          <Download className="h-4 w-4" />
                                          Download
                                        </a>
                                      </Button>
                                    )}
                                  </div>
                                </div>
                              ) : (
                                <div key={i} className="flex items-center gap-2 text-sm">
                                  <span>{it.original}</span>
                                  <Badge variant={it.success ? "default" : "destructive"}>
                                    {it.success ? "Success" : "Failed"}
                                  </Badge>
                                </div>
                              )
                            )}
                          {(step.tool === "split" || step.tool === "pdf-split") && step.webFiles && (
                            <Grid items={step.webFiles} />
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </Section>
    </div>
  );
};
