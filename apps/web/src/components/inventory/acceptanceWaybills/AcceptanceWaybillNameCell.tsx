import { AlertTriangle } from "lucide-react";
import type React from "react";

export interface AcceptanceWaybillNameCellProps {
	readonly name: string;
	readonly deficitStock?: number | undefined;
	readonly onChange: (name: string) => void;
}

export const AcceptanceWaybillNameCell: React.FC<AcceptanceWaybillNameCellProps> = ({
	name,
	deficitStock,
	onChange,
}) => {
	const hasOverdraft = deficitStock !== undefined && deficitStock < 0;

	return (
		<td>
			<input
				type="text"
				className="acceptance-table-input"
				value={name}
				onChange={(e) => onChange(e.target.value)}
				placeholder="Название материала"
			/>
			{hasOverdraft && (
				<div
					style={{ fontSize: 10, color: "var(--amber, #f59e0b)", display: "flex", alignItems: "center", gap: 3, marginTop: 2 }}
					title="Приход автоматически закрывает накопленный дефицит расхода"
				>
					<AlertTriangle size={10} />
					<span>Дефицит у кресла (овердрафт): {deficitStock} ед. (будет погашен)</span>
				</div>
			)}
		</td>
	);
};
