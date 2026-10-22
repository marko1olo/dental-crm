import React from "react";
import type { EndoCanalData } from "../../endo/EndoCanalLogModal";
import { ToothEndoCanalRow } from "./ToothEndoCanalRow";

export interface ToothEndoCanalsTableProps {
	canals: EndoCanalData[];
	onCanalChange: (id: string, field: keyof EndoCanalData, value: string | number) => void;
	onRemoveCanal: (id: string) => void;
}

export const ToothEndoCanalsTable: React.FC<ToothEndoCanalsTableProps> = ({
	canals,
	onCanalChange,
	onRemoveCanal,
}) => {
	return (
		<div className="dente-canals-table-wrapper">
			<table className="dente-canals-table">
				<thead>
					<tr>
						<th>Канал</th>
						<th>Репер</th>
						<th>WL (мм)</th>
						<th>MAF (ISO)</th>
						<th>Конусность</th>
						<th>Обтурация</th>
						<th style={{ width: 48 }}></th>
					</tr>
				</thead>
				<tbody>
					{canals.map((c) => (
						<ToothEndoCanalRow
							key={c.id}
							canal={c}
							onCanalChange={onCanalChange}
							onRemoveCanal={onRemoveCanal}
						/>
					))}
				</tbody>
			</table>
		</div>
	);
};
