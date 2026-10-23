import React from "react";
import type { FastPrintClinicInfo } from "../FastClinicalPrintEngine";

export interface PartisanInsertHeaderProps {
	clinic: FastPrintClinicInfo;
}

export const PartisanInsertHeader: React.FC<PartisanInsertHeaderProps> = ({ clinic }) => {
	return (
		<>
			<div className="partisan-header-row">
				<div className="partisan-clinic-requisites">
					<div className="partisan-clinic-name">{clinic.name}</div>
					<div className="partisan-clinic-sub">
						{clinic.legalName} · ИНН {clinic.inn} · ОГРН {clinic.ogrn}
					</div>
					<div className="partisan-clinic-sub">
						Лицензия: {clinic.licenseNumber} · {clinic.address} · {clinic.phone}
					</div>
				</div>
				<div className="partisan-legal-badge">
					<div className="partisan-badge-minzdrav">Минздрав РФ</div>
					<div className="partisan-badge-form">Медицинская карта приёма</div>
					<div className="partisan-badge-order">Стандарты СтАР</div>
				</div>
			</div>
			<div className="partisan-document-title">
				ВКЛАДЫШ В МЕДИЦИНСКУЮ КАРТУ СТОМАТОЛОГИЧЕСКОГО БОЛЬНОГО
			</div>
		</>
	);
};
