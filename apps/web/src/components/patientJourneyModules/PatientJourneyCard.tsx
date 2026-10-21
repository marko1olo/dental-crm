import React from "react";
import { money } from "../../AppHelpers";
import {
	highlightMatch,
	renderEventIcon,
	toFriendlyRussianProcedure,
} from "./journeyHelpers";
import type { PatientTimelineCardProps } from "./journeyTypes";

export const PatientTimelineCard = React.memo<PatientTimelineCardProps>(
	({ evt, isFirst, isLast, searchQuery }) => {
		const isHighlight = isFirst || isLast;
		const formattedDate = (() => {
			if (!evt.timestamp) return "";
			const d = new Date(evt.timestamp);
			return !Number.isNaN(d.getTime())
				? d.toLocaleString("ru-RU", {
						day: "2-digit",
						month: "2-digit",
						year: "numeric",
						hour: "2-digit",
						minute: "2-digit",
					})
				: "";
		})();

		return (
			<div
				className={`timeline-item ${evt.type} ${isHighlight ? "highlight-item" : ""} rounded-xl bg-[var(--paper-strong)] border border-[var(--line)] p-3.5 shadow-2xs transition-all hover:border-[var(--line-strong)] flex items-start gap-3`}
				style={{ contentVisibility: "auto", containIntrinsicSize: "1px 80px" }}
			>
				<div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border border-[var(--line)] bg-[var(--paper)] shadow-2xs mt-0.5">
					{renderEventIcon(evt.type)}
				</div>

				<div className="timeline-content flex-1 min-w-0 flex flex-col gap-1">
					<div className="flex items-center justify-between gap-2 flex-wrap">
						<span className="timestamp text-xs font-mono font-medium text-[var(--muted)]">
							{formattedDate}
						</span>
						{evt.status && (
							<span className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-[var(--paper-soft)] border border-[var(--line)] text-[var(--ink)]">
								{highlightMatch(evt.status, searchQuery)}
							</span>
						)}
					</div>

					<h4 className="text-sm font-bold text-[var(--ink)] m-0 leading-tight">
						{highlightMatch(toFriendlyRussianProcedure(evt.title), searchQuery)}
					</h4>

					<p className="text-xs text-[var(--muted)] m-0 leading-relaxed">
						{highlightMatch(
							toFriendlyRussianProcedure(evt.description),
							searchQuery,
						)}
					</p>

					<div className="flex items-center justify-between gap-2 pt-1 flex-wrap">
						{evt.amount ? (
							<div className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400">
								+{money(evt.amount)}
							</div>
						) : (
							<div />
						)}

						{evt.actionUrl && (
							<button
								type="button"
								className="min-h-[32px] h-8 px-2.5 rounded-lg text-xs font-semibold border border-[var(--line)] bg-[var(--paper)] hover:bg-[var(--paper-soft)] text-[var(--ink)] transition-colors cursor-pointer inline-flex items-center gap-1"
								onClick={() => {
									window.location.hash = evt.actionUrl ?? "";
								}}
							>
								<span>Подробнее</span>
								<span>&rarr;</span>
							</button>
						)}
					</div>
				</div>
			</div>
		);
	},
);

PatientTimelineCard.displayName = "PatientTimelineCard";
