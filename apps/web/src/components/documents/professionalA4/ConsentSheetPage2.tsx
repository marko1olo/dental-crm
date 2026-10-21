import type React from "react";
import type { A4DocumentInformedConsentData } from "@dental/shared";

export interface ConsentSheetPage2Props {
	effectiveConsentData: A4DocumentInformedConsentData | undefined;
	// biome-ignore lint/suspicious/noExplicitAny: clinicRequisites
	cl: any;
}

export function ConsentSheetPage2({
	effectiveConsentData,
	cl,
}: ConsentSheetPage2Props): React.JSX.Element {
	// biome-ignore lint/suspicious/noExplicitAny: patient
	const pt = effectiveConsentData?.patient ?? ({} as any);
	const doctor = effectiveConsentData?.doctorFullName ?? "Лечащий врач";

	return (
		<section className="pro-a4-page-sheet">
			<div className="a4-sheet-body">
				<div className="a4-running-header">
					<span>
						{cl.legalName || cl.name} · Информированное добровольное согласие
					</span>
					<span>Пациент: {pt.fullName} · Лист 2 из 2</span>
				</div>

				<h2 className="a4-section-heading">4. Альтернативные методы лечения</h2>
				<p className="a4-p">
					4.1. Мне разъяснены альтернативные методы лечения (динамическое
					наблюдение, консервативная реминерализирующая терапия при начальном
					кариесе, удаление зуба при невозможности эндодонтического сохранения)
					и последствия отказа от предложенного вмешательства.
				</p>

				<h2 className="a4-section-heading">
					5. Обязательства пациента и рекомендации после вмешательства
				</h2>
				<p className="a4-p">
					5.1. Я обязуюсь: воздержаться от приема твердой и горячей пищи до
					полного окончания действия анестезии во избежание травматического
					прикусывания мягких тканей; соблюдать щадящую диету в течение первых
					суток; тщательно выполнять индивидуальную гигиену полости рта
					рекомендованными средствами; незамедлительно связаться с клиникой при
					возникновении выраженного отека, повышении температуры тела или острой
					боли.
				</p>

				<h2 className="a4-section-heading">
					6. Право на отказ от медицинского вмешательства
				</h2>
				<p className="a4-p">
					6.1. Мне разъяснено право отказаться от медицинского вмешательства или
					потребовать его прекращения в любой момент. Возможные последствия
					отказа (прогрессирование инфекции, развитие пульпита, периодонтита,
					потеря зуба и распространение воспаления на челюстную кость) мне
					полностью понятны.
				</p>

				<h2 className="a4-section-heading">
					7. Подтверждение добровольности и информированности
				</h2>
				<p className="a4-p" style={{ fontWeight: "bold" }}>
					Я подтверждаю, что текст настоящего Информированного добровольного
					согласия мною прочитан, все медицинские термины разъяснены лечащим
					врачом, на все заданные вопросы получены исчерпывающие ответы. Я
					принимаю осознанное добровольное решение о прохождении медицинского
					вмешательства на предложенных условиях.
				</p>

				<div className="a4-sign-grid" style={{ marginTop: "30px" }}>
					<div className="a4-sign-col">
						<strong>ВРАЧ, ПРОВЕДШИЙ БЕСЕДУ:</strong>
						<br />
						<br />
						Врач-стоматолог:
						<br />
						<div className="a4-sign-line" />
						<div className="a4-sign-hint">
							/ {doctor} / <span className="stamp-box">М.П.</span>
						</div>
					</div>
					<div className="a4-sign-col">
						<strong>ПАЦИЕНТ (ЗАКАЗЧИК):</strong>
						<br />
						<br />
						Пациент:
						<br />
						<div className="a4-sign-line" />
						<div className="a4-sign-hint">
							/ {pt.fullName} / (согласие дано добровольно)
						</div>
					</div>
				</div>
			</div>

			<div className="a4-running-footer">
				<span>ИДС на медицинское вмешательство — Пациент: {pt.fullName}</span>
				<span>Лист 2 из 2</span>
			</div>
		</section>
	);
}
