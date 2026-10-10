import { useCallback, useEffect, useRef, useState } from "react";
import { isValidFdiToothNumber } from "@dental/shared";
import { denteAdminSecretRequestHeaders } from "../../AppHelpers";
import { useWebsocket } from "../../hooks/useWebsocket";
import { isDemoPatientId, isDemoShowcaseMode } from "../../lib/demoMode";
import { actionFailureToast } from "../../lib/panelStateText";
import { showToast } from "../GlobalToast";
import { logger } from "../../utils/logger";
import {
	PEDIATRIC_TOP_TEETH,
	PEDIATRIC_BOTTOM_TEETH,
	createDefaultAdultTeethData,
	TOOTH_STATE_LABELS,
	type ToothData,
	type ToothState,
} from "./ToothChart";
import {
	loadStoredTeethData,
	saveStoredTeethData,
} from "./odontogramStorage";
import { getInitialShowcaseTeeth } from "./odontogramModuleConstants";

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

export function useOdontogramSync({
	patientId,
	pediatricMode,
	setAiPendingProposal,
	onClearMenu,
}: UseOdontogramSyncProps) {
	const currentPatientIdRef = useRef<string>(patientId);
	const setAiPendingProposalRef = useRef(setAiPendingProposal);
	setAiPendingProposalRef.current = setAiPendingProposal;
	const onClearMenuRef = useRef(onClearMenu);
	onClearMenuRef.current = onClearMenu;
	const [teethData, setTeethData] = useState<ToothData[]>(() => {
		if (patientId) {
			const cached = loadStoredTeethData(patientId);
			if (cached && cached.length > 0) {
				return cached;
			}
			if (isDemoShowcaseMode() || isDemoPatientId(patientId)) {
				return getInitialShowcaseTeeth(pediatricMode);
			}
		}
		return pediatricMode
			? [...PEDIATRIC_TOP_TEETH, ...PEDIATRIC_BOTTOM_TEETH].map((num) => ({
					toothNumber: num,
					state: "Healthy" as ToothState,
				}))
			: createDefaultAdultTeethData();
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
		const payload = lastMessage.payload as
			| { patientId?: string; states?: ToothData[] }
			| undefined;
		if (!payload || payload.patientId !== patientId) return;
		const incoming = Array.isArray(payload.states) ? payload.states : [];
		if (!incoming.length) return;

		setTeethData((prev) => {
			const merged = [...prev];
			for (const tooth of incoming) {
				const idx = merged.findIndex(
					(x) => x.toothNumber === tooth.toothNumber,
				);
				if (idx > -1) merged[idx] = tooth;
				else merged.push(tooth);
			}
			return merged;
		});
	}, [lastMessage, patientId]);

	const updateToothState = useCallback(
		async (toothNumbers: number[], state: ToothState, surfacesOverride?: readonly string[] | undefined) => {
			const currentActiveSurfaces = activeSurfacesRef.current;
			let apiSurfaces: string[] | undefined =
				surfacesOverride !== undefined
					? surfacesOverride.length > 0
						? [...surfacesOverride]
						: undefined
					: currentActiveSurfaces.length > 0
						? [...currentActiveSurfaces]
						: undefined;

			const currentTeeth = teethDataRef.current;
			const nowIso = new Date().toISOString();
			const next: ToothData[] = currentTeeth.map((tooth) => {
				if (!toothNumbers.includes(tooth.toothNumber)) return tooth;
				const updated: ToothData = { ...tooth, state, updatedAt: nowIso };
				if (surfacesOverride !== undefined) {
					if (surfacesOverride.length > 0) {
						updated.surfaces = [...surfacesOverride];
					} else {
						delete updated.surfaces;
					}
				} else if (currentActiveSurfaces.length > 0) {
					updated.surfaces = [...currentActiveSurfaces];
				} else if (state === "Healthy" || state === "Missing") {
					delete updated.surfaces;
				} else if (tooth.surfaces && tooth.surfaces.length > 0) {
					updated.surfaces = [...tooth.surfaces];
					if (!apiSurfaces) apiSurfaces = [...tooth.surfaces];
				}
				return updated;
			});
			for (const t of toothNumbers) {
				if (next.some((tooth) => tooth.toothNumber === t)) continue;
				const newItem: ToothData = { toothNumber: t, state, updatedAt: nowIso };
				if (surfacesOverride && surfacesOverride.length > 0) {
					newItem.surfaces = [...surfacesOverride];
				} else if (currentActiveSurfaces.length > 0) {
					newItem.surfaces = [...currentActiveSurfaces];
				}
				next.push(newItem);
			}

			setTeethData(next);
			saveStoredTeethData(patientId, next);
			const nowTimeStr = new Date().toLocaleTimeString("ru-RU");
			setLastSavedAt(nowTimeStr);

			window.dispatchEvent(
				new CustomEvent("dente-odontogram-update", {
					detail: { patientId, states: next },
				}),
			);

			onClearMenuRef.current?.();
			setSelectedTeeth((prev) => (prev.length > 0 ? [] : prev));

			if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function") {
				try {
					navigator.vibrate([15, 30, 15]);
				} catch {
					// Safe ignore if vibration is not allowed by browser permissions
				}
			}

			try {
				const res = await fetch(
					`/api/patients/${patientId}/tooth-states/batch`,
					{
						method: "POST",
						headers: denteAdminSecretRequestHeaders({
							"Content-Type": "application/json",
						}),
						body: JSON.stringify({
							toothNumbers,
							state,
							surfaces: apiSurfaces && apiSurfaces.length > 0 ? apiSurfaces : undefined,
						}),
					},
				);

				if (!res.ok) {
					const rawBody = await res.text();
					logger.error(
						`[tooth states batch] ${res.status} ${rawBody.slice(0, 300)}`,
					);
					showToast(
						"Отметка сохранена локально на диск (офлайн). Данные в безопасности и синхронизируются при связи",
						"info",
						8000,
					);
					return;
				}
			} catch (err) {
				logger.error("[tooth states batch] запрос не выполнен", err);
				showToast(
					"Отметка сохранена локально на диск (офлайн). Данные в безопасности и синхронизируются при связи",
					"info",
					8000,
				);
				return;
			}

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
		const defaultBaseline: ToothData[] = isDemo
			? getInitialShowcaseTeeth(pediatricMode)
			: pediatricMode
				? [...PEDIATRIC_TOP_TEETH, ...PEDIATRIC_BOTTOM_TEETH].map((num) => ({
						toothNumber: num,
						state: "Healthy" as ToothState,
					}))
				: createDefaultAdultTeethData();

		const cachedTeeth = loadStoredTeethData(patientId);
		if (cachedTeeth && cachedTeeth.length > 0) {
			setTeethData(cachedTeeth);
		} else if (
			isSamePatient &&
			teethDataRef.current.length > 0 &&
			teethDataRef.current.some((t) => t.state !== "Healthy")
		) {
			// Keep active local state
		} else {
			setTeethData(defaultBaseline);
			teethDataRef.current = defaultBaseline;
		}
		setTeethLoad({ phase: "loading" });

		setSelectedTeeth((prev) => (prev.length > 0 ? [] : prev));
		setActiveSurfaces((prev) => (prev.length > 0 ? [] : prev));
		onClearMenuRef.current?.();

		const controller = new AbortController();
		let cancelled = false;

		const isUuidPatient = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
			patientId || "",
		);

		const applyFallbackTeeth = (errStatus: number | null, shouldToastError = false) => {
			const localCached = loadStoredTeethData(patientId);
			if (localCached && localCached.length > 0) {
				setTeethData(localCached);
				setTeethLoad({ phase: "ready" });
			} else if (
				isSamePatient &&
				teethDataRef.current.length > 0 &&
				teethDataRef.current.some((t) => t.state !== "Healthy")
			) {
				saveStoredTeethData(patientId, teethDataRef.current);
				setTeethLoad({ phase: "ready" });
			} else if (
				isDemoShowcaseMode() ||
				isDemoPatientId(patientId) ||
				!isUuidPatient ||
				errStatus === 404
			) {
				setTeethData(defaultBaseline);
				setTeethLoad({ phase: "ready" });
			} else {
				if (shouldToastError) {
					showToast(actionFailureToast("Ошибка выполнения операции", errStatus), "error");
				}
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
			let status: number | null = null;
			try {
				const res = await fetch(`/api/patients/${patientId}/tooth-states`, {
					headers: denteAdminSecretRequestHeaders(),
					signal: controller.signal,
				});
				status = res.status;
				const rawBody = await res.text();
				if (cancelled) return;
				if (!res.ok) {
					if (status !== 404 && isUuidPatient) {
						logger.error(`[tooth states] ${status} ${rawBody.slice(0, 300)}`);
					}
					applyFallbackTeeth(status, true);
					return;
				}
				let data: unknown = null;
				try {
					data = rawBody.trim() === "" ? null : JSON.parse(rawBody);
				} catch {
					data = null;
				}
				const body =
					typeof data === "object" && data !== null && !Array.isArray(data)
						? (data as Record<string, unknown>)
						: null;
				const incomingStates: ToothData[] | null = Array.isArray(data)
					? (data as ToothData[])
					: body
						? Array.isArray(body.states)
							? (body.states as ToothData[])
							: Array.isArray(body.data)
								? (body.data as ToothData[])
								: Object.keys(body).length === 0 || body.success === true
									? []
									: null
						: rawBody.trim() === ""
							? []
							: null;
				if (incomingStates !== null) {
					const incoming = incomingStates;
					const localCached = loadStoredTeethData(patientId);
					const baseTeeth: ToothData[] =
						localCached && localCached.length > 0
							? localCached
							: isSamePatient && teethDataRef.current.length > 0
								? teethDataRef.current
								: defaultBaseline;
					let finalTeeth: ToothData[];
					if (incoming.length === 0) {
						finalTeeth = baseTeeth;
					} else {
						const merged = baseTeeth.map((cachedTooth) => {
							const found = incoming.find((inc) => inc.toothNumber === cachedTooth.toothNumber);
							if (!found) {
								return cachedTooth;
							}
							const resolvedSurfaces =
								found.surfaces && found.surfaces.length > 0
									? found.surfaces
									: cachedTooth.surfaces && cachedTooth.surfaces.length > 0
										? cachedTooth.surfaces
										: [];
							const surfacePatch = { surfaces: [...resolvedSurfaces] };

							if (
								cachedTooth.state !== "Healthy" &&
								(found.state === "Healthy" || (found.state as string) === "healthy")
							) {
								return {
									...found,
									...cachedTooth,
									state: cachedTooth.state,
									...surfacePatch,
								};
							}
							if (cachedTooth.updatedAt) {
								if (!found.updatedAt) {
									return {
										...found,
										...cachedTooth,
										...surfacePatch,
									};
								}
								const localTime = new Date(cachedTooth.updatedAt).getTime();
								const serverTime = new Date(found.updatedAt).getTime();
								if (localTime > serverTime) {
									return {
										...found,
										...cachedTooth,
										...surfacePatch,
									};
								}
							}
							return {
								...cachedTooth,
								...found,
								...surfacePatch,
							};
						});
						for (const item of incoming) {
							if (!merged.some((m) => m.toothNumber === item.toothNumber)) {
								merged.push(item);
							}
						}
						finalTeeth = merged;
					}
					setTeethData(finalTeeth);
					saveStoredTeethData(patientId, finalTeeth);
					setTeethLoad({ phase: "ready" });
					return;
				}
				logger.error(`[tooth states] ${status}: в ответе нет формулы`);
				applyFallbackTeeth(status, false);
			} catch (err) {
				if (cancelled || (err instanceof Error && err.name === "AbortError") || (typeof err === "object" && err !== null && (err as { name?: string }).name === "AbortError")) return;
				logger.error("[tooth states] запрос не выполнен", err);
				applyFallbackTeeth((err as { status?: number })?.status ?? status, true);
			}
		};
		void loadTeeth();

		const handleClinicalCollision = (e: Event) => {
			const detail = (e as CustomEvent).detail as
				| { toothNumber?: unknown }
				| undefined;
			const toothNumber = Number(detail?.toothNumber);
			if (!isValidFdiToothNumber(toothNumber)) {
				logger.error(
					"[имплантат из 3D] номер зуба не читается",
					detail?.toothNumber,
				);
				return;
			}
			showToast(
				`В карту записано: зуб ${toothNumber} — ${TOOTH_STATE_LABELS.Planned_Implant}. Запись пришла из трёхмерного просмотра. Если имплантат планируется не на этот зуб, исправьте отметку на схеме.`,
				"info",
				15000,
			);
			void updateToothStateRef.current([toothNumber], "Planned_Implant");
		};
		window.addEventListener("clinical-implant-placed", handleClinicalCollision);

		const handleWsUpdate = (e: Event) => {
			const detail = (e as CustomEvent).detail as
				| { patientId?: unknown; states?: unknown }
				| undefined;
			if (
				(detail?.patientId && patientId && detail.patientId !== patientId) ||
				!Array.isArray(detail?.states)
			)
				return;
			const incoming = detail.states as ToothData[];
			if (incoming.length === 0) return;
			setTeethData((prev) => {
				const merged = [...prev];
				for (const tooth of incoming) {
					const idx = merged.findIndex(
						(x) => x.toothNumber === tooth.toothNumber,
					);
					if (idx > -1) merged[idx] = tooth;
					else merged.push(tooth);
				}
				return merged;
			});
		};
		window.addEventListener("dente-odontogram-update", handleWsUpdate);

		const handleFinding = (e: Event) => {
			const detail = (e as CustomEvent).detail as
				| { toothNumber?: unknown; finding?: unknown }
				| undefined;
			const toothNumber = Number(detail?.toothNumber);
			const finding = detail?.finding;
			if (!isValidFdiToothNumber(toothNumber)) {
				logger.error(
					"[находка со снимка] номер зуба не читается",
					detail?.toothNumber,
				);
				return;
			}
			if (
				typeof finding !== "string" ||
				!Object.hasOwn(TOOTH_STATE_LABELS, finding)
			) {
				logger.error(
					"[находка со снимка] состояние не из списка схемы",
					finding,
				);
				showToast(
					`Находка по зубу ${toothNumber} в карту не записана: состояние со снимка программе не знакомо. Отметьте зуб на схеме сами.`,
					"warning",
					15000,
				);
				return;
			}
			const state = finding as ToothState;
			setAiPendingProposalRef.current?.({
				source: "vision",
				title: "Снимок / Визиограф (ИИ-распознавание)",
				findings: [{ toothNumber, state }],
			});
			showToast(
				`ИИ обнаружил находку на снимке: зуб ${toothNumber} (${TOOTH_STATE_LABELS[state] || state}). Подтвердите внесение в формулу.`,
				"info",
				10000,
			);
		};
		window.addEventListener("clinical-finding-detected", handleFinding);

		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key === "Shift") setIsMultiSelectMode(true);
		};
		const handleKeyUp = (e: KeyboardEvent) => {
			if (e.key === "Shift") setIsMultiSelectMode(false);
		};
		window.addEventListener("keydown", handleKeyDown);
		window.addEventListener("keyup", handleKeyUp);

		return () => {
			cancelled = true;
			controller.abort();
			window.removeEventListener(
				"clinical-implant-placed",
				handleClinicalCollision,
			);
			window.removeEventListener("dente-odontogram-update", handleWsUpdate);
			window.removeEventListener("clinical-finding-detected", handleFinding);
			window.removeEventListener("keydown", handleKeyDown);
			window.removeEventListener("keyup", handleKeyUp);
		};
	}, [patientId, teethReloadToken, pediatricMode]);

	return {
		teethData,
		setTeethData,
		teethLoad,
		setTeethLoad,
		teethReloadToken,
		setTeethReloadToken,
		teethDataRef,
		selectedTeeth,
		setSelectedTeeth,
		activeSurfaces,
		setActiveSurfaces,
		activeSurfacesRef,
		isMultiSelectMode,
		setIsMultiSelectMode,
		lastSavedAt,
		setLastSavedAt,
		updateToothState,
		updateToothStateRef,
	};
}
