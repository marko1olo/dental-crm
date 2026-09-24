/**
 * OverviewTab.tsx — Главный экран «Обзор» личного кабинета пациента (PWA / Mobile 390px)
 * (DOMAIN: PORTAL PATIENT CABINET - TAB 1: OVERVIEW)
 *
 * Соответствие:
 * - Мандат 8c: Tier 1 Hot Path (0-клик статус, ближайший визит, быстрые действия).
 * - Мандат 8d: 7 смертных грехов UI (текст без обрезания, WCAG AAA, тач-таргеты >= 44px).
 * - Мандат 8e: Автономия врача и пациента, ноль барьеров.
 * - Раунд 85: QR-код для стойки регистрации, время визита 20px bold.
 */

import type React from "react";
import {
	AlertCircle,
	AlertTriangle,
	Award,
	Calendar,
	CalendarPlus,
	Check,
	CheckCircle2,
	Clock,
	CreditCard,
	ExternalLink,
	Heart,
	MapPin,
	Phone,
	QrCode,
	ShieldAlert,
	ShieldCheck,
	Smartphone,
	Sparkles,
} from "lucide-react";
import type {
	DentalHealthIndexResult,
	PatientCabinetSummary,
	PatientInvoiceItem,
	PatientPersonalCabinetData,
} from "../patientCabinetEngine";
import { formatRubles } from "../patientCabinetEngine";
import type { PatientCabinetTab } from "../PatientCabinetModal";

export interface OverviewTabProps {
	readonly data: PatientPersonalCabinetData;
	readonly summary: PatientCabinetSummary;
	readonly healthIndex: DentalHealthIndexResult;
	readonly nextApptCountdown: string | null;
	readonly onOpenTab: (tab: PatientCabinetTab) => void;
	readonly onOpenReceptionQr: () => void;
	readonly onOpenCareMemo: () => void;
	readonly onOpenSbpForInvoice: (inv: PatientInvoiceItem) => void;
	readonly onOpenSelfCheckin: () => void;
}

