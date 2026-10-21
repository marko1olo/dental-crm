import React from "react";
import type { DocumentBrandColorPalette } from "../../../store/documentBrandingStore.js";

export interface ActLegalTermsSectionProps {
	readonly palette: DocumentBrandColorPalette;
}

export const ActLegalTermsSection: React.FC<ActLegalTermsSectionProps> = ({ palette }) => {
	return (
		<div
			className="pt-3 border-t border-slate-300 text-xs text-slate-900 space-y-3 print:space-y-2 mb-6 print:mb-4 break-inside-avoid"
			style={{ breakInside: "avoid", pageBreakInside: "avoid" }}
		>
			<div className="font-bold uppercase tracking-wider text-[11px]" style={{ color: palette.primaryDark }}>
				3. Условия сдачи-приемки и гарантийные обязательства
			</div>
			<ol className="list-decimal pl-4 space-y-1.5 text-justify leading-relaxed text-[11px] text-slate-700">
				<li>
					Вышеперечисленные медицинские услуги оказаны Исполнителем надлежащим образом, в полном объеме, своевременно и в строгом соответствии с клиническими рекомендациями (протоколами лечения) и стандартами медицинской помощи РФ.
				</li>
				<li>
					Пациент (Заказчик) подтверждает, что результат оказанных медицинских услуг им осмотрен и принят в полном объеме. Претензий по объему, качеству, эстетическому результату и срокам оказания услуг Пациент к Исполнителю не имеет.
				</li>
				<li>
					Лечащим врачом даны исчерпывающие клинические рекомендации по индивидуальной гигиене полости рта, режиму приема пищи и контрольным осмотрам. Гарантийные обязательства разъяснены в соответствии с Положением о гарантиях клиники.
				</li>
				<li>
					Списание медикаментов и стоматологических материалов произведено по фактическому назначению лечащего врача в соответствии с утвержденными нормами расхода.
				</li>
			</ol>
		</div>
	);
};
