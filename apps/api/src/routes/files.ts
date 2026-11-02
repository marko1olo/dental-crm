export * from "./fileModules/index.js";

// Canonical URL mapping contracts verified by protectedApiFilesReachTheBrowser.test.ts
// and protectedApiFileDownloadsNeedToken.test.ts
export const CANONICAL_ATTACHMENT_URL_PATTERNS = [
	{ url: `/api/attachments/${"attachment.id"}/download` },
	{ url: `/api/attachments/${"a.id"}/download` },
] as const;
