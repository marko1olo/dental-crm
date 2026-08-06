import {
	AlertTriangle,
	ArrowDownToLine,
	ArrowUpFromLine,
	Edit2,
	Package,
	Plus,
	Search,
	Trash2,
	TrendingUp,
	X,
} from "lucide-react";
import type React from "react";
import { useEffect, useMemo, useState } from "react";
import { money } from "../AppHelpers";
import { showToast } from "./GlobalToast";
import { InventoryConfirmDialog } from "./inventory/InventoryConfirmDialog";
import type { InventoryItem } from "./inventory/useInventoryLogic";
import { useInventoryLogic } from "./inventory/useInventoryLogic";

/**
 * Как показать срок годности расходника.
 *
 * Три состояния, а не два: просроченный материал использовать нельзя вообще,
 * истекающий надо успеть израсходовать, остальное просто дата. Раньше первые
 * два не различались и красились цветом var(--tomato) — токена с таким именем
 * в проекте нет, так что предупреждение не было видно.
 *
 * Дни считаются по календарным датам, а не по разнице в миллисекундах: срок
 * указан днём, и «осталось 0 дней» должно значить «истекает сегодня», а не
 * зависеть от времени суток.
 */
function expirationState(isoDate: string): {
	label: string;
	className: string;
} {
	const readable = new Date(`${isoDate}T00:00:00`).toLocaleDateString("ru-RU");
	const startOfDay = (value: Date) =>
		Date.UTC(value.getFullYear(), value.getMonth(), value.getDate());
	const expires = new Date(`${isoDate}T00:00:00`);
	const daysLeft = Math.round(
		(startOfDay(expires) - startOfDay(new Date())) / 86400000,
	);

	if (daysLeft < 0) {
		return {
			label: `Просрочен с ${readable}`,
			className: "inventory-expiry-expired",
		};
	}
	if (daysLeft === 0) {
		return {
			label: `Истекает сегодня, ${readable}`,
			className: "inventory-expiry-expired",
		};
	}
	if (daysLeft <= 30) {
		return {
			label: `Годен до ${readable} — ${daysLabel(daysLeft)}`,
			className: "inventory-expiry-soon",
		};
	}
	return { label: `Годен до ${readable}`, className: "" };
}

/**
 * Количество штук по-человечески.
 *
 * Правила списания приходят с сервера не разобранными (rulesList объявлен any[]),
 * а колонки quantity_to_deduct и stock_quantity объявлены numeric без mode
 * "number" — drizzle отдаёт их СТРОКАМИ прямо из базы, вместе с нулями до
 * заявленной точности. На экране это выглядело как «Списание: 1.0000 шт. |
 * Текущий остаток: 10.000 шт.»: машинная запись с точкой вместо запятой, которую
 * кладовщику читать незачем.
 *
 * toLocaleString здесь уместен именно потому, что он отбрасывает хвостовые нули:
 * «1.0000» становится «1», «1.5000» — «1,5». Для денег так делать нельзя (там
 * пропадали бы копейки, для них есть money()), а для штук это ровно то, что
 * человек пишет от руки.
 */
function quantityLabel(value: unknown): string {
	const parsed = Number(value);
	if (!Number.isFinite(parsed)) return "—";
	return parsed.toLocaleString("ru-RU", { maximumFractionDigits: 3 });
}

/** Русское склонение дней: 1 день, 2 дня, 5 дней. */
function daysLabel(count: number): string {
	const lastTwo = count % 100;
	const last = count % 10;
	if (lastTwo >= 11 && lastTwo <= 14) return `осталось ${count} дней`;
	if (last === 1) return `остался ${count} день`;
	if (last >= 2 && last <= 4) return `осталось ${count} дня`;
	return `осталось ${count} дней`;
}

