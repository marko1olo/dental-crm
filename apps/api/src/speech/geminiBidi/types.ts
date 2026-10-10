/**
 * @file types.ts
 * @description Types, constants, and WebSocket protocol contracts for Gemini 3.5 Transcribe Live.
 */

import type { DentalSpecialty } from "@dental/shared";
import type WebSocket from "ws";
import type { ClientOptions } from "ws";

/** Canonical Google Gemini Live STT WebSocket endpoint */
export const DEFAULT_GEMINI_BIDI_ENDPOINT =
	"wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent";

/** Canonical Gemini Live transcription model */
export const DEFAULT_GEMINI_BIDI_MODEL = "models/gemini-3.5-transcribe-live";

export const DEFAULT_SAMPLE_RATE = 16000;
export const DEFAULT_MIME_TYPE = "audio/pcm;rate=16000";

export const DEFAULT_MAX_BIDI_BUFFER_BYTES = 8 * 1024 * 1024; // 8MB per connection ceiling
export const MAX_SINGLE_AUDIO_CHUNK_BYTES = 2 * 1024 * 1024; // 2MB max single audio chunk

/** Mandatory dental vocabulary for live speech biasing */
export const MANDATORY_DENTAL_BIDI_TERMS: readonly string[] = [
	"ФДИ 11-48",
	"51-85",
	"11", "12", "13", "14", "15", "16", "17", "18",
	"21", "22", "23", "24", "25", "26", "27", "28",
	"31", "32", "33", "34", "35", "36", "37", "38",
	"41", "42", "43", "44", "45", "46", "47", "48",
	"51", "52", "53", "54", "55",
	"61", "62", "63", "64", "65",
	"71", "72", "73", "74", "75",
	"81", "82", "83", "84", "85",
	"апекслокатор",
	"коффердам",
	"пульпит",
	"периодонтит",
	"ЭДТА",
	"гипохлорит натрия",
	"ультракаин",
	"скандонест",
	"E.max",
	"ZrO2",
	"СанПиН 3.3686-21",
	"кариес",
	"силер",
	"гуттаперча",
	"септонест",
	"убистезин",
	"мепивакаин",
	"артикаин",
	"КЛКТ",
	"ОПТГ",
	"RVG",
	"виниры",
	"имплантат",
	"абатмент",
	"остеоинтеграция",
	"синус-лифтинг",
	"кюретаж",
	"резцовое перекрытие",
	"МОД",
	"ИРОПЗ",
	"эндодонтия",
];

export interface GeminiBidiSetupFrame {
	setup: {
		model: string;
		generationConfig: {
			responseModalities: ["TEXT"];
		};
		systemInstruction: {
			parts: Array<{ text: string }>;
		};
	};
}

export interface GeminiBidiRealtimeChunkFrame {
	realtimeInput: {
		mediaChunks: Array<{
			mimeType: string;
			data: string;
		}>;
	};
}

export type GeminiBidiTranscriptType = "interim" | "final";

export interface GeminiBidiTranscriptEvent {
	readonly type: GeminiBidiTranscriptType;
	readonly text: string;
	readonly timestampMs: number;
	readonly raw?: unknown;
}

export interface GeminiBidiParsedMessage {
	readonly isSetupComplete: boolean;
	readonly transcript?: GeminiBidiTranscriptEvent | undefined;
	readonly turnComplete?: boolean | undefined;
	readonly error?:
		| {
				readonly code: number;
				readonly message: string;
				readonly status?: string | undefined;
		  }
		| undefined;
}

export interface GeminiBidiTurnCompleteEvent {
	readonly finalText: string;
	readonly timestampMs: number;
}

export interface GeminiBidiReconnectingEvent {
	readonly attempt: number;
	readonly keyFingerprint: string | null;
	readonly reason: string;
}

export interface GeminiBidiKeyRotatedEvent {
	readonly oldFingerprint?: string | undefined;
	readonly newFingerprint: string;
}

export interface GeminiBidiBridgeOptions {
	readonly apiKey?: string | undefined;
	readonly model?: string | undefined;
	readonly endpoint?: string | undefined;
	readonly specialty?: DentalSpecialty | null | undefined;
	readonly customTerms?: string[] | undefined;
	readonly sampleRate?: number | undefined;
	readonly proxyUrl?: string | undefined;
	readonly maxRetryAttempts?: number | undefined;
	readonly maxBufferSizeBytes?: number | undefined;
	readonly providerId?: ("google_speech" | "gemini_transcribe_live") | undefined;
	readonly wsFactory?:
		| ((
				url: string,
				protocols?: string | string[],
				options?: ClientOptions,
		  ) => WebSocket)
		| undefined;
}
