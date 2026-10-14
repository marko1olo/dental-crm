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
	chairStatus = "free",
	onChangeChairStatus,
	onClose,
	onSessionPepSigning,
	onInitiateBatchSigning,
	onOpenWallet,
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

				{/* Chair Status Indicator / 1-Click Toggle (свободно / пациент в кресле / задержка) */}
				<div
					className="doctor-pwa-chair-status-strip"
					data-testid="chair-status-strip"
					style={{
						display: "flex",
						alignItems: "center",
						justifyContent: "space-between",
						gap: "8px",
						padding: "8px 12px",
						background: "var(--paper-soft)",
						border: "1px solid var(--line)",
						borderRadius: "14px",
					}}
				>
					<div className="flex items-center gap-1.5 text-xs font-bold text-[var(--ink)]">
						<span className="text-[var(--muted)] font-medium">Кресло:</span>
						<span
							className="inline-block w-2.5 h-2.5 rounded-full"
							style={{
								backgroundColor:
									chairStatus === "in_chair"
										? "var(--emerald, #10b981)"
										: chairStatus === "delayed"
											? "var(--rose, #f43f5e)"
											: "var(--teal, #14b8a6)",
								boxShadow:
									chairStatus === "in_chair"
										? "0 0 8px rgba(16, 185, 129, 0.6)"
										: chairStatus === "delayed"
											? "0 0 8px rgba(244, 63, 94, 0.6)"
											: "none",
							}}
						/>
						<span data-testid="active-chair-status-label">
							{chairStatus === "in_chair"
								? "Пациент в кресле"
								: chairStatus === "delayed"
									? "Задержка приёма"
									: "Свободно"}
						</span>
					</div>

					<div
						className="flex items-center gap-1"
						role="radiogroup"
						aria-label="Оперативный статус стоматологического кресла"
					>
						<button
							type="button"
							role="radio"
							aria-checked={chairStatus === "free"}
							onClick={() => onChangeChairStatus?.("free")}
							className={`chair-toggle-btn ${chairStatus === "free" ? "active-free" : ""}`}
							data-testid="chair-status-free-btn"
							title="Кресло свободно, готово к приёму"
							style={{
								minHeight: "44px",
								padding: "0 10px",
								borderRadius: "10px",
								fontSize: "11px",
								fontWeight: 700,
								cursor: "pointer",
								border: chairStatus === "free" ? "1px solid var(--teal)" : "1px solid var(--line)",
								background: chairStatus === "free" ? "rgba(13, 148, 136, 0.15)" : "var(--paper)",
								color: chairStatus === "free" ? "var(--teal)" : "var(--muted)",
								display: "inline-flex",
								alignItems: "center",
								justifyContent: "center",
								transition: "all 0.15s ease",
							}}
						>
							Свободно
						</button>

						<button
							type="button"
							role="radio"
							aria-checked={chairStatus === "in_chair"}
							onClick={() => onChangeChairStatus?.("in_chair")}
							className={`chair-toggle-btn ${chairStatus === "in_chair" ? "active-in-chair" : ""}`}
							data-testid="chair-status-in-chair-btn"
							title="Пациент в кресле, идёт приём"
							style={{
								minHeight: "44px",
								padding: "0 10px",
								borderRadius: "10px",
								fontSize: "11px",
								fontWeight: 700,
								cursor: "pointer",
								border: chairStatus === "in_chair" ? "1px solid var(--emerald, #10b981)" : "1px solid var(--line)",
								background: chairStatus === "in_chair" ? "rgba(16, 185, 129, 0.18)" : "var(--paper)",
								color: chairStatus === "in_chair" ? "var(--emerald, #10b981)" : "var(--muted)",
								display: "inline-flex",
								alignItems: "center",
								justifyContent: "center",
								transition: "all 0.15s ease",
							}}
						>
							В кресле
						</button>

						<button
							type="button"
							role="radio"
							aria-checked={chairStatus === "delayed"}
							onClick={() => onChangeChairStatus?.("delayed")}
							className={`chair-toggle-btn ${chairStatus === "delayed" ? "active-delayed" : ""}`}
							data-testid="chair-status-delayed-btn"
							title="Задержка приёма (оповещение регистратуры)"
							style={{
								minHeight: "44px",
								padding: "0 10px",
								borderRadius: "10px",
								fontSize: "11px",
								fontWeight: 700,
								cursor: "pointer",
								border: chairStatus === "delayed" ? "1px solid var(--rose, #f43f5e)" : "1px solid var(--line)",
								background: chairStatus === "delayed" ? "rgba(244, 63, 94, 0.15)" : "var(--paper)",
								color: chairStatus === "delayed" ? "var(--rose, #f43f5e)" : "var(--muted)",
								display: "inline-flex",
								alignItems: "center",
								justifyContent: "center",
								transition: "all 0.15s ease",
							}}
						>
							Задержка
						</button>
					</div>
				</div>

				{/* Live Piece-Rate Accrual Card */}
				<div
					className="doctor-shift-earnings-card cursor-pointer hover:border-[var(--teal,#14b8a6)] transition-all"
					data-testid="doctor-shift-earnings-card"
					onClick={onOpenWallet}
					role="button"
					tabIndex={0}
					title="Нажмите для открытия подробного расчета сдельной оплаты и вычетов ЗТЛ"
				>
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
