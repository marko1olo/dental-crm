import type React from "react";
import { formatPassportString } from "@dental/shared";
import type { A4DocumentInformedConsentData } from "@dental/shared";
import { ConsentSheetHeader } from "./ConsentSheetHeader";

export interface ConsentSheetPage1Props {
	effectiveConsentData: A4DocumentInformedConsentData | undefined;
	// biome-ignore lint/suspicious/noExplicitAny: clinicRequisites
	cl: any;
}

export function ConsentSheetPage1({
	effectiveConsentData,
	cl,
}: ConsentSheetPage1Props): React.JSX.Element {
	// biome-ignore lint/suspicious/noExplicitAny: patient
	const pt = effectiveConsentData?.patient ?? ({} as any);
	const doctor = effectiveConsentData?.doctorFullName ?? "Лечащий врач";
	const contractDate =
		effectiveConsentData?.consentDate ??
		effectiveConsentData?.contractDate ??
		new Date().toLocaleDateString("ru-RU");

	return (
		<section className="pro-a4-page-sheet" data-testid="pro-a4-physical-sheet">
			<div className="a4-sheet-body">
				<ConsentSheetHeader cl={cl} contractDate={contractDate} />

				<p className="a4-p">
					Я, гражданин(ка) <strong>{pt.fullName}</strong>, дата рождения:{" "}
					{pt.birthDate || "«___» _________ _____ г."}, документ, удостоверяющий
					личность: {formatPassportString(pt)}, проживающий(ая) по адресу:{" "}
					{pt.registrationAddress ||
						pt.address ||
						"____________________________________"}
					, настоящим даю информированное добровольное согласие на проведение
					медицинского вмешательства лечащим врачом <strong>{doctor}</strong>.
				</p>

				<h2 className="a4-section-heading">
					1. Характер и цели медицинского вмешательства
				</h2>
				<p className="a4-p">
					1.1. Мне в доступной форме разъяснены цели вмешательства: диагностика
					состояния зубочелюстной системы, купирование воспалительного процесса,
					восстановление анатомической формы, жевательной функции и эстетики
					зубов.
				</p>
				<p className="a4-p">
					1.2. Планируемые манипуляции включают: визуальный и инструментальный
					осмотр, фотопротокол, прицельную визиографию и КЛКТ, инфильтрационную
					и проводниковую местную анестезию, препарирование кариозных полостей с
					водно-воздушным охлаждением, изоляцию системой коффердам,
					эндодонтическую обработку корневых каналов, установку адгезивных
					композитных пломб и ортопедических конструкций.
				</p>

				<h2 className="a4-section-heading">
					2. Применяемая местная анестезия и возможные реакции
				</h2>
				<p className="a4-p">
					2.1. Для обезболивания применяются современные карпульные анестетики
					артикаинового ряда (Ультракаин, Убистезин) с вазоконстриктором
					(эпинефрин 1:100000 или 1:200000) либо без него при соматических
					противопоказаниях.
				</p>
				<p className="a4-p">
					2.2. Мне разъяснено, что применение местной анестезии может
					сопровождаться чувством распирания в месте инъекции, кратковременным
					учащением пульса, временным онемением губ, щек и языка длительностью
					от 1 до 4 часов, а также редкими рисками образования микрогематомы или
					индивидуальной аллергической реакции.
				</p>

				<h2 className="a4-section-heading">
					3. Возможные осложнения и нежелательные последствия
				</h2>
				<p className="a4-p">
					3.1. Мне разъяснено, что медицинское вмешательство сопряжено с
					естественными биологическими реакциями тканей: возможна
					постпломбировочная чувствительность зуба при накусывании в течение 3–7
					дней, незначительная болезненность десны в месте фиксации клампа
					коффердама, изменение вкусовых ощущений.
				</p>
				<p className="a4-p">
					3.2. При глубоком кариесе существует вероятность случайного вскрытия
					воспаленной пульпы, требующего расширения вмешательства до
					эндодонтического лечения корневых каналов.
				</p>
			</div>

			<div className="a4-running-footer">
				<span>ИДС на медицинское вмешательство — Пациент: {pt.fullName}</span>
				<span>Лист 1 из 2</span>
			</div>
		</section>
	);
}
