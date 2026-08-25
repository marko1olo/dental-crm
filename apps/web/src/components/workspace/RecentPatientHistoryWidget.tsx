import { ChevronDown, ChevronRight, Clock } from "lucide-react";
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
			.catch((_err) => {
				if (!active) return;
				setFailed(true);
				setLoading(false);
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
						size={13}
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
					<ChevronDown size={13} className="switcher-chevron opacity-60" aria-hidden="true" />
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
								style={{
									display: "flex",
									alignItems: "center",
									justifyContent: "space-between",
									width: "100%",
									padding: "8px 10px",
									borderRadius: "8px",
									border: "none",
									background: "transparent",
									textAlign: "left",
									cursor: "pointer",
									transition: "background 0.15s ease",
								}}
								onMouseEnter={(e) => {
									e.currentTarget.style.background = "var(--teal-surface)";
								}}
								onMouseLeave={(e) => {
									e.currentTarget.style.background = "transparent";
								}}
							>
								<div style={{ minWidth: 0 }}>
									<div
										style={{
											fontSize: "12px",
											fontWeight: 600,
											color: "var(--ink)",
											overflow: "hidden",
											textOverflow: "ellipsis",
											whiteSpace: "nowrap",
										}}
									>
										{pat.patientName}
									</div>
									<div style={{ fontSize: "11px", color: "var(--muted)" }}>
										{pat.phone}
									</div>
								</div>
								<div
									style={{
										display: "flex",
										alignItems: "center",
										gap: "6px",
										flexShrink: 0,
										marginLeft: "8px",
									}}
								>
									<span
										style={{
											fontSize: "10px",
											color: "var(--muted)",
											background: "var(--paper-soft)",
											padding: "2px 6px",
											borderRadius: "4px",
										}}
									>
										{new Date(pat.lastViewedAt).toLocaleTimeString([], {
											hour: "2-digit",
											minute: "2-digit",
										})}
									</span>
									<ChevronRight size={14} style={{ color: "var(--muted)" }} />
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
			className="panel"
			style={{ padding: "16px", margin: "16px 0" }}
		>
			<div
				style={{
					display: "flex",
					alignItems: "center",
					justifyContent: "space-between",
					marginBottom: "12px",
					paddingBottom: "8px",
					borderBottom: "1px solid var(--line)",
				}}
			>
				<div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
					<Clock size={18} style={{ color: "var(--teal)" }} />
					<h3
						style={{
							margin: 0,
							fontSize: "15px",
							fontWeight: 700,
							color: "var(--ink)",
						}}
					>
						Карточки, которые вы открывали недавно
					</h3>
				</div>
			</div>

			{loading ? (
				<div style={{ fontSize: "13px", padding: "16px 0", color: "var(--muted)" }}>
					Загрузка...
				</div>
			) : failed ? (
				<div
					style={{
						fontSize: "13px",
						padding: "12px 0",
						textAlign: "center",
						color: "var(--bad-fg)",
					}}
				>
					Не удалось прочитать историю. Обновите страницу.
				</div>
			) : patients.length === 0 ? (
				<div
					style={{
						fontSize: "13px",
						padding: "12px 0",
						textAlign: "center",
						color: "var(--muted)",
					}}
				>
					Здесь появятся карточки, которые вы открывали
				</div>
			) : (
				<div
					style={{
						display: "grid",
						gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
						gap: "12px",
					}}
				>
					{patients.map((pat) => (
						<div
							key={pat.id}
							className="clickable-card"
							style={{
								padding: "12px",
								display: "flex",
								flexDirection: "row",
								alignItems: "center",
								justifyContent: "space-between",
							}}
						>
							<div style={{ minWidth: 0 }}>
								<div
									style={{
										fontSize: "13px",
										fontWeight: 700,
										color: "var(--ink)",
										overflow: "hidden",
										textOverflow: "ellipsis",
										whiteSpace: "nowrap",
									}}
								>
									{pat.patientName}
								</div>
								<div style={{ fontSize: "12px", color: "var(--muted)" }}>
									{pat.phone}
								</div>
							</div>
							<button
								type="button"
								onClick={() => handleOpenPatient(pat.patientId || pat.id)}
								className="primary-button"
								style={{
									minHeight: "28px",
									padding: "0 10px",
									fontSize: "11px",
									fontWeight: 600,
								}}
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
