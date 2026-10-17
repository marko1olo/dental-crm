/**
 * apps/web/src/components/odontogram/useOdontogramSync.ts
 * DENTE Dental CRM — Reactive Odontogram Sync Hook & Facade (<= 250 lines).
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { useWebsocket } from "../../hooks/useWebsocket";
import { isDemoPatientId, isDemoShowcaseMode } from "../../lib/demoMode";
import { actionFailureToast } from "../../lib/panelStateText";
import { showToast } from "../GlobalToast";
import { logger } from "../../utils/logger";
import {
	PEDIATRIC_TOP_TEETH,
	PEDIATRIC_BOTTOM_TEETH,
	createDefaultAdultTeethData,
	type ToothData,
	type ToothState,
} from "./ToothChart";
import { getInitialShowcaseTeeth } from "./odontogramModuleConstants";
import {
	applyUpdatedStatesToTeeth,
	loadTeethFromLocalCache,
	mergeTeethWithLocalCache,
	persistTeethLocally,
} from "./syncModules/odontogramIndexedDbSync";
import {
	fetchToothStatesFromServer,
	sendToothStatesBatch,
} from "./syncModules/odontogramApiBatchSync";
import { attachOdontogramEventListeners } from "./syncModules/odontogramEventListeners";

export interface UseOdontogramSyncProps {
	patientId: string;
	pediatricMode?: boolean | undefined;
	setAiPendingProposal?: React.Dispatch<
		React.SetStateAction<{
			source: "voice" | "vision" | "sensor";
			title: string;
			findings: Array<{ toothNumber: number; state: ToothState; surfaces?: string[] }>;
		} | null>
	> | undefined;
	onClearMenu?: () => void;
}

function buildBaselineTeeth(patientId: string, pediatricMode?: boolean): ToothData[] {
	if (isDemoShowcaseMode() || isDemoPatientId(patientId)) {
		return getInitialShowcaseTeeth(pediatricMode);
	}
	return pediatricMode
		? [...PEDIATRIC_TOP_TEETH, ...PEDIATRIC_BOTTOM_TEETH].map((num) => ({
				toothNumber: num,
				state: "Healthy" as ToothState,
			}))
		: createDefaultAdultTeethData();
}

export function useOdontogramSync({
	patientId,
	pediatricMode,
	setAiPendingProposal,
	onClearMenu,
}: UseOdontogramSyncProps) {
	const currentPatientIdRef = useRef<string>(patientId);
	const onClearMenuRef = useRef(onClearMenu);
	onClearMenuRef.current = onClearMenu;

	const [teethData, setTeethData] = useState<ToothData[]>(() => {
		if (patientId) {
			const cached = loadTeethFromLocalCache(patientId);
			if (cached && cached.length > 0) return cached;
		}
		return buildBaselineTeeth(patientId, pediatricMode);
	});

	const [teethLoad, setTeethLoad] = useState<
		| { phase: "loading" }
		| { phase: "ready" }
		| { phase: "failed"; status: number | null }
	>({ phase: "loading" });

	const [teethReloadToken, setTeethReloadToken] = useState(0);
	const teethDataRef = useRef<ToothData[]>([]);
	teethDataRef.current = teethData;

	const [selectedTeeth, setSelectedTeeth] = useState<number[]>([]);
	const [activeSurfaces, setActiveSurfaces] = useState<string[]>([]);
	const activeSurfacesRef = useRef(activeSurfaces);
	activeSurfacesRef.current = activeSurfaces;

	const [isMultiSelectMode, setIsMultiSelectMode] = useState(false);
	const [lastSavedAt, setLastSavedAt] = useState<string>(() =>
		new Date().toLocaleTimeString("ru-RU"),
	);

	const { lastMessage } = useWebsocket(
		import.meta.env.VITE_WS_URL ?? "ws://localhost:4100/api/ws/schedule",
	);

	useEffect(() => {
		if (lastMessage?.type !== "UPDATE_ODONTOGRAM") return;
		const payload = lastMessage.payload as { patientId?: string; states?: ToothData[] } | undefined;
		if (!payload || payload.patientId !== patientId) return;
		const incoming = Array.isArray(payload.states) ? payload.states : [];
		if (!incoming.length) return;

		setTeethData((prev) => {
			const merged = [...prev];
			for (const tooth of incoming) {
				const idx = merged.findIndex((x) => x.toothNumber === tooth.toothNumber);
				if (idx > -1) merged[idx] = tooth;
				else merged.push(tooth);
			}
			return merged;
		});
	}, [lastMessage, patientId]);

	const updateToothState = useCallback(
		async (toothNumbers: number[], state: ToothState, surfacesOverride?: readonly string[] | undefined) => {
			const currentActiveSurfaces = activeSurfacesRef.current;
			const apiSurfaces: string[] | undefined =
				surfacesOverride !== undefined
					? surfacesOverride.length > 0 ? [...surfacesOverride] : undefined
					: currentActiveSurfaces.length > 0 ? [...currentActiveSurfaces] : undefined;

			const next = applyUpdatedStatesToTeeth(
				teethDataRef.current,
				toothNumbers,
				state,
				surfacesOverride,
				currentActiveSurfaces,
			);

			setTeethData(next);
			persistTeethLocally(patientId, next);
			setLastSavedAt(new Date().toLocaleTimeString("ru-RU"));

			window.dispatchEvent(
				new CustomEvent("dente-odontogram-update", { detail: { patientId, states: next } }),
			);
			onClearMenuRef.current?.();
			setSelectedTeeth((prev) => (prev.length > 0 ? [] : prev));

			if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function") {
				try { navigator.vibrate([15, 30, 15]); } catch { /* ignore */ }
			}

			await sendToothStatesBatch(patientId, toothNumbers, state, apiSurfaces);
			setActiveSurfaces((prev) => (prev.length > 0 ? [] : prev));
		},
		[patientId],
	);

	const updateToothStateRef = useRef(updateToothState);
	updateToothStateRef.current = updateToothState;

	useEffect(() => {
		const isSamePatient = currentPatientIdRef.current === patientId;
		currentPatientIdRef.current = patientId;
		const isDemo = isDemoShowcaseMode() || isDemoPatientId(patientId);
		const defaultBaseline = buildBaselineTeeth(patientId, pediatricMode);

		const cachedTeeth = loadTeethFromLocalCache(patientId);
		if (cachedTeeth && cachedTeeth.length > 0) {
			setTeethData(cachedTeeth);
		} else if (!isSamePatient || teethDataRef.current.length === 0 || !teethDataRef.current.some((t) => t.state !== "Healthy")) {
			setTeethData(defaultBaseline);
			teethDataRef.current = defaultBaseline;
		}
		setTeethLoad({ phase: "loading" });
		setSelectedTeeth((prev) => (prev.length > 0 ? [] : prev));
		setActiveSurfaces((prev) => (prev.length > 0 ? [] : prev));
		onClearMenuRef.current?.();

		const controller = new AbortController();
		let cancelled = false;
		const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(patientId || "");

		const applyFallback = (errStatus: number | null, shouldToast = false) => {
			const localCached = loadTeethFromLocalCache(patientId);
			if (localCached && localCached.length > 0) {
				setTeethData(localCached);
				setTeethLoad({ phase: "ready" });
			} else if (isSamePatient && teethDataRef.current.length > 0 && teethDataRef.current.some((t) => t.state !== "Healthy")) {
				persistTeethLocally(patientId, teethDataRef.current);
				setTeethLoad({ phase: "ready" });
			} else if (isDemo || !isUuid || errStatus === 404) {
				setTeethData(defaultBaseline);
				setTeethLoad({ phase: "ready" });
			} else {
				if (shouldToast) showToast(actionFailureToast("Ошибка выполнения операции", errStatus), "error");
				setTeethData(defaultBaseline);
				setTeethLoad({ phase: "failed", status: errStatus });
			}
		};

		const loadTeeth = async () => {
			if (!patientId) {
				setTeethData(defaultBaseline);
				setTeethLoad({ phase: "ready" });
				return;
			}
			try {
				const { states, status, rawBody } = await fetchToothStatesFromServer(patientId, controller.signal);
				if (cancelled) return;
				if (states === null) {
					if (status !== 404 && isUuid) logger.error(`[tooth states] ${status} ${rawBody.slice(0, 300)}`);
					applyFallback(status, true);
					return;
				}
				const localCached = loadTeethFromLocalCache(patientId);
				const baseTeeth = localCached && localCached.length > 0 ? localCached : (isSamePatient && teethDataRef.current.length > 0 ? teethDataRef.current : defaultBaseline);
				const finalTeeth = mergeTeethWithLocalCache(baseTeeth, states);
				setTeethData(finalTeeth);
				persistTeethLocally(patientId, finalTeeth);
				setTeethLoad({ phase: "ready" });
			} catch (err) {
				if (cancelled || (err instanceof Error && err.name === "AbortError")) return;
				logger.error("[tooth states] запрос не выполнен", err);
				applyFallback((err as { status?: number })?.status ?? null, true);
			}
		};
		void loadTeeth();

		const detachListeners = attachOdontogramEventListeners({
			patientId,
			onUpdateToothState: (teeth, state) => updateToothStateRef.current(teeth, state),
			onSetTeethData: setTeethData,
			onSetAiPendingProposal: setAiPendingProposal,
			onSetIsMultiSelectMode: setIsMultiSelectMode,
		});

		return () => {
			cancelled = true;
			controller.abort();
			detachListeners();
		};
	}, [patientId, teethReloadToken, pediatricMode, setAiPendingProposal]);

	return {
		teethData, setTeethData, teethLoad, setTeethLoad, teethReloadToken, setTeethReloadToken,
		teethDataRef, selectedTeeth, setSelectedTeeth, activeSurfaces, setActiveSurfaces,
		activeSurfacesRef, isMultiSelectMode, setIsMultiSelectMode, lastSavedAt, setLastSavedAt,
		updateToothState, updateToothStateRef,
	};
}
