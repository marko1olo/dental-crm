/**
 * OrthopedicsStudioModal.tsx — Каноническая студия ортопедии, коронок и паспорта изделия (SSOT).
 * Реализация клинического процесса ортопеда у кресла в 1 экран (Мандат 8b 380–480 строк, Мандаты 8e, 8n, 8am, 8ze).
 * Ровно ОДНА Primary CTA кнопка цвета #0d9488 (var(--teal)).
 * Автономия врача: кнопки НИКОГДА не disabled.
 * Мобильная эргономика Apple HIG: нативный Bottom Sheet, тач-таргеты >= 44x44px, 0px горизонтального скролла.
 */

import React, { useState, useId, useMemo, useCallback } from "react";
import {
	STANDARD_ZTL_ORDER_PRESETS,
	PREPARATION_MARGIN_PRESETS,
	FIXATION_TYPE_PRESETS,
	STUMP_SHADE_PRESETS,
	VITA_CLASSIC_SHADES,
	ORTHOPEDIC_MANUFACTURING_STAGES,
	calculateOrthopedicEconomics,
	generateWarrantyPassportNumber,
	formatToothFormulaDisplay,
	type StandardZtlPreset,
	type PreparationMarginId,
	type FixationTypeId,
	type StumpShadeCode,
	type VitaClassicShade,
} from "./orthopedicCatalogData";
import { OrthopedicPassportA4Modal, type OrthopedicPassportData } from "./OrthopedicPassportA4Modal";

export interface OrthopedicStagePayload {
	readonly toothFdi: string;
	readonly constructionPresetId: string;
	readonly constructionName: string;
	readonly material: string;
	readonly preparationMargin: string;
	readonly colorVita: string;
	readonly stumpShade: string;
	readonly fixationType: string;
	readonly orderNumber: string;
	readonly technicianName: string;
	readonly warrantyPassportNumber: string;
	readonly warrantyMonths: number;
	readonly fittingConfirmed: boolean;
	readonly grossPriceRub: number;
	readonly ztlCostRub: number;
	readonly amountKopecks: bigint;
	readonly notes?: string;
}

export interface OrthopedicsStudioModalProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly initialToothFdi?: string | number;
	readonly patientName?: string;
	readonly doctorName?: string;
	readonly clinicName?: string;
	readonly onSaveProtocol?: (payload: OrthopedicStagePayload) => void;
	readonly initialLabOrder?: {
		readonly id?: string;
		readonly orderNumber?: string;
		readonly workType?: string;
		readonly toothFdi?: string;
		readonly technicianName?: string;
		readonly warrantyPassport?: string;
		readonly status?: string;
	};
}

