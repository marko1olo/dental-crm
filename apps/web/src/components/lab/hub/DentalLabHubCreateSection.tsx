/**
 * DentalLabHubCreateSection.tsx — Встроенная форма 1-клик наряда ЗТЛ для хаба лаборатории.
 * Мандаты 8b (180–220 строк), 8e (Автономия врача), 8n (Net Revenue врача).
 */

import React from "react";
import { Clock, Calendar } from "lucide-react";
import {
	LAB_CONSTRUCTION_CATALOG,
	VITA_SHADES,
	STUMP_SHADES,
	PARTNER_LABS,
	LAB_FAST_PRESETS,
	formatKopecks,
	type LabConstructionType,
	type DoctorNetRevenueCalculation,
} from "../labCatalogData";

export interface DentalLabHubCreateSectionProps {
	readonly patientName: string;
	readonly setPatientName: (val: string) => void;
	readonly toothFdi: string;
	readonly setToothFdi: (val: string) => void;
	readonly constructionId: string;
	readonly setConstructionId: (val: string) => void;
	readonly shadeVita: string;
	readonly setShadeVita: (val: string) => void;
	readonly shadeStump: string;
	readonly setShadeStump: (val: string) => void;
	readonly selectedLabId: string;
	readonly setSelectedLabId: (val: string) => void;
	readonly isWarranty: boolean;
	readonly setIsWarranty: (val: boolean) => void;
	readonly clinicalNotes: string;
	readonly setClinicalNotes: (val: string) => void;
	readonly selectedConstruction: LabConstructionType;
	readonly calculatedDates: { trialStr: string; dueStr: string };
	readonly payrollNet: DoctorNetRevenueCalculation;
	readonly onApplyFastPreset: (presetId: string) => void;
}

