"use client";

import { useEffect, useRef, useState } from "react";
import { Camera, ScanLine, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

// BarcodeDetector is not in the default TypeScript lib
declare global {
  interface Window {
    BarcodeDetector?: {
      new (options?: { formats?: string[] }): {
        detect(source: HTMLVideoElement): Promise<Array<{ rawValue: string }>>;
      };
      getSupportedFormats?(): Promise<string[]>;
    };
  }
}

const BARCODE_FORMATS = [
  "ean_13", "ean_8", "upc_a", "upc_e",
  "code_128", "code_39", "code_93",
  "qr_code", "data_matrix", "itf",
];

interface BarcodeScannerProps {
  onScan: (value: string) => void;
}

export function BarcodeScanner({ onScan }: BarcodeScannerProps) {
  const [open, setOpen] = useState(false);
  const [supported, setSupported] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);
  const detectorRef = useRef<InstanceType<NonNullable<Window["BarcodeDetector"]>> | null>(null);

  useEffect(() => {
    setSupported(typeof window !== "undefined" && "BarcodeDetector" in window);
  }, []);

  async function startCamera() {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 720 } },
      });
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      detectorRef.current = new window.BarcodeDetector!({ formats: BARCODE_FORMATS });
      setScanning(true);
      scanLoop();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Camera access denied");
    }
  }

  function scanLoop() {
    if (!videoRef.current || !detectorRef.current) return;

    detectorRef.current
      .detect(videoRef.current)
      .then((barcodes) => {
        if (barcodes.length > 0) {
          const value = barcodes[0].rawValue;
          stopCamera();
          setOpen(false);
          onScan(value);
          return;
        }
        rafRef.current = requestAnimationFrame(scanLoop);
      })
      .catch(() => {
        rafRef.current = requestAnimationFrame(scanLoop);
      });
  }

  function stopCamera() {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    detectorRef.current = null;
    setScanning(false);
  }

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next) stopCamera();
    else if (next && supported) startCamera();
  }

  if (supported === false) return null;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger className="inline-flex h-9 items-center justify-center gap-1.5 rounded-md border border-input bg-background px-3 text-xs font-medium text-foreground shadow-xs transition-colors hover:bg-accent hover:text-accent-foreground shrink-0">
        <Camera className="h-3.5 w-3.5" />
        Scan
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Scan barcode</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          {error ? (
            <div className="flex items-start gap-2 rounded-md bg-destructive/10 p-3 text-xs text-destructive">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          ) : (
            <div className="relative overflow-hidden rounded-lg bg-black aspect-video">
              <video
                ref={videoRef}
                className="h-full w-full object-cover"
                playsInline
                muted
              />
              {/* Scan overlay */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="relative h-40 w-56">
                  {/* Corner marks */}
                  {[
                    "top-0 left-0 border-t-2 border-l-2 rounded-tl",
                    "top-0 right-0 border-t-2 border-r-2 rounded-tr",
                    "bottom-0 left-0 border-b-2 border-l-2 rounded-bl",
                    "bottom-0 right-0 border-b-2 border-r-2 rounded-br",
                  ].map((cls) => (
                    <span key={cls} className={`absolute h-5 w-5 border-primary ${cls}`} />
                  ))}
                  {/* Scan line */}
                  {scanning && (
                    <ScanLine className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-8 w-48 text-primary/70 animate-pulse" />
                  )}
                </div>
              </div>
            </div>
          )}

          <p className="text-xs text-center text-muted-foreground">
            {error
              ? "Check browser permissions and try again."
              : scanning
              ? "Point the camera at a barcode or QR code"
              : "Starting camera…"}
          </p>

          {error && (
            <Button size="sm" className="w-full" onClick={startCamera}>
              Try again
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
