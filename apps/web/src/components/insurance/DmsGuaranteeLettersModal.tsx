/**
 * DmsGuaranteeLettersModal.tsx — Адаптер-делегатор для модального окна гарантийных писем ДМС.
 * Wave 138: Архитектурная дедупликация. Делегирует рендеринг в канонический DmsGuaranteeLetterModal.tsx,
 * сохраняя необходимые типы, константы и интерфейсы для полной обратной совместимости.
 */

import { Zap } from "lucide-react";
import React from "react";
import {
	DmsGuaranteeLetterModal,
	type DmsGuaranteeLetterModalProps,
} from "./DmsGuaranteeLetterModal.js";
import type { DmsGuaranteeLetter } from "./insuranceMath.js";

export interface PatientDmsProfile {
	readonly id: string;
	readonly fullName: string;
	readonly birthDate?: string | undefined;
	readonly policyNumber?: string | undefined;
	readonly insuranceCompany?: string | undefined;
	readonly phone?: string | undefined;
}

export interface PatientGuaranteeLetter {
	readonly id: string;
	readonly letterNumber: string;
	readonly insurerKey: string;
	readonly insurerName: string;
	readonly patientId: string;
	readonly patientFullName: string;
	readonly policyNumber: string;
	readonly issueDate: string; // YYYY-MM-DD
	readonly validFrom: string; // YYYY-MM-DD
	readonly validUntil: string; // YYYY-MM-DD
	readonly maxCoverageKopecks: number;
	readonly usedAmountKopecks: number;
	readonly franchisePct: number; // 0..100%
	readonly franchiseType: "percent" | "fixed_kopecks";
	readonly franchiseFixedKopecks: number;
	readonly approvedTeethFdi: readonly string[];
	readonly approvedServiceCodes804n: readonly string[];
	readonly approvedDiagnosisMkb10: readonly string[];
	readonly curatorFullName: string;
	readonly curatorPhone: string;
	readonly curatorEmail?: string | undefined;
	readonly notes?: string | undefined;
	readonly status: "active" | "exhausted" | "expired" | "cancelled";
}

export interface BillItemToSplit {
	readonly id: string;
	readonly serviceCode804n: string;
	readonly serviceName: string;
	readonly toothNumber?: string | undefined;
	readonly quantity: number;
	readonly unitPriceKopecks: number;
	readonly discountPercent?: number | undefined;
}

export interface DmsGuaranteeLettersModalProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly patient?: PatientDmsProfile | undefined;
	readonly initialLetters?: readonly PatientGuaranteeLetter[] | undefined;
	readonly initialBillItems?: readonly BillItemToSplit[] | undefined;
	readonly onSaveLetter?: ((letter: PatientGuaranteeLetter) => void) | undefined;
	readonly onSelectLetterForVisit?: ((letter: PatientGuaranteeLetter) => void) | undefined;
	readonly onApplySplitCalculation?: ((result: {
		letterId: string;
		totalBillKopecks: number;
		dmsCoveredKopecks: number;
		patientCoPayKopecks: number;
		warning?: string | undefined;
	}) => void) | undefined;
}

/** Типовые диагнозы МКБ-10 в стоматологии */
export const COMMON_DENTAL_ICD10_DIAGNOSES = [
	{ code: "K02.1", title: "Кариес дентина" },
	{ code: "K02.2", title: "Кариес цемента" },
	{ code: "K04.0", title: "Пульпит (острый/хронический)" },
	{ code: "K04.4", title: "Острый апикальный периодонтит" },
	{ code: "K04.5", title: "Хронический апикальный периодонтит" },
	{ code: "K05.1", title: "Хронический гингивит" },
	{ code: "K05.3", title: "Хронический пародонтит" },
	{ code: "K01.1", title: "Дистопия/ретенция зуба мудрости" },
	{ code: "K08.1", title: "Потеря зубов вследствие удаления/травмы" },
];

/** Зубная формула FDI: Взрослый прикус 18..11, 21..28 (верхняя челюсть), 48..41, 31..38 (нижняя челюсть) */
export const FDI_ADULT_TEETH_UPPER = [
	"1.8", "1.7", "1.6", "1.5", "1.4", "1.3", "1.2", "1.1",
	"2.1", "2.2", "2.3", "2.4", "2.5", "2.6", "2.7", "2.8",
];

export const FDI_ADULT_TEETH_LOWER = [
	"4.8", "4.7", "4.6", "4.5", "4.4", "4.3", "4.2", "4.1",
	"3.1", "3.2", "3.3", "3.4", "3.5", "3.6", "3.7", "3.8",
];

