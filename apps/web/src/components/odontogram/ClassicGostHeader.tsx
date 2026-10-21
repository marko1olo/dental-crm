import React, { useState } from "react";
import { Award, Check, Copy, FileText } from "lucide-react";
import { showToast } from "../GlobalToast";
import type { ToothData } from "./ToothChart";
import {
	formatOdontogramTo043ProtocolText,
	type DmftCalculationResult,
} from "./classicGostTypes";

export interface ClassicGostHeaderProps {
	readonly pediatricMode?: boolean | undefined;
	readonly teethData: readonly ToothData[];
	readonly dmftStats: DmftCalculationResult;
}

export const ClassicGostHeader: React.FC<ClassicGostHeaderProps> = ({
	pediatricMode,
	teethData,
	dmftStats,
}) => {
	const [isCopied, setIsCopied] = useState(false);

	const handleCopyProtocolText = () => {
		const text = formatOdontogramTo043ProtocolText(teethData, pediatricMode);
		if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
			navigator.clipboard.writeText(text).then(
				() => {
					setIsCopied(true);
					showToast("Зубная формула скопирована для дневника приёма", "success");
					setTimeout(() => setIsCopied(false), 2000);
				},
				() => {
					showToast("Не удалось скопировать в буфер обмена", "error");
				},
			);
		}
	};

	return (
		<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[var(--odontogram-border-subtle)]">
			<div className="flex items-center gap-2.5">
				<div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-500/20">
					<FileText size={18} />
				</div>
				<div>
					<div className="flex items-center gap-2">
						<h2 className="text-base font-bold tracking-tight text-[var(--odontogram-ink)]">
							Зубная формула
						</h2>
						{pediatricMode && (
							<span className="text-xs px-2 py-0.5 rounded-full bg-pink-100 dark:bg-pink-950/70 text-pink-700 dark:text-pink-300 font-bold border border-pink-300 dark:border-pink-800">
								Детская
							</span>
						)}
					</div>
					<p className="text-xs text-[var(--odontogram-ink-muted)]">
						Медицинская карта стоматологического пациента
					</p>
				</div>
			</div>

			<div className="flex items-center gap-2">
				<button
					type="button"
					onClick={handleCopyProtocolText}
					title="Скопировать формулу в дневник приёма"
					className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-[var(--odontogram-surface)] hover:bg-[var(--odontogram-surface-hover)] border border-[var(--odontogram-border-subtle)] text-[var(--odontogram-ink)] shadow-xs transition-colors cursor-pointer"
				>
					{isCopied ? (
						<Check size={14} className="text-emerald-500" />
					) : (
						<Copy size={14} className="text-[var(--odontogram-ink-muted)]" />
					)}
					<span>{isCopied ? "Скопировано!" : "В дневник приёма"}</span>
				</button>

				<div className="flex items-center gap-3 px-3 py-1.5 rounded-xl bg-[var(--odontogram-surface)] border border-[var(--odontogram-border-subtle)] text-xs">
					<Award size={16} className="text-amber-500 shrink-0" />
					<div className="flex items-center gap-2">
						<span className="font-semibold text-[var(--odontogram-ink-muted)]">
							Индекс КПУ:
						</span>
						<strong className="font-black text-sm text-[var(--odontogram-ink)]">
							{dmftStats.dmftTotal}
						</strong>
						<span className="text-xs font-semibold text-[var(--odontogram-ink-muted)]">
							(К={dmftStats.decayed}, П={dmftStats.filled}, У={dmftStats.missing})
						</span>
					</div>
					<span className="ml-1 hidden md:inline-block font-bold text-xs text-[var(--odontogram-ink-muted)]">
						· {dmftStats.severityLabel}
					</span>
				</div>
			</div>
		</div>
	);
};
