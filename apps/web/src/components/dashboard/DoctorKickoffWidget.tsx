import React, { useEffect, useMemo, useState } from "react";
import {
	Calendar,
	CreditCard,
	Radio,
	Sparkles,
	Stethoscope,
	Users,
	Zap,
} from "lucide-react";
import { countLabel } from "../../lib/russianPlural";
import {
	getCachedActiveStaffUser,
	isOfflineAutonomyMode,
} from "../../lib/offlineStorage";

if (typeof document !== "undefined") {
	void import("./DoctorKickoffWidget.css").catch(() => {});
}

export interface DoctorKickoffWidgetProps {
	/** ФИО или обращение к врачу (если не передано, извлекается из кэша сессии) */
	readonly doctorName?: string | null | undefined;
	/** Количество запланированных пациентов на сегодня */
	readonly appointmentsCount?: number | undefined;
	/** Статус открытой рабочей смены врача */
	readonly isShiftOpen?: boolean | undefined;
	/** Готовность кассы к приёму платежей (54-ФЗ) */
	readonly isCashReady?: boolean | undefined;
	/** Сетевой статус (если не передан, вычисляется автоматически) */
	readonly isOffline?: boolean | undefined;
	/** Обработчик переключения / открытия смены */
	readonly onToggleShift?: (() => void) | undefined;
	/** Обработчик перехода в расписание */
	readonly onOpenSchedule?: (() => void) | undefined;
	/** Обработчик перехода в кассу */
	readonly onOpenCheckout?: (() => void) | undefined;
	/** Дополнительные CSS классы */
	readonly className?: string | undefined;
}

/**
 * Вычисляет приветствие по текущему времени суток
 */
export function getKickoffTimeGreeting(customHour?: number): string {
	const hour = customHour ?? new Date().getHours();
	if (hour >= 5 && hour < 12) {
		return "Доброе утро";
	}
	if (hour >= 12 && hour < 18) {
		return "Добрый день";
	}
	if (hour >= 18 && hour < 23) {
		return "Добрый вечер";
	}
	return "Доброй ночи";
}

/**
 * Формирует персонализированное приветствие: «Доброе утро, доктор [Имя]!»
 */
export function formatDoctorGreeting(
	rawDoctorName?: string | null,
	customHour?: number,
): string {
	const greeting = getKickoffTimeGreeting(customHour);

	let name = (rawDoctorName ?? "").trim();
	if (!name) {
		const cached = getCachedActiveStaffUser() as {
			fullName?: string;
			name?: string;
		} | null;
		name = (cached?.fullName || cached?.name || "").trim();
	}

	if (name) {
		// Очищаем от лишних префиксов если уже передано «д-р» или «доктор»
		const cleanName = name.replace(/^(доктор|д-р|врач)\s+/i, "").trim();
		return `${greeting}, доктор ${cleanName}!`;
	}

	return `${greeting}, доктор!`;
}

/**
 * Формирует дневную сводку:
 * «На сегодня запланировано 4 пациента, смена открыта, касса готова.»
 */
export function formatDailyKickoffSummary(params: {
	appointmentsCount: number;
	isShiftOpen: boolean;
	isCashReady: boolean;
}): string {
	const { appointmentsCount, isShiftOpen, isCashReady } = params;

	const patientsPart = countLabel(
		appointmentsCount,
		"пациент",
		"пациента",
		"пациентов",
	);

	const shiftPart = isShiftOpen ? "смена открыта" : "смена ожидает открытия";
	const cashPart = isCashReady ? "касса готова" : "касса не открыта";

	return `На сегодня запланировано ${patientsPart}, ${shiftPart}, ${cashPart}.`;
}

/**
 * Возвращает текст и статус сетевой телеметрии (Мандат 8d: Quiet Telemetry)
 */
export function formatNetworkStatusInfo(isOffline: boolean): {
	statusText: string;
	badgeType: "online" | "offline";
	ariaLabel: string;
} {
	if (isOffline) {
		return {
			statusText: "📡 Автономный режим (Локальная сеть)",
			badgeType: "offline",
			ariaLabel: "Сетевой статус: Автономный режим (Локальная сеть)",
		};
	}
	return {
		statusText: "🟢 Сервер подключен",
		badgeType: "online",
		ariaLabel: "Сетевой статус: Сервер подключен и синхронизирован",
	};
}

/**
 * DoctorKickoffWidget — аккуратный, стильный виджет утреннего старта и дневной сводки врача.
 * 
 * Инварианты:
 * 1. Живое приветствие («Доброе утро, доктор Барабаш!»).
 * 2. Дневная сводка («На сегодня запланировано 4 пациента, смена открыта, касса готова»).
 * 3. Тихий индикатор сетевого статуса («🟢 Сервер подключен» или «📡 Автономный режим (Локальная сеть)»).
 * 4. Ноль слепящих белых пятен в Dark Mode, полная поддержка дизайн-токенов var(--paper).
 * 5. Стабильная геометрия (CLS = 0) с плавной CSS-анимацией.
 */
