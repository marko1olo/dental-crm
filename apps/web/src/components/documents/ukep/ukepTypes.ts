/**
 * ukepTypes.ts — Типы данных и интерфейсы юридической электронной подписи врача (УКЭП ГОСТ)
 * Мандаты: 8b (Sweet Spot <= 120 строк), 8e (Автономия врача), 8x (Чистый клинический язык).
 */

import type { CryptoProCertificate } from "../../../utils/cryptoPro";

export type UkepDocumentType = "emr_record" | "consent" | "tax_certificate" | "contract" | "prescription";

export interface UkepDocumentItem {
	readonly id: string;
	readonly title: string;
	readonly type: UkepDocumentType;
	readonly patientFullName: string;
	readonly date: string;
	readonly documentNumber: string;
	readonly hashHex: string;
	readonly status: "draft" | "signed_pep" | "signed_ukep";
	readonly signedAt?: string | undefined;
	readonly signerFullName?: string | undefined;
	readonly certThumbprint?: string | undefined;
	readonly certSerial?: string | undefined;
}

export interface UkepSignFormState {
	readonly selectedDocId: string;
	readonly selectedThumbprint: string;
	readonly pinCode: string;
	readonly isRememberPin: boolean;
	readonly isSigning: boolean;
	readonly failureMessage: string | null;
	readonly successMessage: string | null;
}
