import { Phone, QrCode, Sparkles } from "lucide-react";
import type React from "react";
import { BookingConfirmationDetails } from "./BookingConfirmationDetails";

export interface BookingBoardingPassProps {
	readonly reference: string;
	readonly isUnconfirmed: boolean;
	readonly dateStr: string;
	readonly timeStr: string;
	readonly cabinet: string;
	readonly doctorFullName: string;
	readonly branchName: string;
	readonly branchAddress: string;
	readonly patientDisplayName: string;
	readonly patientDisplayPhone?: string | undefined;
}

export const BookingBoardingPass: React.FC<BookingBoardingPassProps> = ({
	reference,
	isUnconfirmed,
	dateStr,
	timeStr,
	cabinet,
	doctorFullName,
	branchName,
	branchAddress,
	patientDisplayName,
	patientDisplayPhone,
}) => {
	return (
		<div className="dbw-boarding-pass dbw-floating-pass">
			<div className="dbw-pass-header">
				<div className="flex items-center gap-2">
					<Sparkles size={16} />
					<span className="text-xs font-bold uppercase tracking-wider">Dental Boarding Pass</span>
				</div>
				{isUnconfirmed ? (
					<span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-teal-500/30 text-white flex items-center gap-1" data-testid="confirmation-status-badge">
						<Phone size={11} />
						<span>Предварительная бронь</span>
					</span>
				) : (
					<span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-white/20" data-testid="confirmation-status-badge">
						Подтверждено
					</span>
				)}
			</div>

			<div className="dbw-pass-body">
				<BookingConfirmationDetails
					dateStr={dateStr}
					timeStr={timeStr}
					cabinet={cabinet}
					doctorFullName={doctorFullName}
					branchName={branchName}
					branchAddress={branchAddress}
					patientDisplayName={patientDisplayName}
					patientDisplayPhone={patientDisplayPhone}
				/>

				<div className="dbw-pass-perforation" aria-hidden="true">
					<div className="dbw-pass-perforation-line" />
				</div>

				<div className="dbw-pass-barcode-section">
					<div className="flex items-center justify-between w-full max-w-sm gap-4 mb-2">
						<div className="flex flex-col items-center">
							<svg viewBox="0 0 160 40" className="w-40 h-10 text-slate-900" fill="currentColor" aria-label="Штрихкод талона">
								<rect x="0" y="0" width="3" height="40" /><rect x="5" y="0" width="1" height="40" /><rect x="8" y="0" width="4" height="40" /><rect x="14" y="0" width="2" height="40" /><rect x="18" y="0" width="5" height="40" /><rect x="25" y="0" width="2" height="40" /><rect x="29" y="0" width="3" height="40" /><rect x="34" y="0" width="1" height="40" /><rect x="37" y="0" width="4" height="40" /><rect x="43" y="0" width="2" height="40" /><rect x="47" y="0" width="5" height="40" /><rect x="54" y="0" width="3" height="40" /><rect x="59" y="0" width="2" height="40" /><rect x="63" y="0" width="4" height="40" /><rect x="69" y="0" width="1" height="40" /><rect x="72" y="0" width="5" height="40" /><rect x="79" y="0" width="2" height="40" /><rect x="83" y="0" width="4" height="40" /><rect x="89" y="0" width="2" height="40" /><rect x="93" y="0" width="5" height="40" /><rect x="100" y="0" width="1" height="40" /><rect x="103" y="0" width="4" height="40" /><rect x="109" y="0" width="3" height="40" /><rect x="114" y="0" width="2" height="40" /><rect x="118" y="0" width="4" height="40" /><rect x="124" y="0" width="1" height="40" /><rect x="127" y="0" width="5" height="40" /><rect x="134" y="0" width="2" height="40" /><rect x="138" y="0" width="4" height="40" /><rect x="144" y="0" width="2" height="40" /><rect x="148" y="0" width="3" height="40" /><rect x="153" y="0" width="2" height="40" /><rect x="157" y="0" width="3" height="40" />
							</svg>
							<span className="text-[10px] font-mono tracking-wider text-slate-600 mt-1">{reference}</span>
						</div>
						<div className="flex flex-col items-center border-l pl-4 border-slate-200">
							<div className="p-1 rounded bg-slate-100 text-slate-800"><QrCode size={36} /></div>
							<span className="text-[9px] text-slate-500 mt-1">QR Ресепшен</span>
						</div>
					</div>
					<div className="text-[11px] text-slate-500 text-center">
						Покажите этот экран администратору на входе для быстрой регистрации без очереди
					</div>
				</div>
			</div>
		</div>
	);
};
