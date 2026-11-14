/**
 * apps/web/src/components/lab/DentalLabCreateOrderSection.tsx
 *
 * DENTE Dental CRM — Левая колонка экспресс-наряда за 10 секунд (Мандаты 8b, 8e, 8am).
 */

import React, { useState } from "react";
import {
	CANONICAL_LAB_MATERIALS,
	VITA_SHADES_SSOT,
	UPPER_JAW_TEETH,
	LOWER_JAW_TEETH,
	formatKopecksToRubles,
} from "./dentalLabCatalogData.js";

export interface DentalLabCreateOrderSectionProps {
	readonly activeMainTab: string;
	readonly patientInput: string;
	readonly setPatientInput: (v: string) => void;
	readonly availablePatients: readonly { id: string; fullName: string }[];
	readonly selectedTeeth: readonly number[];
	readonly setSelectedTeeth: React.Dispatch<React.SetStateAction<number[]>>;
	readonly toggleTooth: (tooth: number) => void;
	readonly selectedMaterialId: string;
	readonly setSelectedMaterialId: (id: string) => void;
	readonly selectedShade: string;
	readonly setSelectedShade: (shade: string) => void;
	readonly selectedLab: string;
	readonly setSelectedLab: (lab: string) => void;
	readonly allLaboratories: readonly string[];
	readonly customLabs: readonly string[];
	readonly setCustomLabs: React.Dispatch<React.SetStateAction<string[]>>;
	readonly effectiveDueDate: string;
	readonly setCustomDueDate: (date: string) => void;
	readonly isUrgent: boolean;
	readonly setIsUrgent: (urgent: boolean) => void;
	readonly notes: string;
	readonly setNotes: (notes: string) => void;
	readonly teethCount: number;
	readonly totalLabCostKopecks: number;
	readonly totalPatientPriceKopecks: number;
	readonly netClinicRevenueKopecks: number;
	readonly handleCreateOrder: () => void;
	readonly handlePrintA5Blank: () => void;
	readonly handleCourierBlank: () => void;
}

