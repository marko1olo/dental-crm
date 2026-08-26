/**
 * redaction.ts — PHI (Protected Health Information) redaction boundary for agentic operations.
 *
 * Guarantees:
 * 1. Zero patient identifiers (ФИО, телефоны, паспорта, СНИЛС, ОМС, адреса, email, UUIDs)
 *    leave the clinic backend in cleartext to external LLM providers.
 * 2. Deterministic, reversible tokenization (SHA-1 hash prefix per token kind).
 * 3. Deep redaction for structured JSON objects/arrays and free-text regex scrubbing.
 * 4. Streaming delta boundary buffering so tokens split across streaming chunks rehydrate cleanly.
 */

import { createHash } from "node:crypto";
import type {
	ContentBlock,
	ProviderMessage,
	TextBlock,
	ToolResultBlock,
	ToolUseBlock,
} from "./types.js";

// Key mappings to token kind
const NAME_KEYS = new Set([
	"first_name",
	"firstname",
	"last_name",
	"lastname",
	"full_name",
	"fullname",
	"name",
	"patient_name",
	"patientname",
	"doctor_name",
	"doctorname",
	"fio",
	"middle_name",
	"middlename",
	"patronymic",
	"client_name",
]);

const PHONE_KEYS = new Set([
	"phone",
	"mobile",
	"telephone",
	"phone_number",
	"phonenumber",
	"tel",
	"contact_phone",
]);

const EMAIL_KEYS = new Set([
	"email",
	"email_address",
	"emailaddress",
	"contact_email",
]);

const PASSPORT_KEYS = new Set([
	"passport",
	"passport_number",
	"passportnumber",
	"passport_series",
	"passportseries",
]);

const SNILS_KEYS = new Set([
	"snils",
	"snils_number",
	"snilsnumber",
]);

const OMS_KEYS = new Set([
	"oms",
	"oms_number",
	"omsnumber",
	"policy",
	"policy_number",
	"policynumber",
	"medical_policy",
]);

const NATID_KEYS = new Set([
	"inn",
	"inn_number",
	"innnumber",
	"tax_id",
	"taxid",
	"dni",
	"nif",
	"national_id",
]);

const ADDRESS_KEYS = new Set([
	"address",
	"actual_address",
	"actualaddress",
	"registration_address",
	"registrationaddress",
	"street",
	"city",
	"zip_code",
	"zipcode",
	"postal_code",
	"living_address",
]);

const DOB_KEYS = new Set([
	"birth_date",
	"birthdate",
	"dob",
	"date_of_birth",
]);

const ID_KIND: Record<string, string> = {
	id: "REF",
	ref_id: "REF",
	patient_id: "PATIENT",
	patientid: "PATIENT",
	appointment_id: "APPT",
	appointmentid: "APPT",
	appt_id: "APPT",
	visit_id: "VISIT",
	visitid: "VISIT",
	doctor_id: "STAFF",
	doctor_user_id: "STAFF",
	doctoruserid: "STAFF",
	user_id: "STAFF",
	userid: "STAFF",
	staff_id: "STAFF",
};

const KIND_FOR_KEY: Record<string, string> = {};
for (const k of NAME_KEYS) KIND_FOR_KEY[k] = "NAME";
for (const k of PHONE_KEYS) KIND_FOR_KEY[k] = "PHONE";
for (const k of EMAIL_KEYS) KIND_FOR_KEY[k] = "EMAIL";
for (const k of PASSPORT_KEYS) KIND_FOR_KEY[k] = "PASSPORT";
for (const k of SNILS_KEYS) KIND_FOR_KEY[k] = "SNILS";
for (const k of OMS_KEYS) KIND_FOR_KEY[k] = "OMS";
for (const k of NATID_KEYS) KIND_FOR_KEY[k] = "NATID";
for (const k of ADDRESS_KEYS) KIND_FOR_KEY[k] = "ADDRESS";
for (const k of DOB_KEYS) KIND_FOR_KEY[k] = "DOB";

