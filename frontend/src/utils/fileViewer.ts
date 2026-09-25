import { getBackendBaseUrl } from "../services/apiClient";

/**
 * Converts a Base64 Data URI (e.g. data:application/pdf;base64,...) to a standard browser Blob.
 */
export function base64ToBlob(dataUri: string): Blob {
  try {
    const trimmed = dataUri.trim();
    const parts = trimmed.split(",");
    const mimeMatch = parts[0].match(/:(.*?);/);
    const mime = mimeMatch ? mimeMatch[1] : "application/pdf";
    let b64 = (parts.length > 1 ? parts[1] : parts[0]).replace(/\s/g, "");
    if (b64.includes("%")) {
      try {
        b64 = decodeURIComponent(b64);
      } catch {
        // ignore
      }
    }
    // Handle URL-safe Base64 and padding
    b64 = b64.replace(/-/g, "+").replace(/_/g, "/");
    while (b64.length % 4 !== 0) {
      b64 += "=";
    }
    const byteCharacters = atob(b64);
    const byteArrays = new Uint8Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteArrays[i] = byteCharacters.charCodeAt(i);
    }
    return new Blob([byteArrays], { type: mime });
  } catch (err) {
    console.error("Failed to convert base64 to blob:", err);
    return new Blob([], { type: "application/octet-stream" });
  }
}

/**
 * Converts a File or Blob to a Base64 Data URI string.
 */
export function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/**
 * Normalizes any file URL (Base64 data URI, Cloud HTTP URL, or relative backend path)
 * into a safe, usable URL string.
 */
export function resolveFileUrl(url?: string): string {
  if (!url) return "";
  const trimmed = url.trim();
  if (trimmed.startsWith("data:") || trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    return trimmed;
  }
  const clean = trimmed.replace(/\\/g, "/");
  const path = clean.startsWith("/") ? clean : "/" + clean;
  return `${getBackendBaseUrl()}${path}`;
}

/**
 * Safely opens any document/image in a new browser tab.
 * For Base64 strings, creates a transient Blob URL (blob:...) which bypasses
 * Chrome's navigation restriction on top-frame data URIs.
 */
export function openFileInNewTab(url?: string, defaultFilename = "document.pdf"): void {
  if (!url) return;
  const trimmed = url.trim();

  if (trimmed.startsWith("data:")) {
    const blob = base64ToBlob(trimmed);
    const blobUrl = URL.createObjectURL(blob);
    const opened = window.open(blobUrl, "_blank");
    if (!opened) {
      // If popup blocker intervened, trigger download fallback
      downloadFile(trimmed, defaultFilename);
    }
    return;
  }

  const finalUrl = resolveFileUrl(trimmed);
  window.open(finalUrl, "_blank");
}

/**
 * Triggers an immediate browser download for any file URL or Base64 string.
 */
export function downloadFile(url?: string, filename = "document.pdf"): void {
  if (!url) return;
  const trimmed = url.trim();

  let downloadUrl = trimmed;
  let isBlob = false;

  if (trimmed.startsWith("data:")) {
    const blob = base64ToBlob(trimmed);
    downloadUrl = URL.createObjectURL(blob);
    isBlob = true;
  } else {
    downloadUrl = resolveFileUrl(trimmed);
  }

  const a = document.createElement("a");
  a.href = downloadUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);

  if (isBlob) {
    setTimeout(() => URL.revokeObjectURL(downloadUrl), 5000);
  }
}

/**
 * Returns true if the given URL or Base64 data represents a PDF file.
 */
export function isPdf(url?: string): boolean {
  if (!url) return false;
  return (
    url.startsWith("data:application/pdf") ||
    url.toLowerCase().endsWith(".pdf") ||
    url.toLowerCase().includes(".pdf?") ||
    url.toLowerCase().includes("/pdf")
  );
}

/**
 * Returns true if the given URL or Base64 data represents an Image.
 */
export function isImage(url?: string): boolean {
  if (!url) return false;
  return (
    url.startsWith("data:image/") ||
    /\.(png|jpe?g|webp|gif|svg)(\?.*)?$/i.test(url)
  );
}
