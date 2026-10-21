import type React from "react";

export function PersonalDataSignGrid({
	// biome-ignore lint/suspicious/noExplicitAny: clinic
	cl,
	// biome-ignore lint/suspicious/noExplicitAny: patient
	pt,
}: {
	// biome-ignore lint/suspicious/noExplicitAny: clinic
	cl: any;
	// biome-ignore lint/suspicious/noExplicitAny: patient
	pt: any;
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
