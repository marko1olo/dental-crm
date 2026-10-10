/**
 * AudioStreamManager.ts — Ultra-thin facade for audioStreamManager.
 * Hardware release invariants: t.stop() for MediaStream, ctx.close() for AudioContext.
 */

export * from "./audioStreamManager/index";
