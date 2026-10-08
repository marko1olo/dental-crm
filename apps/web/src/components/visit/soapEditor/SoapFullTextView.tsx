import React from "react";
import { Check, FileText, Printer } from "lucide-react";
import type { SoapFullTextViewProps } from "./types";

export const SoapFullTextView: React.FC<SoapFullTextViewProps> = ({
	values,
	selectedTooth,
	isLocked,
	isCorrectionMode,
}) => {
	return (
		/* ── РЕЖИМ ПЕЧАТНОГО ПРЕДПРОСМОТРА МЕДИЦИНСКОЙ КАРТЫ (МАНДАТ 8E) ── */
		<div className="p-4 bg-[var(--paper)] font-serif text-[var(--ink)] text-xs leading-relaxed space-y-3 border border-[var(--line)] rounded-xl relative overflow-hidden">
			{/* Водяной знак штампа (Мандат 8e) */}
			<div
				className="absolute inset-0 flex items-center justify-center pointer-events-none select-none z-0 overflow-hidden"
				aria-hidden="true"
			>
				<div
					style={{
						transform: "rotate(-28deg)",
						fontSize: "32pt",
						fontWeight: 900,
						color: isLocked ? "rgba(16, 185, 129, 0.05)" : "rgba(15, 23, 42, 0.045)",
						textTransform: "uppercase",
						letterSpacing: "0.1em",
						whiteSpace: "nowrap",
					}}
				>
					{isLocked
						? (isCorrectionMode ? "ИСПРАВЛЕННОМУ ВЕРИТЬ" : "ПОДПИСАНО ВРАЧОМ")
						: "ЧЕРНОВИК — ДЛЯ ПРЕДВАРИТЕЛЬНОГО ОЗНАКОМЛЕНИЯ / БЕЗ ЭЦП"}
				</div>
			</div>

			{/* Верхняя панель печати: штамп и кнопка печати (Мандат 8e) */}
			<div className="flex items-center justify-between gap-2 pb-2 mb-2 border-b border-[var(--line)] relative z-10">
				<div className="flex items-center gap-2">
					{isLocked ? (
						<span
							data-testid="soap-print-stamp-locked"
							className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-emerald-600/40 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 text-[10px] font-bold tracking-wider uppercase font-sans"
						>
							<Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
							<span>{isCorrectionMode ? "ИСПРАВЛЕННОМУ ВЕРИТЬ" : "ПОДПИСАНО ВРАЧОМ"}</span>
						</span>
					) : (
						<span
							data-testid="soap-print-stamp-draft"
							className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-amber-600/40 bg-amber-500/10 text-amber-800 dark:text-amber-300 text-[10px] font-bold tracking-wider uppercase font-sans"
						>
							<FileText className="w-3.5 h-3.5 text-amber-600 shrink-0" />
							<span>ЧЕРНОВИК — ДЛЯ ПРЕДВАРИТЕЛЬНОГО ОЗНАКОМЛЕНИЯ / БЕЗ ЭЦП</span>
						</span>
					)}
				</div>
				<div className="flex items-center gap-2">
					<button
						type="button"
						onClick={() => window.print()}
						data-testid="btn-soap-print-action"
						className="min-h-[44px] sm:min-h-0 sm:h-7 px-3 text-xs font-bold rounded-lg bg-[var(--teal,var(--brand-primary))] text-white hover:opacity-90 flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors font-sans"
						title="Распечатать медицинскую карту"
					>
						<Printer className="w-3.5 h-3.5" />
						<span>Напечатать (Ctrl+P)</span>
					</button>
				</div>
			</div>

			<div className="border-b-2 border-[var(--line-strong,var(--ink))] pb-2 text-center relative z-10">
				<div className="font-sans font-black text-sm uppercase tracking-wide">
					МЕДИЦИНСКАЯ КАРТА СТОМАТОЛОГИЧЕСКОГО ПАЦИЕНТА
				</div>
				<div className="font-sans text-[10px] text-[var(--muted)]">
					Дневник амбулаторного приема • Зуб:{" "}
					{selectedTooth ?? "Общий статус"}
				</div>
			</div>

			<div className="relative z-10 space-y-2.5">
				<div>
					<span className="font-bold">Жалобы: </span>
					{values.complaint || "Не предъявляет."}
				</div>
				<div>
					<span className="font-bold">Анамнез и противопоказания: </span>
					{values.anamnesis ||
						"Соматически здоров. Аллергоанамнез спокойный."}
				</div>
				<div>
					<span className="font-bold">
						Осмотр и зубная формула:{" "}
					</span>
					{values.objectiveStatus || "Патологических изменений не выявлено."}
				</div>
				<div>
					<span className="font-bold">Диагноз: </span>
					{values.icd10 ? `[${values.icd10}] ` : ""}
					{values.diagnosis || "Z01.2 Стоматологическое обследование."}
				</div>
				<div>
					<span className="font-bold">Протокол лечения: </span>
					{values.treatmentPlan || "Консультация, осмотр."}
				</div>
				<div>
					<span className="font-bold">Рекомендации: </span>
					{values.recommendations || "Стандартный гигиенический уход."}
				</div>
			</div>

			<div className="pt-3 border-t border-[var(--line)] flex items-center justify-between text-[11px] text-[var(--muted)] font-sans relative z-10">
				<span>Медицинская карта стоматологического пациента</span>
				<span>Подпись врача: _________________ / {isLocked ? (isCorrectionMode ? "Исправленному верить" : "Подписано врачом") : "Черновик"}</span>
			</div>
		</div>
	);
};
