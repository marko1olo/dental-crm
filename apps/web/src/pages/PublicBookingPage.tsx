import type React from "react";
import { useEffect, useState } from "react";
import { Calendar, User, ArrowRight, ShieldCheck, Phone, KeyRound } from "lucide-react";
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
	const [portalToken, setPortalToken] = useState<string | null>(null);
	const [patientData, setPatientData] = useState<PatientPersonalCabinetData | undefined>(() =>
		isDemoShowcaseMode() ? DEMO_PATIENT_CABINET : undefined,
	);

	// Авторизация в личном кабинете (опциональная вкладка, НЕ барьер для записи!)
	const [loginPhone, setLoginPhone] = useState("");
	const [otpCode, setOtpCode] = useState("");
	const [otpSent, setOtpSent] = useState(false);
	const [isLoading, setIsLoading] = useState(false);
	const [authError, setAuthError] = useState<string | null>(null);

	const [effectiveOrgId, setEffectiveOrgId] = useState<string | null>(organizationId);
	const [isResolvingClinic, setIsResolvingClinic] = useState(!organizationId);

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
		if (!loginPhone.trim()) {
			setAuthError("Укажите номер телефона");
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
			<div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 dark:bg-slate-950 p-6 text-center text-slate-900 dark:text-slate-100">
				<div className="w-8 h-8 border-3 border-sky-600 border-t-transparent rounded-full animate-spin mb-3" />
				<p className="text-sm text-gray-600 dark:text-slate-400">
					Загрузка расписания клиники...
				</p>
			</div>
		);
	}

	if (!effectiveOrgId) {
		return (
			<div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 dark:bg-slate-950 p-6 text-center text-slate-900 dark:text-slate-100">
				<h2 className="text-xl font-bold mb-2">
					Запись по этой ссылке не открывается
				</h2>
				<p className="text-gray-600 dark:text-slate-400 max-w-sm">
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

			{/* Верхний переключатель режимов: Онлайн-запись / Личный кабинет */}
			<div className="w-full max-w-2xl mb-0 sm:mb-4 flex items-center justify-between PublicBookingWidget-glass-nav p-1 rounded-none sm:rounded-2xl shadow-sm border-x-0 border-t-0 sm:border border-slate-200/80 dark:border-slate-800/80">
				<button
					type="button"
					onClick={() => setActiveMode("booking")}
					className={`flex-1 py-2.5 px-4 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer ${
						activeMode === "booking"
							? "bg-sky-600 text-white shadow-sm"
							: "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
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
							? "bg-sky-600 text-white shadow-sm"
							: "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
					}`}
				>
					<User className="w-4 h-4" />
					<span>Личный кабинет</span>
				</button>
			</div>

			{/* Режим 1: Онлайн-запись на приём в 2 клика */}
			{activeMode === "booking" && (
				<PublicBookingWidget
					organizationId={effectiveOrgId}
					className="dbw-with-art-bg"
					title="Онлайн-запись в клинику ДЕНТЕ"
					subtitle="Выберите врача и удобное время визита"
				/>
			)}

			{/* Режим 2: Вход в личный кабинет (опциональная вкладка, не стена) */}
			{activeMode === "cabinet" && !isCabinetModalOpen && (
				<div className="w-full max-w-md PublicBookingWidget-glass-card rounded-3xl p-6 sm:p-8 shadow-xl border border-slate-200/80 dark:border-slate-800/80 text-slate-900 dark:text-slate-100 animate-in fade-in zoom-in-95 duration-200">
					<div className="text-center mb-6">
						<div className="w-16 h-16 bg-sky-100 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-inner">
							<ShieldCheck className="w-8 h-8" />
						</div>
						<h2 className="text-xl font-bold">Личный кабинет пациента</h2>
						<p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
							Планы лечения, история визитов, справки и оплата
						</p>
					</div>

					{authError && (
						<div className="mb-4 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-sm">
							{authError}
						</div>
					)}

					{!otpSent ? (
						<div className="space-y-4">
							<div>
								<label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5 uppercase tracking-wider">
									Номер телефона
								</label>
								<div className="relative">
									<Phone className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-400" />
									<input
										type="tel"
										value={loginPhone}
										onChange={(e) => setLoginPhone(e.target.value)}
										placeholder="+7 (999) 000-00-00"
										className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium focus:ring-2 focus:ring-sky-500 outline-none"
									/>
								</div>
							</div>
							<button
								type="button"
								onClick={handleSendOtp}
								disabled={isLoading || !loginPhone}
								className="w-full py-3.5 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-sm font-bold flex items-center justify-center gap-2 shadow-lg shadow-sky-600/20 transition-all disabled:opacity-50 cursor-pointer"
							>
								<span>{isLoading ? "Отправка кода..." : "Получить код входа"}</span>
								<ArrowRight className="w-4 h-4" />
							</button>
							{patientData && (
								<button
									type="button"
									onClick={() => setIsCabinetModalOpen(true)}
									className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer"
									data-testid="open-demo-cabinet-btn"
								>
									<span>Открыть кабинет пациента (Тест-драйв)</span>
									<ArrowRight className="w-3.5 h-3.5" />
								</button>
							)}
							<p className="text-[11px] text-center text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">
								Вход в личный кабинет для просмотра медкарты и истории визитов. Для первичной записи код не требуется.
							</p>
						</div>
					) : (
						<div className="space-y-4">
							<div className="p-3 rounded-xl bg-sky-50 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-800 text-xs text-sky-800 dark:text-sky-300">
								Код подтверждения отправлен на {loginPhone}
							</div>
							<div>
								<label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5 uppercase tracking-wider">
									Одноразовый SMS/Telegram-код
								</label>
								<div className="relative">
									<KeyRound className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-400" />
									<input
										type="text"
										maxLength={6}
										value={otpCode}
										onChange={(e) => setOtpCode(e.target.value)}
										placeholder="000000"
										className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-base tracking-widest font-mono font-bold text-center focus:ring-2 focus:ring-sky-500 outline-none"
									/>
								</div>
							</div>
							<button
								type="button"
								onClick={handleVerifyOtp}
								disabled={isLoading}
								className="w-full py-3.5 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-sm font-bold flex items-center justify-center gap-2 shadow-lg shadow-sky-600/20 transition-all cursor-pointer"
							>
								<span>{isLoading ? "Проверка..." : "Войти в кабинет"}</span>
								<ArrowRight className="w-4 h-4" />
							</button>
							<button
								type="button"
								onClick={() => setOtpSent(false)}
								className="w-full py-2 text-xs text-slate-500 dark:text-slate-400 hover:underline text-center cursor-pointer"
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
	);
};

export default PublicBookingPage;
