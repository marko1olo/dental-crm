/**
 * DENTE CRM — Kraft Package Registry Table Subcomponent
 * SanPiN 3.3686-21 Central Sterilization Package Ledger & Tracking
 *
 * Authority: .agents/THE_HAMMER_MASTER_PROMPT.md & Mandate 8b (Subcomponents <= 500 lines)
 */

import React from "react";
import {
	AlertTriangle,
	CheckCircle2,
	Clock,
	Download,
	Package,
	ShieldAlert,
	Trash2,
} from "lucide-react";
import type {
	KraftPackageRecord,
	KraftPackageStatus,
} from "./kraftPackageEngine";
import {
	getKraftMaterialDefinition,
	getKraftSizeDefinition,
} from "./kraftPackagePresets";

export interface KraftPackageRegistryTabProps {
	readonly packages: KraftPackageRecord[];
	readonly filteredPackages: KraftPackageRecord[];
	readonly stats: {
		totalPacks: number;
		sterileValidCount: number;
		expiringSoonCount: number;
		expiredCount: number;
		recalledCount: number;
	};
	readonly searchQuery: string;
	readonly onSearchQueryChange: (query: string) => void;
	readonly statusFilter: KraftPackageStatus | "all";
	readonly onStatusFilterChange: (status: KraftPackageStatus | "all") => void;
	readonly onExportCsv: () => void;
	readonly onToggleBreached: (id: string) => void;
	readonly onDeletePackage: (id: string) => void;
}

