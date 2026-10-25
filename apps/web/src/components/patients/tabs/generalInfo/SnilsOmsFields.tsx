import React from "react";
import { ExternalLink } from "lucide-react";
import { formatOmsPolicy, formatSnils, formatTaxpayerInn } from "../../../../utils/inputSanitation";
import type { PatientGeneralInfo } from "./types";

interface SnilsOmsFieldsProps {
	patient?: PatientGeneralInfo | null | undefined;
	onUpdatePatient?: ((field: keyof PatientGeneralInfo, value: any) => void) | undefined;
	disabled?: boolean | undefined;
	onOpenTaxCertificate?: (() => void) | undefined;
}

export const SnilsOmsFields: React.FC<SnilsOmsFieldsProps> = ({
	patient, onUpdatePatient, disabled = false, onOpenTaxCertificate,
}) => {
	return (
		<div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
			<div className="flex flex-col gap-1">
				<label className="text-[11px] font-bold text-[var(--muted)] flex items-center justify-between">
					<span>СНИЛС (по желанию)</span>
					<span className="flex items-center gap-1.5">
						<span className="text-[9px] text-teal-600 font-bold uppercase">Для вычета 13%</span>
						{onOpenTaxCertificate && (
							<button
								type="button"
								onClick={onOpenTaxCertificate}
								className="text-[10px] text-teal-600 hover:underline font-bold cursor-pointer inline-flex items-center gap-0.5"
								title="Оформить справку для налогового вычета (13%)"
								data-testid="link-order-tax-certificate"
							>
								<span>Вычет</span>
								<ExternalLink className="w-2.5 h-2.5" />
							</button>
						)}
					</span>
				</label>
				<input
					type="text"
					className="min-h-[44px] sm:min-h-[32px] h-8 px-2.5 py-1 text-xs rounded-lg bg-[var(--paper)] border border-[var(--glass-border)] text-[var(--ink)] font-mono focus:outline-hidden focus:ring-2 focus:ring-[var(--teal)] transition-colors"
					value={patient?.snils ?? ""}
					onChange={(e) => onUpdatePatient?.("snils", formatSnils(e.target.value))}
					placeholder="123-456-789 00 (необязательно)"
					disabled={disabled}
					data-testid="input-snils"
					title="СНИЛС не обязателен для приёма и лечения. Нужен только при оформлении справки для налогового вычета 13%"
				/>
			</div>

			<div className="flex flex-col gap-1">
				<label className="text-[11px] font-bold text-[var(--muted)] flex items-center justify-between">
					<span>ИНН (не требуется физлицам)</span>
					<span className="text-[9px] text-[var(--muted)]">Необязательно</span>
				</label>
				<input
					type="text"
					className="min-h-[44px] sm:min-h-[32px] h-8 px-2.5 py-1 text-xs rounded-lg bg-[var(--paper)] border border-[var(--glass-border)] text-[var(--ink)] font-mono focus:outline-hidden focus:ring-2 focus:ring-[var(--teal)] transition-colors"
					value={patient?.inn ?? ""}
					onChange={(e) => onUpdatePatient?.("inn", formatTaxpayerInn(e.target.value))}
					placeholder="Только при наличии (необязательно)"
					disabled={disabled}
					data-testid="input-inn"
					title="Для пациентов-физлиц ИНН не требуется. Заполняется добровольно или для организаций и ИП"
				/>
			</div>

			<div className="flex flex-col gap-1">
				<label className="text-[11px] font-bold text-[var(--muted)]">Полис ОМС (ЕНП)</label>
				<input
					type="text"
					className="min-h-[44px] sm:min-h-[32px] h-8 px-2.5 py-1 text-xs rounded-lg bg-[var(--paper)] border border-[var(--glass-border)] text-[var(--ink)] font-mono focus:outline-hidden focus:ring-2 focus:ring-[var(--teal)] transition-colors"
					value={patient?.omsPolicyNumber ?? ""}
					onChange={(e) => onUpdatePatient?.("omsPolicyNumber", formatOmsPolicy(e.target.value))}
					placeholder="16 цифр полиса ОМС"
					disabled={disabled}
					data-testid="input-oms-policy"
				/>
			</div>
		</div>
	);
};
