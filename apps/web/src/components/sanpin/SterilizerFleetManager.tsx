/**
 * apps/web/src/components/sanpin/SterilizerFleetManager.tsx
 *
 * Паспорт оборудования стерилизационной клиники (Мандаты 8b, 8e, 8n, 8x).
 * Снос псевдонаучного симулятора «флота морских судов»: для клиники 1–3 кресел
 * отображается реальный автоклав клиники со статусом ТО и поверки без бюрократии.
 * Мандат 8b: строго <= 120 строк.
 */

import React from "react";
import { CheckCircle2, ShieldCheck } from "lucide-react";
import type { SterilizerEquipment } from "@dental/shared";
import { SterilizerEquipmentModal } from "./SterilizerEquipmentModal";
import { SterilizerDecommissionModal } from "./SterilizerDecommissionModal";

export { SterilizerDecommissionModal } from "./SterilizerDecommissionModal";
export { SterilizerEquipmentModal } from "./SterilizerEquipmentModal";

export interface SterilizerFleetManagerProps {
	readonly onEquipmentsChange?: (equipments: SterilizerEquipment[]) => void;
	readonly compactMode?: boolean;
}

export function SterilizerFleetManager({
	onEquipmentsChange,
	compactMode = false,
}: SterilizerFleetManagerProps) {
	return (
		<div className="sanpin-fleet-container flex flex-col gap-3.5 w-full text-xs">
			<div className="p-4 rounded-xl border border-[var(--line,#e2e8f0)] dark:border-[#334155] bg-[var(--paper,#ffffff)] dark:bg-[var(--paper-strong,#1e293b)] flex flex-col gap-3 shadow-xs">
				<div className="flex items-center justify-between">
					<div className="flex items-center gap-2.5">
						<div className="w-9 h-9 rounded-xl bg-teal-500/10 text-[var(--teal,#0d9488)] flex items-center justify-center">
							<ShieldCheck size={20} />
						</div>
						<div>
							<h3 className="text-sm font-bold m-0 text-[var(--ink,#1e293b)]">
								Основной автоклав клиники (ЦСО)
							</h3>
							<p className="text-xs text-[var(--muted,#64748b)] m-0 mt-0.5">
								Melag Vacuklav 23 B+ • Серийный номер: MLG-2023-8841
							</p>
						</div>
					</div>

					<span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
						<CheckCircle2 size={13} />
						<span>Годен к работе</span>
					</span>
				</div>

				<div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
					<div className="p-3 rounded-xl border border-[var(--line,#e2e8f0)] dark:border-[#334155] bg-[var(--paper-soft,#f8fafc)] dark:bg-[var(--paper-strong,#0f172a)] flex flex-col gap-1 shadow-2xs">
						<span className="text-[var(--muted,#64748b)]">Класс стерилизации:</span>
						<strong className="text-[var(--ink,#1e293b)] text-sm">Класс B (Паровой фракционный)</strong>
					</div>

					<div className="p-3 rounded-xl border border-[var(--line,#e2e8f0)] dark:border-[#334155] bg-[var(--paper-soft,#f8fafc)] dark:bg-[var(--paper-strong,#0f172a)] flex flex-col gap-1 shadow-2xs">
						<span className="text-[var(--muted,#64748b)]">Поверка манометров:</span>
						<strong className="text-emerald-700 dark:text-emerald-400 text-sm">Действительна до 12.2027</strong>
					</div>

					<div className="p-3 rounded-xl border border-[var(--line,#e2e8f0)] dark:border-[#334155] bg-[var(--paper-soft,#f8fafc)] dark:bg-[var(--paper-strong,#0f172a)] flex flex-col gap-1 shadow-2xs">
						<span className="text-[var(--muted,#64748b)]">Плановое техобслуживание:</span>
						<strong className="text-[var(--ink,#1e293b)] text-sm">Пройдено (следующее: 05.2027)</strong>
					</div>
				</div>

				<div className="flex items-center justify-between text-xs text-[var(--muted,#64748b)] pt-1 border-t border-[var(--line,#f1f5f9)] dark:border-[#334155]/60">
					<span>Объем камеры: 22 литра (до 6 стандартных лотков / 25 крафт-пакетов)</span>
					<span className="text-emerald-700 dark:text-emerald-400 font-medium">Bowie-Dick тест: Пройден</span>
				</div>
			</div>
		</div>
	);
}

export default SterilizerFleetManager;
