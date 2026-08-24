import { isValidFdiToothNumber } from "@dental/shared";
import { Activity, Calculator, History, Mic, Sparkles, Stethoscope } from "lucide-react";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { denteAdminSecretRequestHeaders } from "../../AppHelpers";
import { useAppLogicContext } from "../../contexts/AppLogicContext";
import { useWebsocket } from "../../hooks/useWebsocket";
import {
	actionFailureToast,
	type PanelSubject,
	panelStateText,
} from "../../lib/panelStateText";
import { countLabel } from "../../lib/russianPlural";
import { showToast } from "../GlobalToast";
import { PanelLoadFailure } from "../PanelLoadFailure";
import {
	dictationApplyMessage,
	dictationApplyPlanFromResponseBody,
} from "./dictationToothUpdates";
import {
	ALL_ADULT_TEETH_NUMBERS,
	createDefaultAdultTeethData,
	TOOTH_STATE_LABELS,
	ToothChart,
	type ToothData,
	type ToothState,
} from "./ToothChart";
import { OdontogramViewContainer } from "./OdontogramViewContainer";
import { ToothHistoryChronicle } from "./ToothHistoryChronicle";
import {
	type EndoToothClinicalData,
	EndoCanalLogModal,
} from "./EndoCanalLogModal";
import { PediatricMixedDentitionModal } from "./PediatricMixedDentitionModal";
import { PeriodontalChartModule } from "./PeriodontalChartModule";
import { TreatmentEstimator } from "./TreatmentEstimator";
import { TreatmentPlanModule } from "../treatment-plans/TreatmentPlanModule";
import { VoiceDictationOverlay } from "./VoiceDictationOverlay";
import {
	getToothAnatomicalNameRu,
	generateSoapFromOdontogramFinding,
	generateSoapFromOdontogramStates,
} from "../../lib/clinicalProtocols043";
import "./odontogram.css";
import { usePerspectiveStore } from "../../store/perspectiveStore";
import { logger } from "../../utils/logger";

export { ALL_ADULT_TEETH_NUMBERS, createDefaultAdultTeethData };

/**
 * Состояния зуба, доступные врачу в контекстном меню.
 *
 * Порядок — по частоте записи на приёме: сначала находки, затем
 * выполненные работы, затем план и «здоров».
 *
 * Набор обязан покрывать весь тип ToothState и перечисление
 * toothStateValues на сервере: раньше в меню было шесть состояний из
 * восьми, и «Пломба» с «Имплантат в плане» выставить было нельзя,
 * хотя сервер их принимал и одонтограмма их рисовала.
 */
const TOOTH_STATE_ACTIONS: ReadonlyArray<{
	state: ToothState;
	label: string;
	className: string;
}> = [
	{
		state: "Caries",
		label: "Кариес",
		className:
			"bg-red-500/10 text-red-400 border-red-500/20 hover:bg-red-500/20",
	},
	{
		state: "Pulpitis",
		label: "Пульпит",
		className:
			"bg-rose-500/10 text-rose-400 border-rose-500/20 hover:bg-rose-500/20",
	},
	{
		state: "Periodontitis",
		label: "Периодонтит",
		className:
			"bg-orange-500/10 text-orange-400 border-orange-500/20 hover:bg-orange-500/20",
	},
	{
		state: "Filled",
		label: "Пломба",
		className:
			"bg-teal-500/10 text-teal-300 border-teal-500/20 hover:bg-teal-500/20",
	},
	{
		state: "Crown",
		label: "Коронка",
		className:
			"bg-blue-500/10 text-blue-400 border-blue-500/20 hover:bg-blue-500/20",
	},
	{
		state: "Implant",
		label: "Имплантат",
		className:
			"bg-amber-500/10 text-amber-400 border-amber-500/20 hover:bg-amber-500/20",
	},
	{
		state: "Planned_Implant",
		label: "Имплантат в плане",
		className:
			"bg-indigo-500/10 text-indigo-300 border-indigo-500/20 hover:bg-indigo-500/20",
	},
	{
		state: "Missing",
		label: "Отсутствует",
		className:
			"bg-zinc-800/40 text-zinc-400 border-zinc-700/30 hover:bg-zinc-800/60",
	},
	{
		state: "Healthy",
		label: "Здоров",
		className:
			"bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20",
	},
];


/**
 * Как называется содержимое схемы в трёх её состояниях.
 *
 * Пустоты у формулы своей нет: схема рисует все зубы всегда, и «нет отметок»
 * означает лишь то, что диагнозов пока не ставили. Опасно здесь другое —
 * непрочитанная формула, которая выглядит ровно как формула здорового рта.
 */
const TEETH_SUBJECT: PanelSubject = {
	notLoadedTitle: "Зубная формула не прочитана",
	accusative: "формулу пациента",
	emptyTitle: "Отметок на зубах пока нет",
	emptyHint: "Нажмите на зуб и выберите состояние — оно попадёт в карту сразу.",
	failureConsequence:
		"Схема ниже показывает зубы БЕЗ отметок — это не значит, что зубы здоровы: диагнозы, пломбы и коронки не прочитаны. Не считайте формулу полной и не печатайте её пациенту, пока она не загрузится.",
};

