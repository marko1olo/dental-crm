/**
 * DENTE Dental CRM — Analytics Doctor Metrics Engine.
 *
 * Re-exports decomposed modular architecture (Engineering Rule 1.1 & 1.5):
 * - analyticsDoctorMetricTypes: Types, cell formatters, thresholds, and error constants.
 * - analyticsDoctorPayloadParser: Server payload parser and status handlers.
 * - analyticsDoctorLocalCompute: Offline and local analytics computation engine.
 */

export * from "./analyticsDoctorMetricTypes.js";
export * from "./analyticsDoctorPayloadParser.js";
export * from "./analyticsDoctorLocalCompute.js";
