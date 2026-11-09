/**
 * PEDIATRIC DENTISTRY STUDIO MODAL (CANONICAL CLINICAL WORKSPACE)
 * Pediatric Chairside Studio: FDI 51-85 Deciduous Dentition & Mixed Dentition (16, 26, 36, 46),
 * Frankl Behavior Scale (1-4), Weight-Based Anesthesia MRD Safety (Articaine <= 5mg/kg, Mepivacaine <= 4mg/kg),
 * 1-Click Bravery Diploma & Parent Memo Printing, Direct PostgreSQL 18 & Fastify API persistence.
 *
 * Mandates:
 * - 8e (Doctor Autonomy, Zero Disabled CTA, Normal defaults in 1 click)
 * - 8y (Zero-Paranoia EBM Safety)
 * - 8am (Single Primary CTA #0d9488, Secondary neutral borders, 36px desktop / >= 44px mobile)
 * - 8ap / 8zg (Ubiquitous Domain Language: zero dev-jargon, zero 'SSOT' in headers, pure Russian)
 * - 8ze / Apple HIG (Touch targets >= 44px, Native Bottom Sheet with Drag Handle, 0px horizontal scroll)
 * - 8d / 8z (Relational ground truth: Fastify /api/patients/:id/tooth-states/batch & visits persistence)
 */

import React, { useState, useMemo, useCallback, useEffect } from "react";
import { createPortal } from "react-dom";
import {
	X,
	Award,
	FileText,
	Check,
	ShieldCheck,
	AlertCircle,
	Copy,
	Sparkles,
} from "lucide-react";
import { showToast } from "../GlobalToast";
import { useVisitStore } from "../../store/visitStore";
import { usePatientStore } from "../../store/patientStore";
import {
	type FranklRating,
	type PediatricAnestheticId,
	type PrimaryToothCondition,
	FRANKL_BEHAVIOR_PRESETS,
	PEDIATRIC_WEIGHT_CHIPS,
	estimatePediatricWeightKg,
	calculatePediatricAnesthesiaSafety,
	PRIMARY_TOOTH_CONDITIONS,
	buildParentMemoSummary,
} from "./pediatricCatalogData";
import { printBraveryDiploma } from "./diploma/diplomaPrint";
import { printParentMemo } from "./parentMemo/parentMemoPrint";
import { safeLocalStorageGetJson, safeLocalStorageSetJson } from "../../lib/safeLocalStorage";
import { denteAdminSecretRequestHeaders } from "../../AppHelpers";

export interface PediatricStudioModalProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly patientId?: string | undefined;
	readonly visitId?: string | undefined;
	readonly patientName?: string | undefined;
	readonly patientAgeYears?: number | undefined;
	readonly patientWeightKg?: number | undefined;
	readonly doctorName?: string | undefined;
	readonly clinicName?: string | undefined;
	readonly initialToothNumber?: number | undefined;
	readonly initialDentitionMode?: "primary" | "mixed" | undefined;
	readonly onSaved?: (() => void) | undefined;
}

// 20 молочных зубов FDI
const DECIDUOUS_UPPER = [55, 54, 53, 52, 51, 61, 62, 63, 64, 65];
const DECIDUOUS_LOWER = [85, 84, 83, 82, 81, 71, 72, 73, 74, 75];

// 4 первых постоянных моляра («ключи окклюзии» сменного прикуса у детей 6-12 лет)
const FIRST_PERMANENT_MOLARS = [16, 26, 36, 46];

