import { useCallback, useEffect, useMemo, useState } from "react";
import { getDenteAuthHeaders } from "../../../lib/denteRequestHeaders";
import { useOptionalAppLogicContext } from "../../../contexts/AppLogicContext";
import type {
	PipelineCard,
	PipelineResponse,
	PipelineStage,
	PipelineStageFilter,
	PipelineViewMode,
} from "./types";

export interface UseTreatmentPipelineStateReturn {
	data: PipelineResponse | null;
	isLoading: boolean;
	error: string | null;
	selectedStage: PipelineStageFilter;
	setSelectedStage: (stage: PipelineStageFilter) => void;
	viewMode: PipelineViewMode;
	setViewMode: (mode: PipelineViewMode) => void;
	searchQuery: string;
	setSearchQuery: (query: string) => void;
	selectedDoctorId: string;
	setSelectedDoctorId: (doctorId: string) => void;
	activeMobileStage: PipelineStage;
	setActiveMobileStage: (stage: PipelineStage) => void;
	copiedToken: string | null;
	isGeneratingLink: string | null;
	selectedCardForPresenter: PipelineCard | null;
	setSelectedCardForPresenter: (card: PipelineCard | null) => void;
	isRunningDropout: boolean;
	dropoutMessage: string | null;
	setDropoutMessage: (msg: string | null) => void;
	accumulatedDoctors: Array<{ id: string; name: string }>;
	fetchPipeline: () => Promise<void>;
	handleTransitionStage: (card: PipelineCard, targetStage: PipelineStage) => Promise<void>;
	handleRunDropoutPrevention: () => Promise<void>;
	handleCreatePlanRecall: (card: PipelineCard) => Promise<void>;
	handleCopyOrGenerateLink: (card: PipelineCard) => Promise<void>;
}

export function useTreatmentPipelineState(): UseTreatmentPipelineStateReturn {
	const appLogic = useOptionalAppLogicContext();
	const [data, setData] = useState<PipelineResponse | null>(null);
	const [isLoading, setIsLoading] = useState<boolean>(true);
	const [error, setError] = useState<string | null>(null);

	// Filters and Modes
	const [selectedStage, setSelectedStage] = useState<PipelineStageFilter>("all");
	const [viewMode, setViewMode] = useState<PipelineViewMode>("horizontal");
	const [searchQuery, setSearchQuery] = useState<string>("");
	const [debouncedSearch, setDebouncedSearch] = useState<string>("");
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

	// Debounce search query to prevent aggressive API flooding while typing
	useEffect(() => {
		const timer = setTimeout(() => {
			setDebouncedSearch(searchQuery);
		}, 300);
		return () => clearTimeout(timer);
	}, [searchQuery]);

	const fetchPipeline = useCallback(async () => {
		try {
			setIsLoading(true);
			setError(null);

			const params = new URLSearchParams();
			if (debouncedSearch.trim()) params.set("search", debouncedSearch.trim());
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
	}, [debouncedSearch, selectedDoctorId]);

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

	// Track stable doctor list without collapsing on filter
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
			for (const card of data.pipeline[stage] || []) {
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
				body: JSON.stringify({ notes: "Создано куратором из воронки планов лечения." }),
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

	return {
		data,
		isLoading,
		error,
		selectedStage,
		setSelectedStage,
		viewMode,
		setViewMode,
		searchQuery,
		setSearchQuery,
		selectedDoctorId,
		setSelectedDoctorId,
		activeMobileStage,
		setActiveMobileStage,
		copiedToken,
		isGeneratingLink,
		selectedCardForPresenter,
		setSelectedCardForPresenter,
		isRunningDropout,
		dropoutMessage,
		setDropoutMessage,
		accumulatedDoctors,
		fetchPipeline,
		handleTransitionStage,
		handleRunDropoutPrevention,
		handleCreatePlanRecall,
		handleCopyOrGenerateLink,
	};
}
