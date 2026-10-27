/**
 * index.ts — Канонический фасад AudioStreamManager (Мандат 8b: <= 15 строк).
 */

export * from "./types";
export * from "./audioContextFactory";
export * from "./audioPcmProcessor";
export * from "./audioVadDetector";
export * from "./audioSessionManager";
export * from "./audioStreamConfig";
export * from "./audioStreamLifecycle";
export * from "./audioStreamPcmHandler";
export * from "./audioStreamFallback";
export { AudioStreamManager } from "./AudioStreamManagerClass";
