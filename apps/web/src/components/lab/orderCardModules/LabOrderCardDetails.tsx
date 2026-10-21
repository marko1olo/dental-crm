import React from "react";
import { AlertOctagon, Box, Calendar, CheckCircle2 } from "lucide-react";
import { money } from "../../../AppHelpers";
import type { DentalLabOrderData } from "../DentalLabOrderModal";
import { formatLabConstructionTitle } from "../dentalLabDefinitions";
import { is3DScanUrl } from "../LabAttachScanModal";

export interface LabOrderCardDetailsProps {
	order: DentalLabOrderData;
}

export function LabOrderCardDetails({ order }: LabOrderCardDetailsProps): React.JSX.Element {
	const construction = order.constructionType || (order as unknown as { workType?: string }).workType;
	const is3DScan = Boolean(order.attachedImageUrl && is3DScanUrl(order.attachedImageUrl));
	const isPaid = Boolean((order as unknown as { paidFromCashOperationId?: string }).paidFromCashOperationId);
	const isLocked = Boolean((order as unknown as { isLockedInstalled?: boolean }).isLockedInstalled);

	return (
		<div className="space-y-2">
			{/* Tech Details */}
			<div className="p-2.5 bg-[var(--paper-soft)] rounded-xl border border-[var(--line)] text-xs space-y-1 text-[var(--ink)]">
				{construction && (
					<div className="flex justify-between gap-2">
						<span className="text-[var(--muted)] shrink-0">Конструкция:</span>
						<span className="font-semibold text-right break-words line-clamp-2 leading-tight">
							{formatLabConstructionTitle(construction, order.material ?? undefined)}
						</span>
					</div>
				)}
				<div className="flex justify-between gap-2">
					<span className="text-[var(--muted)] shrink-0">Материал:</span>
					<span className="font-semibold text-right truncate">{order.material || "Диоксид циркония"}</span>
				</div>
				<div className="flex justify-between gap-2">
					<span className="text-[var(--muted)] shrink-0">Цвет VITA:</span>
					<span className="font-bold text-teal-600 dark:text-teal-400 font-mono">
						{order.colorVita || "A2"} {order.shadeStump ? `(Культя: ${order.shadeStump})` : ""}
					</span>
				</div>
				{is3DScan && (
					<div className="flex items-center gap-1.5 text-teal-700 dark:text-teal-300 font-semibold pt-0.5">
						<Box className="w-3.5 h-3.5 shrink-0" />
						<span className="truncate">Интраоральный 3D-скан прикреплен</span>
					</div>
				)}
				{order.clinicalNotes && (
					<div className="text-[11px] text-[var(--muted)] italic pt-1 border-t border-[var(--line-subtle)] line-clamp-2">
						«{order.clinicalNotes}»
					</div>
				)}
			</div>

			{/* Dates and Price Summary */}
			<div className="flex items-center justify-between text-xs pt-1 border-t border-[var(--line-subtle)]">
				<div className="flex items-center gap-1.5 text-[var(--muted)] min-w-0">
					<Calendar className="w-3.5 h-3.5 shrink-0" />
					<span className="truncate">
						{order.dueDate ? `Срок: ${new Date(order.dueDate).toLocaleDateString("ru-RU")}` : "Срок не назначен"}
					</span>
				</div>
				<div className="font-extrabold font-mono text-[var(--ink)] text-sm shrink-0">
					{money(order.priceRub || 0)}
				</div>
			</div>

			{/* Badges: Cashbox Paid / Warranty Rework */}
			{(isPaid || isLocked || order.isWarrantyRework) && (
				<div className="flex flex-wrap gap-1.5 pt-1">
					{isPaid && (
						<span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20 flex items-center gap-1">
							<CheckCircle2 className="w-3 h-3" /> Оплачен из кассы
						</span>
					)}
					{isLocked && (
						<span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-500/10 text-blue-700 dark:text-blue-300 border border-blue-500/20">
							Зафиксирован у пациента
						</span>
					)}
					{order.isWarrantyRework && (
						<span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-rose-500/10 text-rose-700 dark:text-rose-300 border border-rose-500/20 flex items-center gap-1">
							<AlertOctagon className="w-3 h-3" /> Переделка по гарантии 0 ₽
						</span>
					)}
				</div>
			)}
		</div>
	);
}
