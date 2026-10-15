/**
 * @file packages/shared/src/clinical/stenographer/clinicalStenographerEngine.ts
 * @description Lightweight Clinical Stenographer & Zero-Latency Smart Snippets Engine.
 * O(1) Prefix Tree + Hash Table, 0 external dependencies, <10KB pure TypeScript.
 * Zero-latency DOM keyboard expansion for Form 043/y Doctor Diary.
 */

import { DEFAULT_CLINICAL_SNIPPETS } from "./defaultClinicalSnippets.js";
import type {
	ClinicalFormFieldTarget,
	ClinicalSnippet,
	ExpandOptions,
	ExtractedTokenInfo,
	SnippetReplacementResult,
	TrieNode,
} from "./types.js";

function createTrieNode(): TrieNode {
	return {
		children: new Map<string, TrieNode>(),
		snippet: null,
		isEndOfWord: false,
	};
}

/** Check if character is part of a valid clinical snippet abbreviation token */
export function isSnippetWordChar(ch: string): boolean {
	if (!ch || ch.length !== 1) return false;
	const code = ch.charCodeAt(0);

	// Latin A-Z, a-z
	if ((code >= 65 && code <= 90) || (code >= 97 && code <= 122)) return true;

	// Digits 0-9
	if (code >= 48 && code <= 57) return true;

	// Underscore or hyphen
	if (code === 95 || code === 45) return true;

	// Cyrillic letters (including ё / Ё)
	if (
		(code >= 0x0400 && code <= 0x04ff) ||
		code === 0x0500 ||
		code === 0x0451 ||
		code === 0x0401
	) {
		return true;
	}

	return false;
}

export class ClinicalStenographerEngine {
	private readonly root: TrieNode;
	private readonly map: Map<string, ClinicalSnippet>;

	constructor(initialSnippets: readonly ClinicalSnippet[] = DEFAULT_CLINICAL_SNIPPETS) {
		this.root = createTrieNode();
		this.map = new Map<string, ClinicalSnippet>();

		for (const snippet of initialSnippets) {
			this.insert(snippet);
		}
	}

	/** Normalizes abbreviation key for index lookup (lowercase, trimmed) */
	private normalizeKey(key: string): string {
		return key.trim().toLowerCase();
	}

	/** Insert or overwrite a snippet into O(1) map and prefix trie */
	public insert(snippet: ClinicalSnippet): void {
		const normKey = this.normalizeKey(snippet.key);
		if (!normKey) return;

		this.map.set(normKey, snippet);

		let current = this.root;
		for (const char of normKey) {
			let nextNode = current.children.get(char);
			if (!nextNode) {
				nextNode = createTrieNode();
				current.children.set(char, nextNode);
			}
			current = nextNode;
		}
		current.snippet = snippet;
		current.isEndOfWord = true;
	}

	/** Remove snippet by key */
	public remove(key: string): boolean {
		const normKey = this.normalizeKey(key);
		if (!this.map.has(normKey)) return false;

		this.map.delete(normKey);

		// Remove from trie
		let current = this.root;
		const stack: Array<{ node: TrieNode; char: string }> = [];

		for (const char of normKey) {
			const next = current.children.get(char);
			if (!next) return false;
			stack.push({ node: current, char });
			current = next;
		}

		current.snippet = null;
		current.isEndOfWord = false;

		// Clean up empty nodes from leaf to root
		for (let i = stack.length - 1; i >= 0; i--) {
			const entry = stack[i];
			if (!entry) break;
			const { node, char } = entry;
			const child = node.children.get(char);
			if (child && child.children.size === 0 && !child.isEndOfWord) {
				node.children.delete(char);
			} else {
				break;
			}
		}

		return true;
	}

	/** Direct O(1) hash table lookup for exact abbreviation match */
	public get(key: string): ClinicalSnippet | undefined {
		return this.map.get(this.normalizeKey(key));
	}

	/** Check existence of abbreviation */
	public has(key: string): boolean {
		return this.map.has(this.normalizeKey(key));
	}

	/** Get all registered snippets */
	public getAll(): ClinicalSnippet[] {
		return Array.from(this.map.values());
	}

	/** Total count of registered snippets */
	public size(): number {
		return this.map.size;
	}

