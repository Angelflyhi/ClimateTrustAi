"use client";

import { useState, useCallback } from "react";
import {
  Upload,
  X,
  CheckCircle,
  Info,
  FileText,
  Activity,
} from "lucide-react";

interface Props {
  onFile: (file: File) => void;
  onAnalyze: () => void;
  loading: boolean;
  file: File | null;
  onClear: () => void;
}

const EXAMPLE_CSV = `timestamp,temp_c,humidity_pct
2026-06-01T00:00:00,28.4,62.1
2026-06-01T01:00:00,27.9,63.5
2026-06-01T02:00:00,27.3,64.8
2026-06-01T03:00:00,26.8,65.2
2026-06-01T04:00:00,26.4,66.0`;

export default function UploadPanel({
  onFile,
  onAnalyze,
  loading,
  file,
  onClear,
}: Props) {
  const [dragOver, setDragOver] = useState(false);
  const [showExample, setShowExample] = useState(false);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const dropped = e.dataTransfer.files[0];
      if (dropped?.name.endsWith(".csv")) {
        onFile(dropped);
      }
    },
    [onFile]
  );

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const picked = e.target.files?.[0];
      if (picked) onFile(picked);
    },
    [onFile]
  );

  return (
    <div className="glass-card" style={{ padding: 28 }}>
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          marginBottom: 20,
        }}
      >
        <Upload size={18} style={{ color: "var(--accent-blue)" }} />
        <h2 style={{ fontSize: 16, fontWeight: 600, margin: 0 }}>
          Upload CSV
        </h2>
        <button
          onClick={() => setShowExample((v) => !v)}
          style={{
            marginLeft: "auto",
            background: "none",
            border: "none",
            cursor: "pointer",
            color: "var(--text-muted)",
            display: "flex",
            alignItems: "center",
            gap: 4,
            fontSize: 12,
            padding: "2px 6px",
            borderRadius: 6,
            transition: "color 0.15s",
          }}
          id="show-example-btn"
          title="Show example CSV format"
        >
          <FileText size={12} />
          Example
        </button>
      </div>

      {/* Example CSV format */}
      {showExample && (
        <div
          style={{
            marginBottom: 16,
            padding: "12px 14px",
            background: "rgba(6,182,212,0.05)",
            border: "1px solid rgba(6,182,212,0.15)",
            borderRadius: 10,
          }}
        >
          <div
            style={{
              fontSize: 11,
              color: "var(--accent-cyan)",
              fontWeight: 600,
              marginBottom: 8,
              textTransform: "uppercase",
              letterSpacing: "0.05em",
            }}
          >
            Example CSV format
          </div>
          <pre
            className="mono"
            style={{
              fontSize: 11,
              color: "var(--text-secondary)",
              margin: 0,
              whiteSpace: "pre-wrap",
              lineHeight: 1.6,
            }}
          >
            {EXAMPLE_CSV}
          </pre>
        </div>
      )}

      {/* Drop Zone */}
      <div
        className={`drop-zone ${dragOver ? "active" : ""}`}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => document.getElementById("csv-file-input")?.click()}
        id="csv-drop-zone"
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ")
            document.getElementById("csv-file-input")?.click();
        }}
      >
        <input
          id="csv-file-input"
          type="file"
          accept=".csv"
          style={{ display: "none" }}
          onChange={handleFileInput}
        />

        {file ? (
          <div>
            <CheckCircle
              size={32}
              style={{ color: "#10b981", margin: "0 auto 12px", display: "block" }}
            />
            <div style={{ fontWeight: 600, marginBottom: 4 }}>{file.name}</div>
            <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
              {(file.size / 1024).toFixed(1)} KB · Click to change
            </div>
          </div>
        ) : (
          <div>
            <Upload
              size={32}
              style={{
                color: dragOver ? "var(--accent-blue)" : "var(--text-muted)",
                margin: "0 auto 12px",
                display: "block",
                transition: "color 0.2s",
              }}
            />
            <div style={{ fontWeight: 500, marginBottom: 6 }}>
              {dragOver ? "Drop it!" : "Drop a CSV or click to browse"}
            </div>
            <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
              Required:{" "}
              <span className="mono" style={{ color: "var(--accent-cyan)" }}>
                timestamp
              </span>
              ,{" "}
              <span className="mono" style={{ color: "var(--accent-cyan)" }}>
                temp_c
              </span>
              {"  "}·{"  "}Optional:{" "}
              <span className="mono" style={{ color: "var(--text-secondary)" }}>
                humidity_pct
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Action buttons */}
      {file && (
        <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
          <button
            className="btn-primary"
            onClick={onAnalyze}
            disabled={loading}
            id="analyze-upload-btn"
            style={{ flex: 1 }}
          >
            {loading ? (
              <span
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                }}
              >
                <div className="spinner" />
                Analyzing…
              </span>
            ) : (
              <span
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                }}
              >
                <Activity size={14} />
                Run Analysis
              </span>
            )}
          </button>
          <button
            className="btn-secondary"
            onClick={onClear}
            style={{ padding: "10px 14px" }}
            id="clear-file-btn"
            title="Remove file"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* Info hint */}
      {!file && (
        <div
          style={{
            marginTop: 20,
            padding: "12px 16px",
            background: "rgba(59,130,246,0.06)",
            border: "1px solid rgba(59,130,246,0.15)",
            borderRadius: 10,
            fontSize: 12,
            color: "var(--text-secondary)",
            display: "flex",
            gap: 8,
            lineHeight: 1.5,
          }}
        >
          <Info size={14} style={{ flexShrink: 0, marginTop: 1 }} />
          <span>
            Your data is processed in-memory and{" "}
            <strong style={{ color: "var(--text-primary)" }}>never stored</strong>
            . Open-Meteo reference data is fetched for your sensor&apos;s date
            range automatically.
          </span>
        </div>
      )}
    </div>
  );
}
