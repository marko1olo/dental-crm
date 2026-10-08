/**
 * DicomProcessorService.ts — канонический фасад сервиса обработки DICOM.
 * Полная реализация декомпозирована в строгий DAG модулей: ./dicomProcessor/
 *
 * Слои:
 * - Layer 0: ./dicomProcessor/types.js
 * - Layer 1: ./dicomProcessor/normalization.js
 * - Layer 1: ./dicomProcessor/pathGuards.js
 * - Layer 1: ./dicomProcessor/headerParser.js
 * - Layer 1: ./dicomProcessor/previewRenderer.js
 * - Layer 1: ./dicomProcessor/manifestParser.js
 * - Layer 3: ./dicomProcessor/service.js
 * - Layer 5: ./dicomProcessor/index.js
 */

export * from "./dicomProcessor/index.js";
export { DicomProcessorService as default } from "./dicomProcessor/service.js";
