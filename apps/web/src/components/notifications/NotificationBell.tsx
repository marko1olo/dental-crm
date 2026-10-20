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
				className={`relative h-8 min-h-[32px] max-h-[32px] w-8 min-w-[32px] p-0 rounded-lg border text-xs font-semibold inline-flex items-center justify-center transition-all cursor-pointer ${
					isOpen
						? "bg-[var(--teal,#0d9488)] text-white border-[var(--teal,#0d9488)] shadow-xs"
						: "bg-[var(--paper-strong,var(--paper,#ffffff))] text-[var(--ink,#0f172a)] hover:bg-[var(--paper-soft,#f1f5f9)] border-[var(--line,#e2e8f0)]"
				}`}
				aria-label={`Уведомления${unreadCount > 0 ? ` (${unreadCount} непрочитанных)` : ""}`}
				aria-expanded={isOpen}
				title={unreadCount > 0 ? `Непрочитанных уведомлений: ${unreadCount}` : "Уведомления клиники"}
				data-testid="notification-bell-btn"
			>
				<div className="relative inline-flex items-center justify-center shrink-0">
					<Bell
						size={16}
						aria-hidden="true"
						className={`transition-colors ${unreadCount > 0 ? (isOpen ? "text-white" : "text-[var(--teal,#0d9488)]") : "opacity-80"}`}
					/>
					{unreadCount > 0 && (
						<span
							className="absolute -top-1.5 -right-2 min-w-[16px] h-4 px-1 rounded-full text-[9px] font-bold bg-rose-500 text-white flex items-center justify-center leading-none ring-2 ring-[var(--paper,#ffffff)] shadow-xs"
							data-testid="notification-bell-badge"
						>
							{unreadCount > 99 ? "99+" : unreadCount}
						</span>
					)}
				</div>
			</button>

			{/* Всплывающее компактное окно центра уведомлений (глубина <= 1) */}
			{isOpen && (
				<div
					className="absolute right-0 top-full mt-1.5 w-[360px] sm:w-[440px] max-w-[calc(100vw-2rem)] h-[480px] max-h-[calc(100vh-4.5rem)] z-[60] rounded-xl shadow-xl border border-[var(--line,#e2e8f0)] bg-[var(--paper-strong,var(--paper,#ffffff))] overflow-hidden flex flex-col"
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
