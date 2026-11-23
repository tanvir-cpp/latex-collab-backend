/** Allowed project file paths: relative, no `..`, one of the supported text extensions. */
export const DOCUMENT_PATH_REGEX = /^(?!.*\.\.)(?!\/)[A-Za-z0-9_\-./]+\.(tex|bib|sty|cls|txt|md)$/;
export const DOCUMENT_PATH_MESSAGE =
  'path must be relative and end in .tex, .bib, .sty, .cls, .txt or .md';
export const MAX_DOCUMENT_CHARS = 1_000_000;
export const MAX_UPLOAD_BYTES = 1_000_000;
