/**
 * apps/web/src/components/treatment-plans/actHeader/ActDocumentTitleBanner.tsx
 *
 * Баннер номера акта и договора, заголовок документа.
 */

import React from "react";
import { FileText } from "lucide-react";
import type { DocumentBrandColorPalette } from "../../../store/documentBrandingStore";
import type { CompletedWorksActAndWriteOffData } from "../types";

export interface ActDocumentTitleBannerProps {
	readonly actData: CompletedWorksActAndWriteOffData;
	readonly palette: DocumentBrandColorPalette;
	readonly contractDateFormatted: string;
	readonly address: string;
}

export const ActDocumentTitleBanner: React.FC<ActDocumentTitleBannerProps> = ({
	actData,
	palette,
	contractDateFormatted,
	address,
}) => {
	return (
		<>
			<div
				className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-xl border mb-5 print:mb-3"
				style={{
					backgroundColor: palette.softBg,
					borderColor: palette.accentBorder,
				}}
			>
				<div className="flex items-center gap-2">
					<span
						className="px-3 py-1 rounded-lg font-mono font-bold text-white text-xs inline-flex items-center gap-1.5 shadow-xs"
						style={{ backgroundColor: palette.primaryDark }}
					>
						<FileText className="w-3.5 h-3.5" />
						<span>АКТ&nbsp;№&nbsp;{actData.actNumber}</span>
					</span>
					<span className="text-xs font-bold text-slate-800">
						к&nbsp;Договору на оказание платных медицинских услуг №&nbsp;
						{actData.contractNumber} от {contractDateFormatted}&nbsp;г.
					</span>
				</div>
				<div className="text-xs font-semibold text-slate-600">
					Дата составления:{" "}
					<strong className="text-slate-900 font-mono">
						{actData.actDate}&nbsp;г.
					</strong>
					{address ? ` (${address.split(",")[0]?.trim()})` : ""}
				</div>
			</div>

			<div className="doc-official-title-box text-center my-4 print:my-2">
				<h1
					className="text-base sm:text-lg font-black tracking-tight uppercase text-slate-900"
					style={{ color: palette.primaryDark }}
				>
					АКТ СДАЧИ-ПРИЕМКИ ОКАЗАННЫХ СТОМАТОЛОГИЧЕСКИХ УСЛУГ
				</h1>
				<div className="doc-form-sub text-xs font-bold text-slate-600 uppercase tracking-wide mt-1">
					И НАКЛАДНАЯ НА СПИСАНИЕ МАТЕРИАЛОВ И МЕДИКАМЕНТОВ (ТМЦ) •
					ЭТАП&nbsp;№&nbsp;{actData.stageNumber} («
					{actData.stageTitle.replace(/^Этап\s*\d+\s*[:.—-]\s*/i, "")}»)
				</div>
				<p className="text-[10px] text-slate-500 mt-0.5">
					Составлен во исполнение ст.&nbsp;779–783 ГК&nbsp;РФ, ст.&nbsp;20, 79
					323-ФЗ и Постановления Правительства РФ от 11.05.2023 №&nbsp;736
				</p>
			</div>
		</>
	);
};
