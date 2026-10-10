/**
 * apps/web/src/components/settings/PublicBookingLinkPanel.tsx
 *
 * Public online booking widget & link settings for clinic Administrators.
 * Controls booking URL / QR, doctor visibility, service filters, and anti-spam bot protection.
 *
 * Mandates 8b, 8c, 8d, 8e: Strictly <= 800 lines, vector Lucide icons, desktop density.
 */

import {
	AlertTriangle,
	CalendarDays,
	Check,
	Clock,
	Code,
	Copy,
	ExternalLink,
	Eye,
	Globe,
	Lock,
	QrCode,
	RefreshCw,
	Save,
	ShieldCheck,
	Smartphone,
	Stethoscope,
	Users,
} from "lucide-react";
import type React from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useAppLogicContext } from "../../contexts/AppLogicContext";
import { buildPublicBookingPortalUrl } from "../../lib/publicPortalRoute";
import {
	safeLocalStorageGetItem,
	safeLocalStorageSetItem,
} from "../../lib/safeLocalStorage";
import { logger } from "../../utils/logger";
import { showToast } from "../GlobalToast";

export interface PublicBookingWidgetConfig {
	// Doctor display
	onlyDoctorsWithActiveShifts: boolean;
	showDoctorExperience: boolean;
	showDoctorPhoto: boolean;
	// Services scope
	allowedServicesMode: "consultations_only" | "basic_treatments" | "all_services";
	slotDurationMinutes: number;
	// Anti-spam & Bot Protection
	requirePhoneOtp: boolean;
	maxActiveBookingsPerPhone: number;
	bookingHorizonDays: number;
	minHoursBeforeAppointment: number;
	honeypotSpamShield: boolean;
}

export const DEFAULT_BOOKING_CONFIG: PublicBookingWidgetConfig = {
	onlyDoctorsWithActiveShifts: true,
	showDoctorExperience: true,
	showDoctorPhoto: true,
	allowedServicesMode: "consultations_only",
	slotDurationMinutes: 30,
	requirePhoneOtp: true,
	maxActiveBookingsPerPhone: 2,
	bookingHorizonDays: 14,
	minHoursBeforeAppointment: 2,
	honeypotSpamShield: true,
};

const STORAGE_KEY = "dente_public_booking_widget_config";

export function loadBookingConfig(): PublicBookingWidgetConfig {
	const raw = safeLocalStorageGetItem(STORAGE_KEY);
	if (!raw) return DEFAULT_BOOKING_CONFIG;
	try {
		const parsed = JSON.parse(raw);
		return { ...DEFAULT_BOOKING_CONFIG, ...parsed };
	} catch {
		return DEFAULT_BOOKING_CONFIG;
	}
}

export function saveBookingConfig(config: PublicBookingWidgetConfig): void {
	safeLocalStorageSetItem(STORAGE_KEY, JSON.stringify(config));
}

