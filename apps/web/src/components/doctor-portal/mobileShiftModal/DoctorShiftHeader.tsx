import type React from "react";
import {
	FileCheck2,
	Smartphone,
	Sparkles,
	User,
	X,
	Zap,
} from "lucide-react";
import { formatKopecksRu } from "@dental/shared";
import type { DoctorShiftHeaderProps } from "./types";

export const DoctorShiftHeader: React.FC<DoctorShiftHeaderProps> = ({
	doctorName,
	doctorSpecialty,
	formattedShiftDate,
	earnings,
	unsignedAppointmentIds,
	onClose,
	onSessionPepSigning,
	onInitiateBatchSigning,
}) => {
	return (
		<>
			{/* Top PWA Status Bar */}
			<div className="doctor-pwa-status-bar">
				<div className="flex items-center gap-1.5 text-[var(--teal)]">
					<Smartphone size={14} />
					<span>DENTE Doctor PWA</span>
				</div>
				<div className="flex items-center gap-2">
					<span className="inline-block w-2 h-2 rounded-full bg-[var(--emerald)] animate-pulse" />
					<span>Смена онлайн • {formattedShiftDate}</span>
					<button
						type="button"
						onClick={onClose}
						className="min-h-[44px] min-w-[44px] p-2 rounded-full bg-[var(--paper-soft,#1e293b)] text-[var(--muted)] hover:text-[var(--ink)] flex items-center justify-center transition-colors cursor-pointer border border-[var(--line,#334155)]"
						aria-label="Закрыть"
						data-testid="close-doctor-shift-btn"
					>
						<X size={15} />
					</button>
				</div>
			</div>

			{/* Header with Doctor Bio & Live Piece-Rate Accrual */}
			<div className="doctor-pwa-header">
				<div className="doctor-pwa-header-top">
					<div>
						<h2 className="doctor-pwa-title" data-testid="doctor-pwa-name">
							<User className="w-5 h-5 text-[var(--teal)]" />
							<span>{doctorName}</span>
						</h2>
						<div className="mt-1 flex items-center gap-2">
							<span className="doctor-pwa-specialty-badge">
								{doctorSpecialty}
							</span>
							<span className="text-[11px] text-[var(--muted)] font-medium">
								Кабинет № 1
							</span>
						</div>
					</div>
				</div>

				{/* Live Piece-Rate Accrual Card */}
				<div className="doctor-shift-earnings-card" data-testid="doctor-shift-earnings-card">
					<div className="doctor-earnings-counter-label">
						<span>Заработано за смену (сделка %)</span>
						<span className="doctor-earnings-pill text-[var(--emerald)]">
							<Sparkles size={12} />
							<span>{earnings.completedAppointmentsCount} из {earnings.totalAppointmentsCount} приемов</span>
						</span>
					</div>
					<div className="doctor-earnings-counter-value" data-testid="doctor-earned-deal-amount">
						{formatKopecksRu(earnings.totalEarnedDealKop)}
					</div>
					<div className="doctor-earnings-breakdown-row">
						<span>Выручка: <strong className="text-[var(--ink)]">{formatKopecksRu(earnings.grossRevenueKop)}</strong></span>
						<span>ЗТЛ лаб: <strong className="text-[var(--rose)]">−{formatKopecksRu(earnings.totalLabDeductionsKop)}</strong></span>
						<span>Материалы: <strong className="text-[var(--gold)]">−{formatKopecksRu(earnings.totalMaterialDeductionsKop)}</strong></span>
					</div>
				</div>
			</div>

			{/* 1-Click Batch PEP Signing Banner (If unsigned 043/у exist) */}
			{unsignedAppointmentIds.length > 0 && (
				<div className="doctor-batch-pep-banner" data-testid="batch-pep-banner">
					<div className="doctor-batch-pep-header">
						<div className="flex items-center gap-2 text-[var(--gold)] font-bold text-xs">
							<FileCheck2 size={16} />
							<span>{unsignedAppointmentIds.length} медицинских карт требуют подписи</span>
						</div>
						<span className="text-[10px] text-[var(--muted)] font-semibold">
							63-ФЗ ст. 9 (ПЭП) • Приказ 947н
						</span>
					</div>
					<div className="flex flex-col sm:flex-row items-stretch gap-2 mt-2">
						<button
							type="button"
							onClick={() => onSessionPepSigning(unsignedAppointmentIds)}
							className="doctor-batch-pep-btn flex-1 !bg-[var(--teal-fill,#0d9488)] !text-[var(--on-teal,#ffffff)]"
							data-testid="session-pep-sign-btn"
						>
							<Zap size={16} />
							<span>Подписать ПЭП сессии ({unsignedAppointmentIds.length})</span>
						</button>
						<button
							type="button"
							onClick={onInitiateBatchSigning}
							className="doctor-batch-pep-btn secondary sm:w-auto px-3 text-xs"
							data-testid="sign-all-043u-btn"
							title="Подписать через СМС-код подтверждения"
						>
							<Smartphone size={14} />
							<span>Через СМС</span>
						</button>
					</div>
				</div>
			)}
		</>
	);
};
