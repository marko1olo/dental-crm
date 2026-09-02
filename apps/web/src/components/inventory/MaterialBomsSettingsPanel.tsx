/**
 * MaterialBomsSettingsPanel.tsx — Панель управления технологическими картами (BOM)
 * и нормами списания материалов со склада по услугам приказа Минздрава РФ № 804н.
 *
 * ФУНКЦИОНАЛ:
 * 1. Интерактивная матрица привязки услуг 804н к складским расходникам.
 * 2. Копеечно-точный расчет себестоимости материалов на каждую услугу.
 * 3. Контроль дефицита и складских остатков по нормам списания.
 * 4. 1-клик сидирование дефолтных клинических техкарт 804н (Пломбирование, Пульпит, Удаление, Профгигиена, Имплантация).
 * 5. Редактирование, добавление и удаление норм списания (в граммах, мл, штуках, карпулах).
 */

import {
	AlertTriangle,
	CheckCircle2,
	Database,
	Edit3,
	Package,
	Plus,
	RefreshCw,
	Search,
	Sparkles,
	Trash2,
	X,
} from "lucide-react";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useAppLogicContext } from "../../contexts/AppLogicContext";
import { logger } from "../../utils/logger";
import { showToast } from "../GlobalToast";
import type { InventoryItem } from "./useInventoryLogic";
import "./MaterialBomsSettingsPanel.css";

export interface ProcedureMaterialRuleViewItem {
	id: string;
	serviceId: string;
	serviceCode?: string | null;
	serviceTitle?: string | null;
	serviceCategory?: string | null;
	specialty?: string | null;
	inventoryItemId: string;
	itemName: string;
	category?: string | null;
	unit: string;
	stockQuantity: string | number;
	unitCostRub?: string | number | null;
	criticalThreshold?: string | number | null;
	quantityToDeduct: string | number;
	requiredQty?: string | number;
	createdAt?: string;
}

export interface MaterialBomsSettingsPanelProps {
	readonly organizationId?: string;
}

