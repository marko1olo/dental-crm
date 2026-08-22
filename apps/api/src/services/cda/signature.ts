import { z } from "zod";

/**
 * Схема отсоединенной электронной цифровой подписи (УКЭП) по ГОСТ Р 34.10-2012 / CMS PKCS#7 / CAdES-BES.
 * В ЕГИСЗ РЭМД каждый СЭМД подписывается двумя подписями:
 * 1. УКЭП медицинского работника (врача-автора).
 * 2. УКЭП медицинской организации (клиники).
 */
export const detachedSignatureSchema = z.object({
	/** Подпись в формате Base64 (PKCS#7 / CMS / CAdES-BES) */
	signatureBase64: z.string().min(1, "Подпись Base64 обязательна"),
	/** Серийный номер сертификата открытого ключа */
	certificateSerialNumber: z.string().min(1, "Серийный номер сертификата обязателен"),
	/** ФИО владельца сертификата или наименование организации */
	certificateSubject: z.string().min(1, "Владелец сертификата обязателен"),
	/** Метка времени подписания (ISO 8601) */
	signedAt: z.string().datetime({ message: "Время подписания должно быть в формате ISO 8601" }),
	/** OID алгоритма подписи (ГОСТ Р 34.10-2012 256-бит: 1.2.643.7.1.1.1.1 или 512-бит: 1.2.643.7.1.1.1.2) */
	algorithmOid: z.string().default("1.2.643.7.1.1.1.1"),
});

export type DetachedSignature = z.infer<typeof detachedSignatureSchema>;

/**
 * Пакет выгрузки СЭМД в РЭМД ЕГИСЗ (SEMD 108 / NSI 108).
 */
export const egiszRemdPackageSchema = z.object({
	documentId: z.string().uuid(),
	documentVersion: z.number().int().positive(),
	xmlCanonicalPayload: z.string().min(1),
	doctorSignature: detachedSignatureSchema,
	moSignature: detachedSignatureSchema.optional(),
	metadata: z.object({
		patientSnils: z.string().min(11),
		clinicOid: z.string().min(1),
		clinicOgrn: z.string().optional(),
		docTypeNsiCode: z.string().default("108"), // 108 = Стоматологический протокол консультации
	}),
});

export type EgiszRemdPackage = z.infer<typeof egiszRemdPackageSchema>;

/**
 * Приведение XML-документа CDA к детерминированному каноническому виду UTF-8 (C14N subset)
 * перед вычислением криптографического хэша ГОСТ Р 34.11-2012 и наложением УКЭП.
 * Исключает искажение подписи из-за BOM, переносов строк (CRLF -> LF) и концевых пробелов.
 */
export function canonicalizeCdaXml(xml: string): string {
	if (!xml || typeof xml !== "string") return "";
	return xml
		.replace(/^\uFEFF/, "") // Strip BOM
		.replace(/\r\n/g, "\n")
		.replace(/\r/g, "\n")
		.trim();
}

/**
 * Валидирует и формирует канонический пакет СЭМД РЭМД ЕГИСЗ с двойной отсоединенной подписью CAdES-BES.
 */
export function buildEgiszRemdSubmissionPackage(params: {
	documentId: string;
	documentVersion: number;
	rawXml: string;
	doctorSignature: DetachedSignature;
	moSignature?: DetachedSignature | undefined;
	patientSnils: string;
	clinicOid: string;
	clinicOgrn?: string | undefined;
	docTypeNsiCode?: string | undefined;
}): EgiszRemdPackage {
	const canonicalXml = canonicalizeCdaXml(params.rawXml);

	const pkg = {
		documentId: params.documentId,
		documentVersion: params.documentVersion,
		xmlCanonicalPayload: canonicalXml,
		doctorSignature: params.doctorSignature,
		moSignature: params.moSignature,
		metadata: {
			patientSnils: params.patientSnils,
			clinicOid: params.clinicOid,
			clinicOgrn: params.clinicOgrn,
			docTypeNsiCode: params.docTypeNsiCode ?? "108",
		},
	};

	return egiszRemdPackageSchema.parse(pkg);
}
