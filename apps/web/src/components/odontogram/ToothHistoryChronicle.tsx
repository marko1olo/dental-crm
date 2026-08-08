import { Activity, Calendar, FileText, History, X } from "lucide-react";
import { useEffect, useState } from "react";
import { denteAdminSecretRequestHeaders } from "../../AppHelpers";
import {
	actionFailureToast,
	type PanelSubject,
	panelStateText,
} from "../../lib/panelStateText";
import { logger } from "../../utils/logger";
import { showToast } from "../GlobalToast";
import { PanelLoadFailure } from "../PanelLoadFailure";
import {
	type ToothHistoryEvent,
	toothHistoryAuthorLabel,
	toothHistoryEventsFromResponseBody,
} from "./toothHistoryEvents";

/**
 * Что видит человек в трёх состояниях панели.
 *
 * Пустота обязана говорить, ОТКУДА здесь берутся записи: список формируется из
 * дневников приёма по этому зубу, позиций плана лечения и смен статуса
 * (apps/api/src/routes/toothHistory.ts). Без этого «История пуста» выглядит как
 * поломка программы.
 */
const HISTORY_SUBJECT: PanelSubject = {
	notLoadedTitle: "История зуба не прочитана",
	accusative: "историю зуба",
	emptyTitle: "По этому зубу записей пока нет",
	emptyHint:
		"Записи появятся сами: из дневника приёма с этим номером зуба, из позиций плана лечения на этот зуб и из смен его статуса на схеме.",
	failureConsequence:
		"Не считайте, что с зубом ничего не делали: история не прочитана. Прежнее лечение, план и смены статуса могут быть в карте — их просто не удалось загрузить.",
};

/** Как прочитана история: загрузка, отказ с кодом ответа, прочитано. */
type HistoryLoadState =
	| { phase: "loading" }
	| { phase: "ready" }
	/** `status` — код ответа сервера; null — до сервера не дошли вовсе. */
	| { phase: "failed"; status: number | null };

interface Props {
	patientId: string;
	toothNumber: number;
	onClose: () => void;
}

