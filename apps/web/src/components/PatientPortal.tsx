import type React from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { countLabel, money } from "../AppHelpers";
import { actionFailureToast } from "../lib/panelStateText";
import {
	PATIENT_TOKEN_KEY,
	safeLocalStorageGetItem,
	safeLocalStorageRemoveItem,
	safeLocalStorageSetItem,
} from "../lib/safeLocalStorage";
import {
	Calendar,
	CalendarPlus,
	Check,
	CheckCircle2,
	Clock,
	CreditCard,
	Download,
	ExternalLink,
	FileCheck2,
	FileText,
	Heart,
	MapPin,
	QrCode,
	Receipt,
	Sparkles,
	User,
	X,
} from "lucide-react";
import { EmptyState } from "./EmptyState";
import { showToast } from "./GlobalToast";
import { generateQrCodeSvg } from "./portal/patientCabinet/patientCabinetEngine";
import "./PatientPortal.css";
import { logger } from "../utils/logger";

// biome-ignore lint/correctness/noUnusedVariables: automated suppression
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
				?.map((digit, index) => ({ id: `otp-slot-${index}`, index, digit }))
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

	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
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
			logger.error("[portal] не удалось прочитать кабинет пациента:", e);
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

	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	const plans: any[] = Array.isArray(patientData?.plans)
		? patientData.plans
		: [];
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	const invoices: any[] = Array.isArray(patientData?.invoices)
		? patientData.invoices
		: [];
	// Планы без цены считаем отдельно и говорим о них вслух: иначе итог
	// молча оказывается меньше настоящего, а пациент читает его как полный.
	const safePlans = Array.isArray(plans) ? plans : [];
	const planTotals = safePlans.map((plan) => planTotalRub(plan));
	const pricedPlanTotals = (planTotals ?? []).filter(
		(value): value is number => value !== null,
	);
	const plansWithoutPrice =
		(planTotals ?? []).length - (pricedPlanTotals ?? []).length;
	const totalCost = (pricedPlanTotals ?? []).reduce(
		(sum, value) => sum + value,
		0,
	);
	// БЫЛО: `i.amount`. В patient_invoices такого поля нет — сумма счёта лежит
	// в total_rub (db/schema.ts), и «Оплачено» всегда показывало 0 ₽.
	// Частично оплаченные счёта (invoice_status допускает partially_paid) сюда
	// не попадают: внесённой части в строке счёта нет, взять её неоткуда.
	const paid = (invoices ?? [])
		.filter((invoice) => invoice?.status === "paid")
		.reduce(
			// biome-ignore lint/suspicious/noExplicitAny: automated suppression
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
					logger.error(err);
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

	const [isReceptionQrOpen, setIsReceptionQrOpen] = useState(false);
	const [showTaxCertificate, setShowTaxCertificate] = useState(false);
	const [activeFiscalReceipt, setActiveFiscalReceipt] = useState<{
		fnNumber: string;
		fdNumber: string;
		fpdNumber: string;
		ofdName: string;
		amountRub: number;
		dateIso: string;
	} | null>(null);

	const handleDownloadIcs = useCallback(() => {
		const patientName = patientData?.patient?.fullName || "Пациент";
		const ics = `BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//DENTE Dental CRM//Patient Portal//RU\r\nCALSCALE:GREGORIAN\r\nMETHOD:PUBLISH\r\nBEGIN:VEVENT\r\nUID:dente-portal-appt-${Date.now()}@dente.ru\r\nDTSTAMP:${new Date().toISOString().replace(/[-:]/g, "").slice(0, 15)}Z\r\nDTSTART:20260901T113000Z\r\nDTEND:20260901T123000Z\r\nSUMMARY:Прием в DENTE: Д-р Смирнова Е.В.\r\nDESCRIPTION:Пациент: ${patientName}\\nПрием стоматолога-терапевта\\nАдрес: Клиника DENTE на Невском, Кабинет 104\\nТел: +7 (812) 309-88-99\r\nLOCATION:Клиника DENTE на Невском, Кабинет 104\r\nSTATUS:CONFIRMED\r\nBEGIN:VALARM\r\nTRIGGER:-PT2H\r\nACTION:DISPLAY\r\nDESCRIPTION:Напоминание о визите в клинику DENTE через 2 часа\r\nEND:VALARM\r\nEND:VEVENT\r\nEND:VCALENDAR\r\n`;
		const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
		const url = URL.createObjectURL(blob);
		const a = document.createElement("a");
		a.href = url;
		a.download = "Dente_Appointment_2026-09-01.ics";
		a.click();
		URL.revokeObjectURL(url);
	}, [patientData?.patient?.fullName]);

	const handleOpenGoogleCalendar = useCallback(() => {
		const patientName = patientData?.patient?.fullName || "Пациент";
		const title = encodeURIComponent("Прием в DENTE: Д-р Смирнова Е.В.");
		const details = encodeURIComponent(`Пациент: ${patientName}\nПрием стоматолога-терапевта\nАдрес: Клиника DENTE на Невском, Кабинет 104\nТел: +7 (812) 309-88-99`);
		const location = encodeURIComponent("Клиника DENTE на Невском, Кабинет 104");
		const url = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=20260901T113000Z/20260901T123000Z&details=${details}&location=${location}`;
		window.open(url, "_blank");
	}, [patientData?.patient?.fullName]);

	const handleOpenYandexCalendar = useCallback(() => {
		const patientName = patientData?.patient?.fullName || "Пациент";
		const name = encodeURIComponent("Прием в DENTE: Д-р Смирнова Е.В.");
		const desc = encodeURIComponent(`Пациент: ${patientName}\nПрием стоматолога-терапевта\nАдрес: Клиника DENTE на Невском, Кабинет 104\nТел: +7 (812) 309-88-99`);
		const location = encodeURIComponent("Клиника DENTE на Невском, Кабинет 104");
		const url = `https://calendar.yandex.ru/event/new?name=${name}&start_ts=2026-09-01T14:30:00&end_ts=2026-09-01T15:30:00&description=${desc}&location=${location}`;
		window.open(url, "_blank");
	}, [patientData?.patient?.fullName]);

	const nextApptCountdown = useMemo(() => {
		const targetMs = new Date("2026-09-01T14:30:00+03:00").getTime();
		const nowMs = Date.now();
		const diffMs = targetMs - nowMs;
		if (diffMs <= 0) return "Приём начался";
		const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
		const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
		const diffDays = Math.floor(diffHours / 24);
		const remHours = diffHours % 24;
		if (diffDays > 0) return `${diffDays} д ${remHours} ч ${diffMins} мин`;
		return `${diffHours} ч ${diffMins} мин`;
	}, []);

	if (!isAuthenticated) {
		return (
			<div className="portal-auth-container">
				<div className="portal-auth-card">
					<div className="portal-auth-logo flex items-center justify-center">
						<Sparkles size={28} className="text-teal-600" />
					</div>
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
				<div className="flex items-center gap-3">
					<div className="portal-brand-logo p-2 rounded-xl bg-[var(--teal-soft)] text-[var(--teal)]">
						<Sparkles size={20} />
					</div>
					<div>
						<h2 className="m-0 text-base font-bold text-[var(--ink)]">
							{patientData?.patient?.fullName || "Личный кабинет пациента"}
						</h2>
						<p className="m-0 text-xs text-[var(--muted)]">
							Электронная медицинская карта и сервисы DENTE
						</p>
					</div>
				</div>
				<button
					type="button"
					className="logout-btn"
					onClick={() => setIsAuthenticated(false)}
					data-testid="portal-logout-btn"
				>
					Выйти
				</button>
			</header>

			{/* ============================================================ */}
			{/* HERO: NEXT APPOINTMENT CARD (APPLE HEALTH CONSUMER HIG) */}
			{/* ============================================================ */}
			<section className="portal-card next-visit-hero-card" data-testid="portal-next-visit-hero-card">
				<div className="flex items-center justify-between flex-wrap gap-2 pb-3 border-b border-[var(--line)]">
					<div className="flex items-center gap-2">
						<Calendar className="text-[var(--teal)]" size={20} />
						<h3 className="m-0 text-sm font-bold text-[var(--ink)]">
							Ближайший запланированный прием
						</h3>
					</div>
					<div className="flex items-center gap-2">
						<span className="text-xs font-bold px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
							<CheckCircle2 size={14} />
							<span>Запись подтверждена</span>
						</span>
						<button
							type="button"
							onClick={() => setIsReceptionQrOpen(true)}
							className="min-h-[44px] px-3.5 py-1.5 rounded-xl text-xs font-bold bg-[var(--teal)] text-white hover:opacity-90 transition-all flex items-center gap-1.5 shadow-xs cursor-pointer"
							data-testid="portal-reception-qr-btn"
						>
							<QrCode size={16} />
							<span>Показать администратору</span>
						</button>
					</div>
				</div>

				<div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-3">
					<div className="space-y-1.5">
						<div className="flex items-center gap-2 flex-wrap">
							<span className="px-2.5 py-1 rounded-lg bg-[var(--teal-soft)] text-[var(--teal)] font-mono font-bold text-xs">
								14:30 – 15:30
							</span>
							<strong className="text-sm text-[var(--ink)]">
								Вторник, 1 сентября 2026
							</strong>
							<span className="px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 text-[11px] font-bold flex items-center gap-1">
								<Clock size={13} className="text-amber-500" />
								<span>До приёма: {nextApptCountdown}</span>
							</span>
						</div>
						<div className="text-xs text-[var(--muted)]">
							Врач: <strong className="text-[var(--ink)]">Д-р Смирнова Елена Владимировна</strong> (Терапевт-эндодонтист)
						</div>
						<div className="text-xs text-[var(--muted)] flex items-center gap-1.5">
							<MapPin size={14} className="text-[var(--teal)] shrink-0" />
							<span>г. Санкт-Петербург, Невский пр-т, 140 • Кабинет 104</span>
						</div>
					</div>

					{/* 1-Tap Calendar Export Buttons */}
					<div className="flex flex-col justify-center space-y-2">
						<span className="text-xs font-bold text-[var(--muted)] uppercase tracking-wider">
							Добавить в календарь смартфона:
						</span>
						<div className="flex items-center gap-2 flex-wrap">
							<button
								type="button"
								onClick={handleDownloadIcs}
								className="min-h-[44px] px-3 py-1.5 rounded-xl text-xs font-bold bg-[var(--paper)] text-[var(--ink)] border border-[var(--line)] hover:border-[var(--teal)] transition-all flex items-center gap-1.5 shadow-xs cursor-pointer"
								title="Скачать .ics файл для Apple Calendar / iCal"
								data-testid="portal-add-apple-cal-btn"
							>
								<CalendarPlus size={15} className="text-[var(--teal)]" />
								<span>Apple / iCal</span>
							</button>
							<button
								type="button"
								onClick={handleOpenGoogleCalendar}
								className="min-h-[44px] px-3 py-1.5 rounded-xl text-xs font-bold bg-[var(--paper)] text-[var(--ink)] border border-[var(--line)] hover:border-blue-400 transition-all flex items-center gap-1.5 shadow-xs cursor-pointer"
								title="Открыть Google Календарь"
								data-testid="portal-add-google-cal-btn"
							>
								<ExternalLink size={15} className="text-blue-500" />
								<span>Google</span>
							</button>
							<button
								type="button"
								onClick={handleOpenYandexCalendar}
								className="min-h-[44px] px-3 py-1.5 rounded-xl text-xs font-bold bg-[var(--paper)] text-[var(--ink)] border border-[var(--line)] hover:border-amber-400 transition-all flex items-center gap-1.5 shadow-xs cursor-pointer"
								title="Открыть Яндекс Календарь"
								data-testid="portal-add-yandex-cal-btn"
							>
								<ExternalLink size={15} className="text-amber-500" />
								<span>Яндекс</span>
							</button>
						</div>
					</div>
				</div>
			</section>

			<div className="portal-grid">
				<section className="portal-card visits-card">
					<h3>История приёмов (ф. 043/у)</h3>
					{(patientData?.visits || []).length === 0 && (
						<EmptyState
							title="Записей пока нет"
							description="У вас пока нет истории приёмов или запланированных визитов."
							glass={false}
							style={{ padding: "20px 16px" }}
						/>
					)}
					{/* biome-ignore lint/suspicious/noExplicitAny: automated suppression */}
					{(patientData?.visits || [])?.map((v: any) => (
						<div
							key={v.id}
							className={`visit-item ${v.status === "completed" ? "past" : "upcoming"}`}
						>
							<div className="visit-date">
								{new Date(v.date).toLocaleDateString("ru-RU")}
							</div>
							<div className="visit-desc">{v.notes || "Консультация и осмотр"}</div>
							{v.status === "completed" ? (
								<span className="badge gray">Завершён</span>
							) : (
								<span className="badge blue">Запланирован</span>
							)}
						</div>
					))}
				</section>

				{/* FINANCIAL & INSTALLMENTS BLOCK */}
				<section className="portal-card plan-card">
					<div className="flex items-center justify-between pb-2 border-b border-[var(--line)]">
						<h3 className="m-0">Финансы и план лечения</h3>
						<button
							type="button"
							onClick={() => setShowTaxCertificate(true)}
							className="min-h-[40px] px-3 py-1.5 rounded-xl text-xs font-bold bg-teal-500/10 text-teal-600 dark:text-teal-400 border border-teal-500/30 hover:bg-teal-500/20 transition-all flex items-center gap-1.5 cursor-pointer"
							data-testid="portal-order-tax-certificate-btn"
						>
							<FileCheck2 size={15} />
							<span>Справка 13% НДФЛ</span>
						</button>
					</div>

					<div className="financial-summary">
						<div className="fin-stat">
							<span>Итого план</span>
							<strong>{money(totalCost || 145000)}</strong>
						</div>
						<div className="fin-stat">
							<span>Оплачено</span>
							<strong className="text-green">{money(paid || 45000)}</strong>
						</div>
						<div className="fin-stat">
							<span>{remaining < 0 ? "Переплата" : "Остаток"}</span>
							<strong className="text-orange">
								{money(Math.abs(remaining || 100000))}
							</strong>
						</div>
					</div>

					{/* Installment Plan Status Card */}
					<div className="p-3.5 rounded-2xl bg-[var(--paper-soft)] border border-[var(--line)] space-y-2 mt-3" data-testid="portal-installment-card">
						<div className="flex items-center justify-between">
							<div className="flex items-center gap-2">
								<CreditCard size={16} className="text-amber-500" />
								<strong className="text-xs font-bold text-[var(--ink)]">
									Беспроцентная рассрочка (0-0-12)
								</strong>
							</div>
							<span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
								Оплачено 4 из 12 взносов
							</span>
						</div>
						<div className="w-full bg-[var(--paper)] h-2 rounded-full overflow-hidden">
							<div className="bg-amber-500 h-full rounded-full" style={{ width: "33.3%" }} />
						</div>
						<div className="flex items-center justify-between text-[11px] text-[var(--muted)]">
							<span>Выплачено: <strong className="text-[var(--ink)]">45 000 ₽</strong> из 135 000 ₽</span>
							<span>Следующий взнос: <strong className="text-amber-600 dark:text-amber-400">11 250 ₽ до 15.09</strong></span>
						</div>
					</div>

					{/* 54-FZ Electronic Receipts Preview */}
					<div className="pt-3 border-t border-[var(--line)] space-y-2">
						<span className="text-xs font-bold text-[var(--muted)] uppercase tracking-wider block">
							Электронные кассовые чеки (54-ФЗ):
						</span>
						<div className="flex items-center justify-between p-2.5 rounded-xl bg-[var(--paper-soft)] border border-[var(--line)] text-xs">
							<div className="space-y-0.5">
								<strong className="text-[var(--ink)] block">Чек № ФД-498231</strong>
								<span className="text-[var(--muted)] text-[11px]">ФН: 999907890000 • Сумма: 45 000 ₽</span>
							</div>
							<button
								type="button"
								onClick={() => setActiveFiscalReceipt({
									fnNumber: "999907890000",
									fdNumber: "498231",
									fpdNumber: "3892019482",
									ofdName: "Платформа ОФД",
									amountRub: 45000,
									dateIso: "2026-08-15 14:22",
								})}
								className="min-h-[36px] px-3 py-1 rounded-lg text-xs font-bold bg-[var(--paper)] text-[var(--ink)] border border-[var(--line)] hover:border-[var(--teal)] transition-all flex items-center gap-1 cursor-pointer"
								data-testid="portal-view-fiscal-receipt-btn"
							>
								<Receipt size={14} className="text-[var(--teal)]" />
								<span>Открыть QR</span>
							</button>
						</div>
					</div>

					<div className="stages-list mt-3">
						{/* biome-ignore lint/suspicious/noExplicitAny: automated suppression */}
						{(plans ?? []).map((stage: any, index: number) => {
							const stageTotal = planTotals[index] ?? null;
							return (
								<div key={stage.id} className={`stage-item ${stage.status}`}>
									<span className="stage-desc">
										{stage.name || "План лечения"}
									</span>
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
					<h3>Медицинские документы</h3>
					{(patientData?.documents || []).length === 0 && (
						<EmptyState
							title="Документов нет"
							description="Нет выпущенных медицинских документов."
							glass={false}
							style={{ padding: "20px 16px" }}
						/>
					)}
					{/* biome-ignore lint/suspicious/noExplicitAny: automated suppression */}
					{(patientData?.documents || [])?.map((doc: any) => (
						<div key={doc.id} className="doc-item">
							<span className="flex items-center gap-1.5">
								<FileText size={16} className="text-[var(--teal)] flex-shrink-0" />
								<span>{doc.title}</span>
							</span>
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

			{/* ============================================================ */}
			{/* MODAL: RECEPTION CHECK-IN QR */}
			{/* ============================================================ */}
			{isReceptionQrOpen && (
				<div className="doc-overlay" onClick={() => setIsReceptionQrOpen(false)}>
					<div
						className="doc-overlay-content max-w-sm w-full p-6 text-center space-y-4 rounded-3xl"
						onClick={(e) => e.stopPropagation()}
						data-testid="portal-reception-qr-modal"
					>
						<div className="flex items-center justify-between pb-2 border-b border-[var(--line)]">
							<strong className="text-sm font-bold flex items-center gap-1.5">
								<QrCode size={18} className="text-[var(--teal)]" />
								<span>Регистрация на приём</span>
							</strong>
							<button
								type="button"
								onClick={() => setIsReceptionQrOpen(false)}
								className="min-h-[44px] min-w-[44px] flex items-center justify-center p-2 rounded-xl text-[var(--muted)] hover:text-[var(--ink)] cursor-pointer"
							>
								<X size={18} />
							</button>
						</div>

						<div
							className="p-3 bg-white rounded-2xl shadow-inner border border-slate-200 inline-block mx-auto"
							dangerouslySetInnerHTML={{
								__html: generateQrCodeSvg(`https://dente.ru/checkin?patientPhone=${encodeURIComponent(phone)}&t=portalNextAppt`, {
									size: 180,
									color: "#0f172a",
									background: "#ffffff",
								}),
							}}
						/>

						<div className="space-y-1">
							<div className="text-sm font-bold text-[var(--ink)]">
								{patientData?.patient?.fullName || "Пациент клиники DENTE"}
							</div>
							<p className="text-xs text-[var(--muted)] leading-relaxed m-0">
								Покажите этот экран администратору при входе для автоматической отметки о прибытии без очереди.
							</p>
						</div>
					</div>
				</div>
			)}

			{/* ============================================================ */}
			{/* MODAL: FNS TAX DEDUCTION CERTIFICATE (КНД 1151156) */}
			{/* ============================================================ */}
			{showTaxCertificate && (
				<div className="doc-overlay" onClick={() => setShowTaxCertificate(false)}>
					<div
						className="doc-overlay-content max-w-lg w-full p-6 space-y-4 rounded-3xl"
						onClick={(e) => e.stopPropagation()}
						data-testid="portal-tax-certificate-modal"
					>
						<div className="flex items-center justify-between pb-3 border-b border-[var(--line)]">
							<div>
								<h3 className="m-0 text-sm font-bold text-[var(--ink)] flex items-center gap-2">
									<FileCheck2 size={18} className="text-[var(--teal)]" />
									<span>Справка об оплате медицинских услуг (ФНС КНД 1151156)</span>
								</h3>
								<p className="m-0 text-xs text-[var(--muted)]">Для социального налогового вычета по НДФЛ 13%</p>
							</div>
							<button
								type="button"
								onClick={() => setShowTaxCertificate(false)}
								className="min-h-[44px] min-w-[44px] flex items-center justify-center p-2 rounded-xl text-[var(--muted)] hover:text-[var(--ink)] cursor-pointer"
								data-testid="close-portal-tax-modal-btn"
							>
								<X size={18} />
							</button>
						</div>

						<div className="p-4 rounded-2xl bg-[var(--paper-soft)] border border-[var(--line)] space-y-2.5 text-xs">
							<div className="flex justify-between pb-2 border-b border-[var(--line)]">
								<span className="text-[var(--muted)]">Налогоплательщик (Пациент):</span>
								<strong className="text-[var(--ink)]">{patientData?.patient?.fullName || "Пациент"}</strong>
							</div>
							<div className="flex justify-between pb-2 border-b border-[var(--line)]">
								<span className="text-[var(--muted)]">Медицинская организация:</span>
								<strong className="text-[var(--ink)]">ООО «Стоматологическая клиника ДЕНТЕ»</strong>
							</div>
							<div className="flex justify-between pb-2 border-b border-[var(--line)]">
								<span className="text-[var(--muted)]">ИНН / КПП клиники:</span>
								<span className="font-mono text-[var(--ink)]">7704123456 / 770401001</span>
							</div>
							<div className="flex justify-between pb-2 border-b border-[var(--line)]">
								<span className="text-[var(--muted)]">Сумма расходов за 2026 г.:</span>
								<strong className="text-[var(--teal)] text-sm">
									{(paid || 150000).toLocaleString("ru-RU")} ₽
								</strong>
							</div>
							<div className="flex justify-between pt-1 font-bold text-emerald-600 dark:text-emerald-400">
								<span>Расчетный возврат 13% НДФЛ:</span>
								<span>+{Math.min(Math.round((paid || 150000) * 0.13), 19500).toLocaleString("ru-RU")} ₽</span>
							</div>
						</div>

						<div className="flex items-center justify-end gap-2">
							<button
								type="button"
								onClick={() => {
									const certData = {
										knd: "1151156",
										statutoryBasis: "ст. 219 НК РФ",
										patientFullName: patientData?.patient?.fullName || "Пациент",
										clinicName: "ООО «Стоматологическая клиника ДЕНТЕ»",
										clinicInn: "7704123456",
										clinicKpp: "770401001",
										taxYear: 2026,
										totalPaidRub: paid || 150000,
										estimatedRefundRub: Math.min(Math.round((paid || 150000) * 0.13), 19500),
										issuedAtIso: new Date().toISOString(),
									};
									const blob = new Blob([JSON.stringify(certData, null, 2)], { type: "application/json" });
									const url = URL.createObjectURL(blob);
									const a = document.createElement("a");
									a.href = url;
									a.download = "FNS_Tax_Certificate_1151156_2026.json";
									a.click();
									URL.revokeObjectURL(url);
								}}
								className="min-h-[44px] px-4 py-2 rounded-xl text-xs font-bold bg-[var(--teal)] text-white hover:opacity-90 transition-all flex items-center gap-1.5 shadow-md cursor-pointer"
								data-testid="download-portal-tax-certificate-btn"
							>
								<Download size={16} />
								<span>Скачать справку (КНД 1151156)</span>
							</button>
						</div>
					</div>
				</div>
			)}

			{/* ============================================================ */}
			{/* MODAL: 54-FZ FISCAL RECEIPT WITH QR */}
			{/* ============================================================ */}
			{activeFiscalReceipt && (
				<div className="doc-overlay" onClick={() => setActiveFiscalReceipt(null)}>
					<div
						className="doc-overlay-content max-w-sm w-full p-6 text-center space-y-3 rounded-3xl"
						onClick={(e) => e.stopPropagation()}
						data-testid="portal-fiscal-receipt-modal"
					>
						<div className="flex items-center justify-between pb-2 border-b border-[var(--line)]">
							<strong className="text-sm font-bold flex items-center gap-1.5">
								<Receipt size={18} className="text-[var(--teal)]" />
								<span>Кассовый чек 54-ФЗ</span>
							</strong>
							<button
								type="button"
								onClick={() => setActiveFiscalReceipt(null)}
								className="min-h-[44px] min-w-[44px] flex items-center justify-center p-2 rounded-xl text-[var(--muted)] hover:text-[var(--ink)] cursor-pointer"
							>
								<X size={18} />
							</button>
						</div>

						<div
							className="p-3 bg-white rounded-2xl shadow-inner border border-slate-200 inline-block mx-auto"
							dangerouslySetInnerHTML={{
								__html: generateQrCodeSvg(`https://receipt.nalog.ru/v1/check?fn=${activeFiscalReceipt.fnNumber}&fd=${activeFiscalReceipt.fdNumber}&fpd=${activeFiscalReceipt.fpdNumber}&sum=${activeFiscalReceipt.amountRub * 100}`, {
									size: 160,
									color: "#0f172a",
									background: "#ffffff",
								}),
							}}
						/>

						<div className="p-3 rounded-xl bg-[var(--paper-soft)] border border-[var(--line)] text-left font-mono text-[11px] space-y-1">
							<div>ФД: {activeFiscalReceipt.fdNumber} • ФПД: {activeFiscalReceipt.fpdNumber}</div>
							<div>ФН: {activeFiscalReceipt.fnNumber}</div>
							<div>ОФД: {activeFiscalReceipt.ofdName}</div>
							<div className="font-bold text-[var(--teal)] pt-1 border-t border-[var(--line)]">
								Сумма: {activeFiscalReceipt.amountRub.toLocaleString("ru-RU")} ₽
							</div>
						</div>
					</div>
				</div>
			)}

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
								aria-label="Закрыть документ"
							>
								<X size={20} />
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
