"use client";

import { useState, useRef } from "react";
import { Upload, Download, CheckCircle, AlertCircle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

interface ImportSiswaModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImportComplete?: (result: { imported: number; skipped: number }) => void;
}

export function ImportSiswaModal({
  open,
  onOpenChange,
  onImportComplete,
}: ImportSiswaModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<{
    imported?: number;
    skipped?: number;
    errors?: string[];
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (
        selectedFile.type ===
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
        selectedFile.type === "application/vnd.ms-excel"
      ) {
        setFile(selectedFile);
        setError(null);
        setResult(null);
      } else {
        setError("File harus format Excel (.xlsx atau .xls)");
      }
    }
  };

  const handleDownloadTemplate = () => {
    const XLSX = require("xlsx");
    const templateData = [
      ["NIS", "Nama Lengkap", "Email", "Nomor HP", "Alamat", "Kelas"],
      ["12345", "John Doe", "john@email.com", "081234567890", "Jakarta", "X TKJ 1"],
      ["12346", "Jane Doe", "jane@email.com", "081234567891", "Bandung", "X TKJ 2"],
    ];
    const worksheet = XLSX.utils.aoa_to_sheet(templateData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Template Siswa");
    XLSX.writeFile(workbook, "template_import_siswa.xlsx");
  };

  const handleImport = async () => {
    if (!file) return;

    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/import/siswa", {
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
    } catch (err) {
      setError("Terjadi kesalahan saat mengupload file");
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setFile(null);
    setResult(null);
    setError(null);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Import Data Siswa</DialogTitle>
          <DialogDescription>
            Upload file Excel untuk import data siswa. Pastikan format sesuai
            template.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownloadTemplate}
              type="button"
            >
              <Download className="w-4 h-4 mr-2" />
              Download Template
            </Button>
          </div>

          <div className="border-2 border-dashed border-gray-200 rounded-lg p-6 text-center">
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileChange}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex flex-col items-center gap-2 mx-auto"
              type="button"
            >
              {file ? (
                <CheckCircle className="w-8 h-8 text-green-500" />
              ) : (
                <Upload className="w-8 h-8 text-gray-400" />
              )}
              <span className="text-sm text-gray-600">
                {file ? file.name : "Klik untuk pilih file Excel"}
              </span>
            </button>
          </div>

          {error && (
            <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 p-3 rounded-lg">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {result && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-green-600 bg-green-50 p-3 rounded-lg">
                <CheckCircle className="w-4 h-4 flex-shrink-0" />
                <span>
                  Berhasil import {result.imported} siswa, {result.skipped}{" "}
                  di-skip
                </span>
              </div>
              {result.errors && result.errors.length > 0 && (
                <div className="text-xs text-gray-600 max-h-32 overflow-y-auto">
                  <p className="font-medium">Errors:</p>
                  <ul className="list-disc list-inside">
                    {result.errors.slice(0, 5).map((err, i) => (
                      <li key={i}>{err}</li>
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
