import type React from "react";
import { PublicOnlineBookingWidget } from "../components/booking/PublicOnlineBookingWidget";
import "./PublicBookingWidget.css";

export interface PublicBookingWidgetProps {
	/**
	 * Клиника из ссылки, по которой пациент пришёл. Разбор адреса живёт в
	 * lib/publicPortalRoute.ts, а не здесь: тот же разбор решает, показывать
	 * публичную страницу или рабочее место клиники.
	 *
	 * null — ссылка без клиники. Загружать нечего, и это не ошибка пациента:
	 * ниже он получает человеческий отказ вместо пустого экрана.
	 */
	readonly organizationId: string | null;
}

export const PublicBookingWidget: React.FC<PublicBookingWidgetProps> = ({
	organizationId,
}) => {
	if (!organizationId) {
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
		<div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-3 sm:p-6 md:p-8">
			<PublicOnlineBookingWidget organizationId={organizationId} />
		</div>
	);
};
