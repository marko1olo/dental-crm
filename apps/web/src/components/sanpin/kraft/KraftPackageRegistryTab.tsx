import React from "react";
import { Package } from "lucide-react";
import type {
	KraftPackageRecord,
	KraftPackageStatus,
} from "./kraftPackageEngine.js";
import { KraftPackageKpiCards } from "./KraftPackageKpiCards.js";
import { KraftPackageTableRow } from "./KraftPackageTableRow.js";
import { KraftPackageToolbar } from "./KraftPackageToolbar.js";

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
			<KraftPackageKpiCards stats={stats} />

			<KraftPackageToolbar
				searchQuery={searchQuery}
				onSearchQueryChange={onSearchQueryChange}
				statusFilter={statusFilter}
				onStatusFilterChange={onStatusFilterChange}
				onExportCsv={onExportCsv}
			/>

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
								<td colSpan={9} style={{ textAlign: "center", padding: "3rem 1.5rem", color: "var(--muted)" }}>
									<Package size={36} style={{ margin: "0 auto 0.5rem auto", opacity: 0.4 }} />
									<div style={{ fontWeight: 600, fontSize: "0.95rem", color: "var(--ink)" }}>
										Реестр крафт-пакетов пуст
									</div>
									<div style={{ fontSize: "0.825rem", marginTop: "0.25rem" }}>
										Сформируйте новую партию во вкладке «1. Новая партия» для маркировки и печати этикеток.
									</div>
								</td>
							</tr>
						) : filteredPackages.length === 0 ? (
							<tr>
								<td colSpan={9} style={{ textAlign: "center", padding: "2rem", color: "var(--muted)" }}>
									Нет записей в реестре по заданным фильтрам.
								</td>
							</tr>
						) : (
							filteredPackages.map((pack) => (
								<KraftPackageTableRow
									key={pack.id}
									pack={pack}
									onToggleBreached={onToggleBreached}
									onDeletePackage={onDeletePackage}
								/>
							))
						)}
					</tbody>
				</table>
			</div>
		</div>
	);
};

export default KraftPackageRegistryTab;
