import type React from "react";

export function FastPrintSignGrid({
	clinicName = "Клиника",
	doctorFullName = "Лечащий врач",
	doctorSpecialty,
	patientFullName = "Пациент",
}: {
	clinicName?: string | null | undefined;
	doctorFullName?: string | null | undefined;
	doctorSpecialty?: string | null | undefined;
	patientFullName?: string | null | undefined;
}): React.JSX.Element {
	return (
		<div className="fast-print-sign-grid">
			<div>
				<div className="fast-print-sub">
					Исполнитель: {clinicName || "Клиника"}
				</div>
				<div className="font-bold">
					{doctorFullName || "Лечащий врач"} (
					{doctorSpecialty || "Врач-стоматолог"})
				</div>
				<div className="fast-print-sign-line" />
				<div className="fast-print-sub text-center">(подпись / М.П.)</div>
			</div>
			<div>
				<div className="fast-print-sub">Заказчик (Пациент):</div>
				<div className="font-bold">{patientFullName || "Пациент"}</div>
				<div className="fast-print-sign-line" />
				<div className="fast-print-sub text-center">(подпись)</div>
			</div>
		</div>
	);
}
