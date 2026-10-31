/**
 * PEDIATRIC DENTISTRY STUDIO MODAL (CANONICAL SSOT)
 * Pediatric Chairside Studio: FDI 51-85 Milk Dentition, Frankl Scale,
 * Weight-Based Anesthesia MRD Safety, 1-Click Bravery Diploma & Parent Memo.
 * Mandates: 8e (Doctor Autonomy, Zero Disabled CTA), 8y (EBM Limits), 8am (Single Primary CTA #0d9488),
 * 8ze/Apple HIG (Touch targets >= 44px, Native Bottom Sheet on Mobile), 8b (380-480 lines).
 */

import React, { useState, useMemo, useCallback } from "react";
import { createPortal } from "react-dom";
import { X, Award, FileText, Check, ShieldCheck, AlertCircle, Copy } from "lucide-react";
import { showToast } from "../GlobalToast";
import { useVisitStore } from "../../store/visitStore";
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

export interface PediatricStudioModalProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly patientName?: string | undefined;
	readonly patientAgeYears?: number | undefined;
	readonly patientWeightKg?: number | undefined;
	readonly doctorName?: string | undefined;
	readonly clinicName?: string | undefined;
	readonly initialToothNumber?: number | undefined;
	readonly onSaved?: (() => void) | undefined;
}

const UPPER_TEETH = [55, 54, 53, 52, 51, 61, 62, 63, 64, 65];
const LOWER_TEETH = [85, 84, 83, 82, 81, 71, 72, 73, 74, 75];