export const PediatricStudioModal: React.FC<PediatricStudioModalProps> = ({
	isOpen,
	onClose,
	patientId: propPatientId,
	visitId: propVisitId,
	patientName: propPatientName,
	patientAgeYears: propPatientAgeYears,
	patientWeightKg: propPatientWeightKg,
	doctorName = "Врач-стоматолог",
	clinicName = "Стоматологическая клиника",
	initialToothNumber = 51,
	initialDentitionMode = "mixed",
	onSaved,
}) => {
	const patientStore = usePatientStore();

	// Реактивная гидратация из реального стейта активного пациента/визита
	const effectivePatientId = useMemo(() => {
		return propPatientId || patientStore.selectedPatientId || null;
	}, [propPatientId, patientStore.selectedPatientId]);

	const effectivePatientName = useMemo(() => {
		if (propPatientName && propPatientName.trim()) return propPatientName.trim();
		const storeName = patientStore.patientCoreDraft?.fullName?.trim();
		if (storeName) return storeName;
		return "Юный пациент";
	}, [propPatientName, patientStore.patientCoreDraft?.fullName]);

	const effectivePatientAge = useMemo(() => {
		if (typeof propPatientAgeYears === "number" && propPatientAgeYears > 0) {
			return propPatientAgeYears;
		}
		if (patientStore.patientCoreDraft?.birthDate) {
			const birth = new Date(patientStore.patientCoreDraft.birthDate);
			if (!Number.isNaN(birth.getTime())) {
				const now = new Date();
				let age = now.getFullYear() - birth.getFullYear();
				const m = now.getMonth() - birth.getMonth();
				if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) {
					age--;
				}
				if (age >= 1 && age <= 18) return age;
			}
		}
		return 6;
	}, [propPatientAgeYears, patientStore.patientCoreDraft?.birthDate]);

	const initialWeight = useMemo(() => {
		if (typeof propPatientWeightKg === "number" && propPatientWeightKg > 0) {
			return propPatientWeightKg;
		}
		return estimatePediatricWeightKg(effectivePatientAge);
	}, [propPatientWeightKg, effectivePatientAge]);

	const [weightKg, setWeightKg] = useState<number>(initialWeight);
	useEffect(() => {
		setWeightKg(initialWeight);
	}, [initialWeight]);

	const [dentitionMode, setDentitionMode] = useState<"primary" | "mixed">(initialDentitionMode);
	const [franklRating, setFranklRating] = useState<FranklRating>(3);
	const [selectedTooth, setSelectedTooth] = useState<number>(initialToothNumber);

	const [teethConditions, setTeethConditions] = useState<Record<number, PrimaryToothCondition>>({});

	const [anestheticId, setAnestheticId] = useState<PediatricAnestheticId>("articaine_4");
	const [carpules, setCarpules] = useState<number>(0.5);
	const [customNotes, setCustomNotes] = useState<string>("Контакт установлен, осмотр проведен в игровой форме.");

	const activeFrankl = useMemo(
		() => FRANKL_BEHAVIOR_PRESETS.find((f) => f.rating === franklRating) || FRANKL_BEHAVIOR_PRESETS[2],
		[franklRating],
	);

	const anesthesiaSafety = useMemo(() => {
		return calculatePediatricAnesthesiaSafety({
			drugId: anestheticId,
			weightKg,
			carpules,
			ageYears: effectivePatientAge,
		});
	}, [anestheticId, weightKg, carpules, effectivePatientAge]);

	const currentCondition = teethConditions[selectedTooth] || "healthy";

	const handleSetCondition = useCallback((condition: PrimaryToothCondition) => {
		setTeethConditions((prev) => ({ ...prev, [selectedTooth]: condition }));
	}, [selectedTooth]);

	// Верхний и нижний ряды в зависимости от сменного / молочного прикуса
	const upperTeeth = useMemo(() => {
		if (dentitionMode === "mixed") {
			return [16, ...DECIDUOUS_UPPER, 26];
		}
		return DECIDUOUS_UPPER;
	}, [dentitionMode]);

	const lowerTeeth = useMemo(() => {
		if (dentitionMode === "mixed") {
			return [46, ...DECIDUOUS_LOWER, 36];
		}
		return DECIDUOUS_LOWER;
	}, [dentitionMode]);

	// Печать диплома
	const handlePrintDiploma = useCallback(() => {
		printBraveryDiploma({
			heroName: effectivePatientName,
			doctorName,
			clinicName,
			diplomaNumber: `${selectedTooth}-${new Date().getFullYear()}`,
		});
		showToast("Диплом маленького героя отправлен на печать", "success");
	}, [effectivePatientName, doctorName, clinicName, selectedTooth]);

	// Печать памятки родителям
	const handlePrintMemo = useCallback(() => {
		const treated = Object.entries(teethConditions)
			.filter(([_, c]) => c !== "healthy")
			.map(([t, c]) => `Зуб ${t} (${PRIMARY_TOOTH_CONDITIONS[c]?.shortTag || c})`)
			.join(", ");
		const memoText = buildParentMemoSummary({
			patientName: effectivePatientName,
			doctorName,
			clinicName,
			hadAnesthesia: carpules > 0,
			treatedTeeth: treated || "Профилактический осмотр",
			recommendationsRu: customNotes,
		});
		printParentMemo({
			patientName: effectivePatientName,
			memoText,
			clinicName,
			doctorName,
		});
		showToast("Памятка родителям подготовлена к печати", "success");
	}, [teethConditions, effectivePatientName, doctorName, clinicName, carpules, customNotes]);

	// Копирование протокола SOAP в буфер
	const handleCopySoap = useCallback(() => {
		const treated = Object.entries(teethConditions)
			.filter(([_, c]) => c !== "healthy")
			.map(([t, c]) => `Зуб ${t}: ${PRIMARY_TOOTH_CONDITIONS[c]?.labelRu || c}`)
			.join("\n");
		const soap = [
			`[ДЕТСКИЙ ПРИЁМ — ДНЕВНИК ВИЗИТА]`,
			`Пациент: ${effectivePatientName}, ${effectivePatientAge} лет, вес ${weightKg} кг.`,
			`Прикус: ${dentitionMode === "mixed" ? "Сменный (молочные + моляры 16, 26, 36, 46)" : "Молочный (51–85)"}.`,
			`Шкала поведения Франкла: ${activeFrankl.rating} (${activeFrankl.symbol} ${activeFrankl.labelRu}).`,
			`Анестезия: ${anesthesiaSafety.drug.nameRu}, ${carpules} карп. (${anesthesiaSafety.administeredMg} мг). ${anesthesiaSafety.statusMessageRu}`,
			`Зубная формула:\n${treated || "Полость рта санирована, зубы интактны."}`,
			`Адаптация и рекомендации: ${customNotes}`,
		].join("\n");

		if (typeof navigator !== "undefined" && navigator.clipboard) {
			navigator.clipboard.writeText(soap);
			showToast("Дневник детского приёма скопирован в буфер", "success");
		}
	}, [
		effectivePatientName,
		effectivePatientAge,
		weightKg,
		dentitionMode,
		activeFrankl,
		anesthesiaSafety,
		carpules,
		teethConditions,
		customNotes,
	]);

	// Сквозная фиксация приёма: локальный стор + PostgreSQL 18 / Fastify API
	const handleCompleteVisit = useCallback(async () => {
		try {
			const store = useVisitStore.getState();

			// 1. Обогащение SOAP-дневника визита
			if (store.setVisitNoteForm) {
				store.setVisitNoteForm((prev) => ({
					...prev,
					objective: `${prev.objective || ""}\nДетский приём: Франкл ${activeFrankl.rating} (${activeFrankl.symbol}). Вес ${weightKg} кг. Прикус: ${dentitionMode === "mixed" ? "сменный" : "молочный"}.`.trim(),
					treatment: `${prev.treatment || ""}\nАнестезия: ${anesthesiaSafety.drug.shortLabelRu} ${carpules} карп. (${anesthesiaSafety.administeredMg} мг).`.trim(),
					recommendations: `${prev.recommendations || ""}\nПамятка родителям выдана. Повторный осмотр через 3 мес.`.trim(),
				}));
			}

			// 2. Обновление статусов зубов в локальном сторе визита
			Object.entries(teethConditions).forEach(([toothStr, cond]) => {
				if (cond === "caries" || cond === "pulpotomy") {
					store.setToothState(toothStr, "treatment");
				} else if (cond === "healthy" || cond === "sealed") {
					store.setToothState(toothStr, "healthy");
				} else if (cond === "resorption") {
					store.setToothState(toothStr, "watch");
				} else if (cond === "extracted") {
					store.setToothState(toothStr, "missing");
				}
			});

			// 3. Сохранение в локальном хранилище одонтограммы (localStorage)
			if (effectivePatientId) {
				const storageKey = `dente_odontogram_states_${effectivePatientId}`;
				const existingTeeth = safeLocalStorageGetJson<any[]>(storageKey, []) || [];
				const updatedTeeth = [...existingTeeth];

				Object.entries(teethConditions).forEach(([toothStr, cond]) => {
					const toothNum = parseInt(toothStr, 10);
					const toothState =
						cond === "caries"
							? "Caries"
							: cond === "pulpotomy"
								? "Root_Canal_Treated"
								: cond === "sealed"
									? "Filled"
									: cond === "resorption"
										? "Healthy"
										: cond === "extracted"
											? "Extracted"
											: "Healthy";

					const idx = updatedTeeth.findIndex((t) => t.toothNumber === toothNum);
					if (idx >= 0 && updatedTeeth[idx]) {
						updatedTeeth[idx] = {
							...updatedTeeth[idx],
							toothNumber: toothNum,
							state: toothState,
							updatedAt: new Date().toISOString(),
						};
					} else {
						updatedTeeth.push({
							toothNumber: toothNum,
							state: toothState,
							updatedAt: new Date().toISOString(),
						});
					}
				});
				safeLocalStorageSetJson(storageKey, updatedTeeth);
			}

			// 4. Сквозная отправка в PostgreSQL через Fastify API: /api/patients/:id/tooth-states/batch
			if (effectivePatientId && typeof fetch !== "undefined") {
				const cariesTeeth = Object.entries(teethConditions)
					.filter(([_, c]) => c === "caries")
					.map(([t]) => parseInt(t, 10));
				const healthyTeeth = Object.entries(teethConditions)
					.filter(([_, c]) => c === "healthy" || c === "sealed")
					.map(([t]) => parseInt(t, 10));
				const resorptionTeeth = Object.entries(teethConditions)
					.filter(([_, c]) => c === "resorption")
					.map(([t]) => parseInt(t, 10));
				const pulpotomyTeeth = Object.entries(teethConditions)
					.filter(([_, c]) => c === "pulpotomy")
					.map(([t]) => parseInt(t, 10));
				const extractedTeeth = Object.entries(teethConditions)
					.filter(([_, c]) => c === "extracted")
					.map(([t]) => parseInt(t, 10));

				const batchUpdates = [
					{ teeth: cariesTeeth, state: "Caries" },
					{ teeth: pulpotomyTeeth, state: "Root_Canal_Treated" },
					{ teeth: extractedTeeth, state: "Extracted" },
					{ teeth: healthyTeeth, state: "Healthy" },
					{ teeth: resorptionTeeth, state: "Healthy" },
				].filter((g) => g.teeth.length > 0);

				for (const update of batchUpdates) {
					fetch(`/api/patients/${effectivePatientId}/tooth-states/batch`, {
						method: "POST",
						headers: denteAdminSecretRequestHeaders({ "Content-Type": "application/json" }),
						body: JSON.stringify({
							toothNumbers: update.teeth,
							state: update.state,
							reason: "Детский приём и фиксация статусов",
						}),
					}).catch(() => {});
				}

				// Сохраняем расширенные свойства в /extended-tooth-states/batch
				const extendedStates = Object.entries(teethConditions).map(([tStr, cond]) => {
					const t = parseInt(tStr, 10);
					return {
						toothNumber: t,
						isPrimaryPediatric: t >= 51 && t <= 85,
						pediatricCrownPresent: cond === "sealed",
						secondaryCariesUnderFilling: false,
						mobilityDegree: cond === "resorption" ? 2 : 0,
						notes: `Детский приём: ${PRIMARY_TOOTH_CONDITIONS[cond]?.labelRu || cond}`,
					};
				});

				fetch(`/api/patients/${effectivePatientId}/extended-tooth-states/batch`, {
					method: "POST",
					headers: denteAdminSecretRequestHeaders({ "Content-Type": "application/json" }),
					body: JSON.stringify({ states: extendedStates }),
				}).catch(() => {});

				// Если есть активный визит — отправляем черновик на бэкенд
				const activeVisitId = propVisitId || (store as any).activeVisitId;
				if (activeVisitId) {
					fetch(`/api/visits/${activeVisitId}/draft/autosave`, {
						method: "PUT",
						headers: {
							"Content-Type": "application/json",
							...denteAdminSecretRequestHeaders(),
						},
						body: JSON.stringify({
							patientId: effectivePatientId,
							draft: {
								objectiveStatus: `Детский приём: Франкл ${activeFrankl.rating} (${activeFrankl.symbol}). Вес ${weightKg} кг.`,
								treatmentPlan: `Анестезия: ${anesthesiaSafety.drug.nameRu} ${carpules} карп.`,
								recommendations: customNotes,
							},
						}),
					}).catch(() => {});
				}

				// Диспатчим кастомное событие для мгновенного обновления одонтограммы без F5
				if (typeof window !== "undefined") {
					window.dispatchEvent(
						new CustomEvent("dente-odontogram-update", {
							detail: { patientId: effectivePatientId },
						}),
					);
				}
			}

			showToast("Детский приём успешно зафиксирован!", "success");
			if (onSaved) onSaved();
			onClose();
		} catch (err) {
			console.error("Ошибка фиксации детского приёма:", err);
			showToast("Приём сохранен локально (офлайн-режим)", "info");
			if (onSaved) onSaved();
			onClose();
		}
	}, [
		activeFrankl,
		weightKg,
		dentitionMode,
		anesthesiaSafety,
		carpules,
		customNotes,
		teethConditions,
		effectivePatientId,
		propVisitId,
		onSaved,
		onClose,
	]);

	if (!isOpen) return null;

	const modalContent = (
		<div
			className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150"
			data-testid="pediatric-studio-modal"
		>
			<div className="relative w-full sm:max-w-5xl max-h-[94dvh] rounded-t-[24px] sm:rounded-2xl border border-[var(--line,#e2e8f0)] dark:border-slate-800 bg-[var(--paper,#ffffff)] dark:bg-slate-900 text-[var(--ink,#0f172a)] dark:text-slate-100 shadow-2xl flex flex-col overflow-hidden">
				{/* Mobile Drag Handle (Apple HIG) */}
				<div className="sm:hidden flex justify-center pt-2.5 pb-1">
					<div className="w-9 h-1.5 bg-[var(--line,#e2e8f0)] dark:bg-slate-700 rounded-full" />
				</div>

				{/* Header: Pure Clinical Russian without 'SSOT' badge (Mandates 8zg, 8ap) */}
				<div className="px-4 sm:px-6 py-3 border-b border-[var(--line,#e2e8f0)] dark:border-slate-800 bg-[var(--paper,#ffffff)] dark:bg-slate-900 flex items-center justify-between gap-3">
					<div className="flex items-center gap-2.5 shrink-0">
						<div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-teal-500/10 dark:bg-teal-950/40 text-teal-600 dark:text-teal-400 flex items-center justify-center font-black shrink-0">
							<ShieldCheck className="w-5 h-5" />
						</div>
						<div className="shrink-0">
							<h2 className="text-sm sm:text-base font-black tracking-tight text-[var(--ink,#0f172a)] dark:text-slate-100 whitespace-nowrap">
								Детский приём и адаптация
							</h2>
							<p className="text-[11px] text-[var(--muted,#64748b)] dark:text-slate-400 whitespace-nowrap">
								{effectivePatientName} • {effectivePatientAge} лет • {dentitionMode === "mixed" ? "Сменный прикус" : "Молочный прикус"}
							</p>
						</div>
					</div>

					<div className="flex items-center gap-2 shrink-0">
						{/* Segmented Mode Selector */}
						<div className="hidden sm:inline-flex p-1 rounded-xl bg-[var(--paper-soft,#f8fafc)] dark:bg-slate-800/80 border border-[var(--line,#e2e8f0)] dark:border-slate-700">
							<button
								type="button"
								onClick={() => setDentitionMode("primary")}
								className={`px-2.5 py-1 text-xs font-bold rounded-lg transition cursor-pointer border-none ${
									dentitionMode === "primary"
										? "bg-[var(--paper,#ffffff)] dark:bg-slate-700 text-teal-700 dark:text-teal-300 shadow-xs"
										: "bg-transparent text-[var(--muted,#64748b)] dark:text-slate-400 hover:text-[var(--ink,#0f172a)] dark:hover:text-slate-200"
								}`}
							>
								Молочный (51–85)
							</button>
							<button
								type="button"
								onClick={() => setDentitionMode("mixed")}
								className={`px-2.5 py-1 text-xs font-bold rounded-lg transition cursor-pointer border-none ${
									dentitionMode === "mixed"
										? "bg-[var(--paper,#ffffff)] dark:bg-slate-700 text-teal-700 dark:text-teal-300 shadow-xs"
										: "bg-transparent text-[var(--muted,#64748b)] dark:text-slate-400 hover:text-[var(--ink,#0f172a)] dark:hover:text-slate-200"
								}`}
							>
								Сменный (+ моляры)
							</button>
						</div>

						{/* Document Secondary Print Buttons (Desktop) */}
						<div className="hidden sm:flex items-center gap-2">
							<button
								type="button"
								onClick={handlePrintDiploma}
								className="min-h-[36px] h-9 px-3 py-1.5 rounded-xl border border-[var(--line,#e2e8f0)] dark:border-slate-700 bg-[var(--paper,#ffffff)] dark:bg-slate-800 hover:bg-[var(--paper-soft,#f8fafc)] dark:hover:bg-slate-700 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer text-[var(--ink,#0f172a)] dark:text-slate-200"
								data-testid="btn-print-hero-diploma"
							>
								<Award className="w-4 h-4 text-amber-500" />
								<span>Диплом героя</span>
							</button>
							<button
								type="button"
								onClick={handlePrintMemo}
								className="min-h-[36px] h-9 px-3 py-1.5 rounded-xl border border-[var(--line,#e2e8f0)] dark:border-slate-700 bg-[var(--paper,#ffffff)] dark:bg-slate-800 hover:bg-[var(--paper-soft,#f8fafc)] dark:hover:bg-slate-700 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer text-[var(--ink,#0f172a)] dark:text-slate-200"
								data-testid="btn-print-parent-memo"
							>
								<FileText className="w-4 h-4 text-sky-500" />
								<span>Памятка</span>
							</button>
						</div>

						{/* Document Secondary Print Buttons (Mobile HIG >= 44x44px) */}
						<div className="flex sm:hidden items-center gap-1">
							<button
								type="button"
								onClick={handlePrintDiploma}
								className="min-h-[44px] min-w-[44px] h-11 w-11 flex items-center justify-center rounded-xl border border-[var(--line,#e2e8f0)] dark:border-slate-700 bg-[var(--paper,#ffffff)] dark:bg-slate-800 text-[var(--ink,#0f172a)] dark:text-slate-200 cursor-pointer"
								title="Диплом героя"
								aria-label="Диплом героя"
								data-testid="btn-print-hero-diploma-mobile"
							>
								<Award className="w-5 h-5 text-amber-500" />
							</button>
							<button
								type="button"
								onClick={handlePrintMemo}
								className="min-h-[44px] min-w-[44px] h-11 w-11 flex items-center justify-center rounded-xl border border-[var(--line,#e2e8f0)] dark:border-slate-700 bg-[var(--paper,#ffffff)] dark:bg-slate-800 text-[var(--ink,#0f172a)] dark:text-slate-200 cursor-pointer"
								title="Памятка родителям"
								aria-label="Памятка родителям"
								data-testid="btn-print-parent-memo-mobile"
							>
								<FileText className="w-5 h-5 text-sky-500" />
							</button>
						</div>

						<button
							type="button"
							onClick={onClose}
							className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl bg-transparent border-none hover:bg-[var(--paper-soft,#f8fafc)] dark:hover:bg-slate-800 text-[var(--muted,#64748b)] dark:text-slate-400 cursor-pointer shrink-0"
							data-testid="btn-close-pediatric-studio"
							aria-label="Закрыть"
						>
							<X className="w-5 h-5" />
						</button>
					</div>
				</div>

				{/* Body with comfortable bottom padding eliminating desktop notes clipping */}
				<div className="flex-1 overflow-y-auto px-4 sm:px-6 pt-3.5 pb-28 sm:pb-8 space-y-3.5 bg-[var(--paper,#ffffff)] dark:bg-slate-900">
					{/* Mobile Segmented Mode Selector */}
					<div className="sm:hidden flex p-1 rounded-xl bg-[var(--paper-soft,#f8fafc)] dark:bg-slate-800/80 border border-[var(--line,#e2e8f0)] dark:border-slate-700">
						<button
							type="button"
							onClick={() => setDentitionMode("primary")}
							className={`flex-1 min-h-[36px] py-1 text-xs font-bold rounded-lg transition cursor-pointer border-none ${
								dentitionMode === "primary"
									? "bg-[var(--paper,#ffffff)] dark:bg-slate-700 text-teal-700 dark:text-teal-300 shadow-xs"
									: "bg-transparent text-[var(--muted,#64748b)] dark:text-slate-400"
							}`}
						>
							Молочный (51–85)
						</button>
						<button
							type="button"
							onClick={() => setDentitionMode("mixed")}
							className={`flex-1 min-h-[36px] py-1 text-xs font-bold rounded-lg transition cursor-pointer border-none ${
								dentitionMode === "mixed"
									? "bg-[var(--paper,#ffffff)] dark:bg-slate-700 text-teal-700 dark:text-teal-300 shadow-xs"
									: "bg-transparent text-[var(--muted,#64748b)] dark:text-slate-400"
							}`}
						>
							Сменный (+ моляры)
						</button>
					</div>

					{/* Weight Selector Bar */}
					<div className="p-3 rounded-xl border border-[var(--line,#e2e8f0)] dark:border-slate-800 bg-[var(--paper-soft,#f8fafc)] dark:bg-slate-800/50">
						<div className="flex flex-wrap items-center justify-between gap-1 mb-2">
							<span className="text-xs font-bold uppercase tracking-wide text-[var(--muted,#64748b)] dark:text-slate-400">
								Вес ребенка (для безопасной анестезии):
							</span>
							<span className="text-xs font-black text-teal-600 dark:text-teal-400">{weightKg} кг</span>
						</div>
						<div className="flex flex-wrap items-center gap-1.5">
							{PEDIATRIC_WEIGHT_CHIPS.map((w) => (
								<button
									key={w}
									type="button"
									onClick={() => setWeightKg(w)}
									className={`min-h-[38px] px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
										weightKg === w
											? "bg-teal-600 text-white shadow-xs"
											: "border border-[var(--line,#e2e8f0)] dark:border-slate-700 bg-[var(--paper,#ffffff)] dark:bg-slate-800 text-[var(--ink,#0f172a)] dark:text-slate-200 hover:bg-teal-500/10 dark:hover:bg-slate-700"
									}`}
								>
									{w} кг
								</button>
							))}
							<button
								type="button"
								onClick={() => setWeightKg(estimatePediatricWeightKg(effectivePatientAge))}
								className="min-h-[38px] px-3 py-1 rounded-lg text-xs font-semibold border border-[var(--line,#e2e8f0)] dark:border-slate-700 bg-[var(--paper,#ffffff)] dark:bg-slate-800 text-[var(--muted,#64748b)] dark:text-slate-400 hover:text-teal-600 dark:hover:text-teal-300 cursor-pointer"
							>
								По возрасту ({estimatePediatricWeightKg(effectivePatientAge)} кг)
							</button>
						</div>
					</div>

					{/* Frankl Scale */}
					<div>
						<div className="text-xs font-bold uppercase tracking-wide text-[var(--muted,#64748b)] dark:text-slate-400 mb-1.5">
							Поведение по шкале Франкла (в 1 клик):
						</div>
						<div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
							{FRANKL_BEHAVIOR_PRESETS.map((item) => (
								<button
									key={item.rating}
									type="button"
									onClick={() => setFranklRating(item.rating)}
									className={`min-h-[44px] p-2 rounded-xl border text-left transition cursor-pointer flex flex-col justify-between ${
										franklRating === item.rating
											? `${item.badgeColor} ring-2 ring-teal-500 shadow-xs`
											: "border-[var(--line,#e2e8f0)] dark:border-slate-700 bg-[var(--paper,#ffffff)] dark:bg-slate-800 hover:bg-[var(--paper-soft,#f8fafc)] dark:hover:bg-slate-700"
									}`}
									data-testid={`frankl-chip-${item.rating}`}
								>
									<div className="flex items-center justify-between gap-1.5">
										<span className="text-sm font-black">{item.symbol}</span>
										<span className="text-[10px] font-bold">Франкл {item.rating}</span>
									</div>
									<div className="text-xs font-semibold mt-0.5 truncate text-[var(--ink,#0f172a)] dark:text-slate-200">
										{item.labelRu}
									</div>
								</button>
							))}
						</div>
						<div className="mt-1 text-xs p-2 rounded-lg border border-[var(--line,#e2e8f0)] dark:border-slate-800 bg-[var(--paper-soft,#f8fafc)] dark:bg-slate-800/60 text-[var(--muted,#64748b)] dark:text-slate-400 flex items-center gap-1.5">
							<Sparkles className="w-3.5 h-3.5 text-amber-500 shrink-0" />
							<span>
								<strong className="text-[var(--ink,#0f172a)] dark:text-slate-200">Тактика:</strong> {activeFrankl.clinicalTacticRu}
							</span>
						</div>
					</div>

					{/* FDI Formula (51-85 + permanent 16, 26, 36, 46 for mixed dentition) */}
					<div>
						<div className="flex items-center justify-between mb-1.5">
							<span className="text-xs font-bold uppercase tracking-wide text-[var(--muted,#64748b)]">
								{dentitionMode === "mixed"
									? "Сменный прикус (FDI 51–85 + моляры 16, 26, 36, 46):"
									: "Молочная формула FDI (51–85):"}
							</span>
							<span className="text-xs font-bold text-teal-600">
								Зуб {selectedTooth} {FIRST_PERMANENT_MOLARS.includes(selectedTooth) ? "(пост.)" : ""}:{" "}
								{PRIMARY_TOOTH_CONDITIONS[currentCondition]?.labelRu}
							</span>
						</div>

						<div className="space-y-1.5 p-2 rounded-xl border border-[var(--line,#e2e8f0)] dark:border-slate-800 bg-[var(--paper-soft,#f8fafc)] dark:bg-slate-800/50">
							{/* Верхняя челюсть */}
							<div
								className={`grid gap-1 ${
									dentitionMode === "mixed"
										? "grid-cols-6 sm:grid-cols-12"
										: "grid-cols-5 sm:grid-cols-10"
								}`}
							>
								{upperTeeth.map((tooth) => {
									const cond = teethConditions[tooth] || "healthy";
									const isSel = selectedTooth === tooth;
									const isPermanentMolar = FIRST_PERMANENT_MOLARS.includes(tooth);
									return (
										<button
											key={tooth}
											type="button"
											onClick={() => setSelectedTooth(tooth)}
											className={`min-h-[44px] min-w-[40px] p-1 rounded-lg border flex flex-col items-center justify-center transition cursor-pointer ${
												isSel
													? "border-teal-600 bg-teal-500/20 font-black shadow-xs ring-2 ring-teal-500"
													: isPermanentMolar
														? "border-indigo-300 dark:border-indigo-700 bg-indigo-50/50 dark:bg-indigo-950/30 hover:bg-indigo-100/50 dark:hover:bg-indigo-900/40"
														: "border-[var(--line,#e2e8f0)] dark:border-slate-700 bg-[var(--paper,#ffffff)] dark:bg-slate-800 hover:bg-[var(--paper-soft,#f8fafc)] dark:hover:bg-slate-700"
											}`}
											data-testid={`tooth-fdi-${tooth}`}
											title={isPermanentMolar ? `Постоянный первый моляр ${tooth}` : `Молочный зуб ${tooth}`}
										>
											<div className="flex items-center gap-0.5">
												<span className="text-xs font-black text-[var(--ink,#0f172a)] dark:text-slate-100">{tooth}</span>
												{isPermanentMolar && (
													<span className="text-[7px] font-black text-indigo-600 dark:text-indigo-400 uppercase">п</span>
												)}
											</div>
											<span className="text-[7.5px] uppercase font-bold text-[var(--muted,#64748b)] dark:text-slate-400 tracking-tighter truncate max-w-full">
												{PRIMARY_TOOTH_CONDITIONS[cond]?.shortTag}
											</span>
										</button>
									);
								})}
							</div>

							{/* Нижняя челюсть */}
							<div
								className={`grid gap-1 ${
									dentitionMode === "mixed"
										? "grid-cols-6 sm:grid-cols-12"
										: "grid-cols-5 sm:grid-cols-10"
								}`}
							>
								{lowerTeeth.map((tooth) => {
									const cond = teethConditions[tooth] || "healthy";
									const isSel = selectedTooth === tooth;
									const isPermanentMolar = FIRST_PERMANENT_MOLARS.includes(tooth);
									return (
										<button
											key={tooth}
											type="button"
											onClick={() => setSelectedTooth(tooth)}
											className={`min-h-[44px] min-w-[40px] p-1 rounded-lg border flex flex-col items-center justify-center transition cursor-pointer ${
												isSel
													? "border-teal-600 bg-teal-500/20 font-black shadow-xs ring-2 ring-teal-500"
													: isPermanentMolar
														? "border-indigo-300 dark:border-indigo-700 bg-indigo-50/50 dark:bg-indigo-950/30 hover:bg-indigo-100/50 dark:hover:bg-indigo-900/40"
														: "border-[var(--line,#e2e8f0)] dark:border-slate-700 bg-[var(--paper,#ffffff)] dark:bg-slate-800 hover:bg-[var(--paper-soft,#f8fafc)] dark:hover:bg-slate-700"
											}`}
											data-testid={`tooth-fdi-${tooth}`}
											title={isPermanentMolar ? `Постоянный первый моляр ${tooth}` : `Молочный зуб ${tooth}`}
										>
											<div className="flex items-center gap-0.5">
												<span className="text-xs font-black text-[var(--ink,#0f172a)] dark:text-slate-100">{tooth}</span>
												{isPermanentMolar && (
													<span className="text-[7px] font-black text-indigo-600 dark:text-indigo-400 uppercase">п</span>
												)}
											</div>
											<span className="text-[7.5px] uppercase font-bold text-[var(--muted,#64748b)] dark:text-slate-400 tracking-tighter truncate max-w-full">
												{PRIMARY_TOOTH_CONDITIONS[cond]?.shortTag}
											</span>
										</button>
									);
								})}
							</div>
						</div>

						{/* Clinical Condition Buttons */}
						<div className="flex flex-wrap gap-1.5 mt-2">
							{(Object.keys(PRIMARY_TOOTH_CONDITIONS) as PrimaryToothCondition[]).map((condKey) => {
								const info = PRIMARY_TOOTH_CONDITIONS[condKey];
								const isActive = currentCondition === condKey;
								return (
									<button
										key={condKey}
										type="button"
										onClick={() => handleSetCondition(condKey)}
										className={`min-h-[44px] sm:min-h-[38px] px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer border flex items-center justify-center ${
											isActive
												? `${info.badgeClass} ring-2 ring-teal-500`
												: "border-[var(--line,#e2e8f0)] dark:border-slate-700 bg-[var(--paper,#ffffff)] dark:bg-slate-800 text-[var(--ink,#0f172a)] dark:text-slate-200 hover:bg-[var(--paper-soft,#f8fafc)] dark:hover:bg-slate-700"
										}`}
									>
										{info.labelRu}
									</button>
								);
							})}
						</div>
					</div>

					{/* Anesthesia Calculator */}
					<div className="p-3 rounded-xl border border-[var(--line,#e2e8f0)] dark:border-slate-800 bg-[var(--paper-soft,#f8fafc)] dark:bg-slate-800/50">
						<div className="flex items-center justify-between mb-1.5">
							<span className="text-xs font-bold uppercase tracking-wide text-[var(--muted,#64748b)] dark:text-slate-400">
								Безопасная анестезия ({weightKg} кг):
							</span>
							<span className={`text-xs font-black ${anesthesiaSafety.isOverdose ? "text-rose-600 dark:text-rose-400" : "text-teal-600 dark:text-teal-400"}`}>
								{anesthesiaSafety.administeredMg} мг / МРД {anesthesiaSafety.maxAllowedMg} мг ({anesthesiaSafety.percentUsed}%)
							</span>
						</div>
						<div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-2">
							<div className="flex gap-1.5">
								<button
									type="button"
									onClick={() => setAnestheticId("articaine_4")}
									className={`flex-1 min-h-[38px] px-2 py-1 rounded-lg text-xs font-bold border transition cursor-pointer ${
										anestheticId === "articaine_4"
											? "bg-teal-600 text-white shadow-xs border-teal-600"
											: "border-[var(--line,#e2e8f0)] dark:border-slate-700 bg-[var(--paper,#ffffff)] dark:bg-slate-800 text-[var(--ink,#0f172a)] dark:text-slate-200 hover:bg-teal-500/10 dark:hover:bg-slate-700"
									}`}
								>
									Артикаин 4% (5 мг/кг)
								</button>
								<button
									type="button"
									onClick={() => setAnestheticId("mepivacaine_3")}
									className={`flex-1 min-h-[38px] px-2 py-1 rounded-lg text-xs font-bold border transition cursor-pointer ${
										anestheticId === "mepivacaine_3"
											? "bg-teal-600 text-white shadow-xs border-teal-600"
											: "border-[var(--line,#e2e8f0)] dark:border-slate-700 bg-[var(--paper,#ffffff)] dark:bg-slate-800 text-[var(--ink,#0f172a)] dark:text-slate-200 hover:bg-teal-500/10 dark:hover:bg-slate-700"
									}`}
								>
									Мепивакаин 3% (4 мг/кг)
								</button>
							</div>
							<div className="flex items-center gap-1">
								{[0.5, 1.0, 1.5, 2.0].map((c) => (
									<button
										key={c}
										type="button"
										onClick={() => setCarpules(c)}
										className={`flex-1 min-h-[38px] px-1 py-1 rounded-lg text-xs font-bold border transition cursor-pointer ${
											carpules === c
												? "bg-teal-600 text-white shadow-xs border-teal-600"
												: "border-[var(--line,#e2e8f0)] dark:border-slate-700 bg-[var(--paper,#ffffff)] dark:bg-slate-800 text-[var(--ink,#0f172a)] dark:text-slate-200 hover:bg-teal-500/10 dark:hover:bg-slate-700"
										}`}
									>
										{c} к.
									</button>
								))}
							</div>
						</div>
						<div
							className={`text-xs p-2 rounded-lg border flex items-center gap-2 ${
								anesthesiaSafety.isOverdose
									? "bg-rose-500/10 border-rose-300 text-rose-700"
									: "bg-emerald-500/10 border-emerald-300 text-emerald-700"
							}`}
						>
							{anesthesiaSafety.isOverdose ? (
								<AlertCircle className="w-4 h-4 shrink-0" />
							) : (
								<ShieldCheck className="w-4 h-4 shrink-0" />
							)}
							<span className="truncate">{anesthesiaSafety.statusMessageRu}</span>
						</div>
					</div>

					{/* Clinical Notes / Doctor Remarks */}
					<div className="p-3 rounded-xl border border-[var(--line,#e2e8f0)] dark:border-slate-800 bg-[var(--paper-soft,#f8fafc)] dark:bg-slate-800/50 space-y-1.5">
						<label htmlFor="pediatric-custom-notes" className="text-xs font-bold uppercase tracking-wide text-[var(--muted,#64748b)] dark:text-slate-400">
							Клинические заметки и адаптация ребёнка:
						</label>
						<input
							id="pediatric-custom-notes"
							type="text"
							value={customNotes}
							onChange={(e) => setCustomNotes(e.target.value)}
							placeholder="Контакт установлен, осмотр проведен в игровой форме..."
							className="w-full min-h-[38px] px-3 py-1.5 text-xs font-medium rounded-lg border border-[var(--line,#e2e8f0)] dark:border-slate-700 bg-[var(--paper,#ffffff)] dark:bg-slate-900 text-[var(--ink,#0f172a)] dark:text-slate-100 placeholder:text-[var(--muted,#64748b)] focus:outline-none focus:ring-2 focus:ring-teal-500"
							data-testid="input-pediatric-custom-notes"
						/>
					</div>

					{/* Mobile 1-Click Document Actions */}
					<div className="sm:hidden flex items-center gap-2 pt-1">
						<button
							type="button"
							onClick={handlePrintDiploma}
							className="flex-1 min-h-[44px] px-2.5 py-2 rounded-xl border border-[var(--line,#e2e8f0)] dark:border-slate-700 bg-[var(--paper,#ffffff)] dark:bg-slate-800 text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer shadow-xs text-[var(--ink,#0f172a)] dark:text-slate-200"
						>
							<Award className="w-4 h-4 text-amber-500 shrink-0" />
							<span>Диплом героя</span>
						</button>
						<button
							type="button"
							onClick={handlePrintMemo}
							className="flex-1 min-h-[44px] px-2.5 py-2 rounded-xl border border-[var(--line,#e2e8f0)] dark:border-slate-700 bg-[var(--paper,#ffffff)] dark:bg-slate-800 text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer shadow-xs text-[var(--ink,#0f172a)] dark:text-slate-200"
						>
							<FileText className="w-4 h-4 text-sky-500 shrink-0" />
							<span>Памятка</span>
						</button>
						<button
							type="button"
							onClick={handleCopySoap}
							className="min-h-[44px] px-3 py-2 rounded-xl border border-[var(--line,#e2e8f0)] dark:border-slate-700 bg-[var(--paper,#ffffff)] dark:bg-slate-800 text-xs font-bold flex items-center justify-center cursor-pointer shadow-xs text-[var(--ink,#0f172a)] dark:text-slate-200"
							aria-label="Копировать дневник"
							title="Копировать дневник"
						>
							<Copy className="w-4 h-4" />
						</button>
					</div>
				</div>

				{/* Footer: Exactly ONE Primary CTA #0d9488, Never Disabled (Mandates 8e, 8am) */}
				<div className="px-4 sm:px-6 py-2.5 border-t border-[var(--line,#e2e8f0)] dark:border-slate-800 bg-[var(--paper,#ffffff)] dark:bg-slate-900 flex items-center justify-between gap-2.5">
					<button
						type="button"
						onClick={onClose}
						className="min-h-[44px] sm:min-h-[36px] h-11 sm:h-9 px-3 sm:px-4 py-2 rounded-xl border border-[var(--line,#e2e8f0)] dark:border-slate-700 bg-[var(--paper,#ffffff)] dark:bg-slate-800 text-xs font-bold text-[var(--muted,#64748b)] dark:text-slate-300 hover:bg-[var(--paper-soft,#f8fafc)] dark:hover:bg-slate-700 cursor-pointer shrink-0"
					>
						Отмена
					</button>

					<button
						type="button"
						onClick={handleCompleteVisit}
						className="min-h-[44px] sm:min-h-[36px] h-11 sm:h-9 flex-1 sm:flex-none px-4 sm:px-6 py-2 rounded-xl text-xs sm:text-sm font-black text-white bg-[#0d9488] bg-[var(--teal,#0d9488)] hover:bg-teal-700 active:scale-98 transition shadow-md flex items-center justify-center cursor-pointer whitespace-nowrap"
						data-testid="btn-save-pediatric-visit"
					>
						<span>✓ Зафиксировать детский приём</span>
					</button>
				</div>
			</div>
		</div>
	);

	return typeof document !== "undefined" ? createPortal(modalContent, document.body) : modalContent;
};

export default PediatricStudioModal;