export const KraftPackageRegistryTab: React.FC<KraftPackageRegistryTabProps> = ({
	packages,
	filteredPackages,
	stats,
	searchQuery,
	onSearchQueryChange,
	statusFilter,
	onStatusFilterChange,
	onExportCsv,
	onToggleBreached,
	onDeletePackage,
}) => {
	return (
		<div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
			{/* KPI Strip */}
			<div
				style={{
					display: "grid",
					gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
					gap: "0.75rem",
				}}
			>
				<div className="kraft-panel-card" style={{ padding: "0.75rem" }}>
					<span style={{ fontSize: "0.75rem", color: "var(--muted)" }}>
						Всего в партии
					</span>
					<span style={{ fontSize: "1.4rem", fontWeight: 800 }}>
						{stats.totalPacks} шт.
					</span>
				</div>
				<div className="kraft-panel-card" style={{ padding: "0.75rem" }}>
					<span style={{ fontSize: "0.75rem", color: "#059669" }}>
						Стерильно (валидно)
					</span>
					<span
						style={{ fontSize: "1.4rem", fontWeight: 800, color: "#059669" }}
					>
						{stats.sterileValidCount} шт.
					</span>
				</div>
				<div className="kraft-panel-card" style={{ padding: "0.75rem" }}>
					<span style={{ fontSize: "0.75rem", color: "#d97706" }}>
						Истекает (≤7 дн.)
					</span>
					<span
						style={{ fontSize: "1.4rem", fontWeight: 800, color: "#d97706" }}
					>
						{stats.expiringSoonCount} шт.
					</span>
				</div>
				<div className="kraft-panel-card" style={{ padding: "0.75rem" }}>
					<span style={{ fontSize: "0.75rem", color: "#dc2626" }}>
						Просрочено / Брак
					</span>
					<span
						style={{ fontSize: "1.4rem", fontWeight: 800, color: "#dc2626" }}
					>
						{stats.expiredCount + stats.recalledCount} шт.
					</span>
				</div>
			</div>

			{/* Toolbar */}
			<div
				style={{
					display: "flex",
					justifyContent: "space-between",
					alignItems: "center",
					flexWrap: "wrap",
					gap: "0.75rem",
				}}
			>
				<div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
					<input
						type="text"
						placeholder="Поиск по набору, штрихкоду, автоклаву..."
						value={searchQuery}
						onChange={(e) => onSearchQueryChange(e.target.value)}
						style={{
							minHeight: "44px",
							minWidth: "260px",
							padding: "0.5rem 0.75rem",
							borderRadius: "8px",
							border: "1px solid var(--line, #e2e8f0)",
							background: "var(--paper, #fff)",
							color: "var(--ink, #0f172a)",
							fontSize: "0.85rem",
						}}
					/>
					<select
						value={statusFilter}
						onChange={(e) => onStatusFilterChange(e.target.value as any)}
						style={{
							minHeight: "44px",
							padding: "0.5rem",
							borderRadius: "8px",
							border: "1px solid var(--line, #e2e8f0)",
							background: "var(--paper, #fff)",
							color: "var(--ink, #0f172a)",
							fontSize: "0.85rem",
						}}
					>
						<option value="all">Все статусы</option>
						<option value="sterile_valid">Стерильно</option>
						<option value="expiring_soon_7d">Истекает (≤7 дн.)</option>
						<option value="expired">Просрочено</option>
						<option value="recalled">Отозвано / Нарушено</option>
					</select>
				</div>

				<div style={{ display: "flex", gap: "0.5rem" }}>
					<button
						type="button"
						onClick={onExportCsv}
						className="kraft-btn kraft-btn-secondary"
					>
						<Download size={16} /> Экспорт CSV
					</button>
				</div>
			</div>

			{/* Table */}
			<div className="kraft-table-container">
				<table className="kraft-table">
					<thead>
						<tr>
							<th>Штрихкод</th>
							<th>Наименование набора</th>
							<th>Упаковка / Размер</th>
							<th>Стерилизация</th>
							<th>Годен до</th>
							<th>Остаток</th>
							<th>Статус</th>
							<th>Автоклав</th>
							<th>Действия</th>
						</tr>
					</thead>
					<tbody>
						{packages.length === 0 ? (
							<tr>
								<td
									colSpan={9}
									style={{
										textAlign: "center",
										padding: "3rem 1.5rem",
										color: "var(--muted)",
									}}
								>
									<Package
										size={36}
										style={{ margin: "0 auto 0.5rem auto", opacity: 0.4 }}
									/>
									<div
										style={{
											fontWeight: 600,
											fontSize: "0.95rem",
											color: "var(--ink)",
										}}
									>
										Реестр крафт-пакетов пуст
									</div>
									<div style={{ fontSize: "0.825rem", marginTop: "0.25rem" }}>
										Сформируйте новую партию во вкладке «1. Новая партия» для
										маркировки и печати этикеток.
									</div>
								</td>
							</tr>
						) : filteredPackages.length === 0 ? (
							<tr>
								<td
									colSpan={9}
									style={{
										textAlign: "center",
										padding: "2rem",
										color: "var(--muted)",
									}}
								>
									Нет записей в реестре по заданным фильтрам.
								</td>
							</tr>
						) : (
							filteredPackages.map((pack) => (
								<tr key={pack.id}>
									<td style={{ fontFamily: "monospace", fontWeight: 700 }}>
										{pack.barcode128}
									</td>
									<td>
										<div style={{ fontWeight: 600 }}>{pack.toolSetNameRu}</div>
										<div style={{ fontSize: "0.8rem", color: "var(--muted)" }}>
											{pack.batchId} #{pack.serialNumber}
										</div>
									</td>
									<td>
										<div>
											{getKraftMaterialDefinition(pack.packageType).shortLabelRu}
										</div>
										<div style={{ fontSize: "0.8rem", color: "var(--muted)" }}>
											{getKraftSizeDefinition(pack.packageSize).dimensionsMmRu}
										</div>
									</td>
									<td>{pack.packDate}</td>
									<td style={{ fontWeight: 700 }}>{pack.expDate}</td>
									<td>{pack.daysRemaining} дн.</td>
									<td>
										<span className={`kraft-status-badge ${pack.status}`}>
											{pack.status === "sterile_valid" && (
												<CheckCircle2 size={12} />
											)}
											{pack.status === "expiring_soon_7d" && (
												<Clock size={12} />
											)}
											{pack.status === "expired" && (
												<AlertTriangle size={12} />
											)}
											{pack.status === "recalled" && (
												<ShieldAlert size={12} />
											)}
											{pack.status === "sterile_valid" && "Стерильно"}
											{pack.status === "expiring_soon_7d" && "Истекает"}
											{pack.status === "expired" && "Просрочено"}
											{pack.status === "recalled" && "Отозвано"}
										</span>
									</td>
									<td>
										<span
											style={{
												fontSize: "0.75rem",
												background: "var(--paper-strong)",
												padding: "2px 6px",
												borderRadius: "4px",
											}}
										>
											{pack.autoclaveId} / Ц#{pack.cycleNumber}
										</span>
									</td>
									<td>
										<div style={{ display: "flex", gap: "4px" }}>
											<button
												type="button"
												onClick={() => onToggleBreached(pack.id)}
												title={
													pack.isBreached
														? "Восстановить статус"
														: "Отметить нарушение целостности"
												}
												style={{
													background: "none",
													border: "none",
													cursor: "pointer",
													color: pack.isBreached ? "#059669" : "#dc2626",
													padding: "4px",
												}}
											>
												<ShieldAlert size={16} />
											</button>
											<button
												type="button"
												onClick={() => onDeletePackage(pack.id)}
												title="Удалить запись"
												style={{
													background: "none",
													border: "none",
													cursor: "pointer",
													color: "var(--muted)",
													padding: "4px",
												}}
											>
												<Trash2 size={16} />
											</button>
										</div>
									</td>
								</tr>
							))
						)}
					</tbody>
				</table>
			</div>
		</div>
	);
};

export default KraftPackageRegistryTab;
