/**
 * Кого пора пригласить обратно.
 *
 * ЧТО БЫЛО. Экран «потерянные пациенты» (LostPatientsFiltersWidget) читал
 * таблицу lost_patients_filters, в которую в проекте НИКТО не пишет — проверено
 * поиском по всем исходникам. То есть список был снимком, сделанным неизвестно
 * когда, и обновиться не мог: пациент записался вчера, а экран продолжал звать
 * его вернуться.
 *
 * ЗДЕСЬ список считается по текущим данным при каждом открытии.
 *
 * ПОЧЕМУ ПОЛОСЫ, А НЕ ОДИН СПИСОК. «Полгода без осмотра» и «не был два с
 * половиной года» — разные разговоры. Первому звонят с приглашением на
 * профилактику, второму, скорее всего, звонить уже поздно, и держать их в одном
 * списке значит утопить первых во вторых.
 *
 * ЗВОНОК ПРОТИВ СООБЩЕНИЯ. Приглашение сообщением — это реклама услуги, для неё
 * нужно согласие (ФЗ «О рекламе» ст. 18 ч. 1), и очередь его проверит.
 * Позвонить можно любому: звонок конкретному человеку рассылкой не является.
 * Поэтому кнопка звонка есть всегда, а результат отправки честно говорит, если
 * согласия не было.
 */

import type React from "react";
import { useCallback, useEffect, useState } from "react";
import { useAppLogicContext } from "../../contexts/AppLogicContext";
import { countLabel } from "../../lib/russianPlural";

type RecallBand = "due" | "overdue" | "probably_lost" | "never_arrived";

type RecallCandidate = {
	patientId: string;
	fullName: string;
	phone: string | null;
	email: string | null;
	lastCompletedAt: string | null;
	monthsSinceLastVisit: number | null;
	band: RecallBand;
	reason: string;
};

type RecallReport = {
	candidates: RecallCandidate[];
	byBand: Record<RecallBand, number>;
	examinedPatients: number;
	note: string;
};

const BAND_TITLES: Record<RecallBand, string> = {
	due: "Пора на профилактику",
	overdue: "Пропустил осмотр",
	never_arrived: "Не дошёл ни разу",
	probably_lost: "Скорее всего ушёл"
};

/** Полосы, к которым приглашение уместно. Ушедшим два года назад — уже нет. */
const INVITABLE: RecallBand[] = ["due", "overdue"];

/**
 * Почему приглашение не предлагается. Причины РАЗНЫЕ, и общая фраза «слишком
 * давно» была прямой неправдой для того, кто ни разу не дошёл: там дело не в
 * давности, а в том, что человек и не начинал лечиться. Замечено на снимке.
 */
const NOT_INVITABLE_REASON: Record<string, string> = {
	probably_lost: "Приглашение не предлагается: прошло больше двух лет, такое сообщение читается как спам.",
	never_arrived: "Приглашение не предлагается: сначала стоит позвонить и выяснить, почему не дошёл."
};

function formatDate(value: string | null): string {
	if (!value) return "приёмов не было";
	const parsed = new Date(value);
	return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleDateString("ru-RU");
}

/** Текст приглашения. Короткий: это SMS, и за длину платит клиника. */
function invitationText(candidate: RecallCandidate, clinicName: string): string {
	const name = candidate.fullName.split(" ")[1] ?? candidate.fullName;
	return `${name}, здравствуйте! ${clinicName}: прошло больше полугода с последнего осмотра — самое время проверить зубы. Записаться можно по телефону клиники.`;
}

