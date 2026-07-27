/**
 * Разбор дублей пациентов: найти, сверить, объединить или отклонить.
 *
 * ЧТО БЫЛО. Виджет запрашивал /api/crm/patient-duplicate-merge-queues —
 * маршрута с таким адресом не существует, проверено живым запросом: 404. То
 * есть виджет всегда показывал «Дубликаты карточек пациентов не обнаружены»
 * независимо от того, сколько их в базе, и назывался при этом «фоновый
 * склейщик», которого тоже нет. Кнопок не было: ни объединить, ни отклонить.
 *
 * ЧТО ЗДЕСЬ ТЕПЕРЬ. Запрос идёт в работающий /api/patients/duplicates, который
 * ищет дубли по текущим данным. У каждой пары есть кнопки «Объединить» и «Это
 * разные люди», и обе действительно меняют данные.
 *
 * ГЛАВНОЕ В УСТРОЙСТВЕ ЭКРАНА: объединение медицинских карт необратимо по
 * смыслу, поэтому оно не делается одним нажатием. Сначала показывается, чем
 * пары похожи и чем могут отличаться, у сомнительных стоит предупреждение
 * («скорее всего это родственники»), и только потом — подтверждение с прямым
 * указанием, какая карточка останется.
 */

import React, { useCallback, useEffect, useState } from "react";

type DuplicateReason =
	| "same_name_and_birth_date"
	| "same_name_birth_date_unknown"
	| "same_phone_and_surname"
	| "same_phone_only"
	| "same_email";

type DuplicateSide = {
	patientId: string;
	fullName: string;
	phone: string | null;
	birthDate: string | null;
	email: string | null;
};

type DuplicateCandidate = {
	leftPatientId: string;
	leftName: string;
	left: DuplicateSide;
	rightPatientId: string;
	rightName: string;
	right: DuplicateSide;
	reason: DuplicateReason;
	confidence: number;
	explanation: string;
	caution: string | null;
};

/** Дата рождения в человеческом виде: «10.01.1970», а не «1970-01-10». */
function formatBirthDate(value: string | null): string {
	if (!value) return "дата рождения не указана";
	const parsed = new Date(value);
	if (Number.isNaN(parsed.getTime())) return value;
	return parsed.toLocaleDateString("ru-RU");
}

type DuplicateReport = {
	candidates: DuplicateCandidate[];
	examinedPatients: number;
	dismissedPairs: number;
	note: string;
};

/** Порог, ниже которого пара показывается как сомнительная. */
const DOUBTFUL_BELOW = 0.6;

async function readJson<T>(response: Response): Promise<T> {
	const payload = (await response.json().catch(() => null)) as unknown;
	if (!response.ok) {
		const message =
			payload && typeof payload === "object" && "message" in payload && typeof payload.message === "string"
				? payload.message
				: `Сервер ответил ${response.status}`;
		throw new Error(message);
	}
	return payload as T;
}

function pairKey(candidate: DuplicateCandidate): string {
	return `${candidate.leftPatientId}|${candidate.rightPatientId}`;
}

