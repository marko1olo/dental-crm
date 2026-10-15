/**
 * @file packages/shared/src/clinical/stenographer/types.ts
 * @description Type definitions for the Clinical Stenographer & Zero-Latency Smart Snippets Engine.
 * Form 043/y Doctor Diary Rapid Autocomplete (<10KB, 0 external NLP dependencies, O(1) Trie).
 */

export type ClinicalSnippetCategory =
	| "therapy"
	| "endo"
	| "surgery"
	| "anesthesia"
	| "norm"
	| "prevention"
	| "diagnostics"
	| "general";

export type ClinicalFormFieldTarget =
	| "complaints"
	| "anamnesis"
	| "objective"
	| "treatment"
	| "recommendations"
	| "all";

export interface ClinicalSnippet {
	/** Unique abbreviation/trigger (e.g. "пхр", "кф", "энд", "ан_инф", "норм") */
	readonly key: string;
	/** Human-readable short title / label for autocomplete chips */
	readonly label: string;
	/** Full canonical clinical text inserted upon trigger */
	readonly text: string;
	/** Clinical domain category */
	readonly category: ClinicalSnippetCategory;
	/** Targeted fields in Form 043/y or SOAP diary (defaults to ["all"]) */
	readonly applicableFields?: readonly ClinicalFormFieldTarget[];
	/** Searchable keywords / tags */
	readonly tags?: readonly string[];
}

export interface TrieNode {
	children: Map<string, TrieNode>;
	snippet: ClinicalSnippet | null;
	isEndOfWord: boolean;
}

export interface ExtractedTokenInfo {
	readonly token: string;
	readonly start: number;
	readonly end: number;
}

export interface SnippetReplacementResult {
	readonly changed: boolean;
	readonly nextText: string;
	readonly nextCursorPosition: number;
	readonly snippet?: ClinicalSnippet;
	readonly replacedToken?: string;
	readonly prefixStart?: number;
	readonly prefixEnd?: number;
}

export type StenographerTriggerKey = "Tab" | "Space" | "Enter";

export interface ExpandOptions {
	readonly text: string;
	readonly cursorPosition: number;
	readonly triggerKey?: StenographerTriggerKey;
	readonly appendSpaceOnSpaceTrigger?: boolean;
	readonly targetField?: ClinicalFormFieldTarget;
}
