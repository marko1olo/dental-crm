/**
 * Browser-safe stubs for Node built-in modules (`node:os`, `node:zlib`, `node:crypto`)
 * when shared server/desktop utilities are bundled into `@dental/web`.
 */

export function networkInterfaces(): Record<string, never[]> {
	return {};
}

export function gunzipSync(_input: Uint8Array): Uint8Array {
	throw new Error("node:zlib gunzipSync is only supported in Node/Desktop environments");
}

export function gzipSync(_input: Uint8Array): Uint8Array {
	throw new Error("node:zlib gzipSync is only supported in Node/Desktop environments");
}

export function createHash(): never {
	throw new Error("node:crypto createHash is only supported in Node/Desktop environments");
}

export function randomUUID(): string {
	return typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
		? crypto.randomUUID()
		: "";
}

export default {
	networkInterfaces,
	gunzipSync,
	gzipSync,
	createHash,
	randomUUID,
};
