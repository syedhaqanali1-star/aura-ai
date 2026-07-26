"use client";

import {
  File,
  FileCode2,
  FileImage,
  FileSpreadsheet,
  FileText,
  FileVideo,
  Music,
  X,
} from "lucide-react";

export type UploadFile = {
  id: string;
  file: File;
};

type FilePreviewProps = {
  files: UploadFile[];
  onRemove: (id: string) => void;
};

function getIcon(file: File) {
  const type = file.type;

  if (type.startsWith("image/")) {
    return FileImage;
  }

  if (
    type.includes("pdf") ||
    type.includes("text") ||
    type.includes("word")
  ) {
    return FileText;
  }

  if (
    type.includes("excel") ||
    type.includes("spreadsheet") ||
    file.name.endsWith(".csv")
  ) {
    return FileSpreadsheet;
  }

  if (
    file.name.endsWith(".ts") ||
    file.name.endsWith(".tsx") ||
    file.name.endsWith(".js") ||
    file.name.endsWith(".jsx") ||
    file.name.endsWith(".py") ||
    file.name.endsWith(".java") ||
    file.name.endsWith(".cpp") ||
    file.name.endsWith(".go") ||
    file.name.endsWith(".rs")
  ) {
    return FileCode2;
  }

  if (type.startsWith("video/")) {
    return FileVideo;
  }

  if (type.startsWith("audio/")) {
    return Music;
  }

  return File;
}

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024)
    return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024)
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;

  return `${(bytes / 1024 / 1024 / 1024).toFixed(1)} GB`;
}

export default function FilePreview({
  files,
  onRemove,
}: FilePreviewProps) {
  if (files.length === 0) return null;

  return (
    <div className="space-y-2 border-b border-white/[0.06] p-3">
      {files.map((upload) => {
        const Icon = getIcon(upload.file);

        return (
          <div
            key={upload.id}
            className="flex items-center justify-between rounded-xl border border-white/[0.06] bg-white/[0.03] px-3 py-2"
          >
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-violet-500/10 text-violet-300">
                <Icon size={18} />
              </div>

              <div className="min-w-0">
                <p className="truncate text-sm text-white">
                  {upload.file.name}
                </p>

                <p className="text-xs text-neutral-500">
                  {formatSize(upload.file.size)}
                </p>
              </div>
            </div>

            <button
              onClick={() => onRemove(upload.id)}
              className="rounded-lg p-2 text-neutral-500 transition hover:bg-white/5 hover:text-red-400"
              aria-label="Remove file"
            >
              <X size={16} />
            </button>
          </div>
        );
      })}
    </div>
  );
}