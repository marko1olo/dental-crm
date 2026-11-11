/**
 * gostSignatures.ts — GOST R 34.10-2012 / 63-FZ Visual Stamps for Detached Signatures
 * Minzdrav Order 947n compliant (detached PKCS#7 / CAdES-BES signatures).
 */

import { escapeXml, formatRuDate } from "@dental/shared/cda";

export function generateGostSignatureStampHtml(params: {
	signerName: string;
	certificateNumber: string;
	validFrom: string;
	validTo: string;
	orgName?: string | undefined;
	signedAt?: string | undefined;
}): string {
	const validFromStr = formatRuDate(params.validFrom);
	const validToStr = formatRuDate(params.validTo);

	return `
<div class="gost-signature-stamp gost-stamp-blue" style="border: 2px solid var(--egisz-stamp-border, #0056b3); border-radius: 6px; padding: 8px 12px; color: var(--egisz-stamp-color, #0056b3); font-family: 'Times New Roman', serif; font-size: 11px; line-height: 1.25; max-width: 320px; box-sizing: border-box; background: var(--egisz-stamp-bg, rgba(0, 86, 179, 0.02));">
	<div style="font-weight: bold; text-align: center; text-transform: uppercase; font-size: 10px; letter-spacing: 0.5px; border-bottom: 1px solid var(--egisz-stamp-border, #0056b3); padding-bottom: 4px; margin-bottom: 4px;">
		ДОКУМЕНТ ПОДПИСАН ЭЛЕКТРОННОЙ ПОДПИСЬЮ
	</div>
	<div style="display: flex; gap: 6px; margin-bottom: 2px;">
		<span style="font-weight: bold; min-width: 75px;">Сертификат:</span>
		<span style="font-family: monospace; word-break: break-all;">${escapeXml(params.certificateNumber)}</span>
	</div>
	<div style="display: flex; gap: 6px; margin-bottom: 2px;">
		<span style="font-weight: bold; min-width: 75px;">Владелец:</span>
		<span>${escapeXml(params.signerName)}</span>
	</div>
	<div style="display: flex; gap: 6px; margin-bottom: 2px;">
		<span style="font-weight: bold; min-width: 75px;">Стандарт:</span>
		<span>ГОСТ Р 34.10-2012</span>
	</div>
	${params.orgName ? `
	<div style="display: flex; gap: 6px; margin-bottom: 2px;">
		<span style="font-weight: bold; min-width: 75px;">Организация:</span>
		<span>${escapeXml(params.orgName)}</span>
	</div>` : ""}
	<div style="display: flex; gap: 6px;">
		<span style="font-weight: bold; min-width: 75px;">Действителен:</span>
		<span>с ${validFromStr} по ${validToStr}</span>
	</div>
</div>`.trim();
}

export function generateGostSignatureStampSvg(params: {
	signerName: string;
	certificateNumber: string;
	validFrom: string;
	validTo: string;
	orgName?: string | undefined;
}): string {
	const validFromStr = formatRuDate(params.validFrom);
	const validToStr = formatRuDate(params.validTo);

	return `<svg xmlns="http://www.w3.org/2000/svg" width="320" height="110" viewBox="0 0 320 110">
	<rect x="2" y="2" width="316" height="106" rx="6" ry="6" fill="#f8fafc" stroke="#0056b3" stroke-width="2"/>
	<line x1="10" y1="28" x2="310" y2="28" stroke="#0056b3" stroke-width="1"/>
	<text x="160" y="19" font-family="'Times New Roman', serif" font-size="10" font-weight="bold" fill="#0056b3" text-anchor="middle" letter-spacing="0.5">
		ДОКУМЕНТ ПОДПИСАН ЭЛЕКТРОННОЙ ПОДПИСЬЮ
	</text>
	<text x="12" y="44" font-family="'Times New Roman', serif" font-size="10" font-weight="bold" fill="#0056b3">Сертификат:</text>
	<text x="88" y="44" font-family="monospace" font-size="9" fill="#0f172a">${escapeXml(params.certificateNumber)}</text>
	<text x="12" y="62" font-family="'Times New Roman', serif" font-size="10" font-weight="bold" fill="#0056b3">Владелец:</text>
	<text x="88" y="62" font-family="'Times New Roman', serif" font-size="10" fill="#0f172a">${escapeXml(params.signerName)}</text>
	${params.orgName ? `
	<text x="12" y="78" font-family="'Times New Roman', serif" font-size="9" font-weight="bold" fill="#0056b3">Организация:</text>
	<text x="88" y="78" font-family="'Times New Roman', serif" font-size="9" fill="#0f172a">${escapeXml(params.orgName.slice(0, 32))}</text>` : ""}
	<text x="12" y="96" font-family="'Times New Roman', serif" font-size="10" font-weight="bold" fill="#0056b3">Действителен:</text>
	<text x="88" y="96" font-family="'Times New Roman', serif" font-size="10" fill="#0f172a">с ${validFromStr} по ${validToStr}</text>
</svg>`;
}
