import React from "react";
import { formatPassportString } from "@dental/shared";
import type { A4ClinicRequisites, A4PatientRequisites } from "./a4ClinicPatientDefaults";

export function PersonalDataSheetHeader({
	cl,
	pt,
	contractDate,
}: {
	cl: A4ClinicRequisites;
	pt: A4PatientRequisites | {
		fullName: string;
		birthDate?: string;
		address?: string;
		registrationAddress?: string;
		phone?: string;
		snils?: string;
		passportSeries?: string;
		passportNumber?: string;
		passportIssuedBy?: string;
		passportIssuedDate?: string;
		passportDepartmentCode?: string;
	};
	contractDate: string;
}): React.JSX.Element {
	return (
		<>
			<header className="a4-header">
				<div className="a4-clinic-name">{cl.legalName || cl.name}</div>
				<div className="a4-clinic-requisites">
					Оператор персональных данных · ИНН: {cl.inn} · ОГРН: {cl.ogrn}
					<br />
					Адрес: {cl.actualAddress || cl.address} · Тел: {cl.phone}
				</div>
			</header>

			<h1 className="a4-doc-title">
				СОГЛАСИЕ НА ОБРАБОТКУ ПЕРСОНАЛЬНЫХ ДАННЫХ И СПЕЦИАЛЬНЫХ КАТЕГОРИЙ
			</h1>
			<div className="a4-doc-subtitle">
				в соответствии с Федеральным законом от 27.07.2006 № 152-ФЗ «О
				персональных данных»
			</div>

			<div className="a4-meta-row">
				<div>{cl.city || "г. Москва"}</div>
				<div>«{contractDate}» г.</div>
			</div>

			<p className="a4-p">
				Я, гражданин(ка) <strong>{pt.fullName}</strong>, дата рождения:{" "}
				{pt.birthDate || "«___» _________ _____ г."}, паспорт:{" "}
				{formatPassportString(pt)}, адрес регистрации:{" "}
				{pt.registrationAddress ||
					pt.address ||
					"____________________________________"}
				, телефон: {pt.phone || "____________________"}, СНИЛС:{" "}
				{pt.snils || "____________________"}, свободно, своей волей и в своем
				интересе даю согласие <strong>{cl.legalName || cl.name}</strong>{" "}
				(Оператор) на обработку моих персональных данных на следующих условиях:
			</p>
		</>
	);
}
