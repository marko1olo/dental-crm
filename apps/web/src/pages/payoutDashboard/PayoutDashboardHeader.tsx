/**
 * Layer 1 / Layer 4: Presentation Header for Doctor Payout Dashboard.
 * Includes period selector, recalculation action, and notification banners.
 */

import React from "react";
import type { PayoutLoadState } from "./types";

export interface PayoutDashboardHeaderProps {
	readonly month: string;
	readonly onMonthChange: (month: string) => void;
	readonly onRefresh: () => void;
	readonly isLoading: boolean;
	readonly state: PayoutLoadState;
	readonly monthLabel: string;
}

export function PayoutDashboardHeader({
	month,
	onMonthChange,
	onRefresh,
	isLoading,
	state,
	monthLabel,
}: PayoutDashboardHeaderProps) {
	return (
		<>
			<h3 className="ops-section-title">Выплаты врачам</h3>

			<div className="ops-toolbar">
				<span className="ops-field">
					<label htmlFor="payout-month">Зарплатный месяц</label>
					<input
						id="payout-month"
						type="month"
						value={month}
						onChange={(event) => onMonthChange(event.target.value)}
					/>
				</span>
				<button
					className="secondary-button"
					type="button"
					onClick={onRefresh}
					disabled={isLoading}
				>
					{isLoading ? "Считаю…" : "Пересчитать"}
				</button>
			</div>

			{state.kind === "needs_staff_login" ? (
				<p className="ops-notice" role="status">
					Выплаты не показаны: нет входа сотрудника. {state.message} Войдите в
					рабочий кабинет клиники и подтвердите себя PIN-кодом — после этого
					расчёт откроется.
				</p>
			) : null}

			{state.kind === "failed" ? (
				<p className="ops-notice ops-notice--error" role="alert">
					Расчёт выплат за {monthLabel} не выполнен. {state.message}{" "}
					{state.action}
				</p>
			) : null}

			{state.kind === "loading" ? (
				<div className="ops-skeleton" aria-hidden="true">
					<span className="ops-skeleton__line" />
					<span className="ops-skeleton__line" />
					<span className="ops-skeleton__line" />
				</div>
			) : null}
		</>
	);
}
