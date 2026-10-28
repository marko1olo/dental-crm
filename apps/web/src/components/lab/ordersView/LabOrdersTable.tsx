import React from "react";
import type { LabOrdersTableProps } from "./types";
import { LabOrdersTableHeader } from "./LabOrdersTableHeader";
import { LabOrdersTableRow } from "./LabOrdersTableRow";

export function LabOrdersTable(props: LabOrdersTableProps): React.JSX.Element {
	const { orders, ...rowProps } = props;

	return (
		<div
			className="w-full max-w-full overflow-x-auto rounded-xl border border-[var(--line)] bg-[var(--paper)] shadow-2xs"
			data-testid="lab-orders-table-container"
		>
			<table
				className="w-full text-left border-collapse table-fixed"
				data-testid="lab-orders-dense-table"
			>
				<LabOrdersTableHeader />
				<tbody className="divide-y divide-[var(--line)]">
					{orders.map((order) => (
						<LabOrdersTableRow key={order.id} order={order} {...rowProps} />
					))}
				</tbody>
			</table>
		</div>
	);
}
