import React from "react";
import type { GeneratedDocument } from "@dental/shared";
import type { ContractFilterType } from "./types";

export interface PatientContractsFilterTabsProps {
	activeFilter: ContractFilterType;
	setActiveFilter: (filter: ContractFilterType) => void;
	paidContracts: GeneratedDocument[];
}

export const PatientContractsFilterTabs: React.FC<PatientContractsFilterTabsProps> = ({
	activeFilter,
	setActiveFilter,
	paidContracts,
}) => {
	const issuedCount = paidContracts.filter((c) => c.status === "issued").length;
	const draftCount = paidContracts.filter((c) => c.status === "draft").length;

	return (
		<div className="flex items-center justify-between text-xs">
			<div className="inline-flex p-1 rounded-lg bg-[var(--paper-soft)] border border-[var(--line)] gap-1">
				<button
					type="button"
					onClick={() => setActiveFilter("all")}
					className={`px-2.5 py-1 rounded-md font-medium transition cursor-pointer ${
						activeFilter === "all"
							? "bg-[var(--paper)] text-[var(--ink)] shadow-xs"
							: "text-[var(--muted)] hover:text-[var(--ink)]"
					}`}
				>
					Все ({paidContracts.length})
				</button>
				<button
					type="button"
					onClick={() => setActiveFilter("issued")}
					className={`px-2.5 py-1 rounded-md font-medium transition cursor-pointer ${
						activeFilter === "issued"
							? "bg-[var(--paper)] text-[var(--ink)] shadow-xs"
							: "text-[var(--muted)] hover:text-[var(--ink)]"
					}`}
				>
					Подписанные ({issuedCount})
				</button>
				<button
					type="button"
					onClick={() => setActiveFilter("draft")}
					className={`px-2.5 py-1 rounded-md font-medium transition cursor-pointer ${
						activeFilter === "draft"
							? "bg-[var(--paper)] text-[var(--ink)] shadow-xs"
							: "text-[var(--muted)] hover:text-[var(--ink)]"
					}`}
				>
					Черновики ({draftCount})
				</button>
			</div>
		</div>
	);
};