export function MaterialBomsSettingsPanel({
	organizationId: propOrgId,
}: MaterialBomsSettingsPanelProps) {
	const appLogic = useAppLogicContext();
	const auth = appLogic?.auth;
	const dashboard = appLogic?.dashboard;
	const orgId =
		propOrgId || dashboard?.organization?.id || (auth as unknown as { organizationId?: string })?.organizationId || "";

	const [rules, setRules] = useState<ProcedureMaterialRuleViewItem[]>([]);
	const [warehouseItems, setWarehouseItems] = useState<InventoryItem[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const [isSeeding, setIsSeeding] = useState(false);
	const [searchQuery, setSearchQuery] = useState("");
	const [selectedCategory, setSelectedCategory] = useState<string>("all");

	// Модальное окно создания / редактирования правила
	const [modalState, setModalState] = useState<{
		isOpen: boolean;
		ruleId?: string;
		serviceId: string;
		inventoryItemId: string;
		quantityToDeduct: string;
	} | null>(null);

	const [isSaving, setIsSaving] = useState(false);
	const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

	const getHeaders = useCallback(
		(extra?: Record<string, string>) => {
			const headers =
				auth && typeof auth.denteClinicalReadHeaders === "function"
					? auth.denteClinicalReadHeaders(extra)
					: extra || {};
			return headers;
		},
		[auth],
	);

	// Загрузка всех правил клиники
	const fetchAllRules = useCallback(async () => {
		if (!orgId) return;
		try {
			setIsLoading(true);
			const [rulesRes, itemsRes] = await Promise.all([
				fetch(`/api/inventory/${orgId}/rules`, { headers: getHeaders() }),
				fetch(`/api/inventory/${orgId}`, { headers: getHeaders() }),
			]);

			if (rulesRes.ok) {
				const data = await rulesRes.json();
				setRules(Array.isArray(data) ? data : []);
			}

			if (itemsRes.ok) {
				const itemsData = await itemsRes.json();
				const rawItems = Array.isArray(itemsData)
					? itemsData
					: itemsData?.items && Array.isArray(itemsData.items)
						? itemsData.items
						: [];
				setWarehouseItems(
					rawItems.map((r: Record<string, unknown>) => ({
						id: String(r.id ?? ""),
						name: String(r.name ?? ""),
						stockQuantity: Number(r.stockQuantity ?? r.currentQty ?? 0),
						criticalThreshold: Number(r.criticalThreshold ?? 0),
						unitCostRub: String(r.unitCostRub ?? "0"),
						updatedAt: String(r.updatedAt ?? ""),
						unit: String(r.unit ?? "шт."),
					})),
				);
			}
		} catch (e) {
			logger.error("Ошибка загрузки техкарт 804н", e);
			showToast("Ошибка загрузки техкарт", "error");
		} finally {
			setIsLoading(false);
		}
	}, [orgId, getHeaders]);

	useEffect(() => {
		fetchAllRules();
	}, [fetchAllRules]);

	// Загрузка типовых клинических норм 804н
	const handleSeedDefaults = async () => {
		if (!orgId || isSeeding) return;
		try {
			setIsSeeding(true);
			const res = await fetch(`/api/inventory/${orgId}/rules/seed-defaults`, {
				method: "POST",
				headers: getHeaders({ "Content-Type": "application/json" }),
			});
			if (res.ok) {
				const data = await res.json();
				showToast(
					data.message || "Типовые нормы 804н успешно засеяны",
					"success",
				);
				await fetchAllRules();
			} else {
				showToast("Ошибка при засеве норм 804н", "error");
			}
		} catch (e) {
			logger.error("Ошибка сидирования норм 804н", e);
			showToast("Системная ошибка", "error");
		} finally {
			setIsSeeding(false);
		}
	};

	// Сохранение правила (POST)
	const handleSaveRule = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!modalState || !orgId || isSaving) return;

		const qty = parseFloat(modalState.quantityToDeduct);
		if (!Number.isFinite(qty) || qty <= 0) {
			showToast("Введите корректное количество (> 0)", "error");
			return;
		}

		try {
			setIsSaving(true);
			const res = await fetch(`/api/inventory/${orgId}/rules`, {
				method: "POST",
				headers: getHeaders({ "Content-Type": "application/json" }),
				body: JSON.stringify({
					serviceId: modalState.serviceId,
					inventoryItemId: modalState.inventoryItemId,
					quantityToDeduct: qty,
				}),
			});

			if (res.ok) {
				showToast("Норма расхода сохранена", "success");
				setModalState(null);
				await fetchAllRules();
			} else {
				showToast("Ошибка сохранения нормы", "error");
			}
		} catch (e) {
			logger.error("Ошибка сохранения нормы", e);
			showToast("Системная ошибка", "error");
		} finally {
			setIsSaving(false);
		}
	};

	// Удаление правила
	const handleDeleteRule = async (ruleId: string) => {
		if (!orgId) return;
		try {
			const res = await fetch(`/api/inventory/${orgId}/rules/${ruleId}`, {
				method: "DELETE",
				headers: getHeaders(),
			});
			if (res.ok) {
				showToast("Норма расхода удалена", "success");
				setConfirmDeleteId(null);
				await fetchAllRules();
			} else {
				showToast("Ошибка удаления", "error");
			}
		} catch (e) {
			logger.error("Ошибка удаления нормы", e);
			showToast("Системная ошибка", "error");
		}
	};

	// Группировка правил по услугам
	const groupedServices = useMemo(() => {
		const map = new Map<
			string,
			{
				serviceId: string;
				serviceCode: string;
				serviceTitle: string;
				serviceCategory: string;
				specialty: string;
				rules: ProcedureMaterialRuleViewItem[];
				totalCostRub: number;
				hasDeficit: boolean;
			}
		>();

		for (const r of rules) {
			const sId = r.serviceId;
			let group = map.get(sId);
			if (!group) {
				group = {
					serviceId: sId,
					serviceCode: r.serviceCode || "804н",
					serviceTitle: r.serviceTitle || "Медицинская услуга",
					serviceCategory: r.serviceCategory || "therapy",
					specialty: r.specialty || "therapist",
					rules: [],
					totalCostRub: 0,
					hasDeficit: false,
				};
				map.set(sId, group);
			}
			group.rules.push(r);

			const qty = Number(r.quantityToDeduct ?? 0);
			const unitCost = Number(r.unitCostRub ?? 0);
			group.totalCostRub += qty * unitCost;

			const stock = Number(r.stockQuantity ?? 0);
			if (stock < qty) {
				group.hasDeficit = true;
			}
		}

		let list = Array.from(map.values());

		// Фильтрация по поиску
		if (searchQuery.trim()) {
			const q = searchQuery.toLowerCase().trim();
			list = list.filter(
				(g) =>
					g.serviceCode.toLowerCase().includes(q) ||
					g.serviceTitle.toLowerCase().includes(q) ||
					g.rules.some((r) => r.itemName.toLowerCase().includes(q)),
			);
		}

		// Фильтрация по категории
		if (selectedCategory !== "all") {
			list = list.filter((g) => g.serviceCategory === selectedCategory);
		}

		return list;
	}, [rules, searchQuery, selectedCategory]);

	// Общая статистика
	const stats = useMemo(() => {
		const totalServices = groupedServices.length;
		const totalRules = rules.length;
		const totalDeficitServices = groupedServices.filter((g) => g.hasDeficit).length;
		const avgCost =
			totalServices > 0
				? groupedServices.reduce((sum, g) => sum + g.totalCostRub, 0) /
					totalServices
				: 0;

		return {
			totalServices,
			totalRules,
			totalDeficitServices,
			avgCostFormatted: `${avgCost.toLocaleString("ru-RU", { maximumFractionDigits: 2 })} ₽`,
		};
	}, [groupedServices, rules]);

	// Список доступных услуг для выбора в модалке
	const availableServices = useMemo(() => {
		const servicesFromDashboard = dashboard?.services || [];
		if (servicesFromDashboard.length > 0) {
			return servicesFromDashboard.map((s: Record<string, unknown>) => ({
				id: String(s.id ?? ""),
				code: String(s.code ?? ""),
				title: String(s.title ?? s.name ?? "Услуга"),
				category: String(s.category ?? "therapy"),
			}));
		}
		// Fallback: из уже известных в правилах
		const distinct = new Map<string, { id: string; code: string; title: string; category: string }>();
		for (const r of rules) {
			if (r.serviceId && !distinct.has(r.serviceId)) {
				distinct.set(r.serviceId, {
					id: r.serviceId,
					code: r.serviceCode || "",
					title: r.serviceTitle || "Услуга",
					category: r.serviceCategory || "therapy",
				});
			}
		}
		return Array.from(distinct.values());
	}, [dashboard, rules]);

	return (
		<div className="material-boms-container">
			{/* HEADER & ACTIONS */}
			<div className="material-boms-header">
				<div className="material-boms-header-info">
					<div className="material-boms-header-icon">
						<Database size={24} />
					</div>
					<div>
						<h2 className="material-boms-title">
							Технологические карты расхода материалов (Приказ 804н)
						</h2>
						<p className="material-boms-subtitle">
							Нормы автоматического списания расходников со склада при закрытии и подписании медкарты 043/у
						</p>
					</div>
				</div>

				<div className="material-boms-header-actions">
					<button
						type="button"
						className="material-boms-btn material-boms-btn-secondary"
						onClick={fetchAllRules}
						disabled={isLoading}
						title="Обновить данные"
					>
						<RefreshCw size={16} className={isLoading ? "animate-spin" : ""} />
						Обновить
					</button>

					<button
						type="button"
						className="material-boms-btn material-boms-btn-secondary"
						onClick={handleSeedDefaults}
						disabled={isSeeding}
						title="Загрузить типовые клинические нормы Минздрава"
					>
						<Sparkles size={16} />
						{isSeeding ? "Засеваем..." : "Загрузить типовые нормы 804н"}
					</button>

					<button
						type="button"
						className="material-boms-btn material-boms-btn-primary"
						onClick={() =>
							setModalState({
								isOpen: true,
								serviceId: availableServices[0]?.id || "",
								inventoryItemId: warehouseItems[0]?.id || "",
								quantityToDeduct: "1",
							})
						}
					>
						<Plus size={16} />
						Добавить норму
					</button>
				</div>
			</div>

			{/* STATS METRICS */}
			<div className="material-boms-stats-row">
				<div className="material-boms-stat-card">
					<span className="material-boms-stat-label">Охвачено услуг 804н</span>
					<span className="material-boms-stat-value">{stats.totalServices}</span>
					<span className="material-boms-stat-desc">с настроенными техкартами</span>
				</div>

				<div className="material-boms-stat-card">
					<span className="material-boms-stat-label">Всего активных норм</span>
					<span className="material-boms-stat-value">{stats.totalRules}</span>
					<span className="material-boms-stat-desc">привязок материалов</span>
				</div>

				<div className="material-boms-stat-card">
					<span className="material-boms-stat-label">Средняя себестоимость</span>
					<span className="material-boms-stat-value">{stats.avgCostFormatted}</span>
					<span className="material-boms-stat-desc">расходников на процедуру</span>
				</div>

				<div className="material-boms-stat-card">
					<span className="material-boms-stat-label">Дефицит на складе</span>
					<span
						className="material-boms-stat-value"
						style={{ color: stats.totalDeficitServices > 0 ? "var(--bad-fg, #dc2626)" : "var(--ok-fg, #059669)" }}
					>
						{stats.totalDeficitServices === 0 ? "В норме" : `${stats.totalDeficitServices} услуг`}
					</span>
					<span className="material-boms-stat-desc">
						{stats.totalDeficitServices === 0 ? "Все материалы в наличии" : "Требуется пополнение запасов"}
					</span>
				</div>
			</div>

			{/* FILTER BAR */}
			<div className="material-boms-filter-bar">
				<div className="material-boms-search-wrap">
					<Search size={18} color="var(--muted)" />
					<input
						type="text"
						className="material-boms-search-input"
						placeholder="Поиск по коду 804н (напр. A16.07.002), названию услуги или материалу..."
						value={searchQuery}
						onChange={(e) => setSearchQuery(e.target.value)}
					/>
					{searchQuery && (
						<button
							type="button"
							style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted)" }}
							onClick={() => setSearchQuery("")}
						>
							<X size={16} />
						</button>
					)}
				</div>

				<div className="material-boms-category-tabs">
					{[
						{ id: "all", label: "Все услуги" },
						{ id: "therapy", label: "Терапия" },
						{ id: "surgery", label: "Хирургия" },
						{ id: "hygiene", label: "Гигиена" },
						{ id: "orthodontics", label: "Ортодонтия" },
					].map((tab) => (
						<button
							key={tab.id}
							type="button"
							className={`material-boms-cat-btn ${selectedCategory === tab.id ? "active" : ""}`}
							onClick={() => setSelectedCategory(tab.id)}
						>
							{tab.label}
						</button>
					))}
				</div>
			</div>

			{/* PROCEDURES AND RULES LIST */}
			{isLoading ? (
				<div style={{ padding: 40, textAlign: "center", color: "var(--muted)" }}>
					<RefreshCw size={24} className="animate-spin" style={{ margin: "0 auto 12px auto" }} />
					Загрузка технологических карт расхода материалов...
				</div>
			) : groupedServices.length === 0 ? (
				<div
					style={{
						padding: 48,
						textAlign: "center",
						background: "var(--paper)",
						border: "1px solid var(--line)",
						borderRadius: 16,
					}}
				>
					<Package size={48} color="var(--muted)" style={{ margin: "0 auto 16px auto", opacity: 0.5 }} />
					<h3 style={{ margin: "0 0 8px 0", fontSize: 17, color: "var(--ink)" }}>
						{searchQuery ? "По вашему запросу ничего не найдено" : "Технологические карты 804н ещё не настроены"}
					</h3>
					<p style={{ margin: "0 0 20px 0", color: "var(--muted)", fontSize: 14, maxWidth: 500, marginLeft: "auto", marginRight: "auto" }}>
						{searchQuery
							? "Попробуйте изменить поисковый запрос или сбросить фильтры."
							: "Нажмите «Загрузить типовые нормы 804н», чтобы за 1 клик подключить готовые стандарты Минздрава по терапии, эндодонтии, хирургии и гигиене."}
					</p>
					{!searchQuery && (
						<button
							type="button"
							className="material-boms-btn material-boms-btn-primary"
							onClick={handleSeedDefaults}
							disabled={isSeeding}
						>
							<Sparkles size={16} />
							Загрузить типовые нормы 804н
						</button>
					)}
				</div>
			) : (
				<div className="material-boms-procedures-list">
					{groupedServices.map((serviceGroup) => (
						<div key={serviceGroup.serviceId} className="material-boms-service-card">
							<div className="material-boms-service-header">
								<div className="material-boms-service-info">
									<span className="material-boms-service-code">
										{serviceGroup.serviceCode}
									</span>
									<h3 className="material-boms-service-title">
										{serviceGroup.serviceTitle}
									</h3>
								</div>

								<div className="material-boms-service-cost">
									<span className="material-boms-prime-cost">
										Себестоимость материалов:{" "}
										<strong>
											{serviceGroup.totalCostRub.toLocaleString("ru-RU", {
												maximumFractionDigits: 2,
											})}{" "}
											₽
										</strong>
									</span>

									<button
										type="button"
										className="material-boms-btn material-boms-btn-secondary"
										style={{ minHeight: 36, padding: "6px 12px", fontSize: 13 }}
										onClick={() =>
											setModalState({
												isOpen: true,
												serviceId: serviceGroup.serviceId,
												inventoryItemId: warehouseItems[0]?.id || "",
												quantityToDeduct: "1",
											})
										}
									>
										<Plus size={14} />
										Добавить материал
									</button>
								</div>
							</div>

							<div className="material-boms-table-wrap">
								<table className="material-boms-table">
									<thead>
										<tr>
											<th>Расходный материал</th>
											<th>Норма списания</th>
											<th>Ед. изм.</th>
											<th>Цена ед.</th>
											<th>Стоимость нормы</th>
											<th>Остаток на складе</th>
											<th style={{ textAlign: "right" }}>Действия</th>
										</tr>
									</thead>
									<tbody>
										{serviceGroup.rules.map((rule) => {
											const qty = Number(rule.quantityToDeduct ?? 0);
											const unitPrice = Number(rule.unitCostRub ?? 0);
											const lineCost = qty * unitPrice;
											const stock = Number(rule.stockQuantity ?? 0);
											const isDeficit = stock < qty;
											const isLow = stock <= (Number(rule.criticalThreshold ?? 0) || 5);

											return (
												<tr key={rule.id}>
													<td>
														<strong style={{ color: "var(--ink)" }}>{rule.itemName}</strong>
													</td>
													<td>
														<span style={{ fontWeight: 700, color: "var(--teal-dark, #0f766e)" }}>
															{qty.toLocaleString("ru-RU", { maximumFractionDigits: 4 })}
														</span>
													</td>
													<td>{rule.unit || "шт."}</td>
													<td>
														{unitPrice > 0
															? `${unitPrice.toLocaleString("ru-RU", { maximumFractionDigits: 2 })} ₽`
															: "—"}
													</td>
													<td>
														{lineCost > 0
															? `${lineCost.toLocaleString("ru-RU", { maximumFractionDigits: 2 })} ₽`
															: "—"}
													</td>
													<td>
														<span
															className={`material-boms-stock-badge ${
																isDeficit
																	? "material-boms-stock-crit"
																	: isLow
																		? "material-boms-stock-warn"
																		: "material-boms-stock-ok"
															}`}
														>
															{isDeficit ? (
																<AlertTriangle size={12} />
															) : (
																<CheckCircle2 size={12} />
															)}
															{stock.toLocaleString("ru-RU", { maximumFractionDigits: 3 })}{" "}
															{rule.unit || "шт."}
														</span>
													</td>
													<td style={{ textAlign: "right" }}>
														<div style={{ display: "inline-flex", gap: 6 }}>
															<button
																type="button"
																className="material-boms-icon-btn"
																title="Изменить количество"
																onClick={() =>
																	setModalState({
																		isOpen: true,
																		ruleId: rule.id,
																		serviceId: rule.serviceId,
																		inventoryItemId: rule.inventoryItemId,
																		quantityToDeduct: String(rule.quantityToDeduct),
																	})
																}
															>
																<Edit3 size={15} />
															</button>
															<button
																type="button"
																className="material-boms-icon-btn material-boms-icon-btn-danger"
																title="Удалить норму"
																onClick={() => setConfirmDeleteId(rule.id)}
															>
																<Trash2 size={15} />
															</button>
														</div>
													</td>
												</tr>
											);
										})}
									</tbody>
								</table>
							</div>
						</div>
					))}
				</div>
			)}

			{/* MODAL: ADD / EDIT RULE */}
			{modalState?.isOpen && (
				<div className="material-boms-modal-backdrop">
					<div className="material-boms-modal">
						<div className="material-boms-modal-header">
							<h3 className="material-boms-modal-title">
								{modalState.ruleId ? "Изменить норму списания" : "Привязать материал к услуге 804н"}
							</h3>
							<button
								type="button"
								style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted)" }}
								onClick={() => setModalState(null)}
							>
								<X size={20} />
							</button>
						</div>

						<form onSubmit={handleSaveRule}>
							<div className="material-boms-modal-body">
								<div className="material-boms-form-group">
									<label className="material-boms-form-label">Услуга приказа 804н *</label>
									<select
										className="material-boms-form-select"
										value={modalState.serviceId}
										onChange={(e) =>
											setModalState({ ...modalState, serviceId: e.target.value })
										}
										required
									>
										{availableServices.map((s) => (
											<option key={s.id} value={s.id}>
												{s.code ? `[${s.code}] ` : ""}{s.title}
											</option>
										))}
									</select>
								</div>

								<div className="material-boms-form-group">
									<label className="material-boms-form-label">Складской материал *</label>
									<select
										className="material-boms-form-select"
										value={modalState.inventoryItemId}
										onChange={(e) =>
											setModalState({
												...modalState,
												inventoryItemId: e.target.value,
											})
										}
										required
									>
										{warehouseItems.map((it) => (
											<option key={it.id} value={it.id}>
												{it.name} (остаток: {it.stockQuantity} {it.unit || "шт."}, {Number(it.unitCostRub || 0)} ₽)
											</option>
										))}
									</select>
								</div>

								<div className="material-boms-form-group">
									<label className="material-boms-form-label">
										Норма расхода на 1 услугу (в граммах, мл или штуках) *
									</label>
									<input
										type="number"
										step="0.0001"
										min="0.0001"
										className="material-boms-form-input"
										value={modalState.quantityToDeduct}
										onChange={(e) =>
											setModalState({
												...modalState,
												quantityToDeduct: e.target.value,
											})
										}
										placeholder="например: 0.35"
										required
									/>

									{/* Quick Chips */}
									<div className="material-boms-chips-row">
										{[
											{ label: "0.1 г/мл", val: "0.1" },
											{ label: "0.35 г (пломба)", val: "0.35" },
											{ label: "0.5 мл", val: "0.5" },
											{ label: "1 шт/карп.", val: "1" },
											{ label: "2 шт", val: "2" },
											{ label: "15 мл (ирригация)", val: "15" },
											{ label: "25 г (Air-Flow)", val: "25" },
										].map((chip) => (
											<button
												key={chip.label}
												type="button"
												className="material-boms-chip"
												onClick={() =>
													setModalState({
														...modalState,
														quantityToDeduct: chip.val,
													})
												}
											>
												+{chip.label}
											</button>
										))}
									</div>
								</div>
							</div>

							<div className="material-boms-modal-footer">
								<button
									type="button"
									className="material-boms-btn material-boms-btn-secondary"
									onClick={() => setModalState(null)}
								>
									Отмена
								</button>
								<button
									type="submit"
									className="material-boms-btn material-boms-btn-primary"
									disabled={isSaving}
								>
									{isSaving ? "Сохраняем..." : "Сохранить норму"}
								</button>
							</div>
						</form>
					</div>
				</div>
			)}

			{/* CONFIRM DELETE MODAL */}
			{confirmDeleteId && (
				<div className="material-boms-modal-backdrop">
					<div className="material-boms-modal" style={{ maxWidth: 420 }}>
						<div className="material-boms-modal-header">
							<h3 className="material-boms-modal-title">Удалить норму расхода?</h3>
							<button
								type="button"
								style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted)" }}
								onClick={() => setConfirmDeleteId(null)}
							>
								<X size={20} />
							</button>
						</div>
						<div className="material-boms-modal-body">
							<p style={{ margin: 0, fontSize: 14, color: "var(--ink)" }}>
								Вы уверены, что хотите удалить эту норму списания? При закрытии приёма данный материал больше не будет автоматически списываться со склада.
							</p>
						</div>
						<div className="material-boms-modal-footer">
							<button
								type="button"
								className="material-boms-btn material-boms-btn-secondary"
								onClick={() => setConfirmDeleteId(null)}
							>
								Отмена
							</button>
							<button
								type="button"
								className="material-boms-btn material-boms-btn-primary"
								style={{ background: "var(--bad-fg, #dc2626)" }}
								onClick={() => handleDeleteRule(confirmDeleteId)}
							>
								Удалить
							</button>
						</div>
					</div>
				</div>
			)}
		</div>
	);
}
