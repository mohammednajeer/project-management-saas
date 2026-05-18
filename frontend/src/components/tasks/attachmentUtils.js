import {
  Archive,
  File,
  FileImage,
  FileText,
  FileType,
  FileArchive,
} from "lucide-react";

const IMAGE_EXTENSIONS = new Set(["jpg", "jpeg", "png", "gif", "webp", "bmp", "svg", "avif"]);
const DOCUMENT_EXTENSIONS = new Set(["doc", "docx"]);
const ARCHIVE_EXTENSIONS = new Set(["zip", "rar", "7z", "tar", "gz"]);

export function getFilenameFromUrl(fileUrl = "") {
  if (!fileUrl) return "Untitled attachment";

  try {
    const url = new URL(fileUrl);
    const filename = url.pathname.split("/").filter(Boolean).pop();
    return decodeURIComponent(filename || "Untitled attachment");
  } catch {
    const filename = String(fileUrl).split("?")[0].split("/").filter(Boolean).pop();
    return decodeURIComponent(filename || "Untitled attachment");
  }
}

export function getFileExtension(fileUrl = "") {
  const filename = getFilenameFromUrl(fileUrl);
  const cleanName = filename.split("?")[0].split("#")[0];
  const extension = cleanName.includes(".") ? cleanName.split(".").pop() : "";
  return extension.toLowerCase();
}

export function isImageFile(fileUrl = "") {
  return IMAGE_EXTENSIONS.has(getFileExtension(fileUrl));
}

export function getFileMeta(fileUrl = "") {
  const extension = getFileExtension(fileUrl);

  if (IMAGE_EXTENSIONS.has(extension)) {
    return { label: extension || "image", Icon: FileImage, tone: "image" };
  }

  if (extension === "pdf") {
    return { label: "PDF", Icon: FileType, tone: "pdf" };
  }

  if (DOCUMENT_EXTENSIONS.has(extension)) {
    return { label: extension.toUpperCase(), Icon: FileText, tone: "document" };
  }

  if (ARCHIVE_EXTENSIONS.has(extension)) {
    const ArchiveIcon = FileArchive || Archive;
    return { label: extension.toUpperCase(), Icon: ArchiveIcon, tone: "archive" };
  }

  if (extension === "txt") {
    return { label: "TXT", Icon: FileText, tone: "text" };
  }

  return { label: extension ? extension.toUpperCase() : "FILE", Icon: File, tone: "unknown" };
}

export function formatAttachmentDate(value) {
  if (!value) return "Just now";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Just now";

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}
