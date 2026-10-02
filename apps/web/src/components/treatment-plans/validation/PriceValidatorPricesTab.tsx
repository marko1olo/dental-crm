/**
 * PriceValidatorPricesTab.tsx — Вкладка сверки цен и прайс-листа клиники (DENTE CRM).
 *
 * Содержит:
 * 1. Тулбар с селектором политики и пакетными действиями (фиксация гарантии / обновление до прайса).
 * 2. Мягкое предупреждение о 30-дневном сроке (Мандат 8e: без блокировок клинической работы).
 * 3. Баннер валидационных сообщений.
 * 4. Дровер автономии врача / подтверждения цен в 1 клик.
 * 5. Таблицу построчной сверки сметы с текущим каталогом.
 */

import type React from "react";
import {
	AlertTriangle,
	Check,
	CheckCircle2,
	Clock,
	Lock,
	RefreshCw,
	ShieldCheck,
} from "lucide-react";
import {
	PLAN_PRICE_POLICY_PRESETS,
	type PlanPricePolicyPresetId,
	type PriceLockResolutionPolicy,
} from "./planPriceValidationPresets";
import type {
	AdminOverrideMetadata,
	PlanPriceValidationReport,
} from "./planPriceValidationEngine";

export interface PriceValidatorPricesTabProps {
	readonly report: PlanPriceValidationReport;
	readonly selectedPresetId: PlanPricePolicyPresetId;
	readonly onPresetChange: (presetId: PlanPricePolicyPresetId) => void;
	readonly onBatchLockOriginal: () => void;
	readonly onBatchUpdateToCurrent: () => void;
	readonly showAdminDrawer: boolean;
	readonly onToggleAdminDrawer: () => void;
	readonly adminOverride: AdminOverrideMetadata;
	readonly onRevokeAdminOverride: () => void;
	readonly onAuthorizeDoctorAutonomy: () => void;
	readonly adminReasonInput: string;
	readonly onAdminReasonChange: (val: string) => void;
	readonly adminPinInput: string;
	readonly onAdminPinChange: (val: string) => void;
	readonly onItemResolutionChange: (
		itemId: string,
		resolution: PriceLockResolutionPolicy,
	) => void;
}

