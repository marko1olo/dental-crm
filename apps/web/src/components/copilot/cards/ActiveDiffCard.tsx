/**
 * @file ActiveDiffCard.tsx
 * @description Card rendering active diffs (before / after) for workstation file modifications,
 * EMR diary changes, and clinical records (Mandate 8b <= 150 lines, Apple HIG, 1 Primary CTA).
 */

import React, { useState } from "react";
import { Check, FileText, GitCompare, RotateCcw, X } from "lucide-react";
import type { ActiveDiff } from "../../../store/copilotStore";

export interface ActiveDiffCardProps {
	diff: ActiveDiff;
	onApply?: () => void;
	onReject?: () => void;
	disabled?: boolean;
}

export const ActiveDiffCard: React.FC<ActiveDiffCardProps> = ({
	diff,
	onApply,
	onReject,
	disabled = false,
}) => {
	const [isApplied, setIsApplied] = useState(Boolean(diff.applied));

	const handleApply = () => {
		setIsApplied(true);
		onApply?.();
	};

	const handleReject = () => {
		onReject?.();
	};

	return (
		<div
			className={`copilot-active-diff-card p-3.5 rounded-2xl border transition-all text-xs space-y-3 ${
				isApplied
					? "border-[var(--teal,#0d9488)]/40 bg-[var(--teal-soft,rgba(13,148,136,0.06))]"
					: "border-[var(--teal,#0d9488)]/40 bg-[var(--paper-soft,#f8fafc)] shadow-xs"
			}`}
			data-testid="copilot-active-diff-card"
			role="region"
			aria-label="Карточка диффа изменений"
		>
			{/* Шапка карточки */}
			<div className="flex items-center justify-between gap-2">
				<div className="flex items-center gap-2 min-w-0">
					<div className="w-7 h-7 rounded-lg bg-[var(--teal,#0d9488)]/15 text-[var(--teal,#0d9488)] flex items-center justify-center shrink-0">
						<GitCompare size={15} />
					</div>
					<div className="min-w-0">
						<h4 className="font-bold text-[var(--ink)] text-xs m-0 truncate">
							{diff.title || "Дифф изменений"}
						</h4>
						<div className="text-[10px] text-[var(--muted)] flex items-center gap-1 truncate font-mono">
							<FileText size={10} className="shrink-0" />
							<span className="truncate">{diff.targetEntity}</span>
						</div>
					</div>
				</div>
				<span
					className={`px-2 py-0.5 rounded-md text-[10px] font-bold border shrink-0 ${
						isApplied
							? "bg-[var(--teal-soft,rgba(13,148,136,0.12))] text-[var(--teal,#0d9488)] border-[var(--teal,#0d9488)]/30"
							: "bg-[var(--paper-soft,#f4f7f6)] text-[var(--ink)] border-[var(--line)]"
					}`}
				>
					{isApplied ? "Применено" : "Требует согласования"}
				</span>
			</div>

			{/* Область сравнения До / После */}
			<div className="grid grid-cols-1 md:grid-cols-2 gap-2 font-mono text-[11px] leading-relaxed">
				{/* Блок Было */}
				<div className="p-2.5 rounded-xl border border-[var(--danger,#ef4444)]/30 bg-[var(--danger-soft,rgba(239,68,68,0.06))] text-[var(--ink)] space-y-1">
					<div className="text-[10px] font-bold uppercase tracking-wider text-[var(--danger,#ef4444)] flex items-center gap-1">
						<span>- Было</span>
					</div>
					<div className="whitespace-pre-wrap max-h-36 overflow-y-auto font-mono text-[11px] opacity-90">
						{diff.beforeText || "(Пусто / новый фрагмент)"}
					</div>
				</div>

				{/* Блок Станет */}
				<div className="p-2.5 rounded-xl border border-[var(--teal,#0d9488)]/30 bg-[var(--teal-soft,rgba(13,148,136,0.06))] text-[var(--ink)] space-y-1">
					<div className="text-[10px] font-bold uppercase tracking-wider text-[var(--teal,#0d9488)] flex items-center gap-1">
						<span>+ Станет</span>
					</div>
					<div className="whitespace-pre-wrap max-h-36 overflow-y-auto font-mono text-[11px] font-medium">
						{diff.afterText || "(Удаление фрагмента)"}
					</div>
				</div>
			</div>

			{/* Кнопки действий: ровно 1 Primary CTA */}
			<div className="flex items-center justify-end gap-2 pt-1 border-t border-[var(--line)]">
				{!isApplied && (
					<button
						type="button"
						onClick={handleReject}
						disabled={disabled}
						className="h-10 sm:h-9 min-h-[40px] sm:min-h-[36px] px-3.5 rounded-xl border border-[var(--line)] bg-[var(--paper)] text-[var(--muted)] hover:text-[var(--danger,#ef4444)] hover:border-[var(--danger,#ef4444)]/40 hover:bg-[var(--danger-soft,rgba(239,68,68,0.06))] text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
						data-testid="active-diff-reject-btn"
					>
						<X size={14} />
						<span>Отклонить</span>
					</button>
				)}

				<button
					type="button"
					onClick={handleApply}
					disabled={disabled}
					className={`h-10 sm:h-9 min-h-[40px] sm:min-h-[36px] px-4 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-all ${
						isApplied
							? "bg-[var(--teal,#0d9488)] text-white shadow-xs"
							: "bg-[var(--primary,#0d9488)] text-white hover:opacity-95 shadow-xs"
					}`}
					data-testid="active-diff-apply-btn"
				>
					{isApplied ? (
						<>
							<Check size={14} />
							<span>Изменения применены</span>
						</>
					) : (
						<>
							<Check size={14} />
							<span>Применить изменения</span>
						</>
					)}
				</button>
			</div>
		</div>
	);
};

export default ActiveDiffCard;
