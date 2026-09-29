/**
 * DENTE CRM — Patient Portal Treatment Plan Hero Header & Financial Status
 * (DOMAIN: PATIENT PORTAL & CLINICAL TRANSPARENCY)
 *
 * Encapsulates the emergency 24/7 hotline, rehabilitation progress hero,
 * 1-click tax deduction 13% certificate trigger (FNS KND 1151156), and next visit bar.
 */

import {
	Calendar,
	CheckCircle2,
	Clock,
	DollarSign,
	Download,
	FileText,
	MessageCircle,
	PhoneCall,
	ShieldAlert,
	ShieldCheck,
	Zap,
} from "lucide-react";
import React from "react";
import {
	formatRubles,
	formatRussianDateIso,
	type PatientTreatmentPlan,
} from "../patientCabinet/patientCabinetEngine.js";

export interface PatientPlanNextAppointment {
	readonly id?: string | undefined;
	readonly dateRu?: string | undefined;
	readonly dateIso?: string | undefined;
	readonly timeRu?: string | undefined;
	readonly doctorName?: string | undefined;
	readonly roomNumber?: string | undefined;
}

export interface PlanHeroHeaderProps {
	readonly plan?: PatientTreatmentPlan | undefined;
	readonly totalCostRub: number;
	readonly paidCostRub: number;
	readonly remainingCostRub: number;
	readonly stagesCount: number;
	readonly completedStagesCount: number;
	readonly progressPercent: number;
	readonly estimatedTaxRefundRub: number;
	readonly onDownloadTax: () => void;
	readonly nextAppointment?: PatientPlanNextAppointment | null | undefined;
	readonly onBookAppointment?: (() => void) | undefined;
	readonly onRescheduleAppointment?: (() => void) | undefined;
	readonly onViewPriceDetails?: (() => void) | undefined;
	readonly emergencyPhone?: string | undefined;
	readonly whatsappUrl: string;
}

