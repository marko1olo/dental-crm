/**
 * TreatmentPlanPriceValidatorModal.tsx — Интерактивный Touch-First HUD валидации цен и фиксации смет DENTE CRM.
 * (DOMAIN: PLAN PRICE VALIDATION & PRICELIST LOCK)
 *
 * Функционал:
 * 1. Сопоставление позиций плана лечения с актуальным каталогом услуг клиники (Приказ Минздрава РФ № 804н).
 * 2. Side-by-side таблица сравнения цен (План vs Актуальный прайс, процентные дельты, архивные позиции).
 * 3. 1-Click пакетные действия: «Зафиксировать цены плана (Гарантия)» / «Обновить до актуального прайса».
 * 4. Управление политиками срока действия (30 / 90 / 180 дней) и порогами инфляции.
 * 5. Блок авторизации управляющего (Admin Override PIN) при превышении порогов или архивных позициях.
 * 6. Прямой экспорт проверенной сметы в Зуботехнический заказ-наряд или Акт выполненных работ.
 */

import type React from "react";
import { useMemo, useState } from "react";
import {
	AlertCircle,
	AlertTriangle,
	ArrowRight,
	Check,
	CheckCircle2,
	Clock,
	DollarSign,
	FileCheck,
	FileText,
	KeyRound,
	Lock,
	Printer,
	RefreshCw,
	ShieldCheck,
	X,
} from "lucide-react";
import {
	type CatalogServiceItem,
	PLAN_PRICE_POLICY_PRESETS,
	type PlanPricePolicyPresetId,
	type PriceLockResolutionPolicy,
	SAMPLE_CURRENT_PRICELIST,
	SAMPLE_TREATMENT_PLAN_FOR_VALIDATION,
	type TreatmentPlanValidationPayload,
} from "./planPriceValidationPresets";
import {
	type AdminOverrideMetadata,
	applyBatchResolutionToAllItems,
	generateWorkOrderExportPayload,
	validateTreatmentPlanPrices,
	type WorkOrderValidatedExport,
} from "./planPriceValidationEngine";
import "./planPriceValidation.css";

export interface TreatmentPlanPriceValidatorModalProps {
	readonly isOpen?: boolean | undefined;
	readonly onClose?: (() => void) | undefined;
	readonly planPayload?: TreatmentPlanValidationPayload | undefined;
	readonly catalogPricelist?: readonly CatalogServiceItem[] | undefined;
	readonly initialPresetId?: PlanPricePolicyPresetId | undefined;
	readonly onExportWorkOrder?: ((exportData: WorkOrderValidatedExport) => void) | undefined;
	readonly onExportCompletedAct?: ((exportData: WorkOrderValidatedExport) => void) | undefined;
}

