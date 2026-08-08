/**
 * Освободившиеся окна и кому их предложить.
 *
 * ЗАЧЕМ ЭТОТ ЭКРАН. Пациент отменил приём — в расписании остаётся пустое место,
 * то есть не остаётся ничего заметного. Час работы врача и кресла пропадает
 * молча, а в листе ожидания сидят люди, которые сами просили позвонить, когда
 * что-то освободится. До этого экрана лист ожидания и отмены в системе не были
 * связаны никак.
 *
 * ПОЧЕМУ КАНДИДАТЫ ПОКАЗАНЫ СРАЗУ, А НЕ ПО НАЖАТИЮ. Список «шесть свободных
 * окон» без имён заставляет открыть каждое, чтобы выяснить, что предлагать их
 * некому. Здесь у каждого окна сразу видно, есть ли кому звонить, и первым стоит
 * тот, кому это время действительно подходит.
 *
 * СИСТЕМА НИКОГО НЕ ЗАПИСЫВАЕТ САМА. Человек просил позвонить, а не поставить
 * его куда угодно; звонок ещё и защищает от накладки, когда одно окно достаётся
 * двоим. Поэтому здесь только телефон, объяснение и отметка «позвонил».
 */

import type React from "react";
import { actionFailureToast } from "../../lib/panelStateText";
import { showToast } from "../GlobalToast";
import { useCallback, useEffect, useState } from "react";
import { useAppLogicContext } from "../../contexts/AppLogicContext";
import { WaitlistMatchesBlock } from "./WaitlistMatchesBlock";

type WaitlistMatch = {
	entryId: string;
	patientId: string;
	patientName: string;
	phone: string | null;
	priorityLevel: string;
	waitingDays: number;
	sameDoctor: boolean;
	timeFits: boolean;
	alreadyBooked: boolean;
	reason: string;
};

type FreedSlot = {
	appointmentId: string;
	startsAt: string;
	endsAt: string;
	status: string;
	doctorName: string | null;
	freedBecause: string;
	topMatches: WaitlistMatch[];
	candidatesTotal: number;
};

type FreedSlotsReport = {
	slots: FreedSlot[];
	horizonDays: number;
	note: string;
};

/** «29 июля, 13:30» — так, как это произносят вслух, а не 2026-07-29T13:30. */
function formatMoment(iso: string): string {
	const parsed = new Date(iso);
	if (Number.isNaN(parsed.getTime())) return iso;
	return parsed.toLocaleString("ru-RU", {
		day: "numeric",
		month: "long",
		hour: "2-digit",
		minute: "2-digit",
	});
}

function formatDuration(fromIso: string, toIso: string): string {
	const minutes = Math.round(
		(new Date(toIso).getTime() - new Date(fromIso).getTime()) / 60_000,
	);
	if (!Number.isFinite(minutes) || minutes <= 0) return "";
	if (minutes < 60) return `${minutes} мин`;
	const hours = Math.floor(minutes / 60);
	const rest = minutes % 60;
	return rest > 0 ? `${hours} ч ${rest} мин` : `${hours} ч`;
}

