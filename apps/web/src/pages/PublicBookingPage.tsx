import type React from "react";
import { useEffect, useState, useRef } from "react";
import {
	Calendar,
	User,
	ArrowRight,
	ShieldCheck,
	Phone,
	KeyRound,
	LogOut,
	MapPin,
	Clock,
	CheckCircle2,
	Sparkles,
} from "lucide-react";
import { PublicBookingWidget } from "../components/booking/PublicBookingWidget";
import { PatientCabinetModal } from "../components/portal/patientCabinet/PatientCabinetModal";
import { DEMO_PATIENT_CABINET } from "../components/portal/patientCabinet/patientCabinetPresets";
import type { PatientPersonalCabinetData } from "../components/portal/patientCabinet/patientCabinetEngine";
import { isDemoShowcaseMode } from "../lib/demoMode";
import { AuthArtBackground } from "../components/auth/AuthArtBackground";
import "./PublicBookingWidget.css";

export interface PublicBookingPageProps {
	/**
	 * Клиника из ссылки (/book/:orgId или ?org=...)
	 */
	readonly organizationId: string | null;
	/**
	 * Начальный режим: 'booking' (самозапись) или 'cabinet' (личный кабинет)
	 */
	readonly defaultMode?: "booking" | "cabinet";
}

/**
 * PublicBookingPage — каноническая страница публичной онлайн-записи и личного кабинета пациента.
 * Четкое разделение: страница /book (PublicBookingPage) и встраиваемый виджет (PublicBookingWidget).
 * Запись на приём в 2 клика: выбор врача/слота -> ввод имени и телефона -> подтверждение.
 */