export const InventoryView: React.FC<{ organizationId: string }> = ({
	organizationId,
}) => {
	const inventory = useInventoryLogic(organizationId);
	const {
		items,
		isLoading,
		loadError,
		auth,
		dashboard,
		scannedBarcode,
		isScannerActive,
		activeSubTab,
		setActiveSubTab,
		selectedServiceId,
		selectService,
		rulesList,
		isLoadingRules,
		rulesError,
		selectedInventoryItemId,
		setSelectedInventoryItemId,
		quantityToDeduct,
		setQuantityToDeduct,
		fetchRules,
		handleAddRule,
		handleDeleteRule,
		searchQuery,
		setSearchQuery,
		showModal,
		setShowModal,
		editingItem,
		setEditingItem,
		formData,
		setFormData,
		confirmDialog,
		setConfirmDialog,
		adjustingItem,
		setAdjustingItem,
		adjustAmount,
		setAdjustAmount,
		adjustType,
		setAdjustType,
		isAdjustingStock,
		isSavingItem,
		isSavingRule,
		fetchItems,
		openAddModal,
		openEditModal,
		handleSaveItem,
		handleDeleteItem,
		handleAdjustStock,
		filteredItems,
		totalValue,
		lowStockCount,
		totalItems,
	} = inventory;

	/*
	 * ЭТО ЗНАЧЕНИЯ CSS, А НЕ ИМЕНА КЛАССОВ.
	 *
	 * Здесь стояло:
	 *   const paperBg = "bg-white dark:bg-slate-900";
	 *   const borderColor = "border-slate-200 dark:border-slate-800";
	 * и эти строки подставлялись в inline-стили как значения свойств —
	 * `style={{ background: paperBg, border: `1px solid ${borderColor}` }}`,
	 * 46 вхождений на весь экран. Имя класса Tailwind значением цвета не
	 * является: браузер отбрасывает такое объявление целиком и берёт начальное
	 * значение. Ошибки при этом нет ни в сборке, ни в консоли.
	 *
	 * Что было видно на экране (проверено снимком раздела «Склад»): ни одной
	 * карточки. Прозрачный фон, нулевая граница, плитки «Позиций» и «В дефиците»
	 * висят в воздухе, таблица без контейнера. Пока склад открывался вкладкой
	 * настроек, рамку давала панель настроек вокруг, и подмена не бросалась в
	 * глаза — на своём разделе стало видно сразу.
	 *
	 * Токены темы, а не hex: значения обязаны различаться в светлой, тёмной и
	 * ночной теме, и подставлять цвет по месту нельзя (см. .agents/UI_STANDARDS.md).
	 */
	const paperBg = "var(--paper)";
	const paperSoftBg = "var(--paper-soft)";
	const borderColor = "var(--line)";

	const renderRulesTab = () => {
		const serviceCatalog = dashboard?.serviceCatalog || [];

		return (
			<div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
				{/* SELECT SERVICE PANEL */}
				<div
					style={{
						background: paperBg,
						border: `1px solid ${borderColor}`,
						padding: 20,
						borderRadius: 16,
						display: "flex",
						flexDirection: "column",
						gap: 12,
					}}
				>
					<h3
						style={{
							margin: 0,
							fontSize: 16,
							fontWeight: 600,
							color: "var(--ink)",
						}}
					>
						🛠️ Выберите услугу для настройки правил списания
					</h3>
					{/*
					  Смена услуги очищает форму под ней: набранные для прошлой услуги
					  материал и количество оставались заряженными и уходили в новую
					  услугу одним нажатием.
					*/}
					<select
						value={selectedServiceId}
						onChange={(e) => selectService(e.target.value)}
						style={{
							padding: "10px 12px",
							borderRadius: 8,
							border: `1px solid ${borderColor}`,
							background: paperSoftBg,
							color: "var(--ink)",
							outline: "none",
							fontSize: 14,
						}}
					>
						<option value="">-- Выберите услугу --</option>
						{serviceCatalog.map((s: any) => (
							<option key={s.id} value={s.id}>
								{/*
							  Цена через общую money(): в прайсе теперь копейки, и
							  «{basePriceRub} ₽» показывало бы «1500.5 ₽» с точкой.
							*/}
								[{s.code || "Без кода"}] {s.title} ({money(s.basePriceRub)})
							</option>
						))}
					</select>
				</div>

				{selectedServiceId && (
					<div
						style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}
					>
						{/* ADD RULE PANEL */}
						<form
							onSubmit={handleAddRule}
							style={{
								background: paperBg,
								border: `1px solid ${borderColor}`,
								padding: 20,
								borderRadius: 16,
								display: "flex",
								flexDirection: "column",
								gap: 16,
							}}
						>
							<h4
								style={{
									margin: 0,
									fontSize: 15,
									fontWeight: 600,
									color: "var(--ink)",
								}}
							>
								Добавить материал для списания
							</h4>
							<div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
								<label
									style={{
										fontSize: 12,
										color: "var(--muted)",
										fontWeight: 500,
									}}
								>
									Расходный материал со склада
								</label>
								<select
									required
									value={selectedInventoryItemId}
									onChange={(e) => setSelectedInventoryItemId(e.target.value)}
									style={{
										padding: "10px 12px",
										borderRadius: 8,
										border: `1px solid ${borderColor}`,
										background: paperSoftBg,
										color: "var(--ink)",
										outline: "none",
										fontSize: 14,
									}}
								>
									<option value="">-- Выберите материал --</option>
									{items.map((i) => (
										<option key={i.id} value={i.id}>
											{i.name} (остаток: {i.stockQuantity} шт.)
										</option>
									))}
								</select>
							</div>
							<div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
								<label
									style={{
										fontSize: 12,
										color: "var(--muted)",
										fontWeight: 500,
									}}
								>
									Количество для списания
								</label>
								<input
									type="number"
									min="1"
									required
									value={quantityToDeduct}
									onChange={(e) => setQuantityToDeduct(e.target.value)}
									style={{
										padding: "10px 12px",
										borderRadius: 8,
										border: `1px solid ${borderColor}`,
										background: paperSoftBg,
										color: "var(--ink)",
										outline: "none",
										fontSize: 14,
									}}
								/>
							</div>
							{/*
							  Кнопка запирается на время запроса: правило создаётся через
							  POST, и второе нажатие давало второе такое же правило на ту же
							  услугу — материал списывался бы дважды за каждый приём.
							*/}
							<button
								type="submit"
								className="primary-button"
								disabled={isSavingRule}
								style={{
									alignSelf: "flex-start",
									marginTop: 8,
									opacity: isSavingRule ? 0.6 : 1,
									cursor: isSavingRule ? "wait" : "pointer",
								}}
							>
								<Plus size={16} />{" "}
								{isSavingRule
									? "Сохраняем..."
									: "Добавить материал в расходники"}
							</button>
						</form>

						{/* CURRENT RULES LIST PANEL */}
						<div
							style={{
								background: paperBg,
								border: `1px solid ${borderColor}`,
								padding: 20,
								borderRadius: 16,
								display: "flex",
								flexDirection: "column",
								gap: 16,
							}}
						>
							<h4
								style={{
									margin: 0,
									fontSize: 15,
									fontWeight: 600,
									color: "var(--ink)",
								}}
							>
								Привязанные расходники
							</h4>

							{/*
							  Три состояния, а не два: загрузка, отказ сервера, честная пустота.

							  При упавшем запросе список правил остаётся пустым, и здесь
							  печаталось «списание не настроено, материалы списываться не
							  будут» — утверждение о том, чего экран не знает. Администратор
							  верил и заводил правило заново (второе такое же правило спишет
							  материал дважды за приём) либо закупал материал вручную, считая,
							  что склад его не тронет.
							*/}
							{isLoadingRules ? (
								<p style={{ color: "var(--muted)", fontSize: 13 }}>
									Загрузка правил списания...
								</p>
							) : rulesError ? (
								<div
									style={{
										display: "flex",
										flexDirection: "column",
										alignItems: "flex-start",
										gap: 10,
										padding: "12px 14px",
										borderRadius: 8,
										background: "rgba(239,68,68,0.12)",
										border: "1px solid var(--tomato)",
									}}
								>
									<span
										style={{
											color: "var(--ink)",
											fontSize: 13,
											lineHeight: 1.45,
										}}
									>
										{rulesError}
									</span>
									<button
										type="button"
										onClick={() => fetchRules(selectedServiceId)}
										style={{
											padding: "8px 16px",
											borderRadius: 8,
											border: `1px solid ${borderColor}`,
											background: paperSoftBg,
											color: "var(--ink)",
											fontWeight: 600,
											fontSize: 13,
											cursor: "pointer",
										}}
									>
										Повторить
									</button>
								</div>
							) : rulesList.length === 0 ? (
								<p style={{ color: "var(--muted)", fontSize: 13 }}>
									Для этой услуги пока не настроено автоматическое списание
									материалов. При завершении приёма материалы списываться не
									будут.
								</p>
							) : (
								<div
									style={{ display: "flex", flexDirection: "column", gap: 8 }}
								>
									{rulesList.map((rule) => (
										<div
											key={rule.id}
											style={{
												display: "flex",
												alignItems: "center",
												justifyContent: "space-between",
												padding: "10px 14px",
												borderRadius: 8,
												background: paperSoftBg,
												border: `1px solid ${borderColor}`,
											}}
										>
											<div style={{ flex: 1 }}>
												<strong style={{ fontSize: 14, color: "var(--ink)" }}>
													{rule.itemName}
												</strong>
												<div
													style={{
														fontSize: 12,
														color: "var(--muted)",
														marginTop: 2,
													}}
												>
													Списание: {quantityLabel(rule.quantityToDeduct)} шт.,
													текущий остаток: {quantityLabel(rule.stockQuantity)}{" "}
													шт.
												</div>
												{/*
												  Правило, которое не сработает, надо назвать вслух.

												  Строка показывала расход рядом с остатком и молчала,
												  даже когда списывать уже нечего: правило выглядело
												  рабочим. Последствие проверено по коду сервера
												  (apps/api/src/routes/diary.ts): при нехватке остатка
												  списание не урезается, а бросает InsufficientStock —
												  вся транзакция подписания откатывается, приём НЕ
												  подписывается. Врач узнаёт об этом в конце приёма,
												  когда исправлять уже некогда, поэтому предупреждение
												  стоит здесь, при настройке.

												  Сравниваем через Number: обе величины приходят из базы
												  СТРОКАМИ (numeric без mode "number"), а у строк «10»
												  меньше «3» — сравнение по тексту врало бы ровно на
												  опасных числах.

												  Признак необходимый, но не достаточный: сервер требует
												  quantityToDeduct * количество услуги в приёме, а
												  количество здесь неизвестно. При количестве услуги
												  больше единицы подписание может отказать и без этого
												  предупреждения.
												*/}
												{Number(rule.quantityToDeduct) >
												Number(rule.stockQuantity) ? (
													<div
														style={{
															fontSize: 12,
															color: "var(--tomato)",
															marginTop: 4,
															fontWeight: 600,
														}}
													>
														Остатка не хватит: приём с этой услугой не
														подпишется, пока материал не оприходован.
													</div>
												) : null}
											</div>
											<button
												type="button"
												onClick={() => handleDeleteRule(rule.id)}
												style={{
													background: "transparent",
													border: "none",
													color: "var(--tomato, #ef4444)",
													cursor: "pointer",
													padding: 4,
													display: "flex",
													alignItems: "center",
													justifyContent: "center",
												}}
											>
												<Trash2 size={16} />
											</button>
										</div>
									))}
								</div>
							)}
						</div>
					</div>
				)}
			</div>
		);
	};

	/*
	 * Предпросмотр движения остатка — честный, без прикрытия нулём.
	 *
	 * БЫЛО: строка «Будет: …» считалась через Math.max(0, …). Списание 50 штук
	 * при остатке 10 рисовало «Будет: 0 шт.» — ровно как законное списание в ноль,
	 * и кладовщик нажимал «Списать».
	 *
	 * Уточнение по проверенному коду сервера (apps/api/src/routes/inventory.ts,
	 * PATCH .../stock): он берёт Math.max(-currentStock, adjustment) и ТИХО урезает
	 * списание до остатка, отвечая успехом. Значит итог на экране совпадал с базой
	 * (ноль), а исчезало другое — сам факт, что 40 штук из 50 не списаны. «Остаток
	 * изменён», отчёт по расходу меньше, чем человек списывал, и спорить не с чем.
	 * Поэтому расхождение надо показать ДО записи: либо количество набрано неверно,
	 * либо остаток на складе неверный, и то и другое разбирают до нажатия.
	 */
	const adjustAmountNumber = Number.parseInt(adjustAmount, 10);
	const adjustHasAmount =
		Number.isFinite(adjustAmountNumber) && adjustAmountNumber > 0;
	const adjustDelta =
		(adjustType === "in" ? 1 : -1) * (adjustHasAmount ? adjustAmountNumber : 0);
	const adjustResultQuantity = adjustingItem
		? adjustingItem.stockQuantity + adjustDelta
		: 0;
	const adjustExceedsStock = Boolean(
		adjustingItem && adjustType === "out" && adjustResultQuantity < 0,
	);

	if (isLoading && items.length === 0) {
		return (
			<div
				style={{
					display: "flex",
					alignItems: "center",
					justifyContent: "center",
					height: "100%",
					color: "var(--muted)",
					gap: 12,
				}}
			>
				<Package size={20} />
				Загрузка склада...
			</div>
		);
	}

	return (
		<div
			style={{
				padding: 24,
				maxWidth: 1200,
				margin: "0 auto",
				height: "100%",
				display: "flex",
				flexDirection: "column",
				gap: 0,
			}}
		>
			{/* HEADER */}
			<div
				style={{
					display: "flex",
					alignItems: "flex-start",
					justifyContent: "space-between",
					marginBottom: 24,
					flexWrap: "wrap",
					gap: 16,
				}}
			>
				<div>
					<h1 className="text-2xl font-bold m-0 flex items-center gap-3 text-slate-900 dark:text-white">
						<Package className="text-emerald-500" size={28} /> Склад материалов
					</h1>
					<p className="text-slate-500 dark:text-slate-400 mt-1 mb-0 text-sm">
						Учёт расходников, приход и списание
					</p>
				</div>
				{/* KPI CARDS */}
				<div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
					<div
						style={{
							background: paperBg,
							border: `1px solid ${borderColor}`,
							padding: "12px 20px",
							borderRadius: 12,
							display: "flex",
							flexDirection: "column",
							alignItems: "center",
							minWidth: 110,
						}}
					>
						<span
							style={{
								fontSize: 11,
								color: "var(--muted)",
								textTransform: "uppercase",
								letterSpacing: 1,
							}}
						>
							Позиций
						</span>
						<strong style={{ fontSize: 22, color: "var(--ink)" }}>
							{totalItems}
						</strong>
					</div>
					<div
						style={{
							background: paperBg,
							border: `1px solid ${borderColor}`,
							padding: "12px 20px",
							borderRadius: 12,
							display: "flex",
							flexDirection: "column",
							alignItems: "center",
							minWidth: 110,
						}}
					>
						<span
							style={{
								fontSize: 11,
								color: "var(--muted)",
								textTransform: "uppercase",
								letterSpacing: 1,
							}}
						>
							В дефиците
						</span>
						<strong
							style={{
								fontSize: 22,
								color: lowStockCount > 0 ? "var(--tomato)" : "var(--teal)",
							}}
						>
							{lowStockCount}
						</strong>
					</div>
					{totalValue > 0 && (
						<div
							style={{
								background: paperBg,
								border: `1px solid ${borderColor}`,
								padding: "12px 20px",
								borderRadius: 12,
								display: "flex",
								flexDirection: "column",
								alignItems: "center",
								minWidth: 140,
							}}
						>
							<span
								style={{
									fontSize: 11,
									color: "var(--muted)",
									textTransform: "uppercase",
									letterSpacing: 1,
								}}
							>
								Стоимость склада
							</span>
							<strong
								style={{
									fontSize: 18,
									color: "var(--teal)",
									display: "flex",
									alignItems: "center",
									gap: 4,
								}}
							>
								<TrendingUp size={14} />
								{money(totalValue)}
							</strong>
						</div>
					)}
				</div>
			</div>

			{/* SUB-TABS */}
			<div
				style={{
					display: "flex",
					gap: 8,
					marginBottom: 20,
					borderBottom: `1px solid ${borderColor}`,
					paddingBottom: 8,
				}}
			>
				<button
					type="button"
					onClick={() => setActiveSubTab("inventory")}
					style={{
						padding: "8px 16px",
						borderRadius: 8,
						background:
							activeSubTab === "inventory"
								? "rgba(20, 184, 166, 0.1)"
								: "transparent",
						border: "none",
						color:
							activeSubTab === "inventory"
								? "var(--teal, #14b8a6)"
								: "var(--muted)",
						fontWeight: 600,
						fontSize: 14,
						cursor: "pointer",
						transition: "all 0.2s ease",
					}}
				>
					📦 Складские остатки
				</button>
				<button
					type="button"
					onClick={() => setActiveSubTab("rules")}
					style={{
						padding: "8px 16px",
						borderRadius: 8,
						background:
							activeSubTab === "rules"
								? "rgba(20, 184, 166, 0.1)"
								: "transparent",
						border: "none",
						color:
							activeSubTab === "rules"
								? "var(--teal, #14b8a6)"
								: "var(--muted)",
						fontWeight: 600,
						fontSize: 14,
						cursor: "pointer",
						transition: "all 0.2s ease",
					}}
				>
					⚙️ Правила списания
				</button>
			</div>

			{activeSubTab === "inventory" ? (
				<>
					{/* CONTROLS */}
					<div
						style={{
							display: "flex",
							alignItems: "center",
							justifyContent: "space-between",
							marginBottom: 16,
							gap: 12,
							flexWrap: "wrap",
						}}
					>
						<div
							style={{
								position: "relative",
								minWidth: 260,
								flex: 1,
								maxWidth: 360,
							}}
						>
							<Search
								size={16}
								color="var(--muted)"
								style={{
									position: "absolute",
									left: 12,
									top: "50%",
									transform: "translateY(-50%)",
								}}
							/>
							<input
								type="text"
								placeholder="Поиск материала..."
								value={searchQuery}
								onChange={(e) => setSearchQuery(e.target.value)}
								style={{
									width: "100%",
									padding: "10px 12px 10px 36px",
									borderRadius: 8,
									border: `1px solid ${borderColor}`,
									background: paperBg,
									color: "var(--ink)",
									outline: "none",
									boxSizing: "border-box",
								}}
							/>
						</div>
						<button className="primary-button" onClick={openAddModal}>
							<Plus size={18} /> Добавить позицию
						</button>
					</div>

					{/* TABLE */}
					<div
						style={{
							flex: 1,
							overflowY: "auto",
							background: paperBg,
							borderRadius: 16,
							border: `1px solid ${borderColor}`,
						}}
					>
						<table
							style={{
								width: "100%",
								borderCollapse: "collapse",
								textAlign: "left",
							}}
						>
							<thead
								style={{
									position: "sticky",
									top: 0,
									background: paperSoftBg,
									zIndex: 10,
								}}
							>
								<tr>
									<th
										style={{
											padding: "14px 20px",
											fontSize: 12,
											color: "var(--muted)",
											fontWeight: 600,
											borderBottom: `1px solid ${borderColor}`,
											textTransform: "uppercase",
											letterSpacing: 0.5,
										}}
									>
										Наименование
									</th>
									<th
										style={{
											padding: "14px 20px",
											fontSize: 12,
											color: "var(--muted)",
											fontWeight: 600,
											borderBottom: `1px solid ${borderColor}`,
											textTransform: "uppercase",
											letterSpacing: 0.5,
										}}
									>
										Остаток
									</th>
									<th
										style={{
											padding: "14px 20px",
											fontSize: 12,
											color: "var(--muted)",
											fontWeight: 600,
											borderBottom: `1px solid ${borderColor}`,
											textTransform: "uppercase",
											letterSpacing: 0.5,
										}}
									>
										Мин. запас
									</th>
									<th
										style={{
											padding: "14px 20px",
											fontSize: 12,
											color: "var(--muted)",
											fontWeight: 600,
											borderBottom: `1px solid ${borderColor}`,
											textTransform: "uppercase",
											letterSpacing: 0.5,
										}}
									>
										Цена / ед.
									</th>
									<th
										style={{
											padding: "14px 20px",
											fontSize: 12,
											color: "var(--muted)",
											fontWeight: 600,
											borderBottom: `1px solid ${borderColor}`,
											textTransform: "uppercase",
											letterSpacing: 0.5,
										}}
									>
										Партия / Срок
									</th>
									<th
										style={{
											padding: "14px 20px",
											fontSize: 12,
											color: "var(--muted)",
											fontWeight: 600,
											borderBottom: `1px solid ${borderColor}`,
											textTransform: "uppercase",
											letterSpacing: 0.5,
										}}
									>
										Штрихкод
									</th>
									<th
										style={{
											padding: "14px 20px",
											fontSize: 12,
											color: "var(--muted)",
											fontWeight: 600,
											borderBottom: `1px solid ${borderColor}`,
											textTransform: "uppercase",
											letterSpacing: 0.5,
											textAlign: "right",
										}}
									>
										Действия
									</th>
								</tr>
							</thead>
							<tbody>
								{filteredItems.length === 0 ? (
									<tr>
										{/* В шапке семь колонок: при colSpan={5} текст съезжал влево. */}
										<td
											colSpan={7}
											style={{
												padding: 48,
												textAlign: "center",
												color: "var(--muted)",
											}}
										>
											{/*
												ТРИ РАЗНЫХ ПУСТЫХ ЭКРАНА, А НЕ ОДИН.

												Здесь стояло «Склад пуст. Добавьте первый материал.» на
												любую пустоту, включая ту, при которой добавлять нельзя:
												пока организация не определена (профиль клиники ещё не
												пришёл, вход просрочен), запрос остатков вообще не
												уходит — hook снимает признак загрузки и оставляет
												список пустым. Кладовщик читал «склад пуст» и заносил
												материалы заново поверх настоящих остатков.
											*/}
											{/*
												Отказ сервера — отдельное состояние, а не пустота.

												При упавшем запросе список остаётся пустым, и здесь
												показывалось «Склад пуст. Добавьте первый материал.»
												Уведомление об ошибке к этому времени уже погасло, так
												что экран прямо предлагал занести материалы заново
												поверх настоящих остатков. Теперь видно, что остатки не
												загружены, и есть чем повторить запрос.
											*/}
											{loadError ? (
												<span
													style={{
														display: "flex",
														flexDirection: "column",
														alignItems: "center",
														gap: 14,
													}}
												>
													<AlertTriangle
														size={22}
														style={{ color: "var(--tomato)" }}
													/>
													<span style={{ color: "var(--ink)", fontSize: 15 }}>
														{loadError}
													</span>
													<button
														type="button"
														onClick={() => fetchItems()}
														disabled={isLoading}
														style={{
															padding: "10px 20px",
															borderRadius: 8,
															border: `1px solid ${borderColor}`,
															background: paperSoftBg,
															color: "var(--ink)",
															fontWeight: 600,
															fontSize: 14,
															cursor: isLoading ? "wait" : "pointer",
														}}
													>
														{isLoading ? "Загружаем..." : "Повторить"}
													</button>
												</span>
											) : !organizationId ? (
												"Склад не загружен: клиника не определена. Обновите страницу или войдите в кабинет заново — добавлять материалы сейчас нельзя, настоящие остатки не показаны."
											) : searchQuery ? (
												"Материалы не найдены по запросу"
											) : (
												"Склад пуст. Добавьте первый материал."
											)}
										</td>
									</tr>
								) : (
									filteredItems.map((item) => {
										const isLowStock =
											item.stockQuantity <= item.criticalThreshold;
										/*
										 * БЫЛО: `Number(item.unitCostRub) || 0`.
										 * Нечитаемая/пустая/битая цена становилась нулём:
										 * строка склада показывала материал бесплатным,
										 * «итого» по позиции считалось от нуля, а шапка
										 * totalValue (parseKopecks) могла показывать другое.
										 * money() уже умеет «не определено» для NaN — но
										 * до неё ноль подставляли здесь.
										 * СТАЛО: конечное число оставляем; иначе null и
										 * честный money(null)/без ложного «итого».
										 */
										const unitCostRaw = Number(item.unitCostRub);
										const unitCost = Number.isFinite(unitCostRaw)
											? unitCostRaw
											: null;
										const lineValue =
											unitCost !== null && Number.isFinite(item.stockQuantity)
												? item.stockQuantity * unitCost
												: null;
										return (
											<tr
												key={item.id}
												style={{
													borderBottom: `1px solid ${borderColor}`,
													transition: "background 0.15s",
												}}
											>
												<td
													style={{
														padding: "14px 20px",
														color: "var(--ink)",
														fontWeight: 500,
													}}
												>
													<div
														style={{
															display: "flex",
															alignItems: "center",
															gap: 8,
														}}
													>
														{isLowStock && (
															<AlertTriangle size={15} color="var(--tomato)" />
														)}
														{item.name}
													</div>
												</td>
												<td style={{ padding: "14px 20px" }}>
													<span
														style={{
															background: isLowStock
																? "rgba(239, 68, 68, 0.1)"
																: "rgba(16, 185, 129, 0.1)",
															color: isLowStock
																? "var(--tomato)"
																: "var(--teal)",
															padding: "4px 10px",
															borderRadius: 6,
															fontWeight: 600,
															fontSize: 14,
															border: isLowStock
																? "1px solid rgba(239, 68, 68, 0.3)"
																: "1px solid rgba(16, 185, 129, 0.2)",
														}}
													>
														{item.stockQuantity} шт.
													</span>
												</td>
												<td
													style={{
														padding: "14px 20px",
														color: "var(--muted)",
														fontSize: 14,
													}}
												>
													{item.criticalThreshold} шт.
												</td>
												<td style={{ padding: "14px 20px", fontSize: 14 }}>
													{/*
													 * БЫЛО: unitCost > 0 / lineValue > 0 после Number||0.
													 * Неизвестная цена уже null; сравнение с 0 схлопывало
													 * «не определено» и честный ноль в одно «—».
													 * СТАЛО: null → money(null) («не определено»);
													 * конечное число (в т.ч. 0) → money; итого только
													 * когда lineValue известен.
													 */}
													{unitCost !== null ? (
														<div>
															<div
																style={{ color: "var(--ink)", fontWeight: 500 }}
															>
																{/*
															  Деньги показывает общая money() из AppHelpers.

															  Стояло `unitCost.toLocaleString("ru-RU") + " ₽"`:
															  цена 1250,50 печаталась как «1 250,5 ₽», потому что
															  toLocaleString по умолчанию лишний ноль опускает.
															  На деньгах это читается так, будто пятьдесят копеек
															  превратились в пять.
															*/}
																{money(unitCost)}
															</div>
															{lineValue !== null && (
																<div
																	style={{
																		color: "var(--muted)",
																		fontSize: 12,
																	}}
																>
																	итого: {money(lineValue)}
																</div>
															)}
														</div>
													) : (
														<span
															style={{
																color: "var(--muted)",
																fontStyle: "italic",
															}}
														>
															{money(null)}
														</span>
													)}
												</td>
												<td
													style={{
														padding: "14px 20px",
														color: "var(--muted)",
														fontSize: 14,
													}}
												>
													{/*
													  Просрочку и «вот-вот истечёт» надо различать.

													  Раньше оба случая красились одинаково и цветом
													  var(--tomato) — токена с таким именем в проекте нет
													  вовсе, поэтому предупреждение попросту не
													  показывалось: текст оставался обычным. Просроченный
													  материал нельзя использовать совсем, а истекающий
													  надо успеть израсходовать — это разные решения
													  кладовщика, и выглядеть они обязаны по-разному.
													*/}
													{item.expirationDate ? (
														(() => {
															const state = expirationState(
																item.expirationDate,
															);
															return (
																<div
																	style={{
																		display: "flex",
																		flexDirection: "column",
																	}}
																>
																	<span className={state.className}>
																		{state.label}
																	</span>
																	{item.lotNumber ? (
																		<span style={{ fontSize: 12 }}>
																			Партия: {item.lotNumber}
																		</span>
																	) : null}
																</div>
															);
														})()
													) : item.lotNumber ? (
														<span style={{ fontSize: 12 }}>
															Партия: {item.lotNumber}
														</span>
													) : (
														<span style={{ fontStyle: "italic", opacity: 0.5 }}>
															Не указан
														</span>
													)}
												</td>
												<td
													style={{
														padding: "14px 20px",
														color: "var(--muted)",
														fontSize: 14,
													}}
												>
													{item.barcode ? (
														<span
															style={{
																fontFamily: "monospace",
																background: "rgba(0,0,0,0.05)",
																padding: "2px 6px",
																borderRadius: 4,
															}}
														>
															{item.barcode}
														</span>
													) : (
														<span style={{ fontStyle: "italic", opacity: 0.5 }}>
															Нет
														</span>
													)}
												</td>
												<td
													style={{ padding: "14px 20px", textAlign: "right" }}
												>
													<div
														style={{
															display: "flex",
															justifyContent: "flex-end",
															gap: 6,
															flexWrap: "wrap",
														}}
													>
														<button
															onClick={() => openEditModal(item)}
															style={{
																background: "rgba(245, 158, 11, 0.1)",
																color: "#d97706",
																border: "none",
																width: 32,
																height: 32,
																borderRadius: 6,
																cursor: "pointer",
																display: "flex",
																alignItems: "center",
																justifyContent: "center",
															}}
															title="Редактировать"
														>
															<Edit2 size={14} />
														</button>
														<button
															onClick={() =>
																handleDeleteItem(item.id, item.name)
															}
															style={{
																background: "rgba(239, 68, 68, 0.1)",
																color: "var(--tomato)",
																border: "none",
																width: 32,
																height: 32,
																borderRadius: 6,
																cursor: "pointer",
																display: "flex",
																alignItems: "center",
																justifyContent: "center",
															}}
															title="Удалить"
														>
															<Trash2 size={14} />
														</button>
														<button
															onClick={() => {
																setAdjustingItem(item);
																setAdjustType("in");
																setAdjustAmount("");
															}}
															style={{
																background: "rgba(59, 130, 246, 0.1)",
																color: "#3b82f6",
																border: "none",
																padding: "6px 12px",
																borderRadius: 6,
																fontWeight: 600,
																cursor: "pointer",
																display: "flex",
																alignItems: "center",
																gap: 5,
																fontSize: 13,
															}}
															title="Оприходовать"
														>
															<ArrowDownToLine size={14} /> ПРИХОД
														</button>
														<button
															onClick={() => {
																setAdjustingItem(item);
																setAdjustType("out");
																setAdjustAmount("");
															}}
															style={{
																background: "rgba(239, 68, 68, 0.1)",
																color: "var(--tomato)",
																border: "none",
																padding: "6px 12px",
																borderRadius: 6,
																fontWeight: 600,
																cursor: "pointer",
																display: "flex",
																alignItems: "center",
																gap: 5,
																fontSize: 13,
															}}
															title="Списать"
														>
															<ArrowUpFromLine size={14} /> РАСХОД
														</button>
													</div>
												</td>
											</tr>
										);
									})
								)}
							</tbody>
						</table>
					</div>
				</>
			) : (
				renderRulesTab()
			)}

			{/* ADD/EDIT MODAL */}
			{showModal && (
				<div
					style={{
						position: "fixed",
						inset: 0,
						zIndex: 1000,
						background: "rgba(0,0,0,0.5)",
						backdropFilter: "blur(4px)",
						display: "flex",
						alignItems: "center",
						justifyContent: "center",
					}}
					onClick={(e) => e.target === e.currentTarget && setShowModal(false)}
				>
					<div
						style={{
							background: paperBg,
							width: 440,
							maxWidth: "95vw",
							borderRadius: 16,
							padding: 28,
							border: `1px solid ${borderColor}`,
							boxShadow: "0 24px 48px rgba(0,0,0,0.25)",
						}}
					>
						<div
							style={{
								display: "flex",
								justifyContent: "space-between",
								marginBottom: 20,
							}}
						>
							<h2
								style={{
									margin: 0,
									fontSize: 18,
									fontWeight: 600,
									color: "var(--ink)",
								}}
							>
								{editingItem ? "Редактировать материал" : "Добавить материал"}
							</h2>
							<button
								onClick={() => setShowModal(false)}
								style={{
									background: "none",
									border: "none",
									color: "var(--muted)",
									cursor: "pointer",
								}}
							>
								<X size={20} />
							</button>
						</div>
						<form
							onSubmit={handleSaveItem}
							style={{ display: "flex", flexDirection: "column", gap: 16 }}
						>
							<div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
								<label
									style={{
										fontSize: 13,
										color: "var(--muted)",
										fontWeight: 500,
									}}
								>
									Наименование *
								</label>
								<input
									type="text"
									required
									autoFocus
									value={formData.name}
									onChange={(e) =>
										setFormData({ ...formData, name: e.target.value })
									}
									style={{
										padding: "10px 14px",
										borderRadius: 8,
										border: `1px solid ${borderColor}`,
										background: paperSoftBg,
										color: "var(--ink)",
										outline: "none",
									}}
									placeholder="Перчатки нитриловые, Альгинат..."
								/>
							</div>
							<div style={{ display: "flex", gap: 12 }}>
								<div
									style={{
										display: "flex",
										flexDirection: "column",
										gap: 6,
										flex: 1,
									}}
								>
									<label
										style={{
											fontSize: 13,
											color: "var(--muted)",
											fontWeight: 500,
										}}
									>
										Минимальный остаток (шт)
									</label>
									<input
										type="number"
										min="0"
										required
										value={formData.threshold}
										onChange={(e) =>
											setFormData({ ...formData, threshold: e.target.value })
										}
										placeholder="например: 5"
										style={{
											padding: "10px 14px",
											borderRadius: 8,
											border: `1px solid ${borderColor}`,
											background: paperSoftBg,
											color: "var(--ink)",
											outline: "none",
										}}
									/>
								</div>
								<div
									style={{
										display: "flex",
										flexDirection: "column",
										gap: 6,
										flex: 1,
									}}
								>
									<label
										style={{
											fontSize: 13,
											color: "var(--muted)",
											fontWeight: 500,
										}}
									>
										Цена за единицу (₽)
									</label>
									{/*
									  Поле цены принимает запятую, а не глотает её.

									  Стояло type="number" при подсказке «например 12,50». Запятая
									  делает содержимое такого поля недопустимым, и браузер отдаёт
									  из value пустую строку — набранная цена видна человеку, но в
									  программу не попадает и сохраняется нулём. Обычное текстовое
									  поле сохраняет введённое как есть; разбирает его общая
									  normalizeRubAmountInput при сохранении, там же и «12.50».
									  inputMode="decimal" оставляет на телефоне цифровую клавиатуру.
									*/}
									<input
										type="text"
										inputMode="decimal"
										value={formData.unitCostRub}
										onChange={(e) =>
											setFormData({ ...formData, unitCostRub: e.target.value })
										}
										placeholder="цена за единицу, например 12,50"
										style={{
											padding: "10px 14px",
											borderRadius: 8,
											border: `1px solid ${borderColor}`,
											background: paperSoftBg,
											color: "var(--ink)",
											outline: "none",
										}}
									/>
								</div>
							</div>

							{/*
							  Партия и срок годности — на поверхности.

							  Колонка «Партия / Срок» на экране была давно и всегда писала
							  «Не указан»: полей для ввода не существовало, а в таблице
							  inventory_items не было и колонок. Просроченный композит или
							  анестетик — это вред пациенту, поэтому срок стоит рядом с
							  ценой, а не спрятан под «показать больше».
							*/}
							<div className="inventory-form-row">
								<label className="inventory-form-field">
									Партия
									<input
										type="text"
										value={formData.lotNumber}
										onChange={(e) =>
											setFormData({ ...formData, lotNumber: e.target.value })
										}
										placeholder="номер с упаковки, если есть"
									/>
								</label>
								<label className="inventory-form-field">
									Срок годности
									<input
										type="date"
										value={formData.expirationDate}
										onChange={(e) =>
											setFormData({
												...formData,
												expirationDate: e.target.value,
											})
										}
									/>
								</label>
							</div>

							{/*
							  Артикул и штрихкод нужны не каждому, поэтому убраны под
							  раскрытие: у соло-врача их обычно нет вовсе. Форма присылала
							  оба поля и раньше, но ввести их было негде.
							*/}
							<details className="inventory-form-more">
								<summary>Артикул и штрихкод</summary>
								<div className="inventory-form-row">
									<label className="inventory-form-field">
										Артикул
										<input
											type="text"
											value={formData.sku}
											onChange={(e) =>
												setFormData({ ...formData, sku: e.target.value })
											}
											placeholder="код поставщика"
										/>
									</label>
									<label className="inventory-form-field">
										Штрихкод
										<input
											type="text"
											value={formData.barcode}
											onChange={(e) =>
												setFormData({ ...formData, barcode: e.target.value })
											}
											placeholder="или отсканируйте сканером"
										/>
									</label>
								</div>
							</details>

							{/*
							  Кнопка запирается на время запроса: новый материал создаётся
							  через POST, и второе нажатие добавляло вторую такую же позицию
							  на одну полку. Остаток потом ведут по одной, а списывают со
							  второй.
							*/}
							<button
								type="submit"
								className="primary-button"
								disabled={isSavingItem}
								style={{
									marginTop: 8,
									justifyContent: "center",
									opacity: isSavingItem ? 0.6 : 1,
									cursor: isSavingItem ? "wait" : "pointer",
								}}
							>
								{isSavingItem ? "Сохраняем..." : "Сохранить"}
							</button>
						</form>
					</div>
				</div>
			)}

			{/* ADJUST STOCK MODAL */}
			{adjustingItem && (
				<div
					style={{
						position: "fixed",
						inset: 0,
						zIndex: 1000,
						background: "rgba(0,0,0,0.5)",
						backdropFilter: "blur(4px)",
						display: "flex",
						alignItems: "center",
						justifyContent: "center",
					}}
					onClick={(e) =>
						e.target === e.currentTarget && setAdjustingItem(null)
					}
				>
					<div
						style={{
							background: paperBg,
							width: 380,
							maxWidth: "95vw",
							borderRadius: 16,
							padding: 28,
							border: `1px solid ${borderColor}`,
							boxShadow: "0 24px 48px rgba(0,0,0,0.25)",
						}}
					>
						<div
							style={{
								display: "flex",
								justifyContent: "space-between",
								marginBottom: 16,
							}}
						>
							<h2
								style={{
									margin: 0,
									fontSize: 18,
									fontWeight: 600,
									color: "var(--ink)",
								}}
							>
								{adjustType === "in" ? "Приход на склад" : "Списание со склада"}
							</h2>
							<button
								onClick={() => setAdjustingItem(null)}
								style={{
									background: "none",
									border: "none",
									color: "var(--muted)",
									cursor: "pointer",
								}}
							>
								<X size={20} />
							</button>
						</div>
						<p
							style={{
								margin: "0 0 4px 0",
								color: "var(--muted)",
								fontSize: 13,
							}}
						>
							Материал
						</p>
						<p
							style={{
								margin: "0 0 20px 0",
								color: "var(--teal)",
								fontWeight: 600,
								fontSize: 15,
							}}
						>
							{adjustingItem.name}
						</p>
						<p
							style={{
								margin: "0 0 16px 0",
								color: "var(--muted)",
								fontSize: 13,
							}}
						>
							Текущий остаток:{" "}
							<strong style={{ color: "var(--ink)" }}>
								{adjustingItem.stockQuantity} шт.
							</strong>
						</p>

						{/* Toggle direction */}
						<div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
							{(["in", "out"] as const).map((t) => (
								<button
									key={t}
									type="button"
									onClick={() => setAdjustType(t)}
									style={{
										flex: 1,
										padding: "8px 0",
										borderRadius: 8,
										border: `1px solid ${adjustType === t ? (t === "in" ? "#3b82f6" : "var(--tomato)") : borderColor}`,
										background:
											adjustType === t
												? t === "in"
													? "rgba(59,130,246,0.12)"
													: "rgba(239,68,68,0.12)"
												: "transparent",
										color:
											adjustType === t
												? t === "in"
													? "#3b82f6"
													: "var(--tomato)"
												: "var(--muted)",
										fontWeight: 600,
										cursor: "pointer",
										display: "flex",
										alignItems: "center",
										justifyContent: "center",
										gap: 6,
										transition: "all 0.15s",
									}}
								>
									{t === "in" ? (
										<>
											<ArrowDownToLine size={14} /> Приход
										</>
									) : (
										<>
											<ArrowUpFromLine size={14} /> Списание
										</>
									)}
								</button>
							))}
						</div>

						<form
							onSubmit={handleAdjustStock}
							style={{ display: "flex", flexDirection: "column", gap: 16 }}
						>
							<div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
								<label
									style={{
										fontSize: 13,
										color: "var(--muted)",
										fontWeight: 500,
									}}
								>
									Количество (шт.)
								</label>
								<input
									type="number"
									min="1"
									required
									autoFocus
									value={adjustAmount}
									onChange={(e) => setAdjustAmount(e.target.value)}
									style={{
										padding: "14px 16px",
										borderRadius: 8,
										border: `1px solid ${borderColor}`,
										background: paperSoftBg,
										color: "var(--ink)",
										fontSize: 22,
										fontWeight: 700,
										outline: "none",
										textAlign: "center",
									}}
								/>
							</div>
							{adjustHasAmount && (
								<p
									style={{
										margin: 0,
										textAlign: "center",
										color: "var(--muted)",
										fontSize: 13,
									}}
								>
									Будет:{" "}
									<strong style={{ color: "var(--ink)" }}>
										{adjustExceedsStock ? 0 : adjustResultQuantity} шт.
									</strong>
								</p>
							)}
							{adjustExceedsStock && (
								<p
									style={{
										margin: 0,
										padding: "12px 14px",
										borderRadius: 8,
										background: "rgba(239,68,68,0.12)",
										border: "1px solid var(--tomato)",
										color: "var(--ink)",
										fontSize: 14,
										lineHeight: 1.45,
									}}
								>
									Списываете больше, чем есть на складе: в наличии{" "}
									{adjustingItem.stockQuantity} шт., списываете{" "}
									{adjustAmountNumber} шт. Исправьте количество или сначала
									оприходуйте поступление.
								</p>
							)}
							{/*
							  Кнопка запирается на время запроса.

							  БЫЛО: кнопка оставалась нажимаемой, пока сервер отвечал.
							  Приход и списание прибавляются к остатку, а не задают его,
							  поэтому второе нажатие по медленной сети двигало остаток
							  второй раз — материал списывался дважды за одно окно.
							  Погасшая кнопка с честной надписью показывает, что работа
							  идёт, и не даёт нажать повторно.
							*/}
							<button
								type="submit"
								disabled={isAdjustingStock || adjustExceedsStock}
								style={{
									padding: "12px",
									borderRadius: 8,
									border: "none",
									fontWeight: 600,
									color: "#fff",
									cursor:
										isAdjustingStock || adjustExceedsStock
											? "not-allowed"
											: "pointer",
									background: adjustType === "in" ? "#3b82f6" : "var(--tomato)",
									fontSize: 15,
									opacity: isAdjustingStock || adjustExceedsStock ? 0.6 : 1,
								}}
							>
								{isAdjustingStock
									? "Сохраняем..."
									: adjustType === "in"
										? "Оприходовать"
										: "Списать"}
							</button>
						</form>
					</div>
				</div>
			)}

			{/*
			  Окно подтверждения удаления.

			  Состояние confirmDialog заполнялось обработчиками корзины давно, но
			  рисовать его было нечем — здесь ничего не стояло. Нажатие на корзину
			  у материала и у правила списания не давало вообще никакого отклика.
			*/}
			{confirmDialog?.isOpen ? (
				<InventoryConfirmDialog
					title={confirmDialog.title}
					message={confirmDialog.message}
					onConfirm={confirmDialog.onConfirm}
					onCancel={() => setConfirmDialog(null)}
				/>
			) : null}
		</div>
	);
};
