import { Plus, QrCode, ShieldCheck, Sparkles } from "lucide-react";
import React from "react";

export interface AutoclaveRegisterEmptyStateProps {
	readonly hasDevices: boolean;
	readonly onOpenEquipmentModal: () => void;
	readonly onOpenNewCycleModal?: () => void;
	readonly onOpenJournal257Modal: () => void;
	readonly onOpenKraftModal: () => void;
}

export function AutoclaveRegisterEmptyState({
	hasDevices,
	onOpenEquipmentModal,
	onOpenNewCycleModal,
	onOpenJournal257Modal,
	onOpenKraftModal,
}: AutoclaveRegisterEmptyStateProps) {
	if (!hasDevices) {
		return (
			<tr>
				<td colSpan={9} style={{ textAlign: "center", padding: "3rem 1.5rem" }}>
					<div
						style={{
							display: "flex",
							flexDirection: "column",
							alignItems: "center",
							gap: "0.75rem",
							maxWidth: "560px",
							margin: "0 auto",
						}}
					>
						<ShieldCheck size={42} color="var(--teal, #0d9488)" />
						<div style={{ fontWeight: 700, fontSize: "1.1rem", color: "var(--ink, #0f172a)" }}>
							В клинике не зарегистрировано автоклавов
						</div>
						<div style={{ fontSize: "0.875rem", color: "var(--muted, #64748b)", lineHeight: 1.45 }}>
							Зарегистрируйте автоклав или сухожаровой шкаф клиники для ведения журнала
							стерилизации и генерации крафт-пакетов.
						</div>
						<button
							type="button"
							onClick={onOpenEquipmentModal}
							className="sanpin-btn sanpin-btn-primary"
							style={{
								minHeight: "44px",
								padding: "0.5rem 1.5rem",
								fontSize: "0.875rem",
								fontWeight: 700,
								display: "inline-flex",
								alignItems: "center",
								gap: "0.4rem",
								marginTop: "0.25rem",
							}}
							data-testid="add-first-autoclave-table-btn"
						>
							<Plus size={16} /> <span>Зарегистрировать автоклав клиники</span>
						</button>
					</div>
				</td>
			</tr>
		);
	}

	return (
		<tr>
			<td colSpan={9} style={{ textAlign: "center", padding: "3rem 1.5rem" }}>
				<div
					style={{
						display: "flex",
						flexDirection: "column",
						alignItems: "center",
						gap: "0.75rem",
						maxWidth: "560px",
						margin: "0 auto",
					}}
				>
					<Sparkles size={36} color="var(--teal, #0d9488)" />
					<div style={{ fontWeight: 700, fontSize: "1rem", color: "var(--ink, #0f172a)" }}>
						Журнал стерилизации пуст
					</div>
					<div style={{ fontSize: "0.825rem", color: "var(--muted, #64748b)", lineHeight: 1.45 }}>
						В выбранном периоде нет записей циклов стерилизации. Запустите новый цикл
						или сформируйте партию крафт-пакетов.
					</div>
					<div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", justifyContent: "center" }}>
						<button
							type="button"
							onClick={onOpenNewCycleModal || onOpenJournal257Modal}
							className="sanpin-btn sanpin-btn-primary"
							style={{
								minHeight: "38px",
								padding: "0.4rem 1rem",
								fontSize: "0.825rem",
								fontWeight: 700,
								display: "inline-flex",
								alignItems: "center",
								gap: "0.35rem",
							}}
							data-testid="empty-state-new-cycle-btn"
						>
							<Plus size={14} /> Внести цикл стерилизации
						</button>
						<button
							type="button"
							onClick={onOpenKraftModal}
							className="sanpin-btn sanpin-btn-secondary"
							style={{
								minHeight: "38px",
								padding: "0.4rem 1rem",
								fontSize: "0.825rem",
								fontWeight: 600,
								display: "inline-flex",
								alignItems: "center",
								gap: "0.35rem",
							}}
						>
							<QrCode size={14} /> Печать крафт-пакетов
						</button>
					</div>
				</div>
			</td>
		</tr>
	);
}
