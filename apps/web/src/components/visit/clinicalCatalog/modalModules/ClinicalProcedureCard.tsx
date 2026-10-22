import { ChevronDown, ChevronUp, Zap } from "lucide-react";
import type { ClinicalChunk1142, GroupedClinicalProcedure } from "../clinicalProtocolsCatalog";

export interface ClinicalProcedureCardProps {
	proc: GroupedClinicalProcedure;
	isExpanded: boolean;
	onToggleExpand: (id: string) => void;
	onApplyFull: (proc: GroupedClinicalProcedure) => void;
	onApplyChunk: (chunk: ClinicalChunk1142) => void;
}

export function ClinicalProcedureCard({
	proc,
	isExpanded,
	onToggleExpand,
	onApplyFull,
	onApplyChunk,
}: ClinicalProcedureCardProps) {
	return (
		<div
			className={`p-3 sm:p-3.5 rounded-xl border border-[var(--glass-border)] bg-[var(--paper)] hover:border-[var(--teal)]/60 transition-all shadow-2xs flex flex-col justify-between space-y-2.5 ${
				isExpanded ? "ring-1 ring-[var(--teal)] bg-[var(--paper-strong)]" : ""
			}`}
			data-testid={`card-procedure-${proc.id}`}
		>
			<div className="space-y-1.5">
				<div className="flex items-center gap-1.5 flex-wrap">
					<span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-[var(--teal-surface)] text-[var(--teal-dark)] border border-[var(--teal-soft)]">
						{proc.categoryName}
					</span>
					{proc.matchedIcd10 && (
						<span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-amber-500/15 text-amber-900 dark:text-amber-200 border border-amber-500/40">
							{proc.matchedIcd10.split(" ")[0]}
						</span>
					)}
					<span className="text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded bg-[var(--paper-soft)] text-[var(--ink)] border border-[var(--glass-border)]">
						{proc.totalChunks} этапов
					</span>
				</div>
				<h4 className="text-xs sm:text-sm font-bold text-[var(--ink)] leading-snug line-clamp-2" title={proc.procedureName}>
					{proc.procedureName}
				</h4>
			</div>

			<div className="flex items-center gap-1 flex-wrap pt-2 border-t border-[var(--glass-border)] text-xs">
				<span className="text-[10px] font-bold text-[var(--muted)] mr-0.5">Этапы:</span>
				{proc.complaints && (
					<button type="button" onClick={() => onApplyChunk(proc.complaints!)} className="px-1.5 py-0.5 rounded text-[10px] font-semibold border border-[var(--glass-border)] bg-[var(--paper-soft)] hover:bg-[var(--teal-soft)] hover:text-[var(--teal-dark)] text-[var(--ink)] transition-colors cursor-pointer" title="Вставить только жалобы">+ Жалобы</button>
				)}
				{proc.anamnesis && (
					<button type="button" onClick={() => onApplyChunk(proc.anamnesis!)} className="px-1.5 py-0.5 rounded text-[10px] font-semibold border border-[var(--glass-border)] bg-[var(--paper-soft)] hover:bg-[var(--teal-soft)] hover:text-[var(--teal-dark)] text-[var(--ink)] transition-colors cursor-pointer" title="Вставить только анамнез">+ Анамнез</button>
				)}
				{proc.objective && (
					<button type="button" onClick={() => onApplyChunk(proc.objective!)} className="px-1.5 py-0.5 rounded text-[10px] font-semibold border border-[var(--glass-border)] bg-[var(--paper-soft)] hover:bg-[var(--teal-soft)] hover:text-[var(--teal-dark)] text-[var(--ink)] transition-colors cursor-pointer" title="Вставить только объективный статус">+ Статус</button>
				)}
				{proc.treatment && (
					<button type="button" onClick={() => onApplyChunk(proc.treatment!)} className="px-1.5 py-0.5 rounded text-[10px] font-semibold border border-[var(--glass-border)] bg-[var(--paper-soft)] hover:bg-[var(--teal-soft)] hover:text-[var(--teal-dark)] text-[var(--ink)] transition-colors cursor-pointer" title="Вставить только протокол лечения">+ Лечение</button>
				)}
				{proc.recommendations && (
					<button type="button" onClick={() => onApplyChunk(proc.recommendations!)} className="px-1.5 py-0.5 rounded text-[10px] font-semibold border border-[var(--glass-border)] bg-[var(--paper-soft)] hover:bg-[var(--teal-soft)] hover:text-[var(--teal-dark)] text-[var(--ink)] transition-colors cursor-pointer" title="Вставить только рекомендации">+ Реком.</button>
				)}
			</div>

			<div className="flex items-center gap-1.5 pt-2 border-t border-[var(--glass-border)] mt-auto">
				<button type="button" onClick={() => onApplyFull(proc)} className="primary-button flex-1" title="Вставка всех этапов" data-testid={`btn-apply-full-proc-${proc.id}`}>
					<Zap size={13} className="shrink-0" />
					<span>Применить</span>
				</button>
				<button type="button" onClick={() => onToggleExpand(proc.id)} className={`h-8 px-2.5 rounded-lg text-xs font-semibold border transition-colors cursor-pointer flex items-center gap-1 shrink-0 ${isExpanded ? "border-[var(--teal)] bg-[var(--teal-soft)] text-[var(--teal-dark)]" : "border-[var(--glass-border)] bg-[var(--paper-soft)] hover:bg-[var(--paper)] text-[var(--ink)]"}`} title="Посмотреть текст разделов" aria-label={isExpanded ? "Свернуть" : "Развернуть детали"}>
					<span>{isExpanded ? "Свернуть" : "Детали"}</span>
					{isExpanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
				</button>
			</div>

			{isExpanded && (
				<div className="pt-2 border-t border-[var(--glass-border)] space-y-2 text-xs animate-in fade-in duration-100 max-h-64 overflow-y-auto pr-1">
					{[
						{ label: "Жалобы", chunk: proc.complaints },
						{ label: "Анамнез", chunk: proc.anamnesis },
						{ label: "Объективный статус", chunk: proc.objective },
						{ label: "Проведенное лечение", chunk: proc.treatment },
						{ label: "Рекомендации", chunk: proc.recommendations },
					].filter((item) => Boolean(item.chunk)).map((item) => (
						<div key={item.label} className="p-2 rounded-lg bg-[var(--paper-soft)] border border-[var(--glass-border)]">
							<div className="flex items-center justify-between mb-1">
								<span className="font-bold text-[11px] text-[var(--teal-dark)]">{item.label}</span>
								<button type="button" onClick={() => onApplyChunk(item.chunk!)} className="text-[10px] font-bold text-[var(--teal-dark)] hover:underline cursor-pointer">+ Вставить</button>
							</div>
							<p className="text-[11px] text-[var(--ink)] leading-relaxed whitespace-pre-wrap">{item.chunk!.text}</p>
						</div>
					))}
				</div>
			)}
		</div>
	);
}