export const DentalLabHubCreateSection: React.FC<DentalLabHubCreateSectionProps> = ({
	patientName, setPatientName,
	toothFdi, setToothFdi,
	constructionId, setConstructionId,
	shadeVita, setShadeVita,
	shadeStump, setShadeStump,
	selectedLabId, setSelectedLabId,
	isWarranty, setIsWarranty,
	clinicalNotes, setClinicalNotes,
	selectedConstruction,
	calculatedDates,
	payrollNet,
	onApplyFastPreset,
}) => {
	return (
		<div className="space-y-4">
			{/* Быстрые пресеты в 1 клик */}
			<div>
				<label className="block text-xs font-bold text-[var(--ink)] mb-1.5">0-клик быстрые пресеты врача у кресла:</label>
				<div className="flex flex-wrap gap-1.5">
					{LAB_FAST_PRESETS.map((p) => (
						<button
							key={p.id}
							type="button"
							onClick={() => onApplyFastPreset(p.id)}
							data-testid={`lab-fast-preset-btn-${p.id}`}
							className="h-8 px-2.5 rounded-lg border border-[var(--line)] bg-[var(--paper-soft)] hover:bg-teal-50 hover:border-teal-500 text-[var(--ink)] text-xs font-semibold transition-colors cursor-pointer"
						>
							{p.label}
						</button>
					))}
				</div>
			</div>

			<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
				<div>
					<label className="block text-xs font-semibold text-[var(--ink)] mb-1">ФИО Пациента</label>
					<input
						type="text"
						value={patientName}
						onChange={(e) => setPatientName(e.target.value)}
						className="w-full h-9 px-3 text-xs rounded-xl border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)]"
					/>
				</div>
				<div>
					<label className="block text-xs font-semibold text-[var(--ink)] mb-1">Зубы по формуле FDI (11–48)</label>
					<input
						type="text"
						value={toothFdi}
						onChange={(e) => setToothFdi(e.target.value)}
						placeholder="Например: 16, 21, 22"
						className="w-full h-9 px-3 text-xs rounded-xl border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)]"
					/>
				</div>
			</div>

			<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
				<div>
					<label className="block text-xs font-semibold text-[var(--ink)] mb-1">Тип конструкции</label>
					<select
						value={constructionId}
						onChange={(e) => setConstructionId(e.target.value)}
						className="w-full h-9 px-2.5 text-xs rounded-xl border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)]"
					>
						{LAB_CONSTRUCTION_CATALOG.map((c) => (
							<option key={c.id} value={c.id}>
								{c.shortTitle} — {c.material}
							</option>
						))}
					</select>
				</div>
				<div>
					<label className="block text-xs font-semibold text-[var(--ink)] mb-1">Лаборатория</label>
					<select
						value={selectedLabId}
						onChange={(e) => setSelectedLabId(e.target.value)}
						className="w-full h-9 px-2.5 text-xs rounded-xl border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)]"
					>
						{PARTNER_LABS.map((l) => (
							<option key={l.id} value={l.id}>
								{l.name}
							</option>
						))}
					</select>
				</div>
			</div>

			{/* Выбор цвета VITA Classical */}
			<div>
				<label className="block text-xs font-semibold text-[var(--ink)] mb-1.5">Цвет по шкале VITA Classical / Bleach:</label>
				<div className="flex flex-wrap gap-1.5">
					{VITA_SHADES.slice(0, 10).map((v) => (
						<button
							key={v.code}
							type="button"
							onClick={() => setShadeVita(v.code)}
							className={`h-8 px-2 rounded-lg border text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer ${
								shadeVita === v.code ? "border-teal-600 bg-teal-50 dark:bg-teal-950/50 text-teal-800 dark:text-teal-200" : "border-[var(--line)] bg-[var(--paper)] text-[var(--ink)]"
							}`}
						>
							<span className="w-3.5 h-3.5 rounded-full border border-black/10 shrink-0" style={{ backgroundColor: v.hexColor }} />
							<span>{v.code}</span>
						</button>
					))}
				</div>
			</div>

			{/* Выбор цвета культи */}
			{selectedConstruction.allowsStumpShade && (
				<div>
					<label className="block text-xs font-semibold text-[var(--ink)] mb-1.5">Цвет культи (IPS Natural Die ND1–ND9):</label>
					<div className="flex flex-wrap gap-1.5">
						{STUMP_SHADES.slice(0, 7).map((s) => (
							<button
								key={s.code}
								type="button"
								onClick={() => setShadeStump(s.code)}
								className={`h-7 px-2 rounded-lg border text-[11px] font-semibold inline-flex items-center gap-1.5 cursor-pointer ${
									shadeStump === s.code ? "border-teal-600 bg-teal-50 dark:bg-teal-950/50 text-teal-800 dark:text-teal-200" : "border-[var(--line)] bg-[var(--paper)] text-[var(--ink)]"
								}`}
							>
								<span className="w-3 h-3 rounded-full border border-black/10 shrink-0" style={{ backgroundColor: s.hexColor }} />
								<span>{s.code}</span>
							</button>
						))}
					</div>
				</div>
			)}

			{/* Сроки: дата примерки и дата сдачи */}
			<div className="grid grid-cols-2 gap-3 p-3 rounded-xl bg-[var(--paper-soft)] border border-[var(--line)]">
				<div>
					<span className="text-[11px] text-[var(--muted)] flex items-center gap-1">
						<Clock size={12} /> Дата примерки:
					</span>
					<span className="text-xs font-bold text-[var(--ink)] mt-0.5 block">{calculatedDates.trialStr}</span>
				</div>
				<div>
					<span className="text-[11px] text-[var(--muted)] flex items-center gap-1">
						<Calendar size={12} /> Дата готовности:
					</span>
					<span className="text-xs font-bold text-[var(--teal,#0d9488)] mt-0.5 block">{calculatedDates.dueStr}</span>
				</div>
			</div>

			{/* Финансовый расчет и интеграция с Net Revenue врача в Payroll (Мандат 8n) */}
			<div className="p-3 rounded-xl border border-teal-500/25 bg-teal-50/50 dark:bg-teal-950/20 space-y-2">
				<div className="flex items-center justify-between text-xs">
					<span className="text-[var(--ink)] font-semibold">Сквозной расчет Net Revenue врача в Payroll:</span>
					<label className="inline-flex items-center gap-1.5 cursor-pointer text-[11px] text-[var(--ink)] font-medium">
						<input
							type="checkbox"
							checked={isWarranty}
							onChange={(e) => setIsWarranty(e.target.checked)}
							className="rounded border-[var(--line)] text-teal-600 focus:ring-0"
						/>
						<span>Гарантийная переделка (0 ₽ с врача)</span>
					</label>
				</div>
				<div className="grid grid-cols-3 gap-2 text-center pt-1 border-t border-teal-500/20">
					<div className="p-1.5 rounded-lg bg-[var(--paper)] border border-[var(--line)]">
						<span className="text-[10px] text-[var(--muted)] block">Выручка клиники</span>
						<strong className="text-xs text-[var(--ink)]">{formatKopecks(payrollNet.orthoGrossKopecks)}</strong>
					</div>
					<div className="p-1.5 rounded-lg bg-[var(--paper)] border border-[var(--line)]">
						<span className="text-[10px] text-[var(--muted)] block">Расход ЗТЛ (вычет)</span>
						<strong className="text-xs text-rose-600 dark:text-rose-400">-{formatKopecks(payrollNet.labCostKopecks)}</strong>
					</div>
					<div className="p-1.5 rounded-lg bg-[var(--paper)] border border-[var(--line)]">
						<span className="text-[10px] text-[var(--muted)] block">ЗП врача (25%)</span>
						<strong className="text-xs text-[var(--teal,#0d9488)]">{formatKopecks(payrollNet.doctorWageKopecks)}</strong>
					</div>
				</div>
			</div>

			<div>
				<label className="block text-xs font-semibold text-[var(--ink)] mb-1">Указания зубному технику</label>
				<textarea
					value={clinicalNotes}
					onChange={(e) => setClinicalNotes(e.target.value)}
					placeholder="Особенности окклюзии, анатомические выступы, индивидуализация режущего края..."
					rows={2}
					className="w-full p-2.5 text-xs rounded-xl border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] focus:outline-hidden"
				/>
			</div>
		</div>
	);
};
