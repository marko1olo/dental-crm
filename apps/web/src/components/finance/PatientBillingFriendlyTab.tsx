import React from "react";
import {
	QrCode,
	ShieldCheck,
	Sparkles,
	Stethoscope,
	Syringe,
	FileText,
	Layers,
} from "lucide-react";
import { type GroupedFriendlyBlock } from "../portal/patientCabinet/patientCareInstructionsEngine";
import {
	PatientBillingPlanStagePanel,
	type PatientBillingPlanStagePanelProps,
} from "./PatientBillingPlanStagePanel";
import {
	PatientBillingTenderPanel,
	type PatientBillingTenderPanelProps,
} from "./PatientBillingTenderPanel";

export * from "./PatientBillingPlanStagePanel";
export * from "./PatientBillingTenderPanel";

export interface PatientBillingPlanStage {
	readonly id: string;
	readonly stageNumber?: number | undefined;
	readonly title?: string | undefined;
	readonly titleRu?: string | undefined;
	readonly totalAmountRub?: number | undefined;
	readonly totalRub?: number | undefined;
	readonly totalPriceKopecks?: number | undefined;
	readonly status?: string | undefined;
	readonly items?: readonly any[] | undefined;
}

export interface PatientBillingTreatmentPlan {
	readonly id?: string | undefined;
	readonly planNumber?: string | undefined;
	readonly title?: string | undefined;
	readonly stages?: readonly PatientBillingPlanStage[] | undefined;
	readonly activeStage?: PatientBillingPlanStage | undefined;
}

export type PatientBillingPaymentMethod =
	| "card"
	| "sbp"
	| "cash"
	| "family"
	| "deposit"
	| "installment";

export function renderCategoryIcon(categoryGroup: string) {
	switch (categoryGroup) {
		case "caries":
			return <Stethoscope className="w-5 h-5 text-[var(--teal,#0d9488)]" />;
		case "anesthesia":
			return <Syringe className="w-5 h-5 text-[var(--teal,#0d9488)]" />;
		case "implant":
		case "surgery":
			return (
				<span title="Дентальный титановый имплантат" className="inline-flex">
					<ShieldCheck className="w-5 h-5 text-[var(--teal,#0d9488)]" />
				</span>
			);
		case "xray":
			return <FileText className="w-5 h-5 text-[var(--teal,#0d9488)]" />;
		case "hygiene":
			return <Sparkles className="w-5 h-5 text-[var(--teal,#0d9488)]" />;
		case "crowns":
			return <Layers className="w-5 h-5 text-[var(--teal,#0d9488)]" />;
		default:
			return <Stethoscope className="w-5 h-5 text-[var(--teal,#0d9488)]" />;
	}
}

export interface PatientBillingFriendlyTabProps
	extends PatientBillingPlanStagePanelProps,
		PatientBillingTenderPanelProps {
	readonly patientName: string;
	readonly friendlyBreakdown: {
		readonly groups: readonly GroupedFriendlyBlock[];
		readonly totalAmountRub: number;
		readonly totalAmountRubFormatted: string;
		readonly patientFriendlySummaryRu: string;
	};
	readonly onOpenQr: () => void;
	readonly itemWarrantyMap: Record<string, boolean>;
	readonly onToggleItemWarranty: (id: string) => void;
}