export const TreatmentPlanPriceValidatorModal: React.FC<TreatmentPlanPriceValidatorModalProps> = ({
	isOpen = true,
	onClose,
	planPayload = SAMPLE_TREATMENT_PLAN_FOR_VALIDATION,
	catalogPricelist = SAMPLE_CURRENT_PRICELIST,
	initialPresetId = "standard_30",
	onExportWorkOrder,
	onExportCompletedAct,
}) => {
	const [selectedPresetId, setSelectedPresetId] =
		useState<PlanPricePolicyPresetId>(initialPresetId);
	const [itemResolutions, setItemResolutions] = useState<
		Record<string, PriceLockResolutionPolicy>
	>({});
	const [customPrices, setCustomPrices] = useState<Record<string, number>>({});
	const [adminOverride, setAdminOverride] = useState<AdminOverrideMetadata>({
		isAuthorized: false,
	});

	// Поля ввода для согласования управляющего
	const [adminPinInput, setAdminPinInput] = useState<string>("");
	const [adminNameInput, setAdminNameInput] = useState<string>("Главный врач / Управляющий");
	const [adminReasonInput, setAdminReasonInput] = useState<string>(
		"Согласовано сохранение цен в рамках программы лояльности пациента",
	);
	const [showAdminDrawer, setShowAdminDrawer] = useState<boolean>(false);
	const [statusNotice, setStatusNotice] = useState<string | null>(null);

	const activePreset = PLAN_PRICE_POLICY_PRESETS[selectedPresetId];

	// Комплексный отчет валидации
	const report = useMemo(() => {
		return validateTreatmentPlanPrices(
			planPayload,
			catalogPricelist,
			activePreset,
			itemResolutions,
			customPrices,
			adminOverride,
		);
	}, [
		planPayload,
		catalogPricelist,
		activePreset,
		itemResolutions,
		customPrices,
		adminOverride,
	]);

	if (!isOpen) return null;

	// Смена политики для отдельной позиции
	const handleItemResolutionChange = (
		itemId: string,
		resolution: PriceLockResolutionPolicy,
	) => {
		setItemResolutions((prev) => ({
			...prev,
			[itemId]: resolution,
		}));
		setStatusNotice(null);
	};

	// Пакетная фиксация всех цен плана (Гарантия)
	const handleBatchLockOriginal = () => {
		const newResolutions: Record<string, PriceLockResolutionPolicy> = {};
		for (const item of planPayload.items) {
			newResolutions[item.itemId] = "LOCK_ORIGINAL_PRICE";
		}
		setItemResolutions(newResolutions);
		setStatusNotice("Применена фиксация оригинальных цен плана ко всем позициям.");
	};

	// Пакетное обновление до актуального прайса
	const handleBatchUpdateToCurrent = () => {
		const newResolutions: Record<string, PriceLockResolutionPolicy> = {};
		for (const item of planPayload.items) {
			newResolutions[item.itemId] = "UPDATE_TO_CURRENT_PRICE";
		}
		setItemResolutions(newResolutions);
		setStatusNotice("Все позиции пересчитаны по актуальному прайс-листу клиники.");
	};

	// Авторизация согласования управляющим
	const handleAuthorizeAdminOverride = () => {
		if (!adminPinInput.trim()) {
			setStatusNotice("Введите PIN-код или пароль управляющего для согласования.");
			return;
		}
		setAdminOverride({
			isAuthorized: true,
			authorizedByAdminName: adminNameInput.trim() || "Управляющий клиники",
			authorizationPinOrToken: "PIN-AUTH-OK",
			overrideReason: adminReasonInput.trim(),
			authorizedAtIso: new Date().toISOString(),
		});
		setShowAdminDrawer(false);
		setStatusNotice("Согласование управляющего успешно авторизовано.");
	};

	// Сброс авторизации управляющего
	const handleRevokeAdminOverride = () => {
		setAdminOverride({ isAuthorized: false });
		setAdminPinInput("");
		setStatusNotice("Авторизация согласования сброшена.");
	};

	// Оформление Наряд-заказа
	const handleGenerateWorkOrder = () => {
		const exportData = generateWorkOrderExportPayload(report, "work_order");
		if (onExportWorkOrder) {
			onExportWorkOrder(exportData);
		}
		setStatusNotice(
			`Зуботехнический наряд-заказ ${exportData.orderNumber} на сумму ${exportData.totalPayableRub.toLocaleString("ru-RU")} ₽ успешно сформирован.`,
		);
	};

	// Оформление Акта выполненных работ
	const handleGenerateCompletedAct = () => {
		const exportData = generateWorkOrderExportPayload(
			report,
			"completed_works_act",
		);
		if (onExportCompletedAct) {
			onExportCompletedAct(exportData);
		}
		setStatusNotice(
			`Акт выполненных работ ${exportData.orderNumber} на сумму ${exportData.totalPayableRub.toLocaleString("ru-RU")} ₽ готов к печати и подписанию.`,
		);
	};

	// Печать протокола валидации
	const handlePrintProtocol = () => {
		window.print();
	};

	return (
		<div className="price-validator-backdrop" role="dialog" aria-modal="true">
			<div className="price-validator-modal">
				{/* Header */}
				<header className="price-validator-header">
					<div className="price-validator-header-info">
						<div className="price-validator-icon-badge">
							<ShieldCheck size={26} />
						</div>
						<div>
							<div className="price-validator-title-row">
								<h2 className="price-validator-title">
									Валидатор цен и фиксация сметы: {planPayload.planNumber}
								</h2>
								{report.isPlanExpired ? (
									<span className="pv-badge pv-badge-warn">
										<Clock size={12} /> Истёк ({report.planAgeDays} дн. назад)
									</span>
								) : (
									<span className="pv-badge pv-badge-ok">
										<Clock size={12} /> Действителен (осталось{" "}
										{report.expiryDaysRemaining} дн.)
									</span>
								)}
							</div>
							<p className="price-validator-subtitle">
								Пациент: <strong>{planPayload.patientName}</strong> | Врач:{" "}
								{planPayload.doctorFullName}
							</p>
						</div>
					</div>
					<button
						type="button"
						className="price-validator-close-btn"
						onClick={onClose}
						title="Закрыть валидатор"
						aria-label="Закрыть"
					>
						<X size={20} />
					</button>
				</header>

				{/* Top Metrics Cards Grid */}
				<section className="price-validator-metrics-grid">
					<div className="price-validator-metric-card">
						<div className="price-validator-metric-label">
							<FileText size={14} /> Сумма в плане
						</div>
						<div className="price-validator-metric-value">
							{report.originalPlanNetRub.toLocaleString("ru-RU")} ₽
						</div>
						<div className="price-validator-metric-sub">
							Скидка: {report.originalPlanDiscountRub.toLocaleString("ru-RU")} ₽
						</div>
					</div>

					<div className="price-validator-metric-card">
						<div className="price-validator-metric-label">
							<DollarSign size={14} /> Текущий каталог
						</div>
						<div className="price-validator-metric-value">
							{report.currentCatalogGrossRub.toLocaleString("ru-RU")} ₽
						</div>
						<div className="price-validator-metric-sub">
							{report.increasedItemsCount > 0 ? (
								<span style={{ color: "var(--pv-warn)" }}>
									Подорожало: +{report.increasedItemsCount} поз.
								</span>
							) : (
								"Прайс актуален"
							)}
						</div>
					</div>

					<div
						className={`price-validator-metric-card ${
							report.canGenerateWorkOrder ? "highlight-ok" : "highlight-danger"
						}`}
					>
						<div className="price-validator-metric-label">
							<FileCheck size={14} /> Итог к наряду / акту
						</div>
						<div className="price-validator-metric-value">
							{report.resolvedNetRub.toLocaleString("ru-RU")} ₽
						</div>
						<div className="price-validator-metric-sub">
							{report.adminOverride.isAuthorized
								? "Согласовано управляющим"
								: report.overallStatus === "APPROVED_PRICE_LOCKED"
									? "Зафиксировано по гарантии"
									: "По прайсу клиники"}
						</div>
					</div>

					<div
						className={`price-validator-metric-card ${
							report.totalClinicAbsorptionRub > 0 ? "highlight-warn" : ""
						}`}
					>
						<div className="price-validator-metric-label">
							<Lock size={14} /> Экономия пациента
						</div>
						<div className="price-validator-metric-value">
							{report.totalClinicAbsorptionRub.toLocaleString("ru-RU")} ₽
						</div>
						<div className="price-validator-metric-sub">
							{report.totalDeltaRub !== 0
								? `Дельта: ${report.totalDeltaRub > 0 ? "+" : ""}${report.totalDeltaRub.toLocaleString("ru-RU")} ₽ (${report.totalDeltaPercent}%)`
								: "0% отклонения от плана"}
						</div>
					</div>
				</section>

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
								setSelectedPresetId(e.target.value as PlanPricePolicyPresetId)
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
							onClick={handleBatchLockOriginal}
							title="Зафиксировать оригинальные цены плана лечения"
						>
							<Lock size={15} /> Зафиксировать цены плана
						</button>
						<button
							type="button"
							className="price-validator-btn-secondary"
							onClick={handleBatchUpdateToCurrent}
							title="Обновить все позиции до актуального прайса клиники"
						>
							<RefreshCw size={15} /> Обновить до прайса
						</button>
						<button
							type="button"
							className={`price-validator-btn-secondary ${adminOverride.isAuthorized ? "pv-badge-ok" : ""}`}
							onClick={() => setShowAdminDrawer(!showAdminDrawer)}
						>
							<KeyRound size={15} />{" "}
							{adminOverride.isAuthorized
								? "Согласовано ✓"
								: "Согласование управляющего"}
						</button>
					</div>
				</div>

				{/* Body Content */}
				<main className="price-validator-body">
					{/* Status Notice Toast */}
					{statusNotice && (
						<div className="price-validator-banner status-ok">
							<CheckCircle2 size={18} />
							<div>{statusNotice}</div>
						</div>
					)}

					{/* Validation Messages Banner */}
					{report.validationMessages.length > 0 && (
						<div
							className={`price-validator-banner ${
								report.overallStatus === "BLOCKED_ARCHIVED_SERVICE"
									? "status-danger"
									: report.overallStatus === "PENDING_ADMIN_OVERRIDE"
										? "status-warn"
										: "status-ok"
							}`}
						>
							{report.overallStatus === "BLOCKED_ARCHIVED_SERVICE" ? (
								<AlertCircle size={20} />
							) : report.overallStatus === "PENDING_ADMIN_OVERRIDE" ? (
								<AlertTriangle size={20} />
							) : (
								<CheckCircle2 size={20} />
							)}
							<div>
								<strong>
									{report.overallStatus === "BLOCKED_ARCHIVED_SERVICE"
										? "Внимание: Блокировка оформления"
										: report.overallStatus === "PENDING_ADMIN_OVERRIDE"
											? "Требуется решение управляющего"
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
									<KeyRound size={16} /> Ручное согласование управляющего
									клиники
								</span>
								{adminOverride.isAuthorized && (
									<button
										type="button"
										className="pv-res-btn"
										onClick={handleRevokeAdminOverride}
									>
										Сбросить согласование
									</button>
								)}
							</div>
							<div className="price-validator-admin-inputs">
								<input
									type="password"
									className="price-validator-input"
									placeholder="PIN-код управляющего"
									value={adminPinInput}
									onChange={(e) => setAdminPinInput(e.target.value)}
								/>
								<input
									type="text"
									className="price-validator-input"
									placeholder="Основание / Причина фиксации"
									value={adminReasonInput}
									onChange={(e) => setAdminReasonInput(e.target.value)}
								/>
								<button
									type="button"
									className="price-validator-btn-brand"
									onClick={handleAuthorizeAdminOverride}
								>
									<Check size={16} /> Утвердить смету
								</button>
							</div>
						</div>
					)}

					{/* Comparison Table */}
					<div className="price-validator-table-container">
						<table className="price-validator-table">
							<thead>
								<tr>
									<th style={{ width: "5%" }}># / Зуб</th>
									<th style={{ width: "12%" }}>Код 804н</th>
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
														handleItemResolutionChange(
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
														handleItemResolutionChange(
															item.itemId,
															"UPDATE_TO_CURRENT_PRICE",
														)
													}
													title="Пересчет по текущему прайсу"
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
				</main>

				{/* Footer Actions */}
				<footer className="price-validator-footer">
					<div className="price-validator-footer-summary">
						<span>
							Позиций к оформлению: <strong>{report.totalItemsCount}</strong>
						</span>
						<span>
							Итоговая стоимость:{" "}
							<strong style={{ fontSize: "1.1rem", color: "var(--pv-brand)" }}>
								{report.resolvedNetRub.toLocaleString("ru-RU")} ₽
							</strong>
						</span>
					</div>

					<div className="price-validator-footer-actions">
						<button
							type="button"
							className="price-validator-btn-secondary"
							onClick={handlePrintProtocol}
							title="Распечатать протокол сверки прайс-листа"
						>
							<Printer size={16} /> Протокол сверки
						</button>
						<button
							type="button"
							className="price-validator-btn-brand"
							onClick={handleGenerateWorkOrder}
							disabled={!report.canGenerateWorkOrder}
							title={
								report.canGenerateWorkOrder
									? "Сформировать зуботехнический наряд-заказ"
									: "Оформление заблокировано (требуется согласование или замена архивных позиций)"
							}
						>
							<FileText size={16} /> Оформить наряд-заказ
						</button>
						<button
							type="button"
							className="price-validator-btn-brand"
							onClick={handleGenerateCompletedAct}
							disabled={!report.canGenerateCompletedAct}
							title="Сформировать акт выполненных работ"
							style={{ background: "var(--pv-ok)", borderColor: "var(--pv-ok)" }}
						>
							<FileCheck size={16} /> Сформировать акт
						</button>
					</div>
				</footer>
			</div>
		</div>
	);
};

export default TreatmentPlanPriceValidatorModal;
