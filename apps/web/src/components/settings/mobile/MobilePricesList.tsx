import React from "react";
import { ChevronRight, Clock } from "lucide-react";
import { money } from "../../../AppHelpers";

const DEFAULT_CATEGORY_LABELS: Record<string, string> = {
	all: "Все",
	therapy: "Терапия",
	anesthesia: "Анестезия",
	orthopedics: "Ортопедия",
	surgery: "Хирургия",
	hygiene: "Гигиена",
	orthodontics: "Ортодонтия",
	radiology: "Рентген / КТ",
	xray: "Рентген / КТ",
	endo: "Эндодонтия",
	other: "Прочее",
};

interface MobilePricesListProps {
	services: any[];
	serviceCategoryLabels: Record<string, string>;
	onSelectService: (service: any) => void;
}

export const MobilePricesList: React.FC<MobilePricesListProps> = ({
	services,
	serviceCategoryLabels,
	onSelectService,
}) => {
	return (
		<div className="rounded-[16px] bg-[var(--paper)] border border-[var(--line)] overflow-hidden divide-y divide-[var(--line-subtle)] shadow-xs">
			{services.map((service) => {
				const s = service as any;
				const basePrice = s.basePriceRub ?? s.priceRub ?? 0;
				return (
					<div
						key={service.id}
						onClick={() => onSelectService(service)}
						className="flex items-center justify-between p-3.5 min-h-[58px] active:bg-[var(--paper-soft)] cursor-pointer transition-colors"
						role="button"
						tabIndex={0}
						onKeyDown={(e) => {
							if (e.key === "Enter" || e.key === " ") {
								e.preventDefault();
								onSelectService(service);
							}
						}}
						data-testid={`mobile-service-row-${service.id}`}
					>
						<div className="flex flex-col gap-1 min-w-0 pr-3 flex-1">
							<div className="flex items-center gap-1.5 flex-wrap">
								{service.code ? (
									<span className="text-[11px] font-mono font-medium px-1.5 py-0.5 rounded bg-[var(--paper-soft)] text-[var(--muted)] border border-[var(--line)] shrink-0 whitespace-nowrap">
										{service.code}
									</span>
								) : (
									<span className="text-[11px] font-mono px-1.5 py-0.5 rounded bg-[var(--paper-soft)] text-[var(--muted)] shrink-0 whitespace-nowrap">
										Без кода
									</span>
								)}
								{s.taxDeductible !== false && (
									<span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 border border-emerald-500/20 whitespace-nowrap">
										Вычет
									</span>
								)}
								{s.vatRate === "vat_20" ? (
									<span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-800 dark:text-amber-300 whitespace-nowrap">
										НДС 20%
									</span>
								) : (
									<span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-teal-500/10 text-teal-800 dark:text-teal-300 whitespace-nowrap">
										ст. 149
									</span>
								)}
							</div>

							<h4 className="text-[15px] font-semibold text-[var(--ink)] leading-snug break-words">
								{service.title}
							</h4>

							<div className="flex items-center gap-2 text-[12px] text-[var(--muted)] mt-0.5">
								<span>
									{serviceCategoryLabels[service.category || "therapy"] ||
										DEFAULT_CATEGORY_LABELS[service.category || "therapy"] ||
										service.category ||
										"Терапия"}
								</span>
								<span>•</span>
								<span className="flex items-center gap-0.5 font-mono">
									<Clock size={11} /> {service.durationMinutes || 30} мин
								</span>
							</div>
						</div>

						<div className="flex items-center gap-2 shrink-0">
							<div className="flex flex-col items-end">
								<span className="text-[16px] font-bold font-mono text-[var(--teal)] whitespace-nowrap">
									{money(basePrice)}
								</span>
							</div>
							<ChevronRight size={16} className="text-[var(--muted)] shrink-0" />
						</div>
					</div>
				);
			})}
		</div>
	);
};
