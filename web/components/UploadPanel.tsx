"use client";

import { Loader2, Upload } from "lucide-react";
import { useRef, useState } from "react";

interface Props {
  loading: boolean;
  onUpload: (file: File, sensorName: string) => void;
}

export function UploadPanel({ loading, onUpload }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [sensorName, setSensorName] = useState("My Sensor");
  const [dragOver, setDragOver] = useState(false);

  function handleFile(file: File | undefined) {
    if (!file || !file.name.endsWith(".csv")) return;
    onUpload(file, sensorName);
  }

  return (
    <div className="space-y-3">
      <h2 className="text-sm font-medium uppercase tracking-widest text-slate-400">
        Upload Sensor CSV
      </h2>
      <input
        type="text"
        value={sensorName}
        onChange={(e) => setSensorName(e.target.value)}
        placeholder="Sensor name"
        className="w-full rounded-xl border border-slate-700 bg-slate-900/50 px-4 py-2.5 text-sm text-slate-100 outline-none focus:border-emerald-500/50"
      />
      <div
        role="button"
        tabIndex={0}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          handleFile(e.dataTransfer.files[0]);
        }}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => e.key === "Enter" && inputRef.current?.click()}
        className={`flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-6 py-8 transition ${
          dragOver
            ? "border-emerald-500/60 bg-emerald-500/5"
            : "border-slate-700 bg-slate-900/30 hover:border-slate-500"
        }`}
      >
        {loading ? (
          <Loader2 className="h-8 w-8 animate-spin text-emerald-400" />
        ) : (
          <Upload className="h-8 w-8 text-slate-500" />
        )}
        <p className="mt-3 text-sm font-medium text-slate-300">
          Drop CSV or click to browse
        </p>
        <p className="mt-1 text-xs text-slate-500">
          Required columns: timestamp, temp_c
        </p>
        <input
          ref={inputRef}
          type="file"
          accept=".csv"
          className="hidden"
          onChange={(e) => handleFile(e.target.files?.[0])}
        />
      </div>
    </div>
  );
}
