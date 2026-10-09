import * as React from "react";
import type { PipelineCard, PipelineResponse, PipelineStage } from "./types";
import { formatRub, PIPELINE_STAGES, STAGE_CONFIG } from "./types";
import { PipelineCardItem } from "./PipelineCardItem";

export interface PipelineBoardProps {
	data: PipelineResponse;
	activeMobileStage: PipelineStage;
	copiedToken: string | null;
	isGeneratingLink: string | null;
	onCopyOrGenerateLink: (card: PipelineCard) => void;
}

export const PipelineBoard: React.FC<PipelineBoardProps> = ({
	data,
	activeMobileStage,
	copiedToken,
	isGeneratingLink,
	onCopyOrGenerateLink,
}) => {
	const mobileCfg = STAGE_CONFIG[activeMobileStage];
	const mobileCards = data.pipeline[activeMobileStage] || [];
	const mobileStageCount = mobileCards.length;
	const mobileStageTotalRub = mobileCards.reduce((acc, c) => acc + c.netTotalRub, 0);

	return (
		<>
			{/* MOBILE VIEW (Single Stage Grouped View according to Apple HIG) */}
			<div className="md:hidden flex-1 space-y-3 pb-6">
				<div className="bg-[var(--paper)] border border-[var(--line)] rounded-2xl shadow-sm overflow-hidden">
					{/* Mobile Stage Header */}
					<div
						className="p-3.5 border-b border-[var(--line)] flex items-center justify-between"
						style={{ borderTop: `3px solid ${mobileCfg.accentColor}` }}
					>
						<div>
							<h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text)]">
								{mobileCfg.title}
							</h3>
							<p className="text-[11px] text-[var(--muted)]">{mobileCfg.hint}</p>
						</div>
						<div className="text-right">
							<span
								className="px-2 py-0.5 rounded-full text-xs font-mono font-bold inline-block"
								style={{
									backgroundColor: mobileCfg.badgeBg,
									borderColor: mobileCfg.badgeBorder,
									color: mobileCfg.badgeText,
								}}
							>
								{mobileStageCount}
							</span>
							<span className="block text-[11px] font-semibold text-[var(--text)] mt-0.5">
								{formatRub(mobileStageTotalRub)}
							</span>
						</div>
					</div>

					{/* Mobile Cards Container */}
					<div className="p-2.5 space-y-2.5">
						{mobileCards.length === 0 ? (
							<div className="p-8 text-center text-xs text-[var(--muted)] border border-dashed border-[var(--line)] rounded-xl">
								Нет планов в этом статусе
							</div>
						) : (
							mobileCards.map((card) => (
								<PipelineCardItem
									key={card.id}
									card={card}
									stageKey={activeMobileStage}
									copiedToken={copiedToken}
									isGeneratingLink={isGeneratingLink}
									onCopyOrGenerateLink={onCopyOrGenerateLink}
								/>
							))
						)}
					</div>
				</div>
			</div>

			{/* DESKTOP 5-COLUMN KANBAN (Fits 1440px neatly without horizontal clipping) */}
			<div className="hidden md:grid md:grid-cols-5 gap-2.5 w-full items-start pb-4">
				{PIPELINE_STAGES.map((stageKey) => {
					const cfg = STAGE_CONFIG[stageKey];
					const cards = data.pipeline[stageKey] || [];
					const stageCount = cards.length;
					const stageTotalRub = cards.reduce((acc, c) => acc + c.netTotalRub, 0);

					return (
						<div
							key={stageKey}
							className="min-w-0 w-full flex flex-col bg-[var(--paper)] border border-[var(--line)] rounded-2xl shadow-sm overflow-hidden"
						>
							{/* Column Header */}
							<div
								className="p-3 border-b border-[var(--line)] flex flex-col gap-1"
								style={{ borderTop: `3px solid ${cfg.accentColor}` }}
							>
								<div className="flex items-center justify-between gap-1">
									<h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text)] truncate">
										{cfg.title}
									</h3>
									<span
										className="px-1.5 py-0.5 rounded-full text-xs font-mono font-bold shrink-0"
										style={{
											backgroundColor: cfg.badgeBg,
											borderColor: cfg.badgeBorder,
											color: cfg.badgeText,
										}}
									>
										{stageCount}
									</span>
								</div>
								<div className="flex items-center justify-between text-[11px] text-[var(--muted)]">
									<span className="truncate">{cfg.hint}</span>
									<span className="font-semibold text-[var(--text)] shrink-0 ml-1">
										{formatRub(stageTotalRub)}
									</span>
								</div>
							</div>

							{/* Cards Container */}
							<div className="p-2.5 space-y-2.5 overflow-y-auto max-h-[calc(100vh-290px)] flex-1">
								{cards.length === 0 ? (
									<div className="p-6 text-center text-xs text-[var(--muted)] border border-dashed border-[var(--line)] rounded-xl">
										Нет планов
									</div>
								) : (
									cards.map((card) => (
										<PipelineCardItem
											key={card.id}
											card={card}
											stageKey={stageKey}
											copiedToken={copiedToken}
											isGeneratingLink={isGeneratingLink}
											onCopyOrGenerateLink={onCopyOrGenerateLink}
										/>
									))
								)}
							</div>
						</div>
					);
				})}
			</div>
		</>
	);
};