export const PatientBillingFriendlyTab: React.FC<PatientBillingFriendlyTabProps> = ({
	patientName,
	friendlyBreakdown,
	onOpenQr,
	planStages,
	activeTreatmentPlan,
	isStageApplied,
	onSetIsStageApplied,
	selectedStage,
	initialServicesCount,
	getStageAmountRub,
	onSelectPlanStage,
	onTenderPlanStage,
	selectedTender,
	onSelectTender,
	onFiscalizeAction,
	totalNetRub,
	receivedCashRub,
	onSetReceivedCashRub,
	cashChangeResult,
	primaryInputRef,
	onInputEnterKeyDown,
	installmentSchedule,
	effectiveDeposit,
	effectiveFamilyBalance,
	customServiceName,
	onSetCustomServiceName,
	customAmountRub,
	onSetCustomAmountRub,
	itemWarrantyMap,
	onToggleItemWarranty,
}) => {
	return (
		<div className="space-y-4" data-testid="friendly-billing-view">
			{/* Summary Header Card */}
			<div className="p-4 sm:p-5 rounded-2xl border border-[var(--line)] bg-[var(--paper-soft)] space-y-3">
				<div className="flex items-center justify-between flex-wrap gap-3">
					<div className="flex-1 min-w-0">
						<div className="flex items-center gap-2">
							<Sparkles className="w-5 h-5 text-[var(--teal,#0d9488)] shrink-0" />
							<h4 className="text-base font-extrabold text-[var(--ink)] m-0">
								Понятная расшифровка счета • Пациент: {patientName || "Пациент"}
							</h4>
						</div>
						<p className="text-xs text-[var(--muted)] m-0 mt-1">
							{friendlyBreakdown.patientFriendlySummaryRu}
						</p>
					</div>

					<div className="flex items-center gap-2 flex-wrap shrink-0">
						<button
							type="button"
							onClick={onOpenQr}
							className="px-3.5 py-2 min-h-[44px] rounded-xl text-xs sm:text-sm font-bold bg-[var(--paper-soft)] hover:bg-[var(--paper-hover)] text-[var(--ink)] border border-[var(--line)] flex items-center gap-2 cursor-pointer transition-colors"
							data-testid="btn-show-bill-qr"
						>
							<QrCode className="w-4 h-4" />
							<span>QR для телефона</span>
						</button>
					</div>
				</div>
			</div>

			{/* Plan Stage Selection */}
			<PatientBillingPlanStagePanel
				planStages={planStages}
				activeTreatmentPlan={activeTreatmentPlan}
				initialServicesCount={initialServicesCount}
				isStageApplied={isStageApplied}
				onSetIsStageApplied={onSetIsStageApplied}
				selectedStage={selectedStage}
				getStageAmountRub={getStageAmountRub}
				onSelectPlanStage={onSelectPlanStage}
				onTenderPlanStage={onTenderPlanStage}
			/>

			{/* Express Payment and Tender Controls */}
			<PatientBillingTenderPanel
				selectedTender={selectedTender}
				onSelectTender={onSelectTender}
				onFiscalizeAction={onFiscalizeAction}
				totalNetRub={totalNetRub}
				receivedCashRub={receivedCashRub}
				onSetReceivedCashRub={onSetReceivedCashRub}
				cashChangeResult={cashChangeResult}
				primaryInputRef={primaryInputRef}
				onInputEnterKeyDown={onInputEnterKeyDown}
				installmentSchedule={installmentSchedule}
				effectiveDeposit={effectiveDeposit}
				effectiveFamilyBalance={effectiveFamilyBalance}
				initialServicesCount={initialServicesCount}
				customServiceName={customServiceName}
				onSetCustomServiceName={onSetCustomServiceName}
				customAmountRub={customAmountRub}
				onSetCustomAmountRub={onSetCustomAmountRub}
			/>

			{/* Grouped Friendly Blocks */}
			<div className="space-y-3">
				{friendlyBreakdown.groups.length === 0 && initialServicesCount === 0 && customAmountRub === 0 && (
					<div className="p-8 text-center text-xs text-[var(--muted)] bg-[var(--paper)] rounded-2xl border border-[var(--line)]">
						Укажите сумму и назначение платежа выше для оформления чека.
					</div>
				)}
				{friendlyBreakdown.groups.map((grp) => {
					const isSingle = grp.items.length === 1;
					const singleItem = grp.items[0];

					if (isSingle && singleItem) {
						const isWarrantyActive = !!itemWarrantyMap[singleItem.id];
						return (
							<div
								key={grp.categoryGroup}
								className="p-3.5 sm:p-4 rounded-2xl border border-[var(--line)] bg-[var(--paper)] shadow-xs divide-y divide-[var(--line)]/50 text-xs hover:bg-[var(--paper-soft)]/40 transition-colors"
								data-testid={`friendly-group-${grp.categoryGroup}`}
							>
								<div className="flex items-center justify-between gap-3 min-w-0 flex-1">
									<div className="flex items-center gap-3 min-w-0 flex-1">
										<div
											className="w-9 h-9 rounded-xl bg-[var(--teal-soft,#f0fdfa)] text-[var(--teal,#0d9488)] flex items-center justify-center border border-[var(--teal,#0d9488)]/25 shrink-0"
											title={grp.categoryGroupRu}
										>
											{renderCategoryIcon(grp.categoryGroup)}
										</div>
										<div className="min-w-0 flex-1">
											<div className="flex items-center gap-2 flex-wrap min-w-0">
												<strong className="text-[var(--ink)] font-bold text-xs sm:text-sm truncate min-w-0" title={singleItem.friendlyName}>
													{singleItem.toothNumber ? `Зуб ${singleItem.toothNumber} • ` : ""}
													{singleItem.friendlyName}
												</strong>
												{isWarrantyActive && (
													<span
														data-testid={`badge-warranty-${singleItem.id}`}
														className="text-teal-700 bg-teal-50 dark:bg-teal-950/40 dark:text-teal-300 border border-teal-500/30 rounded px-1.5 py-0.5 text-[10px] font-bold inline-flex items-center gap-1"
													>
														<ShieldCheck className="w-3 h-3" />
														[ГАРАНТИЯ]
													</span>
												)}
											</div>
											{singleItem.plainDescriptionRu && (
												<div className="text-[11px] text-[var(--muted)] mt-0.5">
													{singleItem.plainDescriptionRu}
												</div>
											)}
											<div className="mt-2 flex items-center gap-2">
												<button
													type="button"
													onClick={() => onToggleItemWarranty(singleItem.id)}
													data-testid={`btn-item-warranty-${singleItem.id}`}
													className={`h-7 px-2.5 rounded-lg text-[11px] font-bold transition-all cursor-pointer inline-flex items-center gap-1.5 ${
														isWarrantyActive
															? "bg-teal-600 text-white shadow-2xs hover:bg-teal-700"
															: "bg-[var(--paper-soft)] hover:bg-teal-50 dark:hover:bg-teal-950/30 text-[var(--muted)] hover:text-teal-700 dark:hover:text-teal-300 border border-[var(--line)]"
													}`}
													title="100% гарантийная переделка врача без паролей администратора"
												>
													<ShieldCheck className="w-3.5 h-3.5 shrink-0" />
													<span>{isWarrantyActive ? "Гарантия 100% (Включена)" : "Гарантийная переделка (100% скидка)"}</span>
												</button>
											</div>
										</div>
									</div>

									<div className="text-right shrink-0">
										<div className="font-bold text-[var(--ink)] font-mono text-sm sm:text-base">
											{isWarrantyActive ? "0 ₽" : `${singleItem.totalRub.toLocaleString("ru-RU")} ₽`}
										</div>
										{isWarrantyActive ? (
											<div className="text-[10px] text-[var(--muted)] line-through font-mono">
												{singleItem.priceRub.toLocaleString("ru-RU")} ₽
											</div>
										) : (
											singleItem.quantity > 1 && (
												<div className="text-[10px] text-[var(--muted)]">
													{singleItem.quantity} шт. &times; {singleItem.priceRub.toLocaleString("ru-RU")} ₽
												</div>
											)
										)}
									</div>
								</div>
							</div>
						);
					}

					return (
						<div
							key={grp.categoryGroup}
							className="p-4 rounded-2xl border border-[var(--line)] bg-[var(--paper)] space-y-3 shadow-xs"
							data-testid={`friendly-group-${grp.categoryGroup}`}
						>
							<div className="flex items-center justify-between flex-wrap gap-2 border-b border-[var(--line)] pb-2.5">
								<div className="flex items-center gap-2.5">
									<div
										className="w-9 h-9 rounded-xl bg-[var(--teal-soft,#f0fdfa)] text-[var(--teal,#0d9488)] flex items-center justify-center border border-[var(--teal,#0d9488)]/25 shrink-0"
										title={grp.categoryGroupRu}
									>
										{renderCategoryIcon(grp.categoryGroup)}
									</div>
									<div>
										<div className="flex items-center gap-2">
											<h4 className="text-sm sm:text-base font-extrabold text-[var(--ink)] m-0">
												{grp.categoryGroupRu}
											</h4>
											<span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-[var(--teal-soft,#f0fdfa)] text-[var(--teal,#0d9488)] border border-[var(--teal,#0d9488)]/30">
												{grp.percentageOfTotal}% от счета
											</span>
										</div>
										<p className="text-xs text-[var(--muted)] m-0 mt-0.5">
											{grp.summaryRu}
										</p>
									</div>
								</div>

								<div className="text-right">
									<div className="text-base sm:text-lg font-black text-[var(--teal,#0d9488)] font-mono">
										{grp.subtotalRub.toLocaleString("ru-RU")} ₽
									</div>
								</div>
							</div>

							<div className="divide-y divide-[var(--line)]/50">
								{grp.items.map((it) => {
									const isItemWarranty = !!itemWarrantyMap[it.id];
									return (
										<div
											key={it.id}
											className="py-2.5 px-1.5 flex items-center justify-between gap-3 text-xs hover:bg-[var(--paper-soft)]/50 rounded-lg transition-colors"
										>
											<div className="flex-1 min-w-0">
												<div className="flex items-center gap-2 flex-wrap min-w-0">
													<strong className="text-[var(--ink)] font-bold truncate min-w-0" title={it.friendlyName}>
														{it.toothNumber ? `Зуб ${it.toothNumber} • ` : ""}
														{it.friendlyName}
													</strong>
													{isItemWarranty && (
														<span
															data-testid={`badge-warranty-${it.id}`}
															className="text-teal-700 bg-teal-50 dark:bg-teal-950/40 dark:text-teal-300 border border-teal-500/30 rounded px-1.5 py-0.5 text-[10px] font-bold inline-flex items-center gap-1"
														>
															<ShieldCheck className="w-3 h-3" />
															[ГАРАНТИЯ]
														</span>
													)}
												</div>
												{it.plainDescriptionRu && (
													<div className="text-[11px] text-[var(--muted)] mt-0.5">
														{it.plainDescriptionRu}
													</div>
												)}
												<div className="mt-1.5 flex items-center gap-2">
													<button
														type="button"
														onClick={() => onToggleItemWarranty(it.id)}
														data-testid={`btn-item-warranty-${it.id}`}
														className={`h-6 px-2 rounded-md text-[10px] font-bold transition-all cursor-pointer inline-flex items-center gap-1 ${
															isItemWarranty
																? "bg-teal-600 text-white shadow-2xs hover:bg-teal-700"
																: "bg-[var(--paper-soft)] hover:bg-teal-50 dark:hover:bg-teal-950/30 text-[var(--muted)] hover:text-teal-700 dark:hover:text-teal-300 border border-[var(--line)]"
														}`}
														title="100% гарантийная переделка врача без паролей администратора"
													>
														<ShieldCheck className="w-3 h-3 shrink-0" />
														<span>
															{isItemWarranty
																? "Гарантия 100% (Включена)"
																: "Гарантийная переделка (100% скидка)"}
														</span>
													</button>
												</div>
											</div>

											<div className="text-right shrink-0">
												<div className="font-bold text-[var(--ink)] font-mono text-sm">
													{isItemWarranty ? "0 ₽" : `${it.totalRub.toLocaleString("ru-RU")} ₽`}
												</div>
												{isItemWarranty ? (
													<div className="text-[10px] text-[var(--muted)] line-through font-mono">
														{it.priceRub.toLocaleString("ru-RU")} ₽
													</div>
												) : (
													it.quantity > 1 && (
														<div className="text-[10px] text-[var(--muted)]">
															{it.quantity} шт. &times; {it.priceRub.toLocaleString("ru-RU")} ₽
														</div>
													)
												)}
											</div>
										</div>
									);
								})}
							</div>
						</div>
					);
				})}
			</div>
		</div>
	);
};
