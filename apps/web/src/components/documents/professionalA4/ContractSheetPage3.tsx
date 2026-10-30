import React from "react";
import { formatPassportString } from "@dental/shared";
import type { A4DocumentContractData } from "@dental/shared";

export function ContractSheetPage3({
	contractData,
	// biome-ignore lint/suspicious/noExplicitAny: clinic
	cl,
}: {
	contractData: A4DocumentContractData;
	// biome-ignore lint/suspicious/noExplicitAny: clinic
	cl: any;
}): React.JSX.Element {
	return (
		<section className="pro-a4-page-sheet">
			<div className="a4-sheet-body">
				<div className="a4-running-header">
					<span>
						{cl.legalName || cl.name} · Лицензия № {cl.licenseNumber}
					</span>
					<span>Договор № {contractData.contractNumber} · Лист 3 из 3</span>
				</div>

				<h2 className="a4-section-heading">
					7. Конфиденциальность и врачебная тайна
				</h2>
				<p className="a4-p">
					7.1. Исполнитель гарантирует сохранность врачебной тайны и
					конфиденциальность персональных данных Пациента.
				</p>

				<h2 className="a4-section-heading">8. Разрешение споров</h2>
				<p className="a4-p">
					8.1. Претензионный порядок урегулирования споров обязателен. Срок
					рассмотрения претензии — 10 календарных дней.
				</p>

				<h2 className="a4-section-heading">
					9. Адреса, реквизиты и подписи Сторон
				</h2>
				<div className="a4-sign-grid">
					<div className="a4-sign-col">
						<strong>ИСПОЛНИТЕЛЬ:</strong>
						<br />
						<strong>{cl.legalName || cl.name}</strong>
						<br />
						Адрес: {cl.actualAddress || cl.address}
						<br />
						ОГРН: {cl.ogrn}, ИНН: {cl.inn}
						{cl.kpp ? `, КПП: ${cl.kpp}` : ""}
						<br />
						Р/с: {cl.checkingAccount || "40702810938000123456"} в{" "}
						{cl.bankName || 'ПАО "Сбербанк"'}
						<br />
						БИК: {cl.bik || "044525225"}, Тел: {cl.phone}
						<br />
						<br />
						{cl.directorTitle || "Руководитель / Врач"}:
						<br />
						<div className="a4-sign-line" />
						<div className="a4-sign-hint">
							/{" "}
							{contractData.doctorFullName ||
								cl.directorFullName ||
								"________________________"}{" "}
							/ <span className="stamp-box">М.П.</span>
						</div>
					</div>
					<div className="a4-sign-col">
						<strong>ЗАКАЗЧИК (ПАЦИЕНТ):</strong>
						<br />
						<strong>{contractData.patient.fullName}</strong>
						<br />
						Дата рождения:{" "}
						{contractData.patient.birthDate || "«___» _________ _____ г."}
						<br />
						Паспорт: {formatPassportString(contractData.patient)}
						<br />
						Адрес:{" "}
						{contractData.patient.registrationAddress ||
							contractData.patient.address ||
							"____________________________________"}
						<br />
						Телефон: {contractData.patient.phone || "____________________"}
						<br />
						{contractData.patient.snils ? (
							<>
								СНИЛС: {contractData.patient.snils}
								<br />
							</>
						) : null}
						<br />
						Подпись Заказчика:
						<br />
						<div className="a4-sign-line" />
						<div className="a4-sign-hint">
							/ {contractData.patient.fullName} /
						</div>
					</div>
				</div>
			</div>

			<div className="a4-running-footer">
				<span>
					Договор № {contractData.contractNumber} от {contractData.contractDate}{" "}
					г.
				</span>
				<span>Лист 3 из 3</span>
			</div>
		</section>
	);
}
