import React, { useMemo, useState, useRef, useEffect } from "react";
import {
	Activity,
	AlertTriangle,
	Check,
	CheckCircle2,
	ChevronDown,
	ChevronUp,
	Clock,
	Package,
	Play,
	Plus,
	TrendingUp,
	UserCheck,
} from "lucide-react";
import {
	type InventoryItemLookup,
	calculateStageMaterialRequirements,
} from "./treatmentPlanMaterialEngine";
import {
	type TreatmentPlanDoctorOption,
	type TreatmentPlanItem,
	type TreatmentPlanStage,
	type TreatmentPlanStageStatus,
	romanizeStageNumber,
} from "./types";
import { isMicroConsumable } from "./TreatmentPlanPresenterModal";
import { TreatmentPlanStageItemRow } from "./TreatmentPlanStageItemRow";
import { TreatmentPlanStageFooter, type StageStatusConfigItem } from "./TreatmentPlanStageFooter";

export { TreatmentPlanStageItemRow } from "./TreatmentPlanStageItemRow";
export { TreatmentPlanStageFooter } from "./TreatmentPlanStageFooter";
export type { TreatmentPlanStageStatus };

const STAGE_STATUS_CONFIG: Record<
	TreatmentPlanStageStatus,
	StageStatusConfigItem
> = {
	draft: {
		label: "Черновик",
		badge: "bg-slate-500/10 text-slate-700 dark:text-slate-300 border-slate-500/30",
		icon: Clock,
	},
	agreed: {
		label: "Согласован",
		badge: "bg-sky-500/10 text-sky-700 dark:text-sky-300 border-sky-500/30",
		icon: CheckCircle2,
	},
	in_progress: {
		label: "В работе",
		badge: "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30",
		icon: Play,
	},
	completed: {
		label: "Завершен",
		badge: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30",
		icon: Check,
	},
};

export interface TreatmentPlanStageCardProps {
	readonly stage: TreatmentPlanStage;
	readonly defaultExpanded?: boolean | undefined;
	readonly inventoryItems?: readonly InventoryItemLookup[] | undefined;
	readonly doctors?: readonly TreatmentPlanDoctorOption[] | undefined;
	readonly onAssignStageDoctor?: ((stage: TreatmentPlanStage, doctorId: string | null, doctorName: string | null, doctorSpecialty: string | null) => void) | undefined;
	readonly onAssignItemDoctor?: ((itemId: string, doctorId: string | null, doctorName: string | null, doctorSpecialty: string | null) => void) | undefined;
	readonly onUpdateItemQuantity?: ((itemId: string, newQty: number) => void) | undefined;
	readonly onUpdateItemPrice?: ((itemId: string, newPriceRub: number) => void) | undefined;
	readonly onUpdateItem?: ((updatedItem: TreatmentPlanItem) => void) | undefined;
	readonly onRemoveItem?: ((itemId: string) => void) | undefined;
	readonly onAddItem?: ((stage: TreatmentPlanStage) => void) | undefined;
	readonly onChangeStageStatus?: ((stage: TreatmentPlanStage, newStatus: TreatmentPlanStageStatus) => void) | undefined;
	readonly onStartStage?: ((stage: TreatmentPlanStage) => void) | undefined;
	readonly onExecuteWriteOffStage?: ((stage: TreatmentPlanStage) => void) | undefined;
	readonly onPayStage?: ((stage: TreatmentPlanStage) => void) | undefined;
	readonly onOpenLabOrder?: ((teeth?: number[], options?: Record<string, unknown>) => void) | undefined;
	readonly onOneClickLabOrder?: ((teeth?: number[]) => void) | undefined;
	readonly onOpenInstallment?: ((stage: TreatmentPlanStage) => void) | undefined;
	readonly onApplyStageDiscount?: ((stage: TreatmentPlanStage) => void) | undefined;
	readonly onExportStageEstimate?: ((stage: TreatmentPlanStage) => void) | undefined;
	readonly onDeleteStage?: ((stage: TreatmentPlanStage) => void) | undefined;
	readonly className?: string | undefined;
}

