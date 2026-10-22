import { escapeHtml } from "./contractEscapeHtml";

export interface ContractSignaturesMeta {
	clinicName: string;
	clinicAddress: string;
	clinicInn: string;
	clinicKpp: string;
	clinicOgrn: string;
	clinicPhone: string;
	medicalLicenseNumber: string;
	medicalLicenseDate: string;
	customerName: string;
	customerBirthDate: string;
	customerPassport: string;
	customerSnils: string;
	customerInn: string;
	customerAddress: string;
	customerPhone: string;
}

export function renderContractSignaturesHtml(meta: ContractSignaturesMeta): string {
	return `
	<div class="section-title">6. АДРЕСА, РЕКВИЗИТЫ И ПОДПИСИ СТОРОН</div>
	<table class="parties-table">
		<tr>
			<td>
				<strong>ИСПОЛНИТЕЛЬ:</strong><br />
				${escapeHtml(meta.clinicName)}<br />
				Адрес: ${escapeHtml(meta.clinicAddress)}<br />
				ИНН: ${escapeHtml(meta.clinicInn)} / КПП: ${escapeHtml(meta.clinicKpp)} / ОГРН: ${escapeHtml(meta.clinicOgrn)}<br />
				Лицензия: № ${escapeHtml(meta.medicalLicenseNumber)} от ${escapeHtml(meta.medicalLicenseDate)} г.<br />
				Тел.: ${escapeHtml(meta.clinicPhone)}<br /><br />
				<div class="signature-area">
					М.П. ________________________ / Регистратор
				</div>
			</td>
			<td>
				<strong>ПАЦИЕНТ / ЗАКАЗЧИК:</strong><br />
				ФИО: ${escapeHtml(meta.customerName)}<br />
				Дата рожд.: ${escapeHtml(meta.customerBirthDate)}<br />
				Паспорт: ${escapeHtml(meta.customerPassport)}<br />
				СНИЛС: ${escapeHtml(meta.customerSnils)}<br />
				ИНН: ${escapeHtml(meta.customerInn)}<br />
				Адрес: ${escapeHtml(meta.customerAddress)}<br />
				Телефон: ${escapeHtml(meta.customerPhone)}<br /><br />
				<div class="signature-area">
					Подпись: ________________________ (расшифровка)
				</div>
			</td>
		</tr>
	</table>

	<div class="statutory-notice-box">
		С Программой государственных гарантий бесплатного оказания медицинской помощи, прейскурантом услуг клиники и условиями договора ознакомлен(а), на получение платных стоматологических услуг согласен(на):<br />
		Подпись Пациента (Заказчика): ________________________ / ${escapeHtml(meta.customerName)} / «_____» _________________ 202___ г.
	</div>`;
}
