import React from "react";
import { Building2, Truck, Check } from "lucide-react";

export interface DentalLabLaboratorySelectorProps {
	labType: "in_house" | "external";
	setLabType: (type: "in_house" | "external") => void;
	selectedLabName: string;
	setSelectedLabName: (name: string) => void;
	courierDays: number;
	setCourierDays: (days: number) => void;
}

export const EXTERNAL_LAB_PARTNERS = [
	{ id: "master", name: "CAD/CAM Центр Дентал-Мастер", days: 2 },
	{ id: "artdent", name: "ArtDent Премиум Лаб", days: 2 },
	{ id: "zircon", name: "ZirconLab Pro", days: 1 },
	{ id: "central", name: "Центральная лаборатория", days: 2 },
] as const;

export function DentalLabLaboratorySelector({
	labType,
	setLabType,
	selectedLabName,
	setSelectedLabName,
	courierDays,
	setCourierDays,
}: DentalLabLaboratorySelectorProps) {
	return (
		<div className="p-3 sm:p-3.5 rounded-2xl bg-[var(--paper-soft)] border border-[var(--line)] space-y-2.5">
			<div className="flex items-center justify-between flex-wrap gap-2">
				<label className="text-xs font-bold text-[var(--ink)] flex items-center gap-1.5">
					<span>Выбор зуботехнической лаборатории:</span>
				</label>
				<span className="text-[11px] font-semibold text-[var(--muted)]">
					{labType === "in_house" ? "Срок доставки: 0 дней (в клинике)" : `Курьер: +${courierDays} раб. дн.`}
				</span>
			</div>

			<div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
				<button
					type="button"
					onClick={() => {
						setLabType("in_house");
						setSelectedLabName("Своя лаборатория клиники");
						setCourierDays(0);
					}}
					className={`min-h-[44px] sm:min-h-[36px] p-2.5 rounded-xl border text-left text-xs transition cursor-pointer flex items-center justify-between gap-2 ${
						labType === "in_house"
							? "bg-teal-500/10 border-teal-500 text-teal-900 dark:text-teal-200 font-bold ring-1 ring-teal-500"
							: "bg-[var(--paper)] border-[var(--line)] text-[var(--ink)] hover:bg-[var(--paper-soft)]"
					}`}
					data-testid="lab-type-in-house-btn"
				>
					<div className="flex items-center gap-2">
						<Building2 className="w-4 h-4 text-teal-600 dark:text-teal-400 shrink-0" />
						<div>
							<div className="leading-tight">Своя лаборатория (in-house)</div>
							<div className="text-[10px] text-[var(--muted)] font-normal">CAD/CAM фрезерование на месте</div>
						</div>
					</div>
					{labType === "in_house" && <Check className="w-4 h-4 text-teal-600 dark:text-teal-400" />}
				</button>

				<button
					type="button"
					onClick={() => {
						setLabType("external");
						if (!selectedLabName || selectedLabName === "Своя лаборатория клиники") {
							setSelectedLabName(EXTERNAL_LAB_PARTNERS[0].name);
							setCourierDays(EXTERNAL_LAB_PARTNERS[0].days);
						}
					}}
					className={`min-h-[44px] sm:min-h-[36px] p-2.5 rounded-xl border text-left text-xs transition cursor-pointer flex items-center justify-between gap-2 ${
						labType === "external"
							? "bg-teal-500/10 border-teal-500 text-teal-900 dark:text-teal-200 font-bold ring-1 ring-teal-500"
							: "bg-[var(--paper)] border-[var(--line)] text-[var(--ink)] hover:bg-[var(--paper-soft)]"
					}`}
					data-testid="lab-type-external-btn"
				>
					<div className="flex items-center gap-2">
						<Truck className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
						<div>
							<div className="leading-tight">Внешняя лаборатория</div>
							<div className="text-[10px] text-[var(--muted)] font-normal">Партнерская зуботехническая сеть</div>
						</div>
					</div>
					{labType === "external" && <Check className="w-4 h-4 text-teal-600 dark:text-teal-400" />}
				</button>
			</div>

			{labType === "external" && (
				<div className="flex flex-wrap gap-1.5 pt-1">
					{EXTERNAL_LAB_PARTNERS.map((partner) => {
						const isSelected = selectedLabName === partner.name;
						return (
							<button
								key={partner.id}
								type="button"
								onClick={() => {
									setSelectedLabName(partner.name);
									setCourierDays(partner.days);
								}}
								className={`min-h-[36px] px-2.5 py-1 rounded-lg text-xs font-semibold border transition cursor-pointer ${
									isSelected
										? "bg-amber-500/15 border-amber-500 text-amber-900 dark:text-amber-100 font-bold ring-1 ring-amber-500/40"
										: "bg-[var(--paper)] border-[var(--line)] text-[var(--ink)] hover:bg-[var(--paper-soft)]"
								}`}
								data-testid={`lab-partner-${partner.id}`}
							>
								{partner.name} (+{partner.days} дн.)
							</button>
						);
					})}
				</div>
			)}
		</div>
	);
}