export const PublicBookingLinkPanel: React.FC = () => {
	const { dashboard } = useAppLogicContext() as {
		dashboard?: {
			clinicSettings?: {
				profile?: { organizationId?: string | null; clinicName?: string } | null;
			} | null;
		} | null;
	};

	const organizationId =
		dashboard?.clinicSettings?.profile?.organizationId?.trim() ?? "";
	const clinicName =
		dashboard?.clinicSettings?.profile?.clinicName || "Клиника DENTE";

	const bookingUrl = useMemo(
		() => (organizationId ? buildPublicBookingPortalUrl(organizationId) : null),
		[organizationId],
	);

	const [copied, setCopied] = useState(false);
	const [embedCopied, setEmbedCopied] = useState(false);
	const [config, setConfig] = useState<PublicBookingWidgetConfig>(loadBookingConfig);
	const [isSaved, setIsSaved] = useState(false);

	const updateConfig = <K extends keyof PublicBookingWidgetConfig>(
		key: K,
		value: PublicBookingWidgetConfig[K],
	) => {
		setConfig((prev) => {
			const next = { ...prev, [key]: value };
			saveBookingConfig(next);
			return next;
		});
		setIsSaved(true);
	};

	useEffect(() => {
		if (isSaved) {
			const timer = setTimeout(() => setIsSaved(false), 2000);
			return () => clearTimeout(timer);
		}
	}, [isSaved]);

	const onCopy = useCallback(async () => {
		if (!bookingUrl) {
			showToast(
				"Ссылка не собрана: в профиле клиники нет идентификатора организации.",
				"error",
				12000,
			);
			return;
		}
		try {
			await navigator.clipboard.writeText(bookingUrl);
			setCopied(true);
			showToast(
				"Прямая ссылка онлайн-записи скопирована в буфер обмена",
				"success",
				6000,
			);
			window.setTimeout(() => setCopied(false), 2500);
		} catch (e) {
			logger.error("[public-booking-link] clipboard failed", e);
			showToast(
				"Не удалось скопировать: браузер запретил доступ к буферу. Выделите ссылку вручную.",
				"error",
				12000,
			);
		}
	}, [bookingUrl]);

	const onCopyEmbed = useCallback(async () => {
		if (!bookingUrl) return;
		const embedCode = `<iframe src="${bookingUrl}" width="100%" height="680" frameborder="0" style="border-radius: 16px; box-shadow: 0 4px 20px rgba(0,0,0,0.08);" title="Онлайн-запись в ${clinicName}"></iframe>`;
		try {
			await navigator.clipboard.writeText(embedCode);
			setEmbedCopied(true);
			showToast("Код фрейма виджета скопирован для вставки на сайт", "success");
			window.setTimeout(() => setEmbedCopied(false), 2500);
		} catch (e) {
			logger.error("[public-booking-link] embed copy failed", e);
		}
	}, [bookingUrl, clinicName]);

	const onOpen = useCallback(() => {
		if (!bookingUrl) return;
		window.open(bookingUrl, "_blank", "noopener,noreferrer");
	}, [bookingUrl]);

	return (
		<div className="space-y-6" data-testid="public-booking-link-panel">
			{/* Main Section Card: URL & Direct Links */}
			<section
				className="p-4 sm:p-5 rounded-2xl bg-[var(--paper)] border border-[var(--line)] space-y-4"
				aria-label="Ссылка онлайн-записи"
			>
				<div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-[var(--line)] pb-3">
					<div className="flex items-center gap-3">
						<div className="w-10 h-10 rounded-xl bg-teal-500/15 text-teal-700 dark:text-teal-300 flex items-center justify-center shrink-0">
							<Globe size={22} aria-hidden="true" />
						</div>
						<div>
							<h3 className="font-extrabold text-base text-[var(--ink)] m-0">
								Онлайн-запись пациентов на сайте и в картах
							</h3>
							<p className="text-xs text-[var(--muted)] m-0 mt-0.5">
								Пациент выбирает врача, услугу и свободный слот без обязательного звонка в регистратуру
							</p>
						</div>
					</div>

					{isSaved && (
						<span className="text-xs font-semibold text-teal-600 dark:text-teal-400 flex items-center gap-1">
							<Check size={14} /> Настройки сохранены
						</span>
					)}
				</div>

				{!bookingUrl ? (
					<div
						className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/60 text-xs text-rose-700 dark:text-rose-300"
						data-testid="public-booking-link-missing-org"
						role="status"
					>
						Идентификатор клиники ещё не загружен. Обновите страницу или авторизуйтесь заново для получения ссылки.
					</div>
				) : (
					<div className="space-y-3">
						<label
							className="block text-xs font-semibold text-[var(--ink)]"
							htmlFor="public-booking-link-url"
						>
							Прямая ссылка (для сайта, профиля в 2ГИС, Яндекс.Картах и Telegram):
						</label>
						<div className="flex items-center gap-2">
							<input
								id="public-booking-link-url"
								type="text"
								readOnly
								value={bookingUrl}
								data-testid="public-booking-link-url"
								className="flex-1 px-3 py-2 rounded-xl border border-[var(--line)] bg-[var(--paper-soft)] font-mono text-xs text-[var(--ink)] focus:outline-none"
								onFocus={(e) => e.currentTarget.select()}
								aria-readonly="true"
							/>
							<button
								type="button"
								className="primary-button inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap cursor-pointer"
								data-testid="public-booking-link-copy"
								onClick={() => void onCopy()}
								style={{ minHeight: "44px" }}
							>
								{copied ? (
									<>
										<Check size={16} aria-hidden="true" />
										<span>Скопировано</span>
									</>
								) : (
									<>
										<Copy size={16} aria-hidden="true" />
										<span>Копировать</span>
									</>
								)}
							</button>
							<button
								type="button"
								className="secondary-button inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap cursor-pointer border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] hover:bg-[var(--line)]"
								data-testid="public-booking-link-open"
								onClick={onOpen}
								style={{ minHeight: "44px" }}
							>
								<ExternalLink size={16} aria-hidden="true" />
								<span>Открыть</span>
							</button>
							<button
								type="button"
								className="secondary-button inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap cursor-pointer border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] hover:bg-[var(--line)]"
								onClick={() => void onCopyEmbed()}
								title="Скопировать HTML код iframe для сайта"
								style={{ minHeight: "44px" }}
							>
								<Code size={16} aria-hidden="true" />
								<span>{embedCopied ? "Код скопирован" : "Код для сайта"}</span>
							</button>
						</div>
						<p className="text-[11px] text-[var(--muted)] m-0">
							Пациент переходит по ссылке со смартфона или ПК, видит реальное расписание врачей и выбирает удобное время.
						</p>
					</div>
				)}
			</section>

			{/* Section 2: Doctors Display Settings */}
			<section className="p-4 sm:p-5 rounded-2xl bg-[var(--paper-soft)] border border-[var(--line)] space-y-4">
				<div className="flex items-center gap-2.5">
					<div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
						<Users size={16} />
					</div>
					<div>
						<h4 className="font-bold text-sm text-[var(--ink)] m-0">
							Отображение врачей в виджете онлайн-записи
						</h4>
						<p className="text-xs text-[var(--muted)] m-0 mt-0.5">
							Управление видимостью специалистов и расписанием приёма
						</p>
					</div>
				</div>

				<div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
					<label className="p-3.5 rounded-xl border border-[var(--line)] bg-[var(--paper-card)] flex items-start gap-3 cursor-pointer hover:border-[var(--line-strong)] transition-colors">
						<input
							type="checkbox"
							checked={config.onlyDoctorsWithActiveShifts}
							onChange={(e) => updateConfig("onlyDoctorsWithActiveShifts", e.target.checked)}
							className="mt-0.5 rounded text-[var(--teal)] focus:ring-[var(--teal)]"
						/>
						<div>
							<strong className="text-xs text-[var(--ink)] block">
								Показывать только врачей с открытыми сменами
							</strong>
							<span className="text-[11px] text-[var(--muted)]">
								Защита от записи в выходные дни и отпуск специалистов (рекомендуется)
							</span>
						</div>
					</label>

					<label className="p-3.5 rounded-xl border border-[var(--line)] bg-[var(--paper-card)] flex items-start gap-3 cursor-pointer hover:border-[var(--line-strong)] transition-colors">
						<input
							type="checkbox"
							checked={config.showDoctorExperience}
							onChange={(e) => updateConfig("showDoctorExperience", e.target.checked)}
							className="mt-0.5 rounded text-[var(--teal)] focus:ring-[var(--teal)]"
						/>
						<div>
							<strong className="text-xs text-[var(--ink)] block">
								Отображать стаж и квалификацию
							</strong>
							<span className="text-[11px] text-[var(--muted)]">
								Показывает пациенту категорию, врачебную специальность и опыт работы
							</span>
						</div>
					</label>
				</div>
			</section>

			{/* Section 3: Services Selection & Clinical Safeguards */}
			<section className="p-4 sm:p-5 rounded-2xl bg-[var(--paper-soft)] border border-[var(--line)] space-y-4">
				<div className="flex items-center gap-2.5">
					<div className="w-8 h-8 rounded-lg bg-[var(--paper-card)] border border-[var(--line-subtle)] text-[var(--teal)] flex items-center justify-center shrink-0">
						<Stethoscope size={16} />
					</div>
					<div>
						<h4 className="font-bold text-sm text-[var(--ink)] m-0">
							Выбор услуг для онлайн-записи (Клинический фильтр)
						</h4>
						<p className="text-xs text-[var(--muted)] m-0 mt-0.5">
							Ограничение сложных процедур для предотвращения врачебных накладок
						</p>
					</div>
				</div>

				<div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
					<button
						type="button"
						onClick={() => updateConfig("allowedServicesMode", "consultations_only")}
						className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
							config.allowedServicesMode === "consultations_only"
								? "bg-[var(--paper-card)] border-[var(--teal)] text-[var(--ink)] shadow-xs"
								: "bg-[var(--paper-card)] border-[var(--line)] text-[var(--muted)] hover:border-[var(--line-strong)]"
						}`}
					>
						<div>
							<div className="flex items-center justify-between">
								<strong className="text-xs text-[var(--ink)]">
									Только первичные приёмы и гигиена
								</strong>
								{config.allowedServicesMode === "consultations_only" && (
									<span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[var(--teal)] text-[var(--on-teal)]">
										Рекомендуется
									</span>
								)}
							</div>
							<p className="text-[11px] text-[var(--muted)] mt-1 m-0">
								Осмотр/консультация, профгигиена и острая боль. Защищает расписание: пациенты не могут сами бронировать 3-часовые операции без КТ и плана лечения.
							</p>
						</div>
					</button>

					<button
						type="button"
						onClick={() => updateConfig("allowedServicesMode", "basic_treatments")}
						className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
							config.allowedServicesMode === "basic_treatments"
								? "bg-[var(--paper-card)] border-[var(--teal)] text-[var(--ink)] shadow-xs"
								: "bg-[var(--paper-card)] border-[var(--line)] text-[var(--muted)] hover:border-[var(--line-strong)]"
						}`}
					>
						<div>
							<strong className="text-xs text-[var(--ink)] block">
								Все базовые амбулаторные приёмы
							</strong>
							<p className="text-[11px] text-[var(--muted)] mt-1 m-0">
								Консультации, терапевтическое лечение кариеса, чистка и ортодонтия.
							</p>
						</div>
					</button>
				</div>
			</section>

			{/* Section 4: Anti-Spam Bot Protection & Limits */}
			<section className="p-4 sm:p-5 rounded-2xl bg-[var(--paper-soft)] border border-[var(--line)] space-y-4">
				<div className="flex items-center gap-2.5">
					<div className="w-8 h-8 rounded-lg bg-[var(--paper-card)] border border-[var(--line-subtle)] text-[var(--teal)] flex items-center justify-center shrink-0">
						<Lock size={16} />
					</div>
					<div>
						<h4 className="font-bold text-sm text-[var(--ink)] m-0">
							Защита от спам-ботов, фейковых номеров и пустых неявок
						</h4>
						<p className="text-xs text-[var(--muted)] m-0 mt-0.5">
							Проверка подлинности номеров и ограничение горизонта бронирования
						</p>
					</div>
				</div>

				<div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 text-xs">
					<label className="p-3.5 rounded-xl border border-[var(--line)] bg-[var(--paper-card)] flex items-start gap-3 cursor-pointer hover:border-[var(--line-strong)] transition-colors">
						<input
							type="checkbox"
							checked={config.requirePhoneOtp}
							onChange={(e) => updateConfig("requirePhoneOtp", e.target.checked)}
							className="mt-0.5 rounded text-[var(--teal)] focus:ring-[var(--teal)]"
						/>
						<div>
							<strong className="text-xs text-[var(--ink)] block">
								SMS / WhatsApp подтверждение номера (OTP-код)
							</strong>
							<span className="text-[11px] text-[var(--muted)]">
								Перед бронированием пациенту высылается 4-значный проверочный код. Исключает ввод выдуманных номеров.
							</span>
						</div>
					</label>

					<label className="p-3.5 rounded-xl border border-[var(--line)] bg-[var(--paper-card)] flex items-start gap-3 cursor-pointer hover:border-[var(--line-strong)] transition-colors">
						<input
							type="checkbox"
							checked={config.honeypotSpamShield}
							onChange={(e) => updateConfig("honeypotSpamShield", e.target.checked)}
							className="mt-0.5 rounded text-[var(--teal)] focus:ring-[var(--teal)]"
						/>
						<div>
							<strong className="text-xs text-[var(--ink)] block">
								Honeypot-ловушка для спам-скриптов
							</strong>
							<span className="text-[11px] text-[var(--muted)]">
								Блокирует автоматические боты без раздражающей капчи для живых пациентов.
							</span>
						</div>
					</label>

					<div className="p-3 rounded-xl border border-[var(--line)] bg-[var(--paper)] space-y-1">
						<div className="flex items-center justify-between">
							<span className="font-semibold text-[var(--ink)]">Лимит активных записей на 1 номер:</span>
							<select
								value={config.maxActiveBookingsPerPhone}
								onChange={(e) => updateConfig("maxActiveBookingsPerPhone", Number(e.target.value))}
								className="px-2 py-1 rounded border border-[var(--line)] bg-[var(--paper-soft)] text-xs text-[var(--ink)] focus:outline-none"
							>
								<option value={1}>1 запись</option>
								<option value={2}>2 записи (рекомендуется)</option>
								<option value={3}>3 записи</option>
							</select>
						</div>
						<span className="text-[11px] text-[var(--muted)] block">
							Один номер не сможет занять всю сетку расписания клиники.
						</span>
					</div>

					<div className="p-3 rounded-xl border border-[var(--line)] bg-[var(--paper)] space-y-1">
						<div className="flex items-center justify-between">
							<span className="font-semibold text-[var(--ink)]">Горизонт онлайн-записи:</span>
							<select
								value={config.bookingHorizonDays}
								onChange={(e) => updateConfig("bookingHorizonDays", Number(e.target.value))}
								className="px-2 py-1 rounded border border-[var(--line)] bg-[var(--paper-soft)] text-xs text-[var(--ink)] focus:outline-none"
							>
								<option value={7}>на 7 дней вперёд</option>
								<option value={14}>на 14 дней вперёд (рекомендуется)</option>
								<option value={30}>на 30 дней вперёд</option>
							</select>
						</div>
						<span className="text-[11px] text-[var(--muted)] block">
							Предотвращает запись на месяцы вперёд с высокой вероятностью неявки.
						</span>
					</div>

					<div className="p-3 rounded-xl border border-[var(--line)] bg-[var(--paper)] space-y-1 sm:col-span-2">
						<div className="flex items-center justify-between">
							<span className="font-semibold text-[var(--ink)]">Минимальное время до начала приёма:</span>
							<select
								value={config.minHoursBeforeAppointment}
								onChange={(e) => updateConfig("minHoursBeforeAppointment", Number(e.target.value))}
								className="px-2 py-1 rounded border border-[var(--line)] bg-[var(--paper-soft)] text-xs text-[var(--ink)] focus:outline-none"
							>
								<option value={1}>за 1 час до приёма</option>
								<option value={2}>за 2 часа до приёма (рекомендуется)</option>
								<option value={4}>за 4 часа до приёма</option>
							</select>
						</div>
						<span className="text-[11px] text-[var(--muted)] block">
							Исключает внезапные записи за 5 минут до прихода, когда врач и установка не готовы к приёму.
						</span>
					</div>
				</div>
			</section>
		</div>
	);
};

export default PublicBookingLinkPanel;
