import { readFileSync } from "node:fs";

const appSource = readFileSync("apps/web/src/App.tsx", "utf8");
const serverSource = readFileSync("apps/api/src/server.ts", "utf8");

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function requireIn(source, needle, message) {
  assert(source.includes(needle), message);
}

function forbidIn(source, needle, message) {
  assert(!source.includes(needle), message);
}

function sourceBetween(source, startNeedle, endNeedle) {
  const start = source.indexOf(startNeedle);
  assert(start >= 0, `Missing source start: ${startNeedle}`);
  const end = source.indexOf(endNeedle, start + startNeedle.length);
  assert(end > start, `Missing source end after ${startNeedle}: ${endNeedle}`);
  return source.slice(start, end);
}

const openIssuedDocumentHtmlSource = sourceBetween(
  appSource,
  "async function openIssuedDocumentHtml(documentId: string)",
  "async function downloadIssuedDocumentPdf(documentId: string)"
);
const downloadIssuedDocumentHtmlSource = sourceBetween(
  appSource,
  "async function downloadIssuedDocumentHtml(documentId: string",
  "async function openIssuedDocumentHtml(documentId: string)"
);

requireIn(
  appSource,
  "function issuedDocumentHtmlPreviewUrl(documentId: string): string",
  "App.tsx must centralize the issued HTML preview URL."
);
requireIn(
  appSource,
  "return `/api/documents/${encodeURIComponent(documentId)}/html`;",
  "Issued HTML preview must use the server API URL and encode the document id."
);
requireIn(
  appSource,
  "return `${issuedDocumentHtmlPreviewUrl(documentId)}?download=1`;",
  "Issued HTML download must derive from the same server API URL with download=1."
);

requireIn(
  openIssuedDocumentHtmlSource,
  'window.open(previewUrl, "_blank", "noopener,noreferrer")',
  "Issued HTML preview must open the API URL directly so server response headers remain in force."
);
requireIn(
  openIssuedDocumentHtmlSource,
  "clinicalAdminSecretSession.trim()",
  "Secret-header sessions must not open a predictable unauthenticated preview tab."
);
requireIn(
  openIssuedDocumentHtmlSource,
  "не может передать секрет администратора клиники",
  "Secret-header sessions must explain why the archive download fallback is used."
);
forbidIn(
  openIssuedDocumentHtmlSource,
  "fetch(",
  "Issued HTML preview must not fetch and clone server HTML into a browser-owned document."
);
forbidIn(openIssuedDocumentHtmlSource, "response.blob()", "Issued HTML preview must not convert server HTML to a blob.");
forbidIn(openIssuedDocumentHtmlSource, "URL.createObjectURL", "Issued HTML preview must not create a blob: preview URL.");
forbidIn(openIssuedDocumentHtmlSource, "window.setTimeout", "Issued HTML preview must not rely on delayed object URL revocation.");
requireIn(
  openIssuedDocumentHtmlSource,
  "await downloadIssuedDocumentHtml(documentId, { preserveError: true });",
  "Popup-blocked issued HTML preview must immediately invoke the safe archive download fallback."
);
requireIn(
  openIssuedDocumentHtmlSource,
  "Скачать HTML",
  "Popup-blocked fallback message must point operators to the visible HTML download action."
);

requireIn(
  downloadIssuedDocumentHtmlSource,
  "fetch(issuedDocumentHtmlDownloadUrl(documentId), { cache: \"no-store\", headers: denteClinicalReadHeaders() })",
  "Issued HTML download fallback must keep the authenticated no-store fetch path."
);
requireIn(
  downloadIssuedDocumentHtmlSource,
  "if (!options.preserveError) setError(null);",
  "Popup-blocked fallback must not erase the visible fallback guidance after a successful download."
);

requireIn(serverSource, 'reply.header("Cache-Control", "no-store")', "API responses must keep no-store headers.");
requireIn(serverSource, 'reply.header("X-Content-Type-Options", "nosniff")', "API responses must keep nosniff headers.");
requireIn(serverSource, 'reply.header("Content-Security-Policy", contentSecurityPolicy)', "API responses must keep CSP headers.");
requireIn(
  serverSource,
  'contentType.includes("text/html")',
  "Server CSP must keep a dedicated policy for HTML document responses."
);
requireIn(
  serverSource,
  "default-src 'none'; style-src 'unsafe-inline'; img-src data:; frame-ancestors 'none'; base-uri 'none'; form-action 'none'",
  "Issued HTML server preview must stay under the restrictive HTML CSP."
);

console.log(
  JSON.stringify(
    {
      ok: true,
      previewOpensServerUrl: true,
      secretHeaderSessionUsesDownloadFallback: true,
      blobPreviewForbidden: true,
      popupBlockedDownloadFallback: true,
      serverHtmlHeadersChecked: ["Cache-Control", "X-Content-Type-Options", "Content-Security-Policy"]
    },
    null,
    2
  )
);
