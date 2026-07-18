import { Plus, Trash2 } from "lucide-react";
import type React from "react";
import type { InventoryItem } from "./useInventoryLogic";

export interface InventoryRulesTabProps {
	dashboard: any;
	selectedServiceId: string;
	setSelectedServiceId: (val: string) => void;
	handleAddRule: (e: React.FormEvent) => void;
	selectedInventoryItemId: string;
	setSelectedInventoryItemId: (val: string) => void;
	items: InventoryItem[];
	quantityToDeduct: string;
	setQuantityToDeduct: (val: string) => void;
	isLoadingRules: boolean;
	rulesList: any[];
	handleDeleteRule: (id: string) => void;
}

export const InventoryRulesTab: React.FC<InventoryRulesTabProps> = ({
	dashboard,
	selectedServiceId,
	setSelectedServiceId,
	handleAddRule,
	selectedInventoryItemId,
	setSelectedInventoryItemId,
	items,
	quantityToDeduct,
	setQuantityToDeduct,
	isLoadingRules,
	rulesList,
	handleDeleteRule,
}) => {
	const paperBg = "var(--paper)";
	const paperSoftBg = "var(--paper-soft)";
	const borderColor = "var(--line)";
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

						{isLoadingRules ? (
							<p style={{ color: "var(--muted)", fontSize: 13 }}>
								Загрузка правил списания...
							</p>
						) : rulesList.length === 0 ? (
							<p style={{ color: "var(--muted)", fontSize: 13 }}>
								Для этой услуги пока не настроено автоматическое списание
								материалов. При завершении приема материалы списываться не
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
												Списание: {rule.quantityToDeduct} шт. | Текущий
												остаток: {rule.stockQuantity} шт.
											</div>
										</div>
										<button
											type="button"
											onClick={() => handleDeleteRule(rule.id)}
											style={{
												background: "transparent",
												border: "none",
												color: "var(--tomato)",
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
