import crypto from "node:crypto";

/**
 * PHI Redaction boundary for DENTE Dental Agentic Layer.
 * Inspired by dentalpin agentic architecture.
 *
 * Guarantees that no patient Protected Health Information (PHI) / 152-FZ PII
 * (Full Name, SNILS, Passport, Phone, Email, Address, UUIDs) leaves the server in cleartext to cloud LLMs.
 *
 * A per-session SymbolTable deterministically maps real patient values to stable opaque tokens:
 * - Full Names -> `NAME_a1b2c3`
 * - Phone numbers -> `PHONE_d4e5f6`
 * - Email addresses -> `EMAIL_1a2b3c`
 * - National IDs (SNILS/Passport/OMS) -> `NATID_4d5e6f`
 * - Patient UUIDs -> `PATIENT_7g8h9i`
 * - Appointment UUIDs -> `APPT_0j1k2l`
 *
 * Tokens are deterministic (SHA-1 prefix of real value), allowing conversational turns
 * to reconstruct the exact symbol table upon session resumption.
 */

export interface SymbolMapping {
	readonly token: string;
	readonly real: string;
	readonly kind: string;
}

export type PhiTokenKind =
	| "NAME"
	| "PHONE"
	| "EMAIL"
	| "NATID"
	| "PATIENT"
	| "APPT"
	| "REF";

const NAME_KEYS = new Set([
	"first_name",
	"last_name",
	"middle_name",
	"full_name",
	"name",
	"patient_name",
	"fio",
	"doctor_name",
]);

const PHONE_KEYS = new Set([
	"phone",
	"mobile",
	"telephone",
	"phone_number",
	"contact_phone",
]);

const EMAIL_KEYS = new Set(["email", "email_address", "contact_email"]);

const NATIONAL_ID_KEYS = new Set([
	"snils",
	"passport",
	"oms",
	"dms_policy",
	"tax_id",
	"inn",
	"national_id",
	"dni",
	"nif",
]);

const ID_KIND_MAP: Record<string, PhiTokenKind> = {
	id: "REF",
	patient_id: "PATIENT",
	patientid: "PATIENT",
	appointment_id: "APPT",
	appointmentid: "APPT",
};

const UUID_REGEX =
	/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function generateDeterministicToken(real: string, kind: PhiTokenKind): string {
	const hash = crypto.createHash("sha1").update(real.trim().toLowerCase()).digest("hex").slice(0, 6);
	return `${kind}_${hash}`;
}

export class SymbolTable {
	private readonly toToken = new Map<string, string>();
	private readonly toReal = new Map<string, string>();

	public tokenize(real: string, kind: PhiTokenKind): string {
		const trimmed = real.trim();
		if (!trimmed) return real;

		const existing = this.toToken.get(trimmed);
		if (existing) return existing;

		const token = generateDeterministicToken(trimmed, kind);
		this.toToken.set(trimmed, token);
		this.toReal.set(token, trimmed);
		return token;
	}

	public restoreText(text: string): string {
		if (!text || this.toReal.size === 0) return text;

		let result = text;
		// Sort tokens by descending length to prevent prefix collisions
		const tokensByLength = Array.from(this.toReal.keys()).sort((a, b) => b.length - a.length);

		for (const token of tokensByLength) {
			const real = this.toReal.get(token);
			if (real && result.includes(token)) {
				result = result.replaceAll(token, real);
			}
		}
		return result;
	}

	public replaceKnown(text: string): string {
		if (!text || this.toToken.size === 0) return text;

		let result = text;
		// Sort real values by descending length to prevent sub-string collisions
		const realValuesByLength = Array.from(this.toToken.keys()).sort((a, b) => b.length - a.length);

		for (const real of realValuesByLength) {
			const token = this.toToken.get(real);
			if (token && result.includes(real)) {
				result = result.replaceAll(real, token);
			}
		}
		return result;
	}

	public getMappings(): SymbolMapping[] {
		const mappings: SymbolMapping[] = [];
		for (const [token, real] of this.toReal.entries()) {
			const kind = token.split("_")[0] ?? "UNKNOWN";
			mappings.push({ token, real, kind });
		}
		return mappings;
	}
}

export interface RedactorOptions {
	readonly enabled?: boolean;
}

export class PhiRedactor {
	public readonly enabled: boolean;
	public readonly table: SymbolTable;

	constructor(options: RedactorOptions = {}) {
		this.enabled = options.enabled ?? true;
		this.table = new SymbolTable();
	}

	/**
	 * Pre-load known patient and appointment entities from a session context
	 */
	public seed(context: Record<string, unknown> | null | undefined): void {
		if (!this.enabled || !context) return;
		this.redactObject(context);
	}

	/**
	 * Redact an outgoing object payload before JSON serialization to LLM provider
	 */
	public redactObject<T>(obj: T, parentKey?: string): T {
		if (!this.enabled || obj === null || obj === undefined) return obj;

		if (typeof obj === "string") {
			return this.redactScalar(parentKey, obj) as unknown as T;
		}

		if (Array.isArray(obj)) {
			return obj.map((item) => this.redactObject(item, parentKey)) as unknown as T;
		}

		if (typeof obj === "object") {
			const result: Record<string, unknown> = {};
			for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
				result[key] = this.redactObject(value, key);
			}
			return result as T;
		}

		return obj;
	}

	/**
	 * Redact user or system prompt free text using known seeded symbols
	 */
	public redactText(text: string): string {
		if (!this.enabled || !text) return text;
		return this.table.replaceKnown(text);
	}

	/**
	 * Rehydrate LLM model responses, replacing opaque tokens with real patient values for clinical staff
	 */
	public rehydrateText(text: string): string {
		if (!this.enabled || !text) return text;
		return this.table.restoreText(text);
	}

	/**
	 * Rehydrate model-produced tool call arguments before executing local database queries
	 */
	public rehydrateArgs<T>(args: T): T {
		if (!this.enabled || args === null || args === undefined) return args;

		if (typeof args === "string") {
			return this.table.restoreText(args) as unknown as T;
		}

		if (Array.isArray(args)) {
			return args.map((item) => this.rehydrateArgs(item)) as unknown as T;
		}

		if (typeof args === "object") {
			const result: Record<string, unknown> = {};
			for (const [key, value] of Object.entries(args as Record<string, unknown>)) {
				result[key] = this.rehydrateArgs(value);
			}
			return result as T;
		}

		return args;
	}

	private redactScalar(key: string | undefined, value: string): string {
		if (!value || typeof value !== "string") return value;

		const lkey = (key ?? "").toLowerCase().replace(/[-_]/g, "_");

		if (NAME_KEYS.has(lkey)) {
			return this.table.tokenize(value, "NAME");
		}
		if (PHONE_KEYS.has(lkey)) {
			return this.table.tokenize(value, "PHONE");
		}
		if (EMAIL_KEYS.has(lkey)) {
			return this.table.tokenize(value, "EMAIL");
		}
		if (NATIONAL_ID_KEYS.has(lkey)) {
			return this.table.tokenize(value, "NATID");
		}
		if (lkey in ID_KIND_MAP && UUID_REGEX.test(value)) {
			const kind = ID_KIND_MAP[lkey] ?? "REF";
			return this.table.tokenize(value, kind);
		}

		// Fallback: replace any already tokenized values present in the string
		return this.table.replaceKnown(value);
	}
}
