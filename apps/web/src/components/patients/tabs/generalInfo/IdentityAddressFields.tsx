import React from "react";
import { MapPin } from "lucide-react";
import type { PatientGeneralInfo } from "./types";

interface IdentityAddressFieldsProps {
	patient?: PatientGeneralInfo | null | undefined;
	onUpdatePatient?: ((field: keyof PatientGeneralInfo, value: any) => void) | undefined;
	disabled?: boolean | undefined;
	addressesMatchState: boolean;
	setAddressesMatchState: React.Dispatch<React.SetStateAction<boolean>>;
}

export const IdentityAddressFields: React.FC<IdentityAddressFieldsProps> = ({
	patient, onUpdatePatient, disabled = false, addressesMatchState, setAddressesMatchState,
}) => {
	return (
		<div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 pt-2 border-t border-[var(--glass-border)]">
			<div className="flex flex-col gap-1">
				<label className="text-xs font-bold text-[var(--ink)] flex items-center justify-between">
					<span className="flex items-center gap-1.5">
						<MapPin className="w-3.5 h-3.5 text-[var(--muted)]" />
						<span>Адрес регистрации (по паспорту)</span>
					</span>
				</label>
				<input
					type="text"
					className="min-h-[44px] sm:min-h-[32px] h-8 px-3 py-1.5 text-xs sm:text-sm rounded-lg bg-[var(--paper)] border border-[var(--glass-border)] text-[var(--ink)] focus:outline-hidden focus:ring-2 focus:ring-[var(--teal)] transition-colors"
					value={patient?.registrationAddress ?? patient?.address ?? ""}
					onChange={(e) => {
						const val = e.target.value;
						onUpdatePatient?.("address", val);
						onUpdatePatient?.("registrationAddress", val);
						if (addressesMatchState) {
							onUpdatePatient?.("residentialAddress", val);
						}
					}}
					placeholder="г. Москва, ул. Ленина, д. 10, кв. 25"
					disabled={disabled}
					data-testid="input-patient-address"
				/>
			</div>

			<div className="flex flex-col gap-1">
				<div className="flex items-center justify-between">
					<label className="text-xs font-bold text-[var(--ink)] flex items-center gap-1.5">
						<MapPin className="w-3.5 h-3.5 text-[var(--muted)]" />
						<span>Адрес фактического проживания</span>
					</label>
					<label className="flex items-center gap-1 text-[11px] text-[var(--muted)] cursor-pointer select-none">
						<input
							type="checkbox"
							className="rounded text-[var(--teal)] cursor-pointer"
							checked={addressesMatchState}
							onChange={(e) => {
								const checked = e.target.checked;
								setAddressesMatchState(checked);
								onUpdatePatient?.("addressesMatch", checked);
								if (checked) {
									onUpdatePatient?.("residentialAddress", patient?.registrationAddress || patient?.address || "");
								}
							}}
							data-testid="checkbox-addresses-match"
						/>
						<span>Совпадает с регистрацией</span>
					</label>
				</div>
				<input
					type="text"
					className={`min-h-[44px] sm:min-h-[32px] h-8 px-3 py-1.5 text-xs sm:text-sm rounded-lg bg-[var(--paper)] border border-[var(--glass-border)] text-[var(--ink)] focus:outline-hidden focus:ring-2 focus:ring-[var(--teal)] transition-colors ${
						addressesMatchState ? "opacity-60 bg-[var(--paper-soft)] cursor-not-allowed" : ""
					}`}
					value={addressesMatchState ? (patient?.registrationAddress ?? patient?.address ?? "") : (patient?.residentialAddress ?? "")}
					onChange={(e) => onUpdatePatient?.("residentialAddress", e.target.value)}
					placeholder="Фактическое место жительства"
					disabled={disabled || addressesMatchState}
					data-testid="input-residential-address"
				/>
			</div>
		</div>
	);
};
