import * as React from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import {
	AlertCircle,
	CheckCircle2,
	Columns,
	Filter,
	Layers,
	List,
	Plus,
	RefreshCw,
	Search,
	ShieldAlert,
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
import { TreatmentPlanPresenterModal } from "../../components/treatment-plans/TreatmentPlanPresenterModal";
import { isDemoShowcaseMode } from "../../lib/demoMode";
import { useDocumentBrandingStore } from "../../store/documentBrandingStore";
import { useOptionalAppLogicContext } from "../../contexts/AppLogicContext";

export type { PipelineStage, PipelineCard, PipelineResponse, PipelineStageFilter, PipelineViewMode };

export const TreatmentPipeline: React.FC = () => {
	const branding = useDocumentBrandingStore();
	const appLogic = useOptionalAppLogicContext();
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
	const [selectedCardForPresenter, setSelectedCardForPresenter] = useState<PipelineCard | null>(null);

	// Anti-dropout state
	const [isRunningDropout, setIsRunningDropout] = useState<boolean>(false);
	const [dropoutMessage, setDropoutMessage] = useState<string | null>(null);

	// Accumulated doctor options so filtering by doctor doesn't collapse the dropdown (Red Team Trap 3)
	const [accumulatedDoctors, setAccumulatedDoctors] = useState<Array<{ id: string; name: string }>>([]);

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

	// Track stable doctor list
	useEffect(() => {
		if (!data) return;
		const docMap = new Map<string, string>();

		const rawStaff = (appLogic?.dashboard?.clinicSettings?.staff as Array<{
			id: string;
			fullName?: string;
			name?: string;
			role?: string;
		}>) || [];
		for (const s of rawStaff) {
			docMap.set(s.id, s.fullName || s.name || "Врач");
		}

		for (const stage of Object.keys(data.pipeline) as PipelineStage[]) {
			for (const card of data.pipeline[stage]) {
				if (card.doctorId && card.doctorName) {
					docMap.set(card.doctorId, card.doctorName);
				}
			}
		}

		setAccumulatedDoctors((prev) => {
			for (const p of prev) {
				if (!docMap.has(p.id)) docMap.set(p.id, p.name);
			}
			return Array.from(docMap.entries()).map(([id, name]) => ({ id, name }));
		});
	}, [data, appLogic?.dashboard?.clinicSettings?.staff]);

	// Move card to another stage
	const handleTransitionStage = async (card: PipelineCard, targetStage: PipelineStage) => {
		try {
			const res = await fetch(`/api/v1/treatment-plans/${card.id}/transition-stage`, {
				method: "POST",
				headers: getDenteAuthHeaders({ "Content-Type": "application/json" }),
				body: JSON.stringify({ targetStage }),
			});
			if (!res.ok) {
				throw new Error("Не удалось переместить план лечения");
			}
			await fetchPipeline();
		} catch (err) {
			alert((err as Error).message || "Ошибка перемещения плана");
		}
	};

	// 1-Click Drop-out Prevention batch run
	const handleRunDropoutPrevention = async () => {
		try {
			setIsRunningDropout(true);
			const res = await fetch("/api/v1/treatment-plans/dropout-prevention/run", {
				method: "POST",
				headers: getDenteAuthHeaders({ "Content-Type": "application/json" }),
				body: JSON.stringify({ minDays: 14 }),
			});
			if (!res.ok) {
				throw new Error("Не удалось выполнить контроль отвала");
			}
			const json = await res.json();
			const created = json.data?.tasksCreated ?? 0;
			const atRisk = json.data?.dropoutRiskCount ?? 0;
			setDropoutMessage(
				`Контроль отвала завершен: ${atRisk} пациентов в зоне риска (без записи >14д), сформировано ${created} новых задач на звонок куратора.`,
			);
			setTimeout(() => setDropoutMessage(null), 7000);
			await fetchPipeline();
		} catch (err) {
			alert((err as Error).message || "Ошибка контроля отвала");
		} finally {
			setIsRunningDropout(false);
		}
	};

	// 1-Click single card recall task
	const handleCreatePlanRecall = async (card: PipelineCard) => {
		try {
			const res = await fetch(`/api/v1/treatment-plans/${card.id}/create-dropout-recall`, {
				method: "POST",
				headers: getDenteAuthHeaders({ "Content-Type": "application/json" }),
				body: JSON.stringify({ notes: `Создано куратором из воронки планов лечения.` }),
			});
			if (!res.ok) {
				throw new Error("Не удалось создать задачу на звонок");
			}
			await fetchPipeline();
		} catch (err) {
			alert((err as Error).message || "Ошибка создания задачи на звонок");
		}
	};

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

	const clinicName = branding.clinicName || appLogic?.dashboard?.organization?.name || "";
	const clinicLegalName = branding.clinicLegalName || appLogic?.dashboard?.organization?.legalName || clinicName;
	const clinicInn = branding.clinicInn || appLogic?.dashboard?.organization?.inn || "";
	const clinicOgrn = branding.clinicOgrn || appLogic?.dashboard?.organization?.ogrn || "";
	const clinicAddress = branding.clinicAddress || appLogic?.dashboard?.organization?.address || "";
	const areRequisitesMissing = !clinicInn || !clinicOgrn || !clinicAddress;

	const [presenterDoctorOverride, setPresenterDoctorOverride] = useState<string>("");

	const effectiveDoctorName = useMemo(() => {
		if (presenterDoctorOverride) return presenterDoctorOverride;
		if (selectedCardForPresenter?.doctorName) return selectedCardForPresenter.doctorName;
		if (appLogic?.dashboard?.activeDoctor?.fullName) return appLogic.dashboard.activeDoctor.fullName;
		return "Врач не назначен";
	}, [presenterDoctorOverride, selectedCardForPresenter?.doctorName, appLogic?.dashboard?.activeDoctor?.fullName]);

	const dropoutRiskCount = data?.summary.analytics?.dropoutRiskCount ?? 0;

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
						Оперативный контроль смет, возвращаемости и защита от отвала пациентов
					</p>
				</div>

				<div className="flex items-center gap-2 shrink-0">
					{/* Drop-out prevention button */}
					<button
						type="button"
						onClick={handleRunDropoutPrevention}
						disabled={isRunningDropout || isLoading}
						className={`h-9 min-h-[36px] px-3 rounded-xl border text-xs font-semibold transition flex items-center gap-1.5 shadow-xs cursor-pointer ${
							dropoutRiskCount > 0
								? "bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-500/40"
								: "bg-[var(--paper)] hover:bg-[var(--line-subtle)] text-[var(--text)] border-[var(--line)]"
						}`}
						title="Проверить зависшие планы (>14 дней без записи) и создать задачи на звонок куратора"
					>
						<ShieldAlert className={`w-3.5 h-3.5 ${isRunningDropout ? "animate-spin text-amber-500" : "text-amber-500"}`} />
						<span className="hidden sm:inline">Анти-отвал (14–21д)</span>
						{dropoutRiskCount > 0 && (
							<span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-amber-500 text-white font-bold leading-none">
								{dropoutRiskCount}
							</span>
						)}
					</button>

					{/* Create new plan button */}
					<a
						href="#/patients"
						className="primary-button h-9 min-h-[36px] px-3.5 rounded-xl text-xs font-semibold transition hidden sm:flex items-center gap-1.5 shadow-sm cursor-pointer"
						style={{ borderRadius: "10px" }}
						title="Перейти к пациентам для составления нового плана"
					>
						<Plus className="w-3.5 h-3.5" />
						<span>Новый план</span>
					</a>

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

					{/* Refresh Button */}
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

			{/* Dropout Banner Alert */}
			{dropoutMessage && (
				<div className="p-3 bg-amber-500/15 border border-amber-500/30 rounded-2xl flex items-center justify-between gap-3 text-xs text-amber-800 dark:text-amber-200">
					<div className="flex items-center gap-2">
						<CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
						<span className="font-medium">{dropoutMessage}</span>
					</div>
					<button
						type="button"
						onClick={() => setDropoutMessage(null)}
						className="text-[var(--muted)] hover:text-[var(--text)] transition"
					>
						<X className="w-4 h-4" />
					</button>
				</div>
			)}

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
				{/* Search Field */}
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
							{accumulatedDoctors.map((doc) => (
								<option key={doc.id} value={doc.id}>
									{doc.name}
								</option>
							))}
						</select>
						<Filter className="w-3.5 h-3.5 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-[var(--muted)]" />
					</div>
				</div>
			</div>

			{/* Apple HIG Mobile Stage Selector */}
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
										: "bg-transparent text-[var(--muted)] hover:bg-[var(--paper-hover)]/30 hover:text-[var(--ink)] border border-transparent"
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
							onOpenPlan={(card) => setSelectedCardForPresenter(card)}
							onTransitionStage={handleTransitionStage}
							onCreateRecallTask={handleCreatePlanRecall}
							onCreateNewPlan={() => {
								if (typeof window !== "undefined") {
									window.location.hash = "#/patients";
								}
							}}
						/>
					</div>
				)
			)}

			{/* Floating Bottom Bar in Natural Thumb Zone for Mobile */}
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

								<div className="flex items-center gap-1.5">
									{dropoutRiskCount > 0 && (
										<button
											type="button"
											onClick={handleRunDropoutPrevention}
											disabled={isRunningDropout}
											className="min-h-[44px] h-11 px-3 rounded-xl border border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300 font-bold text-xs flex items-center gap-1 touch-manipulation cursor-pointer"
										>
											<ShieldAlert className="w-3.5 h-3.5 text-amber-500" />
											<span>{dropoutRiskCount}</span>
										</button>
									)}

									<button
										type="button"
										onClick={fetchPipeline}
										disabled={isLoading}
										className="primary-button min-h-[44px] h-11 px-4 font-bold text-xs shadow-sm active:scale-98 flex items-center justify-center gap-1.5 cursor-pointer shrink-0 transition-all touch-manipulation"
										data-testid="pipeline-mobile-refresh-btn"
									>
										<RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
										<span>Обновить</span>
									</button>
								</div>
							</div>,
							document.body,
						)
					: null)}

			{selectedCardForPresenter && (
				<>
					{(areRequisitesMissing || (!selectedCardForPresenter.doctorName && !presenterDoctorOverride)) && (
						<div
							className="fixed top-2 left-1/2 -translate-x-1/2 z-[10000] max-w-xl w-[92vw] flex flex-col gap-1.5 p-2.5 rounded-xl bg-[var(--paper-strong,var(--paper,#ffffff))] border border-amber-500/40 shadow-2xl text-xs text-[var(--ink,#0f172a)] backdrop-blur-md"
							data-testid="pipeline-presenter-warning-bar"
						>
							{areRequisitesMissing && (
								<div className="flex items-center gap-1.5 text-amber-700 dark:text-amber-300 font-semibold">
									<AlertCircle className="w-4 h-4 shrink-0 text-amber-600" />
									<span>⚠️ Реквизиты клиники не заполнены в профиле организации (Настройки -&gt; Клиника)</span>
								</div>
							)}
							{(!selectedCardForPresenter.doctorName && !presenterDoctorOverride) && (
								<div className="flex items-center justify-between gap-2 flex-wrap">
									<span className="text-amber-800 dark:text-amber-200 font-medium">
										Врач не назначен для данного плана:
									</span>
									<select
										value={presenterDoctorOverride}
										onChange={(e) => setPresenterDoctorOverride(e.target.value)}
										className="h-7 px-2 text-xs rounded-md border border-[var(--line,#cbd5e1)] bg-[var(--paper-soft,#f8fafc)] text-[var(--ink,#0f172a)] cursor-pointer"
										data-testid="pipeline-doctor-assign-select"
									>
										<option value="">-- Выбрать врача из персонала --</option>
										{accumulatedDoctors.map((doc) => (
											<option key={doc.id} value={doc.name}>
												{doc.name}
											</option>
										))}
									</select>
								</div>
							)}
						</div>
					)}

					<TreatmentPlanPresenterModal
						isOpen={Boolean(selectedCardForPresenter)}
						onClose={() => {
							setSelectedCardForPresenter(null);
							setPresenterDoctorOverride("");
						}}
						patientName={selectedCardForPresenter.patientName}
						patientId={selectedCardForPresenter.patientId}
						patientPhone={selectedCardForPresenter.patientPhone || ""}
						doctorFullName={effectiveDoctorName}
						doctorSpecialty={appLogic?.dashboard?.activeDoctor?.specialty || ""}
						clinicName={clinicName}
						clinicLegalName={clinicLegalName}
						clinicInn={clinicInn}
						clinicOgrn={clinicOgrn}
						clinicAddress={clinicAddress}
						planId={selectedCardForPresenter.id}
						planCreatedAtIso={selectedCardForPresenter.createdAt}
						onConfirmSelection={async () => {
							await fetchPipeline();
						}}
						onApproveAndSign={async () => {
							await fetchPipeline();
						}}
						isDemoMode={isDemoShowcaseMode()}
					/>
				</>
			)}
		</div>
	);
};

export default TreatmentPipeline;
