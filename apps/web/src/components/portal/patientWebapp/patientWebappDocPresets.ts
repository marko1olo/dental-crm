import type { SignableStatutoryDocument } from "./patientWebappSigningTypes";

export function getPresetSignableDocuments(patientName: string, phone: string): readonly SignableStatutoryDocument[] {
	const today = new Date().toISOString().slice(0, 10);

	return [
		{
			id: "doc-ids-1051n-001",
			documentType: "ids_1051n",
			documentNumber: "ИДС-2026/08-142",
			titleRu: "Информированное согласие на стоматологическое лечение (ИДС)",
			dateIso: today,
			doctorFullName: "Смирнова Анна Сергеевна",
			summaryTextRu: "Согласие на проведение местного обезболивания, инструментальной обработки корневых каналов и постановку пломбы.",
			fullTextHtml: `<div class="doc-body">
				<h3>ИНФОРМИРОВАННОЕ ДОБРОВОЛЬНОЕ СОГЛАСИЕ</h3>
				<p>В соответствии со статьей 20 Федерального закона № 323-ФЗ и Приказом Минздрава России № 1051н, пациент <strong>${patientName}</strong> подтверждает согласие на медицинское вмешательство...</p>
			</div>`,
			status: "pending_signature",
		},
		{
			id: "doc-contract-736-001",
			documentType: "contract_736",
			documentNumber: "ДОГ-2026/08-736",
			titleRu: "Договор на оказание медицинских услуг",
			dateIso: today,
			doctorFullName: "Смирнова Анна Сергеевна",
			summaryTextRu: "Договор на комплексное стоматологическое обслуживание согласно утвержденному плану лечения и смете.",
			fullTextHtml: `<div class="doc-body">
				<h3>ДОГОВОР НА ОКАЗАНИЕ ПЛАТНЫХ МЕДИЦИНСКИХ УСЛУГ</h3>
				<p>ООО "Стоматологическая клиника ДЕНТЕ" (Лицензия № ЛО41-01137-77/00368421) в соответствии с Постановлением Правительства РФ № 736 и Заказчик <strong>${patientName}</strong> заключили настоящий Договор...</p>
			</div>`,
			status: "pending_signature",
		},
	];
}
