import React, { type ChangeEvent } from "react";
import {
	formatOmsPolicy,
	formatRussianPassport,
	formatSnils,
	formatTaxpayerInn,
} from "../../utils/inputSanitation";
import type { PatientAdministrativeProfileDraft } from "./patientsViewModules";

type TextFieldChangeEvent = ChangeEvent<HTMLInputElement | HTMLTextAreaElement>;

interface PatientIdentityFieldsProps {
	draft: PatientAdministrativeProfileDraft;
	updateDraft: (field: keyof PatientAdministrativeProfileDraft, value: string | number[]) => void;
}

export const PatientIdentityFields: React.FC<PatientIdentityFieldsProps> = ({
	draft,
	updateDraft,
}) => (
	<>
		<label>
			Паспорт / Документ
			<input
				autoComplete="off"
				value={draft.identityDocument}
				onChange={(e: TextFieldChangeEvent) => updateDraft("identityDocument", formatRussianPassport(e.target.value))}
				placeholder="Паспорт РФ 0000 000000"
			/>
		</label>
		<label>
			ИНН пациента
			<input
				inputMode="numeric"
				autoComplete="off"
				pattern="[0-9]*"
				value={draft.taxpayerInn}
				onChange={(e: TextFieldChangeEvent) => updateDraft("taxpayerInn", formatTaxpayerInn(e.target.value))}
				placeholder="10 или 12 цифр (необязательно)"
				data-testid="input-patient-admin-inn"
			/>
		</label>
		<label>
			Полис ДМС / ОМС
			<input
				autoComplete="off"
				value={draft.insurancePolicyNumber}
				onChange={(e: TextFieldChangeEvent) => updateDraft("insurancePolicyNumber", formatOmsPolicy(e.target.value))}
				placeholder="Номер полиса"
			/>
		</label>
		<label>
			СНИЛС
			<input
				inputMode="numeric"
				autoComplete="off"
				pattern="[0-9 -]*"
				value={draft.snils}
				onChange={(e: TextFieldChangeEvent) => updateDraft("snils", formatSnils(e.target.value))}
				placeholder="000-000-000 00"
			/>
		</label>
		<label>
			Адрес регистрации
			<input
				autoComplete="street-address"
				value={draft.registrationAddress}
				onChange={(e: TextFieldChangeEvent) => updateDraft("registrationAddress", e.target.value)}
				placeholder="Индекс, город, улица, дом"
			/>
		</label>
		<label>
			Адрес проживания
			<input
				autoComplete="street-address"
				value={draft.residentialAddress}
				onChange={(e: TextFieldChangeEvent) => updateDraft("residentialAddress", e.target.value)}
				placeholder="Если отличается"
			/>
		</label>
	</>
);
