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
import { useCallback, useEffect, useState } from "react";
import { useAppLogicContext } from "../../contexts/AppLogicContext";

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
	return parsed.toLocaleString("ru-RU", { day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" });
}

function formatDuration(fromIso: string, toIso: string): string {
	const minutes = Math.round((new Date(toIso).getTime() - new Date(fromIso).getTime()) / 60_000);
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

	const load = useCallback(async () => {
		setError(null);
		try {
			const response = await fetch("/api/schedule/freed-slots", {
				headers: auth ? auth.denteClinicalReadHeaders() : {}
			});
			const payload = (await response.json()) as FreedSlotsReport & { message?: string };
			if (!response.ok) throw new Error(payload.message ?? `Сервер ответил ${response.status}`);
			setReport(payload);
		} catch (loadError) {
			setReport(null);
			setError(loadError instanceof Error ? loadError.message : String(loadError));
		}
	}, [auth]);

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
					<span className={`status-pill ${report.slots.length > 0 ? "status-arrived" : "status-planned"}`}>
						{report.slots.length}
					</span>
				) : null}
			</div>

			{error ? (
				<p className="ops-notice ops-notice--error" role="alert">
					Список не построен: {error}
				</p>
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
							<caption className="sr-only">Окна, освободившиеся после отмены или неявки</caption>
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
												<span className="ops-note">{formatDuration(slot.startsAt, slot.endsAt)}</span>
											</td>
											<td data-label="Врач">{slot.doctorName ?? "врач не указан"}</td>
											<td data-label="Почему освободилось">
												<span className={`ops-state ops-state--${slot.status === "no_show" ? "bad" : "warn"}`}>
													{slot.freedBecause}
												</span>
											</td>
											<td data-label="Кому предложить">
												{slot.topMatches.length === 0 ? (
													/*
														Предлагать некому — и это сказано словами, а не пустой
														ячейкой. Пустота читается как «не загрузилось».
													*/
													<span className="ops-note">
														В листе ожидания подходящих нет
														{slot.candidatesTotal > 0 ? ` (в очереди ${slot.candidatesTotal})` : ", очередь пуста"}. Окно
														можно отдать под запись с улицы.
													</span>
												) : (
													<>
														<span className="ops-strong">{best?.patientName}</span>
														<span className="ops-note">{best?.phone ?? "телефон не указан"}</span>
														<span className="ops-note">{best?.reason}</span>
														{called.has(calledKey(slot.appointmentId, best?.patientId)) ? (
															<span className="ops-note">Позвонили ✓</span>
														) : (
															<button
																className="secondary-button"
																type="button"
																disabled={!best?.phone}
																onClick={() =>
																	setCalled((previous) =>
																		new Set(previous).add(
																			calledKey(slot.appointmentId, best?.patientId)
																		)
																	)
																}
															>
																Позвонил
															</button>
														)}
														{slot.topMatches.length > 1 ? (
															<button
																className="link-button"
																type="button"
																onClick={() => setOpenSlot(isOpen ? null : slot.appointmentId)}
															>
																{isOpen ? "Скрыть остальных" : `Ещё ${slot.topMatches.length - 1}`}
															</button>
														) : null}
														{isOpen
															? slot.topMatches.slice(1).map((match) => (
																	<span className="ops-note" key={match.entryId}>
																		<strong>{match.patientName}</strong> · {match.phone ?? "телефона нет"} ·{" "}
																		{match.reason}
																	</span>
																))
															: null}
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
