import * as React from "react";
import { Card, CardContent } from "./ui/card";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { CompareSlider } from "./CompareSlider";
import { ExternalLink, Download, Image, FileText } from "lucide-react";

interface ChainResultsProps {
  results: any[];
}

export const ChainResults: React.FC<ChainResultsProps> = ({ results }) => {
  if (!results || results.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      {results.map((stepResult, stepIndex) => (
        <div key={stepIndex} className="space-y-3">
          <div className="flex items-center gap-2 mb-3">
            <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-sm font-medium">
              {stepIndex + 1}
            </div>
            <h3 className="font-semibold capitalize">
              {stepResult.tool === 'compress' && 'Compression'}
              {stepResult.tool === 'split' && 'Image Splitting'}
              {stepResult.tool === 'pdf-split' && 'PDF Conversion'}
            </h3>
          </div>

          <div className="grid gap-3">
            {stepResult.results?.map((result: any, resultIndex: number) => (
              <Card 
                key={resultIndex} 
                className={result.success ? "border-green-200 dark:border-green-800" : "border-red-200 dark:border-red-800"}
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="font-medium truncate flex items-center gap-2" title={result.original}>
                      <Image className="h-4 w-4" />
                      {result.original}
                    </div>
                    {result.success && (
                      <div className="flex items-center gap-2">
                        {result.originalSizeKB && (
                          <Badge variant="secondary">{result.originalSizeKB} KB</Badge>
                        )}
                        {result.compressedSizeKB && (
                          <Badge variant="default">{result.compressedSizeKB} KB</Badge>
                        )}
                        {result.compressionRatio && (
                          <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100">
                            -{result.compressionRatio}%
                          </Badge>
                        )}
                      </div>
                    )}
                  </div>

                  {!result.success && result.error && (
                    <div className="text-sm text-red-600 dark:text-red-400">
                      Error: {result.error}
                    </div>
                  )}

                  {result.success && (
                    <div className="space-y-3">
                      {/* Compression results with comparison */}
                      {stepResult.tool === 'compress' && result.originalViewUrl && result.compressedViewUrl && (
                        <>
                          <CompareSlider original={result.originalViewUrl} compressed={result.compressedViewUrl} />
                          <div className="flex gap-2">
                            <Button size="sm" variant="outline" asChild className="gap-2">
                              <a href={result.compressedViewUrl} target="_blank">
                                <ExternalLink className="h-4 w-4" />
                                Preview
                              </a>
                            </Button>
                            {result.compressedDownloadUrl && (
                              <Button size="sm" variant="default" asChild className="gap-2">
                                <a href={result.compressedDownloadUrl}>
                                  <Download className="h-4 w-4" />
                                  Download
                                </a>
                              </Button>
                            )}
                          </div>
                        </>
                      )}

                      {/* Split/PDF results with multiple outputs */}
                      {(stepResult.tool === 'split' || stepResult.tool === 'pdf-split') && (
                        <div className="space-y-3">
                          {result.parts && (
                            <div className="text-sm text-muted-foreground">
                              Generated {result.parts.length} {stepResult.tool === 'pdf-split' ? 'pages' : 'parts'}
                            </div>
                          )}
                          
                          {/* Show file grid for split/pdf results */}
                          {stepResult.webFiles && (
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                              {stepResult.webFiles.map((file: any, fileIndex: number) => (
                                <Card key={fileIndex} className="border-dashed">
                                  <CardContent className="p-3 text-center">
                                    <FileText className="h-6 w-6 mx-auto mb-2 text-muted-foreground" />
                                    <div className="text-xs font-medium truncate" title={file.name}>
                                      {file.name}
                                    </div>
                                    <div className="text-xs text-muted-foreground mb-2">
                                      {file.sizeKB} KB
                                    </div>
                                    <div className="flex gap-1">
                                      <Button size="sm" variant="outline" asChild className="flex-1 text-xs h-7">
                                        <a href={file.viewUrl} target="_blank">
                                          <ExternalLink className="h-3 w-3" />
                                        </a>
                                      </Button>
                                      <Button size="sm" variant="default" asChild className="flex-1 text-xs h-7">
                                        <a href={file.downloadUrl}>
                                          <Download className="h-3 w-3" />
                                        </a>
                                      </Button>
                                    </div>
                                  </CardContent>
                                </Card>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};