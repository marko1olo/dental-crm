import React from "react";
import type { A4ClinicRequisites, A4PatientRequisites } from "./a4ClinicPatientDefaults";

export function PersonalDataSignGrid({
	cl,
	pt,
}: {
	cl: A4ClinicRequisites;
	pt: A4PatientRequisites | { fullName: string };
}): React.JSX.Element {
	return (
		<div className="a4-sign-grid" style={{ marginTop: "40px" }}>
			<div className="a4-sign-col">
				<strong>ОПЕРАТОР ПЕРСОНАЛЬНЫХ ДАННЫХ:</strong>
				<br />
				<br />
				{cl.legalName || cl.name}
				<br />
				<div className="a4-sign-line" />
				<div className="a4-sign-hint">
					Ответственное лицо за обработку ПДн / М.П.
				</div>
			</div>
			<div className="a4-sign-col">
				<strong>СУБЪЕКТ ПЕРСОНАЛЬНЫХ ДАННЫХ:</strong>
				<br />
				<br />
				Пациент:
				<br />
				<div className="a4-sign-line" />
				<div className="a4-sign-hint">
					/ {pt.fullName} / (подпись субъекта ПДн)
				</div>
			</div>
		</div>
	);
}
