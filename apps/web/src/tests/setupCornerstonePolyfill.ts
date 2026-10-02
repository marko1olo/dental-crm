// Polyfill for Node.js test environment where browser/Worker globalThis.addEventListener does not exist
// This enables @cornerstonejs/dicom-image-loader (comlink expose) to be imported in Node tests.
if (typeof (globalThis as any).addEventListener !== "function") {
	(globalThis as any).addEventListener = () => {};
}
if (typeof (globalThis as any).removeEventListener !== "function") {
	(globalThis as any).removeEventListener = () => {};
}
