import React from "react";
import { Receipt, X } from "lucide-react";
import type { ToothClinicalServicePayload } from "@dental/shared";
import { showToast } from "../../../GlobalToast";

export interface ToothAssignedServicesSectionProps {
	code: string;
	toothServices: ToothClinicalServicePayload[];
	toothTotalRub: number;
	completedServices: ToothClinicalServicePayload[];
	removeCompletedService: (index: number) => void;
}

export function ToothAssignedServicesSection({
	code,
	toothServices,
	toothTotalRub,
	completedServices,
	removeCompletedService,
}: ToothAssignedServicesSectionProps) {
	return (
		<div className="_ccm-tooth-services-section mt-3 pt-2.5 border-t border-[var(--line)]">
			<div className="flex items-center justify-between text-xs font-semibold mb-1.5">
				<span className="text-[var(--text-strong)] flex items-center gap-1">
					<Receipt className="w-3.5 h-3.5 text-[var(--teal)]" />
					Услуги на зубе {code} ({toothServices.length})
				</span>
				<span className="text-[var(--teal)] font-bold">
					{toothTotalRub > 0 ? `${toothTotalRub.toLocaleString("ru-RU")} ₽` : "0 ₽"}
				</span>
			</div>
			{toothServices.length === 0 ? (
				<div className="text-[11px] text-[var(--muted)] py-1 italic">
					На этот зуб еще не добавлены услуги. Выберите услугу или пакет выше.
				</div>
			) : (
				<div className="flex flex-col gap-1 max-h-32 overflow-y-auto pr-1">
					{toothServices.map((svc, idx) => (
						<div
							key={`${svc.serviceId}-${idx}`}
							className="flex items-center justify-between text-[11px] bg-[var(--paper-soft)] p-1.5 rounded border border-[var(--line-subtle)]"
						>
							<div className="flex items-center gap-1.5 truncate">
								<span className="text-[10px] font-mono font-medium px-1 py-0.5 rounded bg-[var(--teal-subtle)] text-[var(--teal)] shrink-0">
									{svc.code804n}
								</span>
								<span className="truncate text-[var(--text)]">{svc.name}</span>
							</div>
							<div className="flex items-center gap-2 shrink-0 ml-2">
								<span className="font-semibold text-[var(--text-strong)]">
									{svc.priceRub.toLocaleString("ru-RU")} ₽
								</span>
								<button
									type="button"
									onClick={() => {
										const realIdx = completedServices.findIndex((cs) => cs === svc);
										if (realIdx !== -1) {
											removeCompletedService(realIdx);
											showToast(`Услуга [${svc.code804n}] удалена с зуба ${code}`, "info", 2000);
										}
									}}
									className="text-[var(--muted)] hover:text-red-500 p-0.5 rounded transition-colors"
									title="Удалить услугу"
									aria-label={`Удалить услугу ${svc.name}`}
								>
									<X className="w-3 h-3" />
								</button>
							</div>
						</div>
					))}
				</div>
			)}
		</div>
	);
}
