import {
	type GeneratedDocument,
	type Patient,
	type ClinicProfile,
	extractGostCmsMetadata,
	injectVisualSignatureStampIntoHtml,
	renderDigitalSignatureStampHtml,
} from "@dental/shared";
import {
	DocumentRenderContext,
	escapeHtml,
	present,
	clinicSignatory,
	digitsOnly,
	patientSnils,
	patientTaxpayerInn,
	patientIdentityDocument,
	row,
	compactParts,
} from "./baseRenderUtils.js";

export function bulletList(items: string[]) {
	return `<ul>${items.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>`;
}

export function checkList(items: string[]) {
	return `<ul class="check-list">${items.map((item) => `<li><span>□</span>${escapeHtml(item)}</li>`).join("")}</ul>`;
}

export function signatureBlock(left = "Пациент", right = "Представитель клиники") {
	return `<div class="signatures">
    <section class="signature-column signature-left">
      <p class="signature-role"><strong>${escapeHtml(left)}</strong></p>
      <p class="signature-line">Подпись: ____________________ / ____________________ /</p>
      <p class="signature-subtext">(личная подпись)&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;(расшифровка подписи)</p>
      <p class="signature-date">Дата: «____» ______________ 20___ г.</p>
    </section>
    <section class="signature-column signature-right">
      <p class="signature-role"><strong>${escapeHtml(right)}</strong></p>
      <p class="signature-line">Подпись: ____________________ / ____________________ /</p>
      <p class="signature-subtext">(личная подпись)&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;(расшифровка подписи)</p>
      <p class="signature-date">Дата: «____» ______________ 20___ г.</p>
      <p class="signature-stamps">
        <span class="stamp-seal-circle">М.П.</span>
      </p>
    </section>
  </div>`;
}

export function resolveDocumentDigitalSignatureStamp(
	document: GeneratedDocument,
	clinicProfile?: ClinicProfile,
): string | null {
	const attestation = document.signatureAttestation;
	const isSigned =
		attestation?.mode === "qualified_electronic_signature" ||
		attestation?.mode === "enhanced_non_qualified_electronic_signature" ||
		Boolean(document.cryptoSignaturePkcs7 && document.cryptoSignaturePkcs7.length > 0) ||
		Boolean(document.doctorSignaturePkcs7 && document.doctorSignaturePkcs7.length > 0);

	if (!isSigned) return null;

	let certSerial = document.doctorCertSerial;
	if (!certSerial) {
		const rawPkcs7 =
			document.doctorSignaturePkcs7 || document.cryptoSignaturePkcs7;
		if (rawPkcs7) {
			try {
				const der = Buffer.from(rawPkcs7, "base64");
				const meta = extractGostCmsMetadata(der);
				if (meta.certificateSerialNumber) {
					certSerial = meta.certificateSerialNumber;
				}
			} catch {
				// DER parsing fallback
			}
		}
	}

	if (!certSerial) return null;

	const certSubject =
		document.doctorCertSubject ||
		attestation?.staffFullName ||
		((clinicProfile as Record<string, unknown> | null | undefined)?.chiefDoctor as string | undefined) ||
		"Врач-стоматолог клиники";

	const validFrom =
		document.issuedAt || ((document as Record<string, unknown>)?.createdAt as string | undefined) || new Date().toISOString();
	const validToDate = new Date(validFrom);
	validToDate.setFullYear(validToDate.getFullYear() + 1);

	const signedAt =
		document.doctorSignedAt ||
		attestation?.signedAt ||
		document.issuedAt ||
		new Date().toISOString();

	const signatureType =
		attestation?.mode === "enhanced_non_qualified_electronic_signature"
			? "unep"
			: "ukep";

	return renderDigitalSignatureStampHtml({
		certificateSerialNumber: certSerial,
		certificateSubject: certSubject,
		certificateIssuer: "Головной УЦ Минцифры России (ГОСТ Р 34.10-2012)",
		validFrom,
		validTo: validToDate.toISOString(),
		signedAt,
		signatureType,
		documentId: document.id,
	});
}

