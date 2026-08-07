import { isValidFdiToothNumber } from "@dental/shared";
import { History, Mic, Stethoscope } from "lucide-react";
import React, { useEffect, useRef, useState } from "react";
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
	TOOTH_STATE_LABELS,
	ToothChart,
	type ToothData,
	type ToothState,
} from "./ToothChart";
import { ToothHistoryChronicle } from "./ToothHistoryChronicle";
import { TreatmentEstimator } from "./TreatmentEstimator";
import { VoiceDictationOverlay } from "./VoiceDictationOverlay";
import "./odontogram.css";

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
			"bg-amber-500/10 text-amber-400 border-amber-500/20 hover:bg-amber-500/20",
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
			"bg-yellow-500/10 text-yellow-400 border-yellow-500/20 hover:bg-yellow-500/20",
	},
	{
		state: "Planned_Implant",
		label: "Имплантат в плане",
		className:
			"bg-lime-500/10 text-lime-300 border-lime-500/20 hover:bg-lime-500/20",
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

const SurfaceSelector = ({
	selected,
	onChange,
}: {
	selected: string[];
	onChange: (newSelected: string[]) => void;
}) => {
	const toggle = (surface: string) => {
		if (selected.includes(surface)) {
			onChange(selected.filter((s) => s !== surface));
		} else {
			onChange([...selected, surface]);
		}
	};

	return (
		<div className="flex justify-center mb-4">
			<svg
				width="100"
				height="100"
				viewBox="0 0 100 100"
				className="drop-shadow-md cursor-pointer group"
				role="img"
				aria-label="Поверхности зуба"
			>
				<title>Поверхности зуба</title>
				{/* Top (B/V) */}
				<polygon
					points="0,0 100,0 70,30 30,30"
					fill={selected.includes("B") ? "#3b82f6" : "#27272a"}
					stroke="#3f3f46"
					strokeWidth="2"
					onClick={() => toggle("B")}
					className="hover:fill-blue-400 transition-colors duration-200"
				/>
				<text
					x="50"
					y="18"
					fill="white"
					fontSize="12"
					fontWeight="bold"
					textAnchor="middle"
					pointerEvents="none"
				>
					B
				</text>

				{/* Bottom (L/P) */}
				<polygon
					points="30,70 70,70 100,100 0,100"
					fill={selected.includes("L") ? "#3b82f6" : "#27272a"}
					stroke="#3f3f46"
					strokeWidth="2"
					onClick={() => toggle("L")}
					className="hover:fill-blue-400 transition-colors duration-200"
				/>
				<text
					x="50"
					y="90"
					fill="white"
					fontSize="12"
					fontWeight="bold"
					textAnchor="middle"
					pointerEvents="none"
				>
					L
				</text>

				{/* Left (M) */}
				<polygon
					points="0,0 30,30 30,70 0,100"
					fill={selected.includes("M") ? "#3b82f6" : "#27272a"}
					stroke="#3f3f46"
					strokeWidth="2"
					onClick={() => toggle("M")}
					className="hover:fill-blue-400 transition-colors duration-200"
				/>
				<text
					x="12"
					y="54"
					fill="white"
					fontSize="12"
					fontWeight="bold"
					textAnchor="middle"
					pointerEvents="none"
				>
					M
				</text>

				{/* Right (D) */}
				<polygon
					points="100,0 70,30 70,70 100,100"
					fill={selected.includes("D") ? "#3b82f6" : "#27272a"}
					stroke="#3f3f46"
					strokeWidth="2"
					onClick={() => toggle("D")}
					className="hover:fill-blue-400 transition-colors duration-200"
				/>
				<text
					x="88"
					y="54"
					fill="white"
					fontSize="12"
					fontWeight="bold"
					textAnchor="middle"
					pointerEvents="none"
				>
					D
				</text>

				{/* Center (O) */}
				<polygon
					points="30,30 70,30 70,70 30,70"
					fill={selected.includes("O") ? "#3b82f6" : "#27272a"}
					stroke="#3f3f46"
					strokeWidth="2"
					onClick={() => toggle("O")}
					className="hover:fill-blue-400 transition-colors duration-200"
				/>
				<text
					x="50"
					y="54"
					fill="white"
					fontSize="12"
					fontWeight="bold"
					textAnchor="middle"
					pointerEvents="none"
				>
					O
				</text>
			</svg>
		</div>
	);
};

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
	const [teethData, setTeethData] = useState<ToothData[]>([]);
	/* Пока формула не загружена, на экране не должно быть ни чужих данных, ни
	   правдоподобной пустой формулы без объяснения: и то, и другое врач
	   принимает за факт.

	   БЫЛО: `teethLoadFailed` булевым, а код ответа выбрасывался на месте
	   (`r.ok ? r.json() : null`). Поэтому отказ всегда объяснялся одной фразой
	   «обновите страницу» — обещание, которое при отказе по доступу или при 404
	   не сработает ни при каком обновлении. Код ответа нужен, чтобы назвать
	   причину и решить, есть ли смысл в кнопке повтора. */
	const [teethLoad, setTeethLoad] = useState<
		| { phase: "loading" }
		| { phase: "ready" }
		| { phase: "failed"; status: number | null }
	>({ phase: "loading" });
	/** Счётчик кнопки «Повторить»: меняется — формула читается заново. */
	const [_teethReloadToken, setTeethReloadToken] = useState(0);
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
	} | null>(null);
	const [historyTooth, setHistoryTooth] = useState<number | null>(null);

	// New States for Pediatric & Multi-Select
	const [isPediatricMode, setIsPediatricMode] = useState(
		pediatricMode || false,
	);
	const [isMultiSelectMode, setIsMultiSelectMode] = useState(false);
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
			console.error(err);
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
		setIsPediatricMode(pediatricMode || false);
	}, [pediatricMode]);

	// Load states from API
	useEffect(() => {
		/* БЫЛО: запрос уходил, а старая формула оставалась на экране до
		   ответа. Замерено в браузере: при переключении пациента на карточке
		   нового три секунды висели диагнозы прошлого — 11 кариес, 26 коронка,
		   36 пломба, которых у нового пациента нет, — и ни одного признака
		   загрузки. Врач видит чужую формулу как формулу текущего пациента и
		   может отметить лечение не на той. Если запрос не удавался, чужая
		   формула оставалась насовсем.
		   Сбрасываем состояние синхронно со сменой пациента, показываем
		   загрузку и отменяем устаревший запрос, чтобы поздний ответ по
		   прошлому пациенту не перетёр формулу текущего. */
		setTeethData([]);
		setTeethLoad({ phase: "loading" });

		/* БЫЛО: сбрасывалась только сама формула, а выбор зубов, выбранные
		   поверхности и открытое меню диагнозов принадлежали ПРОШЛОМУ пациенту и
		   оставались заряженными. PatientsView.tsx монтирует модуль без key, то
		   есть при переключении карточки меняется только patientId, а состояние
		   живёт дальше.

		   Что видел врач: отметил зубы 11, 12, 13 групповым выбором у одного
		   пациента, переключился на другого — и выбор с поверхностями остался.
		   Дальше updateToothState отправляет `toothNumbers` из этого выбора и
		   `surfaces` из activeSurfaces на /api/patients/<НОВЫЙ>/tooth-states/batch:
		   диагноз и поверхности записываются в карту не того пациента, и на схеме
		   это выглядит как обычная правка. То же с меню: оно оставалось открытым
		   над зубом прошлого пациента, и действие из него уходило новому.

		   historyTooth сбрасывается по той же причине: панель истории зуба
		   оставалась открытой и перечитывала события уже по другому пациенту под
		   прежним заголовком. */
		setSelectedTeeth([]);
		setActiveSurfaces([]);
		setMenuConfig(null);
		setHistoryTooth(null);

		const controller = new AbortController();
		let cancelled = false;

		/*
		 * БЫЛО: `.then(r => r.ok ? r.json() : null)` — код ответа выбрасывался, и
		 * причину отказа назвать было нечем. Теперь он доезжает до состояния, а
		 * тело читается строкой: на пустом теле r.json() бросает исключение, и
		 * отказ по доступу превращался в тот же безымянный отказ.
		 */
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
					console.error(`[tooth states] ${status} ${rawBody.slice(0, 300)}`);
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
					setTeethData(body.states as ToothData[]);
					setTeethLoad({ phase: "ready" });
					return;
				}
				console.error(`[tooth states] ${status}: в ответе нет формулы`);
				setTeethLoad({ phase: "failed", status });
			} catch (err) {
			showToast(actionFailureToast("Ошибка выполнения операции", (err as { status?: number })?.status ?? null), "error");
				// Отменённый запрос — не отказ: пациента переключили, и об этом
				// сообщать нечего.
				if (cancelled) return;
				console.error("[tooth states] запрос не выполнен", err);
				// До сервера не дошли: кода ответа нет, придумывать его нельзя.
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
				console.error(
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
				console.error(
					"[находка со снимка] номер зуба не читается",
					detail?.toothNumber,
				);
				return;
			}
			if (
				typeof finding !== "string" ||
				!Object.hasOwn(TOOTH_STATE_LABELS, finding)
			) {
				console.error(
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
	}, [patientId, updateToothState]);

	async function updateToothState(toothNumbers: number[], state: ToothState) {
		/* БЫЛО: снимок «до» делался как `previousTeethData = [...prev]` внутри
		   обновления состояния, а новое состояние проставлялось мутацией
		   `item.state = state`. Копия массива поверхностная — объекты зубов в
		   ней те же самые, поэтому снимок менялся вместе с состоянием. Откат
		   `setTeethData(previousTeethData)` возвращал уже НОВОЕ значение.

		   Проверено в браузере, scratch/verify-odontogram-rollback.mjs: при
		   ответе 500 на сохранение в базе оставался «Caries», всплывало
		   «Изменения отменены», а на схеме стояло «отсутствует». Формула
		   расходилась с базой, и интерфейс об этом врал. Врач мог закрыть
		   приём или распечатать схему с состоянием, которого в карте нет.

		   Снимок берётся до отправки, из ref с актуальным состоянием, и
		   глубоко копируется. Новое состояние собирается новыми объектами,
		   без мутации прежних. */
		const previousTeethData: ToothData[] = teethDataRef.current.map(
			(tooth) => ({
				...tooth,
				...(tooth.surfaces ? { surfaces: [...tooth.surfaces] } : {}),
			}),
		);

		setTeethData((prev) => {
			const next = prev.map((tooth) => {
				if (!toothNumbers.includes(tooth.toothNumber)) return tooth;
				const updated: ToothData = { ...tooth, state };
				if (activeSurfaces.length > 0) updated.surfaces = [...activeSurfaces];
				else delete updated.surfaces;
				return updated;
			});
			for (const t of toothNumbers) {
				if (next.some((tooth) => tooth.toothNumber === t)) continue;
				const newItem: ToothData = { toothNumber: t, state };
				if (activeSurfaces.length > 0) newItem.surfaces = [...activeSurfaces];
				next.push(newItem);
			}
			return next;
		});

		setMenuConfig(null);
		setSelectedTeeth([]);

		try {
			// Save to API
			const res = await fetch(`/api/patients/${patientId}/tooth-states/batch`, {
				method: "POST",
				headers: denteAdminSecretRequestHeaders({
					"Content-Type": "application/json",
				}),
				body: JSON.stringify({
					toothNumbers,
					state,
					surfaces: activeSurfaces.length > 0 ? activeSurfaces : undefined,
				}),
			});

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
				console.error(
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
			console.error("[tooth states batch] запрос не выполнен", err);
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
	}

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
			});
		}
	};

	return (
		<div className="flex flex-col lg:flex-row items-start gap-6 w-full h-full p-6 bg-zinc-50/40 dark:bg-zinc-950/40 backdrop-blur-md border border-zinc-200/50 dark:border-zinc-800/50 rounded-2xl shadow-2xl text-slate-900 dark:text-zinc-100">
			<div
				className="flex-2 min-w-0 flex flex-col gap-6 relative w-full"
				ref={containerRef}
			>
				<div className="flex gap-4 p-4 items-center bg-zinc-100/30 dark:bg-zinc-900/30 border-b border-zinc-200/50 dark:border-zinc-800/50 rounded-t-xl">
					<label className="flex items-center gap-2 cursor-pointer select-none">
						<input
							type="checkbox"
							checked={isPediatricMode}
							onChange={(e) => setIsPediatricMode(e.target.checked)}
							className="accent-indigo-500"
						/>
						<span className="text-sm font-medium">Детский прикус</span>
					</label>
					<label
						className={`flex items-center gap-2 cursor-pointer select-none ${isMultiSelectMode ? "text-indigo-600 dark:text-indigo-400" : ""}`}
					>
						<input
							type="checkbox"
							checked={isMultiSelectMode}
							onChange={(e) => {
								setIsMultiSelectMode(e.target.checked);
								if (!e.target.checked && selectedTeeth.length === 0)
									setMenuConfig(null);
							}}
							className="accent-indigo-500"
						/>
						<span className="text-sm font-medium">Групповой выбор (Shift)</span>
					</label>

					<button
						type="button"
						onClick={loadDiagnocatReport}
						disabled={diagnocatLoading}
						className="ml-auto flex items-center gap-2 px-3 py-1.5 text-sm font-medium bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 hover:bg-blue-500/20 rounded-md transition-colors"
					>
						<Stethoscope className="w-4 h-4" />
						{diagnocatLoading ? "Загрузка..." : "Diagnocat Анализ"}
					</button>
				</div>
				{/* Состояние формулы проговаривается словами. Пустая формула
				    выглядит как «все зубы здоровы», а это утверждение о пациенте,
				    которого система в этот момент не знает. */}
				{teethLoad.phase === "loading" && (
					<div
						role="status"
						aria-live="polite"
						style={{
							display: "flex",
							alignItems: "center",
							gap: 8,
							padding: "8px 12px",
							borderRadius: 8,
							fontSize: 13,
							fontWeight: 600,
							color: "var(--ink-2, var(--ink))",
							background: "var(--paper-soft, transparent)",
						}}
					>
						{panelStateText(TEETH_SUBJECT, { phase: "loading" }).title}
					</div>
				)}
				{/*
				  Отказ чтения формулы — общим видом отказа панели, с причиной по коду
				  ответа и кнопкой повтора там, где повтор осмыслен.

				  БЫЛО: одна фраза на все случаи — «Зубная формула не загрузилась.
				  Данные на схеме неполные — обновите страницу.» Обновление страницы
				  соберёт тот же запрос и получит тот же отказ: при 403 нужно войти в
				  смену, при 404 — сообщить администратору, что программа обновлена не
				  полностью. Обещание, которое не может сработать, врача уводит в
				  сторону, а схема под сообщением при этом показывает пустую формулу,
				  то есть «все зубы здоровы».
				*/}
				{teethLoad.phase === "failed" && (
					<PanelLoadFailure
						subject={TEETH_SUBJECT}
						status={teethLoad.status}
						onRetry={() => setTeethReloadToken((token) => token + 1)}
					/>
				)}
				<ToothChart
					teethData={teethData}
					pediatricMode={isPediatricMode}
					selectedTeeth={selectedTeeth}
					onToothClick={handleToothClick}
					useSurfaces={odontogramUseSurfaces}
				/>

				{/* Radial Menu via Portal — avoids backdrop-filter stack */}
				{menuConfig &&
					createPortal(
						<>
							{/* Backdrop */}
							<div
								role="presentation"
								style={{
									position: "fixed",
									top: 0,
									left: 0,
									right: 0,
									bottom: 0,
									zIndex: 9998,
								}}
								onClick={() => setMenuConfig(null)}
								onKeyDown={(e) => { if (e.key === 'Escape') setMenuConfig(null); }}
							/>
							<div
								role="menu"
								className={`absolute grid grid-cols-2 gap-2 p-3 w-[254px] bg-zinc-950/40 backdrop-blur-md border border-zinc-800/50 shadow-2xl rounded-2xl`}
								style={
									{
										left: menuConfig.x,
										top: menuConfig.y,
										zIndex: 9999,
									} as React.CSSProperties
								}
								onClick={(e) => e.stopPropagation()}
								onKeyDown={(e) => e.stopPropagation()}
							>
								{/* SVG Caret (Tail) */}
								{menuConfig.position === "bottom" ? (
									<svg
										aria-hidden="true"
										className="absolute -top-3 text-zinc-800/50 drop-shadow-md"
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
										className="absolute -bottom-3 text-zinc-800/50 drop-shadow-md"
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

								<div className="col-span-2 text-center mb-2 text-sm font-bold text-zinc-100">
									{selectedTeeth.length > 1
										? `Выбрано: ${selectedTeeth.length} зубов`
										: `Зуб ${menuConfig.toothNumber}`}
								</div>
								{selectedTeeth.length === 1 && (
									<div className="col-span-2 mb-2">
										<SurfaceSelector
											selected={activeSurfaces}
											onChange={setActiveSurfaces}
										/>
									</div>
								)}
								{/* Список состояний вынесен в TOOTH_STATE_ACTIONS: раньше здесь
								    были восемь почти одинаковых блоков JSX, и два состояния из
								    восьми в набор просто не попали — «Пломба» и «Имплантат в
								    плане». Оба поддерживаются схемой API (перечисление
								    toothStateValues в routes/odontogram.ts), у обоих есть цвета
								    и отрисовка (для пломбы рисуются каналы), но выставить их
								    из интерфейса было нельзя. Пломба — самая частая запись в
								    зубной формуле. */}
								{TOOTH_STATE_ACTIONS.map((action) => (
									<button
										key={action.state}
										type="button"
										onClick={() =>
											updateToothState(selectedTeeth, action.state)
										}
										className={`flex items-center justify-center p-3 rounded-xl border transition-all duration-200 font-medium tracking-wide text-xs ${action.className}`}
									>
										{action.label}
									</button>
								))}
								<button
									type="button"
									onClick={() => {
										setHistoryTooth(menuConfig.toothNumber);
										setMenuConfig(null);
									}}
									className="col-span-2 flex items-center justify-center p-3 rounded-xl border transition-all duration-200 font-medium tracking-wide text-xs bg-indigo-500/10 text-indigo-400 border-indigo-500/20 hover:bg-indigo-500/20"
								>
									<History className="w-4 h-4 inline mr-2" /> История зуба
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
			</div>

			<div className="flex-1 min-w-[320px] max-w-[480px] flex flex-col w-full relative">
				<TreatmentEstimator patientId={patientId} currentTeeth={teethData} />

				{/* Floating Voice Dictation Button */}
				{/* Кнопка состоит только из иконки, поэтому без aria-label и type
				    она объявлялась безымянной и по умолчанию считалась submit. */}
				<button
					type="button"
					aria-label="Диктовка состояния зубов голосом"
					title="Диктовка состояния зубов голосом"
					onClick={() => setIsVoiceOpen(true)}
					style={{
						position: "absolute",
						bottom: 24,
						right: 24,
						width: 72,
						height: 72,
						borderRadius: 36,
						background: "var(--primary-color, rgba(160, 130, 255, 0.2))",
						backdropFilter: "blur(12px)",
						border: "2px solid var(--primary-color, #a082ff)",
						boxShadow:
							"0 8px 32px var(--primary-color, rgba(160, 130, 255, 0.4))",
						display: "flex",
						alignItems: "center",
						justifyContent: "center",
						cursor: "pointer",
						zIndex: 100,
						transition: "all 0.3s",
					}}
					className="hover:scale-110 active:scale-95"
				>
					<Mic size={32} color="var(--primary-color, #a082ff)" />
				</button>
			</div>

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
							console.error(
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
							console.error(
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
						console.error("[dictation parse] запрос не выполнен", e);
						showToast(
							`${actionFailureToast("Надиктованное не разобрано", null)} Схема не изменена — отметьте зубы вручную.`,
							"error",
							12000,
						);
					}
				}}
			/>
		</div>
	);
};