export function OrthopedicsStudioModal({
	isOpen,
	onClose,
	initialToothFdi = "16",
	patientName = "Ковалев Дмитрий Сергеевич",
	doctorName = "Д-р Смирнова Е. В. (Ортопед)",
	clinicName = "Стоматологическая клиника DENTE",
	onSaveProtocol,
	initialLabOrder,
}: OrthopedicsStudioModalProps): React.ReactElement | null {
	const modalId = useId();
	const [activeTooth, setActiveTooth] = useState<string>(formatToothFormulaDisplay(initialToothFdi));
	const [selectedPresetId, setSelectedPresetId] = useState<string>("zirconia");
	const [selectedMargin, setSelectedMargin] = useState<PreparationMarginId>("chamfer");
	const [selectedShade, setSelectedShade] = useState<VitaClassicShade>("A2");
	const [selectedStump, setSelectedStump] = useState<StumpShadeCode>("ND2");
	const [fixationType, setFixationType] = useState<FixationTypeId>("cement");
	const [orderNumber, setOrderNumber] = useState<string>(initialLabOrder?.orderNumber || "ЗТЛ-402");
	const [technicianName, setTechnicianName] = useState<string>(initialLabOrder?.technicianName || "Смирнов А.В.");
	const [fittingConfirmed, setFittingConfirmed] = useState<boolean>(Boolean(initialLabOrder?.status === "delivered_to_clinic"));
	const [currentStageId, setCurrentStageId] = useState<string>("ready");
	const [isPassportModalOpen, setIsPassportModalOpen] = useState<boolean>(false);
	const [unitsCount, setUnitsCount] = useState<number>(1);
	const [clinicalNotes, setClinicalNotes] = useState<string>("");
	const [isSavedSuccess, setIsSavedSuccess] = useState<boolean>(false);

	const activePreset: StandardZtlPreset = useMemo(() => {
		return STANDARD_ZTL_ORDER_PRESETS.find((p) => p.id === selectedPresetId) ?? STANDARD_ZTL_ORDER_PRESETS[0];
	}, [selectedPresetId]);

	const economics = useMemo(() => {
		return calculateOrthopedicEconomics(activePreset.id, unitsCount);
	}, [activePreset.id, unitsCount]);

	const passportNumber = useMemo(() => {
		return initialLabOrder?.warrantyPassport || generateWarrantyPassportNumber(orderNumber);
	}, [initialLabOrder?.warrantyPassport, orderNumber]);

	const passportData: OrthopedicPassportData = useMemo(() => ({
		orderNumber,
		passportNumber,
		issueDate: new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "long", year: "numeric" }).format(new Date()),
		clinicName,
		patientName,
		patientChartNumber: `ЭМК-${activeTooth}`,
		doctorName,
		technicianName,
		labName: "ЗТЛ DenteLab Precision CAD/CAM",
		toothFdi: activeTooth,
		constructionName: activePreset.name,
		material: activePreset.material,
		colorVita: selectedShade,
		stumpShade: selectedStump,
		preparationMarginLabel: PREPARATION_MARGIN_PRESETS.find((m) => m.id === selectedMargin)?.labelRu || selectedMargin,
		fixationTypeLabel: FIXATION_TYPE_PRESETS.find((f) => f.id === fixationType)?.labelRu || fixationType,
		warrantyMonths: activePreset.warrantyMonths,
		warrantyLabelRu: activePreset.warrantyLabelRu,
		batchLotNumber: `LOT-${activePreset.badge}-${orderNumber}`,
	}), [orderNumber, passportNumber, clinicName, patientName, activeTooth, doctorName, technicianName, activePreset, selectedShade, selectedStump, selectedMargin, fixationType]);

	const handleSaveStage = useCallback(() => {
		const payload: OrthopedicStagePayload = {
			toothFdi: activeTooth,
			constructionPresetId: activePreset.id,
			constructionName: activePreset.name,
			material: activePreset.material,
			preparationMargin: selectedMargin,
			colorVita: selectedShade,
			stumpShade: selectedStump,
			fixationType,
			orderNumber,
			technicianName,
			warrantyPassportNumber: passportNumber,
			warrantyMonths: activePreset.warrantyMonths,
			fittingConfirmed,
			grossPriceRub: economics.grossPriceRub,
			ztlCostRub: economics.ztlCostRub,
			amountKopecks: economics.grossPriceKopecks,
			notes: clinicalNotes,
		};
		onSaveProtocol?.(payload);
		setIsSavedSuccess(true);
		setTimeout(() => setIsSavedSuccess(false), 2400);
	}, [activeTooth, activePreset, selectedMargin, selectedShade, selectedStump, fixationType, orderNumber, technicianName, passportNumber, fittingConfirmed, economics, clinicalNotes, onSaveProtocol]);

	if (!isOpen) return null;

	return (
		<div
			role="dialog"
			aria-modal="true"
			aria-labelledby={`${modalId}-title`}
			data-testid="orthopedics-studio-modal"
			className="fixed inset-0 z-50 flex flex-col justify-end sm:justify-center items-center bg-black/60 backdrop-blur-xs p-0 sm:p-4 overflow-y-auto"
		>
			<div
				className="w-full sm:max-w-5xl bg-[var(--paper,#ffffff)] dark:bg-[var(--surface,#0f172a)] text-[var(--ink,#0f172a)] dark:text-[var(--paper,#f8fafc)] rounded-t-[24px] sm:rounded-2xl border-t sm:border border-[var(--line,#e2e8f0)] dark:border-[var(--line,#1e293b)] shadow-2xl flex flex-col max-h-[92vh] sm:max-h-[88vh] overflow-hidden"
				data-testid="orthopedics-studio-surface"
			>
				{/* Apple HIG Drag Handle on Mobile */}
				<div className="sm:hidden flex justify-center pt-2.5 pb-1 w-full" aria-hidden="true">
					<div data-testid="mobile-drag-handle" className="w-9 h-1.25 bg-slate-300 dark:bg-slate-700 rounded-full" />
				</div>

				{/* Header: Strictly 1 line on mobile (Mandate 8ze, 8am) */}
				<header className="px-4 py-3 sm:px-6 sm:py-3.5 border-b border-[var(--line,#e2e8f0)] dark:border-[var(--line,#1e293b)] flex items-center justify-between gap-3 shrink-0">
					<div className="flex items-center gap-2.5 min-w-0">
						<span className="flex items-center justify-center w-8 h-8 rounded-lg bg-teal-500/10 text-teal-600 dark:text-teal-400 font-bold text-sm shrink-0">
							{activeTooth}
						</span>
						<div className="min-w-0">
							<h2 id={`${modalId}-title`} className="text-sm sm:text-base font-bold truncate">
								<span className="hidden sm:inline">Ортопедический протокол и коронки</span>
								<span className="sm:hidden">Ортопедия</span>
							</h2>
							<p className="text-xs text-[var(--muted,#64748b)] hidden sm:block truncate">{patientName} • {doctorName}</p>
						</div>
					</div>

					<div className="flex items-center gap-2 shrink-0">
						<button
							type="button"
							data-testid="open-passport-a4-btn"
							onClick={() => setIsPassportModalOpen(true)}
							className="px-2.5 py-1.5 sm:px-3 sm:py-2 text-xs font-medium rounded-lg border border-[var(--line,#cbd5e1)] dark:border-[var(--line,#334155)] hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors min-h-[44px] inline-flex items-center gap-1.5"
						>
							<span className="hidden sm:inline">Паспорт изделия А4</span>
							<span className="sm:hidden">Паспорт</span>
						</button>
						<button
							type="button"
							data-testid="orthopedics-modal-close-btn"
							onClick={onClose}
							aria-label="Закрыть окно ортопедии"
							className="w-11 h-11 flex items-center justify-center rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-slate-500 text-lg font-bold"
						>
							✕
						</button>
					</div>
				</header>

				{/* Body: 1-Screen Interactive Orthopedic Process */}
				<div className="flex-1 p-3 sm:p-5 pb-8 sm:pb-6 overflow-y-auto space-y-4 text-xs sm:text-sm">
					{/* Row 1: FDI Tooth & Construction Preset */}
					<section className="bg-slate-50 dark:bg-slate-900/40 p-3 sm:p-4 rounded-xl border border-[var(--line,#e2e8f0)] dark:border-[var(--line,#1e293b)] space-y-3">
						<div className="flex flex-wrap items-center justify-between gap-2">
							<div className="flex items-center gap-2">
								<label htmlFor={`${modalId}-tooth-input`} className="font-semibold text-[var(--ink,#0f172a)] dark:text-[var(--paper,#f8fafc)]">Зуб (FDI):</label>
								<input
									id={`${modalId}-tooth-input`}
									data-testid="ortho-fdi-input"
									type="text"
									value={activeTooth}
									onChange={(e) => setActiveTooth(e.target.value)}
									className="w-16 px-2.5 py-1.5 text-center font-bold text-sm rounded-lg border border-[var(--line,#cbd5e1)] dark:border-[var(--line,#334155)] bg-white dark:bg-slate-800"
								/>
							</div>
							<div className="flex items-center gap-1 overflow-x-auto py-1">
								{["16", "11", "21", "26", "36", "46"].map((t) => (
									<button
										key={t}
										type="button"
										onClick={() => setActiveTooth(t)}
										className={`px-2 py-1 rounded text-xs font-medium border transition-colors ${
											activeTooth === t
												? "bg-teal-500/10 border-teal-500 text-teal-600 dark:text-teal-400 font-bold"
												: "border-transparent text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-800"
										}`}
									>
										{t}
									</button>
								))}
							</div>
						</div>

						{/* Construction Preset Chips */}
						<div>
							<span className="block text-xs font-semibold text-slate-500 mb-1.5">Тип конструкции и материал:</span>
							<div className="grid grid-cols-2 sm:grid-cols-4 gap-2" data-testid="ortho-construction-presets-grid">
								{STANDARD_ZTL_ORDER_PRESETS.map((p) => {
									const isSelected = p.id === selectedPresetId;
									return (
										<button
											key={p.id}
											type="button"
											onClick={() => setSelectedPresetId(p.id)}
											className={`p-2.5 rounded-lg border text-left transition-all min-h-[48px] flex flex-col justify-between ${
												isSelected
													? "border-teal-500 ring-2 ring-teal-500/20 bg-teal-50/50 dark:bg-teal-950/20"
													: "border-[var(--line,#e2e8f0)] dark:border-[var(--line,#1e293b)] hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-800/80"
											}`}
										>
											<div className="flex items-center justify-between gap-1">
												<span className="font-semibold text-xs leading-snug">{p.name}</span>
												<span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-700 font-mono text-slate-600 dark:text-slate-300 shrink-0">{p.badge}</span>
											</div>
											<span className="text-[11px] text-teal-600 dark:text-teal-400 font-medium mt-1">
												{p.pricePatientRub.toLocaleString("ru-RU")} ₽ • {p.warrantyLabelRu}
											</span>
										</button>
									);
								})}
							</div>
						</div>
					</section>

					{/* Row 2: Preparation Margin & Fixation Type */}
					<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
						<section className="bg-slate-50 dark:bg-slate-900/40 p-3 sm:p-4 rounded-xl border border-[var(--line,#e2e8f0)] dark:border-[var(--line,#1e293b)] space-y-2">
							<span className="block font-semibold text-[var(--ink,#0f172a)] dark:text-[var(--paper,#f8fafc)]">Тип препарирования (Граница уступа):</span>
							<div className="grid grid-cols-2 gap-1.5">
								{PREPARATION_MARGIN_PRESETS.map((m) => (
									<button
										key={m.id}
										type="button"
										onClick={() => setSelectedMargin(m.id as PreparationMarginId)}
										className={`p-2 rounded-lg border text-left min-h-[44px] transition-colors ${
											selectedMargin === m.id
												? "border-teal-500 bg-teal-500/10 font-semibold text-teal-700 dark:text-teal-300"
												: "border-[var(--line,#cbd5e1)] dark:border-[var(--line,#334155)] bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300"
										}`}
									>
										<div className="text-xs">{m.shortBadge}</div>
									</button>
								))}
							</div>
						</section>

						<section className="bg-slate-50 dark:bg-slate-900/40 p-3 sm:p-4 rounded-xl border border-[var(--line,#e2e8f0)] dark:border-[var(--line,#1e293b)] space-y-2">
							<span className="block font-semibold text-[var(--ink,#0f172a)] dark:text-[var(--paper,#f8fafc)]">Способ фиксации конструкции:</span>
							<div className="grid grid-cols-3 gap-1.5">
								{FIXATION_TYPE_PRESETS.map((f) => (
									<button
										key={f.id}
										type="button"
										onClick={() => setFixationType(f.id)}
										className={`p-2 rounded-lg border text-center min-h-[44px] transition-colors ${
											fixationType === f.id
												? "border-teal-500 bg-teal-500/10 font-semibold text-teal-700 dark:text-teal-300"
												: "border-[var(--line,#cbd5e1)] dark:border-[var(--line,#334155)] bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300"
										}`}
									>
										<div className="text-xs">{f.shortBadge}</div>
									</button>
								))}
							</div>
						</section>
					</div>

					{/* Row 3: Vita Classic Shade & Stump Shade (ND1..ND9) */}
					<section className="bg-slate-50 dark:bg-slate-900/40 p-3 sm:p-4 rounded-xl border border-[var(--line,#e2e8f0)] dark:border-[var(--line,#1e293b)] space-y-3">
						<div>
							<div className="flex items-center justify-between mb-1.5">
								<span className="font-semibold text-xs text-slate-700 dark:text-slate-300">
									Шкала оттенков Vita Classical: <strong className="text-teal-600 dark:text-teal-400 font-bold">{selectedShade}</strong>
								</span>
							</div>
							<div className="flex flex-wrap gap-1.5" data-testid="vita-classical-swatches">
								{VITA_CLASSIC_SHADES.map((s) => (
									<button
										key={s.code}
										type="button"
										onClick={() => setSelectedShade(s.code)}
										className={`px-2 py-1.5 rounded-lg border text-xs font-semibold flex items-center gap-1.5 min-h-[44px] min-w-[44px] transition-all ${
											selectedShade === s.code ? "border-teal-500 ring-2 ring-teal-500/30 scale-105" : "border-[var(--line,#cbd5e1)] dark:border-[var(--line,#334155)]"
										}`}
										style={{ backgroundColor: s.colorHex, color: "#1e293b" }}
									>
										<span>{s.code}</span>
									</button>
								))}
							</div>
						</div>

						<div>
							<div className="flex items-center justify-between mb-1.5">
								<span className="font-semibold text-xs text-slate-700 dark:text-slate-300">
									Оттенок культи (Natural Die ND1–ND9): <strong className="text-teal-600 dark:text-teal-400 font-bold">{selectedStump}</strong>
								</span>
							</div>
							<div className="grid grid-cols-3 sm:grid-cols-9 gap-1.5" data-testid="stump-shade-swatches">
								{STUMP_SHADE_PRESETS.map((st) => (
									<button
										key={st.code}
										type="button"
										onClick={() => setSelectedStump(st.code as StumpShadeCode)}
										className={`p-1.5 rounded-lg border text-center text-xs font-medium min-h-[44px] transition-all flex flex-col items-center justify-center gap-1 ${
											selectedStump === st.code ? "border-teal-500 ring-2 ring-teal-500/30 bg-teal-50/20" : "border-[var(--line,#cbd5e1)] dark:border-[var(--line,#334155)]"
										}`}
									>
										<span className="w-4 h-4 rounded-full border border-black/20" style={{ backgroundColor: st.colorHex }} />
										<span className="text-[10px] font-bold">{st.code}</span>
									</button>
								))}
							</div>
						</div>
					</section>

					{/* Row 4: ZTL Lab Connection, Try-in Status & Economics */}
					<section className="bg-slate-50 dark:bg-slate-900/40 p-3 sm:p-4 rounded-xl border border-[var(--line,#e2e8f0)] dark:border-[var(--line,#1e293b)] space-y-3">
						<div className="flex flex-wrap items-center justify-between gap-3 pb-2 border-b border-[var(--line,#e2e8f0)] dark:border-[var(--line,#1e293b)]">
							<div className="flex items-center gap-2">
								<span className="font-bold text-xs sm:text-sm">Наряд в ЗТЛ:</span>
								<input
									type="text"
									data-testid="ztl-order-input"
									value={orderNumber}
									onChange={(e) => setOrderNumber(e.target.value)}
									className="w-24 px-2 py-1 text-xs font-mono font-bold rounded border border-[var(--line,#cbd5e1)] dark:border-[var(--line,#334155)] bg-white dark:bg-slate-800"
								/>
								<span className="text-xs text-slate-500">Техник:</span>
								<input
									type="text"
									data-testid="ztl-technician-input"
									value={technicianName}
									onChange={(e) => setTechnicianName(e.target.value)}
									className="w-32 px-2 py-1 text-xs rounded border border-[var(--line,#cbd5e1)] dark:border-[var(--line,#334155)] bg-white dark:bg-slate-800"
								/>
							</div>

							<button
								type="button"
								data-testid="confirm-fitting-btn"
								onClick={() => setFittingConfirmed(!fittingConfirmed)}
								className={`px-3 py-2 rounded-lg border text-xs font-semibold transition-colors min-h-[44px] flex items-center gap-1.5 ${
									fittingConfirmed
										? "border-emerald-500 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300"
										: "border-[var(--line,#cbd5e1)] dark:border-[var(--line,#334155)] bg-white dark:bg-slate-800 hover:bg-slate-100"
								}`}
							>
								<span>{fittingConfirmed ? "✓ Примерка подтверждена" : "Подтвердить примерку конструкции"}</span>
							</button>
						</div>

						{/* 5-Stage Tracker */}
						<div className="grid grid-cols-2 sm:grid-cols-6 gap-1.5 text-center">
							{ORTHOPEDIC_MANUFACTURING_STAGES.map((st) => {
								const isSelected = st.id === currentStageId;
								return (
									<button
										key={st.id}
										type="button"
										onClick={() => setCurrentStageId(st.id)}
										className={`p-2 rounded-lg border text-left sm:text-center transition-colors min-h-[44px] ${
											isSelected ? "border-teal-500 bg-teal-500/10 font-bold text-teal-700 dark:text-teal-300" : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/50 text-slate-500"
										}`}
									>
										<div className="text-[10px] text-slate-400">Этап {st.stepNumber}</div>
										<div className="text-xs truncate">{st.labelRu}</div>
									</button>
								);
							})}
						</div>

						{/* Economics Summary (Mandate 8n) */}
						<div className="flex flex-wrap items-center justify-between text-xs bg-white dark:bg-slate-800 p-2.5 rounded-lg border border-[var(--line,#e2e8f0)] dark:border-[var(--line,#1e293b)]">
							<div className="text-slate-500">Пациенту: <strong className="text-[var(--ink,#0f172a)] dark:text-[var(--paper,#f8fafc)] font-bold">{economics.grossPriceRub.toLocaleString("ru-RU")} ₽</strong></div>
							<div className="text-slate-500">Себестоимость ЗТЛ: <strong className="text-rose-600 font-semibold">{economics.ztlCostRub.toLocaleString("ru-RU")} ₽</strong></div>
							<div className="text-slate-500">Расходники: <strong className="text-slate-700 dark:text-slate-300 font-medium">{economics.materialsCostRub.toLocaleString("ru-RU")} ₽</strong></div>
							<div className="text-teal-600 dark:text-teal-400 font-bold">Маржа клиники: {economics.netMarginRub.toLocaleString("ru-RU")} ₽ ({economics.marginPercent}%)</div>
						</div>
					</section>
				</div>

				{/* Footer Bar: Exactly ONE Primary CTA color #0d9488 (Mandate 8am, Mandate 8e) */}
				<footer className="p-3 sm:p-4 border-t border-[var(--line,#e2e8f0)] dark:border-[var(--line,#1e293b)] bg-slate-50 dark:bg-slate-900/60 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
					<div className="text-xs text-slate-500 w-full sm:w-auto text-center sm:text-left">
						{isSavedSuccess && (
							<span data-testid="save-success-indicator" className="text-emerald-600 dark:text-emerald-400 font-semibold">
								✓ Ортопедический этап сохранен в ЭМК и наряд ЗТЛ обновлен
							</span>
						)}
					</div>

					<div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
						<button
							type="button"
							data-testid="cancel-ortho-studio-btn"
							onClick={onClose}
							className="px-4 py-2.5 rounded-xl border border-[var(--line,#cbd5e1)] dark:border-[var(--line,#334155)] bg-white dark:bg-slate-800 text-[var(--ink,#0f172a)] dark:text-[var(--paper,#f8fafc)] font-medium text-xs sm:text-sm hover:bg-slate-100 min-h-[48px]"
						>
							Отмена
						</button>

						{/* EXACTLY ONE Primary CTA Button — Never disabled (Mandate 8e, 8am) */}
						<button
							type="button"
							data-testid="commit-orthopedic-stage-btn"
							onClick={handleSaveStage}
							className="w-full sm:w-auto px-6 py-2.5 rounded-xl text-white font-bold text-xs sm:text-sm shadow-md transition-all min-h-[48px] flex items-center justify-center gap-2 bg-[#0d9488] hover:bg-[#0f766e] active:scale-98"
						>
							<span>✓ Зафиксировать ортопедический этап</span>
						</button>
					</div>
				</footer>
			</div>

			{/* Embedded Printable Passport A4 Modal */}
			<OrthopedicPassportA4Modal
				isOpen={isPassportModalOpen}
				onClose={() => setIsPassportModalOpen(false)}
				passport={passportData}
			/>
		</div>
	);
}
