import type React from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { countLabel, money } from "../AppHelpers";
import { actionFailureToast } from "../lib/panelStateText";
import {
	PATIENT_TOKEN_KEY,
	safeLocalStorageGetItem,
	safeLocalStorageRemoveItem,
	safeLocalStorageSetItem,
} from "../lib/safeLocalStorage";
import { EmptyState } from "./EmptyState";
import { showToast } from "./GlobalToast";
import "./PatientPortal.css";

interface TreatmentStage {
	id: string;
	description: string;
	cost: number;
	status: "pending" | "completed";
}

/**
 * Сумма из денежной колонки базы.
 *
 * /api/portal/me отдаёт строки таблиц как есть, без маппинга (routes/portal.ts:
 * `select()` из treatment_plans и patient_invoices). Денежные колонки там
 * объявлены numeric без mode "number", а такие значения драйвер отдаёт
 * СТРОКОЙ — «6800.00». Поэтому здесь разбор строки, а не приведение типа.
 *
 * null означает «цены нет», и это не ноль: ноль на экране пациента — это
 * утверждение «лечение бесплатно».
 */
function rubFromDbValue(value: unknown): number | null {
	if (typeof value === "number") return Number.isFinite(value) ? value : null;
	if (typeof value === "string" && value.trim() !== "") {
		const parsed = Number(value);
		return Number.isFinite(parsed) ? parsed : null;
	}
	return null;
}

/**
 * Стоимость плана лечения.
 *
 * БЫЛО: `plan.totalAmount`. Такого поля нет ни в ответе портала, ни в таблице
 * treatment_plans: там total_price_rub и total_price (db/schema.ts), причём
 * записывает план единственный маршрут (routes/odontogram.ts) и только в
 * total_price — поэтому его читаем первым. Из-за несуществующего поля «Итого
 * план», «Оплачено» и «Остаток» ВСЕГДА печатались нулями, и то же самое
 * показывала цена каждого плана в списке.
 */
function planTotalRub(plan: unknown): number | null {
	const row = (plan ?? {}) as Record<string, unknown>;
	return rubFromDbValue(row.totalPrice) ?? rubFromDbValue(row.totalPriceRub);
}

/* ── OTP Input Component ── */
const OTP_LENGTH = 4;

interface OTPInputProps {
	onComplete: (code: string) => void;
	disabled?: boolean;
}

const OTPInput: React.FC<OTPInputProps> = ({ onComplete, disabled }) => {
	const [digits, setDigits] = useState<string[]>(Array(OTP_LENGTH).fill(""));
	const refs = useRef<(HTMLInputElement | null)[]>([]);

	const focus = useCallback((idx: number) => {
		refs.current[idx]?.focus();
	}, []);

	const handleKeyDown = useCallback(
		(e: React.KeyboardEvent<HTMLInputElement>, idx: number) => {
			if (e.key === "Backspace") {
				e.preventDefault();
				setDigits((prev) => {
					const next = [...prev];
					if (next[idx] !== "") {
						next[idx] = "";
						return next;
					}
					// Jump to previous and clear
					if (idx > 0) {
						next[idx - 1] = "";
						focus(idx - 1);
					}
					return next;
				});
			}
		},
		[focus],
	);

	const handleChange = useCallback(
		(e: React.ChangeEvent<HTMLInputElement>, idx: number) => {
			const raw = e.target.value.replace(/\D/g, "").slice(-1);
			if (!raw) return;

			setDigits((prev) => {
				const next = [...prev];
				next[idx] = raw;
				return next;
			});

			// Auto-advance
			if (idx < OTP_LENGTH - 1) {
				focus(idx + 1);
			}
			// БЫЛО: здесь стоял setTimeout ВНУТРИ обновления состояния, который
			// тоже вызывал onComplete. Вместе с эффектом ниже и обработчиком
			// вставки один ввод кода отправлял на сервер ТРИ запроса проверки.
			// Портал ограничен 10 запросами в минуту на IP, поэтому в клинике
			// за одним внешним адресом четвёртый пациент получал 429 на
			// правильный код с первой попытки. Отправку оставляем только в эффекте.
		},
		[focus],
	);

	const handlePaste = useCallback(
		(e: React.ClipboardEvent, startIdx: number) => {
			e.preventDefault();
			const pasted = e.clipboardData
				.getData("text")
				.replace(/\D/g, "")
				.slice(0, OTP_LENGTH);
			if (!pasted) return;

			setDigits((prev) => {
				const next = [...prev];
				for (let i = 0; i < pasted.length && startIdx + i < OTP_LENGTH; i++) {
					next[startIdx + i] = pasted[i] ?? "";
				}
				return next;
			});

			const nextFocus = Math.min(startIdx + pasted.length, OTP_LENGTH - 1);
			focus(nextFocus);
			// onComplete не вызываем: заполненные цифры подхватит эффект ниже.
		},
		[focus],
	);

	// Единственная точка отправки кода. Ref защищает от повторной отправки того же
	// кода при перерисовке и от двойного вызова в StrictMode.
	const submittedCodeRef = useRef<string | null>(null);
	useEffect(() => {
		const code = digits.join("");
		if (code.length !== OTP_LENGTH || digits.includes("")) {
			// Код изменился — разрешаем отправку следующего.
			if (code.length < OTP_LENGTH) submittedCodeRef.current = null;
			return;
		}
		if (submittedCodeRef.current === code) return;
		submittedCodeRef.current = code;
		onComplete(code);
	}, [digits, onComplete]);

	return (
		<div className="otp-wrap">
			{digits
				.map((digit, index) => ({ id: `otp-slot-${index}`, index, digit }))
				.map((slot) => (
					<input
						key={slot.id}
						ref={(el) => {
							refs.current[slot.index] = el;
						}}
						className={`otp-cell ${slot.digit ? "otp-cell--filled" : ""}`}
						type="text"
						inputMode="numeric"
						maxLength={1}
						value={slot.digit}
						disabled={disabled}
						onChange={(e) => handleChange(e, slot.index)}
						onKeyDown={(e) => handleKeyDown(e, slot.index)}
						onPaste={(e) => handlePaste(e, slot.index)}
						onFocus={(e) => e.target.select()}
						autoComplete="one-time-code"
						aria-label={`Цифра ${slot.index + 1} из ${OTP_LENGTH}`}
					/>
				))}
		</div>
	);
};