export const PediatricStudioModal: React.FC<PediatricStudioModalProps> = ({
	isOpen,
	onClose,
	patientName = "Артём Смирнов",
	patientAgeYears = 6,
	patientWeightKg,
	doctorName = "Д-р Смирнова Е.В.",
	clinicName = "Клиника DENTE",
	initialToothNumber = 54,
	onSaved,
}) => {
	const initialWeight = useMemo(() => {
		if (typeof patientWeightKg === "number" && patientWeightKg > 0) return patientWeightKg;
		return estimatePediatricWeightKg(patientAgeYears);
	}, [patientWeightKg, patientAgeYears]);

	const [weightKg, setWeightKg] = useState<number>(initialWeight);
	const [franklRating, setFranklRating] = useState<FranklRating>(3);
	const [selectedTooth, setSelectedTooth] = useState<number>(initialToothNumber);
	const [teethConditions, setTeethConditions] = useState<Record<number, PrimaryToothCondition>>({
		54: "caries", 64: "healthy", 74: "healthy", 84: "healthy",
	});
	const [anestheticId, setAnestheticId] = useState<PediatricAnestheticId>("articaine_4");
	const [carpules, setCarpules] = useState<number>(0.5);
	const [notes] = useState<string>("Контакт установлен, осмотр проведен в игровой форме.");

	const activeFrankl = useMemo(
		() => FRANKL_BEHAVIOR_PRESETS.find((f) => f.rating === franklRating) || FRANKL_BEHAVIOR_PRESETS[2],
		[franklRating],
	);

	const anesthesiaSafety = useMemo(() => {
		return calculatePediatricAnesthesiaSafety({
			drugId: anestheticId, weightKg, carpules, ageYears: patientAgeYears,
		});
	}, [anestheticId, weightKg, carpules, patientAgeYears]);

	const currentCondition = teethConditions[selectedTooth] || "healthy";

	const handleSetCondition = useCallback((condition: PrimaryToothCondition) => {
		setTeethConditions((prev) => ({ ...prev, [selectedTooth]: condition }));
	}, [selectedTooth]);

	const handlePrintDiploma = useCallback(() => {
		printBraveryDiploma({ heroName: patientName, doctorName, clinicName, diplomaNumber: `${selectedTooth}-2026` });
		showToast("Диплом маленького героя отправлен на печать", "success");
	}, [patientName, doctorName, clinicName, selectedTooth]);

	const handlePrintMemo = useCallback(() => {
		const treated = Object.entries(teethConditions).filter(([_, c]) => c !== "healthy")
			.map(([t, c]) => `Зуб ${t} (${PRIMARY_TOOTH_CONDITIONS[c]?.shortTag || c})`).join(", ");
		const memoText = buildParentMemoSummary({
			patientName, doctorName, clinicName, hadAnesthesia: carpules > 0,
			treatedTeeth: treated || "Профилактический приём", recommendationsRu: notes,
		});
		printParentMemo({ patientName, memoText, clinicName, doctorName });
		showToast("Памятка родителям подготовлена к печати", "success");
	}, [teethConditions, patientName, doctorName, clinicName, carpules, notes]);

	const handleCopySoap = useCallback(() => {
		const treated = Object.entries(teethConditions).filter(([_, c]) => c !== "healthy")
			.map(([t, c]) => `Зуб ${t}: ${PRIMARY_TOOTH_CONDITIONS[c]?.labelRu || c}`).join("\n");
		const soap = [
			`[ДЕТСКИЙ ПРИЁМ — ДНЕВНИК ВИЗИТА]`,
			`Пациент: ${patientName}, ${patientAgeYears} лет, вес ${weightKg} кг.`,
			`Шкала поведения Франкла: ${activeFrankl.rating} (${activeFrankl.symbol} ${activeFrankl.labelRu}).`,
			`Анестезия: ${anesthesiaSafety.drug.nameRu}, ${carpules} карп. (${anesthesiaSafety.administeredMg} мг). ${anesthesiaSafety.statusMessageRu}`,
			`Зубная формула:\n${treated || "Полость рта санирована, зубы интактны."}`,
			`Адаптация: ${notes}`,
		].join("\n");
		if (typeof navigator !== "undefined" && navigator.clipboard) {
			navigator.clipboard.writeText(soap);
			showToast("Дневник детского приёма скопирован в буфер", "success");
		}
	}, [patientName, patientAgeYears, weightKg, activeFrankl, anesthesiaSafety, carpules, teethConditions, notes]);

	const handleCompleteVisit = useCallback(() => {
		const store = useVisitStore.getState();
		if (store.setVisitNoteForm) {
			store.setVisitNoteForm((prev) => ({
				...prev,
				objective: `${prev.objective || ""}\nДетский приём: Франкл ${activeFrankl.rating} (${activeFrankl.symbol}). Вес ${weightKg} кг.`.trim(),
				treatment: `${prev.treatment || ""}\nАнестезия: ${anesthesiaSafety.drug.shortLabelRu} ${carpules} карп.`.trim(),
				recommendations: `${prev.recommendations || ""}\nПамятка родителям выдана. Контроль через 3 мес.`.trim(),
			}));
		}
		Object.entries(teethConditions).forEach(([tooth, cond]) => {
			if (cond === "caries" || cond === "pulpotomy") store.setToothState(tooth, "treatment");
			else if (cond === "healthy" || cond === "sealed") store.setToothState(tooth, "healthy");
			else if (cond === "extracted") store.setToothState(tooth, "missing");
		});
		showToast("✓ Детский приём успешно зафиксирован!", "success");
		if (onSaved) onSaved();
		onClose();
	}, [activeFrankl, weightKg, anesthesiaSafety, carpules, teethConditions, onSaved, onClose]);

	if (!isOpen) return null;

	const modalContent = (
		<div
			className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150"
			data-testid="pediatric-studio-modal"
		>
			<div className="relative w-full sm:max-w-4xl max-h-[94dvh] rounded-t-[24px] sm:rounded-2xl border border-[var(--line,#e2e8f0)] bg-[var(--paper,#ffffff)] text-[var(--ink,#0f172a)] shadow-2xl flex flex-col overflow-hidden">
				{/* Mobile Drag Handle (Apple HIG) */}
				<div className="sm:hidden flex justify-center pt-2.5 pb-1">
					<div className="w-9 h-1.5 bg-[var(--line,#e2e8f0)] rounded-full" />
				</div>

				{/* Header */}
				<div className="px-4 sm:px-6 py-3 border-b border-[var(--line,#e2e8f0)] flex items-center justify-between gap-2">
					<div className="flex items-center gap-2.5 min-w-0">
						<div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-teal-500/10 text-teal-600 flex items-center justify-center font-black shrink-0">
							<ShieldCheck className="w-5 h-5" />
						</div>
						<div className="min-w-0">
							<h2 className="text-sm sm:text-base font-black tracking-tight flex items-center gap-1.5 truncate">
								Детский приём и адаптация
								<span className="text-[10px] px-1.5 py-0.5 rounded-full bg-teal-500/10 text-teal-700 font-bold">
									SSOT
								</span>
							</h2>
							<p className="text-[11px] text-[var(--muted,#64748b)] truncate">
								{patientName} • {patientAgeYears} лет • Зубы 51–85
							</p>
						</div>
					</div>

					<div className="hidden sm:flex items-center gap-2 shrink-0">
						<button
							type="button"
							onClick={handlePrintDiploma}
							className="min-h-[40px] px-3 py-1.5 rounded-xl border border-[var(--line,#e2e8f0)] bg-[var(--paper,#ffffff)] hover:bg-[var(--paper-soft,#f8fafc)] text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
							data-testid="btn-print-hero-diploma"
						>
							<Award className="w-4 h-4 text-amber-500" />
							Диплом героя
						</button>
						<button
							type="button"
							onClick={handlePrintMemo}
							className="min-h-[40px] px-3 py-1.5 rounded-xl border border-[var(--line,#e2e8f0)] bg-[var(--paper,#ffffff)] hover:bg-[var(--paper-soft,#f8fafc)] text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
							data-testid="btn-print-parent-memo"
						>
							<FileText className="w-4 h-4 text-sky-500" />
							Памятка
						</button>
					</div>

					<button
						type="button"
						onClick={onClose}
						className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl hover:bg-[var(--paper-soft,#f8fafc)] text-[var(--muted,#64748b)] cursor-pointer shrink-0"
						data-testid="btn-close-pediatric-studio"
						aria-label="Закрыть"
					>
						<X className="w-5 h-5" />
					</button>
				</div>

				{/* Body */}
				<div className="flex-1 overflow-y-auto px-4 sm:px-6 py-3.5 space-y-3.5">
					{/* Weight Selector Bar */}
					<div className="p-3 rounded-xl border border-[var(--line,#e2e8f0)] bg-[var(--paper-soft,#f8fafc)]">
						<div className="flex flex-wrap items-center justify-between gap-1 mb-2">
							<span className="text-xs font-bold uppercase tracking-wide text-[var(--muted,#64748b)]">
								Вес ребенка (для безопасной анестезии):
							</span>
							<span className="text-xs font-black text-teal-600">{weightKg} кг</span>
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
											: "border border-[var(--line,#e2e8f0)] bg-[var(--paper,#ffffff)] text-[var(--ink,#0f172a)] hover:bg-teal-500/10"
									}`}
								>
									{w} кг
								</button>
							))}
							<button
								type="button"
								onClick={() => setWeightKg(estimatePediatricWeightKg(patientAgeYears))}
								className="min-h-[38px] px-3 py-1 rounded-lg text-xs font-semibold border border-[var(--line,#e2e8f0)] bg-[var(--paper,#ffffff)] text-[var(--muted,#64748b)] hover:text-teal-600 cursor-pointer"
							>
								По возрасту ({estimatePediatricWeightKg(patientAgeYears)} кг)
							</button>
						</div>
					</div>

					{/* Frankl Scale */}
					<div>
						<div className="text-xs font-bold uppercase tracking-wide text-[var(--muted,#64748b)] mb-1.5">
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
											: "border-[var(--line,#e2e8f0)] bg-[var(--paper,#ffffff)] hover:bg-[var(--paper-soft,#f8fafc)]"
									}`}
									data-testid={`frankl-chip-${item.rating}`}
								>
									<div className="flex items-center justify-between">
										<span className="text-sm font-black">{item.symbol}</span>
										<span className="text-[10px] font-bold">Франкл {item.rating}</span>
									</div>
									<div className="text-xs font-semibold mt-0.5 truncate">{item.labelRu}</div>
								</button>
							))}
						</div>
						<div className="mt-1 text-xs p-2 rounded-lg border border-[var(--line,#e2e8f0)] bg-[var(--paper-soft,#f8fafc)] text-[var(--muted,#64748b)]">
							💡 <strong className="text-[var(--ink,#0f172a)]">Тактика:</strong> {activeFrankl.clinicalTacticRu}
						</div>
					</div>

					{/* FDI Milk Teeth Chart (51-85) */}
					<div>
						<div className="flex items-center justify-between mb-1.5">
							<span className="text-xs font-bold uppercase tracking-wide text-[var(--muted,#64748b)]">
								Молочная формула FDI (51–85):
							</span>
							<span className="text-xs font-bold text-teal-600">
								Зуб {selectedTooth}: {PRIMARY_TOOTH_CONDITIONS[currentCondition]?.labelRu}
							</span>
						</div>
						<div className="space-y-1 p-2 rounded-xl border border-[var(--line,#e2e8f0)] bg-[var(--paper-soft,#f8fafc)]">
							<div className="grid grid-cols-5 sm:grid-cols-10 gap-1">
								{UPPER_TEETH.map((tooth) => {
									const cond = teethConditions[tooth] || "healthy";
									const isSel = selectedTooth === tooth;
									return (
										<button
											key={tooth}
											type="button"
											onClick={() => setSelectedTooth(tooth)}
											className={`min-h-[40px] p-1 rounded-lg border flex flex-col items-center justify-center transition cursor-pointer ${
												isSel ? "border-teal-600 bg-teal-500/20 font-black shadow-xs ring-2 ring-teal-500"
													: "border-[var(--line,#e2e8f0)] bg-[var(--paper,#ffffff)] hover:bg-slate-50"
											}`}
											data-testid={`tooth-fdi-${tooth}`}
										>
											<span className="text-xs font-black">{tooth}</span>
											<span className="text-[8px] uppercase font-bold text-[var(--muted,#64748b)]">
												{PRIMARY_TOOTH_CONDITIONS[cond]?.shortTag}
											</span>
										</button>
									);
								})}
							</div>
							<div className="grid grid-cols-5 sm:grid-cols-10 gap-1">
								{LOWER_TEETH.map((tooth) => {
									const cond = teethConditions[tooth] || "healthy";
									const isSel = selectedTooth === tooth;
									return (
										<button
											key={tooth}
											type="button"
											onClick={() => setSelectedTooth(tooth)}
											className={`min-h-[40px] p-1 rounded-lg border flex flex-col items-center justify-center transition cursor-pointer ${
												isSel ? "border-teal-600 bg-teal-500/20 font-black shadow-xs ring-2 ring-teal-500"
													: "border-[var(--line,#e2e8f0)] bg-[var(--paper,#ffffff)] hover:bg-slate-50"
											}`}
											data-testid={`tooth-fdi-${tooth}`}
										>
											<span className="text-xs font-black">{tooth}</span>
											<span className="text-[8px] uppercase font-bold text-[var(--muted,#64748b)]">
												{PRIMARY_TOOTH_CONDITIONS[cond]?.shortTag}
											</span>
										</button>
									);
								})}
							</div>
						</div>

						<div className="flex flex-wrap gap-1 mt-1.5">
							{(Object.keys(PRIMARY_TOOTH_CONDITIONS) as PrimaryToothCondition[]).map((condKey) => {
								const info = PRIMARY_TOOTH_CONDITIONS[condKey];
								const isActive = currentCondition === condKey;
								return (
									<button
										key={condKey}
										type="button"
										onClick={() => handleSetCondition(condKey)}
										className={`min-h-[38px] px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer border ${
											isActive ? `${info.badgeClass} ring-2 ring-teal-500`
												: "border-[var(--line,#e2e8f0)] bg-[var(--paper,#ffffff)] text-[var(--ink,#0f172a)] hover:bg-[var(--paper-soft,#f8fafc)]"
										}`}
									>
										{info.labelRu}
									</button>
								);
							})}
						</div>
					</div>

					{/* Anesthesia Calculator */}
					<div className="p-3 rounded-xl border border-[var(--line,#e2e8f0)] bg-[var(--paper-soft,#f8fafc)]">
						<div className="flex items-center justify-between mb-1.5">
							<span className="text-xs font-bold uppercase tracking-wide text-[var(--muted,#64748b)]">
								Безопасная анестезия ({weightKg} кг):
							</span>
							<span className={`text-xs font-black ${anesthesiaSafety.isOverdose ? "text-rose-600" : "text-teal-600"}`}>
								{anesthesiaSafety.administeredMg} мг / МРД {anesthesiaSafety.maxAllowedMg} мг ({anesthesiaSafety.percentUsed}%)
							</span>
						</div>
						<div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-2">
							<div className="flex gap-1.5">
								<button
									type="button"
									onClick={() => setAnestheticId("articaine_4")}
									className={`flex-1 min-h-[38px] px-2 py-1 rounded-lg text-xs font-bold border transition cursor-pointer ${
										anestheticId === "articaine_4" ? "bg-teal-600 text-white shadow-xs border-teal-600"
											: "border-[var(--line,#e2e8f0)] bg-[var(--paper,#ffffff)] text-[var(--ink,#0f172a)] hover:bg-teal-500/10"
									}`}
								>
									Артикаин 4% (5 мг/кг)
								</button>
								<button
									type="button"
									onClick={() => setAnestheticId("mepivacaine_3")}
									className={`flex-1 min-h-[38px] px-2 py-1 rounded-lg text-xs font-bold border transition cursor-pointer ${
										anestheticId === "mepivacaine_3" ? "bg-teal-600 text-white shadow-xs border-teal-600"
											: "border-[var(--line,#e2e8f0)] bg-[var(--paper,#ffffff)] text-[var(--ink,#0f172a)] hover:bg-teal-500/10"
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
											carpules === c ? "bg-teal-600 text-white shadow-xs border-teal-600"
												: "border-[var(--line,#e2e8f0)] bg-[var(--paper,#ffffff)] text-[var(--ink,#0f172a)] hover:bg-teal-500/10"
										}`}
									>
										{c} к.
									</button>
								))}
							</div>
						</div>
						<div
							className={`text-xs p-2 rounded-lg border flex items-center gap-2 ${
								anesthesiaSafety.isOverdose ? "bg-rose-500/10 border-rose-300 text-rose-700" : "bg-emerald-500/10 border-emerald-300 text-emerald-700"
							}`}
						>
							{anesthesiaSafety.isOverdose ? <AlertCircle className="w-4 h-4 shrink-0" /> : <ShieldCheck className="w-4 h-4 shrink-0" />}
							<span className="truncate">{anesthesiaSafety.statusMessageRu}</span>
						</div>
					</div>

					{/* Mobile 1-Click Document Actions */}
					<div className="sm:hidden flex items-center gap-2 pt-1">
						<button
							type="button"
							onClick={handlePrintDiploma}
							className="flex-1 min-h-[44px] px-2.5 py-2 rounded-xl border border-[var(--line,#e2e8f0)] bg-[var(--paper,#ffffff)] text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
						>
							<Award className="w-4 h-4 text-amber-500 shrink-0" />
							Диплом героя
						</button>
						<button
							type="button"
							onClick={handlePrintMemo}
							className="flex-1 min-h-[44px] px-2.5 py-2 rounded-xl border border-[var(--line,#e2e8f0)] bg-[var(--paper,#ffffff)] text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
						>
							<FileText className="w-4 h-4 text-sky-500 shrink-0" />
							Памятка
						</button>
						<button
							type="button"
							onClick={handleCopySoap}
							className="min-h-[44px] px-3 py-2 rounded-xl border border-[var(--line,#e2e8f0)] bg-[var(--paper,#ffffff)] text-xs font-bold flex items-center justify-center cursor-pointer shadow-xs"
							aria-label="Копировать дневник"
						>
							<Copy className="w-4 h-4" />
						</button>
					</div>
				</div>

				{/* Footer (Mandate 8am: Exactly ONE Primary CTA #0d9488, Mandate 8e: Never disabled!) */}
				<div className="px-4 sm:px-6 py-2.5 border-t border-[var(--line,#e2e8f0)] bg-[var(--paper,#ffffff)] flex items-center justify-between gap-2.5">
					<button
						type="button"
						onClick={onClose}
						className="min-h-[44px] px-4 py-2 rounded-xl border border-[var(--line,#e2e8f0)] text-xs font-bold text-[var(--muted,#64748b)] hover:bg-[var(--paper-soft,#f8fafc)] cursor-pointer"
					>
						Отмена
					</button>
					<button
						type="button"
						onClick={handleCompleteVisit}
						className="min-h-[44px] flex-1 sm:flex-none px-6 py-2.5 rounded-xl text-xs sm:text-sm font-black text-white bg-[#0d9488] hover:bg-[#0f766e] active:scale-98 transition shadow-md flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap"
						data-testid="btn-save-pediatric-visit"
					>
						✓ Зафиксировать детский приём
					</button>
				</div>
			</div>
		</div>
	);

	return typeof document !== "undefined" ? createPortal(modalContent, document.body) : modalContent;
};

export default PediatricStudioModal;