export function ToothHistoryChronicle({
	patientId,
	toothNumber,
	onClose,
}: Props) {
	const [events, setEvents] = useState<ToothHistoryEvent[]>([]);
	const [load, setLoad] = useState<HistoryLoadState>({ phase: "loading" });
	/** Счётчик кнопки «Повторить»: меняется — запрос идёт заново. */
	const [_reloadToken, setReloadToken] = useState(0);

	useEffect(() => {
		let active = true;
		/*
		 * БЫЛО: события прошлого зуба оставались в состоянии до успешного ответа
		 * по новому. При смене зуба или пациента (панель не размонтируется —
		 * OdontogramModule.tsx только меняет пропсы) под заголовком «История зуба
		 * 36» несколько секунд висели записи зуба 11, а если новый запрос падал,
		 * они висели там навсегда. Врач читал чужое лечение как лечение этого зуба.
		 */
		setEvents([]);
		setLoad({ phase: "loading" });

		const fetchHistory = async () => {
			let status: number | null = null;
			try {
				const res = await fetch(
					`/api/odontogram/tooth-history/${patientId}/${toothNumber}`,
					{
						headers: denteAdminSecretRequestHeaders(),
					},
				);
				status = res.status;
				// Тело читается один раз строкой: на пустом теле res.json() бросает
				// исключение, а прежний код превращал и отказ, и испорченный ответ в
				// ту же пустую историю.
				const rawBody = await res.text();
				if (!res.ok) {
					// БЫЛО: `if (res.ok)` без ветки else — 403, 404 и 500 молча
					// оставляли пустой список, и панель печатала «История пуста».
					logger.error(`[tooth history] ${status} ${rawBody.slice(0, 300)}`);
					if (active) setLoad({ phase: "failed", status });
					return;
				}
				const parsed = toothHistoryEventsFromResponseBody(rawBody);
				if (!active) return;
				if (parsed === null) {
					// Успешный код и не тот ответ — это тоже непрочитанная история.
					logger.error(`[tooth history] ${status}: ответ не по контракту`);
					setLoad({ phase: "failed", status });
					return;
				}
				setEvents(parsed);
				setLoad({ phase: "ready" });
			} catch (e) {
				showToast(
					actionFailureToast(
						"Ошибка выполнения операции",
						(e as { status?: number })?.status ?? null,
					),
					"error",
				);
				logger.error("[tooth history] запрос не выполнен", e);
				// До сервера не дошли: кода ответа нет, и придумывать его нельзя.
				if (active) setLoad({ phase: "failed", status });
			}
		};
		void fetchHistory();
		return () => {
			active = false;
		};
	}, [patientId, toothNumber]);

	return (
		<div className="history-panel">
			<div className="history-header">
				<div className="history-title">
					<History className="w-5 h-5 text-indigo-500" />
					<h3>История зуба {toothNumber}</h3>
				</div>
				<button type="button" onClick={onClose} className="history-close-btn">
					<X className="w-5 h-5" />
				</button>
			</div>

			<div className="history-body">
				{load.phase === "loading" ? (
					<div className="history-loading">
						<div className="spinner" />
						{/* Крутящийся значок без слов не говорит, чего ждать. */}
						<div className="history-loading-text">
							{panelStateText(HISTORY_SUBJECT, { phase: "loading" }).title}
						</div>
					</div>
				) : load.phase === "failed" ? (
					/* Отказ чтения — отдельное состояние, а не «История пуста». */
					<PanelLoadFailure
						subject={HISTORY_SUBJECT}
						status={load.status}
						onRetry={() => setReloadToken((token) => token + 1)}
					/>
				) : events.length === 0 ? (
					<div className="history-empty">
						{/* Честная пустота: сервер ответил, записей действительно нет. */}
						<div className="history-empty-title">
							{panelStateText(HISTORY_SUBJECT, { phase: "empty" }).title}
						</div>
						<div className="history-empty-hint">
							{panelStateText(HISTORY_SUBJECT, { phase: "empty" }).hint}
						</div>
					</div>
				) : (
					<div className="history-timeline">
						{events
							.map((evt, idx) => ({
								evt,
								keyId: `evt-${evt.kind}-${evt.dateIso ?? "nodate"}-${evt.description ?? ""}-${idx}`,
							}))
							.map(({ evt, keyId }) => (
								<div key={keyId} className="timeline-item">
									<div className="timeline-icon">
										{evt.kind === "diary" ? (
											<FileText className="w-4 h-4 text-emerald-500" />
										) : evt.kind === "plan" ? (
											<Calendar className="w-4 h-4 text-blue-500" />
										) : evt.kind === "state_change" ? (
											<Activity className="w-4 h-4 text-amber-500" />
										) : (
											/* Вид события неизвестен. Значок смены статуса здесь стоял
										   как «иначе», то есть незнакомое событие выдавалось за
										   смену статуса зуба. Нейтральный значок ничего не
										   утверждает. */
											<History className="w-4 h-4 text-slate-400" />
										)}
									</div>
									<div className="timeline-content">
										<div className="timeline-date">
											{/* БЫЛО: new Date(evt.date).toLocaleDateString() — на
										    нечитаемой дате браузер печатал латиницей «Invalid
										    Date», а на дате без года читалось непонятно что.
										    Год полный: в карте важно, 2016-й это или 2026-й.
										    Часовой пояс тот же, что в AppHelpers.tsx, иначе одна
										    и та же запись показывала бы разные дни на разных
										    экранах. */}
											{evt.dateIso === null
												? "Дата не указана"
												: new Intl.DateTimeFormat("ru-RU", {
														day: "2-digit",
														month: "2-digit",
														year: "numeric",
														timeZone: "Europe/Samara",
													}).format(new Date(evt.dateIso))}
										</div>
										<div className="timeline-desc">
											{/* Описание на сервере — treatmentDescription || anamnesis,
										    и оба бывают пустыми. Пустая строка выглядела как
										    пропавшая запись. */}
											{evt.description ?? "Описание не заполнено"}
										</div>
										{/* БЫЛО: `Автор: {evt.authorId.substring(0, 8)}...` — ФИО врача
									    обрезалось до восьми знаков («Автор: Иванова ...»), слово
									    "System" печаталось латиницей, а «Не указан» превращалось
									    в обрубок «Не указа...». Кто лечил зуб — не мелочь, и
									    строка автора теперь есть у каждой записи, а не только
									    когда поле непустое. */}
										<div className="timeline-author">
											{toothHistoryAuthorLabel(evt.author)}
										</div>
									</div>
								</div>
							))}
					</div>
				)}
			</div>
		</div>
	);
}
