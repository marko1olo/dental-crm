/**
 * DoctorWalletHeader.tsx — Шапка и переключатели периодов сдельной оплаты врача.
 * Mandate 8b: строго <= 120 строк на файл.
 */

import React from "react";
import { Calendar, Clock, RefreshCw, Wallet, X } from "lucide-react";

export interface DoctorWalletHeaderProps {
	readonly doctorName: string;
	readonly doctorSpecialty: string;
	readonly selectedDate: string;
	readonly activePeriodFilter: "today" | "yesterday" | "custom";
	readonly isLoading: boolean;
	readonly onClose?: (() => void) | undefined;
	readonly onSelectToday: () => void;
	readonly onSelectYesterday: () => void;
	readonly onDateChange: (date: string) => void;
	readonly onRefresh: () => void;
}

export const DoctorWalletHeader: React.FC<DoctorWalletHeaderProps> = ({
	doctorName,
	doctorSpecialty,
	selectedDate,
	activePeriodFilter,
	isLoading,
	onClose,
	onSelectToday,
	onSelectYesterday,
	onDateChange,
	onRefresh,
}) => {
	return (
		<div className="dpr-header">
			<div className="dpr-header-top-row">
				<div className="dpr-header-title-block">
					<div className="dpr-icon-badge" aria-hidden="true">
						<Wallet size={22} />
					</div>
					<div>
						<h2 className="dpr-title" data-testid="dpr-title">
							Сдельная оплата и вычеты ЗТЛ
						</h2>
						<div className="dpr-subtitle">
							{doctorName} • {doctorSpecialty}
						</div>
					</div>
				</div>
				{onClose && (
					<button
						type="button"
						onClick={onClose}
						className="dpr-header-close-btn"
						aria-label="Закрыть окно сдельной оплаты"
						title="Закрыть"
						data-testid="dpr-header-close-btn"
					>
						<X size={18} />
					</button>
				)}
			</div>

			<div className="dpr-controls-row">
				<button
					type="button"
					className={`dpr-filter-chip ${activePeriodFilter === "today" ? "active" : ""}`}
					onClick={onSelectToday}
					data-testid="dpr-filter-today"
				>
					<Calendar size={15} className="hidden md:inline-block" />
					<span>Сегодня</span>
				</button>
				<button
					type="button"
					className={`dpr-filter-chip ${activePeriodFilter === "yesterday" ? "active" : ""}`}
					onClick={onSelectYesterday}
					data-testid="dpr-filter-yesterday"
				>
					<Clock size={15} className="hidden md:inline-block" />
					<span>Вчера</span>
				</button>
				<input
					type="date"
					value={selectedDate}
					onChange={(e) => {
						if (e.target.value) onDateChange(e.target.value);
					}}
					className="dpr-filter-chip"
					data-testid="dpr-date-picker"
					aria-label="Выбор даты смены"
				/>
				<button
					type="button"
					onClick={onRefresh}
					className="dpr-filter-chip"
					title="Обновить расчет"
					aria-label="Обновить расчет"
				>
					<RefreshCw size={15} className={isLoading ? "animate-spin" : ""} />
				</button>
			</div>
		</div>
	);
};
