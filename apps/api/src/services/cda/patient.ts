/**
 * CDA R2 recordTarget / patientRole (flat addr/telecom NI — no org recursion).
 */

import type { CdaContext } from "./util.js";
import {
	DEFAULT_MO_ROOT,
	escapeXml,
	patientAddrXml,
	patientTelecomXml,
} from "./util.js";

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
			<!--
				DEFECT #98: patientRole addr + telecom (HL7 CDA R2 / EGISZ SEMD).
				Real patient contact is wired from the chart (patients.phone/email +
				administrativeProfile residential/registration address). We emit the
				real <addr>/<telecom> when present and nullFlavor="NI" only when the
				chart has no contact data (we never invent an address/phone).
			-->
			${patientAddrXml(ctx)}
			${patientTelecomXml(ctx)}
			<patient>



				<name>
					<family>${escapeXml(params.patientName.last)}</family>
					<given>${escapeXml(params.patientName.first)}</given>${middle}
				</name>
				${genderXml}

				${birthXml}
				<!--
					DEFECT #97: patient/languageCommunication (preferred language).
					\u0411\u042b\u041b\u041e: patient had name + gender + birthTime only. HL7 CDA R2
					and EGISZ SEMD expect languageCommunication so the record
					declares the language of care/communication (ru-RU for RF
					ambulatory dentistry). Without it validators flag incomplete
					patient demographics and REMD cannot route interpreter needs.
					\u0421\u0422\u0410\u041b\u041e: languageCode ru-RU + preferenceInd true (primary).
				-->
				<languageCommunication>
					<languageCode code="ru-RU"/>
					<preferenceInd value="true"/>
				</languageCommunication>

			</patient>


		</patientRole>
	</recordTarget>`;
}
