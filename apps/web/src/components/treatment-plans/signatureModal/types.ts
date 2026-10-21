import type { DigitalSignatureAgreementData, TreatmentPlanTier } from "../types";

export type TreatmentPlanSignMethod = "sms" | "qr" | "paper";

export interface TreatmentPlanSignatureModalProps {
	readonly isOpen: boolean;
	readonly tier: TreatmentPlanTier;
	readonly patientName: string;
	readonly patientId: string;
	readonly patientPhone?: string;
	readonly planId?: string;
	readonly initialSignMethod?: TreatmentPlanSignMethod;
	readonly doctorFullName?: string;
	readonly clinicName?: string;
	readonly onClose: () => void;
	readonly onSignedSuccess: (agreement: DigitalSignatureAgreementData) => void;
}

export const PAPER_SIGNATURE_DATA_URL =
	"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 220 54' width='220' height='54'><rect x='1' y='1' width='218' height='52' rx='6' fill='%23f0fdf4' stroke='%2316a34a' stroke-width='1.5' stroke-dasharray='4 2'/><path d='M16 27l5 5 10-10' fill='none' stroke='%2316a34a' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'/><text x='38' y='24' font-family='sans-serif' font-size='11' font-weight='bold' fill='%2315803d'>Подписано на бумаге</text><text x='38' y='40' font-family='sans-serif' font-size='9' fill='%23166534'>Оригинал подписан пациентом очно</text></svg>";

export const SMS_PEP_SIGNATURE_DATA_URL =
	"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 220 54' width='220' height='54'><rect x='1' y='1' width='218' height='52' rx='6' fill='%23f0fdfa' stroke='%230d9488' stroke-width='1.5' stroke-dasharray='4 2'/><path d='M16 27l5 5 10-10' fill='none' stroke='%230d9488' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'/><text x='38' y='24' font-family='sans-serif' font-size='11' font-weight='bold' fill='%230f766e'>ПЭП: СМС-код 63-ФЗ</text><text x='38' y='40' font-family='sans-serif' font-size='9' fill='%23115e59'>Электронная подпись подтверждена</text></svg>";

export const QR_PEP_SIGNATURE_DATA_URL =
	"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 220 54' width='220' height='54'><rect x='1' y='1' width='218' height='52' rx='6' fill='%23eff6ff' stroke='%232563eb' stroke-width='1.5' stroke-dasharray='4 2'/><path d='M16 27l5 5 10-10' fill='none' stroke='%232563eb' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'/><text x='38' y='24' font-family='sans-serif' font-size='11' font-weight='bold' fill='%231d4ed8'>ПЭП: QR на смартфона</text><text x='38' y='40' font-family='sans-serif' font-size='9' fill='%231e40af'>Подтверждено в кабинете пациента</text></svg>";