export const DentalLabCreateOrderSection: React.FC<DentalLabCreateOrderSectionProps> = ({
	activeMainTab,
	patientInput,
	setPatientInput,
	availablePatients,
	selectedTeeth,
	setSelectedTeeth,
	toggleTooth,
	selectedMaterialId,
	setSelectedMaterialId,
	selectedShade,
	setSelectedShade,
	selectedLab,
	setSelectedLab,
	allLaboratories,
	customLabs,
	setCustomLabs,
	effectiveDueDate,
	setCustomDueDate,
	isUrgent,
	setIsUrgent,
	notes,
	setNotes,
	teethCount,
	totalLabCostKopecks,
	totalPatientPriceKopecks,
	netClinicRevenueKopecks,
	handleCreateOrder,
	handlePrintA5Blank,
	handleCourierBlank,
}) => {
	const [customLabInput, setCustomLabInput] = useState("");
	const [isAddingCustomLab, setIsAddingCustomLab] = useState(false);

	return (
		<aside className={`dental-lab-left-column ${activeMainTab === "new_order" ? "mobile-visible" : "mobile-hidden"}`} data-testid="lab-order-create-panel">
			<div className="flex items-center justify-between">
				<h3 className="text-xs font-bold tracking-tight text-[var(--ink-muted)]">Экспресс-наряд у кресла</h3>
			</div>
			{/* Пациент (автокомплит из базы клиники или свободный ввод ФИО) */}
			<div className="space-y-1">
				<label htmlFor="lab-patient-input" className="text-xs font-semibold text-[var(--ink)] block">
					Пациент
				</label>
				<input
					id="lab-patient-input"
					data-testid="lab-patient-input"
					list="lab-patients-datalist"
					value={patientInput}
					onChange={(e) => setPatientInput(e.target.value)}
					placeholder="ФИО пациента (поиск или свободный ввод)..."
					className="w-full text-xs p-2 rounded-xl border border-[var(--line)] bg-[var(--paper-strong)] text-[var(--ink)]"
				/>
				<datalist id="lab-patients-datalist">
					{availablePatients.map((p) => (
						<option key={p.id} value={p.fullName} />
					))}
				</datalist>
			</div>
			{/* Быстрые шаблоны ортопедии (готовые пресеты) */}
			<div className="space-y-1">
				<div className="text-[10px] text-[var(--ink-muted)] font-semibold">Быстрые шаблоны ортопедии:</div>
				<div className="flex flex-wrap gap-1">
					{[
						{ id: "zirconia_crown_express", label: "Цирконий ZrO2", mat: "zirconia_multilayer", shade: "A2" },
						{ id: "emax_crown_express", label: "E.max Press", mat: "emax_press", shade: "A2" },
						{ id: "pfm_duceram_express", label: "Металлокерамика", mat: "metal_ceramic_cocr", shade: "A3" },
						{ id: "pmma_temporary_express", label: "PMMA временная", mat: "pmma_temp", shade: "A2" },
					].map((p) => (
						<button
							key={p.id}
							type="button"
							data-testid={`lab-preset-btn-${p.id}`}
							onClick={() => { setSelectedMaterialId(p.mat); setSelectedShade(p.shade); }}
							className={`dente-btn-pill px-2.5 py-1 text-[11px] font-semibold rounded-full border transition-all cursor-pointer ${selectedMaterialId === p.mat ? "is-active bg-[var(--teal-surface,rgba(13,148,136,0.12))] text-[var(--teal,#0d9488)] border-[var(--teal,#0d9488)]" : "bg-[var(--paper-strong)] text-[var(--ink)] border-[var(--line)] hover:border-[var(--teal,#0d9488)]"}`}
						>
							{p.label}
						</button>
					))}
				</div>
			</div>
			{/* Зубы по FDI 11-48 */}
			<div className="space-y-1">
				<div className="flex items-center justify-between text-xs font-semibold">
					<span className="text-[var(--ink)]">Зубы FDI: {selectedTeeth.join(", ")}</span>
					<button type="button" onClick={() => setSelectedTeeth([16])} className="text-[11px] text-[var(--teal)] hover:underline cursor-pointer bg-transparent border-0">Сбросить</button>
				</div>
				<div className="text-[10px] text-[var(--ink-muted)]">Верхняя челюсть</div>
				<div className="dental-lab-teeth-grid">{UPPER_JAW_TEETH.map((tooth) => (<button key={tooth} type="button" data-testid={`tooth-chip-${tooth}`} onClick={() => toggleTooth(tooth)} className={`dental-lab-tooth-chip ${selectedTeeth.includes(tooth) ? "selected" : ""}`}>{tooth}</button>))}</div>
				<div className="text-[10px] text-[var(--ink-muted)] pt-1">Нижняя челюсть</div>
				<div className="dental-lab-teeth-grid">{LOWER_JAW_TEETH.map((tooth) => (<button key={tooth} type="button" data-testid={`tooth-chip-${tooth}`} onClick={() => toggleTooth(tooth)} className={`dental-lab-tooth-chip ${selectedTeeth.includes(tooth) ? "selected" : ""}`}>{tooth}</button>))}</div>
			</div>
			{/* Конструкция, Оттенок VITA, Лаборатория */}
			<div className="space-y-0.5">
				<label htmlFor="lab-material-select" className="text-xs font-semibold text-[var(--ink)] block">Вид конструкции</label>
				<select id="lab-material-select" data-testid="lab-material-select" value={selectedMaterialId} onChange={(e) => setSelectedMaterialId(e.target.value)} className="w-full text-xs font-semibold p-2 rounded-xl border border-[var(--line)] bg-[var(--paper-strong)] text-[var(--ink)]">
					{CANONICAL_LAB_MATERIALS.map((mat) => (<option key={mat.id} value={mat.id} data-testid={`quick-construction-${mat.id}`}>{mat.titleRu.split(" (")[0]} ({mat.defaultDurationDays} раб. дн.)</option>))}
				</select>
			</div>
			<div className="space-y-1">
				<div className="flex items-center justify-between text-xs font-semibold"><span className="text-[var(--ink)]">Оттенок VITA: <strong className="text-[var(--teal)]">{selectedShade}</strong></span><span className="text-[10px] text-[var(--ink-muted)]">Classic + Bleach</span></div>
				<div className="dental-lab-shades-scroll">{VITA_SHADES_SSOT.map((v) => (<button key={v.code} type="button" data-testid={`shade-chip-${v.code}`} onClick={() => setSelectedShade(v.code)} className={`dental-lab-shade-chip ${selectedShade === v.code ? "selected" : ""}`} title={v.label}><span className="dental-lab-shade-color-dot" style={{ backgroundColor: v.approxHex }} /><span>{v.code}</span></button>))}</div>
			</div>
			<div className="space-y-1">
				<div className="flex items-center justify-between">
					<label htmlFor="lab-partner-select" className="text-xs font-semibold text-[var(--ink)] block">Лаборатория / Зубной техник</label>
					{!isAddingCustomLab && (
						<button type="button" onClick={() => setIsAddingCustomLab(true)} className="text-[10px] text-[var(--teal)] hover:underline cursor-pointer bg-transparent border-0">
							+ Своя ЗТЛ / Техник
						</button>
					)}
				</div>
				{isAddingCustomLab ? (
					<div className="flex gap-1.5 items-center">
						<input
							type="text"
							data-testid="lab-custom-name-input"
							value={customLabInput}
							onChange={(e) => setCustomLabInput(e.target.value)}
							placeholder="Название ЗТЛ или ФИО техника..."
							className="flex-1 text-xs font-semibold p-1.5 rounded-xl border border-[var(--teal)] bg-[var(--paper-strong)] text-[var(--ink)]"
						/>
						<button
							type="button"
							onClick={() => {
								const trimmed = customLabInput.trim();
								if (trimmed) {
									if (!customLabs.includes(trimmed)) {
										const updated = [...customLabs, trimmed];
										setCustomLabs(updated);
										try {
											localStorage.setItem("dente_custom_lab_names", JSON.stringify(updated));
										} catch (err) {
											console.warn("Failed to persist custom lab names:", err);
										}
									}
									setSelectedLab(trimmed);
									setCustomLabInput("");
									setIsAddingCustomLab(false);
								}
							}}
							className="px-2.5 py-1.5 bg-[var(--teal)] text-white text-[11px] font-bold rounded-xl cursor-pointer"
						>
							ОК
						</button>
						<button
							type="button"
							onClick={() => setIsAddingCustomLab(false)}
							className="px-2 py-1.5 text-xs text-[var(--ink-muted)] hover:text-[var(--ink)] cursor-pointer"
						>
							Отмена
						</button>
					</div>
				) : (
					<select
						id="lab-partner-select"
						data-testid="lab-partner-select"
						value={selectedLab}
						onChange={(e) => {
							if (e.target.value === "__custom__") {
								setIsAddingCustomLab(true);
							} else {
								setSelectedLab(e.target.value);
							}
						}}
						className="w-full text-xs font-semibold p-2 rounded-xl border border-[var(--line)] bg-[var(--paper-strong)] text-[var(--ink)]"
					>
						{allLaboratories.map((lab) => (
							<option key={lab} value={lab}>{lab}</option>
						))}
						<option value="__custom__">+ Добавить свою лабораторию...</option>
					</select>
				)}
			</div>
			<div className="grid grid-cols-2 gap-2">
				<div><label htmlFor="lab-due-date-input" className="text-[11px] font-semibold text-[var(--ink-muted)] block">Срок сдачи</label><input id="lab-due-date-input" type="date" value={effectiveDueDate} onChange={(e) => setCustomDueDate(e.target.value)} className="w-full text-xs p-1.5 rounded-lg border border-[var(--line)] bg-[var(--paper-strong)] text-[var(--ink)]" /></div>
				<div className="flex items-center pt-4"><label className="flex items-center gap-1.5 text-xs font-semibold text-[var(--ink)] cursor-pointer"><input type="checkbox" checked={isUrgent} onChange={(e) => setIsUrgent(e.target.checked)} className="rounded text-[var(--teal)]" /><span>Срочный наряд</span></label></div>
			</div>
			<div className="space-y-1">
				<label htmlFor="lab-notes-input" className="text-[11px] font-semibold text-[var(--ink-muted)] block">Указания технику</label>
				<textarea id="lab-notes-input" rows={1} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Уступ круговой 0.8мм, под десну 0.3мм, плотные контакты..." className="w-full text-xs p-1.5 rounded-xl border border-[var(--line)] bg-[var(--paper-strong)] text-[var(--ink)] resize-none" />
			</div>
			<div className="bg-[var(--paper-strong)] border border-[var(--line)] rounded-xl p-2 space-y-0.5 text-xs">
				<div className="flex justify-between text-[var(--ink-muted)]"><span>Себестоимость ЗТЛ ({teethCount} ед.):</span><strong className="text-[var(--ink)]">{formatKopecksToRubles(totalLabCostKopecks)}</strong></div>
				<div className="flex justify-between text-[var(--ink-muted)]"><span>Прайс для пациента:</span><strong className="text-[var(--ink)]">{formatKopecksToRubles(totalPatientPriceKopecks)}</strong></div>
				<div className="flex justify-between border-t border-[var(--line)] pt-0.5 text-[var(--teal)] font-bold"><span>Маржа клиники:</span><span>+{formatKopecksToRubles(netClinicRevenueKopecks)}</span></div>
			</div>
			{/* Ровно ОДНА Primary CTA кнопка #0d9488 (Мандат 8am & 8e: НИКОГДА НЕ DISABLED) */}
			<div className="pt-2 space-y-1.5 pb-2">
				<button type="button" data-testid="submit-lab-order-button" id="submit-lab-order-button" onClick={handleCreateOrder}
					className="dental-lab-primary-cta bg-[var(--teal,#0d9488)] submit-lab-order-btn" style={{ backgroundColor: "var(--teal, #0d9488)" }}>
					<span>✓ Создать заказ-наряд</span>
				</button>
				<div className="grid grid-cols-2 gap-2">
					<button type="button" data-testid="print-lab-order-a5-btn" onClick={handlePrintA5Blank} className="min-h-[36px] max-sm:min-h-[44px] py-1.5 px-2 rounded-xl text-xs font-semibold border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] hover:bg-[var(--paper-soft)] cursor-pointer text-center">Печать наряда А5</button>
					<button type="button" data-testid="courier-blank-btn" onClick={handleCourierBlank} className="min-h-[36px] max-sm:min-h-[44px] py-1.5 px-2 rounded-xl text-xs font-semibold border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] hover:bg-[var(--paper-soft)] cursor-pointer text-center">Бланк курьеру</button>
				</div>
			</div>
		</aside>
	);
};
