/**
 * CDA R2 recordTarget / patientRole (flat addr/telecom NI — no org recursion).
 */

import type { CdaContext } from "./util.js";
import { DEFAULT_MO_ROOT, escapeXml } from "./util.js";

export function generateCdaPatient(ctx: CdaContext): string {
	const { params, birthTimeValue, genderCode, clinicOidEscaped } = ctx;

	const mrnRoot = clinicOidEscaped ?? DEFAULT_MO_ROOT;
	const mrnRaw = String(params.patientId ?? "").trim();
	const mrnId = mrnRaw
		? `<id root="${mrnRoot}" extension="${escapeXml(mrnRaw)}"/>`
		: `<id nullFlavor="NI"/>`;
	const snilsRaw = params.patientSnils
		? String(params.patientSnils).trim()
		: "";
	const snilsId = snilsRaw
		? `<id root="1.2.643.100.3" extension="${escapeXml(snilsRaw)}"/>`
		: "";
	const idsXml = mrnRaw
		? snilsId
			? `${mrnId}\n\t\t\t${snilsId}`
			: mrnId
		: snilsId || mrnId;

	const middle = params.patientName.middle
		? `\n\t\t\t\t\t<given>${escapeXml(params.patientName.middle)}</given>`
		: "";

	const genderXml = genderCode
		? `<administrativeGenderCode code="${genderCode}" codeSystem="1.2.643.5.1.13.13.11.1040"/>`
		: `<administrativeGenderCode nullFlavor="UNK"/>`;

	const birthXml = birthTimeValue
		? `<birthTime value="${birthTimeValue}"/>`
		: `<birthTime nullFlavor="UNK"/>`;

	return `
	<recordTarget>
		<patientRole>
			${idsXml}
			<addr nullFlavor="NI"/>
			<telecom nullFlavor="NI"/>
			<patient>
				<name>
					<family>${escapeXml(params.patientName.last)}</family>
					<given>${escapeXml(params.patientName.first)}</given>${middle}
				</name>
				${genderXml}
				${birthXml}
				<languageCommunication>
					<languageCode code="ru-RU"/>
					<preferenceInd value="true"/>
				</languageCommunication>
			</patient>
		</patientRole>
	</recordTarget>`;
}