/* ── Main PatientPortal ── */
export const PatientPortal: React.FC = () => {
	const [isAuthenticated, setIsAuthenticated] = useState(false);
	const [phone, setPhone] = useState("");
	const [step, setStep] = useState<"phone" | "otp">("phone");
	const [otpError, setOtpError] = useState("");
	const [viewingDoc, setViewingDoc] = useState<{
		id: string;
		title: string;
	} | null>(null);
	const [viewingDocHtml, setViewingDocHtml] = useState<string | null>(null);
	const [viewingDocLoading, setViewingDocLoading] = useState(false);
	const phoneRef = useRef<HTMLInputElement>(null);

	const [patientData, setPatientData] = useState<any>(null);
	const [isLoading, setIsLoading] = useState(false);
	// Отказ сервера при чтении кабинета — отдельно от «код неверный».
	const [sessionError, setSessionError] = useState<string | null>(null);

	const fetchPatientData = useCallback(async (token: string) => {
		try {
			setIsLoading(true);
			setSessionError(null);
			const res = await fetch("/api/portal/me", {
				headers: { Authorization: `Bearer ${token}` },
			});
			if (res.ok) {
				const data = await res.json();
				setPatientData(data);
				setIsAuthenticated(true);
				return;
			}
			// Пропуск действительно недействителен — только в этих двух случаях
			// его есть смысл выбрасывать и просить войти заново.
			if (res.status === 401 || res.status === 403) {
				safeLocalStorageRemoveItem(PATIENT_TOKEN_KEY);
				setIsAuthenticated(false);
				return;
			}
			// БЫЛО: ЛЮБОЙ не-ok ответ стирал сохранённый пропуск и молча возвращал
			// пациента к вводу телефона. При 500 или 404 это выглядело как «вас
			// разлогинило»: человек заново просил код, а вход на портал ограничен
			// 10 запросами в минуту на адрес — в клинике за одним внешним IP
			// следующий пациент получал отказ на верный код.
			setIsAuthenticated(false);
			setSessionError(actionFailureToast("Кабинет не открылся", res.status));
		} catch (e) {
			showToast(
				actionFailureToast(
					"Ошибка выполнения операции",
					(e as { status?: number })?.status ?? null,
				),
				"error",
			);
			// Текст исключения английский, наружу не идёт.
			console.error("[portal] не удалось прочитать кабинет пациента:", e);
			setIsAuthenticated(false);
			setSessionError(actionFailureToast("Кабинет не открылся", null));
		} finally {
			setIsLoading(false);
		}
	}, []);

	// Повтор без нового СМС: пропуск сохранён, спрашивать код заново не за что.
	const retrySession = useCallback(() => {
		const token = safeLocalStorageGetItem(PATIENT_TOKEN_KEY);
		if (!token) {
			setSessionError(null);
			return;
		}
		void fetchPatientData(token);
	}, [fetchPatientData]);

	useEffect(() => {
		const token = safeLocalStorageGetItem(PATIENT_TOKEN_KEY);
		if (token) fetchPatientData(token);
		phoneRef.current?.focus();
	}, [fetchPatientData]);

	const plans: any[] = Array.isArray(patientData?.plans)
		? patientData.plans
		: [];
	const invoices: any[] = Array.isArray(patientData?.invoices)
		? patientData.invoices
		: [];
	// Планы без цены считаем отдельно и говорим о них вслух: иначе итог
	// молча оказывается меньше настоящего, а пациент читает его как полный.
	const planTotals = plans.map((plan) => planTotalRub(plan));
	const pricedPlanTotals = planTotals.filter(
		(value): value is number => value !== null,
	);
	const plansWithoutPrice = planTotals.length - pricedPlanTotals.length;
	const totalCost = pricedPlanTotals.reduce((sum, value) => sum + value, 0);
	// БЫЛО: `i.amount`. В patient_invoices такого поля нет — сумма счёта лежит
	// в total_rub (db/schema.ts), и «Оплачено» всегда показывало 0 ₽.
	// Частично оплаченные счёта (invoice_status допускает partially_paid) сюда
	// не попадают: внесённой части в строке счёта нет, взять её неоткуда.
	const paid = invoices
		.filter((invoice) => invoice?.status === "paid")
		.reduce(
			(sum: number, invoice: any) =>
				sum + (rubFromDbValue(invoice?.totalRub) ?? 0),
			0,
		);
	const remaining = totalCost - paid;

	useEffect(() => {
		phoneRef.current?.focus();
		return () => {
			setIsAuthenticated(false);
			setPhone("");
			setStep("phone");
			setOtpError("");
			setViewingDoc(null);
			setViewingDocHtml(null);
		};
	}, []);

	useEffect(() => {
		if (viewingDoc) {
			const token = safeLocalStorageGetItem(PATIENT_TOKEN_KEY);
			if (!token) return;
			setViewingDocLoading(true);
			setViewingDocHtml(null);
			fetch(`/api/portal/documents/${viewingDoc.id}/html`, {
				headers: { Authorization: `Bearer ${token}` },
			})
				.then((res) => {
					if (res.ok) return res.text();
					throw new Error("Не удалось загрузить документ");
				})
				.then((html) => setViewingDocHtml(html))
				.catch((err) => {
					console.error(err);
					setViewingDocHtml(
						"<div style='padding:20px;color:red;font-family:sans-serif;'>Ошибка загрузки документа.</div>",
					);
				})
				.finally(() => setViewingDocLoading(false));
		}
	}, [viewingDoc]);

	const [isSendingOtp, setIsSendingOtp] = useState(false);
	const [isVerifying, setIsVerifying] = useState(false);
	const [otpSendError, setOtpSendError] = useState<string | null>(null);

	const handleSendOtp = useCallback(async () => {
		if (phone.replace(/\D/g, "").length < 10) {
			setOtpSendError("Введите номер телефона полностью.");
			return;
		}
		if (isSendingOtp) return;

		// БЫЛО: setStep("otp") выполнялся ДО запроса, ответ не проверялся, ошибки
		// не перехватывались, кнопка не блокировалась. При 429 или 500 пациент
		// видел «Код отправлен» и ждал СМС, которого никто не отправлял.
		setIsSendingOtp(true);
		setOtpSendError(null);
		try {
			const response = await fetch("/api/portal/auth/send-otp", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ phone }),
			});
			if (!response.ok) {
				setOtpSendError(
					response.status === 429
						? "Слишком много попыток. Подождите минуту и попробуйте снова."
						: "Не удалось отправить код. Попробуйте позже или обратитесь в клинику.",
				);
				return;
			}
			setStep("otp");
		} catch {
			setOtpSendError("Нет связи с клиникой. Проверьте интернет и повторите.");
		} finally {
			setIsSendingOtp(false);
		}
	}, [phone, isSendingOtp]);

	const handleOTPComplete = useCallback(
		async (code: string) => {
			if (isVerifying) return;
			setIsVerifying(true);
			try {
				const res = await fetch("/api/portal/auth/verify-otp", {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ phone, code }),
				});
				const data = await res.json();
				if (res.ok && data.token) {
					safeLocalStorageSetItem(PATIENT_TOKEN_KEY, data.token);
					setOtpError("");
					await fetchPatientData(data.token);
				} else {
					setOtpError(data.error || "Неверный код. Попробуйте ещё раз.");
				}
			} catch (_e) {
				showToast(
					actionFailureToast(
						"Ошибка выполнения операции",
						(_e as { status?: number })?.status ?? null,
					),
					"error",
				);
				setOtpError("Ошибка соединения.");
			} finally {
				setIsVerifying(false);
			}
		},
		[phone, fetchPatientData, isVerifying],
	);

	if (!isAuthenticated) {
		return (
			<div className="portal-auth-container">
				<div className="portal-auth-card">
					<div className="portal-auth-logo">🦷</div>
					<h2 className="portal-auth-title">Кабинет пациента</h2>

					{/* Третье состояние входа: пропуск сохранён, но кабинет ещё читается.
					    Раньше в этот момент пациент видел пустую форму телефона и начинал
					    вход заново, тратя лимит запросов кода. */}
					{isLoading && (
						<p className="auth-hint">Проверяем сохранённый вход…</p>
					)}
					{/* Отказ сервера — своим текстом и с повтором, без нового СМС.
					    Раньше он был неотличим от «сессия истекла». */}
					{sessionError && (
						<div className="auth-step">
							<p className="auth-error">{sessionError}</p>
							<button
								type="button"
								onClick={retrySession}
								className="auth-text-btn"
								disabled={isLoading}
							>
								Повторить
							</button>
						</div>
					)}

					{step === "phone" ? (
						<div className="auth-step">
							<p className="auth-hint">Введите номер телефона для входа</p>
							<input
								ref={phoneRef}
								type="tel"
								placeholder="+7 (999) 000-00-00"
								value={phone}
								onChange={(e) => setPhone(e.target.value)}
								className="auth-phone-input"
								onKeyDown={(e) => e.key === "Enter" && handleSendOtp()}
								disabled={isSendingOtp}
							/>
							{/* Ошибка отправки показывается пациенту, а не молчаливо
							    проглатывается: раньше при сбое он ждал СМС, которого не было. */}
							{otpSendError && <p className="auth-error">{otpSendError}</p>}
							<button
								type="button"
								onClick={handleSendOtp}
								className="auth-primary-btn"
								disabled={isSendingOtp}
							>
								{isSendingOtp ? "Отправляем..." : "Получить СМС-код"}
							</button>
						</div>
					) : (
						<div className="auth-step">
							<p className="auth-hint">
								Код отправлен на <strong>{phone}</strong>
							</p>
							<p className="auth-sublabel">Введите 4-значный код</p>
							<OTPInput onComplete={handleOTPComplete} disabled={isVerifying} />
							{otpError && <p className="auth-error">{otpError}</p>}
							<button
								type="button"
								onClick={() => {
									setStep("phone");
									setOtpError("");
								}}
								className="auth-text-btn"
							>
								← Изменить номер
							</button>
						</div>
					)}
				</div>
			</div>
		);
	}

	return (
		<div className="patient-portal">
			<header className="portal-header">
				<h2>Мой кабинет пациента</h2>
				<button
					type="button"
					className="logout-btn"
					onClick={() => setIsAuthenticated(false)}
				>
					Выйти
				</button>
			</header>

			<div className="portal-grid">
				<section className="portal-card visits-card">
					<h3>Мои приёмы</h3>
					{(patientData?.visits || []).length === 0 && (
						<EmptyState
							title="Записей пока нет"
							description="У вас пока нет истории приёмов или запланированных визитов."
							glass={false}
							style={{ padding: "20px 16px" }}
						/>
					)}
					{(patientData?.visits || []).map((v: any) => (
						<div
							key={v.id}
							className={`visit-item ${v.status === "completed" ? "past" : "upcoming"}`}
						>
							<div className="visit-date">
								{new Date(v.date).toLocaleDateString("ru-RU")}
							</div>
							<div className="visit-desc">{v.notes || "Консультация"}</div>
							{v.status === "completed" ? (
								<span className="badge gray">Завершён</span>
							) : (
								<span className="badge blue">Запланирован</span>
							)}
						</div>
					))}
				</section>

				<section className="portal-card plan-card">
					<h3>План лечения</h3>
					{/* Суммы — общим money() из AppHelpers. БЫЛО toLocaleString() без
					    локали и без знаков после запятой: 6800.5 печаталось как
					    «6,800.5 ₽» (локаль браузера, точка как разделитель тысяч), а
					    полтинник в такой записи читается как пять копеек. */}
					<div className="financial-summary">
						<div className="fin-stat">
							<span>Итого план</span>
							<strong>{money(totalCost)}</strong>
						</div>
						<div className="fin-stat">
							<span>Оплачено</span>
							<strong className="text-green">{money(paid)}</strong>
						</div>
						{/* Отрицательный остаток — это переплата. «Остаток −5 000 ₽»
						    пациент читает как ошибку программы, поэтому меняется подпись,
						    а не знак у числа. */}
						<div className="fin-stat">
							<span>{remaining < 0 ? "Переплата" : "Остаток"}</span>
							<strong className="text-orange">
								{money(Math.abs(remaining))}
							</strong>
						</div>
					</div>
					{plansWithoutPrice > 0 && (
						<p
							style={{
								margin: "8px 0 0",
								fontSize: "0.8rem",
								color: "var(--muted)",
							}}
						>
							У {countLabel(plansWithoutPrice, "плана", "планов", "планов")}{" "}
							цена пока не указана, поэтому итог неполный — уточните сумму в
							клинике.
						</p>
					)}
					{plans.length === 0 && (
						<EmptyState
							title="Плана лечения пока нет"
							description="План появится здесь после осмотра, когда врач его составит и согласует с вами."
							glass={false}
							style={{ padding: "20px 16px" }}
						/>
					)}
					<div className="stages-list">
						{plans.map((stage: any, index: number) => {
							const stageTotal = planTotals[index] ?? null;
							return (
								<div key={stage.id} className={`stage-item ${stage.status}`}>
									<span className="stage-desc">
										{stage.name || "План лечения"}
									</span>
									{/* Цены нет — так и написано. Ноль здесь был бы обещанием
									    бесплатного лечения. */}
									<span className="stage-cost">
										{stageTotal === null
											? "цена не указана"
											: money(stageTotal)}
									</span>
									{stage.status === "completed" && (
										<span className="stage-icon">✓</span>
									)}
								</div>
							);
						})}
					</div>
				</section>

				<section className="portal-card docs-card">
					<h3>Документы</h3>
					{(patientData?.documents || []).length === 0 && (
						<EmptyState
							title="Документов нет"
							description="Нет выпущенных медицинских документов."
							glass={false}
							style={{ padding: "20px 16px" }}
						/>
					)}
					{(patientData?.documents || []).map((doc: any) => (
						<div key={doc.id} className="doc-item">
							<span>📄 {doc.title}</span>
							<button
								type="button"
								className="btn-download"
								onClick={() => setViewingDoc({ id: doc.id, title: doc.title })}
							>
								Просмотр
							</button>
						</div>
					))}
				</section>
			</div>

			{viewingDoc && (
				<button
					type="button"
					className="doc-overlay"
					onClick={(e) => {
						if (e.target === e.currentTarget) setViewingDoc(null);
					}}
					onKeyDown={(e) => {
						if (
							e.target === e.currentTarget &&
							(e.key === "Enter" || e.key === " ")
						) {
							setViewingDoc(null);
						}
					}}
				>
					<div
						className="doc-overlay-content"
						style={{
							width: "90%",
							maxWidth: "900px",
							height: "90vh",
							display: "flex",
							flexDirection: "column",
						}}
					>
						<div
							className="doc-overlay-header"
							style={{
								padding: "16px",
								borderBottom: "1px solid var(--border)",
								display: "flex",
								justifyContent: "space-between",
								alignItems: "center",
							}}
						>
							<h3 style={{ margin: 0, fontSize: "1.1rem" }}>
								{viewingDoc.title}
							</h3>
							<button
								type="button"
								className="doc-close-btn"
								onClick={() => setViewingDoc(null)}
								style={{
									background: "none",
									border: "none",
									fontSize: "24px",
									cursor: "pointer",
									color: "var(--muted)",
								}}
							>
								×
							</button>
						</div>
						<div
							className="doc-overlay-body"
							style={{ flex: 1, padding: 0, position: "relative" }}
						>
							{viewingDocLoading && (
								<div
									style={{
										position: "absolute",
										top: "50%",
										left: "50%",
										transform: "translate(-50%, -50%)",
										color: "var(--muted)",
									}}
								>
									Загрузка документа...
								</div>
							)}
							{!viewingDocLoading && viewingDocHtml && (
								<iframe
									srcDoc={viewingDocHtml}
									style={{
										width: "100%",
										height: "100%",
										border: "none",
										backgroundColor: "#fff",
									}}
									title={viewingDoc.title}
								/>
							)}
						</div>
					</div>
				</button>
			)}
		</div>
	);
};
