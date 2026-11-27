import { CheckCircle2, FileCheck, History } from "lucide-react";
import type React from "react";
import type { WarrantyCalculationResult, WarrantyItem, WarrantyRiskFactors } from "../warrantyEngine.js";
import type { StarQuickPreset, WarrantyCategory } from "../warrantyPresets.js";
import type { CompletedTreatmentStage, HistoricalWarrantyCertificate } from "./types";
import { WarrantyTeethFormula } from "./itemsStep/WarrantyTeethFormula";
import { WarrantyCategoryPresetsBar } from "./itemsStep/WarrantyCategoryPresetsBar";
import { WarrantyItemFormInputs } from "./itemsStep/WarrantyItemFormInputs";
import { WarrantyItemsTable } from "./itemsStep/WarrantyItemsTable";
import { WarrantyRiskFactorsPanel } from "./itemsStep/WarrantyRiskFactorsPanel";

export interface WarrantyItemsStepProps {
	completedStages?: CompletedTreatmentStage[] | undefined;
	onOpenRemediation: () => void;
	onImportCompletedStages: () => void | 0;
	selectedTeeth: string[];
	onToggleTooth: (tooth: string) => void;
	items: WarrantyItem[];
	activeCategory: WarrantyCategory;
	currentWorkTitle: string;
	onWorkTitleChange: (val: string) => void;
	currentMaterial: string;
	onMaterialChange: (val: string) => void;
	currentManufacturer: string;
	onManufacturerChange: (val: string) => void;
	currentShade: string;
	onShadeChange: (val: string) => void;
	currentLot: string;
	onLotChange: (val: string) => void;
	currentServiceCode804n: string;
	onServiceCode804nChange: (val: string) => void;
	currentLabOrderNumber: string;
	onLabOrderNumberChange: (val: string) => void;
	onApplyStarQuickPreset: (qp: StarQuickPreset) => void;
	onSelectCategory: (cat: WarrantyCategory) => void;
	onAddItem: () => void;
	onRemoveItem: (id: string) => void;
	riskFactors: WarrantyRiskFactors;
	onRiskFactorsChange: React.Dispatch<React.SetStateAction<WarrantyRiskFactors>>;
	calculation: WarrantyCalculationResult;
	historicalCertificates?: HistoricalWarrantyCertificate[] | undefined;
	isLoadingHistory?: boolean | undefined;
	activeCertificateId?: string | undefined;
	onSelectHistoricalCertificate?: ((cert: HistoricalWarrantyCertificate) => void) | undefined;
}

function formatCertificateDateRu(isoStr: string): string {
	const d = new Date(isoStr);
	if (Number.isNaN(d.getTime())) return isoStr;
	return d.toLocaleDateString("ru-RU");
}

function formatCertificateStatusRu(status: string): string {
	if (status === "active") return "Активен";
	if (status === "conditional") return "Условная";
	if (status === "voided") return "Приостановлен";
	return status;
}

