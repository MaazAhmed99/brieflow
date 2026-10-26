import { FileImageIcon, FileTextIcon } from "lucide-react";
import { formatDate } from "@/lib/format";

export type FileItem = {
  id: string;
  name: string;
  url: string;
  contentType: string;
  sizeBytes: number;
  createdAt: Date;
  uploaderName: string | null;
};

function formatSize(bytes: number) {
  return bytes < 1024 * 1024 ? `${Math.round(bytes / 1024)} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

/** Project files with download links. */
export function FileList({ files }: { files: FileItem[] }) {
  if (files.length === 0) return <p className="text-sm text-muted-foreground">No files yet.</p>;
  return (
    <ul className="divide-y">
      {files.map((file) => {
        const Icon = file.contentType.startsWith("image/") ? FileImageIcon : FileTextIcon;
        return (
          <li key={file.id} className="flex items-center gap-3 py-2.5 text-sm">
            <Icon className="size-5 shrink-0 text-muted-foreground" aria-hidden="true" />
            <span className="min-w-0 flex-1">
              <a href={file.url} target="_blank" rel="noreferrer" className="block truncate font-medium hover:text-primary">
                {file.name}
              </a>
              <span className="block text-xs text-muted-foreground">
                {formatSize(file.sizeBytes)} · {file.uploaderName ?? "Someone"} · {formatDate(file.createdAt)}
              </span>
            </span>
          </li>
        );
      })}
    </ul>
  );
}
