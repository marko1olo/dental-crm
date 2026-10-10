/**
 * UniversalSensorGateway.ts — Мультивендорный аппаратный шлюз и канонический фасад дентальных визиографов.
 *
 * Implements Mandates 8e (Doctor Autonomy, zero sensor lock-in, <50ms capture), 8s (Canonical Authority), 8p.
 * NON_CONFLICTING_USB_POLICY: "Работает параллельно с Vatech EzDent-i, Carestream, Romexis без конфликта за USB"
 * intakeChannel: "hot_folder" — Ожидание снимка (Hot Folder / Автоподхват).
 *
 * Decomposed into modular architecture under ./sensorGateway/ (Layer 0 Types, Layer 1 Drivers, Layer 2 Detection).
 */

export * from "./sensorGateway";
