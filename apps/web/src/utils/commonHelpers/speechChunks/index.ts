/**
 * @file apps/web/src/utils/commonHelpers/speechChunks/index.ts
 * @description Master Barrel exporting all speech chunk processing, VAD, audio DSP,
 * offline queues, and associated clinical domain helpers.
 */

export * from "./types";
export type * from "./types";
export * from "./domainLabels";
export * from "./domainGuards";
export * from "./telegramUtils";
export * from "./reexports";
export * from "./pcmAudioUtils";
export * from "./vadSilenceDetector";
export * from "./chunkStreamingPipeline";