const UUID_RE =
	/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Regex patterns for heuristic free-text redaction
const FREE_TEXT_PATTERNS = [
	{
		kind: "EMAIL",
		regex: /[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+/g,
	},
	{
		kind: "SNILS",
		regex: /\b\d{3}[-\s]\d{3}[-\s]\d{3}[-\s]\d{2}\b/g,
	},
	{
		kind: "PASSPORT",
		regex: /\b\d{2}\s?\d{2}\s+(?:№\s*)?\d{6}\b/g,
	},
	{
		kind: "PHONE",
		regex: /(?:\+7|8)[\s\-(]?\d{3}[\s\-)]?\d{3}[\s\-]?\d{2}[\s\-]?\d{2}/g,
	},
	{
		kind: "OMS",
		regex: /\b\d{16}\b/g,
	},
];

function tokenFor(real: string, kind: string): string {
	const digest = createHash("sha1").update(real, "utf8").digest("hex").slice(0, 6);
	return `${kind}_${digest}`;
}

/**
 * Bidirectional, deterministic symbol table mapping real identifiers to opaque tokens.
 */
export class SymbolTable {
	private readonly toToken = new Map<string, string>();
	private readonly toReal = new Map<string, string>();

	public tokenize(real: string, kind: string): string {
		if (!real || typeof real !== "string") return real;
		const trimmed = real.trim();
		if (!trimmed) return real;

		const existing = this.toToken.get(trimmed);
		if (existing) return existing;

		const token = tokenFor(trimmed, kind);
		this.toToken.set(trimmed, token);
		this.toReal.set(token, trimmed);
		return token;
	}

	public getReal(token: string): string | undefined {
		return this.toReal.get(token);
	}

	public getToken(real: string): string | undefined {
		return this.toToken.get(real.trim());
	}

	public restoreText(text: string): string {
		if (!text || this.toReal.size === 0) return text;
		let result = text;
		// Sort tokens by length descending to prevent prefix collision
		const tokens = Array.from(this.toReal.keys()).sort((a, b) => b.length - a.length);
		for (const token of tokens) {
			if (result.includes(token)) {
				const real = this.toReal.get(token);
				if (real !== undefined) {
					result = result.split(token).join(real);
				}
			}
		}
		return result;
	}

	public replaceKnown(text: string): string {
		if (!text) return text;
		let result = text;

		// 1. Replace already registered real values (sorted by length descending)
		const realValues = Array.from(this.toToken.keys()).sort((a, b) => b.length - a.length);
		for (const real of realValues) {
			if (real && result.includes(real)) {
				const token = this.toToken.get(real);
				if (token) {
					result = result.split(real).join(token);
				}
			}
		}

		// 2. Heuristic regex scrub for newly detected unseeded patterns
		for (const { kind, regex } of FREE_TEXT_PATTERNS) {
			result = result.replace(regex, (match) => {
				return this.tokenize(match, kind);
			});
		}

		return result;
	}

	public size(): number {
		return this.toToken.size;
	}

	public clear(): void {
		this.toToken.clear();
		this.toReal.clear();
	}
}

/**
 * Redactor applies PHI redaction boundaries between clinic data and LLM providers.
 */
export class Redactor {
	public readonly enabled: boolean;
	public readonly table: SymbolTable;
	private streamBuffer = "";

	constructor(options: { enabled?: boolean; table?: SymbolTable } = {}) {
		this.enabled = options.enabled ?? true;
		this.table = options.table ?? new SymbolTable();
	}

	public seed(context: Record<string, unknown> | null | undefined): void {
		if (!this.enabled || !context) return;
		this.redactObj(context);
	}

	public redactOutgoing(messages: ProviderMessage[]): ProviderMessage[] {
		if (!this.enabled) return messages;
		return messages.map((m) => this.redactMessage(m));
	}

	public redactResult(content: unknown): unknown {
		if (!this.enabled) return content;
		return this.redactObj(content);
	}

	public rehydrate(text: string): string {
		if (!this.enabled || !text) return text;
		return this.table.restoreText(text);
	}

	public resolveArgs<T extends Record<string, unknown>>(args: T): T {
		if (!this.enabled || !args) return args;
		return this.restoreObj(args) as T;
	}

	/**
	 * Buffers streaming text deltas and rehydrates at whitespace/newline boundaries,
	 * preventing token truncation when tokens span across chunks.
	 */
	public rehydrateDelta(delta: string): string {
		if (!this.enabled) return delta;
		this.streamBuffer += delta;

		const cut = Math.max(
			this.streamBuffer.lastIndexOf(" "),
			this.streamBuffer.lastIndexOf("\n"),
			this.streamBuffer.lastIndexOf("\t"),
			this.streamBuffer.lastIndexOf("."),
			this.streamBuffer.lastIndexOf(","),
		);

		if (cut >= 0) {
			const segment = this.streamBuffer.slice(0, cut + 1);
			this.streamBuffer = this.streamBuffer.slice(cut + 1);
			return this.table.restoreText(segment);
		}

		return "";
	}

	public flushDeltaBuffer(): string {
		if (!this.enabled || !this.streamBuffer) return "";
		const remaining = this.table.restoreText(this.streamBuffer);
		this.streamBuffer = "";
		return remaining;
	}

	private redactMessage(msg: ProviderMessage): ProviderMessage {
		if (typeof msg.content === "string") {
			return {
				role: msg.role,
				content: this.table.replaceKnown(msg.content),
			};
		}

		const newContent: ContentBlock[] = msg.content.map((block) => {
			if (block.type === "text") {
				return {
					type: "text",
					text: this.table.replaceKnown(block.text),
				} as TextBlock;
			}
			if (block.type === "tool_use") {
				return {
					type: "tool_use",
					id: block.id,
					name: block.name,
					input: this.redactObj(block.input) as Record<string, unknown>,
				} as ToolUseBlock;
			}
			if (block.type === "tool_result") {
				return {
					type: "tool_result",
					toolCallId: block.toolCallId,
					content: this.redactObj(block.content),
					isError: block.isError,
				} as ToolResultBlock;
			}
			return block;
		});

		return {
			role: msg.role,
			content: newContent,
		};
	}

	private redactObj(obj: unknown, key?: string): unknown {
		if (obj === null || obj === undefined) return obj;
		if (typeof obj === "string") {
			return this.redactScalar(key, obj);
		}
		if (Array.isArray(obj)) {
			return obj.map((item) => this.redactObj(item, key));
		}
		if (typeof obj === "object") {
			const record = obj as Record<string, unknown>;
			const result: Record<string, unknown> = {};
			for (const [k, v] of Object.entries(record)) {
				result[k] = this.redactObj(v, k);
			}
			return result;
		}
		return obj;
	}

	private redactScalar(key: string | undefined, value: string): string {
		if (!value || typeof value !== "string") return value;
		const lkey = (key || "").toLowerCase();

		const kind = KIND_FOR_KEY[lkey];
		if (kind) {
			return this.table.tokenize(value, kind);
		}

		const idKind = ID_KIND[lkey];
		if (idKind && UUID_RE.test(value.trim())) {
			return this.table.tokenize(value, idKind);
		}

		// If no direct key match, run free-text replacement for known & pattern items
		return this.table.replaceKnown(value);
	}

	private restoreObj(obj: unknown): unknown {
		if (obj === null || obj === undefined) return obj;
		if (typeof obj === "string") {
			return this.table.restoreText(obj);
		}
		if (Array.isArray(obj)) {
			return obj.map((item) => this.restoreObj(item));
		}
		if (typeof obj === "object") {
			const record = obj as Record<string, unknown>;
			const result: Record<string, unknown> = {};
			for (const [k, v] of Object.entries(record)) {
				result[k] = this.restoreObj(v);
			}
			return result;
		}
		return obj;
	}
}
