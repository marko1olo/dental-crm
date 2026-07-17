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
import { useAppLogicContext } from "../contexts/AppLogicContext";
import { showToast } from "./GlobalToast";

interface InventoryItem {
	id: string;
	name: string;
	stockQuantity: number;
	criticalThreshold: number;
	unitCostRub: string;
	updatedAt: string;
	sku?: string;
	barcode?: string;
	expirationDate?: string;
	lotNumber?: string;
}

export const InventoryView: React.FC<{ organizationId: string }> = ({
	organizationId,
}) => {
	const [items, setItems] = useState<InventoryItem[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const { auth, dashboard } = useAppLogicContext();

	// Barcode Scanner State
	const [scannedBarcode, setScannedBarcode] = useState<string>("");
	const [isScannerActive, setIsScannerActive] = useState(false);

	const [activeSubTab, setActiveSubTab] = useState<"inventory" | "rules">("inventory");
	const [selectedServiceId, setSelectedServiceId] = useState<string>("");
	const [rulesList, setRulesList] = useState<any[]>([]);
	const [isLoadingRules, setIsLoadingRules] = useState(false);
	const [selectedInventoryItemId, setSelectedInventoryItemId] = useState<string>("");
	const [quantityToDeduct, setQuantityToDeduct] = useState<string>("1");

	const fetchRules = async (serviceId: string) => {
		if (!serviceId) {
			setRulesList([]);
			return;
		}
		try {
			setIsLoadingRules(true);
			const res = await fetch(`/api/inventory/${organizationId}/rules/${serviceId}`, {
				headers: auth.denteClinicalReadHeaders(),
			});
			if (res.ok) {
				const data = await res.json();
				setRulesList(Array.isArray(data) ? data : []);
			} else {
				showToast("Ошибка загрузки правил", "error");
			}
		} catch (e) {
			console.error(e);
			showToast("Ошибка загрузки правил", "error");
		} finally {
			setIsLoadingRules(false);
		}
	};

	useEffect(() => {
		if (activeSubTab === "rules" && selectedServiceId) {
			fetchRules(selectedServiceId);
		}
	}, [activeSubTab, selectedServiceId]);

	// --- Global Barcode Scanner Listener (Hardware Emulation) ---
	useEffect(() => {
		let barcodeBuffer = "";
		let lastKeyTime = 0;

		const handleKeyDown = (e: KeyboardEvent) => {
			// Ignore if user is typing in an input or textarea
			const target = e.target as HTMLElement;
			if (target.tagName === "INPUT" || target.tagName === "TEXTAREA") return;

			const currentTime = Date.now();
			// Barcode scanners type very fast (usually < 30ms per character).
			// If more than 100ms passed since last key, reset the buffer.
			if (currentTime - lastKeyTime > 100) {
				barcodeBuffer = "";
			}
			lastKeyTime = currentTime;

			if (e.key === "Enter") {
				if (barcodeBuffer.length > 3) {
					// Likely a barcode scan
					console.log("[Scanner] Barcode read:", barcodeBuffer);
					setScannedBarcode(barcodeBuffer);
					setIsScannerActive(true);
					showToast(`Отсканирован код: ${barcodeBuffer}`, "success");
					
					// Optional: Auto-filter the list or open the "Add" modal for this item
					const found = items.find((i) => i.barcode === barcodeBuffer || i.sku === barcodeBuffer);
					if (found) {
						showToast(`Найден товар: ${found.name}`, "info");
						setSearchQuery(barcodeBuffer);
					} else {
						showToast("Неизвестный товар. Добавьте его в базу.", "warning");
						setFormData({ name: "", threshold: "5", unitCostRub: "0", sku: "", barcode: barcodeBuffer });
						setEditingItem(null);
						setShowModal(true);
					}
				}
				barcodeBuffer = "";
			} else if (e.key.length === 1) {
				barcodeBuffer += e.key;
			}
		};

		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [items]);

	const handleAddRule = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!selectedServiceId || !selectedInventoryItemId || !quantityToDeduct) return;

		const qty = parseInt(quantityToDeduct);
		if (isNaN(qty) || qty <= 0) {
			showToast("Введите корректное количество", "error");
			return;
		}

		try {
			const res = await fetch(`/api/inventory/${organizationId}/rules`, {
				method: "POST",
				headers: auth.denteClinicalReadHeaders({
					"Content-Type": "application/json",
				}),
				body: JSON.stringify({
					serviceId: selectedServiceId,
					inventoryItemId: selectedInventoryItemId,
					quantityToDeduct: qty,
				}),
			});

			if (res.ok) {
				showToast("Правило списания сохранено", "success");
				setSelectedInventoryItemId("");
				setQuantityToDeduct("1");
				fetchRules(selectedServiceId);
			} else {
				showToast("Ошибка сохранения правила", "error");
			}
		} catch (e) {
			console.error(e);
			showToast("Системная ошибка", "error");
		}
	};

	const handleDeleteRule = async (ruleId: string) => {
		setConfirmDialog({
			isOpen: true,
			title: "Удалить правило?",
			message: "Удалить это правило списания? Это действие необратимо.",
			onConfirm: async () => {
				setConfirmDialog(null);
				try {
					const res = await fetch(`/api/inventory/${organizationId}/rules/${ruleId}`, {
						method: "DELETE",
						headers: auth.denteClinicalReadHeaders(),
					});

					if (res.ok) {
						showToast("Правило списания удалено", "success");
						fetchRules(selectedServiceId);
					} else {
						showToast("Ошибка удаления правила", "error");
					}
				} catch (e) {
					console.error(e);
					showToast("Системная ошибка", "error");
				}
			}
		});
	};

	const [searchQuery, setSearchQuery] = useState("");

	// Add/Edit Modal
	const [showModal, setShowModal] = useState(false);
	const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
	const [formData, setFormData] = useState({
		name: "",
		threshold: "5",
		unitCostRub: "0",
		sku: "",
		barcode: "",
	});

	// Confirm Dialog State
	const [confirmDialog, setConfirmDialog] = useState<{
		isOpen: boolean;
		title: string;
		message: string;
		onConfirm: () => void;
	} | null>(null);

	// Adjust Modal
	const [adjustingItem, setAdjustingItem] = useState<InventoryItem | null>(
		null,
	);
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
		setFormData({ name: "", threshold: "5", unitCostRub: "0", sku: "", barcode: "" });
		setShowModal(true);
	};

	const openEditModal = (item: InventoryItem) => {
		setEditingItem(item);
		setFormData({
			name: item.name,
			threshold: String(item.criticalThreshold),
			unitCostRub: item.unitCostRub || "0",
			sku: item.sku || "",
			barcode: item.barcode || "",
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
							sku: formData.sku.trim() || null,
							barcode: formData.barcode.trim() || null,
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
						sku: formData.sku.trim() || null,
						barcode: formData.barcode.trim() || null,
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
		setConfirmDialog({
			isOpen: true,
			title: "Удалить материал?",
			message: `Удалить «${name}» со склада? Это действие необратимо.`,
			onConfirm: async () => {
				setConfirmDialog(null);
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
			}
		});
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
					<h3 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: "var(--ink)" }}>
						🛠️ Выберите услугу для настройки правил списания
					</h3>
					<select
						value={selectedServiceId}
						onChange={(e) => setSelectedServiceId(e.target.value)}
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
								[{s.code || "Без кода"}] {s.title} ({s.basePriceRub} ₽)
							</option>
						))}
					</select>
				</div>

				{selectedServiceId && (
					<div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
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
							<h4 style={{ margin: 0, fontSize: 15, fontWeight: 600, color: "var(--ink)" }}>
								Добавить материал для списания
							</h4>
							<div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
								<label style={{ fontSize: 12, color: "var(--muted)", fontWeight: 500 }}>
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
								<label style={{ fontSize: 12, color: "var(--muted)", fontWeight: 500 }}>
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
							<button
								type="submit"
								className="primary-button"
								style={{ alignSelf: "flex-start", marginTop: 8 }}
							>
								<Plus size={16} /> Добавить материал в расходники
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
							<h4 style={{ margin: 0, fontSize: 15, fontWeight: 600, color: "var(--ink)" }}>
								Привязанные расходники
							</h4>

							{isLoadingRules ? (
								<p style={{ color: "var(--muted)", fontSize: 13 }}>Загрузка правил списания...</p>
							) : rulesList.length === 0 ? (
								<p style={{ color: "var(--muted)", fontSize: 13 }}>
									Для этой услуги пока не настроено автоматическое списание материалов. При завершении
									приема материалы списываться не будут.
								</p>
							) : (
								<div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
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
												<div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>
													Списание: {rule.quantityToDeduct} шт. | Текущий остаток:{" "}
													{rule.stockQuantity} шт.
												</div>
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
					<p
						style={{ color: "var(--muted)", margin: "4px 0 0 0", fontSize: 14 }}
					>
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
						background: activeSubTab === "inventory" ? "rgba(20, 184, 166, 0.1)" : "transparent",
						border: "none",
						color: activeSubTab === "inventory" ? "var(--teal, #14b8a6)" : "var(--muted)",
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
						background: activeSubTab === "rules" ? "rgba(20, 184, 166, 0.1)" : "transparent",
						border: "none",
						color: activeSubTab === "rules" ? "var(--teal, #14b8a6)" : "var(--muted)",
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
								<td
									colSpan={5}
									style={{
										padding: 48,
										textAlign: "center",
										color: "var(--muted)",
									}}
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
												<span
													style={{ color: "var(--muted)", fontStyle: "italic" }}
												>
													—
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
											{item.expirationDate ? (
												<div style={{ display: "flex", flexDirection: "column" }}>
													<span style={{ 
														color: new Date(item.expirationDate) < new Date(Date.now() + 30*24*60*60*1000) ? "var(--tomato)" : "var(--ink)",
														fontWeight: new Date(item.expirationDate) < new Date(Date.now() + 30*24*60*60*1000) ? 600 : 400
													}}>
														Годен до: {new Date(item.expirationDate).toLocaleDateString("ru-RU")}
													</span>
													{item.lotNumber && <span style={{ fontSize: 12 }}>Партия: {item.lotNumber}</span>}
												</div>
											) : (
												<span style={{ fontStyle: "italic", opacity: 0.5 }}>Не указан</span>
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
												<span style={{ fontFamily: "monospace", background: "rgba(0,0,0,0.05)", padding: "2px 6px", borderRadius: 4 }}>
													{item.barcode}
												</span>
											) : (
												<span style={{ fontStyle: "italic", opacity: 0.5 }}>Нет</span>
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
				</>
			) : renderRulesTab()}

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
							{adjustAmount && !isNaN(parseInt(adjustAmount)) && (
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
										{Math.max(
											0,
											adjustingItem.stockQuantity +
												(adjustType === "in" ? 1 : -1) *
													(parseInt(adjustAmount) || 0),
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
