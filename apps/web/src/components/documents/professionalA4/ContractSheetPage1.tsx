import type React from "react";
import { formatAmountInWordsRu, formatRubles } from "@dental/shared";
import type { A4DocumentContractData } from "@dental/shared";

export function ContractSheetPage1({
	contractData,
	// biome-ignore lint/suspicious/noExplicitAny: clinic
	cl,
}: {
	contractData: A4DocumentContractData;
	// biome-ignore lint/suspicious/noExplicitAny: clinic
	cl: any;
}): React.JSX.Element {
	return (
		<section className="pro-a4-page-sheet" data-testid="pro-a4-physical-sheet">
			<div className="a4-sheet-body">
				<header className="a4-header">
					<div className="a4-clinic-name">{cl.legalName || cl.name}</div>
					<div className="a4-clinic-requisites">
						Адрес: {cl.actualAddress || cl.address} · Тел: {cl.phone} · ИНН:{" "}
						{cl.inn} · ОГРН: {cl.ogrn} · Лицензия: № {cl.licenseNumber}
						{cl.licenseDate ? ` от ${cl.licenseDate} г.` : ""}
					</div>
				</header>

				<h1 className="a4-doc-title">{`ДОГОВОР № ${contractData.contractNumber}`}</h1>
				<div className="a4-doc-subtitle">
					на оказание платных медицинских стоматологических услуг
					<br />
					(в соответствии с Постановлением Правительства РФ от 11.05.2023 № 736)
				</div>

				<div className="a4-meta-row">
					<div>{cl.city || "г. Москва"}</div>
					<div>«{contractData.contractDate}» г.</div>
				</div>

				<p className="a4-p">
					<strong>{cl.legalName || cl.name}</strong>
					{cl.shortName ? ` (${cl.shortName})` : ""}, именуемое в дальнейшем{" "}
					<strong>«Исполнитель»</strong>, в лице{" "}
					{cl.directorTitle || "Руководителя"}{" "}
					{cl.directorFullName || "уполномоченного лица"}, действующего на
					основании Устава и лицензии № {cl.licenseNumber}, с одной стороны, и
					гражданин(ка) <strong>{contractData.patient.fullName}</strong>,
					именуемый(ая) в дальнейшем <strong>«Пациент» (Заказчик)</strong>, с
					другой стороны, заключили настоящий Договор о нижеследующем:
				</p>

				<h2 className="a4-section-heading">
					1. Предмет договора и уведомление о государственных гарантиях
				</h2>
				<p className="a4-p">
					1.1. Исполнитель обязуется оказать Пациенту платные стоматологические
					медицинские услуги надлежащего качества в соответствии с клиническими
					рекомендациями и стандартами помощи, а Заказчик обязуется принять и
					оплатить их согласно условиям настоящего Договора.
				</p>
				<p className="a4-p">
					1.2. <strong>Уведомление о программе госгарантий:</strong> Заказчик
					уведомлен о возможности получения бесплатной медицинской помощи по
					полису ОМС в государственных учреждениях и подтверждает добровольное
					согласие на получение платных услуг.
				</p>
				<p className="a4-p">
					1.3. Основание обращения:{" "}
					<u>
						{contractData.clinicalReason ||
							"Первичная консультация, диагностика и санация полости рта"}
					</u>
					. Номер медицинской карты:{" "}
					<strong>{contractData.patient.cardNumber || "б/н"}</strong>.
				</p>

				<h2 className="a4-section-heading">
					2. Условия и сроки предоставления медицинских услуг
				</h2>
				<p className="a4-p">
					2.1. Услуги предоставляются при наличии оформленного информированного
					добровольного согласия (ИДС). Сроки оказания услуг определяются
					клинической ситуацией, согласованным Планом лечения и графиком
					приёмов.
				</p>

				<h2 className="a4-section-heading">
					3. Стоимость услуг и порядок расчетов
				</h2>
				<p className="a4-p">
					3.1. Предварительная ориентировочная стоимость услуг составляет:{" "}
					<strong>
						{formatRubles(contractData.estimatedTotalRub)} руб. (
						{formatAmountInWordsRu(contractData.estimatedTotalRub)})
					</strong>{" "}
					в соответствии со сметой (раздел 4 настоящего Договора).
				</p>
				<p className="a4-p">
					3.2. Оплата производится в рублях наличными, картой или через СБП с
					выдачей фискального чека. Оказание дополнительных платных услуг
					допускается исключительно после согласования с Пациентом.
				</p>
			</div>

			<div className="a4-running-footer">
				<span>
					Договор № {contractData.contractNumber} от {contractData.contractDate}{" "}
					г.
				</span>
				<span>Лист 1 из 3</span>
			</div>
		</section>
	);
}