export const TreatmentPlanStageCard: React.FC<TreatmentPlanStageCardProps> = ({
	stage,
	defaultExpanded = true,
	inventoryItems,
	doctors,
	onAssignStageDoctor,
	onAssignItemDoctor,
	onUpdateItemQuantity,
	onUpdateItemPrice,
	onUpdateItem,
	onRemoveItem,
	onAddItem,
	onChangeStageStatus,
	onStartStage,
	onExecuteWriteOffStage,
	onPayStage,
	onOpenLabOrder,
	onOneClickLabOrder,
	onOpenInstallment,
	onApplyStageDiscount,
	onExportStageEstimate,
	onDeleteStage,
	className = "",
}) => {
	const [isExpanded, setIsExpanded] = useState<boolean>(defaultExpanded);
	const [showMaterials, setShowMaterials] = useState<boolean>(false);
	const [showMicroConsumables, setShowMicroConsumables] = useState<boolean>(false);
	const [isStatusMenuOpen, setIsStatusMenuOpen] = useState<boolean>(false);
	const statusMenuRef = useRef<HTMLDivElement>(null);

	const [localStatus, setLocalStatus] = useState<TreatmentPlanStageStatus>(
		stage.status || (stage.items.some((it) => it.isDraft) ? "draft" : "agreed"),
	);

	useEffect(() => {
		if (stage.status) {
			setLocalStatus(stage.status);
		}
	}, [stage.status]);

	const currentStatus: TreatmentPlanStageStatus = stage.status || localStatus;
	const statusConfig = STAGE_STATUS_CONFIG[currentStatus] || STAGE_STATUS_CONFIG.agreed;
	const StatusIcon = statusConfig.icon;

	const handleSelectStatus = (newStatus: TreatmentPlanStageStatus, e?: React.MouseEvent) => {
		e?.stopPropagation();
		setLocalStatus(newStatus);
		setIsStatusMenuOpen(false);
		onChangeStageStatus?.(stage, newStatus);
	};

	const handleStartStageClick = (e?: React.MouseEvent) => {
		e?.stopPropagation();
		setLocalStatus("in_progress");
		onChangeStageStatus?.(stage, "in_progress");
		onStartStage?.(stage);
	};

	useEffect(() => {
		if (!isStatusMenuOpen) return;
		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key === "Escape") {
				setIsStatusMenuOpen(false);
			}
		};
		const handleClickOutside = (e: MouseEvent) => {
			if (statusMenuRef.current && !statusMenuRef.current.contains(e.target as Node)) {
				setIsStatusMenuOpen(false);
			}
		};
		document.addEventListener("keydown", handleKeyDown);
		document.addEventListener("mousedown", handleClickOutside);
		return () => {
			document.removeEventListener("keydown", handleKeyDown);
			document.removeEventListener("mousedown", handleClickOutside);
		};
	}, [isStatusMenuOpen]);

	const materialSummary = useMemo(() => {
		return calculateStageMaterialRequirements(stage, inventoryItems);
	}, [stage, inventoryItems]);

	const presentationMaterials = useMemo(() => {
		return materialSummary.items.filter((mat) => !mat.hideInPatientPresentation);
	}, [materialSummary.items]);

	const stageColorMap = {
		1: {
			badge: "bg-[var(--teal-soft,var(--paper-soft))] text-[var(--teal-dark,var(--teal))] border border-[var(--teal,var(--brand-primary))]/20",
			iconBg: "bg-[var(--teal-soft,var(--paper-soft))] text-[var(--teal,var(--brand-primary))]",
			headerBg: "bg-[var(--teal)]/5",
			accentBorder: "border-[var(--teal,var(--brand-primary))]/30",
		},
		2: {
			badge: "bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/20",
			iconBg: "bg-rose-500/15 text-rose-600 dark:text-rose-400",
			headerBg: "bg-rose-500/5",
			accentBorder: "border-rose-500/30",
		},
		3: {
			badge: "bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/20",
			iconBg: "bg-purple-500/15 text-purple-600 dark:text-purple-400",
			headerBg: "bg-purple-500/5",
			accentBorder: "border-purple-500/30",
		},
	};

	const theme = stageColorMap[stage.stageNumber as 1 | 2 | 3] ?? stageColorMap[1];

	return (
		<div
			className={`treatment-stage-card flex flex-col rounded-2xl border border-[var(--line,var(--border,#cbd5e1))] bg-[var(--paper-strong,var(--paper,#ffffff))] text-[var(--ink,#0f172a)] shadow-xs transition-all duration-200 ${className}`.trim()}
			data-testid={`treatment-stage-${stage.stageNumber}`}
		>
			{/* Stage Header */}
			<div
				onClick={() => setIsExpanded((prev) => !prev)}
				className={`flex items-center justify-between p-3.5 sm:p-4 cursor-pointer select-none transition-colors hover:bg-[var(--paper-soft,#f8fafc)] border-b ${
					isExpanded ? "border-[var(--line,var(--border,#cbd5e1))]" : "border-transparent"
				} ${theme.headerBg} ${isExpanded ? "rounded-t-2xl" : "rounded-2xl"}`}
				role="button"
				tabIndex={0}
				onKeyDown={(e) => {
					if (e.key === "Enter" || e.key === " ") {
						e.preventDefault();
						setIsExpanded((prev) => !prev);
					}
				}}
				aria-expanded={isExpanded}
				aria-label={stage.title}
			>
				<div className="flex items-center gap-3 min-w-0">
					<div
						className={`flex items-center justify-center w-10 h-10 rounded-xl font-bold font-mono text-sm shrink-0 border ${theme.iconBg} ${theme.accentBorder}`}
					>
						{romanizeStageNumber(stage.stageNumber)}
					</div>

					<div className="flex flex-col min-w-0">
						<div className="flex items-center gap-2 flex-wrap">
							<h4 className="text-sm font-bold text-[var(--ink,#0f172a)] truncate">
								{stage.title}
							</h4>
							<span
								className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-bold border ${theme.badge}`}
							>
								{stage.items.length} {stage.items.length === 1 ? "процедура" : "процедур"}
							</span>

							{/* 1-Click Stage Status Switcher Badge (Mandate 8e: Doctor Autonomy) */}
							<div
								className="relative inline-flex items-center"
								ref={statusMenuRef}
								onClick={(e) => e.stopPropagation()}
							>
								<button
									type="button"
									onClick={(e) => {
										e.stopPropagation();
										setIsStatusMenuOpen((prev) => !prev);
									}}
									className={`text-[11.5px] px-2.5 py-0.5 rounded-full font-bold border ${statusConfig.badge} flex items-center gap-1 cursor-pointer hover:opacity-90 transition-opacity touch-manipulation`}
									title="Смена статуса этапа (Черновик -> Согласован -> В работе -> Завершен)"
									data-testid={`stage-${stage.stageNumber}-status-badge`}
									aria-expanded={isStatusMenuOpen}
								>
									<StatusIcon size={11} />
									<span>{statusConfig.label}</span>
									<ChevronDown
										size={10}
										className={`transition-transform ${isStatusMenuOpen ? "rotate-180" : ""}`}
									/>
								</button>

								{isStatusMenuOpen && (
									<div
										className="absolute left-0 top-full mt-1 z-50 flex flex-col gap-0.5 p-1 bg-[var(--paper-strong,var(--paper,#ffffff))] border border-[var(--line,var(--border,#cbd5e1))] rounded-xl shadow-xl min-w-[140px] text-xs animate-in fade-in zoom-in-95 duration-100"
										role="menu"
									>
										{(["draft", "agreed", "in_progress", "completed"] as const).map((st) => {
											const cfg = STAGE_STATUS_CONFIG[st];
											const ItemIcon = cfg.icon;
											const isCurrent = currentStatus === st;
											return (
												<button
													key={st}
													type="button"
													onClick={(e) => handleSelectStatus(st, e)}
													className={`w-full text-left px-2 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 cursor-pointer transition-colors ${
														isCurrent
															? "bg-[var(--teal-soft,var(--paper-soft))] text-[var(--teal-dark,var(--teal))] font-bold"
															: "text-[var(--ink,#0f172a)] hover:bg-[var(--paper-soft,#f8fafc)]"
													}`}
													role="menuitem"
												>
													<ItemIcon size={12} />
													<span>{cfg.label}</span>
													{isCurrent && (
														<Check size={12} className="ml-auto text-[var(--teal-dark,var(--teal))] shrink-0" />
													)}
												</button>
											);
										})}
									</div>
								)}
							</div>

							{/* Stage Doctor Allocation (Consortium: Doctor per Stage) */}
							<div
								className="relative inline-flex items-center"
								onClick={(e) => e.stopPropagation()}
							>
								{stage.doctorName ? (
									<span
										className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border border-indigo-500/25 whitespace-nowrap shadow-2xs"
										data-testid={`stage-${stage.stageNumber}-doctor-badge`}
										title={`Врач этапа: ${stage.doctorName}${stage.doctorSpecialty ? ` (${stage.doctorSpecialty})` : ""}`}
									>
										<UserCheck size={11} className="text-indigo-600 dark:text-indigo-400 shrink-0" />
										<span>{stage.doctorName}</span>
										{stage.doctorSpecialty && (
											<span className="text-[10px] opacity-75 hidden sm:inline">
												· {stage.doctorSpecialty}
											</span>
										)}
										{onAssignStageDoctor && (
											<button
												type="button"
												onClick={(e) => {
													e.stopPropagation();
													onAssignStageDoctor(stage, null, null, null);
												}}
												className="ml-0.5 text-[10px] text-indigo-400 hover:text-rose-600 cursor-pointer p-0.5"
												title="Снять назначение врача с этапа"
												data-testid={`clear-stage-doctor-btn-${stage.stageNumber}`}
											>
												×
											</button>
										)}
									</span>
								) : onAssignStageDoctor && doctors && doctors.length > 0 ? (
									<select
										value=""
										onChange={(e) => {
											const docId = e.target.value;
											if (!docId) return;
											const found = doctors.find((d) => d.id === docId);
											onAssignStageDoctor(
												stage,
												docId,
												found?.fullName || "Врач-стоматолог",
												found?.specialty || (found?.role === "doctor" ? "Стоматолог" : found?.role) || null,
											);
										}}
										className="h-6 text-[10.5px] font-semibold text-indigo-700 dark:text-indigo-300 bg-indigo-500/5 hover:bg-indigo-500/15 border border-indigo-500/20 rounded-full px-2 py-0 cursor-pointer focus:outline-hidden transition-colors"
										title="Назначить специалиста на все процедуры этапа"
										data-testid={`assign-stage-doctor-select-${stage.stageNumber}`}
									>
										<option value="">+ Врач этапа</option>
										{doctors.map((doc) => (
											<option key={doc.id} value={doc.id}>
												{doc.fullName} {doc.specialty ? `(${doc.specialty})` : ""}
											</option>
										))}
									</select>
								) : null}
							</div>

							{materialSummary.hasDeficit && (
								<span className="text-[10px] px-2 py-0.5 rounded-full font-mono font-bold bg-rose-500/10 text-rose-700 dark:text-rose-300 border border-rose-500/30 flex items-center gap-1">
									<AlertTriangle size={11} /> Дефицит ТМЦ ({materialSummary.deficitCount})
								</span>
							)}
						</div>
						<p className="text-xs text-[var(--muted,#64748b)] truncate max-w-xl min-w-0">
							{stage.subtitle}
						</p>
					</div>
				</div>

				<div className="flex items-center gap-4 shrink-0">
					<div className="text-right flex flex-col">
						<span className="text-xs sm:text-sm font-bold text-emerald-600 dark:text-emerald-400 font-mono">
							{(stage.totalRub || 0).toLocaleString("ru-RU")} ₽
						</span>
						<span className="text-[10px] text-[var(--muted,#64748b)] hidden sm:flex items-center justify-end gap-1">
							<Clock size={11} /> {stage.estimatedVisits} виз. · {stage.estimatedWeeks} нед.
						</span>
					</div>

					<div className="p-1 rounded-lg text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)]">
						{isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
					</div>
				</div>
			</div>

			{/* Stage Body — Monolithic Flat Panel (Anti-Matryoshka) */}
			{isExpanded && (
				<div className="flex flex-col bg-[var(--paper-strong,var(--paper,#ffffff))] rounded-b-2xl">
					{/* Clinical Goal Strip */}
					{stage.clinicalGoal && (
						<div className="flex items-center gap-2 px-4 py-2.5 bg-[var(--paper-soft,#f8fafc)] border-b border-[var(--line,var(--border,#cbd5e1))]/60 text-xs text-[var(--muted,#64748b)]">
							<Activity size={14} className="text-[var(--teal,var(--brand-primary))] shrink-0" />
							<span className="font-medium">
								<strong>Клиническая цель:</strong> {stage.clinicalGoal}
							</span>
						</div>
					)}

					{/* Procedure Items Flat Monolithic List */}
					<div className="divide-y divide-[var(--line,#e2e8f0)]">
						{stage.items.length === 0 ? (
							<div className="py-8 px-4 text-center text-xs text-[var(--muted,#64748b)] flex flex-col items-center justify-center gap-2">
								<Package size={24} className="text-[var(--muted,#64748b)] opacity-40" />
								<span className="font-semibold text-[var(--ink,#0f172a)]">
									В данном этапе нет запланированных процедур
								</span>
								<span className="text-[11px] text-[var(--muted,#64748b)] max-w-sm">
									Назначьте процедуры из клинического каталога или примените готовый пакет СтАР
								</span>
								{onAddItem && (
									<button
										type="button"
										onClick={() => onAddItem(stage)}
										className="mt-2 h-8 min-h-[32px] [@media(pointer:coarse)]:h-11 [@media(pointer:coarse)]:min-h-[44px] px-3 rounded-lg text-[13px] font-medium text-[var(--teal-dark,var(--teal))] bg-[var(--teal-soft,var(--paper-soft))] hover:bg-[var(--teal)]/20 border border-[var(--teal,var(--brand-primary))]/30 cursor-pointer flex items-center gap-1.5 transition-colors shadow-2xs"
										data-testid={`stage-${stage.stageNumber}-empty-add-item-btn`}
									>
										<Plus size={13} />
										<span>Добавить услугу в этап</span>
									</button>
								)}
							</div>
						) : (
							(() => {
								const microConsumables = stage.items.filter(isMicroConsumable);
								const displayItems = showMicroConsumables
									? stage.items
									: stage.items.filter((it) => !isMicroConsumable(it));
								return (
									<>
										{displayItems.map((item, idx) => (
											<TreatmentPlanStageItemRow
												key={item.id || idx}
												item={item}
												doctors={doctors}
												onAssignDoctor={onAssignItemDoctor}
												onOpenLabOrder={
													onOpenLabOrder
														? (teeth, opts) =>
																onOpenLabOrder(teeth, {
																	stageId: stage.id,
																	stageNumber: stage.stageNumber,
																	stageTitle: stage.title,
																	doctorId: (stage as any).assignedDoctorId,
																	doctorName: (stage as any).assignedDoctorName,
																	...opts,
																})
														: undefined
												}
												onOneClickLabOrder={onOneClickLabOrder}
												onUpdateItemQuantity={onUpdateItemQuantity}
												onUpdateItemPrice={onUpdateItemPrice}
												onUpdateItem={onUpdateItem}
												onRemoveItem={onRemoveItem}
											/>
										))}
										{onAddItem && (
											<div className="px-4 py-2 bg-[var(--paper-soft,#f8fafc)] border-t border-[var(--line,#e2e8f0)] flex items-center justify-between text-xs">
												<span className="text-[12px] text-[var(--muted,#64748b)] font-medium">
													Добавить процедуру или пакет в этот этап:
												</span>
												<button
													type="button"
													onClick={() => onAddItem(stage)}
													className="h-8 min-h-[32px] [@media(pointer:coarse)]:h-11 [@media(pointer:coarse)]:min-h-[44px] px-3 rounded-lg text-[13px] font-medium text-[var(--teal-dark,var(--teal))] bg-[var(--teal-soft,var(--paper-soft))] hover:bg-[var(--teal)]/20 border border-[var(--teal,var(--brand-primary))]/30 cursor-pointer flex items-center gap-1.5 transition-colors"
													data-testid={`stage-${stage.stageNumber}-add-item-btn`}
												>
													<Plus size={13} />
													<span>+ Услуга</span>
												</button>
											</div>
										)}
										{microConsumables.length > 0 && (
											<div className="px-4 py-2 bg-[var(--paper-soft,#f8fafc)] flex items-center justify-between text-xs text-[var(--muted,#64748b)] border-t border-[var(--line,#e2e8f0)]">
												<span>
													Сопутствующие микро-расходники ({microConsumables.length} поз.: валики, салфетки, перчатки, слюноотсосы) включены в процедуры
												</span>
												<button
													type="button"
													onClick={() => setShowMicroConsumables((prev) => !prev)}
													className="h-7 px-2 flex items-center text-[var(--teal,#0d9488)] hover:underline font-bold text-xs cursor-pointer ml-auto"
												>
													{showMicroConsumables ? "Скрыть" : "Показать"}
												</button>
											</div>
										)}
									</>
								);
							})()
						)}
					</div>

					{/* Materials & Profitability Monolithic Accordion */}
					<div className="border-t border-[var(--line,var(--border,#cbd5e1))]">
						<button
							type="button"
							onClick={() => setShowMaterials((prev) => !prev)}
							className="w-full h-8 min-h-[32px] max-h-[34px] [@media(pointer:coarse)]:h-11 [@media(pointer:coarse)]:min-h-[44px] [@media(pointer:coarse)]:max-h-[44px] flex items-center justify-between px-4 py-1.5 text-xs font-bold text-[var(--ink,#0f172a)] bg-[var(--paper-soft,#f8fafc)] hover:bg-[var(--paper-strong,var(--paper,#ffffff))] transition-colors cursor-pointer"
						>
							<div className="flex items-center gap-2 min-w-0">
								<Package size={15} className="text-[var(--teal,var(--brand-primary))] shrink-0" />
								<span className="truncate">
									Нормы расхода ТМЦ и себестоимость этапа ({presentationMaterials.length} поз.)
								</span>
							</div>

							<div className="flex items-center gap-2 sm:gap-3 shrink-0">
								<span className="font-mono text-[var(--muted,#64748b)] text-[11px] hidden sm:inline">
									Себестоимость:{" "}
									<strong className="text-[var(--ink,#0f172a)]">
										{(materialSummary.totalMaterialsCostRub || 0).toLocaleString("ru-RU")} ₽
									</strong>
								</span>
								<span className="font-mono text-emerald-600 dark:text-emerald-400 text-[11px]">
									Маржа: <strong>{materialSummary.marginPercent || 0}%</strong>
								</span>
								{showMaterials ? <ChevronUp size={15} className="shrink-0" /> : <ChevronDown size={15} className="shrink-0" />}
							</div>
						</button>

						{showMaterials && (
							<div className="p-4 border-t border-[var(--line,var(--border,#cbd5e1))] bg-[var(--paper-soft,#f8fafc)] space-y-3 text-xs">
								<div className="overflow-x-auto">
									<table className="w-full border-collapse text-[11px]">
										<thead>
											<tr className="border-b border-[var(--line,var(--border,#cbd5e1))] text-[var(--muted,#64748b)] text-left">
												<th className="pb-1 font-semibold">Материал (Клиническая норма)</th>
												<th className="pb-1 font-semibold text-center">Расход</th>
												<th className="pb-1 font-semibold text-right">Уч. цена</th>
												<th className="pb-1 font-semibold text-right">Сумма</th>
												<th className="pb-1 font-semibold text-center">Склад</th>
											</tr>
										</thead>
										<tbody className="divide-y divide-[var(--line,var(--border,#cbd5e1))]">
											{presentationMaterials.map((mat) => (
												<tr key={mat.id} className="text-[var(--ink,#0f172a)]">
													<td className="py-1.5 pr-2">
														<span className="font-medium truncate block max-w-xs">{mat.materialName}</span>
														<span className="block text-[9px] text-[var(--muted,#64748b)] truncate max-w-xs">
															{mat.procedureName} {mat.toothNumber ? `(№${mat.toothNumber})` : ""}
														</span>
													</td>
													<td className="py-1.5 text-center font-mono font-bold">
														{mat.quantityRequired} {mat.unitOfMeasure}
													</td>
													<td className="py-1.5 text-right font-mono text-[var(--muted,#64748b)]">
														{(mat.unitCostRub || 0).toLocaleString("ru-RU")} ₽
													</td>
													<td className="py-1.5 text-right font-mono font-bold text-[var(--ink,#0f172a)]">
														{(mat.totalCostRub || 0).toLocaleString("ru-RU")} ₽
													</td>
													<td className="py-1.5 text-center font-mono">
														{mat.inStockQuantity !== undefined ? (
															mat.isDeficit ? (
																<span className="text-rose-600 font-bold">
																	Дефицит ({mat.inStockQuantity} в наличии)
																</span>
															) : (
																<span className="text-emerald-600 dark:text-emerald-400">
																	{mat.inStockQuantity} {mat.unitOfMeasure}
																</span>
															)
														) : (
															<span className="text-[var(--muted,#94a3b8)]">—</span>
														)}
													</td>
												</tr>
											))}
										</tbody>
									</table>
								</div>

								{/* Margins breakdown strip without nested card */}
								<div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 bg-[var(--paper-strong,var(--paper,#ffffff))] border-t border-[var(--line,var(--border,#cbd5e1))] text-[11px] rounded-lg">
									<div>
										<span className="text-[var(--muted,#64748b)]">Выручка: </span>
										<strong className="font-mono text-[var(--ink,#0f172a)]">
											{(materialSummary.serviceRevenueRub || 0).toLocaleString("ru-RU")} ₽
										</strong>
									</div>
									<div>
										<span className="text-[var(--muted,#64748b)]">Себестоимость ТМЦ: </span>
										<strong className="font-mono text-[var(--ink,#0f172a)]">
											{(materialSummary.totalMaterialsCostRub || 0).toLocaleString("ru-RU")} ₽
										</strong>
									</div>
									<div className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
										<TrendingUp size={13} />
										<span>
											Валовая маржа: {(materialSummary.grossMarginRub || 0).toLocaleString("ru-RU")} ₽ ({materialSummary.marginPercent || 0}%)
										</span>
									</div>
								</div>
							</div>
						)}
					</div>

					{/* Stage Subtotal & Action Footer */}
					<TreatmentPlanStageFooter
						stage={stage}
						currentStatus={currentStatus}
						stageStatusConfig={STAGE_STATUS_CONFIG}
						onStartStage={onStartStage}
						onExecuteWriteOffStage={onExecuteWriteOffStage}
						onPayStage={onPayStage}
						onExportStageEstimate={onExportStageEstimate}
						onOpenLabOrder={onOpenLabOrder}
						onOneClickLabOrder={onOneClickLabOrder}
						onApplyStageDiscount={onApplyStageDiscount}
						onOpenInstallment={onOpenInstallment}
						onDeleteStage={onDeleteStage}
						onSelectStatus={handleSelectStatus}
						onStartStageClick={handleStartStageClick}
					/>
				</div>
			)}
		</div>
	);
};