export const PatientDuplicateMergeQueuesWidget: React.FC = () => {
	const [report, setReport] = useState<DuplicateReport | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [loading, setLoading] = useState(true);
	const [busyPair, setBusyPair] = useState<string | null>(null);
	const [notice, setNotice] = useState<string | null>(null);
	/** Пара, для которой открыто подтверждение, и какая карточка останется. */
	const [confirming, setConfirming] = useState<{ key: string; keepLeft: boolean } | null>(null);

	const load = useCallback(async () => {
		setLoading(true);
		setError(null);
		try {
			const response = await fetch("/api/patients/duplicates");
			setReport(await readJson<DuplicateReport>(response));
		} catch (loadError) {
			setReport(null);
			setError(loadError instanceof Error ? loadError.message : String(loadError));
		} finally {
			setLoading(false);
		}
	}, []);

	useEffect(() => {
		void load();
	}, [load]);

	async function merge(candidate: DuplicateCandidate, keepLeft: boolean) {
		const key = pairKey(candidate);
		setBusyPair(key);
		setNotice(null);
		try {
			const response = await fetch("/api/patients/duplicates/merge", {
				method: "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({
					primaryPatientId: keepLeft ? candidate.leftPatientId : candidate.rightPatientId,
					duplicatePatientId: keepLeft ? candidate.rightPatientId : candidate.leftPatientId
				})
			});
			const data = await readJson<{ summary: string }>(response);
			setNotice(data.summary);
			setConfirming(null);
			await load();
		} catch (mergeError) {
			setNotice(mergeError instanceof Error ? mergeError.message : String(mergeError));
		} finally {
			setBusyPair(null);
		}
	}

	async function dismiss(candidate: DuplicateCandidate) {
		const key = pairKey(candidate);
		setBusyPair(key);
		setNotice(null);
		try {
			const response = await fetch("/api/patients/duplicates/dismiss", {
				method: "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({ leftPatientId: candidate.leftPatientId, rightPatientId: candidate.rightPatientId })
			});
			const data = await readJson<{ message: string }>(response);
			setNotice(data.message);
			await load();
		} catch (dismissError) {
			setNotice(dismissError instanceof Error ? dismissError.message : String(dismissError));
		} finally {
			setBusyPair(null);
		}
	}

	return (
		<section className="panel ops-panel" data-testid="patient-duplicate-merge-queues-widget">
			<div className="panel-heading">
				<h2>Дубли карточек пациентов</h2>
				{report ? (
					<span className="status-pill status-planned">просмотрено карточек: {report.examinedPatients}</span>
				) : null}
			</div>

			{error ? (
				<p className="ops-notice ops-notice--error" role="alert">
					Список не построен: {error}
				</p>
			) : null}

			{notice ? (
				<p className="ops-notice" role="status" aria-live="polite">
					{notice}
				</p>
			) : null}

			{loading && report === null ? (
				<div className="ops-skeleton" aria-hidden="true">
					<span className="ops-skeleton__line" />
					<span className="ops-skeleton__line" />
				</div>
			) : null}

			{report ? (
				report.candidates.length === 0 ? (
					<p className="ops-empty ops-empty--good">
						Похожих карточек не найдено: просмотрено {report.examinedPatients}. Картотека чистая.
					</p>
				) : (
					<>
						<div className="ops-table-wrap">
							<table className="ops-table">
								<caption className="sr-only">Пары похожих карточек пациентов</caption>
								<thead>
									<tr>
										<th scope="col">Первая карточка</th>
										<th scope="col">Вторая карточка</th>
										<th scope="col">Чем похожи</th>
										<th scope="col">Что делать</th>
									</tr>
								</thead>
								<tbody>
									{report.candidates.map((candidate) => {
										const key = pairKey(candidate);
										const doubtful = candidate.confidence < DOUBTFUL_BELOW;
										const isBusy = busyPair === key;
										const isConfirming = confirming?.key === key;

										return (
											<tr key={key}>
												{/*
													Телефон и дата рождения обязательны на экране: по одним
													именам дубль от тёзки не отличить, и решение принималось
													бы вслепую.
												*/}
												<td className="ops-strong" data-label="Первая карточка">
													{candidate.leftName}
													<span className="ops-note">{formatBirthDate(candidate.left.birthDate)}</span>
													<span className="ops-note">{candidate.left.phone ?? "телефон не указан"}</span>
													{candidate.left.email ? <span className="ops-note">{candidate.left.email}</span> : null}
												</td>
												<td className="ops-strong" data-label="Вторая карточка">
													{candidate.rightName}
													<span className="ops-note">{formatBirthDate(candidate.right.birthDate)}</span>
													<span className="ops-note">{candidate.right.phone ?? "телефон не указан"}</span>
													{candidate.right.email ? <span className="ops-note">{candidate.right.email}</span> : null}
												</td>
												<td data-label="Чем похожи">
													<span className={`ops-state ops-state--${doubtful ? "warn" : "ok"}`}>
														{Math.round(candidate.confidence * 100)} % совпадения
													</span>
													<span className="ops-note">{candidate.explanation}</span>
													{candidate.caution ? (
														// Предупреждение обязательно: одинаковый телефон чаще всего
														// означает родню, а не дубль.
														<span className="ops-note">
															<strong>Осторожно:</strong> {candidate.caution}
														</span>
													) : null}
												</td>
												<td data-label="Что делать">
													{isConfirming ? (
														<>
															<span className="ops-note">
																Останется карточка «{confirming.keepLeft ? candidate.leftName : candidate.rightName}».
																Вторая станет архивной ссылкой, ничего не удалится.
															</span>
															<button
																className="primary-button"
																type="button"
																disabled={isBusy}
																onClick={() => void merge(candidate, confirming.keepLeft)}
															>
																{isBusy ? "Объединяю…" : "Подтвердить объединение"}
															</button>
															<button className="secondary-button" type="button" onClick={() => setConfirming(null)}>
																Отмена
															</button>
														</>
													) : (
														<>
															<button
																className="secondary-button"
																type="button"
																disabled={isBusy}
																onClick={() => setConfirming({ key, keepLeft: true })}
															>
																Оставить первую
															</button>
															<button
																className="secondary-button"
																type="button"
																disabled={isBusy}
																onClick={() => setConfirming({ key, keepLeft: false })}
															>
																Оставить вторую
															</button>
															<button
																className="secondary-button"
																type="button"
																disabled={isBusy}
																onClick={() => void dismiss(candidate)}
															>
																Это разные люди
															</button>
														</>
													)}
												</td>
											</tr>
										);
									})}
								</tbody>
							</table>
						</div>

						<p className="ops-hint">
							{report.note}
							{report.dismissedPairs > 0
								? ` Скрыто пар по решению «это разные люди»: ${report.dismissedPairs}.`
								: ""}{" "}
							При объединении вторая карточка не удаляется: она остаётся архивной ссылкой на первую, а все
							записи, оплаты и снимки переносятся.
						</p>
					</>
				)
			) : null}
		</section>
	);
};

export default PatientDuplicateMergeQueuesWidget;
