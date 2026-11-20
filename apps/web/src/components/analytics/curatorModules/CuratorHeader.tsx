import React from "react";
import { UserCheck } from "lucide-react";

export interface CuratorOption {
	readonly id: string;
	readonly fullName?: string | null | undefined;
	readonly name?: string | null | undefined;
}

export interface CuratorHeaderProps {
	readonly staffCurators: readonly CuratorOption[];
	readonly selectedCuratorId: string;
	readonly onSelectCuratorId: (id: string) => void;
}

export const CuratorHeader: React.FC<CuratorHeaderProps> = ({
	staffCurators,
	selectedCuratorId,
	onSelectCuratorId,
}) => {
	return (
		<div className="curator-dashboard-header">
			<div className="curator-header-title-group">
				<div className="curator-header-icon">
					<UserCheck className="w-6 h-6" />
				</div>
				<div>
					<h2 className="curator-header-title">Куратор планов лечения</h2>
					<p className="curator-header-subtitle">
						Сквозное ведение пациентов от консультации до 100% оплаты
					</p>
				</div>
			</div>

			<div className="curator-header-controls">
				<label
					htmlFor="curator-select"
					className="text-[13px] font-semibold text-[var(--ink-muted)]"
				>
					Куратор:
				</label>
				<select
					id="curator-select"
					value={selectedCuratorId}
					onChange={(e) => onSelectCuratorId(e.target.value)}
					className="curator-select-input"
				>
					<option value="all">Все кураторы клиники</option>
					{staffCurators.map((c) => (
						<option key={c.id} value={c.id}>
							{c.fullName || c.name}
						</option>
					))}
				</select>
			</div>
		</div>
	);
};
