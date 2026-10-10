/**
 * DENTE CRM — Staff Activity & Forensic Telemetry Service (Canonical Facade)
 *
 * Декомпозирован в модульный направленный ациклический граф (DAG) в ./telemetry/
 * Сохраняет 100% обратную совместимость публичного API и контрактов типов.
 */

export * from "./telemetry/index.js";
export { default } from "./telemetry/index.js";
