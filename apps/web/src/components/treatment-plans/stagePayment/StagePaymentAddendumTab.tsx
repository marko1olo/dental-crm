/**
 * StagePaymentAddendumTab.tsx — Дополнительное соглашение к договору на поэтапную оплату (A4) (DENTE CRM).
 */

import React from "react";
import type { MilestoneStage, StagePaymentTotals } from "./stagePaymentEngine.js";
import { AddendumStagesTable } from "./addendumTab/AddendumStagesTable.js";
import { AddendumSignaturesBlock } from "./addendumTab/AddendumSignaturesBlock.js";

export interface StagePaymentAddendumTabProps {
	readonly stages: readonly MilestoneStage[];
	readonly totals: StagePaymentTotals;
	readonly clinicName: string;
	readonly clinicInn: string;
	readonly doctorFullName: string;
	readonly patientName: string;
	readonly patientId: string;
	readonly planTitle: string;
}

export const StagePaymentAddendumTab: React.FC<StagePaymentAddendumTabProps> = ({
	stages,
	totals,
	clinicName,
	clinicInn,
	doctorFullName,
	patientName,
	patientId,
	planTitle,
}) => {
	const currentDate = new Date();

	return (
		<div className="flex flex-col gap-4">
			<div className="contract-addendum-a4">
				<div className="text-center font-bold text-sm mb-1">
					ПРИЛОЖЕНИЕ № 1
				</div>
				<div className="text-center font-bold text-base mb-4">
					к Договору на оказание платных медицинских услуг<br />
					СОГЛАШЕНИЕ О ПОРЯДКЕ И ГРАФИКЕ ПОЭТАПНОЙ ОПЛАТЫ ЛЕЧЕНИЯ
				</div>

				<div className="flex justify-between text-xs mb-4">
					<span>г. Москва</span>
					<span>«{currentDate.getDate()}» {currentDate.toLocaleString("ru-RU", { month: "long" })} {currentDate.getFullYear()} г.</span>
				</div>

				<p className="text-xs text-justify mb-3">
					<strong>{clinicName}</strong>, именуемое в дальнейшем «Исполнитель», в лице главного врача, действующего на основании Устава и Лицензии на медицинскую деятельность, с одной стороны, и гражданин(ка) <strong>{patientName}</strong>, именуемый(ая) в дальнейшем «Пациент (Заказчик)», с другой стороны, заключили настоящее Соглашение о нижеследующем:
				</p>

				<div className="text-xs font-bold mb-2">1. ПРЕДМЕТ СОГЛАШЕНИЯ И ЭТАПЫ ЛЕЧЕНИЯ</div>
				<p className="text-xs text-justify mb-3">
					1.1. В соответствии со статьями 709, 711 Гражданского кодекса РФ Стороны согласовали план лечения <strong>«{planTitle}»</strong>, разделенный на самостоятельные клинические этапы с раздельным финансированием и приемкой результатов.
				</p>

				<AddendumStagesTable stages={stages} totals={totals} />

				<div className="text-xs font-bold mb-2 mt-4">2. ПОРЯДОК ОПЛАТЫ И ПРИЕМКИ РАБОТ (ЭСКРОУ)</div>
				<p className="text-xs text-justify mb-2">
					2.1. Пациент обязуется внести авансовый платеж по каждому этапу до начала выполнения соответствующих медицинских манипуляций.
				</p>
				<p className="text-xs text-justify mb-2">
					2.2. Авансовые средства блокируются на внутреннем эскроу-депозите клиники и признаются выручкой Исполнителя только после завершения этапа и подписания Сторонами двустороннего Акта сдачи-приемки выполненных работ (ст. 720 ГК РФ).
				</p>
				<p className="text-xs text-justify mb-4">
					2.3. В случае досрочного расторжения настоящего договора по инициативе Пациента (ст. 32 Закона РФ № 2300-1) внесенный аванс по незавершенным этапам возвращается за вычетом фактически понесенных Исполнителем затрат (оплата зуботехнической лаборатории CAD/CAM, титановые имплантаты, стерильные наборы).
				</p>

				<AddendumSignaturesBlock
					clinicName={clinicName}
					clinicInn={clinicInn}
					doctorFullName={doctorFullName}
					patientName={patientName}
					patientId={patientId}
				/>
			</div>
		</div>
	);
};

export default StagePaymentAddendumTab;
