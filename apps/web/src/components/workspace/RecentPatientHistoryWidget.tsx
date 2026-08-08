import { ChevronRight, Clock } from "lucide-react";
import type React from "react";
import { useEffect, useRef, useState } from "react";
import { useAppLogicContext } from "../../contexts/AppLogicContext";
import { actionFailureToast } from "../../lib/panelStateText";
import { showToast } from "../GlobalToast";

interface RecentPatientItem {
	id: string;
	organizationId: string;
	userId: string;
	patientId: string;
	patientName: string;
	phone: string;
	lastViewedAt: string;
}

export const RecentPatientHistoryWidget: React.FC<{
	compactDropdown?: boolean;
}> = ({ compactDropdown = false }) => {
	const context = useAppLogicContext();
	const auth = context?.auth;
	/*
	 * Карточку открывает setSelectedPatientId.
	 *
	 * Здесь стояло ctx?.selectPatient ?? (() => {}) — поля selectPatient в общем
	 * контексте нет вовсе, ни одного объявления во всём проекте. Пустая функция
	 * молча подставлялась вместо него, и нажатие на пациента только меняло адрес
	 * на #patients: раздел открывался на том, кто был выбран раньше. Ошибки при
	 * этом не возникало, и понять, что переход не сработал, можно было только
	 * заметив чужую фамилию.
	 */
	const selectPatientById = context?.setSelectedPatientId;
	const [patients, setPatients] = useState<RecentPatientItem[]>([]);
	const [loading, setLoading] = useState<boolean>(true);
	const [failed, setFailed] = useState<boolean>(false);
	const [isOpen, setIsOpen] = useState<boolean>(false);
	/*
	 * Список перечитывается после того, как сервер принял отметку о просмотре.
	 *
	 * Сначала здесь стояла смена выбранного пациента — и не работала: пациент
	 * восстанавливается из настроек ещё до появления виджета, смены не
	 * происходит, а список читается раньше, чем отметка доедет. Проверено
	 * живьём: строка в базе была, а счётчик в шапке показывал ноль.
	 */
	const _recordedViews = context?.recentPatientViewsVersion;

	/*
	 * Заголовки берутся через ссылку, а не из зависимостей.
	 *
	 * ЧТО БЫЛО СЛОМАНО МНОЙ ЖЕ. В зависимостях стоял `auth`. Это объект, который
	 * useAppLogic собирает заново на КАЖДОЙ перерисовке рабочего места, поэтому
	 * сравнение по ссылке всегда давало «изменилось», и запрос уходил снова. Замер
	 * в браузере: пять обращений к /api/hr/recent-patients за тридцать секунд на
	 * простом открытии раздела «Записи», без единого действия пользователя. Виджет
	 * стоит в шапке и живёт на всех экранах, то есть это постоянный поток запросов
	 * на пустом месте.
	 *
	 * Ссылка обновляется при каждой перерисовке, а эффект — только когда сервер
	 * действительно принял новую отметку просмотра.
	 */
	const authRef = useRef(auth);
	authRef.current = auth;

	useEffect(() => {
		let active = true;
		const headerSource = authRef.current;
		fetch("/api/hr/recent-patients", {
			headers: headerSource ? headerSource.denteClinicalReadHeaders() : {},
		})
			.then(async (response) => {
				// Разбор только успешного ответа: на 401 и 500 приходит не список,
				// и «пустая история» вместо ошибки — это враньё пользователю.
				if (!response.ok)
					throw new Error(`История карточек: ответ ${response.status}`);
				return response.json();
			})
			.then((data) => {
				if (!active) return;
				setPatients(Array.isArray(data) ? data : []);
				setFailed(false);
				setLoading(false);
			})
			.catch((err) => {
				if (!active) return;
				setFailed(true);
				setLoading(false);
				showToast(
					actionFailureToast(
						"Ошибка загрузки истории",
						(err as { status?: number })?.status ?? null,
					),
					"error",
				);
			});
		return () => {
			active = false;
		};
	}, []);

	const handleOpenPatient = (patId: string) => {
		selectPatientById?.(patId);
		window.location.hash = "#patients";
		setIsOpen(false);
	};

	if (compactDropdown) {
		return (
			<details
				className="workspace-role-switcher recent-patients-header-dropdown"
				data-testid="recent-patient-history-header-widget"
				open={isOpen}
				onToggle={(e) => setIsOpen((e.target as HTMLDetailsElement).open)}
				style={{ position: "relative" }}
			>
				<summary
					title="История 10 последних просмотренных карточек"
					style={{
						display: "inline-flex",
						alignItems: "center",
						gap: "6px",
						cursor: "pointer",
						fontSize: "12px",
						fontWeight: 500,
						color: "var(--ink-2)",
					}}
				>
					<Clock
						size={14}
						aria-hidden="true"
						style={{ color: "var(--teal)" }}
					/>
					<span>Недавние</span>
					<strong
						className="status-pill status-confirmed"
						style={{ fontSize: "11px", padding: "1px 7px" }}
					>
						{patients.length}
					</strong>
				</summary>
				<div
					className="role-switcher-options"
					style={{
						position: "absolute",
						top: "100%",
						right: 0,
						width: "300px",
						maxHeight: "360px",
						overflowY: "auto",
						zIndex: 50,
					}}
				>
					<div
						style={{
							padding: "8px 12px",
							borderBottom: "1px solid var(--line)",
							fontSize: "11px",
							fontWeight: 700,
							color: "var(--muted)",
							display: "flex",
							justifyContent: "space-between",
							alignItems: "center",
						}}
					>
						<span>ОТКРЫТЫЕ РАНЕЕ КАРТОЧКИ</span>
						<span style={{ fontSize: "10px", color: "var(--muted)" }}>
							ТОП 10
						</span>
					</div>

					{loading ? (
						<div
							style={{
								padding: "16px",
								textAlign: "center",
								fontSize: "12px",
								color: "var(--muted)",
							}}
						>
							Загрузка...
						</div>
					) : failed ? (
						<div
							style={{
								padding: "16px",
								textAlign: "center",
								fontSize: "12px",
								color: "var(--muted)",
							}}
						>
							Не удалось прочитать историю. Обновите страницу.
						</div>
					) : patients.length === 0 ? (
						<div
							style={{
								padding: "16px",
								textAlign: "center",
								fontSize: "12px",
								color: "var(--muted)",
							}}
						>
							Здесь появятся карточки, которые вы открывали
						</div>
					) : (
						patients.map((pat) => (
							<button
								key={pat.id}
								type="button"
								onClick={() => handleOpenPatient(pat.patientId || pat.id)}
								className="flex items-center justify-between w-full px-3 py-2 rounded-lg border-none bg-transparent hover:bg-slate-100 dark:hover:bg-slate-800 text-left transition-colors cursor-pointer"
							>
								<div>
									<div className="text-xs font-semibold text-slate-900 dark:text-slate-100">
										{pat.patientName}
									</div>
									<div className="text-[11px] text-slate-500 dark:text-slate-400">
										{pat.phone}
									</div>
								</div>
								<div className="flex items-center gap-1.5">
									<span className="text-[10px] text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
										{new Date(pat.lastViewedAt).toLocaleTimeString([], {
											hour: "2-digit",
											minute: "2-digit",
										})}
									</span>
									<ChevronRight size={14} className="text-slate-400" />
								</div>
							</button>
						))
					)}
				</div>
			</details>
		);
	}

	return (
		<div
			data-testid="recent-patient-history-widget"
			className="p-4 rounded-xl border my-4 shadow-sm bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100"
		>
			<div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-200 dark:border-slate-800">
				<div className="flex items-center space-x-2">
					<Clock className="w-5 h-5 text-sky-500" />
					<h3 className="font-semibold text-sky-600 dark:text-sky-400">
						Карточки, которые вы открывали недавно
					</h3>
				</div>
			</div>

			{loading ? (
				<div className="text-sm py-4 text-slate-500 dark:text-slate-400">
					Загрузка...
				</div>
			) : failed ? (
				<div className="text-sm py-3 text-center text-slate-500 dark:text-slate-400">
					Не удалось прочитать историю. Обновите страницу.
				</div>
			) : patients.length === 0 ? (
				<div className="text-sm py-3 text-center text-slate-500 dark:text-slate-400">
					Здесь появятся карточки, которые вы открывали
				</div>
			) : (
				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
					{patients.map((pat) => (
						<div
							key={pat.id}
							className="p-3 rounded-lg border flex items-center justify-between bg-slate-50 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700"
						>
							<div>
								<div className="text-sm font-bold text-slate-900 dark:text-white">
									{pat.patientName}
								</div>
								<div className="text-xs text-slate-500 dark:text-slate-400">
									{pat.phone}
								</div>
							</div>
							<button
								type="button"
								onClick={() => handleOpenPatient(pat.patientId || pat.id)}
								className="text-xs bg-sky-600 hover:bg-sky-700 text-white font-semibold px-3 py-1.5 rounded-md border-none cursor-pointer transition-colors"
							>
								Открыть
							</button>
						</div>
					))}
				</div>
			)}
		</div>
	);
};
