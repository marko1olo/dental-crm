import type React from "react";
import type { A4DocumentPersonalDataConsentData } from "@dental/shared";
import { PersonalDataSheetHeader } from "./PersonalDataSheetHeader";
import { PersonalDataSignGrid } from "./PersonalDataSignGrid";

export interface PersonalDataSheetProps {
	zoomClass: string;
	effectivePersonalDataConsent: A4DocumentPersonalDataConsentData | undefined;
	// biome-ignore lint/suspicious/noExplicitAny: clinic
	cl: any;
}

export const PersonalDataSheet: React.FC<PersonalDataSheetProps> = ({
	effectivePersonalDataConsent,
	cl,
}) => {
	// biome-ignore lint/suspicious/noExplicitAny: patient
	const pt = effectivePersonalDataConsent?.patient ?? ({} as any);
	const contractDate =
		effectivePersonalDataConsent?.consentDate ??
		new Date().toLocaleDateString("ru-RU");

	return (
		<div className="pro-a4-sheet-stack" data-testid="a4-personal-data-content">
			<section
				className="pro-a4-page-sheet"
				data-testid="pro-a4-physical-sheet"
			>
				<div className="a4-sheet-body">
					<PersonalDataSheetHeader
						cl={cl}
						pt={pt}
						contractDate={contractDate}
					/>

					<h2 className="a4-section-heading">
						1. Перечень обрабатываемых персональных данных
					</h2>
					<p className="a4-p">
						1.1. Общие категории персональных данных: фамилия, имя, отчество,
						пол, дата рождения, паспортные данные, адрес места жительства и
						регистрации, контактный телефон, адрес электронной почты, реквизиты
						полиса ОМС/ДМС, СНИЛС.
					</p>
					<p className="a4-p">
						1.2.{" "}
						<strong>
							Специальные категории персональных данных:
						</strong>{" "}
						сведения о состоянии здоровья, жалобах, анамнезе заболеваний,
						перенесенных операциях, аллергических реакциях, результатах
						осмотров, лабораторных и инструментальных исследований (визиография,
						ОПТГ, КЛКТ), установленных стоматологических диагнозах и
						проведенном лечении.
					</p>

					<h2 className="a4-section-heading">
						2. Цели обработки персональных данных
					</h2>
					<p className="a4-p">
						2.1. Установление медицинского диагноза, оказание специализированной
						медицинской помощи и медицинских услуг.
					</p>
					<p className="a4-p">
						2.2. Ведение медицинской документации, учётных форм (медицинской
						карты амбулаторного пациента), передача обязательных сведений в
						соответствии с Постановлением Правительства РФ от 09.02.2022 № 140 (ЕГИСЗ)
						в Единую государственную информационную систему в сфере
						здравоохранения (ЕГИСЗ Минздрава РФ).
					</p>
					<p className="a4-p">
						2.3. Информирование о времени и дате назначенных приёмов, готовности
						ортопедических конструкций посредством SMS, мессенджеров или
						телефонных звонков.
					</p>

					<h2 className="a4-section-heading">
						3. Перечень действий с персональными данными и условия передачи
					</h2>
					<p className="a4-p">
						3.1. Оператор осуществляет сбор, запись, систематизацию, накопление,
						хранение, уточнение, использование, обезличивание, блокирование и
						уничтожение персональных данных с использованием средств
						автоматизации и без их использования.
					</p>
					<p className="a4-p">
						3.2. Передача персональных данных третьим лицам без согласия
						субъекта не допускается, за исключением случаев, прямо
						предусмотренных законодательством РФ.
					</p>

					<h2 className="a4-section-heading">
						4. Срок действия согласия и порядок его отзыва
					</h2>
					<p className="a4-p">
						4.1. Настоящее согласие действует в течение установленного срока
						хранения первичной медицинской документации (25 лет для медицинских
						карт) либо до момента его письменного отзыва.
					</p>

					<PersonalDataSignGrid cl={cl} pt={pt} />
				</div>

				<div className="a4-running-footer">
					<span>
						Согласие на обработку персональных данных — Пациент:{" "}
						{pt.fullName}
					</span>
					<span>Лист 1 из 1</span>
				</div>
			</section>
		</div>
	);
};