export const WarrantyItemsStep: React.FC<WarrantyItemsStepProps> = (props) => {
	const {
		completedStages,
		onImportCompletedStages,
		historicalCertificates = [],
		isLoadingHistory = false,
		activeCertificateId,
		onSelectHistoricalCertificate,
	} = props;

	return (
		<div className="warranty-studio-grid">
			<div className="warranty-studio-main">
				{/* Баннер импорта из завершенных этапов плана лечения (если есть) */}
				{completedStages && completedStages.length > 0 && (
					<div className="warranty-stages-import-banner">
						<div className="warranty-stages-banner-left">
							<FileCheck size={18} style={{ color: "var(--teal)", flexShrink: 0 }} />
							<div>
								<strong>Завершенные этапы плана лечения ({completedStages.length} поз.)</strong>
								<p>Формирование гарантийного паспорта по всем выполненным манипуляциям</p>
							</div>
						</div>
						<button
							type="button"
							className="warranty-btn-secondary dente-btn-secondary"
							onClick={onImportCompletedStages}
						>
							<CheckCircle2 size={14} style={{ color: "var(--ok-fg)" }} />
							Заполнить из плана ({completedStages.length})
						</button>
					</div>
				)}

				{/* История оформленных гарантийных паспортов пациента (0px шума если пусто) */}
				{isLoadingHistory ? (
					<div
						className="h-14 rounded-xl border border-[var(--line)] bg-[var(--paper-soft)] animate-pulse"
						data-testid="warranty-history-skeleton"
						aria-label="Загрузка истории гарантийных паспортов"
					/>
				) : historicalCertificates.length > 0 ? (
					<div className="warranty-card-section" data-testid="warranty-history-list">
						<div className="warranty-section-header">
							<h4>
								<History size={16} />
								Ранее оформленные паспорта пациента ({historicalCertificates.length})
							</h4>
						</div>
						<div className="flex flex-wrap gap-2">
							{historicalCertificates.map((cert) => {
								const isSelected = activeCertificateId === cert.certificateNumber;
								return (
									<button
										key={cert.id}
										type="button"
										onClick={() => onSelectHistoricalCertificate?.(cert)}
										className={`w-full sm:w-auto min-h-[44px] sm:min-h-[36px] px-3 py-1.5 rounded-lg border text-xs flex flex-wrap items-center justify-between gap-2 text-left transition-colors cursor-pointer ${
											isSelected
												? "border-[var(--primary)] bg-[var(--teal-soft)] text-[var(--ink)] font-semibold"
												: "border-[var(--line)] bg-[var(--paper)] hover:bg-[var(--paper-soft)] text-[var(--ink)]"
										}`}
										data-testid={`warranty-history-item-${cert.certificateNumber}`}
									>
										<span className="font-mono font-semibold break-all">{cert.certificateNumber}</span>
										<span className="inline-flex items-center gap-2 shrink-0 ml-auto whitespace-nowrap">
											<span className="text-[var(--ink-muted)]">{formatCertificateDateRu(cert.issuedAt)}</span>
											<span className="text-[var(--ink-muted)]">{cert.warrantyMonths} мес.</span>
											<span
												className={`h-6 px-2 text-xs font-medium rounded-full inline-flex items-center shrink-0 ${
													cert.status === "active"
														? "bg-[var(--success-soft)] text-[var(--ok-fg,#059669)]"
														: cert.status === "conditional"
															? "bg-[var(--warn-bg)] text-[var(--warn-fg)]"
															: "bg-[var(--danger-soft)] text-[var(--danger)]"
												}`}
											>
												{formatCertificateStatusRu(cert.status)}
											</span>
										</span>
									</button>
								);
							})}
						</div>
					</div>
				) : null}

				{/* 1. Зубная формула FDI */}
				<WarrantyTeethFormula
					selectedTeeth={props.selectedTeeth}
					items={props.items}
					onToggleTooth={props.onToggleTooth}
				/>

				{/* 2. Категория и готовые пресеты клиники */}
				<WarrantyCategoryPresetsBar
					activeCategory={props.activeCategory}
					currentWorkTitle={props.currentWorkTitle}
					onApplyStarQuickPreset={props.onApplyStarQuickPreset}
					onSelectCategory={props.onSelectCategory}
				/>

				{/* 3. Параметры материала, оттенка VITA и добавление */}
				<WarrantyItemFormInputs {...props} />

				{/* 4. Таблица позиций гарантийного сертификата */}
				<WarrantyItemsTable
					items={props.items}
					calculation={props.calculation}
					onRemoveItem={props.onRemoveItem}
				/>

				{/* 5. Клинические условия и факторы риска (компактный аккордеон, 0px шума для 99% нормы) */}
				<WarrantyRiskFactorsPanel
					riskFactors={props.riskFactors}
					onRiskFactorsChange={props.onRiskFactorsChange}
					calculation={props.calculation}
				/>
			</div>
		</div>
	);
};
