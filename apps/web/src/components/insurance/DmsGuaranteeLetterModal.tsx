/**
 * DmsGuaranteeLetterModal.tsx — Canonical Facade for Insurance Workspace & Guarantee Letters.
 *
 * Mandates:
 * - 8e (Doctor Autonomy: no blocked buttons)
 * - 8n (Solo-Doctor & Small Clinic sovereignty)
 * - 8b (Healthy sweet spot <= 150 lines)
 * - 8x (Clean clinical language without raw bureaucratic codes)
 * - Zero raw emojis (uses Lucide Zap vector icon, no cartoon emojis)
 */

import React from "react";
import { Zap } from "lucide-react";
import type {
	DmsGuaranteeLetter,
	DmsBillableItem,
	PatientPaymentMethod,
} from "@dental/shared";
import {
	RUSSIAN_DMS_INSURERS,
	STANDARD_DMS_LIMITS_RUB,
} from "@dental/shared";
import { DmsStudioModal } from "./DmsStudioModal";
import { denteAdminSecretRequestHeaders } from "../../lib/denteRequestHeaders";

export const COMMON_DENTAL_ICD10_DIAGNOSES = [
	{ code: "K02.1", label: "K02.1 Кариес дентина" },
	{ code: "K04.0", label: "K04.0 Пульпит начальный / острый" },
	{ code: "K04.1", label: "K04.1 Некроз пульпы" },
	{ code: "K04.4", label: "K04.4 Острый верхушечный периодонтит" },
	{ code: "K05.0", label: "K05.0 Острый гингивит" },
	{ code: "K05.3", label: "K05.3 Хронический пародонтит" },
] as const;

export const FDI_ADULT_TEETH_UPPER = ["18", "17", "16", "15", "14", "13", "12", "11", "21", "22", "23", "24", "25", "26", "27", "28"] as const;
export const FDI_ADULT_TEETH_LOWER = ["48", "47", "46", "45", "44", "43", "42", "41", "31", "32", "33", "34", "35", "36", "37", "38"] as const;

export const DEFAULT_BILL_ITEMS_TO_SPLIT: readonly DmsBillableItem[] = [
	{ id: "def-1", serviceCode: "A16.07.002.001", serviceCode804n: "A16.07.002.001", serviceName: "Восстановление зуба пломбой светового отверждения", quantity: 1, unitPriceKopecks: 450000 },
	{ id: "def-2", serviceCode: "A16.07.030.002", serviceCode804n: "A16.07.030.002", serviceName: "Эндодонтическое лечение 2 каналов", quantity: 1, unitPriceKopecks: 580000 },
];

export const EXPRESS_GUARANTEE_LETTER_PRESETS = [
	{ id: "exp-30k", title: "Лимит 30 000 ₽", limitRub: 30000 },
	{ id: "exp-50k", title: "Лимит 50 000 ₽", limitRub: 50000 },
	{ id: "exp-100k", title: "Лимит 100 000 ₽", limitRub: 100000 },
] as const;

export type { DmsGuaranteeLetter } from "@dental/shared";

export interface BillItemToSplit extends DmsBillableItem {}

export interface DmsGuaranteeLetterModalProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly patient?: {
		id: string;
		fullName: string;
		birthDate?: string | undefined;
		policyNumber?: string | undefined;
		cardNumber?: string | undefined;
	} | undefined;
	readonly initialLetter?: DmsGuaranteeLetter | undefined;
	readonly billItems?: readonly DmsBillableItem[] | undefined;
	readonly onSave?: ((letter: DmsGuaranteeLetter) => void) | undefined;
	readonly onApplySplitToCashbox?: ((splitData: {
		totalDueRub: number;
		dmsRub: number;
		patientRub: number;
		patientMethod: PatientPaymentMethod;
		patientCashRub?: number | undefined;
		patientCardRub?: number | undefined;
		letterId?: string | undefined;
		letterNumber?: string | undefined;
		insurerName?: string | undefined;
	}) => void) | undefined;
}

export {
	STANDARD_DMS_LIMITS_RUB,
};

export const QUICK_RUSSIAN_DMS_INSURER_CHIPS = RUSSIAN_DMS_INSURERS.slice(0, 6);

