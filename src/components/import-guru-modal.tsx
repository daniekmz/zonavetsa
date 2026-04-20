"use client";

import { useRef, useState } from "react";
import { AlertCircle, CheckCircle, Download, Upload } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface ImportGuruModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImportComplete?: (result: { imported: number; skipped: number }) => void;
}

export function ImportGuruModal({ open, onOpenChange, onImportComplete }: ImportGuruModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{
    imported?: number;
    skipped?: number;
    errors?: string[];
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    if (
      selectedFile.type === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
      selectedFile.type === "application/vnd.ms-excel"
    ) {
      setFile(selectedFile);
      setError(null);
      setResult(null);
      return;
    }

    setError("File harus format Excel (.xlsx atau .xls)");
  };

  const handleDownloadTemplate = () => {
    const XLSX = require("xlsx");
    const templateData = [
      ["Kode Guru", "Nama Lengkap", "NIP", "Email", "Nomor HP", "Mata Pelajaran"],
      ["G001", "Budi Santoso", "199012312020011001", "budi@smkvetsa.sch.id", "081234567890", "Matematika"],
      ["G002", "Siti Lestari", "198908172019122002", "siti@smkvetsa.sch.id", "081234567891", "Bahasa Indonesia"],
    ];
    const worksheet = XLSX.utils.aoa_to_sheet(templateData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Template Guru");
    XLSX.writeFile(workbook, "template_import_guru.xlsx");
  };

  const handleImport = async () => {
    if (!file) return;
    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/import/guru", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();
      if (!response.ok) {
        setError(data.error || "Terjadi kesalahan");
        return;
      }

      setResult(data);
      onImportComplete?.(data);
    } catch {
      setError("Terjadi kesalahan saat mengupload file");
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setFile(null);
    setError(null);
    setResult(null);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Import Data Guru</DialogTitle>
          <DialogDescription>
            Upload file Excel untuk import data guru. Pastikan format kolom mengikuti template.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Button variant="outline" size="sm" onClick={handleDownloadTemplate} type="button">
              <Download className="mr-2 h-4 w-4" />
              Download Template
            </Button>
          </div>

          <div className="rounded-lg border-2 border-dashed border-gray-200 p-6 text-center">
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileChange}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="mx-auto flex flex-col items-center gap-2"
              type="button"
            >
              {file ? <CheckCircle className="h-8 w-8 text-green-500" /> : <Upload className="h-8 w-8 text-gray-400" />}
              <span className="text-sm text-gray-600">{file ? file.name : "Klik untuk pilih file Excel"}</span>
            </button>
          </div>

          {error && (
            <div className="flex items-center gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-600">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {result && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 rounded-lg bg-green-50 p-3 text-sm text-green-600">
                <CheckCircle className="h-4 w-4 flex-shrink-0" />
                <span>
                  Berhasil import {result.imported} guru, {result.skipped} di-skip
                </span>
              </div>
              {result.errors && result.errors.length > 0 && (
                <div className="max-h-32 overflow-y-auto text-xs text-gray-600">
                  <p className="font-medium">Errors:</p>
                  <ul className="list-inside list-disc">
                    {result.errors.slice(0, 5).map((err, index) => (
                      <li key={index}>{err}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} type="button">
            {result ? "Tutup" : "Batal"}
          </Button>
          {!result && (
            <Button onClick={handleImport} disabled={!file || isLoading}>
              {isLoading ? "Memproses..." : "Import"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

