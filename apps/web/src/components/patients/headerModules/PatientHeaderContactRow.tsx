import { Calendar, Copy, Phone } from "lucide-react";
import React from "react";
import { showToast } from "../../GlobalToast";
import { initiateOutboundCall } from "../../telephony/initiateOutboundCall";
import { PatientLoyaltyHeader } from "../PatientLoyaltyHeader";
import { PatientSentimentBadge } from "../PatientSentimentBadge";

export interface PatientHeaderContactRowProps {
	readonly resolvedPatient: any;
	readonly fullName: string;
	readonly birthDateStr: string;
	readonly phone: string;
}

export const PatientHeaderContactRow: React.FC<PatientHeaderContactRowProps> = ({
	resolvedPatient,
	fullName,
	birthDateStr,
	phone,
}) => {
	const handleCopyPhone = () => {
		if (typeof navigator !== "undefined" && navigator.clipboard) {
			void navigator.clipboard.writeText(phone);
			showToast("Телефон скопирован в буфер", "success");
		}
	};

	return (
		<div className="flex items-center gap-2.5 flex-wrap text-xs text-[var(--muted)] mt-0.5 min-w-0">
			{birthDateStr && (
				<span className="inline-flex items-center gap-1 shrink-0">
					<Calendar size={12} className="shrink-0 opacity-70" />
					<span>{birthDateStr}</span>
				</span>
			)}
			{phone ? (
				<span className="inline-flex items-center gap-1 font-mono font-semibold text-[var(--ink)] shrink-0">
					<button
						type="button"
						onClick={() => initiateOutboundCall({ phone, patientId: resolvedPatient?.id, patientName: fullName })}
						className="inline-flex items-center gap-1 text-[var(--teal,#0d9488)] hover:underline cursor-pointer group"
						title="Позвонить пациенту (IP-телефония АТС)"
						aria-label={`Позвонить пациенту ${phone}`}
						data-testid="patient-header-phone-call-btn"
					>
						<Phone size={11} className="shrink-0 transition-transform group-hover:scale-110" />
						<span className="font-mono text-[var(--ink)] group-hover:text-[var(--teal)] transition-colors">{phone}</span>
					</button>
					<button
						type="button"
						onClick={handleCopyPhone}
						className="p-0.5 rounded hover:bg-[var(--paper-soft)] text-[var(--muted)] hover:text-[var(--ink)] cursor-pointer transition-colors"
						title="Скопировать телефон"
						aria-label="Скопировать телефон"
					>
						<Copy size={11} />
					</button>
				</span>
			) : (
				<span className="italic shrink-0">Телефон не указан</span>
			)}
			<PatientSentimentBadge patient={resolvedPatient} />
			<PatientLoyaltyHeader patientId={resolvedPatient?.id} />
		</div>
	);
};