export const RecallListPanel: React.FC = () => {
	const appLogic = useAppLogicContext();
	const auth = appLogic?.auth;
	const clinicName = appLogic?.dashboard?.clinic?.name ?? "Клиника";

	const [report, setReport] = useState<RecallReport | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [notice, setNotice] = useState<string | null>(null);
	const [busyPatient, setBusyPatient] = useState<string | null>(null);
	const [called, setCalled] = useState<Set<string>>(new Set());
	/**
	 * Выбранная полоса. Администратор работает с одной группой за раз: сегодня
	 * обзванивает тех, кому пора на профилактику, и «ушедшие два года назад» ему
	 * в этом списке только мешают.
	 */
	const [activeBand, setActiveBand] = useState<RecallBand | null>(null);

	const load = useCallback(async () => {
		setError(null);
		try {
			const response = await fetch("/api/patients/recall-candidates", {
				headers: auth ? auth.denteClinicalReadHeaders() : {}
			});
			const payload = (await response.json()) as RecallReport & { message?: string };
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

	async function invite(candidate: RecallCandidate) {
		setBusyPatient(candidate.patientId);
		setNotice(null);
		try {
			const response = await fetch("/api/patients/recall-candidates/invite", {
				method: "POST",
				headers: { ...(auth ? auth.denteClinicalMutationHeaders() : {}), "content-type": "application/json" },
				body: JSON.stringify({
					patientId: candidate.patientId,
					channel: "sms",
					body: invitationText(candidate, clinicName)
				})
			});
			const payload = (await response.json()) as { message?: string };
			setNotice(payload.message ?? (response.ok ? "Приглашение поставлено в очередь." : `Сервер ответил ${response.status}`));
		} catch (inviteError) {
			setNotice(inviteError instanceof Error ? inviteError.message : String(inviteError));
		} finally {
			setBusyPatient(null);
		}
	}

	/** Отметка «позвонил» живёт до обновления страницы: это след на утро, а не запись в карточке. */
	function markCalled(patientId: string) {
		setCalled((previous) => new Set(previous).add(patientId));
	}

	return (
		<section className="panel ops-panel" data-testid="recall-list-panel">
			<div className="panel-heading">
				<h2>Пора пригласить</h2>
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

			{report === null && !error ? (
				<div className="ops-skeleton" aria-hidden="true">
					<span className="ops-skeleton__line" />
					<span className="ops-skeleton__line" />
				</div>
			) : null}

			{report ? (
				report.candidates.length === 0 ? (
					<p className="ops-empty ops-empty--good">
						{/* БЫЛО: «Просмотрено 1 карточек» — число подставлялось к
						    неизменяемому слову. Согласование берём из общей countLabel. */}
						Звать некого: все, кто лечился, либо были недавно, либо уже записаны. Просмотрено{" "}
						{countLabel(report.examinedPatients, "карточка", "карточки", "карточек")}.
					</p>
				) : (
					<>
						{/* Плитки одновременно и итог, и фильтр: повторное нажатие снимает
						    отбор. Отдельная строка фильтров рядом с теми же числами была
						    бы дублированием одного и того же на экране. */}
						<ul className="ops-metrics">
							{(Object.keys(BAND_TITLES) as RecallBand[])
								.filter((band) => report.byBand[band] > 0)
								.map((band) => (
									<li key={band}>
										<button
											type="button"
											className={`ops-metric ops-metric--button ${band === "due" ? "ops-metric--primary" : ""} ${
												activeBand === band ? "ops-metric--selected" : ""
											}`}
											aria-pressed={activeBand === band}
											onClick={() => setActiveBand((previous) => (previous === band ? null : band))}
										>
											<span className="ops-metric__value">{report.byBand[band]}</span>
											<span className="ops-metric__label">{BAND_TITLES[band]}</span>
										</button>
									</li>
								))}
						</ul>

						{activeBand ? (
							<p className="ops-hint">
								Показана одна группа: «{BAND_TITLES[activeBand]}».{" "}
								<button className="link-button" type="button" onClick={() => setActiveBand(null)}>
									Показать всех
								</button>
							</p>
						) : null}

						<div className="ops-table-wrap">
							<table className="ops-table">
								<caption className="sr-only">Пациенты, которых пора пригласить на осмотр</caption>
								<thead>
									<tr>
										<th scope="col">Пациент</th>
										<th scope="col">Последний приём</th>
										<th scope="col">Почему в списке</th>
										<th scope="col">Что делать</th>
									</tr>
								</thead>
								<tbody>
									{report.candidates
										.filter((candidate) => activeBand === null || candidate.band === activeBand)
										.map((candidate) => {
										const busy = busyPatient === candidate.patientId;
										const wasCalled = called.has(candidate.patientId);

										return (
											<tr className={wasCalled ? "ops-row--done" : ""} key={candidate.patientId}>
												<td className="ops-strong" data-label="Пациент">
													{candidate.fullName}
													<span className="ops-note">{candidate.phone ?? "телефон не указан"}</span>
												</td>
												<td data-label="Последний приём">
													<span className="ops-time">{formatDate(candidate.lastCompletedAt)}</span>
													<span className="ops-note">
														{candidate.monthsSinceLastVisit === null
															? "завершённых приёмов не было"
															: `${candidate.monthsSinceLastVisit} мес. назад`}
													</span>
												</td>
												<td data-label="Почему в списке">
													<span className={`ops-state ops-state--${candidate.band === "due" ? "ok" : "warn"}`}>
														{BAND_TITLES[candidate.band]}
													</span>
													<span className="ops-note">{candidate.reason}</span>
												</td>
												<td data-label="Что делать">
													{/* Звонок доступен всегда: он не рассылка и согласия не требует. */}
													<button
														className="secondary-button"
														type="button"
														disabled={!candidate.phone}
														onClick={() => markCalled(candidate.patientId)}
													>
														{wasCalled ? "Позвонил ✓" : "Позвонил"}
													</button>
													{INVITABLE.includes(candidate.band) ? (
														<button
															className="secondary-button"
															type="button"
															disabled={busy || !candidate.phone}
															onClick={() => void invite(candidate)}
														>
															{busy ? "Отправляю…" : "Пригласить SMS"}
														</button>
													) : (
														<span className="ops-note">
															{NOT_INVITABLE_REASON[candidate.band] ?? "Приглашение не предлагается."}
														</span>
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
				)
			) : null}
		</section>
	);
};

export default RecallListPanel;
