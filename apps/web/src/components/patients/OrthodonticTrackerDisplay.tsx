import React from "react";
import { motion } from "framer-motion";
import { Calendar, CheckCircle2, Smile } from "lucide-react";
import { countLabel } from "../../lib/russianPlural";
import type { OrthoData } from "./orthodonticProgressSerialization";

interface OrthodonticTrackerDisplayProps {
	ortho: OrthoData | null;
	onStartEdit: () => void;
	children?: React.ReactNode;
}

const formatDate = (dateStr: string) => {
	try {
		if (typeof dateStr !== "string" || !dateStr) return dateStr || "";
		const [y, m, d] = (dateStr ?? "").split("-");
		if (!y || !m || !d) return dateStr;
		return `${d}.${m}.${y}`;
	} catch {
		return dateStr || "";
	}
};

export const OrthodonticTrackerDisplay: React.FC<OrthodonticTrackerDisplayProps> = ({
	ortho,
	onStartEdit,
	children,
}) => {
	if (!ortho) {
		return (
			<div className="flex flex-col items-center gap-3 py-4">
				<div className="w-12 h-12 rounded-full bg-[var(--paper-soft)] flex items-center justify-center text-[var(--muted)] border border-[var(--glass-border)]">
					<Smile size={24} />
				</div>
				<p className="m-0 text-sm text-[var(--muted)] text-center">
					Лечение каппами пока не начато.
				</p>
				<button
					type="button"
					onClick={onStartEdit}
					className="mt-2 min-h-[44px] sm:min-h-[32px] bg-transparent border border-[var(--teal-ring)] text-[var(--teal-dark)] px-4 py-2 rounded-xl text-xs font-semibold cursor-pointer hover:bg-[var(--teal-surface)] transition-colors inline-flex items-center justify-center"
				>
					Начать отсчёт капп
				</button>
			</div>
		);
	}

	const currentAligner = ortho.currentAligner;
	const totalAligners = ortho.totalAligners;
	const weeksRemaining = Math.max(0, totalAligners - currentAligner);
	const progressPercent = Math.round((currentAligner / totalAligners) * 100);

	return (
		<div className="flex flex-col gap-4">
			<div className="flex justify-between items-start">
				<div className="flex items-center gap-2.5">
					<div className="w-10 h-10 rounded-xl bg-[var(--teal-soft)] flex items-center justify-center text-[var(--teal-dark)]">
						<Smile size={20} />
					</div>
					<div>
						<h4 className="m-0 text-sm font-semibold text-[var(--ink)]">Элайнеры</h4>
						<span className="text-xs text-[var(--muted)] flex items-center gap-1">
							<Calendar size={12} /> с {formatDate(ortho.startDate)}
						</span>
					</div>
				</div>
				<button
					type="button"
					onClick={onStartEdit}
					className="bg-[var(--paper-strong)] border border-[var(--glass-border)] text-[var(--ink)] hover:bg-[var(--paper-soft)] px-3.5 py-2 min-h-[44px] sm:min-h-[32px] rounded-xl text-xs font-semibold cursor-pointer inline-flex items-center justify-center"
				>
					Изменить
				</button>
			</div>

			<div className="flex flex-col gap-2">
				<div className="flex justify-between items-end">
					<span className="text-3xl font-bold text-[var(--ink)] leading-none">
						{currentAligner}{" "}
						<span className="text-base font-medium text-[var(--muted)]">/ {totalAligners}</span>
					</span>
					<span className="text-xs font-semibold text-[var(--teal-dark)]">{progressPercent}%</span>
				</div>
				<div className="h-2 bg-[var(--paper-soft)] rounded-full overflow-hidden">
					<motion.div
						initial={{ width: 0 }}
						animate={{ width: `${progressPercent}%` }}
						transition={{ duration: 1, ease: "easeOut" }}
						className="h-full bg-[var(--teal)] rounded-full"
					/>
				</div>
			</div>

			{weeksRemaining > 0 ? (
				<p className="m-0 text-xs text-[var(--muted)]">
					Осталось примерно{" "}
					<strong className="text-[var(--ink)]">{countLabel(weeksRemaining, "каппа", "каппы", "капп")}</strong>{" "}
					до конца этапа.
				</p>
			) : (
				<p className="m-0 text-xs text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1.5">
					<CheckCircle2 size={14} className="shrink-0 text-emerald-500" />
					<span>Все каппы пройдены! Запланируйте контрольный осмотр.</span>
				</p>
			)}

			{children}
		</div>
	);
};
