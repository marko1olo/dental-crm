/**
 * Кому предложить конкретное освободившееся окно.
 *
 * ЗАЧЕМ. API GET /api/appointments/:appointmentId/waitlist-matches уже считал
 * полный список кандидатов с объяснением (тот же врач, время, срочность,
 * давность), но веб его ни разу не вызывал. FreedSlotsPanel брал только
 * topMatches (до 3) из /api/schedule/freed-slots — для сводки хватает, а когда
 * администратор открывает отменённый приём в расписании или раскрывает окно
 * «ещё N», нужен полный подбор, иначе звонят не тому.
 *
 * СИСТЕМА НИКОГО НЕ ЗАПИСЫВАЕТ. Здесь телефон, причина и «Позвонил» — запись
 * делает человек через форму приёма / лист ожидания.
 */

import type React from "react";
import { useCallback, useEffect, useState } from "react";
import { useAppLogicContext } from "../../contexts/AppLogicContext";

export type WaitlistMatchRow = {
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

type WaitlistMatchReport = {
	appointmentId: string;
	slot: { from: string; to: string; doctorName: string | null };
	matches: WaitlistMatchRow[];
	examinedEntries: number;
	note: string;
};

const PRIORITY_LABELS: Record<string, string> = {
	high: "Срочный",
	medium: "Обычный",
	low: "Низкий",
};

function loadFailureText(status: number, serverMessage: string | null): string {
	if (serverMessage && /[а-яё]/i.test(serverMessage)) return serverMessage;
	if (status === 401 || status === 403) {
		return "Нет прав смотреть подбор из листа ожидания: доступ закрыт или истёк вход.";
	}
	if (status === 404) return "Приём не найден — подбор недоступен.";
	if (status === 400) {
		return "Подбор нужен только для отменённого или пропущенного будущего приёма.";
	}
	if (status >= 500) return "Сбой на сервере клиники: список кандидатов не собран.";
	return `Программа не смогла получить подбор (ответ ${status}).`;
}

export type WaitlistMatchesBlockProps = {
	/** Id отменённого / no_show приёма, чьё окно предлагаем. */
	appointmentId: string;
	/**
	 * Компактный вид внутри карточки приёма (без большой рамки панели).
	 * Полный — внутри FreedSlotsPanel при раскрытии.
	 */
	compact?: boolean;
	/** Не грузить сразу — только по кнопке (для «ещё N» в freed-slots). */
	lazy?: boolean;
	/** Подпись кнопки ленивой загрузки. */
	lazyLabel?: string;
};

export const WaitlistMatchesBlock: React.FC<WaitlistMatchesBlockProps> = ({
	appointmentId,
	compact = false,
	lazy = false,
	lazyLabel = "Показать всех из листа ожидания",
}) => {
	const appLogic = useAppLogicContext();
	const auth = appLogic?.auth;

	const [report, setReport] = useState<WaitlistMatchReport | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [loading, setLoading] = useState(!lazy);
	const [started, setStarted] = useState(!lazy);
	const [called, setCalled] = useState<Set<string>>(new Set());

	const load = useCallback(async () => {
		if (!appointmentId) return;
		setError(null);
		setLoading(true);
		setStarted(true);
		try {
			let response: Response;
			try {
				response = await fetch(`/api/appointments/${encodeURIComponent(appointmentId)}/waitlist-matches`, {
					headers: auth?.denteClinicalReadHeaders ? auth.denteClinicalReadHeaders() : {},
				});
			} catch {
				setReport(null);
				setError(
					"Сервер клиники не ответил. Проверьте, что программа клиники запущена и есть сеть.",
				);
				return;
			}
			const payload = (await response.json().catch(() => null)) as
				| (WaitlistMatchReport & { message?: string })
				| null;
			if (!response.ok) {
				setReport(null);
				setError(loadFailureText(response.status, payload?.message ?? null));
				return;
			}
			if (!payload || !Array.isArray(payload.matches)) {
				setReport(null);
				setError("Сервер ответил, но списка кандидатов в ответе нет.");
				return;
			}
			setReport({
				appointmentId: payload.appointmentId ?? appointmentId,
				slot: payload.slot ?? { from: "", to: "", doctorName: null },
				matches: payload.matches,
				examinedEntries: Number(payload.examinedEntries) || payload.matches.length,
				note: typeof payload.note === "string" ? payload.note : "",
			});
		} finally {
			setLoading(false);
		}
	}, [appointmentId, auth]);

	useEffect(() => {
		if (!lazy && appointmentId) {
			void load();
		}
	}, [lazy, appointmentId, load]);

	// Смена приёма — сбрасываем отметки «позвонил» (они про другое окно).
	useEffect(() => {
		setCalled(new Set());
		if (lazy) {
			setStarted(false);
			setReport(null);
			setError(null);
			setLoading(false);
		}
	}, [appointmentId, lazy]);

	if (lazy && !started) {
		return (
			<div className="waitlist-matches-block" data-testid="waitlist-matches-lazy">
				<button
					type="button"
					className="link-button"
					data-testid="waitlist-matches-load-btn"
					onClick={() => void load()}
				>
					{lazyLabel}
				</button>
			</div>
		);
	}

	const shellClass = compact
		? "waitlist-matches-block waitlist-matches-block--compact"
		: "waitlist-matches-block panel ops-panel";

	return (
		<section
			className={shellClass}
			data-testid="waitlist-matches-block"
			data-appointment-id={appointmentId}
			aria-label="Кому предложить это окно из листа ожидания"
		>
			{!compact ? (
				<div className="panel-heading">
					<h3 style={{ margin: 0, fontSize: "0.95rem" }}>Кому предложить это окно</h3>
					{report ? (
						<span className={`status-pill ${report.matches.length > 0 ? "status-arrived" : "status-planned"}`}>
							{report.matches.length}
						</span>
					) : null}
				</div>
			) : (
				<div
					style={{
						display: "flex",
						alignItems: "center",
						justifyContent: "space-between",
						gap: 8,
						marginBottom: 6,
					}}
				>
					<strong style={{ fontSize: 12, letterSpacing: "0.04em", textTransform: "uppercase", color: "var(--muted)" }}>
						Лист ожидания · кому звонить
					</strong>
					<button
						type="button"
						className="link-button"
						data-testid="waitlist-matches-refresh"
						onClick={() => void load()}
						disabled={loading}
						style={{ fontSize: 12 }}
					>
						{loading ? "Обновляю…" : "Обновить"}
					</button>
				</div>
			)}

			{error ? (
				<div className="ops-notice ops-notice--error" role="alert" data-testid="waitlist-matches-error">
					<p>{error}</p>
					<button className="secondary-button" type="button" onClick={() => void load()} disabled={loading}>
						{loading ? "Загружаю…" : "Попробовать снова"}
					</button>
				</div>
			) : null}

			{loading && !report && !error ? (
				<p className="ops-note" data-testid="waitlist-matches-loading" style={{ margin: "6px 0" }}>
					Подбираю кандидатов из листа ожидания…
				</p>
			) : null}

			{report && report.matches.length === 0 && !error ? (
				<p className="ops-note" data-testid="waitlist-matches-empty" style={{ margin: "6px 0" }}>
					В листе ожидания подходящих нет
					{report.examinedEntries > 0
						? ` (смотрели ${report.examinedEntries} в очереди)`
						: ", очередь пуста"}
					. Окно можно отдать под запись с улицы.
				</p>
			) : null}

			{report && report.matches.length > 0 ? (
				<ul
					data-testid="waitlist-matches-list"
					style={{
						listStyle: "none",
						margin: 0,
						padding: 0,
						display: "flex",
						flexDirection: "column",
						gap: 8,
					}}
				>
					{report.slot?.from ? (
						<li className="ops-note" style={{ fontSize: 12 }}>
							Окно {report.slot.from}–{report.slot.to}
							{report.slot.doctorName ? ` · ${report.slot.doctorName}` : ""}
						</li>
					) : null}
					{report.matches.map((match, index) => {
						const isCalled = called.has(match.patientId);
						const priorityLabel = PRIORITY_LABELS[match.priorityLevel] ?? match.priorityLevel;
						return (
							<li
								key={match.entryId}
								data-testid={`waitlist-match-row-${match.entryId}`}
								style={{
									border: "1px solid var(--line)",
									borderRadius: 10,
									padding: "8px 10px",
									background: "var(--paper-soft)",
									display: "flex",
									flexDirection: "column",
									gap: 4,
								}}
							>
								<div style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
									<span className="ops-strong" style={{ fontSize: 13 }}>
										{index + 1}. {match.patientName}
									</span>
									<span
										className="ops-note"
										style={{
											fontSize: 11,
											fontWeight: 700,
											textTransform: "uppercase",
											color:
												match.priorityLevel === "high"
													? "var(--danger, #b91c1c)"
													: "var(--muted)",
										}}
									>
										{priorityLabel}
									</span>
								</div>
								<span className="ops-note" style={{ fontSize: 12 }}>
									{match.phone ?? "телефон не указан"}
									{match.sameDoctor ? " · тот же врач" : ""}
									{match.timeFits ? " · время подходит" : ""}
									{match.alreadyBooked ? " · уже записан" : ""}
									{match.waitingDays > 0 ? ` · ждёт ${match.waitingDays} дн.` : " · сегодня в очереди"}
								</span>
								<span className="ops-note" style={{ fontSize: 12 }}>
									{match.reason}
								</span>
								<div style={{ display: "flex", gap: 8, marginTop: 2 }}>
									{match.phone ? (
										<a
											className="secondary-button"
											href={`tel:${match.phone.replace(/[^\d+]/g, "")}`}
											style={{
												padding: "4px 10px",
												fontSize: 12,
												minHeight: 28,
												textDecoration: "none",
												display: "inline-flex",
												alignItems: "center",
											}}
											data-testid={`waitlist-match-call-${match.entryId}`}
										>
											Позвонить
										</a>
									) : null}
									{isCalled ? (
										<span className="ops-note" data-testid={`waitlist-match-called-${match.entryId}`}>
											Позвонили ✓
										</span>
									) : (
										<button
											type="button"
											className="secondary-button"
											style={{ padding: "4px 10px", fontSize: 12, minHeight: 28 }}
											data-testid={`waitlist-match-mark-called-${match.entryId}`}
											onClick={() =>
												setCalled((prev) => {
													const next = new Set(prev);
													next.add(match.patientId);
													return next;
												})
											}
										>
											Позвонил
										</button>
									)}
								</div>
							</li>
						);
					})}
				</ul>
			) : null}

			{report?.note && !compact ? <p className="ops-hint">{report.note}</p> : null}
		</section>
	);
};

export default WaitlistMatchesBlock;