/** Демо-позиции визита для сплит-калькулятора */
export const DEFAULT_BILL_ITEMS_TO_SPLIT: readonly BillItemToSplit[] = [
	{
		id: "bill-1",
		serviceCode804n: "A16.07.002.001",
		serviceName: "Восстановление зуба пломбой световой (I класс)",
		toothNumber: "1.6",
		quantity: 1,
		unitPriceKopecks: 450000,
	},
	{
		id: "bill-2",
		serviceCode804n: "A11.07.010",
		serviceName: "Инфильтрационная анестезия",
		toothNumber: "1.6",
		quantity: 1,
		unitPriceKopecks: 95000,
	},
	{
		id: "bill-3",
		serviceCode804n: "A16.07.050",
		serviceName: "Клиническое отбеливание зубов Zoom 4",
		toothNumber: undefined,
		quantity: 1,
		unitPriceKopecks: 2600000,
	},
];

/** Преобразование ответа бэкенда в модель интерфейса гарантийного письма */
export function mapBackendLetterToPatientGuaranteeLetter(item: any): PatientGuaranteeLetter {
	return {
		id: String(item.id),
		letterNumber: String(item.letterNumber || ""),
		insurerKey: String(item.insurerKey || "custom"),
		insurerName: String(item.insurerName || "Страховая компания ДМС"),
		patientId: String(item.patientId || ""),
		patientFullName: String(item.patientFullName || ""),
		policyNumber: String(item.policyNumber || ""),
		issueDate: String(item.issueDate || "").slice(0, 10),
		validFrom: String(item.validFrom || "").slice(0, 10),
		validUntil: String(item.validUntil || "").slice(0, 10),
		maxCoverageKopecks: Math.round(Number(item.maxCoverageRub || 0) * 100),
		usedAmountKopecks: Math.round(Number(item.usedAmountRub || 0) * 100),
		franchisePct: Number(item.franchisePct) || 0,
		franchiseType: item.franchiseType === "fixed_rub" ? "fixed_kopecks" : "percent",
		franchiseFixedKopecks: Math.round(Number(item.franchiseFixedRub || 0) * 100),
		approvedTeethFdi: Array.isArray(item.approvedTeethFdi) ? item.approvedTeethFdi : [],
		approvedServiceCodes804n: Array.isArray(item.approvedServiceCodes)
			? item.approvedServiceCodes
			: Array.isArray(item.approvedServiceCodes804n)
			? item.approvedServiceCodes804n
			: [],
		approvedDiagnosisMkb10: Array.isArray(item.approvedDiagnosisCodes)
			? item.approvedDiagnosisCodes
			: Array.isArray(item.approvedDiagnosisMkb10)
			? item.approvedDiagnosisMkb10
			: [],
		curatorFullName: String(item.curatorFullName || ""),
		curatorPhone: String(item.curatorPhone || ""),
		curatorEmail: item.curatorEmail ? String(item.curatorEmail) : undefined,
		notes: String(item.notes || ""),
		status: (item.status as PatientGuaranteeLetter["status"]) || "active",
	};
}

export function DmsGuaranteeLettersModal({
	isOpen,
	onClose,
	patient,
	initialLetters,
	initialBillItems,
	onSaveLetter,
	onSelectLetterForVisit,
	onApplySplitCalculation,
}: DmsGuaranteeLettersModalProps) {
	if (!isOpen) return null;

	const handleSave = (letter: DmsGuaranteeLetter) => {
		if (onSaveLetter) {
			onSaveLetter({
				id: letter.id || (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function" ? crypto.randomUUID() : `letter-${Date.now()}`),
				letterNumber: letter.letterNumber,
				insurerKey: letter.insurerKey,
				insurerName: letter.insurerName,
				patientId: patient?.id || letter.patientId || "",
				patientFullName: patient?.fullName || letter.patientFullName || "",
				policyNumber: letter.policyNumber,
				issueDate: letter.issueDate,
				validFrom: letter.validFrom,
				validUntil: letter.validUntil,
				maxCoverageKopecks: Math.round(letter.maxCoverageRub * 100),
				usedAmountKopecks: Math.round(letter.usedAmountRub * 100),
				franchisePct: letter.franchisePct,
				franchiseType: letter.franchiseType === "percent" ? "percent" : "fixed_kopecks",
				franchiseFixedKopecks: letter.franchiseType === "fixed_rub" ? Math.round(letter.franchiseFixedRub * 100) : 0,
				approvedTeethFdi: [],
				approvedServiceCodes804n: letter.approvedServiceCodes || [],
				approvedDiagnosisMkb10: letter.approvedDiagnosisCodes || [],
				curatorFullName: "",
				curatorPhone: "",
				curatorEmail: undefined,
				notes: letter.notes || undefined,
				status: letter.status || "active",
			});
		}
	};

	return (
		<>
			<Zap className="hidden" aria-hidden="true" />
			<DmsGuaranteeLetterModal
				isOpen={isOpen}
				onClose={onClose}
				patient={patient}
				onSave={handleSave}
			/>
		</>
	);
}

export default DmsGuaranteeLettersModal;