export function getActiveBillItemsToSplit(): readonly DmsBillableItem[] {
	return DEFAULT_BILL_ITEMS_TO_SPLIT;
}

export function mapBackendLetterToPatientGuaranteeLetter(raw: unknown): DmsGuaranteeLetter {
	const r = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
	const validUntilStr = String(r.validUntil || r.validTo || "2026-12-31");
	const rawStatus = String(r.status || "active");
	const status: DmsGuaranteeLetter["status"] =
		rawStatus === "expired" || rawStatus === "exhausted" || rawStatus === "approved" || rawStatus === "pending_approval" || rawStatus === "draft"
			? rawStatus
			: "active";

	return {
		id: String(r.id || `letter-${Date.now()}`),
		patientId: String(r.patientId || "pat-1"),
		letterNumber: String(r.letterNumber || "ГП-001"),
		patientFullName: String(r.patientFullName || "Пациент"),
		issueDate: String(r.issueDate || "2026-01-01"),
		validFrom: String(r.validFrom || "2026-01-01"),
		validUntil: validUntilStr,
		validTo: validUntilStr,
		companyId: String(r.companyId || r.insurerKey || "sogaz"),
		companyName: String(r.companyName || r.insurerName || "АО «СОГАЗ»"),
		insurerName: String(r.insurerName || r.companyName || "АО «СОГАЗ»"),
		policyNumber: String(r.policyNumber || ""),
		patientBirthDate: String(r.patientBirthDate || ""),
		maxCoverageRub: Number(r.maxCoverageRub) || (Number(r.limitKopecks || 3000000) / 100),
		limitKopecks: Number(r.limitKopecks) || (Number(r.maxCoverageRub || 30000) * 100),
		usedAmountRub: Number(r.usedAmountRub) || (Number(r.usedKopecks || 0) / 100),
		usedKopecks: Number(r.usedKopecks) || (Number(r.usedAmountRub || 0) * 100),
		remainingLimitKopecks: Number(r.remainingLimitKopecks) || (Number(r.maxCoverageRub || 30000) * 100),
		defaultFranchisePercent: Number(r.defaultFranchisePercent ?? r.franchisePct ?? 0),
		franchisePct: Number(r.defaultFranchisePercent ?? r.franchisePct ?? 0),
		franchiseType: "none",
		franchiseFixedRub: 0,
		programExclusions: [],
		approvedServiceCodes: [],
		approvedTeethFdi: [],
		approvedDiagnosisCodes: [],
		notes: String(r.notes || ""),
		status,
	};
}

export async function fetchPatientGuaranteeLettersFromApi(patientId: string): Promise<DmsGuaranteeLetter[]> {
	if (!patientId) return [];
	try {
		const res = await fetch(`/api/insurance/guarantee-letters?patientId=${encodeURIComponent(patientId)}`, {
			headers: denteAdminSecretRequestHeaders(),
		});
		if (!res.ok) return [];
		const data = await res.json();
		return Array.isArray(data) ? data.map(mapBackendLetterToPatientGuaranteeLetter) : [];
	} catch {
		return [];
	}
}

export async function saveGuaranteeLetterToApi(letter: Partial<DmsGuaranteeLetter>): Promise<DmsGuaranteeLetter> {
	const res = await fetch("/api/insurance/guarantee-letters", {
		method: "POST",
		headers: denteAdminSecretRequestHeaders({ "Content-Type": "application/json" }),
		body: JSON.stringify(letter),
	});
	if (!res.ok) throw new Error("Ошибка сохранения гарантийного письма");
	const saved = await res.json();
	return mapBackendLetterToPatientGuaranteeLetter(saved);
}

export function DmsGuaranteeLetterModal(props: DmsGuaranteeLetterModalProps) {
	return (
		<DmsStudioModal
			{...props}
			initialTab="policies"
		/>
	);
}

/**
 * Lucide Zap vector indicator for fast guarantee letter status (Mandate 8d, Wave 119 Vector Hygiene).
 */
export const DmsGuaranteeLetterStatusBadge: React.FC<{ readonly text?: string | undefined }> = ({ text = "Гарантийное согласование" }) => (
	<span className="dms-badge dms-badge-active" title={text}>
		<Zap size={14} className="dms-preset-icon" /> {text}
	</span>
);

export default DmsGuaranteeLetterModal;
