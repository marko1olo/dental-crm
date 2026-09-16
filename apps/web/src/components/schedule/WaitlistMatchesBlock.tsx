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

import {
	Check,
	Copy,
	MessageSquare,
	MoreVertical,
	Phone,
	Zap,
} from "lucide-react";
import type React from "react";
import { useCallback, useEffect, useState } from "react";
import { useOptionalAppLogicContext } from "../../contexts/AppLogicContext";
import { denteAdminSecretRequestHeaders } from "../../lib/denteRequestHeaders";
import { actionFailureToast } from "../../lib/panelStateText";
import { logger } from "../../utils/logger";
import { EmptyState } from "../EmptyState";
import { showToast } from "../GlobalToast";
import { openWhatsAppChat } from "./WaitlistQuickFillModal";

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
	if (status >= 500)
		return "Сбой на сервере клиники: список кандидатов не собран.";
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
	const appLogic = useOptionalAppLogicContext();
	const auth = appLogic?.auth;

	const [report, setReport] = useState<WaitlistMatchReport | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [loading, setLoading] = useState(!lazy);
	const [started, setStarted] = useState(!lazy);
	const [called, setCalled] = useState<Set<string>>(new Set());
	const [contactedPatients, setContactedPatients] = useState<Set<string>>(
		new Set(),
	);
	const [bookingId, setBookingId] = useState<string | null>(null);
	const [activeMenuEntryId, setActiveMenuEntryId] = useState<string | null>(
		null,
	);

	// Close dropdown action menu on click outside
	useEffect(() => {
		if (!activeMenuEntryId) return;
		const handleClickOutside = (e: MouseEvent) => {
			const target = e.target as HTMLElement | null;
			if (!target?.closest(`[data-menu-container="${activeMenuEntryId}"]`)) {
				setActiveMenuEntryId(null);
			}
		};
		document.addEventListener("mousedown", handleClickOutside);
		return () => document.removeEventListener("mousedown", handleClickOutside);
	}, [activeMenuEntryId]);

	const getOfferMessage = (match: WaitlistMatchRow) => {
		const docName = report?.slot?.doctorName;
		const fromStr = report?.slot?.from || "ближайшее время";
		const toStr = report?.slot?.to ? `–${report?.slot?.to}` : "";
		const doctorText = docName ? ` к врачу ${docName}` : "";
		const clinicName =
			appLogic?.dashboard?.clinicSettings?.name ||
			"стоматологической клинике DENTE";
		return `Здравствуйте, ${match.patientName}! В ${clinicName} освободилось окно на приём${doctorText}: ${fromStr}${toStr}. Записать вас на это время? Ответьте ДА или позвоните нам.`;
	};

	const handleSendWhatsApp = (match: WaitlistMatchRow) => {
		if (!match.phone) {
			showToast("У пациента не указан номер телефона", "error");
			return;
		}
		const msg = getOfferMessage(match);
		openWhatsAppChat(match.phone, msg);
		setContactedPatients((prev) => new Set(prev).add(match.patientId));
		showToast(
			`Предложение окна сформировано для ${match.patientName}`,
			"success",
		);
	};

	const handleCopySms = (match: WaitlistMatchRow) => {
		const msg = getOfferMessage(match);
		navigator.clipboard?.writeText(msg).then(() => {
			setContactedPatients((prev) => new Set(prev).add(match.patientId));
			showToast("Текст SMS скопирован в буфер", "success");
		});
	};

	const handleTakeSlot = async (match: WaitlistMatchRow) => {
		if (bookingId) return;
		setBookingId(match.entryId);
		try {
			// 1. Назначаем пациента в освободившееся окно (Мандат 8e: без обязательного ассистента)
			const patchRes = await fetch(
				`/api/appointments/${encodeURIComponent(appointmentId)}`,
				{
					method: "PATCH",
					headers: denteAdminSecretRequestHeaders({
						"Content-Type": "application/json",
					}),
					body: JSON.stringify({
						patientId: match.patientId,
						status: "planned",
						reason: match.reason || "Запись из листа ожидания (посадка в окно)",
						comment: `Занято из листа ожидания: пациент ${match.patientName}`,
						assistantUserId: "",
					}),
				},
			);

			if (!patchRes.ok) {
				const err = await patchRes.json().catch(() => null);
				showToast(err?.message || "Не удалось занять окно расписания", "error");
				return;
			}

			// 2. Закрываем заявку в листе ожидания как выполненную
			await fetch(`/api/waitlist/${encodeURIComponent(match.entryId)}`, {
				method: "PUT",
				headers: denteAdminSecretRequestHeaders({
					"Content-Type": "application/json",
				}),
				body: JSON.stringify({ status: "fulfilled" }),
			}).catch((err) => {
				logger.warn("Failed to fulfill waitlist entry:", err);
			});

			showToast(
				`Пациент «${match.patientName}» успешно записан в это окно!`,
				"success",
				5000,
			);

			// 3. Обновляем расписание и список кандидатов
			if (appLogic?.loadDashboard) {
				void appLogic.loadDashboard();
			}
			void load();
		} catch (err) {
			logger.error("Error booking slot for waitlist match:", err);
			showToast("Ошибка при записи пациента в свободное окно", "error");
		} finally {
			setBookingId(null);
		}
	};

	const load = useCallback(async () => {
		if (!appointmentId) return;
		setError(null);
		setLoading(true);
		setStarted(true);
		try {
			let response: Response;
			try {
				response = await fetch(
					`/api/appointments/${encodeURIComponent(appointmentId)}/waitlist-matches`,
					{
						headers: auth?.denteClinicalReadHeaders
							? auth.denteClinicalReadHeaders()
							: {},
					},
				);
			} catch {
				setReport(null);
				setError(
					"Сервер клиники не ответил. Проверьте, что программа клиники запущена и есть сеть.",
				);
				return;
			}
			// biome-ignore lint/suspicious/noExplicitAny: automated suppression
			const payload = (await response.json().catch((err: any) => {
				logger.error(err);
				showToast(
					actionFailureToast(
						"Ошибка чтения ответа",
						(err as { status?: number })?.status ?? null,
					),
					"error",
				);
				return null;
			})) as (WaitlistMatchReport & { message?: string }) | null;
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
				examinedEntries:
					Number(payload.examinedEntries) || payload.matches.length,
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
	}, [lazy]);

	if (lazy && !started) {
		return (
			<div
				className="waitlist-matches-block"
				data-testid="waitlist-matches-lazy"
			>
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
					<h3 style={{ margin: 0, fontSize: "0.95rem" }}>
						Кому предложить это окно
					</h3>
					{report ? (
						<span
							className={`status-pill ${(report?.matches ?? []).length > 0 ? "status-arrived" : "status-planned"}`}
						>
							{(report?.matches ?? []).length}
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
					<strong
						style={{
							fontSize: 12,
							letterSpacing: "0.04em",
							textTransform: "uppercase",
							color: "var(--muted)",
						}}
					>
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
				<div
					className="ops-notice ops-notice--error"
					role="alert"
					data-testid="waitlist-matches-error"
				>
					<p>{error}</p>
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

			{loading && !report && !error ? (
				<p
					className="ops-note"
					data-testid="waitlist-matches-loading"
					style={{ margin: "6px 0" }}
				>
					Подбираю кандидатов из листа ожидания…
				</p>
			) : null}

			{report && (report?.matches ?? []).length === 0 && !error ? (
				compact ? (
					<p
						className="ops-note"
						data-testid="waitlist-matches-empty"
						style={{ margin: "6px 0", fontSize: 12, color: "var(--muted)" }}
					>
						В листе ожидания подходящих нет
						{(report?.examinedEntries ?? 0) > 0
							? ` (смотрели ${report.examinedEntries} в очереди)`
							: ", очередь пуста"}
						. Окно можно отдать под запись с улицы.
					</p>
				) : (
					<EmptyState
						icon={<Zap size={28} />}
						title="В листе ожидания подходящих нет"
						description={
							(report?.examinedEntries ?? 0) > 0
								? `Проверено ${report.examinedEntries} заявок в очереди. Это окно можно отдать под запись с улицы.`
								: "Очередь листа ожидания пуста. Окно можно отдать под запись с улицы."
						}
						glass={false}
					/>
				)
			) : null}

			{report && (report?.matches ?? []).length > 0 ? (
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
					{(report?.matches ?? []).map((match, index) => {
						const isCalled = called.has(match.patientId);
						const isContacted = contactedPatients.has(match.patientId);
						const priorityLabel =
							PRIORITY_LABELS[match?.priorityLevel ?? ""] ??
							match?.priorityLevel ??
							"";
						return (
							<li
								key={match.entryId}
								data-testid={`waitlist-match-row-${match.entryId}`}
								className="rounded-xl p-3 bg-[var(--paper-soft)] border border-[var(--line)] flex flex-col gap-2 min-w-0"
							>
								<div className="flex items-center justify-between gap-2 flex-wrap min-w-0">
									<div className="flex items-center gap-2 min-w-0">
										<span className="text-xs font-bold text-[var(--muted)] shrink-0">
											{index + 1}.
										</span>
										<span
											className="font-bold text-sm text-[var(--ink)] truncate max-w-[240px] sm:max-w-[320px]"
											title={match.patientName}
										>
											{match.patientName}
										</span>
									</div>
									<div className="flex items-center gap-1.5 shrink-0">
										{isCalled && (
											<span
												className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 inline-flex items-center gap-1"
												data-testid={`waitlist-match-called-${match.entryId}`}
											>
												<Check className="w-3 h-3 text-emerald-500 shrink-0" />
												<span>Позвонили</span>
											</span>
										)}
										<span
											className={`text-[11px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full border ${
												match.priorityLevel === "high"
													? "bg-[var(--bad-bg)] text-[var(--bad-fg)] border-[var(--bad-fg)]"
													: match.priorityLevel === "medium"
														? "bg-[var(--info-bg,rgba(37,99,235,0.15))] text-[var(--info-fg,#2563eb)] border-blue-500/30"
														: "bg-[var(--paper-strong)] text-[var(--muted)] border-[var(--line)]"
											}`}
										>
											{priorityLabel}
										</span>
									</div>
								</div>

								<div className="text-xs text-[var(--muted)] flex flex-wrap items-center gap-x-2.5 gap-y-1">
									<span className="font-medium text-[var(--ink-2)] shrink-0">
										{match.phone ?? "телефон не указан"}
									</span>
									{match.sameDoctor && (
										<span className="shrink-0">· тот же врач</span>
									)}
									{match.timeFits && (
										<span className="shrink-0">· время подходит</span>
									)}
									{match.alreadyBooked && (
										<span className="shrink-0 font-semibold text-amber-600 dark:text-amber-400">
											· уже записан
										</span>
									)}
									<span className="shrink-0">
										{match.waitingDays > 0
											? `· ждёт ${match.waitingDays} дн.`
											: "· сегодня в очереди"}
									</span>
								</div>

								{match.reason && (
									<p className="text-xs text-[var(--muted)] break-words m-0">
										{match.reason}
									</p>
								)}

								{/* 1-Click Action Buttons: strictly <= 2 direct buttons + MoreVertical */}
								<div
									className="flex items-center gap-1.5 mt-1 flex-wrap shrink-0 relative"
									data-menu-container={match.entryId}
								>
									{/* Button 1 (Main): 1-Click Booking / Transfer */}
									<button
										type="button"
										disabled={Boolean(bookingId)}
										onClick={() => void handleTakeSlot(match)}
										className="h-8 px-3 rounded-lg bg-[var(--teal,#0d9488)] hover:brightness-110 active:brightness-95 text-[var(--on-teal,#ffffff)] font-bold text-xs inline-flex items-center gap-1.5 cursor-pointer transition-all shadow-xs disabled:opacity-50 pointer-coarse:min-h-[44px]"
										data-testid={`waitlist-match-take-slot-${match.entryId}`}
										title={
											match.alreadyBooked
												? `У пациента есть запись. Перенести приём на это освободившееся окно в 1 клик`
												: `Занять это окно пациентом ${match.patientName} в 1 клик`
										}
									>
										<Zap
											size={13}
											className="fill-current text-amber-300 shrink-0"
										/>
										<span>
											{bookingId === match.entryId
												? "Записываем…"
												: match.alreadyBooked
													? "Перенести в окно"
													: "В окно в 1 клик"}
										</span>
									</button>

									{/* Button 2: WhatsApp direct */}
									{match.phone && (
										<button
											type="button"
											onClick={() => handleSendWhatsApp(match)}
											className={`h-8 px-2.5 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 transition-all cursor-pointer pointer-coarse:min-h-[44px] border ${
												isContacted
													? "bg-green-500/15 text-green-700 dark:text-green-300 border-green-500/30"
													: "bg-[var(--paper)] hover:bg-[var(--paper-strong)] text-[var(--ink)] border-[var(--line)]"
											}`}
											title="Предложить окно через WhatsApp"
											data-testid={`waitlist-match-whatsapp-${match.entryId}`}
										>
											<MessageSquare className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
											<span>{isContacted ? "Предложено ✓" : "WhatsApp"}</span>
										</button>
									)}

									{/* Context menu for secondary actions: Call, Mark called, Copy SMS */}
									<div className="relative">
										<button
											type="button"
											onClick={() =>
												setActiveMenuEntryId((prev) =>
													prev === match.entryId ? null : match.entryId,
												)
											}
											className="h-8 w-8 inline-flex items-center justify-center rounded-lg bg-[var(--paper)] border border-[var(--line)] hover:bg-[var(--paper-strong)] text-[var(--muted)] hover:text-[var(--ink)] transition-all cursor-pointer shadow-xs pointer-coarse:min-h-[44px] pointer-coarse:min-w-[44px]"
											title="Другие действия"
											aria-label="Другие действия"
											aria-haspopup="true"
											aria-expanded={activeMenuEntryId === match.entryId}
											data-testid={`waitlist-match-more-${match.entryId}`}
										>
											<MoreVertical className="w-3.5 h-3.5 shrink-0" />
										</button>

										{activeMenuEntryId === match.entryId && (
											<div className="absolute left-0 sm:left-auto sm:right-0 top-full mt-1 min-w-[210px] p-1.5 rounded-xl bg-[var(--paper-strong)] border border-[var(--line)] shadow-xl z-30 flex flex-col gap-1">
												{match.phone && (
													<a
														className="w-full px-2.5 py-1.5 min-h-[32px] rounded-lg text-xs font-semibold flex items-center gap-2 hover:bg-[var(--paper-soft)] text-[var(--teal,#0d9488)] transition-all text-left cursor-pointer pointer-coarse:min-h-[44px]"
														href={`tel:${String(match?.phone ?? "").replace(/[^\d+]/g, "")}`}
														onClick={() => setActiveMenuEntryId(null)}
														title="Позвонить пациенту"
														data-testid={`waitlist-match-call-${match.entryId}`}
													>
														<Phone className="w-3.5 h-3.5 text-[var(--teal,#0d9488)] shrink-0" />
														<span>Позвонить</span>
													</a>
												)}

												<button
													type="button"
													className="w-full px-2.5 py-1.5 min-h-[32px] rounded-lg text-xs font-semibold flex items-center gap-2 hover:bg-[var(--paper-soft)] text-[var(--ink)] transition-all text-left cursor-pointer pointer-coarse:min-h-[44px]"
													data-testid={`waitlist-match-mark-called-${match.entryId}`}
													onClick={() => {
														setCalled((prev) => {
															const next = new Set(prev);
															next.add(match.patientId);
															return next;
														});
														setActiveMenuEntryId(null);
													}}
												>
													<Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
													<span>
														{isCalled
															? "Отметить повторно"
															: "Отметить: позвонил"}
													</span>
												</button>

												<button
													type="button"
													onClick={() => {
														handleCopySms(match);
														setActiveMenuEntryId(null);
													}}
													className="w-full px-2.5 py-1.5 min-h-[32px] rounded-lg text-xs font-semibold flex items-center gap-2 hover:bg-[var(--paper-soft)] text-[var(--ink)] transition-all text-left cursor-pointer pointer-coarse:min-h-[44px]"
													title="Скопировать текст SMS"
													aria-label="Скопировать текст SMS"
												>
													<Copy className="w-3.5 h-3.5 text-[var(--muted)] shrink-0" />
													<span>Скопировать SMS</span>
												</button>
											</div>
										)}
									</div>
								</div>
							</li>
						);
					})}
				</ul>
			) : null}

			{report?.note && !compact ? (
				<p className="ops-hint">{report.note}</p>
			) : null}
		</section>
	);
};

export default WaitlistMatchesBlock;
