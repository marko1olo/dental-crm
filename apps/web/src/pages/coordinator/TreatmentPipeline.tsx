import * as React from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
	AlertCircle,
	Filter,
	Layers,
	RefreshCw,
	Search,
} from "lucide-react";
import { getDenteAuthHeaders } from "../../lib/denteRequestHeaders";
import {
	type PipelineCard,
	type PipelineResponse,
	type PipelineStage,
	PIPELINE_STAGES,
	STAGE_CONFIG,
} from "./pipeline/types";
import { PipelineKpiSummary } from "./pipeline/PipelineKpiSummary";
import { PipelineBoard } from "./pipeline/PipelineBoard";

export type { PipelineStage, PipelineCard, PipelineResponse };

export const TreatmentPipeline: React.FC = () => {
	const [data, setData] = useState<PipelineResponse | null>(null);
	const [isLoading, setIsLoading] = useState<boolean>(true);
	const [error, setError] = useState<string | null>(null);

	// Filters
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
		<div className="w-full h-full flex flex-col p-2.5 sm:p-4 space-y-4 overflow-x-hidden bg-[var(--bg)] text-[var(--text)]">
			{/* Top Header & Refresh Action */}
			<div className="flex items-center justify-between gap-2 pb-2.5 sm:pb-3 border-b border-[var(--line)]">
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
					<button
						type="button"
						onClick={fetchPipeline}
						disabled={isLoading}
						aria-label="Обновить воронку"
						title="Обновить воронку"
						className="min-h-[36px] sm:min-h-[34px] px-2.5 sm:px-3.5 py-1.5 rounded-xl border border-[var(--line)] bg-[var(--paper)] hover:bg-[var(--line-subtle)] text-xs font-medium transition flex items-center gap-1.5 shadow-sm"
					>
						<RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
						<span className="hidden sm:inline">Обновить</span>
					</button>
				</div>
			</div>

			{/* KPI Summary Cards */}
			{data && <PipelineKpiSummary data={data} />}

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
						className="w-full min-h-[42px] sm:min-h-[38px] pr-4 text-xs rounded-xl border border-[var(--line)] bg-[var(--bg)] text-[var(--text)] focus:border-[var(--teal,#0d9488)] outline-none transition pipeline-search-input"
					/>
				</div>

				<div className="flex items-center gap-2">
					<div className="relative w-full sm:w-auto">
						<select
							value={selectedDoctorId}
							onChange={(e) => setSelectedDoctorId(e.target.value)}
							className="w-full sm:w-auto min-h-[42px] sm:min-h-[38px] px-3 pr-8 rounded-xl border border-[var(--line)] bg-[var(--bg)] text-xs text-[var(--text)] font-medium outline-none focus:border-[var(--teal,#0d9488)] transition appearance-none cursor-pointer"
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

			{/* Apple HIG Mobile Stage Selector (Segmented Chips Strip with smooth overflow) */}
			<div className="relative md:hidden">
				<div className="flex items-center gap-1 p-1 bg-[var(--paper-soft)] rounded-xl border border-[var(--line-subtle)] overflow-x-auto no-scrollbar scroll-smooth">
					{PIPELINE_STAGES.map((stg) => {
						const cfg = STAGE_CONFIG[stg];
						const count = data?.summary.counts[stg] || 0;
						const isActive = activeMobileStage === stg;
						return (
							<button
								key={stg}
								type="button"
								onClick={() => setActiveMobileStage(stg)}
								className={`min-h-[44px] px-2.5 py-1.5 rounded-lg text-[11px] font-semibold whitespace-nowrap transition flex items-center gap-1 shrink-0 ${
									isActive
										? "bg-[var(--paper)] text-[var(--ink)] shadow-sm border border-[var(--line)]"
										: "text-[var(--muted)] hover:text-[var(--ink)]"
								}`}
								style={isActive ? { borderLeft: `3px solid ${cfg.accentColor}` } : undefined}
							>
								<span className="whitespace-nowrap">{cfg.shortTitle}</span>
								<span
									className="px-1.5 py-0.5 rounded-full text-[10px] font-mono font-bold shrink-0"
									style={{
										backgroundColor: cfg.badgeBg,
										color: cfg.badgeText,
									}}
								>
									{count}
								</span>
							</button>
						);
					})}
				</div>
				{/* Right fade gradient indicator to guide user that stages scroll horizontally */}
				<div className="pointer-events-none absolute right-0 top-0 bottom-0 w-6 rounded-r-xl bg-gradient-to-l from-[var(--paper-soft)] to-transparent" />
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
					<PipelineBoard
						data={data}
						activeMobileStage={activeMobileStage}
						copiedToken={copiedToken}
						isGeneratingLink={isGeneratingLink}
						onCopyOrGenerateLink={handleCopyOrGenerateLink}
					/>
				)
			)}
		</div>
	);
};

export default TreatmentPipeline;
