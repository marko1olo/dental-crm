import React from "react";
import { Calendar, Send } from "lucide-react";
import type { OrthoBracketProtocolSectionProps } from "./types";

export const AlignerTrackerSection: React.FC<OrthoBracketProtocolSectionProps> = ({
	isSplitArchAligners, setIsSplitArchAligners,
	alignerStep, setAlignerStep, alignerTotal,
	alignerStepUpper, setAlignerStepUpper, alignerTotalUpper,
	alignerStepLower, setAlignerStepLower, alignerTotalLower,
	alignerIntervalDays, setAlignerIntervalDays,
	nextAlignerDateStr, alignerProgressPercent,
	onSendAlignerReminder,
}) => {
	const stepText = isSplitArchAligners ? `ВЧ №${alignerStepUpper} / НЧ №${alignerStepLower}` : `Каппа №${alignerStep} из ${alignerTotal}`;

	return (
		<div data-testid="aligner-tray-tracker" className="p-3 rounded-xl bg-[var(--paper)] border border-[var(--line)] flex flex-col gap-2">
			<div className="flex items-center justify-between flex-wrap gap-1.5">
				<span className="text-xs font-black uppercase tracking-wider text-[var(--ink)] flex items-center gap-1.5">
					<Calendar size={14} className="text-[var(--primary)]" />
					Трекер смены капп элайнеров {isSplitArchAligners ? `(ВЧ 1..${alignerTotalUpper}, НЧ 1..${alignerTotalLower})` : `(1..${alignerTotal})`}
				</span>
				<div className="flex items-center gap-1.5">
					<button
						type="button"
						onClick={() => setIsSplitArchAligners((prev) => !prev)}
						data-testid="aligner-split-arch-toggle"
						className="px-2 py-0.5 rounded-lg text-[10px] font-bold border border-[var(--line)] bg-[var(--paper-soft)] text-[var(--ink)] hover:bg-[var(--paper)] cursor-pointer"
					>
						{isSplitArchAligners ? "Раздельные челюсти (ВЧ / НЧ)" : "Единый сет"}
					</button>
					<span data-testid="aligner-tray-badge" className="px-2 py-0.5 rounded-lg text-[11px] font-black bg-[var(--primary)] text-white shadow-xs">
						{stepText}
					</span>
					<span className="text-[11px] font-bold text-[var(--muted)]">({alignerProgressPercent}%)</span>
				</div>
			</div>

			<div className="w-full bg-[var(--line)] rounded-full h-2 overflow-hidden">
				<div data-testid="aligner-tray-progress-bar" className="bg-[var(--primary)] h-2 rounded-full transition-all duration-300" style={{ width: `${alignerProgressPercent}%` }} />
			</div>

			{!isSplitArchAligners ? (
				<div className="flex items-center justify-between gap-2 flex-wrap pt-0.5">
					<div className="flex items-center gap-1 flex-wrap">
						<button
							type="button"
							onClick={() => { const n = Math.max(1, alignerStep - 1); setAlignerStep(n); setAlignerStepUpper(n); setAlignerStepLower(n); }}
							data-testid="aligner-prev-tray-btn"
							className="min-h-[36px] min-w-[36px] px-2 rounded-xl bg-[var(--paper)] border border-[var(--line)] text-[var(--ink)] font-black text-xs hover:bg-[var(--paper-soft)] cursor-pointer"
						>-1</button>
						<span className="text-xs font-bold text-[var(--ink)] px-1 min-w-[56px] text-center">№ {alignerStep}</span>
						<button
							type="button"
							onClick={() => { const n = Math.min(alignerTotal, alignerStep + 1); setAlignerStep(n); setAlignerStepUpper(n); setAlignerStepLower(n); }}
							data-testid="aligner-next-tray-btn"
							className="min-h-[36px] min-w-[36px] px-2 rounded-xl bg-[var(--paper)] border border-[var(--line)] text-[var(--ink)] font-black text-xs hover:bg-[var(--paper-soft)] cursor-pointer"
						>+1</button>
						<button
							type="button"
							onClick={() => setAlignerIntervalDays((d) => (d === 7 ? 10 : d === 10 ? 14 : 7))}
							data-testid="aligner-days-toggle-btn"
							className="text-[11px] font-medium text-[var(--muted)] hover:text-[var(--primary)] ml-1 cursor-pointer underline decoration-dotted"
						>Смена: {nextAlignerDateStr} (+{alignerIntervalDays} дн.)</button>
					</div>
					<button type="button" onClick={onSendAlignerReminder} data-testid="aligner-send-reminder-btn" className="min-h-[36px] px-2.5 py-1 text-xs font-bold rounded-xl bg-[var(--paper-soft)] hover:bg-[var(--paper)] border border-[var(--line)] text-[var(--ink)] shadow-xs flex items-center gap-1 cursor-pointer">
						<Send size={13} className="text-[var(--primary)]" /><span>Напомнить о смене</span>
					</button>
				</div>
			) : (
				<div className="flex flex-col gap-2 pt-0.5">
					<div className="flex items-center justify-between gap-2 flex-wrap">
						<div className="flex items-center gap-1.5 flex-wrap">
							<span className="text-xs font-bold text-[var(--ink)] w-8 shrink-0">ВЧ:</span>
							<button type="button" onClick={() => setAlignerStepUpper((p) => Math.max(1, p - 1))} data-testid="aligner-upper-prev-tray-btn" className="min-h-[32px] min-w-[32px] px-2 rounded-xl bg-[var(--paper)] border border-[var(--line)] text-[var(--ink)] font-black text-xs hover:bg-[var(--paper-soft)] cursor-pointer">-1</button>
							<span data-testid="aligner-upper-tray-badge" className="text-xs font-bold text-[var(--ink)] px-1 min-w-[48px] text-center">№ {alignerStepUpper}/{alignerTotalUpper}</span>
							<button type="button" onClick={() => setAlignerStepUpper((p) => Math.min(alignerTotalUpper, p + 1))} data-testid="aligner-upper-next-tray-btn" className="min-h-[32px] min-w-[32px] px-2 rounded-xl bg-[var(--paper)] border border-[var(--line)] text-[var(--ink)] font-black text-xs hover:bg-[var(--paper-soft)] cursor-pointer">+1</button>
						</div>
						<div className="flex items-center gap-1.5 flex-wrap">
							<span className="text-xs font-bold text-[var(--ink)] w-8 shrink-0">НЧ:</span>
							<button type="button" onClick={() => setAlignerStepLower((p) => Math.max(1, p - 1))} data-testid="aligner-lower-prev-tray-btn" className="min-h-[32px] min-w-[32px] px-2 rounded-xl bg-[var(--paper)] border border-[var(--line)] text-[var(--ink)] font-black text-xs hover:bg-[var(--paper-soft)] cursor-pointer">-1</button>
							<span data-testid="aligner-lower-tray-badge" className="text-xs font-bold text-[var(--ink)] px-1 min-w-[48px] text-center">№ {alignerStepLower}/{alignerTotalLower}</span>
							<button type="button" onClick={() => setAlignerStepLower((p) => Math.min(alignerTotalLower, p + 1))} data-testid="aligner-lower-next-tray-btn" className="min-h-[32px] min-w-[32px] px-2 rounded-xl bg-[var(--paper)] border border-[var(--line)] text-[var(--ink)] font-black text-xs hover:bg-[var(--paper-soft)] cursor-pointer">+1</button>
						</div>
					</div>
					<div className="flex items-center justify-between gap-2 flex-wrap pt-0.5">
						<button type="button" onClick={() => setAlignerIntervalDays((d) => (d === 7 ? 10 : d === 10 ? 14 : 7))} data-testid="aligner-days-toggle-split-btn" className="text-[11px] font-medium text-[var(--muted)] hover:text-[var(--primary)] cursor-pointer underline decoration-dotted">Смена: {nextAlignerDateStr} (+{alignerIntervalDays} дн.)</button>
						<button type="button" onClick={onSendAlignerReminder} data-testid="aligner-send-reminder-btn" className="min-h-[36px] px-2.5 py-1 text-xs font-bold rounded-xl bg-[var(--paper-soft)] hover:bg-[var(--paper)] border border-[var(--line)] text-[var(--ink)] shadow-xs flex items-center gap-1 cursor-pointer">
							<Send size={13} className="text-[var(--primary)]" /><span>Напомнить о смене</span>
						</button>
					</div>
				</div>
			)}
		</div>
	);
};
