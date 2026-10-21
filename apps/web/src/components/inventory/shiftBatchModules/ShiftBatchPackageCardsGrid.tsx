import React from "react";
import { PackageCheck, ShieldCheck, Sparkles, Syringe } from "lucide-react";
import type { ClinicalPackageId } from "../warehousePackageWriteOffEngine.js";
import { ShiftBatchPackageCard } from "./ShiftBatchPackageCard.js";

export interface ShiftBatchPackageCardsGridProps {
	readonly multiplier: number;
	readonly submittingPackageId: string | null;
	readonly onPackageClick: (packageId: ClinicalPackageId) => Promise<void>;
}

export const ShiftBatchPackageCardsGrid: React.FC<ShiftBatchPackageCardsGridProps> = ({
	multiplier,
	submittingPackageId,
	onPackageClick,
}) => {
	return (
		<div className="grid grid-cols-1 md:grid-cols-2 gap-3">
			<ShiftBatchPackageCard
				title="Карпула анестетика (1.7 мл)"
				description="Артикаин / Септанест / Убистезин. 1-клик списание пустых карпул медсестрой (отходы класса Б)."
				icon={<Syringe className="w-4 h-4 text-teal-600 shrink-0" />}
				packageId="carpule_quick"
				testId="btn-writeoff-anesthetic-carpule"
				buttonClassName="btn-writeoff-anesthetic-carpule bg-teal-50 dark:bg-teal-950/30 border-teal-500/30 text-teal-800 dark:text-teal-200 hover:bg-teal-500/15"
				buttonLabel={`Списать препарат (${multiplier} карп.)`}
				isSubmitting={submittingPackageId === "carpule_quick"}
				onPackageClick={onPackageClick}
			/>

			<ShiftBatchPackageCard
				title="Набор стерилизации"
				description="1 лоток со смотровым инструментом в крафт-пакете + 2 пары нитриловых перчаток."
				icon={<PackageCheck className="w-4 h-4 text-indigo-600 shrink-0" />}
				packageId="sterilization_kit"
				testId="btn-writeoff-sterilization-kit"
				buttonClassName="btn-writeoff-sterilization-kit bg-indigo-50 dark:bg-indigo-950/30 border-indigo-500/30 text-indigo-800 dark:text-indigo-200 hover:bg-indigo-500/15"
				buttonLabel={`Набор стерилизации (${multiplier} лот.)`}
				isSubmitting={submittingPackageId === "sterilization_kit"}
				onPackageClick={onPackageClick}
			/>

			<ShiftBatchPackageCard
				title="Стандартная анестезия"
				description="Карпула артикаина 1.7 мл + карпульная игла 30G + 4 ватных валика + спиртовая салфетка."
				icon={<Syringe className="w-4 h-4 text-teal-600 shrink-0" />}
				packageId="anesthesia"
				testId="btn-writeoff-anesthesia-packet"
				buttonClassName="btn-writeoff-anesthesia-packet bg-teal-50 dark:bg-teal-950/30 border-teal-500/30 text-teal-800 dark:text-teal-200 hover:bg-teal-500/15"
				buttonLabel={`Списать анестезию (${multiplier} пак.)`}
				isSubmitting={submittingPackageId === "anesthesia"}
				onPackageClick={onPackageClick}
			/>

			<ShiftBatchPackageCard
				title="Профгигиена"
				description="СИЗ + Оптрагейт + порошок Air-Flow + полировочная паста + щетка + нагрудник."
				icon={<ShieldCheck className="w-4 h-4 text-blue-600 shrink-0" />}
				packageId="hygiene"
				testId="btn-writeoff-hygiene-packet"
				buttonClassName="btn-writeoff-hygiene-packet bg-blue-50 dark:bg-blue-950/30 border-blue-500/30 text-blue-800 dark:text-blue-200 hover:bg-blue-500/15"
				buttonLabel={`Списать гигиену (${multiplier} пак.)`}
				isSubmitting={submittingPackageId === "hygiene"}
				onPackageClick={onPackageClick}
			/>

			<ShiftBatchPackageCard
				title="Пломба световая (Терапия)"
				description="Анестезия + СИЗ + нанокомпозит 0.2 г + адгезив + протравка 37% + матрица."
				icon={<Sparkles className="w-4 h-4 text-emerald-600 shrink-0" />}
				packageId="filling"
				testId="btn-writeoff-filling-packet"
				buttonClassName="btn-writeoff-filling-packet bg-emerald-50 dark:bg-emerald-950/30 border-emerald-500/30 text-emerald-800 dark:text-emerald-200 hover:bg-emerald-500/15"
				buttonLabel={`Списать пломбу (${multiplier} пак.)`}
				isSubmitting={submittingPackageId === "filling"}
				onPackageClick={onPackageClick}
			/>

			<ShiftBatchPackageCard
				title="Хирургический пакет"
				description="Анестетик + игла 27G + скальпель №15 + шовный материал Vicryl + гемостатическая губка."
				icon={<ShieldCheck className="w-4 h-4 text-purple-600 shrink-0" />}
				packageId="surgery"
				testId="btn-writeoff-surgery-packet"
				buttonClassName="btn-writeoff-surgery-packet bg-purple-50 dark:bg-purple-950/30 border-purple-500/30 text-purple-800 dark:text-purple-200 hover:bg-purple-500/15"
				buttonLabel={`Списать хирургию (${multiplier} пак.)`}
				isSubmitting={submittingPackageId === "surgery"}
				onPackageClick={onPackageClick}
			/>
		</div>
	);
};
