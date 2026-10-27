/**
 * DICOMweb WADO-RS & QIDO-RS Route Facade (Mandate 8b <= 15 lines).
 */
export { normalizeUid, parseHttpRange, readDicomIdentity } from "./dicomwebHelpers.js";
export type { DicomFileIdentity, RangeSpecification } from "./dicomwebHelpers.js";
export * from "./dicomweb/modules/qidoStudiesRoute.js";
export * from "./dicomweb/modules/qidoSeriesRoute.js";
export * from "./dicomweb/modules/qidoInstancesRoute.js";
export * from "./dicomweb/modules/wadoMetadataRoute.js";
export * from "./dicomweb/modules/wadoInstanceRoute.js";
export * from "./dicomweb/modules/wadoFramesRoute.js";
export * from "./dicomweb/modules/dicomwebRegistration.js";