export const PublicBookingPage: React.FC<PublicBookingPageProps> = ({
	organizationId,
	defaultMode = "booking",
}) => {
	const [activeMode, setActiveMode] = useState<"booking" | "cabinet">(defaultMode);
	const [isCabinetModalOpen, setIsCabinetModalOpen] = useState(false);
	const [portalToken, setPortalToken] = useState<string | null>(() => {
		if (typeof window !== "undefined") {
			return localStorage.getItem("dente_portal_token");
		}
		return null;
	});
	const [patientData, setPatientData] = useState<PatientPersonalCabinetData | undefined>(() =>
		isDemoShowcaseMode() ? DEMO_PATIENT_CABINET : undefined,
	);

	// Информация о клинике для десктопной витрины
	const [clinicInfo, setClinicInfo] = useState({
		name: "Стоматологический центр DENTE",
		address: "г. Москва, ул. Арбат, д. 24",
		workHours: "Пн–Сб 08:00 – 20:00, Вс 09:00 – 18:00",
		phone: "+7 (800) 200-55-40",
		license: "ЛО-77-01-021482",
	});

	// Авторизация в личном кабинете (опциональная вкладка, НЕ барьер для записи!)
	const [loginPhone, setLoginPhone] = useState("");
	const [otpCode, setOtpCode] = useState("");
	const [otpSent, setOtpSent] = useState(false);
	const [isLoading, setIsLoading] = useState(false);
	const [authError, setAuthError] = useState<string | null>(null);
	const phoneInputRef = useRef<HTMLInputElement | null>(null);

	const [effectiveOrgId, setEffectiveOrgId] = useState<string | null>(organizationId);
	const [isResolvingClinic, setIsResolvingClinic] = useState(!organizationId);

	const handleLogout = () => {
		if (typeof window !== "undefined") {
			localStorage.removeItem("dente_portal_token");
		}
		setPortalToken(null);
		setOtpSent(false);
		setOtpCode("");
		setIsCabinetModalOpen(false);
	};

	useEffect(() => {
		if (organizationId) {
			setEffectiveOrgId(organizationId);
			setIsResolvingClinic(false);
			return;
		}
		let cancelled = false;
		fetch("/api/public/booking/default-clinic")
			.then((res) => (res.ok ? res.json() : null))
			.then((json) => {
				if (cancelled) return;
				if (json?.organizationId) {
					setEffectiveOrgId(json.organizationId);
				}
				if (json?.name) {
					setClinicInfo((prev) => ({ ...prev, name: json.name }));
				}
				setIsResolvingClinic(false);
			})
			.catch(() => {
				if (!cancelled) setIsResolvingClinic(false);
			});
		return () => {
			cancelled = true;
		};
	}, [organizationId]);

	// Определение Telegram WebApp (бесшовный вход)
	useEffect(() => {
		const tg = (window as unknown as { Telegram?: { WebApp?: { expand?: () => void; ready?: () => void; initData?: string; initDataUnsafe?: { user?: { first_name?: string } } } } }).Telegram?.WebApp;
		if (tg) {
			tg.ready?.();
			tg.expand?.();
			if (tg.initData && effectiveOrgId) {
				void fetch("/api/portal/auth/telegram-webapp", {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ initData: tg.initData, organizationId: effectiveOrgId }),
				})
					.then((res) => (res.ok ? res.json() : null))
					.then((json) => {
						if (json?.token) {
							if (typeof window !== "undefined") {
								localStorage.setItem("dente_portal_token", json.token);
							}
							setPortalToken(json.token);
							setActiveMode("cabinet");
							setIsCabinetModalOpen(true);
						}
					})
					.catch(() => {});
			}
		}
	}, [effectiveOrgId]);

	const handleSendOtp = async () => {
		if (isLoading) return;
		if (!loginPhone.trim()) {
			setAuthError("Укажите номер телефона");
			phoneInputRef.current?.focus();
			return;
		}
		setIsLoading(true);
		setAuthError(null);
		try {
			const res = await fetch("/api/portal/auth/send-otp", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ phone: loginPhone.trim(), organizationId: effectiveOrgId || "default" }),
			});
			if (res.ok || res.status === 202) {
				setOtpSent(true);
			} else {
				const errJson = await res.json().catch(() => null);
				setAuthError(errJson?.error || "Не удалось отправить SMS-код подтверждения");
			}
		} catch {
			setAuthError("Сетевая ошибка при отправке SMS-кода");
		} finally {
			setIsLoading(false);
		}
	};

	const handleVerifyOtp = async () => {
		if (isLoading) return;
		if (!otpCode.trim()) {
			setAuthError("Введите код подтверждения из SMS");
			return;
		}
		setIsLoading(true);
		setAuthError(null);
		try {
			const res = await fetch("/api/portal/auth/verify-otp", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ phone: loginPhone.trim(), code: otpCode.trim(), organizationId: effectiveOrgId || "default" }),
			});
			if (res.ok) {
				const json = await res.json();
				if (json.token) {
					if (typeof window !== "undefined") {
						localStorage.setItem("dente_portal_token", json.token);
					}
					setPortalToken(json.token);
					setIsCabinetModalOpen(true);
					return;
				}
			}
			const errJson = await res.json().catch(() => null);
			setAuthError(errJson?.error || "Неверный или просроченный SMS-код");
		} catch {
			setAuthError("Сетевая ошибка при проверке SMS-кода");
		} finally {
			setIsLoading(false);
		}
	};

	if (isResolvingClinic) {
		return (
			<div className="flex flex-col items-center justify-center min-h-screen bg-[var(--paper)] text-[var(--ink)] p-6 text-center">
				<div className="w-8 h-8 border-3 border-[var(--primary)] border-t-transparent rounded-full animate-spin mb-3" />
				<p className="text-sm text-[var(--ink-muted)]">
					Загрузка расписания клиники...
				</p>
			</div>
		);
	}

	if (!effectiveOrgId) {
		return (
			<div className="flex flex-col items-center justify-center min-h-screen bg-[var(--paper)] text-[var(--ink)] p-6 text-center">
				<h2 className="text-xl font-bold mb-2">
					Запись по этой ссылке не открывается
				</h2>
				<p className="text-[var(--ink-muted)] max-w-sm">
					В ссылке не указана клиника, поэтому расписание загрузить не из чего.
					Откройте запись заново с сайта клиники или позвоните в клинику — там
					запишут на приём.
				</p>
			</div>
		);
	}

	return (
		<div className="PublicBookingWidget-root min-h-screen relative overflow-hidden flex flex-col items-center justify-start sm:justify-center p-0 sm:p-6 md:p-8">
			{/* Shared Atmospheric Art Background Layer (Mandates 8p, 8n) */}
			<AuthArtBackground overlayAlpha={0.4} />

			<div className="w-full max-w-6xl mx-auto flex flex-col items-center z-10 px-2 sm:px-4">
				{/* Верхний переключатель режимов: Онлайн-запись / Личный кабинет */}
				<div className="w-full max-w-2xl mb-4 sm:mb-6 flex items-center justify-between PublicBookingWidget-glass-nav p-1 rounded-none sm:rounded-2xl shadow-sm border-x-0 border-t-0 sm:border border-[var(--line)]">
					<button
						type="button"
						onClick={() => setActiveMode("booking")}
						className={`flex-1 py-2.5 px-4 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer ${
							activeMode === "booking"
								? "bg-[var(--primary)] text-white shadow-sm"
								: "text-[var(--ink-muted)] hover:text-[var(--ink)] hover:bg-[var(--paper-soft)]"
						}`}
					>
						<Calendar className="w-4 h-4" />
						<span>Онлайн-запись на приём</span>
					</button>
					<button
						type="button"
						onClick={() => {
							setActiveMode("cabinet");
							if (portalToken || patientData) {
								setIsCabinetModalOpen(true);
							}
						}}
						className={`flex-1 py-2.5 px-4 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer ${
							activeMode === "cabinet"
								? "bg-[var(--primary)] text-white shadow-sm"
								: "text-[var(--ink-muted)] hover:text-[var(--ink)] hover:bg-[var(--paper-soft)]"
						}`}
					>
						<User className="w-4 h-4" />
						<span>Личный кабинет</span>
					</button>
				</div>

				{/* Режим 1: Онлайн-запись на приём в 2 клика (сбалансированная двухколоночная витрина) */}
				{activeMode === "booking" && (
					<div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
						{/* Левая колонка витрины клиники на десктопе (>= 1024px) */}
						<aside
							className="hidden lg:flex lg:col-span-4 flex-col gap-5 backdrop-blur-md bg-[var(--paper)]/90 border border-[var(--line)] rounded-3xl p-6 sm:p-7 shadow-xl text-[var(--ink)] sticky top-6"
							data-testid="clinic-desktop-showcase"
						>
							{/* Бренд клиники */}
							<div className="flex items-center gap-3.5">
								<div className="w-12 h-12 rounded-2xl bg-[var(--primary-soft,rgba(13,148,136,0.12))] border border-[var(--primary)]/20 text-[var(--primary)] flex items-center justify-center font-bold text-xl tracking-tight shadow-sm shrink-0">
									D
								</div>
								<div className="min-w-0">
									<h2 className="text-base font-bold leading-tight text-[var(--ink)] break-words">
										{clinicInfo.name}
									</h2>
									<p className="text-xs text-[var(--ink-muted)] mt-0.5 flex items-center gap-1">
										<Sparkles className="w-3 h-3 text-teal-600 dark:text-teal-400" />
										<span>Цифровая стоматология</span>
									</p>
								</div>
							</div>

							{/* Лицензия ЛО-XX-XX */}
							<div className="flex items-center gap-2.5 p-3 rounded-2xl bg-[var(--paper-soft)] border border-[var(--line)] text-xs text-[var(--ink-muted)]">
								<ShieldCheck className="w-4 h-4 text-teal-600 dark:text-teal-400 shrink-0" />
								<div className="flex flex-col min-w-0">
									<span className="font-semibold text-[var(--ink)]">
										Лицензия № {clinicInfo.license}
									</span>
									<span className="text-[11px] text-[var(--ink-muted)]">
										Медицинская деятельность сертифицирована
									</span>
								</div>
							</div>

							{/* Контактные реквизиты */}
							<div className="space-y-3.5 text-xs">
								<div className="flex items-start gap-3">
									<MapPin className="w-4 h-4 text-[var(--ink-muted)] shrink-0 mt-0.5" />
									<div className="min-w-0">
										<div className="font-semibold text-[var(--ink)]">Адрес клиники:</div>
										<div className="text-[var(--ink-muted)] leading-relaxed mt-0.5">
											{clinicInfo.address}
										</div>
									</div>
								</div>

								<div className="flex items-start gap-3">
									<Clock className="w-4 h-4 text-[var(--ink-muted)] shrink-0 mt-0.5" />
									<div className="min-w-0">
										<div className="font-semibold text-[var(--ink)]">Часы приёма:</div>
										<div className="text-[var(--ink-muted)] leading-relaxed mt-0.5">
											{clinicInfo.workHours}
										</div>
									</div>
								</div>

								<div className="flex items-start gap-3">
									<Phone className="w-4 h-4 text-[var(--ink-muted)] shrink-0 mt-0.5" />
									<div className="min-w-0">
										<div className="font-semibold text-[var(--ink)]">Телефон для связи:</div>
										<a
											href={`tel:${clinicInfo.phone.replace(/[^+\d]/g, "")}`}
											className="text-[var(--primary)] hover:underline font-semibold leading-relaxed mt-0.5 block"
										>
											{clinicInfo.phone}
										</a>
									</div>
								</div>
							</div>

							{/* Преимущества и сервис */}
							<div className="pt-4 border-t border-[var(--line)] space-y-2">
								<div className="text-xs font-semibold uppercase tracking-wider text-[var(--ink-muted)] mb-2">
									Гарантии клиники:
								</div>
								<div className="flex items-center gap-2 text-xs text-[var(--ink)]">
									<CheckCircle2 className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400 shrink-0" />
									<span>Точный приём по времени без очередей</span>
								</div>
								<div className="flex items-center gap-2 text-xs text-[var(--ink)]">
									<CheckCircle2 className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400 shrink-0" />
									<span>Врачи высшей категории и кандидаты наук</span>
								</div>
								<div className="flex items-center gap-2 text-xs text-[var(--ink)]">
									<CheckCircle2 className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400 shrink-0" />
									<span>Бесплатное подтверждение и перенос записи</span>
								</div>
							</div>
						</aside>

						{/* Правая колонка: виджет бронирования */}
						<div className="col-span-1 lg:col-span-8 flex justify-center w-full min-w-0">
							<PublicBookingWidget
								organizationId={effectiveOrgId}
								className="dbw-with-art-bg w-full"
								title="Онлайн-запись в клинику ДЕНТЕ"
								subtitle="Выберите врача и удобное время визита"
							/>
						</div>
					</div>
				)}

				{/* Режим 2: Вход в личный кабинет (опциональная вкладка, не стена) */}
				{activeMode === "cabinet" && !isCabinetModalOpen && (
					<div className="w-full max-w-md PublicBookingWidget-glass-card rounded-3xl p-6 sm:p-8 shadow-xl border border-[var(--line)] bg-[var(--paper)]/95 text-[var(--ink)] animate-in fade-in zoom-in-95 duration-200">
						<div className="text-center mb-6">
							<div className="w-16 h-16 bg-[var(--primary-soft,rgba(13,148,136,0.1))] text-[var(--primary)] rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-inner">
								<ShieldCheck className="w-8 h-8" />
							</div>
							<h2 className="text-xl font-bold">Личный кабинет пациента</h2>
							<p className="text-sm text-[var(--ink-muted)] mt-1">
								Планы лечения, история визитов, справки и оплата
							</p>
						</div>

						{authError && (
							<div className="mb-4 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-sm">
								{authError}
							</div>
						)}

						{portalToken ? (
							<div className="space-y-4">
								<div className="p-4 rounded-xl bg-teal-50/80 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800 text-sm text-teal-900 dark:text-teal-200 text-center">
									Сессия личного кабинета активна
								</div>
								<button
									type="button"
									onClick={() => setIsCabinetModalOpen(true)}
									className="w-full py-3.5 bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white rounded-xl text-sm font-bold flex items-center justify-center gap-2 shadow-lg shadow-[var(--primary)]/20 transition-all cursor-pointer"
								>
									<span>Открыть кабинет пациента</span>
									<ArrowRight className="w-4 h-4" />
								</button>
								<button
									type="button"
									onClick={handleLogout}
									className="w-full py-2.5 bg-[var(--paper-soft)] hover:bg-[var(--paper-strong)] text-[var(--ink-muted)] hover:text-[var(--ink)] rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer"
								>
									<LogOut className="w-3.5 h-3.5" />
									<span>Выйти из кабинета</span>
								</button>
							</div>
						) : !otpSent ? (
							<div className="space-y-4">
								<div>
									<label className="block text-xs font-semibold text-[var(--ink-muted)] mb-1.5 uppercase tracking-wider">
										Номер телефона
									</label>
									<div className="relative">
										<Phone className="absolute left-3.5 top-3.5 w-4 h-4 text-[var(--ink-muted)]" />
										<input
											ref={phoneInputRef}
											type="tel"
											value={loginPhone}
											onChange={(e) => setLoginPhone(e.target.value)}
											placeholder="+7 (999) 000-00-00"
											className="w-full pl-10 pr-4 py-3 bg-[var(--paper-soft)] border border-[var(--line)] rounded-xl text-sm font-medium text-[var(--ink)] focus:ring-2 focus:ring-[var(--primary)] outline-none"
										/>
									</div>
								</div>
								<button
									type="button"
									onClick={handleSendOtp}
									aria-busy={isLoading}
									className="w-full py-3.5 bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white rounded-xl text-sm font-bold flex items-center justify-center gap-2 shadow-lg shadow-[var(--primary)]/20 transition-all cursor-pointer"
								>
									<span>{isLoading ? "Отправка кода..." : "Получить код входа"}</span>
									<ArrowRight className="w-4 h-4" />
								</button>
								{patientData && (
									<button
										type="button"
										onClick={() => setIsCabinetModalOpen(true)}
										className="w-full py-2.5 bg-[var(--paper-soft)] hover:bg-[var(--paper-strong)] text-[var(--ink)] rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer"
										data-testid="open-demo-cabinet-btn"
									>
										<span>Открыть кабинет пациента (Тест-драйв)</span>
										<ArrowRight className="w-3.5 h-3.5" />
									</button>
								)}
								<p className="text-[11px] text-center text-[var(--ink-muted)] mt-2 leading-relaxed">
									Вход в личный кабинет для просмотра медкарты и истории визитов. Для первичной записи код не требуется.
								</p>
							</div>
						) : (
							<div className="space-y-4">
								<div className="p-3 rounded-xl bg-[var(--primary-soft,rgba(13,148,136,0.1))] border border-[var(--primary)]/20 text-xs text-[var(--primary)]">
									Код подтверждения отправлен на {loginPhone}
								</div>
								<div>
									<label className="block text-xs font-semibold text-[var(--ink-muted)] mb-1.5 uppercase tracking-wider">
										Одноразовый SMS/Telegram-код
									</label>
									<div className="relative">
										<KeyRound className="absolute left-3.5 top-3.5 w-4 h-4 text-[var(--ink-muted)]" />
										<input
											type="text"
											maxLength={6}
											value={otpCode}
											onChange={(e) => setOtpCode(e.target.value)}
											placeholder="000000"
											className="w-full pl-10 pr-4 py-3 bg-[var(--paper-soft)] border border-[var(--line)] rounded-xl text-base tracking-widest font-mono font-bold text-center text-[var(--ink)] focus:ring-2 focus:ring-[var(--primary)] outline-none"
										/>
									</div>
								</div>
								<button
									type="button"
									onClick={handleVerifyOtp}
									aria-busy={isLoading}
									className="w-full py-3.5 bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white rounded-xl text-sm font-bold flex items-center justify-center gap-2 shadow-lg shadow-[var(--primary)]/20 transition-all cursor-pointer"
								>
									<span>{isLoading ? "Проверка..." : "Войти в кабинет"}</span>
									<ArrowRight className="w-4 h-4" />
								</button>
								<button
									type="button"
									onClick={() => {
										handleLogout();
										setLoginPhone("");
									}}
									className="w-full py-2 text-xs text-[var(--ink-muted)] hover:underline text-center cursor-pointer"
								>
									Изменить номер телефона
								</button>
							</div>
						)}
					</div>
				)}

				{/* Модальный кабинет пациента */}
				{isCabinetModalOpen && (
					<PatientCabinetModal
						isOpen={isCabinetModalOpen}
						onClose={() => setIsCabinetModalOpen(false)}
						initialData={patientData}
						token={portalToken || undefined}
					/>
				)}
			</div>
		</div>
	);
};

export default PublicBookingPage;