export const OdontogramModule = ({
	patientId,
	pediatricMode,
}: {
	patientId: string;
	pediatricMode?: boolean | undefined;
}) => {
	const { odontogramUseSurfaces } = useAppLogicContext();
	const [teethData, setTeethData] = useState<ToothData[]>(() =>
		createDefaultAdultTeethData(),
	);
	/* Пока формула не загружена, схема инициализируется 32 здоровыми зубами,
	   чтобы врач мог сразу взаимодействовать с картой. При сбое или отсутствии
	   диагнозов сохраняется интактная зубная дуга. */
	const [teethLoad, setTeethLoad] = useState<
		| { phase: "loading" }
		| { phase: "ready" }
		| { phase: "failed"; status: number | null }
	>({ phase: "loading" });
	/** Счётчик кнопки «Повторить»: меняется — формула читается заново. */
	const [teethReloadToken, setTeethReloadToken] = useState(0);
	/* Актуальная формула для снимка перед сохранением. Брать её внутри
	   обновления состояния нельзя: обновление может быть вызвано повторно, и
	   тогда снимок одного сохранения захватит правку другого. */
	const teethDataRef = useRef<ToothData[]>([]);
	teethDataRef.current = teethData;
	const [menuConfig, setMenuConfig] = useState<{
		toothNumber: number;
		x: number;
		y: number;
		position: "top" | "bottom";
		caretOffset: number;
		surfaces?: string[];
	} | null>(null);
	const [historyTooth, setHistoryTooth] = useState<number | null>(null);
	const [endoTooth, setEndoTooth] = useState<number | null>(null);

	const perspective = usePerspectiveStore((state) => state.perspective);
	// New States for Pediatric & Multi-Select & Collapsible Treatment Estimator
	const [isPediatricMode, setIsPediatricMode] = useState(
		pediatricMode ?? perspective === "pediatric",
	);
	const [isPediatricModalOpen, setIsPediatricModalOpen] = useState(false);
	const [isMultiSelectMode, setIsMultiSelectMode] = useState(false);
	const [isEstimatorOpen, setIsEstimatorOpen] = useState(false);
	const [isPerioOpen, setIsPerioOpen] = useState(false);
	const [selectedTeeth, setSelectedTeeth] = useState<number[]>([]);
	const [activeSurfaces, setActiveSurfaces] = useState<string[]>([]);
	const [isVoiceOpen, setIsVoiceOpen] = useState(false);
	const [diagnocatLoading, setDiagnocatLoading] = useState(false);

	const loadDiagnocatReport = async () => {
		setDiagnocatLoading(true);
		try {
			const res = await fetch(
				`/api/integrations/diagnocat/reports/${patientId}`,
				{
					headers: denteAdminSecretRequestHeaders(),
				},
			);
			if (res.ok) {
				const data = await res.json();
				if (data.reports && data.reports.length > 0) {
					const latest = data.reports[data.reports.length - 1];
					showToast(
						`Найден отчёт Diagnocat от ${new Date(latest.createdAt).toLocaleDateString()}. Применяем автоформулу...`,
						"success",
						5000,
					);
					if (
						latest.odontogramData &&
						Array.isArray(latest.odontogramData.states)
					) {
						// Merge states
						const incoming = latest.odontogramData.states;
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
					}
				} else {
					showToast("Отчёты Diagnocat не найдены.", "info", 5000);
				}
			}
		} catch (err) {
			logger.error(err);
			showToast("Ошибка загрузки отчётов Diagnocat.", "error", 5000);
		} finally {
			setDiagnocatLoading(false);
		}
	};

	const containerRef = React.useRef<HTMLDivElement>(null);

	const { lastMessage } = useWebsocket(
		import.meta.env.VITE_WS_URL ?? "ws://localhost:4100/api/ws/schedule",
	);
	useEffect(() => {
		if (lastMessage?.type !== "UPDATE_ODONTOGRAM") return;
		// payload проверяется отдельно: до включения живых обновлений этот
		// обработчик не исполнялся ни разу, и обращение к полю отсутствующего
		// payload уронило бы весь модуль.
		const payload = lastMessage.payload as
			| { patientId?: string; states?: ToothData[] }
			| undefined;
		if (!payload || payload.patientId !== patientId) return;
		const incoming = Array.isArray(payload.states) ? payload.states : [];
		if (!incoming.length) return;

		// БЫЛО: setTeethData(payload.states) — полная замена формулы.
		// Сервер шлёт результат .returning() по батчу, то есть ТОЛЬКО
		// изменённые зубы. Замена означала бы, что коллега, поставивший
		// диагноз одному зубу, стирает у всех остальных открытых одонтограмм
		// всю формулу до этого одного зуба. Правильно — слить по номеру зуба.
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

	useEffect(() => {
		setIsPediatricMode(pediatricMode ?? perspective === "pediatric");
	}, [pediatricMode, perspective]);

	// Load states from API
	const updateToothState = useCallback(
		async (toothNumbers: number[], state: ToothState, surfacesOverride?: readonly string[] | undefined) => {
			const previousTeethData: ToothData[] = teethDataRef.current.map(
				(tooth) => ({
					...tooth,
					...(tooth.surfaces ? { surfaces: [...tooth.surfaces] } : {}),
				}),
			);

			let apiSurfaces: string[] | undefined =
				surfacesOverride !== undefined
					? surfacesOverride.length > 0
						? [...surfacesOverride]
						: undefined
					: activeSurfaces.length > 0
						? [...activeSurfaces]
						: undefined;

			setTeethData((prev) => {
				const next = prev.map((tooth) => {
					if (!toothNumbers.includes(tooth.toothNumber)) return tooth;
					const updated: ToothData = { ...tooth, state };
					if (surfacesOverride !== undefined) {
						if (surfacesOverride.length > 0) {
							updated.surfaces = [...surfacesOverride];
						} else {
							delete updated.surfaces;
						}
					} else if (activeSurfaces.length > 0) {
						updated.surfaces = [...activeSurfaces];
					} else if (state === "Healthy" || state === "Missing") {
						delete updated.surfaces;
					} else if (tooth.surfaces && tooth.surfaces.length > 0) {
						// Сохраняем уже выбранные поверхности (M, O, D) при быстрой смене диагноза
						updated.surfaces = [...tooth.surfaces];
						if (!apiSurfaces) apiSurfaces = [...tooth.surfaces];
					}
					return updated;
				});
				for (const t of toothNumbers) {
					if (next.some((tooth) => tooth.toothNumber === t)) continue;
					const newItem: ToothData = { toothNumber: t, state };
					if (surfacesOverride && surfacesOverride.length > 0) {
						newItem.surfaces = [...surfacesOverride];
					} else if (activeSurfaces.length > 0) {
						newItem.surfaces = [...activeSurfaces];
					}
					next.push(newItem);
				}
				return next;
			});

			setMenuConfig(null);
			setSelectedTeeth([]);

			try {
				// Save to API
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
					/*
					 * БЫЛО: «Ошибка сохранения одонтограммы. Изменения отменены.» —
					 * жаргон вместо русского названия, ни причины, ни следующего шага, а
					 * код ответа выбрасывался. Медсестре с истёкшим доступом (403) и врачу
					 * при сбое сервера (500) нужны разные действия, и главное — человек
					 * должен понять, ЧТО именно не сохранилось: отметка на схеме
					 * откатилась, и он вправе думать, что просто промахнулся по зубу.
					 */
					const rawBody = await res.text();
					logger.error(
						`[tooth states batch] ${res.status} ${rawBody.slice(0, 300)}`,
					);
					setTeethData(previousTeethData);
					showToast(
						`${actionFailureToast(
							`Отметка «${TOOTH_STATE_LABELS[state]}» на ${countLabel(toothNumbers.length, "зубе", "зубах", "зубах")} ${toothNumbers.join(", ")} не сохранена`,
							res.status,
						)} На схеме вернулось прежнее состояние.`,
						"error",
						15000,
					);
					return;
				}
			} catch (err) {
				logger.error("[tooth states batch] запрос не выполнен", err);
				setTeethData(previousTeethData);
				showToast(
					`${actionFailureToast(
						`Отметка «${TOOTH_STATE_LABELS[state]}» на ${countLabel(toothNumbers.length, "зубе", "зубах", "зубах")} ${toothNumbers.join(", ")} не сохранена`,
						// До сервера не дошли: кода ответа нет, придумывать его нельзя.
						null,
					)} На схеме вернулось прежнее состояние.`,
					"error",
					15000,
				);
				return;
			}

			/*
			 * ЗДЕСЬ БЫЛА ЗАПИСЬ В ОЧЕРЕДЬ pendingPlanSuggestions — «Push suggestion to
			 * global state for ComparativePlannerDashboard». Читателя у неё не было ни
			 * одной минуты: единственный, ComparativePlannerDashboard, не рендерился ни
			 * из одного достижимого модуля и удалён этим же коммитом.
			 *
			 * То есть каждая отметка патологии дописывала объект в массив глобального
			 * стора, который никто не читает и никто не чистит (чистил его тот же
			 * недостижимый экран), — он рос до перезагрузки страницы.
			 *
			 * Мост «диагноз → смета» от этого не пострадал, он идёт другой дорогой и
			 * работает: смонтированный TreatmentEstimator (:945) получает currentTeeth
			 * прямо из этого состояния и подбирает позиции по зубной формуле сам —
			 * reconcileAutoSuggestions/estimatorRulesForTooth в
			 * ./treatmentEstimatorPricing.ts (Caries, Pulpitis, Crown,
			 * Planned_Implant; Missing не обрабатывается сознательно, :133). Он же
			 * помнит, какие строки врач снял корзиной, чего очередь не умела.
			 */
			setActiveSurfaces([]);
		},
		[activeSurfaces, patientId],
	);

	useEffect(() => {
		/* Инициализируем 32 здоровыми зубами сразу, чтобы схема не висела
		   в пустом состоянии и была мгновенно интерактивна. */
		setTeethData(createDefaultAdultTeethData());
		setTeethLoad({ phase: "loading" });

		/* Сбрасываем выбор зубов, поверхности и открытые меню от прошлого пациента. */
		setSelectedTeeth([]);
		setActiveSurfaces([]);
		setMenuConfig(null);
		setHistoryTooth(null);

		const controller = new AbortController();
		let cancelled = false;

		const loadTeeth = async () => {
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
					logger.error(`[tooth states] ${status} ${rawBody.slice(0, 300)}`);
					setTeethData(createDefaultAdultTeethData());
					setTeethLoad({ phase: "failed", status });
					return;
				}
				let data: unknown = null;
				try {
					data = rawBody.trim() === "" ? null : JSON.parse(rawBody);
				} catch {
					// Текст исключения английский, человеку он не показывается.
					data = null;
				}
				const body =
					typeof data === "object" && data !== null && !Array.isArray(data)
						? (data as Record<string, unknown>)
						: null;
				if (body?.success === true && Array.isArray(body.states)) {
					const incoming = body.states as ToothData[];
					if (incoming.length === 0) {
						setTeethData(createDefaultAdultTeethData());
					} else {
						const defaultTeeth = createDefaultAdultTeethData();
						const merged = defaultTeeth.map((dt) => {
							const found = incoming.find((inc) => inc.toothNumber === dt.toothNumber);
							return found ?? dt;
						});
						for (const item of incoming) {
							if (!merged.some((m) => m.toothNumber === item.toothNumber)) {
								merged.push(item);
							}
						}
						setTeethData(merged);
					}
					setTeethLoad({ phase: "ready" });
					return;
				}
				logger.error(`[tooth states] ${status}: в ответе нет формулы`);
				setTeethData(createDefaultAdultTeethData());
				setTeethLoad({ phase: "failed", status });
			} catch (err) {
				showToast(
					actionFailureToast(
						"Ошибка выполнения операции",
						(err as { status?: number })?.status ?? null,
					),
					"error",
				);
				// Отменённый запрос — не отказ: пациента переключили, и об этом
				// сообщать нечего.
				if (cancelled) return;
				logger.error("[tooth states] запрос не выполнен", err);
				// До сервера не дошли: кода ответа нет, придумывать его нельзя.
				setTeethData(createDefaultAdultTeethData());
				setTeethLoad({ phase: "failed", status });
			}
		};
		void loadTeeth();

		/*
		 * Имплантат, поставленный в трёхмерном просмотре, попадает в карту.
		 *
		 * ЧТО БЫЛО СЛОМАНО. Запись уходила в карту МОЛЧА: ни всплывающего
		 * сообщения, ни следа на экране, кроме изменившегося цвета зуба, который
		 * врач в этот момент не смотрит — он смотрит трёхмерный снимок. То есть
		 * диагноз «имплантат в плане» появлялся в карте открытого пациента без
		 * ведома человека.
		 *
		 * Номер зуба теперь проверяется общим правилом FDI: `if (e.detail?.toothNumber)`
		 * пропускало и строку, и 0.5, и 999 — а дальше это уходило в тело запроса
		 * как номер зуба.
		 */
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
			void updateToothState([toothNumber], "Planned_Implant");
		};
		window.addEventListener("clinical-implant-placed", handleClinicalCollision);

		const handleWsUpdate = (e: Event) => {
			const detail = (e as CustomEvent).detail as
				| { patientId?: unknown; states?: unknown }
				| undefined;
			if (detail?.patientId !== patientId || !Array.isArray(detail.states))
				return;
			/*
			 * Слияние по номеру зуба, а не замена. Тот же дефект уже был закрыт у
			 * живых обновлений выше: обновление приходит ТОЛЬКО по изменённым зубам,
			 * и замена стёрла бы на экране всю остальную формулу.
			 *
			 * ДОЛГ: это событие в проекте не рассылает никто (поиск по
			 * "dente-odontogram-update" находит только этот обработчик). Оставлено
			 * рабочим, а не удалено: удалять чужой задел молча нельзя, но и ловушку
			 * с заменой формулы держать нельзя.
			 */
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

		/*
		 * Находка со снимка. Состояние проверяется по списку состояний схемы:
		 * `e.detail?.finding` брался как есть, и любое слово уходило в карту
		 * состоянием зуба. Сервер такое отклоняет целиком, а врач получал отказ
		 * сохранения формулы вместо внятного «состояние не распознано».
		 */
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
			showToast(
				`В карту записано: зуб ${toothNumber} — ${TOOTH_STATE_LABELS[state]}. Запись пришла со снимка. Если это неверно, исправьте отметку на схеме.`,
				"info",
				15000,
			);
			void updateToothState([toothNumber], state);
		};
		window.addEventListener("clinical-finding-detected", handleFinding);

		// Shift key for multi-select
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
		// teethReloadToken — кнопка «Повторить» под сообщением об отказе.
	}, [patientId, updateToothState, teethReloadToken]);

	const handleToothClick = (
		toothNumber: number,
		rect: DOMRect,
		surface?: string,
	) => {
		if (isMultiSelectMode) {
			// Toggle selection, don't open menu yet
			setSelectedTeeth((prev) =>
				prev.includes(toothNumber)
					? prev.filter((t) => t !== toothNumber)
					: [...prev, toothNumber],
			);
			setMenuConfig(null);
		} else {
			let activeSelection = selectedTeeth;
			let currentSurfaces = activeSurfaces;

			// If surfaces are disabled, ignore surface clicks entirely
			if (!odontogramUseSurfaces) {
				surface = undefined;
			}

			// If we clicked on an unselected tooth while having a selection, clear it
			if (!selectedTeeth.includes(toothNumber)) {
				activeSelection = [toothNumber];
				setSelectedTeeth(activeSelection);

				// Pre-select existing surfaces for the newly selected tooth
				const existing = teethData.find(
					(t) => t.toothNumber === activeSelection[0],
				);
				if (existing?.surfaces) {
					currentSurfaces = [...existing.surfaces];
				} else {
					currentSurfaces = [];
				}
			}

			// If a specific surface was clicked, toggle it
			if (surface && activeSelection.length === 1) {
				if (currentSurfaces.includes(surface)) {
					currentSurfaces = currentSurfaces.filter((s) => s !== surface);
				} else {
					currentSurfaces = [...currentSurfaces, surface];
				}
			}

			if (activeSelection.length !== 1) {
				currentSurfaces = [];
			}

			setActiveSurfaces(currentSurfaces);

			const isUpperJaw =
				toothNumber < 30 || (toothNumber >= 51 && toothNumber <= 65);
			const menuW = 254;
			const menuH = 224;
			const gap = 12;
			const vw = window.innerWidth;
			const vh = window.innerHeight;

			let x = rect.left + rect.width / 2 - menuW / 2;
			let y = isUpperJaw ? rect.bottom + 10 : rect.top - menuH - 10;

			const clampedX = Math.max(8, Math.min(x, vw - menuW - 8));
			let caretOffset = 50;
			if (clampedX !== x) {
				const toothCenter = rect.left + rect.width / 2;
				caretOffset = ((toothCenter - clampedX) / menuW) * 100;
			}
			x = clampedX;
			if (isUpperJaw) {
				y = rect.bottom + gap + 10;
			} else {
				y = rect.top - menuH - gap - 10;
			}
			y = Math.max(8, Math.min(y, vh - menuH - 8));

			// Show menu for the group, anchored to the clicked tooth
			setMenuConfig({
				toothNumber,
				x,
				y,
				position: isUpperJaw ? "bottom" : "top",
				caretOffset,
				surfaces: currentSurfaces,
			});
		}
	};

	return (
		<div className="flex flex-col gap-1.5 w-full text-[var(--odontogram-ink,#0f172a)]">
			<div
				className="w-full min-w-0 flex flex-col gap-1.5 relative"
				ref={containerRef}
			>
				{/* Accessibility loading announcement without causing CLS layout shift */}
				{teethLoad.phase === "loading" && (
					<div
						role="status"
						aria-live="polite"
						className="sr-only"
					>
						{panelStateText(TEETH_SUBJECT, { phase: "loading" }).title}
					</div>
				)}
				{teethLoad.phase === "failed" && (
					<PanelLoadFailure
						subject={TEETH_SUBJECT}
						status={teethLoad.status}
						onRetry={() => setTeethReloadToken((token) => token + 1)}
					/>
				)}
				<OdontogramViewContainer
					teethData={teethData}
					pediatricMode={isPediatricMode}
					selectedTeeth={selectedTeeth}
					onToothClick={handleToothClick}
					onQuickStateChange={(targets, state, surfaces) => {
						void updateToothState(targets, state, surfaces ? [...surfaces] : undefined);
						try {
							const findings = targets.map((num) => {
								const existing = teethData.find((t) => t.toothNumber === num);
								const toothSurfaces =
									surfaces && surfaces.length > 0
										? surfaces
										: existing?.surfaces && existing.surfaces.length > 0
											? existing.surfaces
											: undefined;
								return toothSurfaces && toothSurfaces.length > 0
									? { toothNumber: num, state, surfaces: toothSurfaces }
									: { toothNumber: num, state };
							});
							const soap =
								findings.length > 1
									? generateSoapFromOdontogramStates(findings)
									: generateSoapFromOdontogramFinding(findings[0]!);
							window.dispatchEvent(
								new CustomEvent("dente-apply-soap-protocol", {
									detail: {
										finding: findings[0],
										soap,
										mode: "smart_append",
									},
								}),
							);
						} catch {
							// Safe event dispatch fallback
						}
					}}
					useSurfaces={odontogramUseSurfaces}
					onOpenVoiceDictation={() => setIsVoiceOpen(true)}
					onOpenPediatricModal={() => setIsPediatricModalOpen(true)}
					onTogglePerio={() => setIsPerioOpen((prev) => !prev)}
					isPerioOpen={isPerioOpen}
					onToggleEstimator={() => setIsEstimatorOpen((prev) => !prev)}
					isEstimatorOpen={isEstimatorOpen}
					onLoadDiagnocat={loadDiagnocatReport}
					diagnocatLoading={diagnocatLoading}
					isMultiSelectMode={isMultiSelectMode}
					onToggleMultiSelect={(enabled) => {
						setIsMultiSelectMode(enabled);
						if (!enabled && selectedTeeth.length === 0) setMenuConfig(null);
					}}
				/>

				{/* Floating Tooth Action Popup anchored directly to the clicked tooth */}
				{menuConfig &&
					typeof document !== "undefined" &&
					createPortal(
						<>
							{/* Backdrop */}
							<button
								type="button"
								style={{
									position: "fixed",
									top: 0,
									left: 0,
									right: 0,
									bottom: 0,
									zIndex: 99998,
									background: "transparent",
									border: "none",
									padding: 0,
									margin: 0,
									cursor: "default",
								}}
								onClick={() => setMenuConfig(null)}
								onKeyDown={(e) => {
									if (e.key === "Enter" || e.key === " ") {
										e.preventDefault();
										setMenuConfig(null);
									}
									if (e.key === "Escape") setMenuConfig(null);
								}}
							/>
							<div
								role="menu"
								className="tooth-radial-menu"
								style={
									{
										position: "fixed",
										left: menuConfig.x,
										top: menuConfig.y,
										zIndex: 99999,
									} as React.CSSProperties
								}
								onClick={(e) => e.stopPropagation()}
								onKeyDown={(e) => e.stopPropagation()}
							>
								{/* SVG Caret (Tail) */}
								{menuConfig.position === "bottom" ? (
									<svg
										aria-hidden="true"
										className="absolute -top-3 text-[var(--odontogram-border,#cbd5e1)] dark:text-zinc-800/50 drop-shadow-md"
										style={{
											left: `${menuConfig.caretOffset}%`,
											transform: "translateX(-50%)",
										}}
										width="24"
										height="12"
										viewBox="0 0 24 12"
										fill="none"
										xmlns="http://www.w3.org/2000/svg"
									>
										<path
											d="M12 0L24 12H0L12 0Z"
											fill="currentColor"
											fillOpacity="0.8"
										/>
									</svg>
								) : (
									<svg
										aria-hidden="true"
										className="absolute -bottom-3 text-[var(--odontogram-border,#cbd5e1)] dark:text-zinc-800/50 drop-shadow-md"
										style={{
											left: `${menuConfig.caretOffset}%`,
											transform: "translateX(-50%)",
										}}
										width="24"
										height="12"
										viewBox="0 0 24 12"
										fill="none"
										xmlns="http://www.w3.org/2000/svg"
									>
										<path
											d="M12 12L24 0H0L12 12Z"
											fill="currentColor"
											fillOpacity="0.8"
										/>
									</svg>
								)}

								<div className="col-span-2 text-center mb-2">
									<div className="text-sm font-black text-[var(--odontogram-ink,#0f172a)] dark:text-zinc-100">
										{selectedTeeth.length > 1
											? `Выбрано: ${selectedTeeth.length} зубов`
											: `Зуб #${menuConfig.toothNumber}`}
									</div>
									{selectedTeeth.length === 1 && (
										<div className="text-xs font-semibold text-[var(--odontogram-ink-muted,#64748b)]">
											{getToothAnatomicalNameRu(menuConfig.toothNumber)}
										</div>
									)}
								</div>

								{/* 1-Tap Tooth Status Assignment */}
								{TOOTH_STATE_ACTIONS.map((action) => (
									<button
										key={action.state}
										type="button"
										onClick={() => {
											const num = menuConfig.toothNumber;
											const targets =
												selectedTeeth.length > 0 && selectedTeeth.includes(num)
													? selectedTeeth
													: [num];
											void updateToothState(targets, action.state);
											try {
												const toothSurfaces =
													activeSurfaces.length > 0 ? activeSurfaces : undefined;
												const findingPayload =
													toothSurfaces && toothSurfaces.length > 0
														? {
																toothNumber: num,
																state: action.state,
																surfaces: toothSurfaces,
															}
														: { toothNumber: num, state: action.state };
												const soap =
													generateSoapFromOdontogramFinding(findingPayload);
												window.dispatchEvent(
													new CustomEvent("dente-apply-soap-protocol", {
														detail: {
															finding: findingPayload,
															soap,
															mode: "smart_append",
														},
													}),
												);
											} catch {
												// Safe event dispatch fallback
											}
											setMenuConfig(null);
										}}
										className={`flex items-center justify-center min-h-[48px] p-3 rounded-xl border transition-all duration-200 font-black text-sm sm:text-base cursor-pointer select-none active:scale-95 text-center leading-tight break-words min-w-0 ${action.className}`}
									>
										<span className="min-w-0 break-words text-center leading-tight">{action.label}</span>
									</button>
								))}

								<button
									type="button"
									onClick={() => {
										setHistoryTooth(menuConfig.toothNumber);
										setMenuConfig(null);
									}}
									className="col-span-2 flex items-center justify-center min-h-[48px] p-3 rounded-xl border transition-all duration-200 font-bold text-sm bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border-indigo-500/25 hover:bg-indigo-500/20 cursor-pointer min-w-0 text-center leading-tight"
								>
									<History className="w-4 h-4 inline mr-2 shrink-0" />
									<span className="min-w-0 break-words">История зуба</span>
								</button>
								<button
									type="button"
									data-testid="radial-menu-endo-log-btn"
									onClick={() => {
										setEndoTooth(menuConfig.toothNumber);
										setMenuConfig(null);
									}}
									className="col-span-2 flex items-center justify-center min-h-[48px] p-3 rounded-xl border transition-all duration-200 font-bold text-sm bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/25 hover:bg-rose-500/20 cursor-pointer min-w-0 text-center leading-tight"
								>
									<Activity className="w-4 h-4 inline mr-2 shrink-0" />
									<span className="min-w-0 break-words">Журнал каналов (Эндо)</span>
								</button>
								<button
									type="button"
									onClick={() => {
										const num = menuConfig.toothNumber;
										const currentTooth = teethData.find((t) => t.toothNumber === num);
										const st: ToothState = currentTooth?.state || "Healthy";
										const toothSurfaces = (activeSurfaces.length > 0 ? activeSurfaces : undefined);
										const anatomicalName = getToothAnatomicalNameRu(num);
										const findingPayload = toothSurfaces && toothSurfaces.length > 0
											? { toothNumber: num, state: st, surfaces: toothSurfaces }
											: { toothNumber: num, state: st };
										const soap = generateSoapFromOdontogramFinding(findingPayload);
										const clipText = `Зуб ${num} (${anatomicalName}): ${soap.diagnosisIcd10Label}.\n${soap.statusLocalis}\n${soap.treatmentDescription}`;
										try {
											navigator.clipboard?.writeText?.(clipText);
										} catch {
											// ignore clipboard permission
										}
										window.dispatchEvent(
											new CustomEvent("dente-apply-soap-protocol", {
												detail: {
													finding: findingPayload,
													soap,
													mode: "smart_append",
												},
											}),
										);
										showToast(`Протокол для зуба #${num} внесён в Дневник 043/у`, "success");
										setMenuConfig(null);
									}}

									className="col-span-2 flex items-center justify-center min-h-[48px] p-3 rounded-xl border transition-all duration-200 font-bold text-sm bg-teal-500/10 text-teal-700 dark:text-teal-300 border-teal-500/25 hover:bg-teal-500/20 cursor-pointer min-w-0 text-center leading-tight"
								>
									<Sparkles className="w-4 h-4 inline mr-2 shrink-0" />
									<span className="min-w-0 break-words">Вставить в дневник 043/у</span>
								</button>
							</div>
						</>,
						document.body,
					)}

				{historyTooth !== null && (
					<ToothHistoryChronicle
						patientId={patientId}
						toothNumber={historyTooth}
						onClose={() => setHistoryTooth(null)}
					/>
				)}

				{endoTooth !== null && (
					<EndoCanalLogModal
						isOpen={true}
						onClose={() => setEndoTooth(null)}
						toothNumber={endoTooth}
						toothState={
							TOOTH_STATE_LABELS[
								teethData.find((t) => t.toothNumber === endoTooth)?.state ||
									"Pulpitis"
							]
						}
						patientId={patientId}
						initialCanals={
							(
								teethData.find((t) => t.toothNumber === endoTooth)
									?.clinicalData as EndoToothClinicalData | undefined
							)?.canals
						}
						initialIrrigation={
							(
								teethData.find((t) => t.toothNumber === endoTooth)
									?.clinicalData as EndoToothClinicalData | undefined
							)?.irrigation
						}
						initialRadiologyControl={
							(
								teethData.find((t) => t.toothNumber === endoTooth)
									?.clinicalData as EndoToothClinicalData | undefined
							)?.radiologyControl
						}
						onSaveCanals={async (canals, clinicalData) => {
							setTeethData((prev) =>
								prev.map((t) =>
									t.toothNumber === endoTooth ? { ...t, clinicalData } : t,
								),
							);
							const tooth = teethData.find((t) => t.toothNumber === endoTooth);
							const state = tooth?.state || "Pulpitis";
							const surfaces = tooth?.surfaces || [];
							try {
								const res = await fetch(
									`/api/patients/${patientId}/tooth-states/batch`,
									{
										method: "POST",
										headers: denteAdminSecretRequestHeaders({
											"Content-Type": "application/json",
										}),
										body: JSON.stringify({
											toothNumbers: [endoTooth],
											state,
											surfaces: surfaces.length > 0 ? surfaces : undefined,
											clinicalData,
										}),
									},
								);
								if (!res.ok) {
									showToast(
										"Не удалось сохранить параметры каналов в БД",
										"error",
									);
								}
							} catch (err) {
								logger.error("[OdontogramModule] Save endo canals error", err);
							}
						}}
					/>
				)}
			</div>

			{/* Collapsible Full-width Treatment Planning Section below Odontogram */}
			{isEstimatorOpen && (
				<div className="w-full flex flex-col gap-6 mt-2 animate-in fade-in duration-200">
					<TreatmentEstimator patientId={patientId} currentTeeth={teethData} />
					<TreatmentPlanModule patientId={patientId} teethData={teethData} />
				</div>
			)}

			{/* Collapsible Periodontal Examination Module below Odontogram */}
			{isPerioOpen && (
				<div className="w-full flex flex-col gap-4 mt-2 animate-in fade-in duration-200">
					<PeriodontalChartModule patientId={patientId} />
				</div>
			)}

			<VoiceDictationOverlay
				isOpen={isVoiceOpen}
				onClose={() => setIsVoiceOpen(false)}
				onDictationSubmit={async (text) => {
					setIsVoiceOpen(false);
					try {
						const res = await fetch("/api/ai/parse-dictation", {
							method: "POST",
							/*
							 * БЫЛО: только Content-Type, без секрета смены. Маршрут закрыт
							 * requireClinicalReadAccess (apps/api/src/routes/ai.ts:191), то
							 * есть на настроенном сервере диктовка получала 403 ВСЕГДА, и
							 * врач видел «Ошибка при обращении к серверу ИИ» без причины.
							 * Все остальные запросы этого файла шлют этот заголовок.
							 */
							headers: denteAdminSecretRequestHeaders({
								"Content-Type": "application/json",
							}),
							body: JSON.stringify({ text, type: "visit" }),
						});
						// Тело читается строкой: на пустом теле res.json() бросает
						// исключение, и отказ превращался в «Не удалось обработать».
						const rawBody = await res.text();
						if (!res.ok) {
							logger.error(
								`[dictation parse] ${res.status} ${rawBody.slice(0, 300)}`,
							);
							showToast(
								`${actionFailureToast("Надиктованное не разобрано", res.status)} Схема не изменена — отметьте зубы вручную.`,
								"error",
								12000,
							);
							return;
						}
						/*
						 * Разбор ответа вынесен в ./dictationToothUpdates.ts и проверяется
						 * node:test. БЫЛО: `const { code, state } = data.payload` — таких
						 * полей в payload нет (они внутри payload.toothUpdates), поэтому
						 * в формулу уходил зуб NaN, а врач читал зелёное
						 * «AI: Зуб undefined обновлен (undefined)» и не получал ничего.
						 */
						const plan = dictationApplyPlanFromResponseBody(rawBody);
						if (plan === null) {
							logger.error(
								`[dictation parse] ${res.status}: ответ не по контракту`,
							);
							showToast(
								"Надиктованное не разобрано: ответ сервера непонятен — повторите, а если повторится, сообщите администратору. Схема не изменена.",
								"error",
								12000,
							);
							return;
						}
						const message = dictationApplyMessage(plan);
						/*
						 * Сначала запись, потом сообщение: updateToothState сам откатит
						 * формулу и скажет об отказе, если сервер её не принял. Показать
						 * «отмечено» до ответа сервера значило бы обещать за него.
						 */
						for (const item of plan.applied) {
							await updateToothState([item.toothNumber], item.state);
						}
						showToast(
							message.text,
							message.tone,
							message.tone === "success" ? 6000 : 15000,
						);
					} catch (e) {
						logger.error("[dictation parse] запрос не выполнен", e);
						showToast(
							`${actionFailureToast("Надиктованное не разобрано", null)} Схема не изменена — отметьте зубы вручную.`,
							"error",
							12000,
						);
					}
				}}
			/>

			<PediatricMixedDentitionModal
				isOpen={isPediatricModalOpen}
				onClose={() => setIsPediatricModalOpen(false)}
				teethData={teethData}
				onUpdateToothResorption={(toothNumber, resorptionStage) => {
					setTeethData((prev) =>
						prev.map((t) =>
							t.toothNumber === toothNumber
								? { ...t, resorptionStage }
								: t,
						),
					);
				}}
			/>
		</div>
	);
};