export const FreedSlotsPanel: React.FC = () => {
	const appLogic = useAppLogicContext();
	const auth = appLogic?.auth;

	const [report, setReport] = useState<FreedSlotsReport | null>(null);
	const [error, setError] = useState<string | null>(null);
	/** Идёт ли запрос. Нужен для повтора: иначе кнопка молчит о том, что работает. */
	const [loading, setLoading] = useState(true);
	/**
	 * Кому уже позвонили. След на смену, а не запись в карточке.
	 *
	 * ОТМЕТКА ЖИВЁТ ПАРОЙ «ОКНО + ПАЦИЕНТ», А НЕ ОДНИМ ПАЦИЕНТОМ.
	 *
	 * ЧТО БЫЛО СЛОМАНО. В наборе лежал только patientId. Один и тот же человек из
	 * листа ожидания стоит первым кандидатом сразу к нескольким освободившимся
	 * окнам — это обычное дело: он ждёт запись, а за день отменились два приёма.
	 *
	 * ЧТО ВИДЕЛ АДМИНИСТРАТОР. Позвонил по первому окну, нажал «Позвонил» — и во
	 * ВТОРОЙ строке у того же человека сразу встало «Позвонили ✓», хотя про второе
	 * окно ему никто не говорил. Второе окно администратор пропускает как
	 * отработанное, и час кресла уходит в пустоту молча.
	 */
	const [called, setCalled] = useState<Set<string>>(new Set());
	/** Ключ отметки: окно и человек вместе. Один звонок — про одно окно. */
	const calledKey = (slotId: string, patientId: string | null | undefined) =>
		`${slotId}|${patientId ?? ""}`;
	/** Какое окно раскрыто: остальные показывают только сводку. */
	const [openSlot, setOpenSlot] = useState<string | null>(null);

	/*
		ОТКАЗ ОБЪЯСНЯЛСЯ ПО-АНГЛИЙСКИ И МАШИННЫМ ЯЗЫКОМ.

		ЧТО БЫЛО СЛОМАНО. Ответ разбирался как `await response.json()` без всякой
		защиты, а сообщение бралось прямо из тела сервера. Отсюда три беды:
		1. Нет сети — fetch бросает, и на экран уходило «Список не построен: Failed
		   to fetch».
		2. Прокси или сервер вернул страницу ошибки, а не JSON — разборщик бросал
		   своё, и человек читал «Unexpected token '<', "<html>" is not valid JSON».
		3. Сообщение сервера могло быть служебным английским («Internal Server
		   Error»): русскому экрану оно не объясняет ничего.

		ЧТО СТАЛО. Отказ сети, отказ сервера и «ответил не тем» — три разных
		человеческих объяснения. Сообщение сервера берём, только если оно
		по-русски: тогда оно точнее любого нашего. И на экране появилась кнопка
		повторить, потому что «не построен» без действия — тупик.
	*/
	const loadFailureText = useCallback(
		(status: number, serverMessage: string | null): string => {
			// Кириллица в сообщении сервера — признак, что оно написано для человека.
			if (serverMessage && /[а-яё]/i.test(serverMessage)) return serverMessage;
			if (status === 401 || status === 403)
				return "Нет прав смотреть освободившиеся окна: доступ закрыт или истёк вход в программу.";
			if (status === 404) return "Раздел освободившихся окон не отвечает.";
			if (status >= 500)
				return "Сбой на сервере клиники: список окон не собран.";
			return `Программа не смогла получить список окон (ответ ${status}).`;
		},
		[],
	);

	const load = useCallback(async () => {
		setError(null);
		setLoading(true);
		try {
			let response: Response;
			try {
				response = await fetch("/api/schedule/freed-slots", {
					headers: auth ? auth.denteClinicalReadHeaders() : {},
				});
			} catch {
				setReport(null);
				setError(
					"Сервер клиники не ответил. Проверьте, что программа клиники запущена и есть сеть.",
				);
				return;
			}
			// Тело читаем мягко: у страницы ошибки от прокси разбор JSON падает.
			const payload = (await response.json().catch((err) => {
				showToast(actionFailureToast("Ошибка ответа сервера", (err as { status?: number })?.status ?? null), "error");
				return null;
			})) as
				| (FreedSlotsReport & { message?: string })
				| null;
			if (!response.ok) {
				setReport(null);
				setError(loadFailureText(response.status, payload?.message ?? null));
				return;
			}
			if (!payload || !Array.isArray(payload.slots)) {
				setReport(null);
				setError("Сервер ответил, но списка окон в ответе нет.");
				return;
			}
			setReport(payload);
		} finally {
			setLoading(false);
		}
	}, [auth, loadFailureText]);

	useEffect(() => {
		void load();
	}, [load]);

	// Панель молчит, когда окон нет: пустой блок «свободных окон нет» в расписании
	// каждый день — это шум, а не сообщение.
	if (report !== null && report.slots.length === 0 && !error) return null;

	return (
		<section className="panel ops-panel" data-testid="freed-slots-panel">
			<div className="panel-heading">
				<h2>Освободившиеся окна</h2>
				{report ? (
					<span
						className={`status-pill ${report.slots.length > 0 ? "status-arrived" : "status-planned"}`}
					>
						{report.slots.length}
					</span>
				) : null}
			</div>

			{error ? (
				<div className="ops-notice ops-notice--error" role="alert">
					<p>{error}</p>
					<p>
						Освободившиеся окна сейчас не видны, но они есть: это отменённые и
						пропущенные приёмы за ближайшие дни. Пока список не открылся, время
						таких приёмов считайте свободным и сверяйтесь с расписанием дня
						вручную, иначе час кресла простоит зря.
					</p>
					<button
						className="secondary-button"
						type="button"
						onClick={() => void load()}
						disabled={loading}
					>
						{loading ? "Загружаю…" : "Попробовать снова"}
					</button>
				</div>
			) : null}

			{report === null && !error ? (
				<div className="ops-skeleton" aria-hidden="true">
					<span className="ops-skeleton__line" />
					<span className="ops-skeleton__line" />
				</div>
			) : null}

			{report ? (
				<>
					<div className="ops-table-wrap">
						<table className="ops-table">
							<caption className="sr-only">
								Окна, освободившиеся после отмены или неявки
							</caption>
							<thead>
								<tr>
									<th scope="col">Когда</th>
									<th scope="col">Врач</th>
									<th scope="col">Почему освободилось</th>
									<th scope="col">Кому предложить</th>
								</tr>
							</thead>
							<tbody>
								{report.slots.map((slot) => {
									const isOpen = openSlot === slot.appointmentId;
									const best = slot.topMatches[0];

									return (
										<tr key={slot.appointmentId}>
											<td className="ops-strong" data-label="Когда">
												{formatMoment(slot.startsAt)}
												<span className="ops-note">
													{formatDuration(slot.startsAt, slot.endsAt)}
												</span>
											</td>
											<td data-label="Врач">
												{slot.doctorName ?? "врач не указан"}
											</td>
											<td data-label="Почему освободилось">
												<span
													className={`ops-state ops-state--${slot.status === "no_show" ? "bad" : "warn"}`}
												>
													{slot.freedBecause}
												</span>
											</td>
											<td data-label="Кому предложить">
												{slot.topMatches.length === 0 ? (
													/*
														Предлагать некому — и это сказано словами, а не пустой
														ячейкой. Пустота читается как «не загрузилось».
														Кнопка «полный подбор» всё равно есть: topMatches
														ограничен тремя, а в очереди могут быть люди, которых
														сводка не показала как «подходящих» (другой врач и т.п.).
													*/
													<>
														<span className="ops-note">
															В листе ожидания подходящих нет
															{slot.candidatesTotal > 0
																? ` (в очереди ${slot.candidatesTotal})`
																: ", очередь пуста"}
															. Окно можно отдать под запись с улицы.
														</span>
														{slot.candidatesTotal > 0 ? (
															<button
																className="link-button"
																type="button"
																onClick={() =>
																	setOpenSlot(
																		isOpen ? null : slot.appointmentId,
																	)
																}
															>
																{isOpen
																	? "Скрыть полный подбор"
																	: "Полный подбор из очереди"}
															</button>
														) : null}
														{isOpen ? (
															<div style={{ marginTop: 8 }}>
																<WaitlistMatchesBlock
																	appointmentId={slot.appointmentId}
																	compact
																/>
															</div>
														) : null}
													</>
												) : (
													<>
														<span className="ops-strong">
															{best?.patientName}
														</span>
														<span className="ops-note">
															{best?.phone ?? "телефон не указан"}
														</span>
														<span className="ops-note">{best?.reason}</span>
														{called.has(
															calledKey(slot.appointmentId, best?.patientId),
														) ? (
															<span className="ops-note">Позвонили ✓</span>
														) : (
															<button
																className="secondary-button"
																type="button"
																disabled={!best?.phone}
																onClick={() =>
																	setCalled((previous) =>
																		new Set(previous).add(
																			calledKey(
																				slot.appointmentId,
																				best?.patientId,
																			),
																		),
																	)
																}
															>
																Позвонил
															</button>
														)}
														{/*
															Раньше «Ещё N» раскрывало только остальных из top-3.
															Полный GET waitlist-matches отдаёт до 20 с теми же
															правилами сортировки — его и показываем при раскрытии.
														*/}
														<button
															className="link-button"
															type="button"
															onClick={() =>
																setOpenSlot(isOpen ? null : slot.appointmentId)
															}
															data-testid={`freed-slot-expand-${slot.appointmentId}`}
														>
															{isOpen
																? "Скрыть полный подбор"
																: slot.candidatesTotal > slot.topMatches.length
																	? `Все из очереди (${slot.candidatesTotal})`
																	: slot.topMatches.length > 1
																		? `Ещё ${slot.topMatches.length - 1} и полный подбор`
																		: "Полный подбор"}
														</button>
														{isOpen ? (
															<div
																style={{ marginTop: 8 }}
																data-testid="freed-slot-full-matches"
															>
																<WaitlistMatchesBlock
																	appointmentId={slot.appointmentId}
																	compact
																/>
															</div>
														) : null}
													</>
												)}
											</td>
										</tr>
									);
								})}
							</tbody>
						</table>
					</div>

					<p className="ops-hint">{report.note}</p>
				</>
			) : null}
		</section>
	);
};

export default FreedSlotsPanel;
