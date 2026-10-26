export type PatientWebappScope = "portal:read" | "portal:write" | "portal:sign" | "portal:pay";

export interface PatientWebappSessionToken {
	readonly sessionId: string;
	readonly patientId: string;
	readonly clinicId: string;
	readonly phone: string;
	readonly issuedAtTimestamp: number;
	readonly expiresAtTimestamp: number;
	readonly scopes: readonly PatientWebappScope[];
	readonly nonce: string;
	readonly signature: string;
}

export interface PatientWebappSessionParams {
	readonly patientId: string;
	readonly clinicId?: string | undefined;
	readonly phone: string;
	readonly ttlHours?: number | undefined;
	readonly scopes?: readonly PatientWebappScope[] | undefined;
	readonly secretKey?: string | undefined;
}
