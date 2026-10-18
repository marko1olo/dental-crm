import React from "react";
import { Check, ShieldCheck, Sparkles } from "lucide-react";

export interface DoctorCabinetHandoverHeaderProps {
	readonly cabinetName: string;
	readonly doctorFullName: string;
	readonly nextDoctorName: string;
	readonly checkedCount: number;
	readonly totalCount: number;
	readonly allChecked: boolean;
	readonly onCheckAllNorma: () => void;
}

export const DoctorCabinetHandoverHeader: React.FC<DoctorCabinetHandoverHeaderProps> = ({
	cabinetName,
	doctorFullName,
	nextDoctorName,
	checkedCount,
	totalCount,
	allChecked,
	onCheckAllNorma,
}) => (
	<div
		style={{
			display: "flex",
			alignItems: "center",
			justifyContent: "space-between",
			gap: "10px",
			flexWrap: "wrap",
		}}
	>
		<div style={{ display: "flex", alignItems: "center", gap: "10px", minWidth: 0 }}>
			<div
				style={{
					width: "34px",
					height: "34px",
					borderRadius: "10px",
					background: "var(--teal-surface, rgba(13, 148, 136, 0.1))",
					color: "var(--teal-dark, #0f766e)",
					display: "flex",
					alignItems: "center",
					justifyContent: "center",
					flexShrink: 0,
				}}
			>
				<Sparkles size={17} aria-hidden="true" />
			</div>
			<div style={{ minWidth: 0 }}>
				<h3 style={{ margin: 0, fontSize: "14px", fontWeight: 700, color: "var(--ink)", lineHeight: 1.25 }}>
					Передача кабинета и стерилизация
				</h3>
				<p style={{ margin: "1px 0 0", fontSize: "12px", color: "var(--muted)", lineHeight: 1.35 }}>
					{cabinetName} · Сдал: {doctorFullName} · Принимает: {nextDoctorName}
				</p>
			</div>
		</div>

		<div style={{ display: "flex", alignItems: "center", gap: "8px", flexShrink: 0 }}>
			<span
				className={`status-pill ${allChecked ? "status-in_treatment" : "status-pending"}`}
				style={{
					fontSize: "11px",
					fontWeight: 700,
					display: "inline-flex",
					alignItems: "center",
					gap: "4px",
				}}
			>
				<ShieldCheck size={12} aria-hidden="true" />
				Готовность: {checkedCount} из {totalCount}
			</span>
			<button
				type="button"
				onClick={onCheckAllNorma}
				className="secondary-button"
				style={{
					fontSize: "13px",
					fontWeight: 600,
					padding: "0 12px",
					height: "36px",
					borderRadius: "8px",
					display: "inline-flex",
					alignItems: "center",
					gap: "6px",
					cursor: "pointer",
				}}
				title="Отметить все пункты санитарной подготовки выполненными"
				data-testid="btn-handover-norma-all"
			>
				<Check size={14} aria-hidden="true" />
				Все в норме
			</button>
		</div>
	</div>
);