	/**
	 * Instant prefix search using the Trie.
	 * Returns matching snippets starting with prefix in O(prefix_length + results_count).
	 */
	public searchPrefix(
		prefix: string,
		limit = 10,
		targetField?: ClinicalFormFieldTarget,
	): ClinicalSnippet[] {
		const normPrefix = this.normalizeKey(prefix);
		if (!normPrefix) {
			const all = this.getAll();
			return targetField
				? all.filter((s) => this.isApplicableToField(s, targetField)).slice(0, limit)
				: all.slice(0, limit);
		}

		let current: TrieNode | undefined = this.root;
		for (const char of normPrefix) {
			current = current.children.get(char);
			if (!current) return [];
		}

		const results: ClinicalSnippet[] = [];
		const queue: TrieNode[] = [current];

		while (queue.length > 0 && results.length < limit) {
			const node = queue.shift();
			if (!node) continue;

			if (node.snippet) {
				if (!targetField || this.isApplicableToField(node.snippet, targetField)) {
					results.push(node.snippet);
				}
			}

			for (const child of node.children.values()) {
				queue.push(child);
			}
		}

		return results;
	}

	/** Verifies if snippet is applicable to target clinical form field */
	public isApplicableToField(
		snippet: ClinicalSnippet,
		field?: ClinicalFormFieldTarget,
	): boolean {
		if (!field || field === "all") return true;
		if (!snippet.applicableFields || snippet.applicableFields.length === 0) return true;
		return snippet.applicableFields.includes("all") || snippet.applicableFields.includes(field);
	}

	/**
	 * Scans backwards from caret position to extract the preceding word token.
	 * Runs in O(token_length) — less than 0.01ms.
	 */
	public extractPrecedingToken(
		text: string,
		cursorPosition: number,
	): ExtractedTokenInfo | null {
		if (!text) return null;
		const clampedPos = Math.max(0, Math.min(cursorPosition, text.length));
		if (clampedPos === 0) return null;

		let i = clampedPos - 1;
		while (i >= 0) {
			const ch = text[i];
			if (!ch || !isSnippetWordChar(ch)) break;
			i--;
		}

		const tokenStart = i + 1;
		const tokenEnd = clampedPos;
		if (tokenStart >= tokenEnd) return null;

		const token = text.slice(tokenStart, tokenEnd);
		return { token, start: tokenStart, end: tokenEnd };
	}

	/**
	 * Zero-latency expansion at cursor position.
	 * If preceding token matches a snippet abbreviation, replaces the token with full text.
	 */
	public expandAtCursor(options: ExpandOptions): SnippetReplacementResult {
		const {
			text,
			cursorPosition,
			triggerKey = "Tab",
			appendSpaceOnSpaceTrigger = true,
			targetField,
		} = options;

		const tokenInfo = this.extractPrecedingToken(text, cursorPosition);
		if (!tokenInfo) {
			return { changed: false, nextText: text, nextCursorPosition: cursorPosition };
		}

		const snippet = this.get(tokenInfo.token);
		if (!snippet) {
			return { changed: false, nextText: text, nextCursorPosition: cursorPosition };
		}

		if (targetField && !this.isApplicableToField(snippet, targetField)) {
			return { changed: false, nextText: text, nextCursorPosition: cursorPosition };
		}

		// Calculate replacement text
		const addTrailingSpace = triggerKey === "Space" && appendSpaceOnSpaceTrigger;
		const expandedBody = snippet.text + (addTrailingSpace ? " " : "");

		const before = text.slice(0, tokenInfo.start);
		const after = text.slice(tokenInfo.end);
		const nextText = before + expandedBody + after;
		const nextCursorPosition = tokenInfo.start + expandedBody.length;

		return {
			changed: true,
			nextText,
			nextCursorPosition,
			snippet,
			replacedToken: tokenInfo.token,
			prefixStart: tokenInfo.start,
			prefixEnd: tokenInfo.end,
		};
	}

	/** Reset to default clinical snippets dictionary */
	public resetToDefaults(): void {
		this.map.clear();
		this.root.children.clear();
		this.root.snippet = null;
		this.root.isEndOfWord = false;

		for (const snippet of DEFAULT_CLINICAL_SNIPPETS) {
			this.insert(snippet);
		}
	}
}

// Global Singleton Instance
let globalStenographerInstance: ClinicalStenographerEngine | null = null;

export function getGlobalClinicalStenographer(): ClinicalStenographerEngine {
	if (!globalStenographerInstance) {
		globalStenographerInstance = new ClinicalStenographerEngine();
	}
	return globalStenographerInstance;
}

export function resetGlobalClinicalStenographer(): void {
	if (globalStenographerInstance) {
		globalStenographerInstance.resetToDefaults();
	} else {
		globalStenographerInstance = new ClinicalStenographerEngine();
	}
}