export const PlanHeroHeader: React.FC<PlanHeroHeaderProps> = ({
	plan,
	totalCostRub,
	paidCostRub,
	remainingCostRub,
	stagesCount,
	completedStagesCount,
	progressPercent,
	estimatedTaxRefundRub,
	onDownloadTax,
	nextAppointment,
	onBookAppointment,
	onRescheduleAppointment,
	onViewPriceDetails,
	emergencyPhone = "",
	whatsappUrl,
}) => {
	return (
		<>
			{/* 1. EMERGENCY 24/7 HOTLINE BANNER */}
			<div
				className="pc-card emergency-hotline-card"
				data-testid="emergency-hotline-banner"
				style={{
					backgroundColor: "rgba(239, 68, 68, 0.08)",
					border: "1.5px solid var(--pc-danger, #ef4444)",
					borderRadius: "12px",
					padding: "14px 16px",
					display: "flex",
					flexDirection: "column",
					gap: "10px",
				}}
			>
				<div
					style={{
						display: "flex",
						justifyContent: "space-between",
						alignItems: "flex-start",
						flexWrap: "wrap",
						gap: "8px",
					}}
				>
					<div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
						<div
							style={{
								width: "36px",
								height: "36px",
								borderRadius: "50%",
								backgroundColor: "var(--pc-danger, #ef4444)",
								color: "var(--on-teal, #ffffff)",
								display: "flex",
								alignItems: "center",
								justifyContent: "center",
								flexShrink: 0,
							}}
						>
							<ShieldAlert size={20} />
						</div>
						<div>
							<strong
								style={{
									fontSize: "15px",
									color: "var(--pc-text-main, var(--ink, #0f172a))",
								}}
							>
								Возникла боль или дискомфорт после приема?
							</strong>
							<p
								style={{
									margin: "2px 0 0 0",
									fontSize: "12px",
									color: "var(--pc-text-muted, #94a3b8)",
								}}
							>
								Круглосуточная прямая связь с дежурным врачом-стоматологом клиники DENTE:
							</p>
						</div>
					</div>

					<span
						style={{
							backgroundColor: "var(--pc-danger, #ef4444)",
							color: "var(--on-teal, #ffffff)",
							fontSize: "12px",
							fontWeight: 800,
							padding: "3px 8px",
							borderRadius: "12px",
							display: "inline-flex",
							alignItems: "center",
							gap: "4px",
						}}
					>
						<Zap size={12} />
						<span>24/7 Линия заботы</span>
					</span>
				</div>

				<div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
					<a
						href={whatsappUrl}
						target="_blank"
						rel="noreferrer"
						data-testid="emergency-whatsapp-btn"
						style={{
							flex: 1,
							minWidth: "160px",
							minHeight: "44px",
							borderRadius: "8px",
							backgroundColor: "var(--ok-fg, #25d366)",
							color: "var(--on-teal, #ffffff)",
							display: "inline-flex",
							alignItems: "center",
							justifyContent: "center",
							gap: "8px",
							fontWeight: 700,
							fontSize: "13px",
							textDecoration: "none",
							padding: "8px 16px",
							touchAction: "manipulation",
							boxShadow: "0 2px 8px rgba(37, 211, 102, 0.3)",
						}}
					>
						<MessageCircle size={18} />
						<span>Написать в WhatsApp дежурному</span>
					</a>

					<a
						href={`tel:${emergencyPhone.replace(/\D/g, "")}`}
						data-testid="emergency-phone-btn"
						style={{
							flex: 1,
							minWidth: "160px",
							minHeight: "44px",
							borderRadius: "8px",
							backgroundColor: "var(--pc-surface, #1e293b)",
							color: "var(--pc-text-main, var(--ink, #0f172a))",
							border: "1px solid var(--pc-border, #334155)",
							display: "inline-flex",
							alignItems: "center",
							justifyContent: "center",
							gap: "8px",
							fontWeight: 700,
							fontSize: "13px",
							textDecoration: "none",
							padding: "8px 16px",
							touchAction: "manipulation",
						}}
					>
						<PhoneCall size={18} style={{ color: "var(--pc-danger, #ef4444)" }} />
						<span>Позвонить в клинику ({emergencyPhone})</span>
					</a>
				</div>
			</div>

			{/* 2. REHABILITATION PROGRESS HERO CARD */}
			<div
				className="pc-card plan-progress-hero-card"
				data-testid="treatment-plan-progress-hero"
				style={{
					backgroundColor: "var(--pc-surface, #1e293b)",
					border: "1.5px solid var(--pc-primary, #0d9488)",
					borderRadius: "12px",
					padding: "18px",
					display: "flex",
					flexDirection: "column",
					gap: "14px",
				}}
			>
				<div
					style={{
						display: "flex",
						justifyContent: "space-between",
						alignItems: "baseline",
						flexWrap: "wrap",
						gap: "8px",
					}}
				>
					<div>
						<span
							style={{
								fontSize: "12px",
								fontWeight: 700,
								color: "var(--pc-primary, #0d9488)",
								textTransform: "uppercase",
								letterSpacing: "0.5px",
							}}
						>
							Текущий прогресс реабилитации
						</span>
						<h3
							style={{
								margin: "2px 0 0 0",
								fontSize: "16px",
								fontWeight: 800,
								color: "var(--pc-text-main, var(--ink, #0f172a))",
							}}
						>
							{plan?.titleRu || "Комплексный план лечения"}
						</h3>
					</div>

					{onViewPriceDetails && (
						<button
							type="button"
							onClick={onViewPriceDetails}
							style={{
								background: "transparent",
								border: "1px solid var(--pc-primary, #0d9488)",
								color: "var(--pc-primary, #0d9488)",
								fontSize: "12px",
								fontWeight: 700,
								cursor: "pointer",
								display: "inline-flex",
								alignItems: "center",
								gap: "4px",
								padding: "4px 8px",
								borderRadius: "6px",
							}}
						>
							<FileText size={13} />
							<span>Детализация сметы</span>
						</button>
					)}
				</div>

				<div
					style={{
						display: "flex",
						alignItems: "center",
						justifyContent: "space-between",
						flexWrap: "wrap",
						gap: "10px",
						padding: "12px",
						backgroundColor: "var(--pc-surface, var(--paper-strong, #ffffff))",
						border: "1px solid var(--pc-border, #334155)",
						borderRadius: "10px",
					}}
				>
					<div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
						<CheckCircle2 size={20} style={{ color: "var(--pc-success, #10b981)" }} />
						<strong
							style={{
								fontSize: "14px",
								color: "var(--pc-text-main, var(--ink, #0f172a))",
							}}
						>
							Выполнено {completedStagesCount} из {stagesCount} этапов
						</strong>
					</div>

					<div
						style={{
							display: "flex",
							alignItems: "center",
							gap: "12px",
							fontSize: "13px",
							flexWrap: "wrap",
						}}
					>
						<span style={{ color: "var(--pc-success, #10b981)", fontWeight: 700 }}>
							Оплачено: {formatRubles(paidCostRub)}
						</span>
						<span style={{ color: "var(--pc-text-muted, #94a3b8)" }}>&bull;</span>
						<span
							style={{
								color:
									remainingCostRub > 0
										? "var(--pc-warning, #f59e0b)"
										: "var(--pc-success, #10b981)",
								fontWeight: 700,
							}}
						>
							{remainingCostRub > 0
								? `Остаток: ${formatRubles(remainingCostRub)}`
								: "Полностью оплачен"}
						</span>
					</div>
				</div>

				{/* Stepped Progress Bar */}
				<div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
					<div className="pc-progress-bar-bg" style={{ height: "12px", borderRadius: "6px" }}>
						<div
							className="pc-progress-bar-fill"
							style={{
								width: `${progressPercent}%`,
								backgroundColor:
									progressPercent === 100
										? "var(--pc-success, #10b981)"
										: "var(--pc-primary, #0d9488)",
								transition: "width 0.5s ease",
							}}
						/>
					</div>

					<div
						style={{
							display: "flex",
							justifyContent: "space-between",
							fontSize: "12px",
							color: "var(--pc-text-muted, #94a3b8)",
						}}
					>
						<span>0% (Старт)</span>
						<span>
							Итоговая стоимость плана: <strong>{formatRubles(totalCostRub)}</strong>
						</span>
						<span>100% (Финал)</span>
					</div>
				</div>

				{/* Anti-Hidden-Fee Transparency Badge */}
				<div
					style={{
						backgroundColor: "rgba(16, 185, 129, 0.08)",
						border: "1px solid rgba(16, 185, 129, 0.25)",
						borderRadius: "8px",
						padding: "10px 12px",
						display: "flex",
						alignItems: "flex-start",
						gap: "10px",
					}}
				>
					<ShieldCheck
						size={20}
						style={{
							color: "var(--pc-success, #10b981)",
							flexShrink: 0,
							marginTop: "1px",
						}}
					/>
					<div
						style={{
							fontSize: "12px",
							color: "var(--pc-text-main, var(--ink, #0f172a))",
							lineHeight: "1.4",
						}}
					>
						<strong style={{ color: "var(--pc-success, #10b981)" }}>
							Честная прозрачная цена «Под ключ»:
						</strong>{" "}
						Стоимость зафиксирована в плане лечения. В каждый этап уже включены: премиальная
						анестезия (Septanest), контрольные прицельные снимки визиографа (RVG), изоляция
						коффердамом и гарантийный сертификат. <strong>Никаких доплат на кассе клиники.</strong>
					</div>
				</div>
			</div>

			{/* 2.1. 1-CLICK TAX DEDUCTION 13% QUICK WIDGET (ORDER FNS KND 1151156) */}
			{paidCostRub > 0 && (
				<div
					className="pc-card tax-deduction-quick-card"
					data-testid="tax-deduction-quick-card"
					style={{
						backgroundColor: "var(--pc-surface, #1e293b)",
						border: "1px solid var(--pc-border, #334155)",
						borderRadius: "12px",
						padding: "14px 16px",
						display: "flex",
						justifyContent: "space-between",
						alignItems: "center",
						flexWrap: "wrap",
						gap: "12px",
					}}
				>
					<div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
						<div
							style={{
								width: "36px",
								height: "36px",
								borderRadius: "8px",
								backgroundColor: "rgba(16, 185, 129, 0.15)",
								color: "var(--pc-success, #10b981)",
								display: "flex",
								alignItems: "center",
								justifyContent: "center",
								flexShrink: 0,
							}}
						>
							<DollarSign size={20} />
						</div>
						<div>
							<div style={{ fontSize: "12px", color: "var(--pc-text-muted, #94a3b8)" }}>
								Возврат 13% от оплаченного лечения (налоговый вычет):
							</div>
							<strong style={{ fontSize: "14px", color: "var(--pc-success, #10b981)" }}>
								~{formatRubles(estimatedTaxRefundRub)} к возврату на карту
							</strong>
						</div>
					</div>

					<button
						type="button"
						onClick={onDownloadTax}
						data-testid="plan-view-download-tax-btn"
						style={{
							minHeight: "44px",
							padding: "8px 16px",
							borderRadius: "8px",
							backgroundColor: "var(--pc-primary, #0d9488)",
							color: "var(--on-teal, #ffffff)",
							border: "none",
							fontSize: "13px",
							fontWeight: 700,
							cursor: "pointer",
							display: "inline-flex",
							alignItems: "center",
							gap: "6px",
							touchAction: "manipulation",
						}}
					>
						<Download size={16} />
						<span>Скачать справку для налоговой (1 клик)</span>
					</button>
				</div>
			)}

			{/* 2.2. NEXT APPOINTMENT & RESCHEDULE BAR */}
			{nextAppointment && (
				<div
					className="pc-card next-visit-card"
					data-testid="next-visit-card"
					style={{
						backgroundColor: "var(--pc-surface, #1e293b)",
						border: "1px solid var(--pc-border, #334155)",
						borderRadius: "12px",
						padding: "14px 16px",
						display: "flex",
						justifyContent: "space-between",
						alignItems: "center",
						flexWrap: "wrap",
						gap: "12px",
					}}
				>
					<div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
						<div
							style={{
								width: "36px",
								height: "36px",
								borderRadius: "8px",
								backgroundColor: "var(--pc-primary-light, rgba(13, 148, 136, 0.15))",
								color: "var(--pc-primary, #0d9488)",
								display: "flex",
								alignItems: "center",
								justifyContent: "center",
								flexShrink: 0,
							}}
						>
							<Calendar size={20} />
						</div>
						<div>
							<div style={{ fontSize: "12px", color: "var(--pc-text-muted, #94a3b8)" }}>
								Следующий визит по плану лечения:
							</div>
							<strong
								style={{
									fontSize: "14px",
									color: "var(--pc-text-main, var(--ink, #0f172a))",
								}}
							>
								{[
									nextAppointment.dateRu ||
										(nextAppointment.dateIso
											? formatRussianDateIso(nextAppointment.dateIso)
											: ""),
									nextAppointment.timeRu ? `в ${nextAppointment.timeRu}` : "",
									nextAppointment.doctorName
										? `Врач: ${nextAppointment.doctorName}`
										: "",
								]
									.filter(Boolean)
									.join(" • ")}
							</strong>
						</div>
					</div>

					<div style={{ display: "flex", gap: "8px" }}>
						{onRescheduleAppointment && (
							<button
								type="button"
								onClick={onRescheduleAppointment}
								className="pc-btn-secondary"
								data-testid="request-reschedule-btn"
								style={{
									minHeight: "44px",
									padding: "8px 16px",
									borderRadius: "8px",
									fontSize: "13px",
									fontWeight: 700,
									touchAction: "manipulation",
								}}
							>
								<Clock size={16} />
								<span>Запросить перенос</span>
							</button>
						)}
						{onBookAppointment && (
							<button
								type="button"
								onClick={onBookAppointment}
								className="pc-btn-primary"
								style={{
									minHeight: "44px",
									padding: "8px 16px",
									borderRadius: "8px",
									fontSize: "13px",
									fontWeight: 700,
									touchAction: "manipulation",
								}}
							>
								<span>Записаться</span>
							</button>
						)}
					</div>
				</div>
			)}
		</>
	);
};

export default PlanHeroHeader;