export function signatureParty(role: string, fullName?: string | null) {
	const trimmed = fullName?.trim();
	return trimmed ? `${role} (${trimmed})` : role;
}

export function issueSignatureModeLabel(
	mode: NonNullable<GeneratedDocument["signatureAttestation"]>["mode"],
) {
	if (mode === "qualified_electronic_signature")
		return "усиленная квалифицированная электронная подпись (УКЭП)";
	if (mode === "enhanced_non_qualified_electronic_signature")
		return "усиленная неквалифицированная электронная подпись (УНЭП)";
	if (mode === "simple_electronic_signature")
		return "простая электронная подпись (ПЭП)";
	return "бумажный экземпляр подписан";
}

export function issueSignatureAttestationBlock(document: GeneratedDocument) {
	const attestation = document.signatureAttestation;
	if (!attestation || document.status === "draft") return "";
	return `<section class="issue-attestation">
    <h2>Отметка о подписании и выдаче</h2>
    <table>
      ${row("Способ", issueSignatureModeLabel(attestation.mode))}
      ${row("Дата и время подписи/выдачи", attestation.signedAt)}
      ${row("Получатель", `${attestation.recipientFullName}, ${attestation.recipientRole}`)}
      ${row("Сотрудник клиники", `${attestation.staffFullName}, ${attestation.staffRole}`)}
      ${row("Проверка", "личность получателя проверена; HTML открыт и сверен; получатель и представитель клиники подписали экземпляр")}
      ${attestation.note ? row("Заметка выдачи", attestation.note) : ""}
    </table>
  </section>`;
}

export function releaseMaterialKindLabel(
	kind: NonNullable<GeneratedDocument["releaseJournalEntry"]>["materialKind"],
) {
	if (kind === "original") return "оригинал";
	if (kind === "copy") return "копия";
	if (kind === "extract") return "выписка";
	if (kind === "dicom_archive") return "архив исходных снимков";
	if (kind === "mixed") return "смешанный комплект";
	return "иное";
}

export function releaseDeliveryMethodLabel(
	method: NonNullable<
		GeneratedDocument["releaseJournalEntry"]
	>["deliveryMethod"],
) {
	if (method === "paper") return "бумага";
	if (method === "pdf") return "PDF";
	if (method === "dicom_archive") return "архив исходных снимков";
	if (method === "secure_link") return "защищенная ссылка";
	if (method === "physical_media") return "физический носитель";
	return "иной канал";
}

export function releaseJournalEntryKindLabel(
	kind: NonNullable<GeneratedDocument["releaseJournalEntry"]>["entryKind"],
) {
	if (kind === "request_registered") return "зарегистрирован запрос";
	if (kind === "extract_issued") return "выдана выписка";
	return "закрыта выдача";
}

export function releaseJournalBlock(document: GeneratedDocument) {
	const journal = document.releaseJournalEntry;
	if (!journal || document.status === "draft") return "";
	const period = compactParts([
		journal.periodStart ? `с ${journal.periodStart}` : null,
		journal.periodEnd ? `по ${journal.periodEnd}` : null,
	]);
	return `<section class="release-journal">
    <h2>Журнал выдачи медицинской документации</h2>
    <table>
      ${row("Запись", releaseJournalEntryKindLabel(journal.entryKind))}
      ${row("Состав", journal.documentTypes.join("; "))}
      ${row("Вид материала", releaseMaterialKindLabel(journal.materialKind))}
      ${row("Канал", releaseDeliveryMethodLabel(journal.deliveryMethod))}
      ${period ? row("Период", period) : ""}
      ${journal.sourceRequestDocumentId ? row("Связанный запрос", journal.sourceRequestDocumentId) : ""}
      ${row("Получатель", journal.recipientFullName)}
      ${journal.recipientIdentityDocument ? row("Документ получателя", journal.recipientIdentityDocument) : ""}
      ${row("Основание", journal.recipientAuthority)}
      ${row("Дата операции", journal.deliveredAt)}
      ${row("Хранение", journal.retentionPolicy)}
      ${journal.sourceSnapshotSha256 ? row("sha256 архива", journal.sourceSnapshotSha256) : ""}
    </table>
  </section>`;
}
