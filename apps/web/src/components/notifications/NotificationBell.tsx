import {
	AlertTriangle,
	Bell,
	CalendarCheck,
	CheckCheck,
	Filter,
	X,
} from "lucide-react";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useOptionalAppLogicContext } from "../../contexts/AppLogicContext";
import { useTelephonyStore } from "../../store/telephonyStore";
import {
	PatientNotificationCenter,
	type PatientNotificationItem,
} from "./PatientNotificationCenter";

export interface NotificationBellProps {
	className?: string;
	onOpenFullCenter?: () => void;
}

/**
 * Кнопка-колокольчик центра уведомлений со счётчиком и всплывающей шторкой.
 *
 * Инварианты:
 * 1. Компактная клиническая плотность: высота 32–36px (h-8 sm:h-9).
 * 2. 0 мультяшных эмодзи (Мандат 8d п. 7) — исключительно строгие иконки Lucide.
 * 3. 1-клик «Прочитать всё» и фильтрация по критичности (отмены / подтверждения).
 * 4. Закрытие по клику вне области и по клавише Escape.
 * 5. Без матрешек (глубина модалки/поповера <= 1).
 */
export const NotificationBell: React.FC<NotificationBellProps> = ({
	className = "",
	onOpenFullCenter,
}) => {
	const [isOpen, setIsOpen] = useState(false);
	const popoverRef = useRef<HTMLDivElement | null>(null);

	const callHistory = useTelephonyStore((s) => s.callHistory);
	const ctx = useOptionalAppLogicContext();
	const appointments = ctx?.dashboard?.appointments;
	const patients = ctx?.dashboard?.patients;

	// Подсчёт активных непрочитанных событий клиники
	const unreadCount = useMemo(() => {
		let count = 0;

		// Пропущенные звонки
		if (callHistory && callHistory.length > 0) {
			count += callHistory.filter((c) => c.status === "missed" || c.acutePain).length;
		}

		// Отмененные визиты
		if (Array.isArray(appointments)) {
			count += appointments.filter((a) => a.status === "cancelled").length;
		}

		// Задолженности пациентов
		if (Array.isArray(patients)) {
			count += patients.filter((p) => Number(p.balanceRub) < 0).length;
		}

		return count;
	}, [callHistory, appointments, patients]);

	// Закрытие по клику вне компонента и Escape
	useEffect(() => {
		if (!isOpen) return;

		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key === "Escape") {
				setIsOpen(false);
			}
		};

		const handlePointerDown = (e: MouseEvent | TouchEvent) => {
			if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
				setIsOpen(false);
			}
		};

		document.addEventListener("keydown", handleKeyDown);
		document.addEventListener("mousedown", handlePointerDown);
		document.addEventListener("touchstart", handlePointerDown);

		return () => {
			document.removeEventListener("keydown", handleKeyDown);
			document.removeEventListener("mousedown", handlePointerDown);
			document.removeEventListener("touchstart", handlePointerDown);
		};
	}, [isOpen]);

	return (
		<div className={`relative inline-block ${className}`} ref={popoverRef}>
			<button
				type="button"
				onClick={() => setIsOpen((prev) => !prev)}
				className={`relative h-8 sm:h-9 px-2.5 rounded-lg border text-xs font-semibold inline-flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
					isOpen
						? "bg-[var(--teal,#0d9488)] text-white border-[var(--teal,#0d9488)] shadow-xs"
						: "bg-[var(--paper-strong,var(--paper,#ffffff))] text-[var(--ink,#0f172a)] hover:bg-[var(--paper-soft,#f1f5f9)] border-[var(--line,#e2e8f0)]"
				}`}
				aria-label={`Уведомления${unreadCount > 0 ? ` (${unreadCount} непрочитанных)` : ""}`}
				aria-expanded={isOpen}
				title={unreadCount > 0 ? `Непрочитанных уведомлений: ${unreadCount}` : "Уведомления клиники"}
				data-testid="notification-bell-btn"
			>
				<Bell size={15} aria-hidden="true" className={unreadCount > 0 ? "animate-pulse" : ""} />
				<span className="hidden md:inline">Уведомления</span>

				{unreadCount > 0 && (
					<span
						className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-500 text-white leading-none shrink-0"
						data-testid="notification-bell-badge"
					>
						{unreadCount > 99 ? "99+" : unreadCount}
					</span>
				)}
			</button>

			{/* Всплывающее компактное окно центра уведомлений (глубина <= 1) */}
			{isOpen && (
				<div
					className="absolute right-0 top-full mt-1.5 w-[360px] sm:w-[440px] max-w-[95vw] h-[480px] max-h-[80vh] z-50 rounded-xl shadow-xl border border-[var(--line,#e2e8f0)] bg-[var(--paper-strong,var(--paper,#ffffff))] overflow-hidden flex flex-col"
					data-testid="notification-bell-popover"
				>
					<PatientNotificationCenter
						compactMode={true}
						onClose={() => setIsOpen(false)}
						className="border-none shadow-none rounded-none"
					/>
				</div>
			)}
		</div>
	);
};
