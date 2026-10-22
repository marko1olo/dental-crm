import { escapeHtml } from "./contractEscapeHtml";

export interface ContractCustomerMeta {
	clinicName: string;
	clinicOgrn: string;
	clinicInn: string;
	medicalLicenseNumber: string;
	customerName: string;
	customerBirthDate: string;
	customerPassport: string;
	customerSnils: string;
	customerInn: string;
	customerAddress: string;
	customerPhone: string;
	customerEmail: string;
	representativeBlock: string;
}

export function renderContractPartiesHtml(meta: ContractCustomerMeta): string {
	return `
	<p class="preamble">
		<strong>Исполнитель:</strong> ${escapeHtml(meta.clinicName)} (ОГРН ${escapeHtml(meta.clinicOgrn)}, ИНН ${escapeHtml(meta.clinicInn)}), в лице уполномоченного представителя регистратуры / администрации, действующего на основании Устава и лицензии на медицинскую деятельность № ${escapeHtml(meta.medicalLicenseNumber)}, с одной стороны, и
	</p>
	<p class="preamble">
		<strong>Пациент (Потребитель / Заказчик):</strong> <span class="blank-line">${escapeHtml(meta.customerName)}</span>,
		дата рождения: <span class="blank-line">${escapeHtml(meta.customerBirthDate)}</span>,
		паспорт: <span class="blank-line">${escapeHtml(meta.customerPassport)}</span>,
		СНИЛС: <span class="blank-line">${escapeHtml(meta.customerSnils)}</span>,
		ИНН: <span class="blank-line">${escapeHtml(meta.customerInn)}</span>,
		адрес регистрации: <span class="blank-line">${escapeHtml(meta.customerAddress)}</span>,
		телефон: <span class="blank-line">${escapeHtml(meta.customerPhone)}</span>,
		e-mail: <span class="blank-line">${escapeHtml(meta.customerEmail)}</span>, с другой стороны,
		совместно именуемые «Стороны», заключили настоящий Договор о нижеследующем:
	</p>
	${meta.representativeBlock}`;
}