export const DoctorKickoffWidget: React.FC<DoctorKickoffWidgetProps> = ({
	doctorName,
	appointmentsCount = 0,
	isShiftOpen = true,
	isCashReady = true,
	isOffline,
	onToggleShift,
	onOpenSchedule,
	onOpenCheckout,
	className = "",
}) => {
	// Сетевое состояние: если явно не передано, проверяем автономию и navigator.onLine
	const [offlineMode, setOfflineMode] = useState<boolean>(() => {
		if (typeof isOffline === "boolean") return isOffline;
		if (typeof navigator !== "undefined" && !navigator.onLine) return true;
		return isOfflineAutonomyMode();
	});

	useEffect(() => {
		if (typeof isOffline === "boolean") {
			setOfflineMode(isOffline);
			return;
		}

		const handleOnline = () => setOfflineMode(isOfflineAutonomyMode());
		const handleOffline = () => setOfflineMode(true);

		if (typeof window !== "undefined") {
			window.addEventListener("online", handleOnline);
			window.addEventListener("offline", handleOffline);
			return () => {
				window.removeEventListener("online", handleOnline);
				window.removeEventListener("offline", handleOffline);
			};
		}
	}, [isOffline]);

	const greeting = useMemo(
		() => formatDoctorGreeting(doctorName),
		[doctorName],
	);

	const summary = useMemo(
		() =>
			formatDailyKickoffSummary({
				appointmentsCount,
				isShiftOpen,
				isCashReady,
			}),
		[appointmentsCount, isShiftOpen, isCashReady],
	);

	const networkInfo = useMemo(
		() => formatNetworkStatusInfo(offlineMode),
		[offlineMode],
	);

	return (
		<section
			className={`doctor-kickoff-widget ${className}`.trim()}
			aria-label="Утренний старт и сводка дня врача"
		>
			<div className="doctor-kickoff-header">
				<div className="doctor-kickoff-title-group">
					<div className="doctor-kickoff-icon-box" aria-hidden="true">
						<Stethoscope size={20} className="doctor-kickoff-icon" />
					</div>
					<div className="doctor-kickoff-text min-w-0">
						<h2 className="doctor-kickoff-greeting truncate">{greeting}</h2>
						<p className="doctor-kickoff-summary">{summary}</p>
					</div>
				</div>

				{/* Тихий индикатор сетевого статуса (Quiet Telemetry) */}
				<div
					className={`doctor-kickoff-telemetry ${networkInfo.badgeType === "offline" ? "telemetry-offline" : "telemetry-online"}`}
					role="status"
					aria-label={networkInfo.ariaLabel}
				>
					{offlineMode ? (
						<>
							<Radio size={13} aria-hidden="true" className="telemetry-icon" />
							<span>📡 Автономный режим (Локальная сеть)</span>
						</>
					) : (
						<>
							<span className="telemetry-dot" aria-hidden="true">
								🟢
							</span>
							<span>Сервер подключен</span>
						</>
					)}
				</div>
			</div>

			{/* Нижняя панель: Быстрый старт и метрики дня в 1 клик */}
			<div className="doctor-kickoff-actions">
				{onToggleShift && (
					<button
						type="button"
						onClick={onToggleShift}
						className={`kickoff-action-btn ${isShiftOpen ? "btn-shift-active" : "btn-shift-open primary-button"}`}
						title={
							isShiftOpen
								? "Рабочая смена врача активна (нажмите для завершения)"
								: "Открыть смену врача"
						}
					>
						<Zap size={14} aria-hidden="true" />
						<span>{isShiftOpen ? "Смена открыта" : "Открыть смену"}</span>
					</button>
				)}

				{onOpenSchedule && (
					<button
						type="button"
						onClick={onOpenSchedule}
						className="kickoff-action-btn secondary-button"
						title="Перейти к расписанию на сегодня"
					>
						<Calendar size={14} aria-hidden="true" />
						<span>Расписание ({appointmentsCount})</span>
					</button>
				)}

				{onOpenCheckout && (
					<button
						type="button"
						onClick={onOpenCheckout}
						className="kickoff-action-btn secondary-button"
						title="Перейти к кассе клиники"
					>
						<CreditCard size={14} aria-hidden="true" />
						<span>{isCashReady ? "Касса готова" : "Касса"}</span>
					</button>
				)}
			</div>
		</section>
	);
};
