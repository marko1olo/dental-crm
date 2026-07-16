import React, { useEffect, useState, useMemo } from "react";
import {
	Plus,
	Package,
	AlertTriangle,
	ArrowDownToLine,
	ArrowUpFromLine,
	Search,
	Edit2,
	X,
	Trash2,
	TrendingUp,
} from "lucide-react";
import { useAppLogicContext } from "../contexts/AppLogicContext";
import { showToast } from "./GlobalToast";

interface InventoryItem {
	id: string;
	name: string;
	stockQuantity: number;
	criticalThreshold: number;
	unitCostRub: string;
	updatedAt: string;
}

export const InventoryView: React.FC<{ organizationId: string }> = ({
	organizationId,
}) => {
	const [items, setItems] = useState<InventoryItem[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const { auth } = useAppLogicContext();

	const [searchQuery, setSearchQuery] = useState("");

	// Add/Edit Modal
	const [showModal, setShowModal] = useState(false);
	const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
	const [formData, setFormData] = useState({
		name: "",
		threshold: "5",
		unitCostRub: "0",
	});

	// Adjust Modal
	const [adjustingItem, setAdjustingItem] = useState<InventoryItem | null>(null);
	const [adjustAmount, setAdjustAmount] = useState("");
	const [adjustType, setAdjustType] = useState<"in" | "out">("in");

	const fetchItems = async () => {
		try {
			setIsLoading(true);
			const res = await fetch(`/api/inventory/${organizationId}`, {
				headers: auth.denteClinicalReadHeaders(),
			});
			if (res.ok) {
				const data = await res.json();
				setItems(Array.isArray(data) ? data : []);
			} else {
				showToast("Ошибка загрузки склада", "error");
			}
		} catch (e) {
			console.error(e);
			showToast("Ошибка загрузки склада", "error");
		} finally {
			setIsLoading(false);
		}
	};

	useEffect(() => {
		if (organizationId) {
			fetchItems();
		}
	}, [organizationId]);

	const openAddModal = () => {
		setEditingItem(null);
		setFormData({ name: "", threshold: "5", unitCostRub: "0" });
		setShowModal(true);
	};

	const openEditModal = (item: InventoryItem) => {
		setEditingItem(item);
		setFormData({
			name: item.name,
			threshold: String(item.criticalThreshold),
			unitCostRub: item.unitCostRub || "0",
		});
		setShowModal(true);
	};

	const handleSaveItem = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!formData.name.trim()) return;
		const unitCost = Math.max(0, parseFloat(formData.unitCostRub) || 0);
		const threshold = Math.max(0, parseInt(formData.threshold) || 5);
		try {
			if (editingItem) {
				const res = await fetch(
					`/api/inventory/${organizationId}/${editingItem.id}`,
					{
						method: "PUT",
						headers: auth.denteClinicalReadHeaders({
							"Content-Type": "application/json",
						}),
						body: JSON.stringify({
							name: formData.name.trim(),
							criticalThreshold: threshold,
							unitCostRub: unitCost,
						}),
					},
				);
				if (res.ok) {
					showToast("Материал обновлён", "success");
					setShowModal(false);
					fetchItems();
				} else {
					showToast("Ошибка изменения", "error");
				}
			} else {
				const res = await fetch(`/api/inventory/${organizationId}`, {
					method: "POST",
					headers: auth.denteClinicalReadHeaders({
						"Content-Type": "application/json",
					}),
					body: JSON.stringify({
						name: formData.name.trim(),
						criticalThreshold: threshold,
						unitCostRub: unitCost,
						stockQuantity: 0,
					}),
				});
				if (res.ok) {
					showToast("Материал добавлен", "success");
					setShowModal(false);
					fetchItems();
				} else {
					showToast("Ошибка добавления", "error");
				}
			}
		} catch (e) {
			console.error(e);
			showToast("Системная ошибка", "error");
		}
	};

	const handleDeleteItem = async (itemId: string, name: string) => {
		if (!window.confirm(`Удалить «${name}» со склада? Это действие необратимо.`))
			return;
		try {
			const res = await fetch(`/api/inventory/${organizationId}/${itemId}`, {
				method: "DELETE",
				headers: auth.denteClinicalReadHeaders(),
			});
			if (res.ok) {
				showToast("Материал удалён со склада", "success");
				fetchItems();
			} else {
				showToast("Ошибка удаления", "error");
			}
		} catch (e) {
			console.error(e);
			showToast("Системная ошибка", "error");
		}
	};

	const handleAdjustStock = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!adjustingItem || !adjustAmount) return;

		const amount = parseInt(adjustAmount);
		if (isNaN(amount) || amount <= 0) return;

		const adjustment = adjustType === "in" ? amount : -amount;

		try {
			const res = await fetch(
				`/api/inventory/${organizationId}/${adjustingItem.id}/stock`,
				{
					method: "PATCH",
					headers: auth.denteClinicalReadHeaders({
						"Content-Type": "application/json",
					}),
					body: JSON.stringify({ adjustment }),
				},
			);
			if (res.ok) {
				setAdjustingItem(null);
				setAdjustAmount("");
				fetchItems();
				showToast(
					adjustType === "in" ? "Приход оформлен" : "Списание оформлено",
					"success",
				);
			} else {
				const err = await res.json().catch(() => ({}));
				showToast((err as any)?.error || "Ошибка изменения остатков", "error");
			}
		} catch (e) {
			console.error(e);
			showToast("Системная ошибка", "error");
		}
	};

	const filteredItems = useMemo(() => {
		if (!searchQuery.trim()) return items;
		const q = searchQuery.toLowerCase();
		return items.filter((i) => i.name.toLowerCase().includes(q));
	}, [items, searchQuery]);

	const totalValue = useMemo(
		() =>
			items.reduce(
				(acc, i) => acc + i.stockQuantity * (Number(i.unitCostRub) || 0),
				0,
			),
		[items],
	);
	const lowStockCount = useMemo(
		() => items.filter((i) => i.stockQuantity <= i.criticalThreshold).length,
		[items],
	);
	const totalItems = items.length;

	const paperBg = "var(--paper)";
	const paperSoftBg = "var(--paper-soft)";
	const borderColor = "var(--line)";

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
					<h1
						style={{
							fontSize: 24,
							fontWeight: 700,
							margin: 0,
							display: "flex",
							alignItems: "center",
							gap: 12,
							color: "var(--ink)",
						}}
					>
						<Package color="var(--teal)" size={28} /> Склад материалов
					</h1>
					<p style={{ color: "var(--muted)", margin: "4px 0 0 0", fontSize: 14 }}>
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
								{totalValue.toLocaleString("ru-RU")} ₽
							</strong>
						</div>
					)}
				</div>
			</div>

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
				<div style={{ position: "relative", minWidth: 260, flex: 1, maxWidth: 360 }}>
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
					style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}
				>
					<thead
						style={{ position: "sticky", top: 0, background: paperSoftBg, zIndex: 10 }}
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
								<td
									colSpan={5}
									style={{ padding: 48, textAlign: "center", color: "var(--muted)" }}
								>
									{searchQuery
										? "Материалы не найдены по запросу"
										: "Склад пуст. Добавьте первый материал."}
								</td>
							</tr>
						) : (
							filteredItems.map((item) => {
								const isLowStock = item.stockQuantity <= item.criticalThreshold;
								const unitCost = Number(item.unitCostRub) || 0;
								const lineValue = item.stockQuantity * unitCost;
								return (
									<tr
										key={item.id}
										style={{
											borderBottom: `1px solid ${borderColor}`,
											transition: "background 0.15s",
										}}
									>
										<td style={{ padding: "14px 20px", color: "var(--ink)", fontWeight: 500 }}>
											<div style={{ display: "flex", alignItems: "center", gap: 8 }}>
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
													color: isLowStock ? "var(--tomato)" : "var(--teal)",
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
											{unitCost > 0 ? (
												<div>
													<div style={{ color: "var(--ink)", fontWeight: 500 }}>
														{unitCost.toLocaleString("ru-RU")} ₽
													</div>
													{lineValue > 0 && (
														<div
															style={{ color: "var(--muted)", fontSize: 12 }}
														>
															итого: {lineValue.toLocaleString("ru-RU")} ₽
														</div>
													)}
												</div>
											) : (
												<span style={{ color: "var(--muted)", fontStyle: "italic" }}>
													—
												</span>
											)}
										</td>
										<td style={{ padding: "14px 20px", textAlign: "right" }}>
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
													onClick={() => handleDeleteItem(item.id, item.name)}
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
						<div style={{ display: "flex", justifyContent: "space-between", marginBottom: 20 }}>
							<h2 style={{ margin: 0, fontSize: 18, fontWeight: 600, color: "var(--ink)" }}>
								{editingItem ? "Редактировать материал" : "Добавить материал"}
							</h2>
							<button
								onClick={() => setShowModal(false)}
								style={{ background: "none", border: "none", color: "var(--muted)", cursor: "pointer" }}
							>
								<X size={20} />
							</button>
						</div>
						<form onSubmit={handleSaveItem} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
							<div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
								<label style={{ fontSize: 13, color: "var(--muted)", fontWeight: 500 }}>
									Наименование *
								</label>
								<input
									type="text"
									required
									autoFocus
									value={formData.name}
									onChange={(e) => setFormData({ ...formData, name: e.target.value })}
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
								<div style={{ display: "flex", flexDirection: "column", gap: 6, flex: 1 }}>
									<label style={{ fontSize: 13, color: "var(--muted)", fontWeight: 500 }}>
										Минимальный остаток (шт)
									</label>
									<input
										type="number"
										min="0"
										required
										value={formData.threshold}
										onChange={(e) => setFormData({ ...formData, threshold: e.target.value })}
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
								<div style={{ display: "flex", flexDirection: "column", gap: 6, flex: 1 }}>
									<label style={{ fontSize: 13, color: "var(--muted)", fontWeight: 500 }}>
										Цена за единицу (₽)
									</label>
									<input
										type="number"
										min="0"
										step="0.01"
										value={formData.unitCostRub}
										onChange={(e) =>
											setFormData({ ...formData, unitCostRub: e.target.value })
										}
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
							<button
								type="submit"
								className="primary-button"
								style={{ marginTop: 8, justifyContent: "center" }}
							>
								Сохранить
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
					onClick={(e) => e.target === e.currentTarget && setAdjustingItem(null)}
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
						<div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
							<h2 style={{ margin: 0, fontSize: 18, fontWeight: 600, color: "var(--ink)" }}>
								{adjustType === "in" ? "Приход на склад" : "Списание со склада"}
							</h2>
							<button
								onClick={() => setAdjustingItem(null)}
								style={{ background: "none", border: "none", color: "var(--muted)", cursor: "pointer" }}
							>
								<X size={20} />
							</button>
						</div>
						<p style={{ margin: "0 0 4px 0", color: "var(--muted)", fontSize: 13 }}>
							Материал
						</p>
						<p style={{ margin: "0 0 20px 0", color: "var(--teal)", fontWeight: 600, fontSize: 15 }}>
							{adjustingItem.name}
						</p>
						<p style={{ margin: "0 0 16px 0", color: "var(--muted)", fontSize: 13 }}>
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

						<form onSubmit={handleAdjustStock} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
							<div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
								<label style={{ fontSize: 13, color: "var(--muted)", fontWeight: 500 }}>
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
							{adjustAmount && !isNaN(parseInt(adjustAmount)) && (
								<p style={{ margin: 0, textAlign: "center", color: "var(--muted)", fontSize: 13 }}>
									Будет:{" "}
									<strong style={{ color: "var(--ink)" }}>
										{Math.max(
											0,
											adjustingItem.stockQuantity +
												(adjustType === "in" ? 1 : -1) * (parseInt(adjustAmount) || 0),
										)}{" "}
										шт.
									</strong>
								</p>
							)}
							<button
								type="submit"
								style={{
									padding: "12px",
									borderRadius: 8,
									border: "none",
									fontWeight: 600,
									color: "#fff",
									cursor: "pointer",
									background: adjustType === "in" ? "#3b82f6" : "var(--tomato)",
									fontSize: 15,
								}}
							>
								{adjustType === "in" ? "Оприходовать" : "Списать"}
							</button>
						</form>
					</div>
				</div>
			)}
		</div>
	);
};
