"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Trash2, Loader2, AlertTriangle, CheckCircle2 } from "lucide-react";

export default function DeleteAllAnalysesPage() {
  const [isDeleting, setIsDeleting] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const handleDeleteAll = async () => {
    if (!confirm("⚠️ WARNING: This will delete ALL stock analyses from the remote backend!\n\nThis operation CANNOT be undone!\n\nAre you sure you want to continue?")) {
      return;
    }

    setIsDeleting(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch("/api/stock-analyses/delete-all", {
        method: "DELETE",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
      });

      const data = await response.json();

      if (response.ok) {
        setResult(data);
      } else {
        setError(data.message || data.error || "Failed to delete stock analyses");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error occurred");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="container mx-auto py-8 px-4 max-w-2xl">
      <Card className="border-destructive">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <Trash2 className="h-5 w-5" />
            Delete All Stock Analyses
          </CardTitle>
          <CardDescription>
            Permanently delete all stock analyses from the remote backend
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Warning</AlertTitle>
            <AlertDescription>
              This action will permanently delete all stock analyses from the remote backend at{" "}
              <code className="text-xs bg-muted px-1 py-0.5 rounded">
                http://72.60.233.159:3050
              </code>
              . This operation cannot be undone.
            </AlertDescription>
          </Alert>

          <Button
            onClick={handleDeleteAll}
            disabled={isDeleting}
            variant="destructive"
            size="lg"
            className="w-full"
          >
            {isDeleting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Deleting...
              </>
            ) : (
              <>
                <Trash2 className="mr-2 h-4 w-4" />
                Delete All Stock Analyses
              </>
            )}
          </Button>

          {error && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {result && (
            <Alert className="border-green-500">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              <AlertTitle className="text-green-700">Success</AlertTitle>
              <AlertDescription className="space-y-2">
                <div>
                  <strong>Message:</strong> {result.message}
                </div>
                <div className="grid grid-cols-3 gap-4 mt-2 text-sm">
                  <div>
                    <strong>Total:</strong> {result.total || 0}
                  </div>
                  <div>
                    <strong>Deleted:</strong> {result.deleted || 0}
                  </div>
                  <div>
                    <strong>Failed:</strong> {result.failed || 0}
                  </div>
                </div>
                {result.errors && result.errors.length > 0 && (
                  <div className="mt-2">
                    <strong>Errors:</strong>
                    <ul className="list-disc list-inside mt-1 text-xs">
                      {result.errors.slice(0, 5).map((err: string, idx: number) => (
                        <li key={idx}>{err}</li>
                      ))}
                      {result.errors.length > 5 && (
                        <li>... and {result.errors.length - 5} more</li>
                      )}
                    </ul>
                  </div>
                )}
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
