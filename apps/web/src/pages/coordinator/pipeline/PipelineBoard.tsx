import * as React from "react";
import { ArrowLeft, ChevronRight, Layers, Plus } from "lucide-react";
import type {
	PipelineCard,
	PipelineResponse,
	PipelineStage,
	PipelineStageFilter,
	PipelineViewMode,
} from "./types";
import { formatRub, PIPELINE_STAGES, STAGE_CONFIG } from "./types";
import { PipelineCardItem } from "./PipelineCardItem";

export interface PipelineBoardProps {
	data: PipelineResponse;
	selectedStage: PipelineStageFilter;
	onSelectStage: (stage: PipelineStageFilter) => void;
	viewMode: PipelineViewMode;
	activeMobileStage: PipelineStage;
	copiedToken: string | null;
	isGeneratingLink: string | null;
	onCopyOrGenerateLink: (card: PipelineCard) => void;
	onOpenPlan?: ((card: PipelineCard) => void) | undefined;
	onTransitionStage?: ((card: PipelineCard, targetStage: PipelineStage) => Promise<void>) | undefined;
	onCreateRecallTask?: ((card: PipelineCard) => Promise<void>) | undefined;
	onCreateNewPlan?: (() => void) | undefined;
}

export const PipelineBoard: React.FC<PipelineBoardProps> = ({
	data,
	selectedStage,
	onSelectStage,
	viewMode,
	activeMobileStage,
	copiedToken,
	isGeneratingLink,
	onCopyOrGenerateLink,
	onOpenPlan,
	onTransitionStage,
	onCreateRecallTask,
	onCreateNewPlan,
}) => {
	const mobileCfg = STAGE_CONFIG[activeMobileStage];
	const mobileCards = data.pipeline[activeMobileStage] || [];
	const mobileStageCount = mobileCards.length;
	const mobileStageTotalRub = mobileCards.reduce((acc, c) => acc + c.netTotalRub, 0);

	const isTotalEmpty = (data.summary?.counts?.total ?? 0) === 0;

	const handleDrop = async (e: React.DragEvent, targetStage: PipelineStage) => {
		e.preventDefault();
		try {
			const raw = e.dataTransfer.getData("text/plain");
			if (!raw) return;
			const payload = JSON.parse(raw);
			if (payload.planId && payload.currentStage !== targetStage) {
				const allCards = Object.values(data.pipeline).flat();
				const card = allCards.find((c) => c.id === payload.planId);
				if (card && onTransitionStage) {
					await onTransitionStage(card, targetStage);
				}
			}
		} catch {
			// ignore drag parse errors
		}
	};

	if (isTotalEmpty) {
		return (
			<div
				className="w-full p-8 sm:p-12 text-center bg-[var(--paper)] border border-dashed border-[var(--line)] rounded-2xl flex flex-col items-center justify-center gap-3 my-4 shadow-xs"
				data-testid="pipeline-global-empty-state"
			>
				<div className="w-12 h-12 rounded-2xl bg-[var(--teal,#0d9488)]/10 text-[var(--teal,#0d9488)] flex items-center justify-center">
					<Layers className="w-6 h-6" />
				</div>
				<div className="space-y-1 max-w-md">
					<h3 className="text-sm sm:text-base font-bold text-[var(--text)]">
						В воронке пока нет планов лечения
					</h3>
					<p className="text-xs text-[var(--muted)]">
						Составьте первый комплексный план лечения для любого пациента клиники или откройте студию презентации сметы.
					</p>
				</div>
				<div className="flex items-center gap-2 pt-2">
					<button
						type="button"
						onClick={() => {
							if (typeof window !== "undefined") {
								window.location.hash = "#/patients";
							}
							onCreateNewPlan?.();
						}}
						className="primary-button min-h-[44px] sm:min-h-[36px] h-11 sm:h-9 px-4 rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-sm cursor-pointer"
						style={{ borderRadius: "10px" }}
						data-testid="pipeline-create-first-plan-btn"
					>
						<Plus className="w-4 h-4" />
						<span>Создать первый план лечения</span>
					</button>
				</div>
			</div>
		);
	}

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
									viewMode="horizontal"
									copiedToken={copiedToken}
									isGeneratingLink={isGeneratingLink}
									onCopyOrGenerateLink={onCopyOrGenerateLink}
									onOpenPlan={onOpenPlan}
									onTransitionStage={onTransitionStage}
									onCreateRecallTask={onCreateRecallTask}
								/>
							))
						)}
					</div>
				</div>
			</div>

			{/* DESKTOP VIEW */}
			<div className="hidden md:block flex-1 pb-6">
				{viewMode === "horizontal" ? (
					/* HORIZONTAL MODE (Swimlanes or Focused Stage) */
					selectedStage !== "all" ? (
						/* FOCUSED SINGLE STAGE VIEW */
						(() => {
							const cfg = STAGE_CONFIG[selectedStage];
							const cards = data.pipeline[selectedStage] || [];
							const stageCount = cards.length;
							const stageTotalRub = cards.reduce((acc, c) => acc + c.netTotalRub, 0);

							return (
								<div
									className="bg-[var(--paper)] border border-[var(--line)] rounded-2xl shadow-sm overflow-hidden space-y-4"
									onDragOver={(e) => {
										e.preventDefault();
										e.dataTransfer.dropEffect = "move";
									}}
									onDrop={(e) => handleDrop(e, selectedStage)}
								>
									{/* Focused Header */}
									<div
										className="p-4 border-b border-[var(--line)] flex items-center justify-between gap-4"
										style={{ borderTop: `4px solid ${cfg.accentColor}` }}
									>
										<div className="flex items-center gap-3">
											<button
												type="button"
												onClick={() => onSelectStage("all")}
												className="h-8 px-2.5 rounded-xl border border-[var(--line)] bg-[var(--paper-soft)] hover:bg-[var(--line-subtle)] text-xs text-[var(--muted)] hover:text-[var(--text)] transition flex items-center gap-1.5 shadow-sm"
												title="Вернуться ко всем этапам"
											>
												<ArrowLeft className="w-3.5 h-3.5" />
												<span>Все этапы</span>
											</button>
											<div>
												<div className="flex items-center gap-2">
													<h2 className="text-sm sm:text-base font-bold text-[var(--text)]">
														{cfg.title}
													</h2>
													<span
														className="px-2 py-0.5 rounded-full text-xs font-mono font-bold"
														style={{
															backgroundColor: cfg.badgeBg,
															borderColor: cfg.badgeBorder,
															color: cfg.badgeText,
														}}
													>
														{stageCount} {stageCount === 1 ? "план" : "планов"}
													</span>
												</div>
												<p className="text-xs text-[var(--muted)]">{cfg.hint}</p>
											</div>
										</div>

										<div className="text-right">
											<span className="text-xs text-[var(--muted)] block">Сумма этапа</span>
											<span className="text-base sm:text-lg font-bold font-mono text-[var(--teal,#0d9488)]">
												{formatRub(stageTotalRub)}
											</span>
										</div>
									</div>

									{/* Cards List */}
									<div className="p-4 space-y-3">
										{cards.length === 0 ? (
											<div className="p-12 text-center text-xs text-[var(--muted)] border border-dashed border-[var(--line)] rounded-xl bg-[var(--paper-soft)]/50">
												В статусе «{cfg.title}» сейчас нет активных планов лечения (перетащите карточку сюда для смены этапа)
											</div>
										) : (
											cards.map((card) => (
												<PipelineCardItem
													key={card.id}
													card={card}
													stageKey={selectedStage}
													viewMode="horizontal"
													copiedToken={copiedToken}
													isGeneratingLink={isGeneratingLink}
													onCopyOrGenerateLink={onCopyOrGenerateLink}
													onOpenPlan={onOpenPlan}
													onTransitionStage={onTransitionStage}
													onCreateRecallTask={onCreateRecallTask}
												/>
											))
										)}
									</div>
								</div>
							);
						})()
					) : (
						/* ALL STAGES SWIMLANES VIEW */
						<div className="space-y-2.5">
							{PIPELINE_STAGES.map((stageKey) => {
								const cfg = STAGE_CONFIG[stageKey];
								const cards = data.pipeline[stageKey] || [];
								const stageCount = cards.length;
								const stageTotalRub = cards.reduce((acc, c) => acc + c.netTotalRub, 0);

								return (
									<div
										key={stageKey}
										className="bg-[var(--paper)] border border-[var(--line)] rounded-2xl shadow-sm overflow-hidden"
										onDragOver={(e) => {
											e.preventDefault();
											e.dataTransfer.dropEffect = "move";
										}}
										onDrop={(e) => handleDrop(e, stageKey)}
									>
										{/* Swimlane Section Header */}
										<div
											className={`px-4 py-2.5 flex items-center justify-between gap-3 bg-[var(--paper-soft)]/40 ${
												cards.length > 0 ? "border-b border-[var(--line)]" : ""
											}`}
											style={{ borderLeft: `4px solid ${cfg.accentColor}` }}
										>
											<div className="flex items-center gap-2.5 min-w-0">
												<h3 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-[var(--text)]">
													{cfg.title}
												</h3>
												<span
													className="px-2 py-0.5 rounded-full text-xs font-mono font-bold shrink-0"
													style={{
														backgroundColor: cfg.badgeBg,
														borderColor: cfg.badgeBorder,
														color: cfg.badgeText,
													}}
												>
													{stageCount}
												</span>
												<span className="text-xs text-[var(--muted)] hidden sm:inline">
													• {cfg.hint}
												</span>
												{cards.length === 0 && (
													<span className="text-xs text-[var(--muted)] italic hidden md:inline ml-2">
														— перетащите карточку сюда для перевода в статус
													</span>
												)}
											</div>

											<div className="flex items-center gap-3 shrink-0">
												<span className="text-xs sm:text-sm font-semibold font-mono text-[var(--text)]">
													{formatRub(stageTotalRub)}
												</span>
												<button
													type="button"
													onClick={() => onSelectStage(stageKey)}
													className="h-8 px-3 rounded-lg border border-[var(--line)] bg-[var(--paper)] hover:bg-[var(--line-subtle)] text-xs font-medium text-[var(--muted)] hover:text-[var(--text)] transition flex items-center gap-1 shadow-xs"
													style={{
														padding: "0 12px",
														height: "30px",
														borderRadius: "8px",
													}}
													title={`Раскрыть только этап «${cfg.title}»`}
												>
													<span>Раскрыть</span>
													<ChevronRight className="w-3 h-3" />
												</button>
											</div>
										</div>

										{/* Swimlane Cards Container */}
										{cards.length > 0 && (
											<div className="p-3 space-y-2.5">
												{cards.map((card) => (
													<PipelineCardItem
														key={card.id}
														card={card}
														stageKey={stageKey}
														viewMode="horizontal"
														copiedToken={copiedToken}
														isGeneratingLink={isGeneratingLink}
														onCopyOrGenerateLink={onCopyOrGenerateLink}
														onOpenPlan={onOpenPlan}
														onTransitionStage={onTransitionStage}
														onCreateRecallTask={onCreateRecallTask}
													/>
												))}
											</div>
										)}
									</div>
								);
							})}
						</div>
					)
				) : (
					/* KANBAN COLUMNS VIEW (with min-w to prevent column squashing) */
					<div className="w-full overflow-x-auto pb-4">
						<div className="grid grid-cols-5 gap-3 min-w-[1280px] items-start">
							{PIPELINE_STAGES.map((stageKey) => {
								const cfg = STAGE_CONFIG[stageKey];
								const cards = data.pipeline[stageKey] || [];
								const stageCount = cards.length;
								const stageTotalRub = cards.reduce((acc, c) => acc + c.netTotalRub, 0);

								return (
									<div
										key={stageKey}
										className="w-full flex flex-col bg-[var(--paper)] border border-[var(--line)] rounded-2xl shadow-sm overflow-hidden"
										onDragOver={(e) => {
											e.preventDefault();
											e.dataTransfer.dropEffect = "move";
										}}
										onDrop={(e) => handleDrop(e, stageKey)}
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
										<div className="p-2.5 space-y-2.5 overflow-y-auto max-h-[calc(100vh-320px)] flex-1 min-h-[140px]">
											{cards.length === 0 ? (
												<div className="p-6 text-center text-xs text-[var(--muted)] border border-dashed border-[var(--line)] rounded-xl">
													Перетащите сюда карточку
												</div>
											) : (
												cards.map((card) => (
													<PipelineCardItem
														key={card.id}
														card={card}
														stageKey={stageKey}
														viewMode="kanban"
														copiedToken={copiedToken}
														isGeneratingLink={isGeneratingLink}
														onCopyOrGenerateLink={onCopyOrGenerateLink}
														onOpenPlan={onOpenPlan}
														onTransitionStage={onTransitionStage}
														onCreateRecallTask={onCreateRecallTask}
													/>
												))
											)}
										</div>
									</div>
								);
							})}
						</div>
					</div>
				)}
			</div>
		</>
	);
};
