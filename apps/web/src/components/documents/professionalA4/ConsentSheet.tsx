import React from "react";
import { formatRubles, formatAmountInWordsRu, formatAddressString, formatPhoneString, formatDateString, formatPassportString, formatSnilsString, formatSignatoryString } from "@dental/shared";
import type {
    A4DocumentContractData,
    A4DocumentActData,
    A4DocumentTreatmentPlanData,
    A4DocumentInformedConsentData,
    A4DocumentPersonalDataConsentData,
    A4DocumentMedicalCardData
} from "@dental/shared";

export interface ConsentSheetProps {
    zoomClass: string;
    effectiveConsentData: A4DocumentInformedConsentData | undefined;
    cl: any;
}

export const ConsentSheet: React.FC<ConsentSheetProps> = ({
    effectiveConsentData,
    cl,
    zoomClass,
}) => {
    const pt = effectiveConsentData?.patient ?? ({} as any);
    const doctor = effectiveConsentData?.doctorFullName ?? "Лечащий врач";
    const contractDate = effectiveConsentData?.consentDate ?? effectiveConsentData?.contractDate ?? new Date().toLocaleDateString("ru-RU");

    return (
        <div className="pro-a4-sheet-stack" data-testid="a4-consent-1051n-content">
						{/* ── ЛИСТ 1 ИЗ 2 ── */}
						<section className="pro-a4-page-sheet" data-testid="pro-a4-physical-sheet">
							<div className="a4-sheet-body">
								<header className="a4-header">
									<div className="a4-clinic-name">{cl.legalName || cl.name}</div>
									<div className="a4-clinic-requisites">
										Адрес: {cl.actualAddress || cl.address} · Тел: {cl.phone} · ИНН: {cl.inn} · ОГРН: {cl.ogrn}<br />
										Лицензия на осуществление медицинской деятельности: № {cl.licenseNumber}
									</div>
								</header>

								<h1 className="a4-doc-title">ИНФОРМИРОВАННОЕ ДОБРОВОЛЬНОЕ СОГЛАСИЕ НА МЕДИЦИНСКОЕ ВМЕШАТЕЛЬСТВО</h1>
								<div className="a4-doc-subtitle">
									в соответствии со статьей 20 Федерального закона от 21.11.2011 № 323-ФЗ
									<br />
									и Приказом Министерства здравоохранения Российской Федерации от 12.11.2021 № 1051н
								</div>

								<div className="a4-meta-row">
									<div>{cl.city || "г. Москва"}</div>
									<div>«{contractDate}» г.</div>
								</div>

								<p className="a4-p">
									Я, гражданин(ка) <strong>{pt.fullName}</strong>, дата рождения: {pt.birthDate || "«___» _________ _____ г."}, документ, удостоверяющий личность: {formatPassportString(pt)}, проживающий(ая) по адресу: {pt.registrationAddress || pt.address || "____________________________________"}, настоящим даю информированное добровольное согласие на проведение медицинского вмешательства лечащим врачом <strong>{doctor}</strong>.
								</p>

								<h2 className="a4-section-heading">1. Цели, методы и характер медицинского вмешательства</h2>
								<p className="a4-p">
									1.1. Мне в доступной форме разъяснены цели вмешательства: диагностика состояния зубочелюстной системы, купирование воспалительного процесса, восстановление анатомической формы, жевательной функции и эстетики зубов.
								</p>
								<p className="a4-p">
									1.2. Планируемые манипуляции включают: визуальный и инструментальный осмотр, фотопротокол, прицельную визиографию и КЛКТ, инфильтрационную и проводниковую местную анестезию, препарирование кариозных полостей с водно-воздушным охлаждением, изоляцию системой коффердам, эндодонтическую обработку корневых каналов, установку адгезивных композитных пломб и ортопедических конструкций.
								</p>

								<h2 className="a4-section-heading">2. Применяемая местная анестезия и возможные реакции</h2>
								<p className="a4-p">
									2.1. Для обезболивания применяются современные карпульные анестетики артикаинового ряда (Ультракаин, Убистезин) с вазоконстриктором (эпинефрин 1:100000 или 1:200000) либо без него при соматических противопоказаниях.
								</p>
								<p className="a4-p">
									2.2. Мне разъяснено, что применение местной анестезии может сопровождаться чувством распирания в месте инъекции, кратковременным учащением пульса, временным онемением губ, щек и языка длительностью от 1 до 4 часов, а также редкими рисками образования микрогематомы или индивидуальной аллергической реакции.
								</p>

								<h2 className="a4-section-heading">3. Возможные осложнения и нежелательные последствия</h2>
								<p className="a4-p">
									3.1. Мне разъяснено, что медицинское вмешательство сопряжено с естественными биологическими реакциями тканей: возможна постпломбировочная чувствительность зуба при накусывании в течение 3–7 дней, незначительная болезненность десны в месте фиксации клампа коффердама, изменение вкусовых ощущений.
								</p>
								<p className="a4-p">
									3.2. При глубоком кариесе существует вероятность случайного вскрытия воспаленной пульпы, требующего расширения вмешательства до эндодонтического лечения корневых каналов.
								</p>
							</div>

							<div className="a4-running-footer">
								<span>ИДС (Приказ МЗ РФ № 1051н) — Пациент: {pt.fullName}</span>
								<span>Стр. 1 из 2</span>
							</div>
						</section>

						{/* ── ЛИСТ 2 ИЗ 2 ── */}
						<section className="pro-a4-page-sheet">
							<div className="a4-sheet-body">
								<div className="a4-running-header">
									<span>{cl.legalName || cl.name} · ИДС (Приказ МЗ РФ № 1051н)</span>
									<span>Пациент: {pt.fullName} · Стр. 2 из 2</span>
								</div>

								<h2 className="a4-section-heading">4. Альтернативные методы лечения</h2>
								<p className="a4-p">
									4.1. Мне разъяснены альтернативные методы лечения (динамическое наблюдение, консервативная реминерализирующая терапия при начальном кариесе, удаление зуба при невозможности эндодонтического сохранения) и последствия отказа от предложенного вмешательства.
								</p>

								<h2 className="a4-section-heading">5. Обязательства пациента и рекомендации после вмешательства</h2>
								<p className="a4-p">
									5.1. Я обязуюсь: воздержаться от приема твердой и горячей пищи до полного окончания действия анестезии во избежание травматического прикусывания мягких тканей; соблюдать щадящую диету в течение первых суток; тщательно выполнять индивидуальную гигиену полости рта рекомендованными средствами; незамедлительно связаться с клиникой при возникновении выраженного отека, повышении температуры тела или острой боли.
								</p>

								<h2 className="a4-section-heading">6. Право на отказ от медицинского вмешательства</h2>
								<p className="a4-p">
									6.1. Мне разъяснено право отказаться от медицинского вмешательства или потребовать его прекращения в соответствии с частью 3 статьи 20 Федерального закона № 323-ФЗ. Возможные последствия отказа (прогрессирование инфекции, развитие пульпита, периодонтита, потеря зуба и распространение воспаления на челюстную кость) мне полностью понятны.
								</p>

								<h2 className="a4-section-heading">7. Подтверждение добровольности и информированности</h2>
								<p className="a4-p" style={{ fontWeight: "bold" }}>
									Я подтверждаю, что текст настоящего Информированного добровольного согласия мною прочитан, все медицинские термины разъяснены лечащим врачом, на все заданные вопросы получены исчерпывающие ответы. Я принимаю осознанное добровольное решение о прохождении медицинского вмешательства на предложенных условиях.
								</p>

								<div className="a4-sign-grid" style={{ marginTop: "30px" }}>
									<div className="a4-sign-col">
										<strong>ЛЕЧАЩИЙ ВРАЧ:</strong><br /><br />
										Врач-стоматолог:<br />
										<div className="a4-sign-line" />
										<div className="a4-sign-hint">/ {doctor} / <span className="stamp-box">М.П.</span></div>
									</div>
									<div className="a4-sign-col">
										<strong>ПАЦИЕНТ (ЗАКАЗЧИК):</strong><br /><br />
										Пациент:<br />
										<div className="a4-sign-line" />
										<div className="a4-sign-hint">/ {pt.fullName} / (согласие дано добровольно)</div>
									</div>
								</div>
							</div>

							<div className="a4-running-footer">
								<span>ИДС (Приказ МЗ РФ № 1051н) — Пациент: {pt.fullName}</span>
								<span>Стр. 2 из 2</span>
							</div>
						</section>
					</div>
    );
};
