import React from "react";
import { AlertTriangle, ShieldAlert, ShieldCheck } from "lucide-react";
import type { RepresentativeRelationshipMeta } from "./types";

interface RepresentativeAlertBannerProps {
	isMinorChild: boolean;
	selectedRep: RepresentativeRelationshipMeta | null;
	compact?: boolean;
}

export const RepresentativeAlertBanner: React.FC<RepresentativeAlertBannerProps> = ({
	isMinorChild,
	selectedRep,
	compact = false,
}) => {
	return (
		<>
			{isMinorChild && (
				<div
					className={`rounded-xl bg-amber-500/15 border border-amber-500/40 text-amber-950 dark:text-amber-200 text-xs font-semibold flex items-center justify-between gap-3 shadow-2xs ${compact ? "p-2.5" : "p-3"}`}
					data-testid="minor-323fz-alert"
				>
					<div className="flex items-center gap-2">
						<ShieldAlert className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
						<span>
							<strong>Родственник / Сопровождающий:</strong> Пациент младше 15 лет. Согласие на приём подписывает законный представитель (родитель / опекун).
							<span className="sr-only">Основание: ст. 20 323-ФЗ, ст. 64 СК РФ</span>
						</span>
					</div>
					<span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-amber-600 text-white shrink-0">
						Младше 15 лет
					</span>
				</div>
			)}

			{selectedRep && (
				<div
					className={`rounded-xl border text-xs font-semibold flex items-center justify-between gap-3 ${compact ? "p-2.5 rounded-lg" : "p-3"} ${
						selectedRep.isLegalRepresentative
							? "bg-emerald-500/10 border-emerald-500/30 text-emerald-800 dark:text-emerald-300"
							: "bg-amber-500/10 border-amber-500/30 text-amber-800 dark:text-amber-300"
					}`}
					data-testid="representative-ids-signing-badge"
				>
					<div className="flex items-center gap-2">
						{selectedRep.isLegalRepresentative ? (
							<ShieldCheck size={compact ? 15 : 16} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
						) : (
							<AlertTriangle size={compact ? 15 : 16} className="text-amber-600 dark:text-amber-400 shrink-0" />
						)}
						<span className={compact ? "text-[11px]" : ""}>
							{selectedRep.isLegalRepresentative ? (
								<>
									<strong>Законный представитель ребёнка:</strong> Имеет право подписывать согласие на приём и лечение.
								</>
							) : (
								<>
									<strong>Родственник (не является законным представителем):</strong> Для подписания согласий за несовершеннолетнего требуется доверенность.
								</>
							)}
						</span>
					</div>
					<span
						className={`px-2 py-0.5 rounded text-[10px] font-black uppercase shrink-0 border ${
							selectedRep.isLegalRepresentative
								? "bg-emerald-600 text-white border-emerald-700"
								: "bg-amber-600 text-white border-amber-700"
						}`}
					>
						{selectedRep.isLegalRepresentative ? "Право подписи: ДА" : "По доверенности"}
					</span>
				</div>
			)}
		</>
	);
};
