import { Printer } from "lucide-react";
import React from "react";

export interface BactericidalLogTableProps {
	readonly logs: any[];
	readonly equipments: any[];
	readonly selectedEquipId: string;
	readonly setSelectedEquipId: (id: string) => void;
	readonly loading: boolean;
	readonly onPrintJournal: () => void;
}

export function BactericidalLogTable({
	logs,
	equipments,
	selectedEquipId,
	setSelectedEquipId,
	loading,
	onPrintJournal,
}: BactericidalLogTableProps) {
	return (
		<div className="sanpin-table-wrapper" style={{ marginTop: "0.5rem" }}>
			<div
				className="sanpin-table-toolbar"
				style={{
					display: "flex",
					alignItems: "center",
					justifyContent: "space-between",
					gap: "0.5rem",
					padding: "0.35rem 0.65rem",
					background: "var(--paper-soft, #f8fafc)",
					borderBottom: "1px solid var(--line, #e2e8f0)",
					flexWrap: "wrap",
				}}
			>
				<div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexShrink: 0 }}>
					<span style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--muted, #64748b)" }}>Фильтр:</span>
					<select
						value={selectedEquipId}
						onChange={(e) => setSelectedEquipId(e.target.value)}
						className="sanpin-select"
						style={{ minHeight: "44px", height: "44px", fontSize: "0.85rem", padding: "0.4rem 0.75rem", borderRadius: "8px" }}
					>
						<option value="all">Все облучатели клиники</option>
						{equipments.map((e) => (
							<option key={e.id} value={e.id}>
								{e.roomName} ({e.deviceBrand})
							</option>
						))}
					</select>
				</div>
				<button
					type="button"
					onClick={onPrintJournal}
					className="sanpin-btn sanpin-btn-secondary touch-manipulation"
					style={{
						minHeight: "44px",
						height: "44px",
						padding: "0.4rem 0.85rem",
						fontSize: "0.85rem",
						fontWeight: 600,
						cursor: "pointer",
						whiteSpace: "nowrap",
						display: "inline-flex",
						alignItems: "center",
						gap: "0.35rem",
						borderRadius: "8px",
					}}
					title="1-клик выгрузка официального Журнала регистрации и контроля работы бактерицидной установки со штампами по Р 3.5.1904-04 и СанПиН 3.3686-21"
					data-testid="bactericidal-print-official-btn"
				>
					<Printer size={15} /> <span>Печать журнала (Р 3.5.1904-04)</span>
				</button>
			</div>
			<table className="sanpin-table">
				<thead>
					<tr>
						<th>Дата сеанса</th>
						<th>Кабинет / Аппарат</th>
						<th>Время включения / выключения</th>
						<th>Длительность (мин / ч)</th>
						<th>Режим обеззараживания</th>
						<th>Наработка после сеанса (ч)</th>
						<th>Ответственный</th>
					</tr>
				</thead>
				<tbody>
					{loading ? (
						<tr>
							<td colSpan={7} style={{ textAlign: "center", padding: "2rem" }}>
								Загрузка журнала сеансов...
							</td>
						</tr>
					) : logs.length === 0 ? (
						<tr>
							<td colSpan={7} style={{ textAlign: "center", padding: "2rem", color: "var(--muted)" }}>
								Сеансы бактерицидной обработки не зафиксированы.
							</td>
						</tr>
					) : (
						logs.map((log) => (
							<tr
								key={log.id}
								className="sanpin-log-row"
								style={{
									minHeight: "44px",
									contentVisibility: "auto",
									containIntrinsicSize: "1px 44px",
									contain: "content",
								}}
							>
								<td style={{ fontWeight: 600 }}>{log.date}</td>
								<td>
									<div>{log.roomName}</div>
									<div style={{ fontSize: "0.725rem", color: "var(--muted)" }}>
										{log.deviceBrand} (№{log.serialNumber})
									</div>
								</td>
								<td>
									{new Date(log.sessionStartTime).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}
									{" — "}
									{new Date(log.sessionEndTime).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}
								</td>
								<td>
									<span style={{ fontWeight: 600 }}>{log.durationMinutes} мин</span>
									<span style={{ fontSize: "0.75rem", color: "var(--muted)" }}> ({log.durationHours} ч)</span>
								</td>
								<td>
									<span className="sanpin-tag sanpin-tag-neutral">
										{log.operatingMode === "continuous_presence"
											? "В присутствии людей"
											: log.operatingMode === "pre_op_preparation"
												? "Предоперационная подготовка"
												: log.operatingMode === "post_cleaning"
													? "Заключительная после уборки"
													: "Периодический"}
									</span>
								</td>
								<td style={{ fontWeight: 600, color: "var(--brand-primary)" }}>
									{log.cumulativeHoursAfterSession} ч
								</td>
								<td style={{ fontSize: "0.8rem" }}>{log.operatorName || "Медсестра кабинета"}</td>
							</tr>
						))
					)}
				</tbody>
			</table>
		</div>
	);
}
