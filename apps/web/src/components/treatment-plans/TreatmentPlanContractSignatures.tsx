import React from "react";
import { Check } from "lucide-react";
import { formatWarrantyYearsText, type DigitalSignatureAgreementData, type TreatmentPlanTier } from "./types";
import { TreatmentPlanQrCode } from "./qr/TreatmentPlanQrCode";

export interface TreatmentPlanContractSignaturesProps {
	readonly tier: TreatmentPlanTier;
	readonly doctorFullName: string;
	readonly qrPayload: string;
	readonly signedAgreement?: DigitalSignatureAgreementData | null | undefined;
	readonly patientName: string;
}

export const TreatmentPlanContractSignatures: React.FC<TreatmentPlanContractSignaturesProps> = ({
	tier,
	doctorFullName,
	qrPayload,
	signedAgreement,
	patientName,
}) => {
	return (
		<>
			{/* Section 4: Warranties & Clinical Obligations */}
			<div
				className="space-y-1.5 text-[10px] text-slate-600 treatment-print-warranties break-inside-avoid"
				style={{ breakInside: "avoid", pageBreakInside: "avoid" }}
			>
				<h3 className="font-bold text-slate-900 uppercase tracking-wide text-[11px] m-0">
					4. Гарантийные обязательства, условия сохранения гарантии и согласие пациента
				</h3>
				<p className="text-justify m-0">
					4.1. Гарантийный срок на выполненные работы и установленные конструкции по варианту «{tier.title}» составляет: <strong>{formatWarrantyYearsText(tier.warrantyYears)}</strong> с даты подписания Акта оказанных услуг при условии соблюдения Пациентом графика контрольных визитов (1 раз в 6 месяцев) и правил индивидуальной гигиены.
				</p>
				<p className="text-justify m-0">
					4.2. Условия гарантии по клиническим категориям:
					• Вариант А («Базовый / Эконом»): 1 год на базовые световые композитные пломбы и металлокерамические коронки/протезы Co-Cr.
					• Вариант Б («Оптимальный»): 2 года на биологическую герметизацию дентина, нанокомпозиты Estelite Asteria, стекловолоконные штифты, монолитный диоксид циркония Prettau и имплантаты Osstem TS-III.
					• Вариант В («Премиум»): 5 лет на эндодонтическое лечение под микроскопом Leica, керамику IPS e.max Press, индивидуальные циркониевые абатменты; пожизненная международная гарантия производителя на имплантаты Straumann SLActive / Astra Tech.
				</p>
				<p className="text-justify m-0">
					4.3. Информированное добровольное согласие на медицинское вмешательство (Приказ Минздрава России от 12.11.2021 № 1051н, ст. 20 Федерального закона № 323-ФЗ, Постановление Правительства РФ № 736):
					<br />
					а) Пациент подтверждает, что в доступной форме проинформирован о результатах обследования, диагнозе, сущности патологического процесса и прогнозе без лечения;
					<br />
					б) Пациент ознакомлен с альтернативными сценариями лечения («Эконом», «Оптимальный», «Премиум»), информирован о сравнительных свойствах материалов, сроках службы и лично утвердил вариант «{tier.title}»;
					<br />
					в) Пациенту разъяснены цели, методы оказания медицинской помощи, возможные риски, вероятность осложнений и предполагаемые результаты медицинского вмешательства;
					<br />
					г) Пациент предупрежден о необходимости строго соблюдать врачебные рекомендации, гигиену полости рта и являться на контрольные осмотры не реже 1 раза в 6 месяцев для сохранения гарантийных обязательств клиники.
				</p>
			</div>

			{/* Signatures & Verification QR Block */}
			<div
				className="pt-4 border-t border-slate-300 grid grid-cols-1 sm:grid-cols-3 print:grid-cols-3 gap-4 text-[11px] items-center break-inside-avoid"
				style={{ breakInside: "avoid", pageBreakInside: "avoid" }}
			>
				<div className="space-y-2">
					<strong className="text-slate-900 block">От Исполнителя (Клиника):</strong>
					<p className="text-slate-700 m-0 leading-relaxed">
						Врач-стоматолог: {doctorFullName || "______________________"}<br />
						М.П. ___________________ / {doctorFullName ? doctorFullName.split(" ")[0] : "___________"} /
					</p>
				</div>

				{/* Center QR verification badge */}
				<div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 text-center space-y-1">
					<div className="flex justify-center">
						<TreatmentPlanQrCode value={qrPayload} size={84} />
					</div>
					<span className="text-[9px] text-slate-500 font-mono block">
						QR-код согласования сметы
					</span>
				</div>

				<div className="space-y-2">
					<strong className="text-slate-900 block">Пациент (Заказчик):</strong>
					{signedAgreement ? (
						<div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 space-y-1">
							<div className="flex items-center gap-1.5 text-emerald-800 font-bold text-[10px]">
								<Check size={13} />
								<span>ПОДПИСАНО ЭЦП</span>
							</div>
							<img
								src={signedAgreement.signatureBase64}
								alt="Подпись пациента"
								className="h-9 max-w-[140px] object-contain border-b border-slate-300 py-0.5"
							/>
							<span className="text-[9px] text-slate-500 block font-mono">
								{new Date(signedAgreement.agreedAtIso).toLocaleString("ru-RU")}
							</span>
						</div>
					) : (
						<div className="space-y-1 pt-2">
							<div className="text-slate-800">
								Подпись: ______________________ / {patientName || "______________________"} /
							</div>
							<div className="text-[9px] text-slate-500 italic">
								(с диагнозом, планом лечения и стоимостью согласен)
							</div>
						</div>
					)}
				</div>
			</div>
		</>
	);
};
