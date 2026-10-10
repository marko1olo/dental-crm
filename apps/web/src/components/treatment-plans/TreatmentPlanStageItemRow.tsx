/**
 * TreatmentPlanStageItemRow.tsx — Строка процедуры этапа плана лечения
 * с индикацией зуба, кода 804н, кнопками наряда в ЗТЛ, регулировкой количества и алертом отсутствующей цены.
 */

import React from "react";
import { Archive, Check, Lock, RefreshCw, Trash2, UserCheck, Zap } from "lucide-react";
import { DentalLabOrder } from "../icons/DentalIcons.js";
import type { TreatmentPlanDoctorOption, TreatmentPlanItem } from "./types";
import { MissingPriceAlert } from "./MissingPriceAlert";
import { formatPlanPriceRub, isPlanPriceImmutable } from "./planPricing";

export interface TreatmentPlanStageItemRowProps {
	readonly item: TreatmentPlanItem;
	readonly planStatus?: "draft" | "approved" | "in_progress" | "completed" | string | undefined;
	readonly currentCatalogPriceRub?: number | undefined;
	readonly isArchivedInCatalog?: boolean | undefined;
	readonly doctors?: readonly TreatmentPlanDoctorOption[] | undefined;
	readonly onAssignDoctor?: ((itemId: string, doctorId: string | null, doctorName: string | null, doctorSpecialty: string | null) => void) | undefined;
	readonly onOpenLabOrder?: ((teeth?: number[], options?: Record<string, unknown>) => void) | undefined;
	readonly onOneClickLabOrder?: ((teeth?: number[]) => void) | undefined;
	readonly onUpdateItemQuantity?: ((itemId: string, newQty: number) => void) | undefined;
	readonly onUpdateItemPrice?: ((itemId: string, newPriceRub: number) => void) | undefined;
	readonly onUpdateItem?: ((updatedItem: TreatmentPlanItem) => void) | undefined;
	readonly onRemoveItem?: ((itemId: string) => void) | undefined;
	readonly onKeepAgreedPrice?: ((itemId: string) => void) | undefined;
	readonly onReplaceWithCatalogItem?: ((itemId: string, newCatalogPriceRub?: number) => void) | undefined;
}

