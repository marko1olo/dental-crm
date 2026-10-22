import React from "react";
import { ShieldAlert, ShieldCheck } from "lucide-react";
import { showToast } from "../../GlobalToast";
import type { ToothContextDrawerProps } from "./toothDrawerTypes";

interface ToothSomaticStatusBannerProps {
	patient: ToothContextDrawerProps["patient"];
	onInsertToProtocol?: ((text: string) => void) | undefined;
}

export const ToothSomaticStatusBanner: React.FC<ToothSomaticStatusBannerProps> = ({
	patient,
	onInsertToProtocol,
}) => {
	const hasSomaticRisk = Boolean(patient?.hasCardioRisk || patient?.hasSulfiteAllergy || patient?.hasAsthma || patient?.isPregnant);

	if (hasSomaticRisk) {
		return (
			<div className="dente-somatic-alert-strip" data-testid="tooth-somatic-risk-alert">
				<ShieldAlert size={16} className="shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
				<div className="min-w-0">
					<div className="font-bold text-xs">Отягощенный соматический статус (ASA II–III)</div>
					<div className="text-[11px] mt-0.5">
						{patient?.hasCardioRisk && "Кардио-риск • "}
						{patient?.hasSulfiteAllergy && "Аллергия на сульфиты • "}
						{patient?.hasAsthma && "Бронхиальная астма • "}
						{patient?.isPregnant && "Беременность • "}
						Рекомендован Скандонест 3% (без адреналина)
					</div>
				</div>
			</div>
		);
	}

	return (
		<div className="flex items-center justify-between text-xs p-2 rounded-lg bg-[var(--paper-soft,#f8fafc)] border border-[var(--line,#e2e8f0)]" data-testid="tooth-somatic-norm-strip">
			<div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-semibold min-w-0 truncate">
				<ShieldCheck size={14} className="shrink-0" />
				<span className="truncate min-w-0">Соматически здоров (ASA I) • Норма</span>
			</div>
			<button
				type="button"
				onClick={() => {
					onInsertToProtocol?.("Соматический статус: Соматически здоров / физиологическая норма. Аллергологический анамнез не отягощен.");
					showToast("Соматическая норма внесена в медицинскую карту", "success", 2000);
				}}
				className="px-2 py-1 text-[11px] font-bold rounded-md bg-[var(--teal-surface)] text-[var(--teal)] hover:bg-[var(--teal)] hover:text-white transition-colors shrink-0 ml-2 cursor-pointer"
				title="Вставить соматическую норму в медицинскую карту"
				data-testid="tooth-somatic-norm-btn"
			>
				В протокол
			</button>
		</div>
	);
};
