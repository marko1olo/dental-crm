/**
 * Панель «Потерянные пациенты» — пациенты клиники без предстоящих записей.
 * Вызывает работающий роут Fastify: GET /api/analytics/lost-patients-filters
 */

import { AlertTriangle, Phone, RefreshCw, UserX } from "lucide-react";
import type React from "react";
import { useEffect, useState } from "react";
import { useAppLogicContext } from "../../contexts/AppLogicContext";
import { formatPhoneNumber } from "../../utils/inputSanitation";

export interface LostPatientRow {
	id: string;
	organizationId: string;
	patientName: string;
	phone: string;
	daysSinceLastVisit: number;
	hasFutureAppointment: boolean;
	/* hasActiveCrmTask убран: API всегда шлёт false, UI поле не рисовал. */
	createdAt: string;
}

export const LostPatientsPanel: React.FC = () => {
	const { auth, setSelectedPatientId } = useAppLogicContext();
	const [patients, setPatients] = useState<LostPatientRow[]>([]);
	const [loading, setLoading] = useState<boolean>(true);
	const [error, setError] = useState<string | null>(null);

	const fetchLostPatients = async () => {
		setLoading(true);
		setError(null);
		try {
			const headers: Record<string, string> = auth
				? auth.denteClinicalReadHeaders()
				: {};
			const response = await fetch("/api/analytics/lost-patients-filters", {
				headers,
			});
			if (!response.ok) {
				throw new Error(`Ошибка загрузки (${response.status})`);
			}
			const data = await response.json();
			setPatients(Array.isArray(data) ? data : []);
		} catch (err: unknown) {
			setError(
				err instanceof Error
					? err.message
					: "Не удалось загрузить список потерянных пациентов",
			);
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		fetchLostPatients();
	}, [fetchLostPatients]);

	const handleOpenPatientCard = (patientId: string) => {
		setSelectedPatientId?.(patientId);
		window.location.hash = "#patients";
	};

	return (
		<div
			data-testid="lost-patients-panel"
			className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm text-slate-900 dark:text-slate-100 my-4"
		>
			<div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-200 dark:border-slate-800">
				<div className="flex items-center gap-2">
					<div className="p-2 rounded-lg bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400">
						<UserX className="w-5 h-5" />
					</div>
					<div>
						<h3 className="font-bold text-base leading-tight">
							Потерянные пациенты ({patients.length})
						</h3>
						<p className="text-xs text-slate-500 dark:text-slate-400">
							Пациенты без будущих визитов — требуют обзвона и приглашения на
							профгигиену
						</p>
					</div>
				</div>
				<button
					type="button"
					onClick={fetchLostPatients}
					disabled={loading}
					className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
					title="Обновить данные"
				>
					<RefreshCw
						className={`w-4 h-4 ${loading ? "animate-spin text-amber-500" : ""}`}
					/>
				</button>
			</div>

			{loading ? (
				<div className="py-6 text-center text-xs text-slate-500 dark:text-slate-400 flex items-center justify-center gap-2">
					<RefreshCw className="w-4 h-4 animate-spin text-rose-500" />
					Загрузка списка пациентов без записи...
				</div>
			) : error ? (
				<div
					role="alert"
					className="p-3 rounded-lg border text-xs bg-rose-50 text-rose-800 border-rose-200 dark:bg-rose-950/60 dark:text-rose-200 dark:border-rose-800 flex items-center gap-2"
				>
					<AlertTriangle className="w-4 h-4 flex-shrink-0" />
					<span>{error}</span>
				</div>
			) : patients.length === 0 ? (
				/*
				 * БЫЛО: «Все пациенты клиники имеют назначенные приёмы или активные задачи!»
				 * API GET /api/analytics/lost-patients-filters выбирает только пациентов
				 * без будущих приёмов (LEFT JOIN appointments … IS NULL). CRM-задачи
				 * не читаются: hasActiveCrmTask на сервере всегда false и в разметке
				 * не показывается. Пустой список значит «у всех есть будущая запись»,
				 * а не «есть запись ИЛИ активная задача» — руководитель видел ложный
				 * успех по CRM-работе, которой раздел не считает.
				 *
				 * СТАЛО: формулировка совпадает с семантикой запроса.
				 */
				<div className="py-6 text-center text-xs text-slate-500 dark:text-slate-400">
					У всех пациентов клиники есть будущие записи — список пуст.
				</div>
			) : (
				<div className="space-y-2 max-h-72 overflow-y-auto pr-1">
					{patients.map((patient) => (
						<div
							key={patient.id}
							className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex items-center justify-between gap-3 text-xs"
						>
							<div className="min-w-0 flex-1">
								<div className="font-semibold text-slate-900 dark:text-slate-100 truncate">
									{patient.patientName}
								</div>
								<div className="flex items-center gap-3 text-slate-500 dark:text-slate-400 text-[11px] mt-0.5">
									<span className="flex items-center gap-1">
										<Phone className="w-3 h-3" />
										{formatPhoneNumber(patient.phone)}
										{/* daysSinceLastVisit теперь с сервера: max прошлых starts_at, не константа 90. */}
									</span>
									<span>·</span>
									<span>
										{patient.daysSinceLastVisit <= 0
											? "Ещё не был на приёме или визит сегодня"
											: `Без визита ${patient.daysSinceLastVisit} ${
													patient.daysSinceLastVisit % 10 === 1 &&
													patient.daysSinceLastVisit % 100 !== 11
														? "день"
														: patient.daysSinceLastVisit % 10 >= 2 &&
																patient.daysSinceLastVisit % 10 <= 4 &&
																(patient.daysSinceLastVisit % 100 < 10 ||
																	patient.daysSinceLastVisit % 100 >= 20)
															? "дня"
															: "дней"
												}`}
									</span>
								</div>
							</div>

							<div className="flex items-center gap-2 flex-shrink-0">
								<button
									type="button"
									onClick={() => handleOpenPatientCard(patient.id)}
									className="px-2.5 py-1 rounded bg-amber-500 hover:bg-amber-600 text-white font-medium text-[11px] transition-colors"
								>
									Открыть карту
								</button>
							</div>
						</div>
					))}
				</div>
			)}
		</div>
	);
};
