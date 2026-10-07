import { CheckCircle2, Package, Zap } from "lucide-react";
import type React from "react";
import {
	ALL_PROCEDURE_TECH_MAPS,
	CLINICAL_PROCEDURE_PACKAGES,
} from "./inventoryMath.js";

export interface ProcedureMaterialPackagesBarProps {
	readonly selectedMapCodes: readonly string[];
	readonly onApplyPackage: (codes: readonly string[]) => void;
	readonly onToggleTechMap: (code: string) => void;
}

export const ProcedureMaterialPackagesBar: React.FC<
	ProcedureMaterialPackagesBarProps
> = ({ selectedMapCodes, onApplyPackage, onToggleTechMap }) => {
	return (
		<>
			{/* 1-CLICK CLINICAL PACKAGES BAR (MANDATE 8e / 8k / 8n) */}
			<div
				className="inventory-clinical-packages-bar"
				data-testid="clinical-packages-bar"
			>
				<div className="inventory-clinical-packages-header">
					<span className="inventory-clinical-packages-label">
						<Zap size={14} className="shrink-0" />
						Клинические пакеты материалов:
					</span>
					<span className="inventory-clinical-packages-hint">
						СИЗ + Крафт + анестезия + протокол лечения
					</span>
				</div>
				<div className="inventory-packages-chips">
					{/* Экспресс-пресеты медсестры и врача (Мандат 8e п. 10, Мандат 8k, Мандат 8n) */}
					<button
						type="button"
						className={`inventory-package-btn btn-writeoff-anesthesia-packet ${
							selectedMapCodes.includes("A16.07.004") &&
							!selectedMapCodes.includes("A16.07.002.001") &&
							!selectedMapCodes.includes("A16.07.051")
								? "active"
								: ""
						}`}
						data-testid="preset-btn-anesthesia"
						data-testid-alt="btn-dispense-standard-anesthesia-kit"
						data-testid-package="btn-writeoff-anesthesia-packet"
						onClick={() => onApplyPackage(["SANPIN_PPE", "A16.07.004"])}
						title="Стандартный набор: анестезия 1.7 мл + карпульная игла + валики"
					>
						<Zap size={14} className="shrink-0 text-amber-500" />
						<span>Стандартная анестезия 1.7 мл + карпульная игла + валики</span>
					</button>

					<button
						type="button"
						className={`inventory-package-btn ${
							selectedMapCodes.includes("A16.07.002.001") ? "active" : ""
						}`}
						data-testid="preset-btn-caries"
						onClick={() =>
							onApplyPackage([
								"SANPIN_PPE",
								"SANPIN_KRAFT",
								"A16.07.004",
								"A16.07.002.001",
							])
						}
						title="Терапевтический набор (пломбирование зуба): СИЗ + Крафт + Анестезия + Композит/Адгезив"
					>
						<Package size={14} className="shrink-0" />
						<span>Терапевтический набор / Пломбирование зуба</span>
					</button>

					<button
						type="button"
						className={`inventory-package-btn btn-writeoff-hygiene-packet ${
							selectedMapCodes.includes("A16.07.051") ? "active" : ""
						}`}
						data-testid="preset-btn-hygiene"
						data-testid-package="btn-writeoff-hygiene-packet"
						onClick={() =>
							onApplyPackage(["SANPIN_PPE", "SANPIN_KRAFT", "A16.07.051"])
						}
						title="Профгигиена: СИЗ + Крафт + Air-Flow + Паста + Оптрагейт"
					>
						<Package size={14} className="shrink-0" />
						<span>Профгигиена</span>
					</button>

					{CLINICAL_PROCEDURE_PACKAGES.map((pkg) => {
						const isPackageActive = pkg.codes.every((c) =>
							selectedMapCodes.includes(c),
						);
						return (
							<button
								key={pkg.id}
								type="button"
								className={`inventory-package-btn ${isPackageActive ? "active" : ""}`}
								data-testid={`package-btn-${pkg.id}`}
								onClick={() => onApplyPackage(pkg.codes)}
								title={`${pkg.title}: ${pkg.description}`}
							>
								{isPackageActive ? (
									<CheckCircle2 size={15} className="shrink-0" />
								) : (
									<Package size={14} className="shrink-0 opacity-70" />
								)}
								<span>{pkg.title}</span>
							</button>
						);
					})}
				</div>
			</div>

			{/* TECH MAP SELECTOR BAR */}
			<div className="inventory-tech-maps-bar">
				<div className="inventory-tech-maps-label">
					Технологические карты процедур:
				</div>
				<div
					className="inventory-tech-maps-chips"
					style={{
						display: "flex",
						flexWrap: "nowrap",
						overflowX: "auto",
						scrollbarWidth: "none",
						gap: "8px",
						paddingBottom: "4px",
					}}
				>
					{ALL_PROCEDURE_TECH_MAPS.map((tm) => {
						const isActive = selectedMapCodes.includes(tm.code);
						return (
							<button
								key={tm.id}
								type="button"
								className={`inventory-tech-map-chip ${isActive ? "active" : ""}`}
								style={{
									flexShrink: 0,
									whiteSpace: "nowrap",
									minWidth: "max-content",
								}}
								onClick={() => onToggleTechMap(tm.code)}
							>
								{isActive && <CheckCircle2 size={16} />}
								{tm.title}
							</button>
						);
					})}
				</div>
			</div>
		</>
	);
};