export const PriceValidatorPricesTab: React.FC<PriceValidatorPricesTabProps> = ({
	report,
	selectedPresetId,
	onPresetChange,
	onBatchLockOriginal,
	onBatchUpdateToCurrent,
	showAdminDrawer,
	onToggleAdminDrawer,
	adminOverride,
	onRevokeAdminOverride,
	onAuthorizeDoctorAutonomy,
	adminReasonInput,
	onAdminReasonChange,
	adminPinInput,
	onAdminPinChange,
	onItemResolutionChange,
}) => {
	return (
		<>
			{/* Toolbar & Policy Selector */}
			<div className="price-validator-toolbar">
				<div className="price-validator-policy-selector">
					<span
						style={{
							fontSize: "0.85rem",
							fontWeight: 700,
							color: "var(--pv-text-muted)",
						}}
					>
						Политика фиксации:
					</span>
					<select
						className="price-validator-policy-select"
						value={selectedPresetId}
						onChange={(e) =>
							onPresetChange(e.target.value as PlanPricePolicyPresetId)
						}
					>
						{Object.values(PLAN_PRICE_POLICY_PRESETS).map((p) => (
							<option key={p.id} value={p.id}>
								{p.title} (пороговый лимит {p.inflationThresholdPercent}%)
							</option>
						))}
					</select>
				</div>

				<div className="price-validator-batch-actions">
					<button
						type="button"
						className="price-validator-btn-secondary"
						onClick={onBatchLockOriginal}
						title="Зафиксировать оригинальные цены плана лечения"
					>
						<Lock size={15} /> Зафиксировать цены плана
					</button>
					<button
						type="button"
						className="price-validator-btn-secondary"
						onClick={onBatchUpdateToCurrent}
						title="Обновить все позиции до актуального прайса клиники"
					>
						<RefreshCw size={15} /> Обновить до прайса
					</button>
					<button
						type="button"
						className={`price-validator-btn-secondary ${adminOverride.isAuthorized ? "pv-badge-ok" : ""}`}
						onClick={onToggleAdminDrawer}
						title="Подтверждение цен плана лечащим врачом в 1 клик (Мандат 8e)"
					>
						{adminOverride.isAuthorized ? <Check size={15} /> : <ShieldCheck size={15} />}{" "}
						{adminOverride.isAuthorized
							? "Согласовано врачом"
							: "Автономия врача (1 клик)"}
					</button>
				</div>
			</div>

			{/* Soft warning for 30-day expiration (Mandate 8e: zero blockers) */}
			{report.isPlanExpired && (
				<div
					className="price-validator-banner status-info"
					data-testid="validator-plan-expired-soft-banner"
					style={{
						background: "rgba(245, 158, 11, 0.08)",
						borderColor: "rgba(245, 158, 11, 0.3)",
						color: "var(--ink)",
						marginBottom: "0.75rem",
					}}
				>
					<Clock size={20} className="text-amber-600 dark:text-amber-400 shrink-0" />
					<div>
						<strong>Мягкое предупреждение: срок составления сметы превысил 30 дней</strong>
						<div style={{ marginTop: 2, fontSize: "0.85rem" }}>
							В соответствии с Мандатом 8e, истечение 30 дней с момента составления плана лечения НЕ БЛОКИРУЕТ оказание услуг, создание нарядов ЗТЛ или проведение оплаты. Цены зафиксированы по согласованию с лечащим врачом.
						</div>
					</div>
				</div>
			)}

			{/* Validation Messages Banner */}
			{report.validationMessages.length > 0 && (
				<div
					className={`price-validator-banner ${
						report.overallStatus === "BLOCKED_ARCHIVED_SERVICE"
							? "status-warn"
							: report.overallStatus === "PENDING_ADMIN_OVERRIDE"
								? "status-warn"
								: "status-ok"
					}`}
				>
					{report.overallStatus === "BLOCKED_ARCHIVED_SERVICE" ? (
						<AlertTriangle size={20} />
					) : report.overallStatus === "PENDING_ADMIN_OVERRIDE" ? (
						<AlertTriangle size={20} />
					) : (
						<CheckCircle2 size={20} />
					)}
					<div>
						<strong>
							{report.overallStatus === "BLOCKED_ARCHIVED_SERVICE"
								? "Архивная позиция в плане (разрешено врачом)"
								: report.overallStatus === "PENDING_ADMIN_OVERRIDE"
									? "Индивидуальная скидка согласована врачом"
									: "Проверка успешно завершена"}
						</strong>
						{report.validationMessages.map((msg, idx) => (
							<div key={idx} style={{ marginTop: 2 }}>
								{msg}
							</div>
						))}
					</div>
				</div>
			)}

			{/* Admin Override Drawer */}
			{showAdminDrawer && (
				<div className="price-validator-admin-box">
					<div className="price-validator-admin-header">
						<span>
							<ShieldCheck size={16} /> Автономия лечащего врача (Мандат 8e) / Подтверждение цен
						</span>
						{adminOverride.isAuthorized && (
							<button
								type="button"
								className="pv-res-btn"
								onClick={onRevokeAdminOverride}
							>
								Сбросить согласование
							</button>
						)}
					</div>
					<div className="price-validator-admin-inputs">
						<button
							type="button"
							className="price-validator-btn-brand"
							onClick={onAuthorizeDoctorAutonomy}
							data-testid="btn-doctor-autonomy-approve"
							style={{ background: "var(--pv-ok)", borderColor: "var(--pv-ok)" }}
						>
							<Check size={16} /> Подтвердить в 1 клик (без PIN-кода)
						</button>
						<input
							type="text"
							className="price-validator-input"
							placeholder="Основание / Причина фиксации"
							value={adminReasonInput}
							onChange={(e) => onAdminReasonChange(e.target.value)}
						/>
						<input
							type="password"
							className="price-validator-input"
							placeholder="PIN-код (необязательно)"
							value={adminPinInput}
							onChange={(e) => onAdminPinChange(e.target.value)}
						/>
					</div>
				</div>
			)}

			{/* Comparison Table */}
			<div className="price-validator-table-container">
				<table className="price-validator-table">
					<thead>
						<tr>
							<th style={{ width: "5%" }}># / Зуб</th>
							<th style={{ width: "12%" }}>Код услуги</th>
							<th style={{ width: "30%" }}>Услуга</th>
							<th style={{ width: "6%" }}>Кол-во</th>
							<th style={{ width: "12%" }}>Цена в плане</th>
							<th style={{ width: "12%" }}>Текущий прайс</th>
							<th style={{ width: "13%" }}>Разница</th>
							<th style={{ width: "10%" }}>Решение</th>
						</tr>
					</thead>
					<tbody>
						{report.items.map((item, idx) => (
							<tr key={item.itemId}>
								<td>
									<span style={{ fontWeight: 700, marginRight: 6 }}>
										{idx + 1}
									</span>
									{item.toothNumber ? (
										<span className="pv-badge pv-badge-tooth">
											#{item.toothNumber}
										</span>
									) : (
										<span className="pv-badge pv-badge-tooth">—</span>
									)}
								</td>
								<td>
									<span className="pv-badge pv-badge-code">
										{item.code804n}
									</span>
								</td>
								<td>
									<div style={{ fontWeight: 600 }}>{item.serviceTitle}</div>
									<div
										style={{
											fontSize: "0.75rem",
											color: "var(--pv-text-muted)",
										}}
									>
										{item.category}
									</div>
								</td>
								<td style={{ fontWeight: 700 }}>{item.quantity}</td>
								<td>
									<div style={{ fontWeight: 700 }}>
										{item.planUnitPriceRub.toLocaleString("ru-RU")} ₽
									</div>
									{item.planDiscountRub > 0 && (
										<div
											style={{
												fontSize: "0.75rem",
												color: "var(--pv-ok)",
											}}
										>
											Скидка {item.planDiscountPercent}% (-
											{item.planDiscountRub.toLocaleString("ru-RU")} ₽)
										</div>
									)}
								</td>
								<td>
									<div style={{ fontWeight: 700 }}>
										{item.currentCatalogPriceRub.toLocaleString("ru-RU")} ₽
									</div>
									{item.isArchived && (
										<span className="pv-badge pv-badge-danger">
											В архиве
										</span>
									)}
									{item.isNotFound && (
										<span className="pv-badge pv-badge-warn">
											Нет в прайсе
										</span>
									)}
								</td>
								<td>
									<span
										className={`pv-badge ${
											item.severity === "error"
												? "pv-badge-danger"
												: item.severity === "warning"
													? "pv-badge-warn"
													: item.severity === "info"
														? "pv-badge-info"
														: "pv-badge-ok"
										}`}
									>
										{item.statusBadgeText}
									</span>
								</td>
								<td>
									<div className="pv-resolution-selector">
										<button
											type="button"
											className={`pv-res-btn ${item.selectedResolution === "LOCK_ORIGINAL_PRICE" ? "active-lock" : ""}`}
											onClick={() =>
												onItemResolutionChange(
													item.itemId,
													"LOCK_ORIGINAL_PRICE",
												)
											}
											title="Фиксация цены плана"
										>
											План
										</button>
										<button
											type="button"
											className={`pv-res-btn ${item.selectedResolution === "UPDATE_TO_CURRENT_PRICE" ? "active-current" : ""}`}
											onClick={() =>
												onItemResolutionChange(
													item.itemId,
													"UPDATE_TO_CURRENT_PRICE",
												)
											}
											title={
												item.isArchived
													? "Услуга выведена в архив прайс-листа клиники (пересчет по новому прайсу недоступен)"
													: "Пересчет по текущему прайсу клиники"
											}
											disabled={item.isArchived}
										>
											Прайс
										</button>
									</div>
								</td>
							</tr>
						))}
					</tbody>
				</table>
			</div>
		</>
	);
};

export default PriceValidatorPricesTab;
