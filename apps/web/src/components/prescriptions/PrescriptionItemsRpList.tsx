/**
 * PrescriptionItemsRpList.tsx — Latin Inscription & Dispensation Block
 */

import { formatCanonicalRpLatin } from "@dental/shared";
import React from "react";

export interface PrescriptionItemsRpListProps {
	readonly activeItems: readonly {
		readonly id: string;
		readonly latinName: string;
		readonly dispenseLatin: string;
		readonly signaRussian: string;
		readonly tradeName: string;
	}[];
}

export const PrescriptionItemsRpList: React.FC<
	PrescriptionItemsRpListProps
> = ({ activeItems }) => {
	return (
		<div className="flex flex-col gap-3 min-h-[110px] py-1.5 text-[var(--ink)]">
			{activeItems.length > 0 ? (
				activeItems.map((item, idx) => (
					<div key={item.id} className="font-serif text-[var(--ink)]">
						<div className="font-bold text-[11.5px] italic text-[var(--ink)]">
							{idx + 1}. {formatCanonicalRpLatin(item.latinName)}
						</div>
						<div className="ml-5 italic text-[11px] text-[var(--ink)] opacity-90">
							{item.dispenseLatin}
						</div>
						<div className="ml-5 text-[11px] font-sans font-medium text-[var(--ink)]">
							{item.signaRussian}
						</div>
						<div className="ml-5 text-[9.5px] font-sans text-[var(--muted)]">
							[Торговое наименование:{" "}
							<strong className="text-[var(--ink)]">{item.tradeName}</strong>]
						</div>
					</div>
				))
			) : (
				<div className="p-4 rounded-lg border border-dashed border-[var(--line)] text-center text-xs text-[var(--muted)] font-sans flex flex-col items-center justify-center min-h-[90px]">
					Выберите готовый пакет назначений слева или добавьте препарат
				</div>
			)}
		</div>
	);
};
