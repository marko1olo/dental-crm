/**
 * Layer 3: State Management & Data Fetching Hook for Doctor Payout Dashboard.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { showToast } from "../../components/GlobalToast";
import { actionFailureToast } from "../../lib/panelStateText";
import { useAppLogicContext } from "../../contexts/AppLogicContext";
import type {
	CommissionSaveState,
	DoctorPayoutReport,
	DoctorPayoutRow,
	PayoutLoadState,
} from "./types";
import {
	currentMonthValue,
	monthLabelOf,
	parseCommissionInput,
	payoutMonthCalendarBounds,
	requestDoctorPayouts,
	serverMessageOf,
} from "./payoutHelpers";

export function usePayoutDashboard(initialReport?: DoctorPayoutReport) {
	const [month, setMonth] = useState<string>(() => currentMonthValue());
	const [state, setState] = useState<PayoutLoadState>(() =>
		initialReport ? { kind: "ready", report: initialReport } : { kind: "loading" },
	);
	const [editingRateFor, setEditingRateFor] = useState<string | null>(null);
	const [rateDraft, setRateDraft] = useState<string>("");
	const [rateSave, setRateSave] = useState<CommissionSaveState>({
		kind: "idle",
	});

	// Drill-down and payroll modal states
	const [expandedDoctorId, setExpandedDoctorId] = useState<string | null>(null);
	const [activeSubTabs, setActiveSubTabs] = useState<Record<string, "visits" | "lab">>({});
	const [searchFilters, setSearchFilters] = useState<Record<string, string>>({});
	const [visitPages, setVisitPages] = useState<Record<string, number>>({});
	const [payrollModalDoctor, setPayrollModalDoctor] = useState<DoctorPayoutRow | null>(null);

	/*
	 * authRef: useAppLogic returns a new auth object each render. Putting auth
	 * in a ref keeps load() stable (empty deps) without stale-closing over an
	 * empty secret after login / secret rotation.
	 */
	const appLogic = useAppLogicContext();
	const authRef = useRef(appLogic?.auth);
	authRef.current = appLogic?.auth;

	const load = useCallback(async (monthValue: string) => {
		const bounds = payoutMonthCalendarBounds(monthValue);
		if (!bounds) {
			setState({
				kind: "failed",
				message: "Месяц расчёта не выбран.",
				action: "Выберите месяц, за который считаем выплаты.",
			});
			return;
		}

		setState({ kind: "loading" });
		try {
			// Уходят календарные даты YYYY-MM-DD. Превращать их в мгновение
			// браузеру нельзя: пояс клиники знает только сервер.
			const auth = authRef.current;
			const readHeaders =
				auth && typeof auth.denteClinicalReadHeaders === "function"
					? auth.denteClinicalReadHeaders()
					: {};
			const response = await requestDoctorPayouts(bounds, readHeaders);
			const payload = (await response.json()) as unknown;

			if (response.status === 403) {
				// Роль не видит зарплату. Блок исчезает целиком: сообщение
				// «вам сюда нельзя» на рабочем экране ресепшена — это шум, а не
				// информация, и оно подсказывает, где искать чужие деньги.
				setState({ kind: "denied" });
				return;
			}
			if (response.status === 401) {
				setState({
					kind: "needs_staff_login",
					message:
						serverMessageOf(payload) ??
						"Расчёт выплат показывает зарплату конкретных врачей, поэтому сервер должен знать, кто смотрит.",
				});
				return;
			}
			if (!response.ok) {
				setState({
					kind: "failed",
					message:
						serverMessageOf(payload) ?? `Сервер ответил ${response.status}.`,
					action:
						response.status >= 500
							? "Это отказ расчёта, а не отсутствие заработка. Повторите позже и покажите сообщение администратору системы."
							: "Проверьте выбранный месяц и повторите.",
				});
				return;
			}

			// Успешный ответ должен быть ответом расчёта. Иначе это тоже отказ, а не
			// пустая таблица: молчаливый [] на чужой форме — то, из-за чего экран
			// врал раньше.
			const report = payload as DoctorPayoutReport | null;
			if (!report || !Array.isArray(report.rows) || !report.totals) {
				setState({
					kind: "failed",
					message:
						"Сервер ответил успешно, но состав ответа не похож на расчёт выплат.",
					action:
						"Показать пустую таблицу вместо этого нельзя: её прочитали бы как «никто ничего не заработал».",
				});
				return;
			}
			setState({ kind: "ready", report });
		} catch (error) {
			showToast(
				actionFailureToast(
					"Ошибка выполнения операции",
					(error as { status?: number })?.status ?? null,
				),
				"error",
			);
			setState({
				kind: "failed",
				message:
					error instanceof Error && error.message
						? `Запрос к серверу не дошёл: ${error.message}`
						: "Запрос к серверу не дошёл.",
				action:
					"Проверьте связь с сервером клиники и повторите. Пока ответа нет, суммы к выплате неизвестны.",
			});
		}
	}, []);

	useEffect(() => {
		if (initialReport) return;
		void load(month);
	}, [load, month, initialReport]);

	const saveRate = useCallback(
		async (doctorUserId: string, raw: string) => {
			const pct = parseCommissionInput(raw);
			if (pct === null) {
				setRateSave({
					kind: "failed",
					message:
						"Процент от кассы указывается числом от 0 до 100. Ставка не сохранена.",
				});
				return;
			}

			setRateSave({ kind: "saving" });
			try {
				/*
				 * PUT /api/settings/staff/:id/commission is behind requireSettingsAccess.
				 * That guard compares x-dente-admin-secret to DENTE_SETTINGS_ADMIN_SECRET.
				 * denteAdminSecretRequestHeaders(extra) WITHOUT the second arg only sends
				 * clinic/staff tokens — no admin secret. Local unguarded env stays green;
				 * customer with settings secret set gets 403 and cannot set doctor rate.
				 * Correct path: auth.settingsAccessHeaders (settingsAdminSecretSession).
				 */
				const auth = authRef.current;
				const headers =
					auth && typeof auth.settingsAccessHeaders === "function"
						? auth.settingsAccessHeaders({ "Content-Type": "application/json" })
						: { "Content-Type": "application/json" };
				void "settingsAccessHeaders";
				const response = await fetch(
					`/api/settings/staff/${doctorUserId}/commission`,
					{
						method: "PUT",
						headers,
						body: JSON.stringify({ commissionPct: pct }),
					},
				);

				const payload = (await response.json()) as unknown;
				if (!response.ok) {
					// Сообщение сервера идёт наружу дословно: он один знает причину
					// отказа — не тот сотрудник, нет секрета администратора клиники,
					// отключено хранение. Своё поверх чужого придумывать нельзя.
					setRateSave({
						kind: "failed",
						message:
							serverMessageOf(payload) ??
							`Ставка не сохранена: сервер ответил ${response.status}. Повторите или обратитесь к администратору системы.`,
					});
					return;
				}
				setEditingRateFor(null);
				setRateDraft("");
				setRateSave({ kind: "idle" });
				// Деньги пересчитывает сервер, поэтому отчёт перечитывается целиком.
				await load(month);
			} catch (error) {
				showToast(
					actionFailureToast(
						"Ошибка выполнения операции",
						(error as { status?: number })?.status ?? null,
					),
					"error",
				);
				setRateSave({
					kind: "failed",
					message:
						error instanceof Error && error.message
							? `Ставка не сохранена, запрос к серверу не дошёл: ${error.message}. Проверьте связь и повторите.`
							: "Ставка не сохранена, запрос к серверу не дошёл. Проверьте связь и повторите.",
				});
			}
		},
		[load, month],
	);

	const report = state.kind === "ready" ? state.report : null;
	const isOwnScope = report?.scope === "own";
	/*
	 * Право менять ставку — только у того, кому сервер отдал выплаты ВСЕЙ клиники.
	 * Подсказка интерфейса, не защита: решает requireSettingsAccess на сервере.
	 */
	const canEditRates = report !== null && report.scope === "all";

	/*
	 * Касса ПО ВИДИМЫМ СТРОКАМ, а не из totals.
	 *
	 * Сложение по видимым строкам оставлено намеренно: экран печатает подпись
	 * «моя касса за месяц», и это утверждение он обязан подтверждать теми
	 * строками, которые сам же показал.
	 */
	const ownVisible = useMemo(() => {
		if (!report) return { revenueRub: 0, paymentCount: 0 };
		return (report?.rows ?? []).reduce(
			(sum, row) => ({
				revenueRub: sum.revenueRub + row.revenueRub,
				paymentCount: sum.paymentCount + row.paymentCount,
			}),
			{ revenueRub: 0, paymentCount: 0 },
		);
	}, [report]);

	const monthLabel = monthLabelOf(month);

	const handleStartEditRate = useCallback((doctorId: string, currentRate: number | null) => {
		setEditingRateFor(doctorId);
		setRateDraft(currentRate === null ? "" : String(currentRate));
		setRateSave({ kind: "idle" });
	}, []);

	const handleCancelEditRate = useCallback(() => {
		setEditingRateFor(null);
		setRateDraft("");
		setRateSave({ kind: "idle" });
	}, []);

	const handleToggleExpandDoctor = useCallback((doctorId: string) => {
		setExpandedDoctorId((prev) => (prev === doctorId ? null : doctorId));
	}, []);

	const handleSubTabChange = useCallback((doctorId: string, tab: "visits" | "lab") => {
		setActiveSubTabs((prev) => ({ ...prev, [doctorId]: tab }));
	}, []);

	const handleSearchChange = useCallback((doctorId: string, query: string) => {
		setSearchFilters((prev) => ({ ...prev, [doctorId]: query }));
	}, []);

	const handlePageChange = useCallback((doctorId: string, page: number) => {
		setVisitPages((prev) => ({ ...prev, [doctorId]: page }));
	}, []);

	return {
		month,
		setMonth,
		state,
		load,
		report,
		isOwnScope,
		canEditRates,
		ownVisible,
		monthLabel,
		editingRateFor,
		rateDraft,
		setRateDraft,
		rateSave,
		saveRate,
		handleStartEditRate,
		handleCancelEditRate,
		expandedDoctorId,
		handleToggleExpandDoctor,
		activeSubTabs,
		handleSubTabChange,
		searchFilters,
		handleSearchChange,
		visitPages,
		handlePageChange,
		payrollModalDoctor,
		setPayrollModalDoctor,
	};
}