export const TreatmentPlanStageItemRow: React.FC<TreatmentPlanStageItemRowProps> = ({
	item,
	planStatus,
	currentCatalogPriceRub,
	isArchivedInCatalog,
	doctors,
	onAssignDoctor,
	onOpenLabOrder,
	onOneClickLabOrder,
	onUpdateItemQuantity,
	onUpdateItemPrice,
	onUpdateItem,
	onRemoveItem,
	onKeepAgreedPrice,
	onReplaceWithCatalogItem,
}) => {
	const isLabOrderEligible =
		item.category === "Ортопедия" ||
		item.category === "Детская ортопедия" ||
		item.stageKind === "stage_3_orthopedics" ||
		/коронк|мост|протез|винир|вкладк|абатмент|бюгел|all-on|onlay|inlay/i.test(item.name) ||
		item.code804n.startsWith("A16.07.003") ||
		item.code804n.startsWith("A16.07.004") ||
		item.code804n.startsWith("A16.07.005") ||
		item.code804n.startsWith("A16.07.006");

	const effectiveStatus = planStatus || item.planStatus || "draft";
	const isImmutable = isPlanPriceImmutable(effectiveStatus) || Boolean(item.isPriceLocked);
	const catalogPrice =
		currentCatalogPriceRub !== undefined ? currentCatalogPriceRub : item.currentCatalogPriceRub;
	const isArchived =
		isArchivedInCatalog !== undefined ? isArchivedInCatalog : Boolean(item.isArchivedInCatalog);
	const itemUnitPrice = Number.isFinite(item.unitPriceRub)
		? item.unitPriceRub
		: Number.isFinite(item.priceRub)
			? item.priceRub
			: 0;
	const hasPriceDrift =
		catalogPrice !== undefined &&
		Number.isFinite(catalogPrice) &&
		Math.abs(catalogPrice - itemUnitPrice) > 0.001;
	const isAgreedPriceKept = item.archivedResolution === "keep_agreed_price";

	return (
		<div className="flex flex-col gap-2 px-4 py-3 hover:bg-[var(--paper-soft,#f8fafc)] transition-colors">
			<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
				<div className="flex flex-col gap-0.5 min-w-0 flex-1">
					<div className="flex items-center gap-1.5 flex-wrap">
						{item.toothNumber && (
							<span className="text-[11px] font-mono font-bold px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 border border-cyan-500/20 whitespace-nowrap">
								#{item.toothNumber}
							</span>
						)}
						<span className="text-[10px] font-mono text-[var(--muted,#64748b)] px-1.5 py-0.5 rounded bg-[var(--paper-soft,#f1f5f9)] dark:bg-[var(--paper-soft)] border border-[var(--line,#e2e8f0)] whitespace-nowrap">
							{item.code804n}
						</span>
						<span className="text-[10px] text-[var(--muted,#64748b)] font-medium">
							{item.category}
						</span>

						{/* Doctor Badge / 1-Click Assignment (Multi-Doctor Consortium) */}
						{item.doctorName ? (
							<span
								className="inline-flex items-center gap-1 text-[10.5px] font-medium px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border border-indigo-500/25 whitespace-nowrap shadow-2xs"
								data-testid={`item-doctor-badge-${item.id}`}
								title={`Назначенный специалист: ${item.doctorName}${item.doctorSpecialty ? ` (${item.doctorSpecialty})` : ""}`}
							>
								<UserCheck size={11} className="text-indigo-600 dark:text-indigo-400 shrink-0" />
								<span className="font-semibold">{item.doctorName}</span>
								{item.doctorSpecialty && (
									<span className="text-[9.5px] opacity-75 hidden sm:inline">
										· {item.doctorSpecialty}
									</span>
								)}
								{onAssignDoctor && (
									<button
										type="button"
										onClick={(e) => {
											e.stopPropagation();
											onAssignDoctor(item.id, null, null, null);
										}}
										className="ml-0.5 text-[10px] text-indigo-400 hover:text-rose-600 cursor-pointer p-0.5"
										title="Снять назначение врача"
										data-testid={`clear-doctor-btn-${item.id}`}
									>
										×
									</button>
								)}
							</span>
						) : onAssignDoctor && doctors && doctors.length > 0 ? (
							<div className="inline-flex items-center" onClick={(e) => e.stopPropagation()}>
								<select
									value={item.doctorId || ""}
									onChange={(e) => {
										const docId = e.target.value;
										if (!docId) {
											onAssignDoctor(item.id, null, null, null);
										} else {
											const found = doctors.find((d) => d.id === docId);
											onAssignDoctor(
												item.id,
												docId,
												found?.fullName || "Врач-стоматолог",
												found?.specialty || (found?.role === "doctor" ? "Стоматолог" : found?.role) || null,
											);
										}
									}}
									className="h-5 text-[10px] font-semibold text-indigo-700 dark:text-indigo-300 bg-indigo-500/5 hover:bg-indigo-500/15 border border-indigo-500/20 rounded-md px-1 py-0 cursor-pointer focus:outline-hidden transition-colors"
									title="Назначить лечащего врача на позицию"
									data-testid={`assign-doctor-select-${item.id}`}
								>
									<option value="">+ Врач</option>
									{doctors.map((doc) => (
										<option key={doc.id} value={doc.id}>
											{doc.fullName} {doc.specialty ? `(${doc.specialty})` : ""}
										</option>
									))}
								</select>
							</div>
						) : null}
					</div>

					<span
						className="text-xs font-semibold text-[var(--ink,#0f172a)] leading-snug truncate min-w-0 block"
						title={item.name}
					>
						{item.name}
					</span>

					{item.materials && (
						<p
							className="text-[11px] text-[var(--muted,#64748b)] italic m-0 truncate min-w-0"
							title={item.materials}
						>
							Материал: {item.materials}
						</p>
					)}
				</div>

				<div className="flex items-center justify-between sm:justify-end gap-2.5 shrink-0 pt-1 sm:pt-0 flex-wrap sm:flex-nowrap">
					{onOpenLabOrder && isLabOrderEligible && (
						<div className="flex items-center gap-1.5">
							<button
								type="button"
								onClick={() => {
									const itemTeeth = item.toothNumber ? [item.toothNumber] : undefined;
									onOpenLabOrder(itemTeeth, {
										selectedTeeth: itemTeeth,
										itemName: item.name,
										priceRub: (item as any).totalPriceRub || item.unitPriceRub,
										doctorId: (item as any).assignedDoctorId,
										doctorName: (item as any).assignedDoctorName,
									});
								}}
								className="h-7 min-h-[28px] max-h-[28px] [@media(pointer:coarse)]:h-11 [@media(pointer:coarse)]:min-h-[44px] [@media(pointer:coarse)]:max-h-[44px] px-2.5 py-1 rounded-md text-[11px] font-bold text-[var(--teal-dark,var(--teal))] bg-[var(--teal-soft,var(--paper-soft))] hover:bg-[var(--teal)]/20 border border-[var(--teal,var(--brand-primary))]/30 cursor-pointer transition-colors shrink-0 touch-manipulation flex items-center gap-1.5"
								title={`Оформить наряд-заказ в зуботехническую лабораторию для ${item.name}`}
								data-testid={`item-lab-order-btn-${item.id}`}
							>
								<DentalLabOrder size={13} className="text-[var(--teal,var(--brand-primary))] shrink-0" />
								<span>Наряд в ЗТЛ</span>
							</button>
							{onOneClickLabOrder && (
								<button
									type="button"
									onClick={() =>
										onOneClickLabOrder(
											item.toothNumber ? [item.toothNumber] : undefined,
										)
									}
									className="h-7 min-h-[28px] max-h-[28px] [@media(pointer:coarse)]:h-11 [@media(pointer:coarse)]:min-h-[44px] [@media(pointer:coarse)]:max-h-[44px] px-2 py-1 rounded-md text-[11px] font-bold text-amber-900 dark:text-amber-200 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 cursor-pointer transition-colors shrink-0 touch-manipulation shadow-2xs flex items-center gap-1"
									title={`Наряд ЗТЛ: Коронка цирконий VITA A2 (+7 раб. дн.) для ${item.name}`}
									data-testid={`item-lab-order-one-click-btn-${item.id}`}
								>
									<Zap size={13} className="text-amber-600 dark:text-amber-400 shrink-0" />
									<span>Наряд ЗТЛ</span>
								</button>
							)}
						</div>
					)}

					{/* Quantity Controls (Mandate 8e: Doctor Autonomy) */}
					{onUpdateItemQuantity ? (
						<div className="flex items-center border border-[var(--line,#e2e8f0)] rounded-lg bg-[var(--paper-soft,#f8fafc)] p-0.5">
							<button
								type="button"
								onClick={() =>
									onUpdateItemQuantity(
										item.id,
										Math.max(1, (item.quantity || 1) - 1),
									)
								}
								className="w-5 h-5 flex items-center justify-center rounded text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)] hover:bg-[var(--paper-strong,#ffffff)] cursor-pointer text-xs font-bold transition-colors"
								title="Уменьшить количество"
								data-testid={`dec-qty-${item.id}`}
							>
								-
							</button>
							<span className="text-[11px] font-mono font-bold px-1.5 text-[var(--ink,#0f172a)] min-w-[18px] text-center">
								{item.quantity || 1}
							</span>
							<button
								type="button"
								onClick={() =>
									onUpdateItemQuantity(
										item.id,
										(item.quantity || 1) + 1,
									)
								}
								className="w-5 h-5 flex items-center justify-center rounded text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)] hover:bg-[var(--paper-strong,#ffffff)] cursor-pointer text-xs font-bold transition-colors"
								title="Увеличить количество"
								data-testid={`inc-qty-${item.id}`}
							>
								+
							</button>
						</div>
					) : (item.quantity || 1) > 1 ? (
						<span className="text-[11px] font-mono font-bold text-[var(--muted,#64748b)] px-1.5 py-0.5 rounded bg-[var(--paper-soft,#f8fafc)] border border-[var(--line,#e2e8f0)]">
							×{item.quantity}
						</span>
					) : null}

					<div className="text-right flex flex-col items-end gap-0.5">
						{/* Calm price drift badge if catalog price differs from locked plan price (Mandates 8e, 8n) */}
						{hasPriceDrift && catalogPrice !== undefined && (
							<div
								className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 whitespace-nowrap"
								data-testid={`price-drift-badge-${item.id}`}
								title="Цены утвержденного плана зафиксированы и не меняются при обновлении каталога"
							>
								<Lock size={10} className="text-teal-600 dark:text-teal-400 shrink-0" />
								<span>
									В прайсе: {Math.round(catalogPrice).toLocaleString("ru-RU")} ₽ · В плане зафиксировано: {Math.round(itemUnitPrice).toLocaleString("ru-RU")} ₽
								</span>
							</div>
						)}

						<span
							className={`text-xs font-bold font-mono ${
								item.requiresManualPricing || (item.priceRub || 0) === 0
									? "text-amber-600 dark:text-amber-400"
									: "text-[var(--ink,#0f172a)]"
							}`}
						>
							{formatPlanPriceRub(item.priceRub)}
						</span>
						{(item.discountRub || 0) > 0 && (
							<div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-mono">
								Скидка: −{(item.discountRub || 0).toLocaleString("ru-RU")} ₽
							</div>
						)}
					</div>

					{/* Remove Item Action (Mandate 8e: Doctor Autonomy) */}
					{onRemoveItem && (
						<button
							type="button"
							onClick={() => onRemoveItem(item.id)}
							className="h-7 w-7 min-h-[28px] min-w-[28px] [@media(pointer:coarse)]:h-11 [@media(pointer:coarse)]:w-11 flex items-center justify-center p-1 rounded-md text-[var(--muted,#64748b)] hover:text-rose-600 hover:bg-rose-500/10 transition-colors cursor-pointer shrink-0"
							title={`Удалить процедуру «${item.name}» из этапа`}
							data-testid={`remove-item-${item.id}`}
						>
							<Trash2 size={13} />
						</button>
					)}
				</div>
			</div>

			{/* Archived Service Alert Banner with 2 Clean 1-Click Actions (Zero Dead-Ends) */}
			{isArchived && !isAgreedPriceKept && (
				<div
					className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2.5 rounded-xl border bg-amber-500/10 border-amber-500/30 text-amber-950 dark:text-amber-100 text-xs mt-1"
					data-testid={`archived-service-alert-${item.id}`}
				>
					<div className="flex items-center gap-2 min-w-0">
						<Archive size={15} className="text-amber-600 dark:text-amber-400 shrink-0" />
						<div className="min-w-0">
							<span className="font-bold text-amber-900 dark:text-amber-200 block">
								Услуга архивирована в каталоге
							</span>
							<span className="text-[11px] text-amber-800/80 dark:text-amber-300/80 truncate block">
								Позиция выведена из действующего прайса клиники. План лечения доступен.
							</span>
						</div>
					</div>

					<div className="flex items-center gap-1.5 shrink-0 flex-wrap">
						<button
							type="button"
							onClick={() => {
								onKeepAgreedPrice?.(item.id);
								if (onUpdateItem) {
									onUpdateItem({
										...item,
										isPriceLocked: true,
										isArchivedInCatalog: true,
										archivedResolution: "keep_agreed_price",
										requiresManualPricing: false,
									});
								}
							}}
							className="h-7 min-h-[28px] max-h-[28px] px-2.5 py-1 rounded-md text-[11px] font-bold text-emerald-800 dark:text-emerald-200 bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/30 cursor-pointer transition-colors shrink-0 flex items-center gap-1"
							title="Выполнить процедуру по согласованной цене плана без изменения сметы"
							data-testid={`keep-agreed-price-btn-${item.id}`}
						>
							<Check size={12} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
							<span>Выполнить по согласованной цене</span>
						</button>

						<button
							type="button"
							onClick={() => {
								onReplaceWithCatalogItem?.(item.id, catalogPrice);
								if (onUpdateItem && catalogPrice !== undefined) {
									onUpdateItem({
										...item,
										priceRub: catalogPrice,
										unitPriceRub: catalogPrice,
										isArchivedInCatalog: false,
										archivedResolution: "replace_from_catalog",
										requiresManualPricing: false,
									});
								}
							}}
							className="h-7 min-h-[28px] max-h-[28px] px-2.5 py-1 rounded-md text-[11px] font-bold text-teal-800 dark:text-teal-200 bg-teal-500/20 hover:bg-teal-500/30 border border-teal-500/30 cursor-pointer transition-colors shrink-0 flex items-center gap-1"
							title="Заменить процедуру на актуальную услугу из прайс-листа клиники"
							data-testid={`replace-from-catalog-btn-${item.id}`}
						>
							<RefreshCw size={12} className="text-teal-600 dark:text-teal-400 shrink-0" />
							<span>Заменить на актуальную из прайса</span>
						</button>
					</div>
				</div>
			)}

			{/* Missing Price Alert Banner */}
			{(item.requiresManualPricing || item.priceRub === 0) && (
				<MissingPriceAlert
					item={item}
					onUpdatePrice={onUpdateItemPrice}
					onUpdateItem={onUpdateItem}
					variant="full"
					className="mt-1"
				/>
			)}
		</div>
	);
};
