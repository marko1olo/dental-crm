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
		? `<administrativeGenderCode code="${genderCode}" codeSystem="1.2.643.5.1.13.13.11.1040" codeSystemName="\u041f\u043e\u043b \u043f\u0430\u0446\u0438\u0435\u043d\u0442\u0430" displayName="${genderCode === "1" ? "\u041c\u0443\u0436\u0441\u043a\u043e\u0439" : "\u0416\u0435\u043d\u0441\u043a\u0438\u0439"}"/>`
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
					<modeCode code="SPK" codeSystem="2.16.840.1.113883.5.60" codeSystemName="LanguageAbilityMode" displayName="\u0423\u0441\u0442\u043d\u0430\u044f \u0440\u0435\u0447\u044c"/>
					<proficiencyLevelCode code="E" codeSystem="2.16.840.1.113883.5.61" codeSystemName="LanguageAbilityProficiency" displayName="\u0421\u0432\u043e\u0431\u043e\u0434\u043d\u043e"/>
					<preferenceInd value="true"/>
				</languageCommunication>
			</patient>
		</patientRole>
	</recordTarget>`;
}