export const OverviewTab: React.FC<OverviewTabProps> = ({
	data,
	summary,
	healthIndex,
	nextApptCountdown,
	onOpenTab,
	onOpenReceptionQr,
	onOpenCareMemo,
	onOpenSbpForInvoice,
	onOpenSelfCheckin,
}) => {
	const firstUnpaid = data.invoices.find(
		(i) => i.status === "unpaid" || i.status === "partially_paid",
	);

	const yandexMapsUrl = summary.nextAppointment
		? `https://yandex.ru/maps/?text=${encodeURIComponent(
				summary.nextAppointment.clinicAddressRu ||
					summary.nextAppointment.clinicName,
			)}`
		: "https://yandex.ru/maps/?text=Стоматология+ДЕНТЕ";

	const doctorPhone = "+7 (495) 789-01-23";

	return (
		<div className="pc-tab-content-container" data-testid="pc-overview-tab">
			{/* 1. КАРТОЧКА СТАТУСА ПАЦИЕНТА */}
			<div className="pc-card pc-status-hero-card" data-testid="pc-patient-status-card">
				<div className="pc-status-hero-top">
					<div className="pc-avatar-large" aria-hidden="true">
						{data.fullName.charAt(0)}
					</div>
					<div className="pc-status-hero-details">
						<div className="pc-status-name-row">
							<h3 className="pc-patient-name">{data.fullName}</h3>
							<span className="pc-badge-card-number">
								Карта 043/у № {data.cardNumber}
							</span>
						</div>
						<p className="pc-doctor-subtitle">
							Лечащий врач: <strong>{data.curatingDoctor}</strong>
						</p>
					</div>
				</div>

				{/* Бонусы лояльности и кешбэк */}
				<div className="pc-loyalty-strip">
					<div className="pc-loyalty-pill">
						<Sparkles size={16} className="pc-icon-amber" />
						<div className="pc-loyalty-text">
							<span className="pc-loyalty-label">Бонусный баланс:</span>
							<strong className="pc-loyalty-val">
								{data.loyaltyBonusBalance.toLocaleString("ru-RU")} бонусов ({data.loyaltyBonusBalance.toLocaleString("ru-RU")} ₽)
							</strong>
						</div>
					</div>

					<div className="pc-loyalty-pill tier">
						<Award size={16} className="pc-icon-primary" />
						<div className="pc-loyalty-text">
							<span className="pc-loyalty-label">Уровень лояльности:</span>
							<strong className="pc-loyalty-val">{data.loyaltyTierRu}</strong>
						</div>
					</div>
				</div>
			</div>

			{/* 2. БЫСТРЫЕ ДЕЙСТВИЯ (HOT PATH - МАНДАТ 8c) */}
			<div className="pc-quick-actions-bar" aria-label="Быстрые действия">
				<button
					type="button"
					className="pc-quick-action-btn primary"
					onClick={() => {
						if (firstUnpaid) {
							onOpenSbpForInvoice(firstUnpaid);
						} else {
							onOpenTab("invoices");
						}
					}}
					data-testid="quick-action-pay"
				>
					<CreditCard size={18} />
					<span>Оплатить счет</span>
					{summary.unpaidInvoicesCount > 0 && (
						<span className="pc-tab-counter">{summary.unpaidInvoicesCount}</span>
					)}
				</button>

				<button
					type="button"
					className="pc-quick-action-btn secondary"
					onClick={() => onOpenTab("plans")}
					data-testid="quick-action-plan"
				>
					<CheckCircle2 size={18} />
					<span>Мой план лечения</span>
				</button>

				<button
					type="button"
					className="pc-quick-action-btn secondary"
					onClick={onOpenCareMemo}
					data-testid="quick-action-care"
				>
					<Heart size={18} />
					<span>Памятка после приема</span>
				</button>

				<button
					type="button"
					className="pc-quick-action-btn accent"
					onClick={onOpenReceptionQr}
					data-testid="btn-show-reception-qr"
				>
					<QrCode size={18} />
					<span>Показать администратору</span>
				</button>
			</div>

			{/* 3. КАРТОЧКА БЛИЖАЙШЕГО ВИЗИТА */}
			{summary.nextAppointment && (
				<div
					className="pc-card pc-next-appointment-card"
					data-testid="pc-next-appointment-card"
				>
					<div className="pc-card-header">
						<div className="pc-card-title">
							<Calendar size={20} className="pc-icon-primary" />
							<span>Ближайший запланированный прием</span>
						</div>
						<div className="pc-header-tags">
							<span className="pc-status-badge paid">
								<Check size={14} />
								<span>Запись подтверждена</span>
							</span>
							{nextApptCountdown && (
								<span className="pc-status-badge unpaid pc-countdown-badge">
									<Clock size={14} />
									<span>До приема осталось: {nextApptCountdown}</span>
								</span>
							)}
						</div>
					</div>

					<div className="pc-next-appt-body">
						<div className="pc-time-room-highlight">
							<span className="pc-next-visit-time">
								{summary.nextAppointment.timeRu}
							</span>
							<span className="pc-next-visit-room">
								{summary.nextAppointment.roomNumber}
							</span>
						</div>

						<div className="pc-next-appt-info">
							<div className="pc-appt-title-row">
								<strong className="pc-appt-date">
									{summary.nextAppointment.dateIso}
								</strong>
								<span className="pc-divider">&bull;</span>
								<span className="pc-appt-procedure">
									{summary.nextAppointment.titleRu}
								</span>
							</div>

							<div className="pc-appt-meta">
								Врач: <strong>{summary.nextAppointment.doctorName}</strong> (
								{summary.nextAppointment.doctorSpecialtyRu})
							</div>

							<div className="pc-appt-address">
								<MapPin size={15} />
								<span>
									{summary.nextAppointment.clinicName} &bull;{" "}
									{summary.nextAppointment.clinicAddressRu ||
										"г. Москва, ул. Клиническая, д. 10"}
								</span>
							</div>
						</div>
					</div>

					{/* Кнопки коммуникации и навигации */}
					<div className="pc-appt-actions-row">
						<a
							href={yandexMapsUrl}
							target="_blank"
							rel="noreferrer"
							className="pc-btn-secondary pc-appt-action-btn"
							data-testid="btn-yandex-maps"
						>
							<MapPin size={16} className="pc-icon-warning" />
							<span>В Яндекс.Карты</span>
						</a>

						<a
							href={`tel:${doctorPhone.replace(/\D/g, "")}`}
							className="pc-btn-secondary pc-appt-action-btn"
							data-testid="btn-call-doctor"
						>
							<Phone size={16} className="pc-icon-primary" />
							<span>Позвонить в клинику</span>
						</a>

						<button
							type="button"
							className="pc-btn-primary pc-appt-action-btn"
							onClick={onOpenReceptionQr}
							data-testid="next-appt-qr-btn"
						>
							<QrCode size={16} />
							<span>QR для входа</span>
						</button>
					</div>

					{/* Календари 1-тап экспорт */}
					<div className="pc-calendar-export-strip">
						<span className="pc-cal-label">Добавить в календарь:</span>
						<div className="pc-cal-buttons">
							<button
								type="button"
								className="pc-cal-btn"
								onClick={() => {
									const ics = `BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//DENTE Dental CRM//Patient Cabinet//RU\r\nCALSCALE:GREGORIAN\r\nMETHOD:PUBLISH\r\nBEGIN:VEVENT\r\nUID:dente-appt-${Date.now()}@dente.ru\r\nDTSTAMP:${new Date().toISOString().replace(/[-:]/g, "").slice(0, 15)}Z\r\nDTSTART:20260901T113000Z\r\nDTEND:20260901T123000Z\r\nSUMMARY:Прием в DENTE: ${summary.nextAppointment?.doctorName || "Врач"}\r\nDESCRIPTION:Прием: ${summary.nextAppointment?.titleRu || "Консультация"}\\nАдрес: ${summary.nextAppointment?.clinicName || "Клиника DENTE"}, ${summary.nextAppointment?.roomNumber || ""}\r\nLOCATION:${summary.nextAppointment?.clinicName || "Клиника DENTE"}, ${summary.nextAppointment?.roomNumber || ""}\r\nSTATUS:CONFIRMED\r\nBEGIN:VALARM\r\nTRIGGER:-PT2H\r\nACTION:DISPLAY\r\nDESCRIPTION:Напоминание о приеме в клинике DENTE через 2 часа\r\nEND:VALARM\r\nEND:VEVENT\r\nEND:VCALENDAR\r\n`;
									const blob = new Blob([ics], {
										type: "text/calendar;charset=utf-8",
									});
									const url = URL.createObjectURL(blob);
									const a = document.createElement("a");
									a.href = url;
									a.download = `Dente_Appointment_${summary.nextAppointment?.dateIso || "2026-09-01"}.ics`;
									a.click();
									URL.revokeObjectURL(url);
								}}
								data-testid="next-appt-apple-cal-btn"
							>
								<CalendarPlus size={14} />
								<span>Apple iCal</span>
							</button>

							<button
								type="button"
								className="pc-cal-btn"
								onClick={() => {
									const title = encodeURIComponent(
										`Прием в DENTE: ${summary.nextAppointment?.doctorName || "Врач"}`,
									);
									const details = encodeURIComponent(
										`Прием: ${summary.nextAppointment?.titleRu || "Консультация"}\nАдрес: ${summary.nextAppointment?.clinicName || "Клиника DENTE"}, ${summary.nextAppointment?.roomNumber || ""}`,
									);
									const location = encodeURIComponent(
										`${summary.nextAppointment?.clinicName || "Клиника DENTE"}, ${summary.nextAppointment?.roomNumber || ""}`,
									);
									const url = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=20260901T113000Z/20260901T123000Z&details=${details}&location=${location}`;
									window.open(url, "_blank");
								}}
								data-testid="next-appt-google-cal-btn"
							>
								<ExternalLink size={14} />
								<span>Google</span>
							</button>

							<button
								type="button"
								className="pc-cal-btn"
								onClick={() => {
									const name = encodeURIComponent(
										`Прием в DENTE: ${summary.nextAppointment?.doctorName || "Врач"}`,
									);
									const desc = encodeURIComponent(
										`Прием: ${summary.nextAppointment?.titleRu || "Консультация"}\nАдрес: ${summary.nextAppointment?.clinicName || "Клиника DENTE"}, ${summary.nextAppointment?.roomNumber || ""}`,
									);
									const location = encodeURIComponent(
										`${summary.nextAppointment?.clinicName || "Клиника DENTE"}, ${summary.nextAppointment?.roomNumber || ""}`,
									);
									const url = `https://calendar.yandex.ru/event/new?name=${name}&start_ts=2026-09-01T14:30:00&end_ts=2026-09-01T15:30:00&description=${desc}&location=${location}`;
									window.open(url, "_blank");
								}}
								data-testid="next-appt-yandex-cal-btn"
							>
								<ExternalLink size={14} />
								<span>Яндекс</span>
							</button>
						</div>
					</div>
				</div>
			)}

			{/* 4. БАННЕР БЫСТРОГО ЧЕКИНА НА РЕСЕПШЕНЕ (Раунд 85) */}
			<div
				className="pc-card pc-reception-qr-card"
				data-testid="reception-qr-banner"
			>
				<div className="pc-reception-banner-content">
					<div className="pc-reception-icon-wrapper">
						<QrCode size={26} />
					</div>
					<div className="pc-reception-text">
						<h3 className="pc-reception-title">QR-код для стойки регистрации</h3>
						<p className="pc-reception-desc">
							Покажите экран администратору или поднесите к 2D-сканеру для
							моментальной отметки о прибытии
						</p>
					</div>
					<button
						type="button"
						className="pc-btn-primary pc-reception-open-btn"
						onClick={onOpenReceptionQr}
						data-testid="btn-show-reception-qr"
					>
						<Sparkles size={16} />
						<span>Показать администратору</span>
					</button>
				</div>
			</div>

			{/* 5. СРОЧНЫЕ ОПОВЕЩЕНИЯ (НЕОПЛАЧЕННЫЕ СЧЕТА И СОГЛАСИЯ) */}
			{summary.unpaidInvoicesCount > 0 && (
				<div className="pc-alert-banner warning" data-testid="unpaid-invoices-alert">
					<div className="pc-alert-body">
						<AlertCircle size={22} className="pc-icon-warning flex-shrink-0" />
						<div>
							<strong>
								У вас есть неоплаченный счет на сумму{" "}
								{formatRubles(summary.totalUnpaidAmountRub)}
							</strong>
							<p className="pc-alert-subtext">
								Оплатите счет моментально без комиссии через Систему Быстрых
								Платежей (СБП).
							</p>
						</div>
					</div>
					<button
						type="button"
						className="pc-btn-primary"
						onClick={() => {
							if (firstUnpaid) onOpenSbpForInvoice(firstUnpaid);
							else onOpenTab("invoices");
						}}
					>
						<QrCode size={16} />
						<span>Оплатить через СБП</span>
					</button>
				</div>
			)}

			{summary.pendingConsentsCount > 0 && (
				<div className="pc-alert-banner danger" data-testid="pending-consents-alert">
					<div className="pc-alert-body">
						<ShieldAlert size={22} className="pc-icon-danger flex-shrink-0" />
						<div>
							<strong>
								Ожидает подписи {summary.pendingConsentsCount} информированное
								согласие (ИДС 323-ФЗ)
							</strong>
							<p className="pc-alert-subtext">
								Подтвердите согласие на медицинское вмешательство по SMS (63-ФЗ
								ПЭП) прямо сейчас.
							</p>
						</div>
					</div>
					<button
						type="button"
						className="pc-btn-primary pc-danger-btn"
						onClick={() => onOpenTab("documents")}
					>
						<Smartphone size={16} />
						<span>Подписать по SMS</span>
					</button>
				</div>
			)}

			{/* 6. ИНТЕРАКТИВНЫЙ ИНДЕКС ЗДОРОВЬЯ ЗУБОВ */}
			<div
				className="pc-card dental-health-index-card"
				data-testid="pc-overview-health-index"
			>
				<div className="pc-card-header">
					<div className="pc-card-title">
						<ShieldCheck size={20} className="pc-icon-primary" />
						<div>
							<strong>Интерактивный индекс здоровья зубов</strong>
							<div className="pc-card-subtitle">
								{healthIndex.statusLabelRu} &bull; Формула FDI (32 зуба)
							</div>
						</div>
					</div>
					<span className="pc-status-badge paid pc-sanitation-badge">
						Санация: {healthIndex.sanitationPercent}%
					</span>
				</div>

				<div className="pc-progress-bar-bg">
					<div
						className="pc-progress-bar-fill"
						style={{
							width: `${healthIndex.sanitationPercent}%`,
							backgroundColor:
								healthIndex.sanitationPercent >= 90
									? "var(--pc-success)"
									: "var(--pc-primary)",
						}}
					/>
				</div>

				<div className="pc-health-index-footer">
					<span>{healthIndex.formattedIndexRu}</span>
					<button
						type="button"
						className="pc-btn-secondary pc-btn-compact"
						onClick={() => onOpenTab("plans")}
					>
						Смотреть формулу
					</button>
				</div>
			</div>

			{/* 7. АНКЕТА СОМАТИЧЕСКОГО ЗДОРОВЬЯ */}
			<div className="pc-card" data-testid="pc-somatic-card">
				<div className="pc-card-header">
					<div className="pc-card-title">
						<Heart size={18} className="pc-icon-primary" />
						<span>Анкета соматического здоровья и факторов риска</span>
					</div>
					<button
						type="button"
						className="pc-btn-primary pc-btn-compact"
						onClick={onOpenSelfCheckin}
						data-testid="open-self-checkin-btn"
					>
						<Smartphone size={14} />
						<span>Мобильный самочекин</span>
					</button>
				</div>

				{data.somaticAlerts && data.somaticAlerts.length > 0 ? (
					<div className="pc-somatic-alerts-list">
						{data.somaticAlerts.map((alert) => (
							<div
								key={alert.id}
								className={`pc-somatic-alert-item ${alert.severity}`}
							>
								<strong className="pc-somatic-alert-title">
									<AlertTriangle size={14} />
									<span>{alert.title}</span>
								</strong>
								<p className="pc-somatic-alert-msg">{alert.message}</p>
								<div className="pc-somatic-action">
									<strong>Рекомендация врача:</strong> {alert.recommendedAction}
								</div>
							</div>
						))}
					</div>
				) : (
					<p className="pc-somatic-clean-note">
						Анкета здоровья заполнена. Выраженных противопоказаний к
						анестетикам и амбулаторным вмешательствам не выявлено.
					</p>
				)}
			</div>

			{/* 8. МЕТРИКИ СВОДКИ */}
			<div className="pc-summary-grid">
				<div className="pc-metric-card">
					<div className="pc-metric-icon primary">
						<CreditCard size={20} />
					</div>
					<div className="pc-metric-content">
						<span className="pc-metric-label">Счета к оплате</span>
						<span className="pc-metric-value">
							{formatRubles(summary.totalUnpaidAmountRub)}
						</span>
					</div>
				</div>

				<div className="pc-metric-card">
					<div className="pc-metric-icon success">
						<ShieldCheck size={20} />
					</div>
					<div className="pc-metric-content">
						<span className="pc-metric-label">Активных гарантий</span>
						<span className="pc-metric-value">
							{summary.activeWarrantiesCount} паспортов
						</span>
					</div>
				</div>

				<div className="pc-metric-card">
					<div className="pc-metric-icon warning">
						<Sparkles size={20} />
					</div>
					<div className="pc-metric-content">
						<span className="pc-metric-label">Бонусный счет</span>
						<span className="pc-metric-value">
							{summary.loyaltyBonusBalance.toLocaleString("ru-RU")} ₽
						</span>
					</div>
				</div>

				<div className="pc-metric-card">
					<div className="pc-metric-icon primary">
						<Calendar size={20} />
					</div>
					<div className="pc-metric-content">
						<span className="pc-metric-label">Визиты</span>
						<span className="pc-metric-value">
							{summary.upcomingAppointmentsCount} запланировано
						</span>
					</div>
				</div>
			</div>
		</div>
	);
};

export default OverviewTab;
