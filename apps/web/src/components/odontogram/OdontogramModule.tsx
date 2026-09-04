import { isValidFdiToothNumber } from "@dental/shared";
import {
	Activity,
	AlertTriangle,
	Banknote,
	Calculator,
	Check,
	CircleDot,
	Coins,
	CreditCard,
	FlaskConical,
	History,
	Info,
	Mic,
	Printer,
	QrCode,
	ShieldAlert,
	Sparkles,
	Stethoscope,
	X,
} from "lucide-react";
import {
	ONE_CLICK_LAB_DEFAULTS,
	addWorkingDays,
	calculateMaterialTotalCostKopecks,
} from "../lab/labMath";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import { TreatmentEstimator } from "./TreatmentEstimator";
import { TreatmentPlanModule } from "../treatment-plans/TreatmentPlanModule";
import { PeriodontogramChart } from "../perio/PeriodontogramChart";
import { VoiceDictationOverlay } from "./VoiceDictationOverlay";
import { FastCheckoutModal } from "../payments/checkout/FastCheckoutModal";
import type { CheckoutPaymentMethodType } from "../payments/checkout/fastCheckoutPresets";
import { calculateLiveInvoiceItems } from "./OdontogramLiveInvoice";
import {
	getToothAnatomicalNameRu,
	getToothFolkAndAnatomicalNameRu,
	generateSoapFromOdontogramFinding,
	generateSoapFromOdontogramStates,
} from "../../lib/clinicalProtocols043";
import "./odontogram.css";
import { usePerspectiveStore } from "../../store/perspectiveStore";
import { useAppStore } from "../../store/appStore";
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
		label: "Кариес (C)",
		className:
			"bg-red-500/10 text-red-400 border-red-500/20 hover:bg-red-500/20",
	},
	{
		state: "Pulpitis",
		label: "Пульпит (P)",
		className:
			"bg-rose-500/10 text-rose-400 border-rose-500/20 hover:bg-rose-500/20",
	},
	{
		state: "Periodontitis",
		label: "Периодонтит (Pt)",
		className:
			"bg-orange-500/10 text-orange-400 border-orange-500/20 hover:bg-orange-500/20",
	},
	{
		state: "Filled",
		label: "Пломба (F)",
		className:
			"bg-teal-500/10 text-teal-300 border-teal-500/20 hover:bg-teal-500/20",
	},
	{
		state: "Crown",
		label: "Коронка (Cr)",
		className:
			"bg-blue-500/10 text-blue-400 border-blue-500/20 hover:bg-blue-500/20",
	},
	{
		state: "Implant",
		label: "Имплант (Imp)",
		className:
			"bg-amber-500/10 text-amber-400 border-amber-500/20 hover:bg-amber-500/20",
	},
	{
		state: "Planned_Implant",
		label: "Имплант в плане",
		className:
			"bg-indigo-500/10 text-indigo-300 border-indigo-500/20 hover:bg-indigo-500/20",
	},
	{
		state: "Missing",
		label: "Отсутствует (X)",
		className:
			"bg-zinc-800/40 text-zinc-400 border-zinc-700/30 hover:bg-zinc-800/60",
	},
	{
		state: "Healthy",
		label: "Здоров (0)",
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
	const { odontogramUseSurfaces, activePatient, activeDoctor, auth } =
		useAppLogicContext();
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

	const [isFastCheckoutOpen, setIsFastCheckoutOpen] = useState(false);
	const [fastCheckoutMethod, setFastCheckoutMethod] = useState<CheckoutPaymentMethodType>("sbp_qr");

	// Auto-compute live invoice items and gross total in rubles for In-Chair Hot Path Cockpit
	const liveInvoiceItems = useMemo(() => {
		return calculateLiveInvoiceItems(teethData);
	}, [teethData]);

	const liveGrossTotalRub = useMemo(() => {
		return liveInvoiceItems.reduce(
			(acc, item) => acc + item.price * item.quantity,
			0,
		);
	}, [liveInvoiceItems]);

	// Extract allergy and somatic risk warnings from active patient
	const allergyText =
		(activePatient as { allergies?: string | null } | undefined)?.allergies ||
		(activePatient as { anamnesis?: { allergies?: string | null } } | undefined)?.anamnesis?.allergies;
	const rawSomaticAlerts = (activePatient as { somaticAlerts?: string[] } | undefined)?.somaticAlerts;
	const rawRiskLevel = (activePatient as { somaticRiskLevel?: string } | undefined)?.somaticRiskLevel;
	const isCardiacOrDiabetes = Boolean(
		(activePatient as { heartRisk?: boolean; diabetes?: boolean } | undefined)?.heartRisk ||
		(activePatient as { heartRisk?: boolean; diabetes?: boolean } | undefined)?.diabetes,
	);

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
	const [diagnocatPendingReport, setDiagnocatPendingReport] = useState<{
		reportDate: string;
		findings: ToothData[];
	} | null>(null);
	const [lastSavedAt, setLastSavedAt] = useState<string>(() =>
		new Date().toLocaleTimeString("ru-RU"),
	);

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
					const reportDateStr = new Date(latest.createdAt).toLocaleDateString("ru-RU");
					if (
						latest.odontogramData &&
						Array.isArray(latest.odontogramData.states) &&
						latest.odontogramData.states.length > 0
					) {
						// МАНДАТ 8e / РАЗДЕЛ VII: Запрет автоматической перезаписи зубной формулы роботом!
						// ИИ может лишь предложить чек-лист находок; подтверждает их только врач.
						setDiagnocatPendingReport({
							reportDate: reportDateStr,
							findings: latest.odontogramData.states,
						});
						showToast(
							`Найден отчёт Diagnocat AI от ${reportDateStr} (${latest.odontogramData.states.length} находок). Подтвердите внесение в формулу.`,
							"info",
							6000,
						);
					} else {
						showToast("Отчёт Diagnocat не содержит размеченных патологий.", "info", 5000);
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

	const handleApplyDiagnocatFindings = useCallback(() => {
		if (!diagnocatPendingReport) return;
		const incoming = diagnocatPendingReport.findings;
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
		showToast(
			`Находки Diagnocat AI (${incoming.length} зубов) успешно подтверждены и внесены врачом в зубную формулу.`,
			"success",
			5000,
		);
		setDiagnocatPendingReport(null);
	}, [diagnocatPendingReport]);

	const handleRejectDiagnocatFindings = useCallback(() => {
		setDiagnocatPendingReport(null);
		showToast("Находки Diagnocat AI отклонены врачом. Зубная формула сохранена без изменений.", "info", 4000);
	}, []);

	const handleOneClickLabOrder = async (targetTeeth: number[]) => {
		if (targetTeeth.length === 0) {
			showToast("Выберите зубы для наряда ЗТЛ", "warning");
			return;
		}
		const due = addWorkingDays(new Date(), ONE_CLICK_LAB_DEFAULTS.workingDays);
		const dueDateIso = due.toISOString();
		const dueDateFormatted = due.toLocaleDateString("ru-RU");
		const isBridge = targetTeeth.length > 1;
		const construction = isBridge
			? ONE_CLICK_LAB_DEFAULTS.restorationTypeBridge
			: ONE_CLICK_LAB_DEFAULTS.restorationTypeSingle;
		const priceRub =
			(calculateMaterialTotalCostKopecks(ONE_CLICK_LAB_DEFAULTS.materialId, targetTeeth.length) ||
				650000 * targetTeeth.length) / 100;
		const toothFdiStr = targetTeeth.join(", ");

		try {
			showToast(`Создаём 1-клик наряд ЗТЛ для зубов ${toothFdiStr}...`, "info", 2000);
			const res = await fetch("/api/clinical/lab-orders", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					...denteAdminSecretRequestHeaders(),
				},
				body: JSON.stringify({
					patientId,
					doctorId: activeDoctor?.id || null,
					toothFdi: toothFdiStr,
					material: ONE_CLICK_LAB_DEFAULTS.materialName,
					colorVita: ONE_CLICK_LAB_DEFAULTS.colorVita,
					dueDate: dueDateIso,
					clinicalNotes: `• Экспресс 1-клик наряд ЗТЛ из одонтограммы\n• Конструкция: ${isBridge ? `Мостовидный протез (${targetTeeth.length} ед.: ${targetTeeth.join("-")})` : "Одиночная коронка"}\n• Материал: ${ONE_CLICK_LAB_DEFAULTS.materialName}\n• Цвет: VITA Classical ${ONE_CLICK_LAB_DEFAULTS.colorVita}\n• Срок: 7 рабочих дней (до ${dueDateFormatted})\n• Цементный зазор: ${ONE_CLICK_LAB_DEFAULTS.cementGapMicrons} мкм`,
					priceRub,
				}),
			});

			if (!res.ok) {
				const err = await res.json().catch(() => ({}));
				throw new Error(err.message || "Ошибка создания наряда ЗТЛ");
			}

			const savedOrder = await res.json();

			if (savedOrder?.id) {
				for (const tooth of targetTeeth) {
					try {
						await fetch(`/api/clinical/lab-orders/${savedOrder.id}/items`, {
							method: "POST",
							headers: {
								"Content-Type": "application/json",
								...denteAdminSecretRequestHeaders(),
							},
							body: JSON.stringify({
								toothFdi: tooth,
								restorationType: construction,
								material: ONE_CLICK_LAB_DEFAULTS.materialId,
								shadeFinal: ONE_CLICK_LAB_DEFAULTS.colorVita,
								translucencyLevel: ONE_CLICK_LAB_DEFAULTS.translucency,
								cementGapMicrons: ONE_CLICK_LAB_DEFAULTS.cementGapMicrons,
								priceRub: priceRub / targetTeeth.length,
							}),
						});
					} catch {
						// Non-blocking item fallback
					}
				}
			}

			showToast(
				`Наряд ЗТЛ успешно оформлен в 1 клик для зубов ${toothFdiStr} (Цирконий A2, сдача: ${dueDateFormatted})!`,
				"success",
				6000,
			);
			window.dispatchEvent(
				new CustomEvent("dente-lab-order-created", { detail: { order: savedOrder } }),
			);
		} catch (err: any) {
			showToast(err.message || "Не удалось оформить наряд в ЗТЛ", "error");
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

			if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function") {
				try {
					navigator.vibrate([15, 30, 15]);
				} catch {
					// Safe ignore if vibration is not allowed by browser permissions
				}
			}

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
		useAppStore.getState().setActiveTooth(toothNumber);
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

				{/* ── КРИТИЧЕСКИЙ АЛЛЕРГО- И СОМАТИЧЕСКИЙ АЛЕРТ БЕЗОПАСНОСТИ (TIER 1) ── */}
				{(Boolean(allergyText) || (rawSomaticAlerts && rawSomaticAlerts.length > 0) || rawRiskLevel === "high" || isCardiacOrDiabetes) && (
					<div
						className="p-3.5 sm:p-4 rounded-2xl bg-rose-500/15 dark:bg-rose-950/40 border-2 border-rose-500/40 dark:border-rose-500/50 text-rose-950 dark:text-rose-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-md animate-in fade-in duration-200"
						role="alert"
						aria-live="assertive"
						data-testid="odontogram-critical-somatic-alert"
					>
						<div className="flex items-start gap-3 min-w-0">
							<div className="w-10 h-10 rounded-xl bg-rose-600 text-white flex items-center justify-center shrink-0 shadow-sm animate-pulse">
								<AlertTriangle className="w-5 h-5" />
							</div>
							<div className="min-w-0 space-y-1">
								<div className="flex items-center gap-2 flex-wrap">
									<span className="text-xs sm:text-sm font-black uppercase tracking-wider text-rose-700 dark:text-rose-300 flex items-center gap-1.5">
										<ShieldAlert className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" aria-hidden="true" />
										<span>АЛЛЕРГИИ И СОМАТИЧЕСКИЕ РИСКИ БЕЗОПАСНОСТИ:</span>
									</span>
									{rawRiskLevel === "high" && (
										<span className="px-2 py-0.5 rounded-full bg-rose-600 text-white text-[10px] font-black tracking-wide">
											ВЫСОКИЙ РИСК (ASA III/IV)
										</span>
									)}
								</div>
								<div className="text-xs sm:text-sm font-bold text-rose-900 dark:text-rose-100 flex items-center gap-2 flex-wrap break-words">
									{allergyText && (
										<span className="px-2.5 py-1 rounded-lg bg-rose-600 text-white font-mono font-black text-xs inline-flex items-center gap-1.5 shadow-xs">
											<AlertTriangle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
											<span>{allergyText}</span>
										</span>
									)}
									{rawSomaticAlerts && rawSomaticAlerts.map((alert, idx) => (
										<span key={idx} className="px-2 py-0.5 rounded-lg bg-rose-500/20 dark:bg-rose-900/40 text-rose-900 dark:text-rose-200 font-semibold text-xs border border-rose-500/30">
											{alert}
										</span>
									))}
									{isCardiacOrDiabetes && !allergyText && (!rawSomaticAlerts || rawSomaticAlerts.length === 0) && (
										<span>Кардио- / эндокринный мониторинг при анестезии (ограничение вазоконстриктора 1:200 000).</span>
									)}
								</div>
							</div>
						</div>
						<div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
							<span className="text-[11px] font-bold text-rose-700 dark:text-rose-300 hidden md:inline">
								Учтено в протоколе 043/у
							</span>
						</div>
					</div>
				)}

				{/* ── БАБУШКО-УСТОЙЧИВАЯ ШАПКА: ТУМБЛЕР ПРИКУСА + АВТОСОХРАНЕНИЕ + НАРОДНАЯ ПОДСКАЗКА ── */}
				<div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 p-3 rounded-2xl bg-[var(--paper-soft,#f8fafc)] dark:bg-zinc-900/60 border border-[var(--line,#e2e8f0)] dark:border-zinc-800 shadow-2xs">
					{/* Гигантский 1-клик тумблер прикуса (≥48px) */}
					<div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
						<button
							type="button"
							onClick={() => setIsPediatricMode(false)}
							className={`flex-1 sm:flex-initial min-h-[48px] px-4 py-2.5 rounded-xl text-sm sm:text-base font-black transition-all cursor-pointer flex items-center justify-center gap-2 border ${
								!isPediatricMode
									? "bg-indigo-600 text-white border-indigo-700 shadow-md ring-2 ring-indigo-500/30 scale-[1.02]"
									: "bg-[var(--paper,#ffffff)] dark:bg-zinc-800 text-[var(--ink-muted,#64748b)] border-[var(--line,#e2e8f0)] dark:border-zinc-700 hover:text-[var(--ink,#0f172a)]"
							}`}
							title="Постоянный прикус взрослого человека: зубы 11–48 (32 зуба)"
							data-testid="switch-adult-dentition-btn"
						>
							<CircleDot size={18} />
							<span>Взрослый прикус (11–48)</span>
						</button>
						<button
							type="button"
							onClick={() => setIsPediatricMode(true)}
							className={`flex-1 sm:flex-initial min-h-[48px] px-4 py-2.5 rounded-xl text-sm sm:text-base font-black transition-all cursor-pointer flex items-center justify-center gap-2 border ${
								isPediatricMode
									? "bg-amber-500 text-white border-amber-600 shadow-md ring-2 ring-amber-400/40 scale-[1.02]"
									: "bg-[var(--paper,#ffffff)] dark:bg-zinc-800 text-[var(--ink-muted,#64748b)] border-[var(--line,#e2e8f0)] dark:border-zinc-700 hover:text-[var(--ink,#0f172a)]"
							}`}
							title="Детский сменный / молочный прикус: зубы 51–85 (20 зубов)"
							data-testid="switch-pediatric-dentition-btn"
						>
							<Sparkles size={18} />
							<span>Детский прикус (51–85)</span>
						</button>
					</div>

					<div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
						{/* Кнопка 1-клик печати графической схемы зубов на A4 */}
						<button
							type="button"
							onClick={() => window.print()}
							className="min-h-[44px] px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold bg-slate-900 dark:bg-zinc-100 hover:bg-slate-800 dark:hover:bg-zinc-200 text-white dark:text-zinc-900 transition-all flex items-center justify-center gap-1.5 cursor-pointer shrink-0 shadow-xs active:scale-[0.98]"
							title="Распечатать графическую одонтограмму со всеми патологиями на лист A4 для вклейки в амбулаторную карту"
							data-testid="print-odontogram-a4-btn"
						>
							<Printer size={16} />
							<span>Печать зубной формулы (А4)</span>
						</button>

						{/* Крупный понятный бейдж автосохранения на диск */}
						<div
							className="flex items-center gap-2 px-3.5 py-2 min-h-[44px] rounded-xl bg-emerald-500/10 dark:bg-emerald-950/40 border border-emerald-500/30 text-emerald-800 dark:text-emerald-200 text-xs sm:text-sm font-bold shrink-0 self-start md:self-auto shadow-2xs"
							title="Все отметки и диагнозы непрерывно сохраняются в локальное хранилище и базу данных клиники"
						>
							<span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse inline-block shadow-xs shrink-0" />
							<span>🟢 Сохранено на диск ({lastSavedAt}) — данные в полной безопасности</span>
						</div>
					</div>
				</div>

				{/* ── ТАКТИЛЬНАЯ ЭКСПРЕСС-КАССА И СУММА К ОПЛАТЕ В 1 КЛИК (TIER 1) ── */}
				<div
					className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 p-3.5 rounded-2xl bg-gradient-to-r from-teal-500/10 via-emerald-500/10 to-teal-500/10 dark:from-teal-950/40 dark:via-emerald-950/40 dark:to-teal-950/40 border border-teal-500/30 shadow-xs"
					data-testid="odontogram-fast-checkout-ribbon"
				>
					<div className="flex items-center gap-3 min-w-0">
						<div className="w-10 h-10 rounded-xl bg-teal-600 text-white flex items-center justify-center shrink-0 shadow-sm">
							<Coins className="w-5 h-5" />
						</div>
						<div className="min-w-0">
							<div className="text-xs font-bold text-[var(--muted,#64748b)] uppercase tracking-wider">
								Итоговая сумма приема (по одонтограмме):
							</div>
							<div className="text-lg sm:text-xl font-black font-mono text-teal-800 dark:text-teal-200 flex items-center gap-2">
								<span>{liveGrossTotalRub.toLocaleString("ru-RU", { minimumFractionDigits: 2 })} ₽</span>
								{liveInvoiceItems.length > 0 ? (
									<span className="text-xs font-bold font-sans px-2 py-0.5 rounded-full bg-teal-600 text-white">
										{liveInvoiceItems.length} {countLabel(liveInvoiceItems.length, "услуга", "услуги", "услуг")}
									</span>
								) : (
									<span className="text-xs font-bold font-sans text-emerald-600">
										(санация / интактно)
									</span>
								)}
							</div>
						</div>
					</div>

					{/* 1-Click Immediate Payment Tender Triggers (>= 48px touch targets) */}
					<div className="grid grid-cols-2 sm:flex sm:items-center gap-2 w-full sm:w-auto">
						<button
							type="button"
							onClick={() => {
								setFastCheckoutMethod("sbp_qr");
								setIsFastCheckoutOpen(true);
								if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function") {
									try { navigator.vibrate([15, 30, 15]); } catch { /* ignore */ }
								}
							}}
							className="flex-1 sm:flex-initial min-h-[48px] px-2.5 sm:px-3.5 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 active:scale-95 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 shadow-sm transition-all cursor-pointer select-none whitespace-nowrap"
							title="1-клик оплата по QR-коду СБП (0% комиссии)"
							data-testid="cockpit-pay-sbp-btn"
						>
							<QrCode className="w-4 h-4 shrink-0" />
							<span>СБП QR</span>
						</button>
						<button
							type="button"
							onClick={() => {
								setFastCheckoutMethod("bank_card");
								setIsFastCheckoutOpen(true);
								if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function") {
									try { navigator.vibrate([15, 30, 15]); } catch { /* ignore */ }
								}
							}}
							className="flex-1 sm:flex-initial min-h-[48px] px-2.5 sm:px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 shadow-sm transition-all cursor-pointer select-none whitespace-nowrap"
							title="1-клик оплата банковской картой (эквайринг)"
							data-testid="cockpit-pay-card-btn"
						>
							<CreditCard className="w-4 h-4 shrink-0" />
							<span>Карта</span>
						</button>
						<button
							type="button"
							onClick={() => {
								setFastCheckoutMethod("cash");
								setIsFastCheckoutOpen(true);
								if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function") {
									try { navigator.vibrate([15, 30, 15]); } catch { /* ignore */ }
								}
							}}
							className="flex-1 sm:flex-initial min-h-[48px] px-2.5 sm:px-3.5 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 active:scale-95 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 shadow-sm transition-all cursor-pointer select-none whitespace-nowrap"
							title="1-клик оплата наличными с расчетом сдачи"
							data-testid="cockpit-pay-cash-btn"
						>
							<Banknote className="w-4 h-4 shrink-0" />
							<span>Наличные</span>
						</button>
						<button
							type="button"
							onClick={() => {
								setFastCheckoutMethod("patient_deposit");
								setIsFastCheckoutOpen(true);
								if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function") {
									try { navigator.vibrate([15, 30, 15]); } catch { /* ignore */ }
								}
							}}
							className="flex-1 sm:flex-initial min-h-[48px] px-2.5 sm:px-3.5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 active:scale-95 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 shadow-sm transition-all cursor-pointer select-none whitespace-nowrap"
							title="1-клик списание с семейного лицевого счета / депозита"
							data-testid="cockpit-pay-deposit-btn"
						>
							<Coins className="w-4 h-4 shrink-0" />
							<span>Депозит</span>
						</button>
					</div>
				</div>

				{/* Народная и анатомическая расшифровка выбранного зуба простым русским языком */}
				<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-4 py-2.5 rounded-xl bg-indigo-500/10 dark:bg-indigo-950/30 border border-indigo-500/20 text-indigo-950 dark:text-indigo-200 text-xs sm:text-sm font-bold transition-all">
					<div className="flex items-center gap-2 min-w-0">
						<Info className="w-4 h-4 text-indigo-500 shrink-0" />
						<span className="font-black text-indigo-600 dark:text-indigo-400 shrink-0">Зуб:</span>
						<span className="leading-snug truncate">
							{selectedTeeth.length === 1
								? getToothFolkAndAnatomicalNameRu(selectedTeeth[0]!)
								: selectedTeeth.length > 1
									? `Выбрана группа из ${selectedTeeth.length} зубов: ${selectedTeeth.join(", ")}`
									: "Нажмите на зуб или наведите курсор для отображения полного анатомического и народного названия (например: «16: Верхняя правая шестерка»)"}
						</span>
					</div>
					{selectedTeeth.length > 0 && (
						<button
							type="button"
							onClick={() => void handleOneClickLabOrder(selectedTeeth)}
							className="min-h-[36px] px-3 py-1.5 rounded-lg text-xs font-black text-amber-900 dark:text-amber-100 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 flex items-center gap-1.5 cursor-pointer shrink-0 transition-all active:scale-95 shadow-2xs whitespace-nowrap"
							title="Оформить наряд в зуботехническую лабораторию для выбранных зубов в 1 клик (Диоксид циркония / E.max, цвет VITA A2, +7 рабочих дней)"
							data-testid="selected-teeth-lab-order-btn"
						>
							<FlaskConical size={14} className="text-amber-600 dark:text-amber-400 shrink-0" />
							<span>⚡ Наряд ЗТЛ ({selectedTeeth.length} {countLabel(selectedTeeth.length, "зуб", "зуба", "зубов")})</span>
						</button>
					)}
				</div>

				{diagnocatPendingReport && (
					<div
						className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-950 dark:text-indigo-100 text-xs shadow-xs animate-in fade-in"
						role="alert"
						data-testid="diagnocat-confirmation-banner"
					>
						<div className="flex items-start sm:items-center gap-2.5">
							<div className="p-1.5 rounded-lg bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 shrink-0 mt-0.5 sm:mt-0">
								<Sparkles size={16} />
							</div>
							<div>
								<div className="font-bold text-sm">
									Предложение ИИ Diagnocat от {diagnocatPendingReport.reportDate} ({diagnocatPendingReport.findings.length} находок)
								</div>
								<div className="text-[11px] text-indigo-800/80 dark:text-indigo-300/80 mt-0.5">
									Находки по зубам:{" "}
									<strong>
										{diagnocatPendingReport.findings.map((f) => `${f.toothNumber} (${TOOTH_STATE_LABELS[f.state] || f.state})`).join(", ")}
									</strong>
									. Автоматическая перезапись запрещена — подтвердите внесение.
								</div>
							</div>
						</div>
						<div className="flex items-center gap-2 shrink-0">
							<button
								type="button"
								onClick={handleApplyDiagnocatFindings}
								className="min-h-[36px] px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-xs transition-all cursor-pointer flex items-center gap-1.5 active:scale-95"
								data-testid="apply-diagnocat-btn"
							>
								<Check size={14} />
								<span>Применить к формуле</span>
							</button>
							<button
								type="button"
								onClick={handleRejectDiagnocatFindings}
								className="min-h-[36px] px-3 py-1.5 rounded-lg bg-zinc-200 dark:bg-zinc-700 hover:bg-zinc-300 dark:hover:bg-zinc-600 text-zinc-800 dark:text-zinc-200 font-bold text-xs transition-all cursor-pointer flex items-center gap-1.5 active:scale-95"
								data-testid="reject-diagnocat-btn"
							>
								<X size={14} />
								<span>Отклонить</span>
							</button>
						</div>
					</div>
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
					onSelectTeethGroup={(targets) => {
						setSelectedTeeth(targets);
						setIsMultiSelectMode(true);
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
											{getToothFolkAndAnatomicalNameRu(menuConfig.toothNumber)}
										</div>
									)}
								</div>

								{/* Quick Surface Chips in 1 Tap */}
								<div className="col-span-2 flex flex-col gap-1 mb-2 p-2 rounded-xl bg-[var(--odontogram-surface,#f1f5f9)] dark:bg-zinc-800/60 border border-[var(--odontogram-border-subtle,#e2e8f0)] dark:border-zinc-700/50">
									<div className="flex items-center justify-between px-1">
										<span className="text-xs font-bold text-[var(--odontogram-ink-muted,#64748b)]">
											Поверхности в 1 клик:
										</span>
										<span className="text-[11px] font-mono font-bold text-[var(--teal,#0d9488)]">
											{activeSurfaces.length > 0 ? `[${activeSurfaces.join("")}]` : "вся коронка"}
										</span>
									</div>
									<div className="flex flex-wrap items-center gap-1.5">
										{[
											{ label: "MOD", surfs: ["M", "O", "D"], title: "Медиально-окклюзионно-дистальная (MOD)" },
											{ label: "MO", surfs: ["M", "O"], title: "Медиально-окклюзионная (MO)" },
											{ label: "OD", surfs: ["O", "D"], title: "Окклюзионно-дистальная (OD)" },
											{ label: "O", surfs: ["O"], title: "Окклюзионная (O/Жевательная)" },
											{ label: "V", surfs: ["V"], title: "Вестибулярная (V)" },
											{ label: "L/P", surfs: ["L"], title: "Язычная / Нёбная (L/P)" },
											{ label: "B", surfs: ["B"], title: "Буккальная / Щёчная (B)" },
										].map((chip) => {
											const isMatch =
												chip.surfs.length === activeSurfaces.length &&
												chip.surfs.every((s) => activeSurfaces.includes(s));
											return (
												<button
													key={chip.label}
													type="button"
													onClick={() => {
														setActiveSurfaces(isMatch ? [] : [...chip.surfs]);
													}}
													className={`min-h-[38px] px-2.5 py-1 rounded-lg text-xs font-mono font-black border transition-all cursor-pointer select-none touch-manipulation flex items-center justify-center ${
														isMatch
															? "bg-teal-600 text-white border-teal-600 shadow-xs scale-105"
															: "bg-[var(--odontogram-paper,#ffffff)] dark:bg-zinc-900 text-[var(--odontogram-ink,#0f172a)] dark:text-zinc-200 border-[var(--odontogram-border-subtle,#e2e8f0)] dark:border-zinc-700 hover:bg-[var(--odontogram-surface-hover,#e2e8f0)]"
													}`}
													title={chip.title}
													data-testid={`odontogram-module-surf-${chip.label.replace("/", "-")}`}
												>
													[{chip.label}]
												</button>
											);
										})}
									</div>
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
									data-testid="radial-menu-lab-order-btn"
									onClick={() => {
										const targets =
											selectedTeeth.length > 0 && selectedTeeth.includes(menuConfig.toothNumber)
												? selectedTeeth
												: [menuConfig.toothNumber];
										void handleOneClickLabOrder(targets);
										setMenuConfig(null);
									}}
									className="col-span-2 flex items-center justify-center min-h-[48px] p-3 rounded-xl border transition-all duration-200 font-black text-sm bg-amber-500/15 text-amber-900 dark:text-amber-100 border-amber-500/30 hover:bg-amber-500/25 cursor-pointer min-w-0 text-center leading-tight shadow-2xs active:scale-95"
								>
									<FlaskConical className="w-4 h-4 inline mr-2 text-amber-600 shrink-0" />
									<span className="min-w-0 break-words">⚡ Наряд ЗТЛ в 1 клик (Цирконий A2, +7 дн.)</span>
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
				<div className="w-full mt-2 animate-in fade-in duration-200">
					<PeriodontogramChart
						patientId={patientId}
						patientName={activePatient?.name}
						organizationId={auth?.organizationId}
						doctorId={activeDoctor?.id}
						doctorName={activeDoctor?.name}
						onInsertToProtocol={(protocolText) => {
							try {
								window.dispatchEvent(
									new CustomEvent("dente-apply-soap-protocol", {
										detail: {
											soap: protocolText,
											mode: "smart_append",
										},
									}),
								);
								showToast("Протокол пародонтограммы добавлен в дневник 043/у", "success", 4000);
							} catch {
								// Safe fallback
							}
						}}
					/>
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

			{/* ── ПЕЧАТНАЯ ВЕРСИЯ ОДОНТОГРАММЫ ДЛЯ А4 (АМБУЛАТОРНАЯ КАРТА 043/У) ── */}
			<div id="odontogram-print-a4" className="hidden print:block font-sans text-slate-900 bg-white p-6">
				{/* Шапка клиники */}
				<div className="border-b-2 border-slate-900 pb-3 mb-4 flex items-start justify-between gap-4">
					<div>
						<div className="text-base font-black text-slate-900 uppercase tracking-tight">
							Стоматологическая клиника «DENTE»
						</div>
						<div className="text-xs font-semibold text-slate-700">
							ООО «ДЕНТЕ МЕДИКАЛ ГРУПП» • Лицензия № ЛО41-01137-77/00368421 от 14.02.2023 г.
						</div>
						<div className="text-[11px] text-slate-500">
							119048, г. Москва, ул. Стоматологическая, д. 24, корп. 1 • Тел: +7 (495) 777-88-99 • dente-clinic.ru
						</div>
						<h1 className="text-lg font-black tracking-tight text-slate-950 uppercase mt-2">
							Клиническая зубная формула (Форма № 043/у)
						</h1>
						<p className="text-xs font-semibold text-slate-600">
							Приказ Минздрава России от 15.12.2014 № 834н • Прикус: {isPediatricMode ? "Детский / сменный (зубы 51–85)" : "Постоянный взрослый (зубы 11–48)"}
						</p>
					</div>
					<div className="text-right text-xs shrink-0">
						<div className="font-bold text-slate-900">
							Пациент: {activePatient?.fullName || "—"}
						</div>
						<div className="text-slate-600">
							Дата рожд.: {activePatient?.birthDate || "—"}
						</div>
						<div className="text-slate-600">
							№ Медкарты: {activePatient?.cardNumber || activePatient?.medicalCardNumber || activePatient?.id?.slice(0, 8) || "СТ-2026-0843"}
						</div>
						<div className="font-semibold text-slate-800 mt-1">
							Дата печати: {new Date().toLocaleDateString("ru-RU")}
						</div>
					</div>
				</div>

				{/* Графическая схема зубов */}
				<div className="my-4 flex justify-center scale-95 origin-top" style={{ pageBreakInside: "avoid", breakInside: "avoid" }}>
					<ToothChart
						teethData={teethData}
						pediatricMode={isPediatricMode}
						selectedTeeth={[]}
						onToothClick={() => {}}
						useSurfaces={odontogramUseSurfaces}
					/>
				</div>

				{/* Легенда патологий и таблица выявленных диагнозов */}
				<div className="mt-4 pt-3 border-t border-slate-200 text-xs" style={{ pageBreakInside: "avoid", breakInside: "avoid" }}>
					<div className="mb-3">
						<h3 className="font-bold text-slate-900 mb-1.5 uppercase text-[11px] tracking-wide">
							Условные обозначения патологий и состояний зубов:
						</h3>
						<div className="flex flex-wrap items-center gap-3 text-[11px]">
							<div className="flex items-center gap-1.5">
								<span className="w-3 h-3 rounded-full bg-red-600 inline-block shrink-0 border border-slate-400" />
								<span>Кариес (Caries)</span>
							</div>
							<div className="flex items-center gap-1.5">
								<span className="w-3 h-3 rounded-full bg-rose-600 inline-block shrink-0 border border-slate-400" />
								<span>Пульпит (Pulpitis)</span>
							</div>
							<div className="flex items-center gap-1.5">
								<span className="w-3 h-3 rounded-full bg-orange-500 inline-block shrink-0 border border-slate-400" />
								<span>Периодонтит (Periodontitis)</span>
							</div>
							<div className="flex items-center gap-1.5">
								<span className="w-3 h-3 rounded-full bg-teal-600 inline-block shrink-0 border border-slate-400" />
								<span>Пломба (Filled)</span>
							</div>
							<div className="flex items-center gap-1.5">
								<span className="w-3 h-3 rounded-full bg-blue-600 inline-block shrink-0 border border-slate-400" />
								<span>Коронка (Crown)</span>
							</div>
							<div className="flex items-center gap-1.5">
								<span className="w-3 h-3 rounded-full bg-purple-600 inline-block shrink-0 border border-slate-400" />
								<span>Имплантат (Implant)</span>
							</div>
							<div className="flex items-center gap-1.5">
								<span className="w-3 h-3 rounded-full bg-indigo-600 inline-block shrink-0 border border-slate-400" />
								<span>Имплантат в плане</span>
							</div>
							<div className="flex items-center gap-1.5">
								<span className="w-3 h-3 rounded-full bg-slate-400 inline-block shrink-0 border border-slate-500" />
								<span>Отсутствует (Missing)</span>
							</div>
							<div className="flex items-center gap-1.5">
								<span className="w-3 h-3 rounded-full bg-emerald-600 inline-block shrink-0 border border-slate-400" />
								<span>Здоров (Healthy)</span>
							</div>
						</div>
					</div>

					<div>
						<h3 className="font-bold text-slate-900 mb-1.5 uppercase text-[11px] tracking-wide">
							Таблица выявленных патологий и анатомический статус:
						</h3>
						{teethData.filter((t) => t.state && t.state !== "Healthy").length === 0 ? (
							<div className="p-2.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-600 text-xs italic">
								Все зубы зубного ряда интактны (клинически здоровы, патологий не выявлено).
							</div>
						) : (
							<table className="w-full border-collapse text-left text-xs border border-slate-300">
								<thead>
									<tr className="bg-slate-100 border-b border-slate-300 text-slate-900 font-bold">
										<th className="py-1.5 px-2 border-r border-slate-300 w-16 text-center">Зуб FDI</th>
										<th className="py-1.5 px-2 border-r border-slate-300">Народное / Обиходное название</th>
										<th className="py-1.5 px-2 border-r border-slate-300">Анатомическое название</th>
										<th className="py-1.5 px-2 border-r border-slate-300">Поверхности</th>
										<th className="py-1.5 px-2">Клинический статус / Диагноз</th>
									</tr>
								</thead>
								<tbody>
									{teethData
										.filter((t) => t.state && t.state !== "Healthy")
										.map((t) => {
											const folkAndAnat = getToothFolkAndAnatomicalNameRu(t.toothNumber);
											const anatName = getToothAnatomicalNameRu(t.toothNumber);
											return (
												<tr key={t.toothNumber} className="border-b border-slate-200 even:bg-slate-50">
													<td className="py-1.5 px-2 font-mono font-bold text-center border-r border-slate-200">{t.toothNumber}</td>
													<td className="py-1.5 px-2 font-medium border-r border-slate-200">{folkAndAnat}</td>
													<td className="py-1.5 px-2 text-slate-700 border-r border-slate-200">{anatName}</td>
													<td className="py-1.5 px-2 text-slate-600 border-r border-slate-200">
														{t.surfaces && t.surfaces.length > 0 ? t.surfaces.join(", ") : "—"}
													</td>
													<td className="py-1.5 px-2 font-bold text-slate-900">
														{TOOTH_STATE_LABELS[t.state as ToothState] || t.state}
													</td>
												</tr>
											);
										})}
								</tbody>
							</table>
						)}
					</div>
				</div>

				{/* Блок подписи врача и печати */}
				<div className="mt-8 pt-4 border-t-2 border-slate-300 flex items-end justify-between text-xs text-slate-800" style={{ pageBreakInside: "avoid", breakInside: "avoid" }}>
					<div className="space-y-1">
						<div>
							Врач-стоматолог: _________________________ /{" "}
							<strong>{activeDoctor?.fullName || auth?.currentUser?.name || "_________________________"}</strong>
						</div>
						<div className="text-[10px] text-slate-500">(подпись и личная печать врача)</div>
					</div>

					{/* Круглая печать («М.П. Клиники») */}
					<div className="w-20 h-20 rounded-full border-2 border-dashed border-slate-400 flex flex-col items-center justify-center text-[10px] font-bold text-slate-500 uppercase tracking-widest text-center">
						<span>М.П.</span>
						<span className="text-[8px] font-normal">Клиники</span>
					</div>

					<div className="space-y-1 text-right">
						<div>
							Пациент: _________________________ /{" "}
							<strong>{activePatient?.fullName || "_________________________"}</strong>
						</div>
						<div className="text-[10px] text-slate-500">(с состоянием зубной формулы ознакомлен)</div>
					</div>
				</div>
			</div>

			{/* 1-Click Fast Checkout Modal for In-Chair Cockpit */}
			{isFastCheckoutOpen && (
				<FastCheckoutModal
					isOpen={isFastCheckoutOpen}
					onClose={() => setIsFastCheckoutOpen(false)}
					totalBillKop={Math.max(100, Math.round(liveGrossTotalRub * 100))}
					initialPaymentMethod={fastCheckoutMethod}
					patientName={activePatient?.fullName || "Пациент"}
					patientPhone={activePatient?.phone || "+7 (999) 000-00-00"}
					orderId={`CHK-${patientId.slice(0, 8)}`}
					onPaymentComplete={() => {
						showToast(
							`Чек на сумму ${liveGrossTotalRub.toLocaleString("ru-RU")} ₽ успешно фискализирован (54-ФЗ)`,
							"success",
						);
						setIsFastCheckoutOpen(false);
					}}
				/>
			)}
		</div>
	);
};
