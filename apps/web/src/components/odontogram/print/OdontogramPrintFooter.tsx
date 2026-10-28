import React from "react";

export interface OdontogramPrintFooterProps {
	activeDoctor?: any | undefined;
	activePatient?: any | undefined;
	auth?: any | undefined;
}

export const OdontogramPrintFooter: React.FC<OdontogramPrintFooterProps> = ({
	activeDoctor,
	activePatient,
	auth,
}) => {
	const docName =
		activeDoctor?.fullName ||
		auth?.currentUser?.name ||
		"_________________________";
	const patName =
		activePatient?.fullName ||
		"_________________________";

	return (
		<div className="mt-8 pt-4 border-t-2 border-slate-300 flex items-end justify-between text-xs text-slate-800" style={{ pageBreakInside: "avoid", breakInside: "avoid" }}>
			<div className="space-y-1">
				<div>
					Врач-стоматолог: _________________________ /{" "}
					<strong>{docName}</strong>
				</div>
				<div className="text-[10px] text-slate-500">(подпись и личная печать врача)</div>
			</div>

			<div className="w-20 h-20 rounded-full border-2 border-dashed border-slate-400 flex flex-col items-center justify-center text-[10px] font-bold text-slate-500 uppercase tracking-widest text-center">
				<span>М.П.</span>
				<span className="text-[8px] font-normal">Клиники</span>
			</div>

			<div className="space-y-1 text-right">
				<div>
					Пациент: _________________________ /{" "}
					<strong>{patName}</strong>
				</div>
				<div className="text-[10px] text-slate-500">(с состоянием зубной формулы ознакомлен)</div>
			</div>
		</div>
	);
};
