import * as React from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import {
	AlertCircle,
	Columns,
	Filter,
	Layers,
	List,
	RefreshCw,
	Search,
	X,
} from "lucide-react";
import { getDenteAuthHeaders } from "../../lib/denteRequestHeaders";
import {
	type PipelineCard,
	type PipelineResponse,
	type PipelineStage,
	type PipelineStageFilter,
	type PipelineViewMode,
	formatRub,
	PIPELINE_STAGES,
	STAGE_CONFIG,
} from "./pipeline/types";
import { PipelineKpiSummary } from "./pipeline/PipelineKpiSummary";
import { PipelineBoard } from "./pipeline/PipelineBoard";

export type { PipelineStage, PipelineCard, PipelineResponse, PipelineStageFilter, PipelineViewMode };

export const TreatmentPipeline: React.FC = () => {
	const [data, setData] = useState<PipelineResponse | null>(null);
	const [isLoading, setIsLoading] = useState<boolean>(true);
	const [error, setError] = useState<string | null>(null);

	// Filters and Modes
	const [selectedStage, setSelectedStage] = useState<PipelineStageFilter>("all");
	const [viewMode, setViewMode] = useState<PipelineViewMode>("horizontal");
	const [searchQuery, setSearchQuery] = useState<string>("");
	const [selectedDoctorId, setSelectedDoctorId] = useState<string>("all");
	const [activeMobileStage, setActiveMobileStage] = useState<PipelineStage>("requires_budget");
	const [copiedToken, setCopiedToken] = useState<string | null>(null);
	const [isGeneratingLink, setIsGeneratingLink] = useState<string | null>(null);

	const fetchPipeline = useCallback(async () => {
		try {
			setIsLoading(true);
			setError(null);

			const params = new URLSearchParams();
			if (searchQuery.trim()) params.set("search", searchQuery.trim());
			if (selectedDoctorId !== "all") params.set("doctorId", selectedDoctorId);

			const res = await fetch(`/api/v1/treatment-plans/pipeline?${params.toString()}`, {
				headers: getDenteAuthHeaders(),
			});
			if (!res.ok) {
				throw new Error("Не удалось загрузить воронку планов лечения");
			}

			const json: PipelineResponse = await res.json();
			setData(json);
		} catch (err) {
			setError((err as Error).message || "Ошибка загрузки данных");
		} finally {
			setIsLoading(false);
		}
	}, [searchQuery, selectedDoctorId]);

	useEffect(() => {
		fetchPipeline();
	}, [fetchPipeline]);

	// Auto-refresh when window regains focus to keep pipeline hydrated with remote signs
	useEffect(() => {
		const handleFocus = () => {
			fetchPipeline();
		};
		window.addEventListener("focus", handleFocus);
		return () => {
			window.removeEventListener("focus", handleFocus);
		};
	}, [fetchPipeline]);

	// Extract unique doctors for filtering
	const doctorOptions = useMemo(() => {
		if (!data) return [];
		const docMap = new Map<string, string>();
		for (const stage of Object.keys(data.pipeline) as PipelineStage[]) {
			for (const card of data.pipeline[stage]) {
				if (card.doctorId && card.doctorName) {
					docMap.set(card.doctorId, card.doctorName);
				}
			}
		}
		return Array.from(docMap.entries()).map(([id, name]) => ({ id, name }));
	}, [data]);

	// Create or copy budget link
	const handleCopyOrGenerateLink = async (card: PipelineCard) => {
		try {
			let token = card.budgetToken;

			if (!token) {
				setIsGeneratingLink(card.id);
				const res = await fetch(`/api/v1/treatment-plans/${card.id}/create-budget-link`, {
					method: "POST",
					headers: getDenteAuthHeaders({ "Content-Type": "application/json" }),
					body: JSON.stringify({}),
				});
				if (!res.ok) {
					throw new Error("Не удалось создать ссылку на смету");
				}
				const created = await res.json();
				token = created.token;
				card.budgetToken = token;
			}

			if (token) {
				const fullUrl = `${window.location.origin}/public/budget/${token}`;
				await navigator.clipboard.writeText(fullUrl);
				setCopiedToken(card.id);
				setTimeout(() => setCopiedToken(null), 3000);
			}
		} catch (err) {
			alert((err as Error).message || "Ошибка создания ссылки");
		} finally {
			setIsGeneratingLink(null);
		}
	};

	return (
		<div className="w-full min-h-screen flex flex-col p-2.5 sm:p-4 space-y-4 overflow-x-hidden bg-[var(--bg)] text-[var(--text)] pb-4 md:pb-6">
			{/* Top Header & View Mode Switcher / Refresh: Strictly 1 Row */}
			<div className="flex items-center justify-between gap-3 pb-2.5 sm:pb-3 border-b border-[var(--line)]">
				<div className="space-y-0.5 min-w-0">
					<div className="flex items-center gap-2">
						<Layers className="w-5 h-5 sm:w-6 sm:h-6 text-[var(--teal,#0d9488)] shrink-0" />
						<h1 className="text-base sm:text-xl font-bold tracking-tight truncate">
							Воронка планов лечения
						</h1>
					</div>
					<p className="text-xs text-[var(--muted)] hidden sm:block">
						Оперативный контроль смет, возвращаемости и отсутствия потерянных пациентов
					</p>
				</div>

				<div className="flex items-center gap-2 shrink-0">
					{/* Desktop View Mode Switcher (Horizontal Swimlanes vs Kanban Columns) */}
					<div className="hidden md:flex items-center gap-1 p-1 rounded-xl border border-[var(--line)] bg-[var(--paper-soft)] shadow-xs">
						<button
							type="button"
							onClick={() => setViewMode("horizontal")}
							className="h-8 px-3.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer shadow-xs"
							style={{
								backgroundColor: viewMode === "horizontal" ? "var(--teal, #0d9488)" : "transparent",
								color: viewMode === "horizontal" ? "#ffffff" : "var(--muted)",
								padding: "0 14px",
								height: "32px",
								borderRadius: "8px",
							}}
							title="Горизонтальный режим дорожек (просторные карточки)"
						>
							<List className="w-3.5 h-3.5 shrink-0" />
							<span>Горизонтальный</span>
						</button>
						<button
							type="button"
							onClick={() => setViewMode("kanban")}
							className="h-8 px-3.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer shadow-xs"
							style={{
								backgroundColor: viewMode === "kanban" ? "var(--teal, #0d9488)" : "transparent",
								color: viewMode === "kanban" ? "#ffffff" : "var(--muted)",
								padding: "0 14px",
								height: "32px",
								borderRadius: "8px",
							}}
							title="Режим колонок (Канбан)"
						>
							<Columns className="w-3.5 h-3.5 shrink-0" />
							<span>Колонки</span>
						</button>
					</div>

					{/* Refresh Button (Desktop only — on mobile it lives in the Floating Bottom Bar) */}
					<button
						type="button"
						onClick={fetchPipeline}
						disabled={isLoading}
						aria-label="Обновить воронку"
						title="Обновить воронку"
						className="hidden md:flex h-9 min-h-[36px] px-3.5 rounded-xl border border-[var(--line)] bg-[var(--paper)] hover:bg-[var(--line-subtle)] text-xs font-medium transition items-center gap-1.5 shadow-sm"
						style={{
							padding: "0 14px",
							height: "36px",
							borderRadius: "10px",
						}}
					>
						<RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
						<span className="hidden sm:inline">Обновить</span>
					</button>
				</div>
			</div>

			{/* KPI Summary & Interactive Stage Selector */}
			{data && (
				<PipelineKpiSummary
					data={data}
					selectedStage={selectedStage}
					onSelectStage={setSelectedStage}
				/>
			)}

			{/* Filter & Search Bar */}
			<div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-2.5 sm:p-3 bg-[var(--paper)] border border-[var(--line)] rounded-2xl shadow-sm">
				{/* Search Field with strict paddingLeft 38px against icon overlap */}
				<div className="relative flex-1 max-w-md dente-search-wrap">
					<Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--muted)] pointer-events-none" />
					<input
						type="text"
						value={searchQuery}
						onChange={(e) => setSearchQuery(e.target.value)}
						placeholder="Поиск по пациенту, телефону или плану..."
						style={{ paddingLeft: "38px" }}
						className="w-full h-9 sm:h-[38px] min-h-[36px] pr-4 text-xs rounded-xl border border-[var(--line)] bg-[var(--bg)] text-[var(--text)] focus:border-[var(--teal,#0d9488)] outline-none transition pipeline-search-input"
					/>
				</div>

				<div className="flex items-center gap-2">
					{/* Active stage filter reset pill */}
					{selectedStage !== "all" && (
						<button
							type="button"
							onClick={() => setSelectedStage("all")}
							className="h-9 sm:h-[38px] min-h-[36px] px-3 rounded-xl bg-[var(--teal-subtle,#0d948815)] text-[var(--teal,#0d9488)] border border-[var(--teal,#0d9488)]/30 text-xs font-medium flex items-center gap-1.5 transition hover:bg-[var(--teal,#0d9488)]/20 shadow-xs"
							title="Сбросить фильтр этапа"
						>
							<span>Этап: {STAGE_CONFIG[selectedStage].title}</span>
							<X className="w-3.5 h-3.5" />
						</button>
					)}

					<div className="relative w-full sm:w-auto">
						<select
							value={selectedDoctorId}
							onChange={(e) => setSelectedDoctorId(e.target.value)}
							className="w-full sm:w-auto h-9 sm:h-[38px] min-h-[36px] px-3 pr-8 rounded-xl border border-[var(--line)] bg-[var(--bg)] text-xs text-[var(--text)] font-medium outline-none focus:border-[var(--teal,#0d9488)] transition appearance-none cursor-pointer"
						>
							<option value="all">Все лечащие врачи</option>
							{doctorOptions.map((doc) => (
								<option key={doc.id} value={doc.id}>
									{doc.name}
								</option>
							))}
						</select>
						<Filter className="w-3.5 h-3.5 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-[var(--muted)]" />
					</div>
				</div>
			</div>

			{/* Apple HIG Mobile Stage Selector (5-Column Segmented Bar — Zero Horizontal Scroll & Zero Clipping) */}
			<div className="md:hidden">
				<div className="grid grid-cols-5 gap-1 p-1 bg-[var(--paper-soft)] rounded-xl border border-[var(--line-subtle)]">
					{PIPELINE_STAGES.map((stg) => {
						const cfg = STAGE_CONFIG[stg];
						const count = data?.summary.counts[stg] || 0;
						const isActive = activeMobileStage === stg;
						return (
							<button
								key={stg}
								type="button"
								onClick={() => {
									setActiveMobileStage(stg);
									setSelectedStage(stg);
								}}
								className={`min-h-[48px] px-1 py-1 rounded-lg text-[10px] font-semibold transition flex flex-col items-center justify-center gap-0.5 touch-manipulation ${
									isActive
										? "bg-[var(--paper)] text-[var(--ink)] shadow-sm border border-[var(--line)]"
										: "text-[var(--muted)] hover:text-[var(--ink)]"
								}`}
								style={isActive ? { borderBottom: `2.5px solid ${cfg.accentColor}` } : undefined}
							>
								<span
									className="px-1.5 py-0.5 rounded-full text-[10px] font-mono font-bold leading-none"
									style={{
										backgroundColor: cfg.badgeBg,
										color: cfg.badgeText,
									}}
								>
									{count}
								</span>
								<span className="leading-tight whitespace-nowrap">{cfg.shortTitle}</span>
							</button>
						);
					})}
				</div>
			</div>

			{/* Board Content */}
			{error ? (
				<div className="p-6 bg-rose-500/10 border border-rose-500/20 rounded-2xl text-center space-y-2">
					<AlertCircle className="w-8 h-8 text-rose-500 mx-auto" />
					<h3 className="text-sm font-semibold text-rose-500">Ошибка загрузки воронки</h3>
					<p className="text-xs text-[var(--muted)]">{error}</p>
				</div>
			) : (
				data && (
					<div className="pb-20 md:pb-0">
						<PipelineBoard
							data={data}
							selectedStage={selectedStage}
							onSelectStage={setSelectedStage}
							viewMode={viewMode}
							activeMobileStage={activeMobileStage}
							copiedToken={copiedToken}
							isGeneratingLink={isGeneratingLink}
							onCopyOrGenerateLink={handleCopyOrGenerateLink}
						/>
					</div>
				)
			)}

			{/* Floating Bottom Bar in Natural Thumb Zone for Mobile (<= 768px / md:hidden) */}
			{data &&
				(typeof document !== "undefined" && document.body
					? createPortal(
							<div
								className="md:hidden fixed left-0 right-0 z-[9990] px-3.5 py-2 backdrop-blur-xl shadow-lg flex items-center justify-between gap-3"
								style={{
									bottom: "calc(56px + env(safe-area-inset-bottom, 0px))",
									backgroundColor: "var(--paper)",
									borderTop: "1px solid var(--line)",
								}}
								data-testid="pipeline-mobile-floating-thumb-bar"
							>
								<div className="flex flex-col min-w-0 flex-1">
									<div className="flex items-center gap-1.5 text-[11px] text-[var(--muted)] font-medium truncate">
										<span
											className="w-2 h-2 rounded-full shrink-0"
											style={{ backgroundColor: STAGE_CONFIG[activeMobileStage]?.accentColor || "var(--teal, #0d9488)" }}
										/>
										<span className="truncate font-bold text-[var(--text)]">{STAGE_CONFIG[activeMobileStage]?.title || "Воронка"}</span>
										<span className="text-[10px] text-[var(--muted)] font-mono shrink-0">
											({data.pipeline[activeMobileStage]?.length || 0} пл.)
										</span>
									</div>
									<div
										className="text-sm font-extrabold font-mono whitespace-nowrap"
										style={{ color: "var(--teal, #0d9488)" }}
									>
										{formatRub(data.pipeline[activeMobileStage]?.reduce((acc, c) => acc + c.netTotalRub, 0) || 0)}
									</div>
								</div>

								<button
									type="button"
									onClick={fetchPipeline}
									disabled={isLoading}
									className="min-h-[44px] h-11 px-4 rounded-xl font-bold text-xs shadow-sm active:scale-98 flex items-center justify-center gap-1.5 cursor-pointer shrink-0 transition-all touch-manipulation"
									style={{
										backgroundColor: "var(--teal, #0d9488)",
										color: "#ffffff",
										borderRadius: "10px",
										border: "none",
										padding: "0 16px",
										height: "44px",
									}}
									data-testid="pipeline-mobile-refresh-btn"
								>
									<RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
									<span>Обновить</span>
								</button>
							</div>,
							document.body,
						)
					: null)}
		</div>
	);
};

export default TreatmentPipeline;
