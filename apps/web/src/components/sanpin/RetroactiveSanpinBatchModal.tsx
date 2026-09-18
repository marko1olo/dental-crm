/**
 * ============================================================================
 * RETROACTIVE SANPIN BATCH MODAL (СанПиН 3.3686-21 / Модальная студия)
 * Всплывающий полнофункциональный пульт моментального пакетного закрытия
 * журналов СанПиН за любой период для Медсестры ЦСО / Главврача.
 * 
 * Архитектурный фасад (Мандат 8s Закон Единого Неделимого Авторитета):
 * Делегирует рендеринг и бизнес-логику каноническому мастер-компоненту RetroactiveBatchTab,
 * устраняя дублирование 800+ строк кода и сохраняя модальный фрейм и интерфейс.
 * ============================================================================
 */

import React from "react";
import { Sparkles, X } from "lucide-react";
import type { PeriodPreset } from "./retroactiveSanpinEngine.js";
import { RetroactiveBatchTab } from "./RetroactiveBatchTab";

export interface RetroactiveSanpinBatchModalProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly onSuccess?: () => void;
	readonly initialPreset?: PeriodPreset | undefined;
}

export function RetroactiveSanpinBatchModal({
	isOpen,
	onClose,
	onSuccess,
	initialPreset = "current_month",
}: RetroactiveSanpinBatchModalProps) {
	if (!isOpen) return null;

	return (
		<div
			className="sanpin-modal-overlay"
			onClick={onClose}
			style={{
				position: "fixed",
				inset: 0,
				backgroundColor: "rgba(0, 0, 0, 0.65)",
				backdropFilter: "blur(4px)",
				display: "flex",
				alignItems: "center",
				justifyContent: "center",
				zIndex: 1050,
				padding: "1rem",
			}}
		>
			<div
				className="sanpin-modal-container"
				onClick={(e) => e.stopPropagation()}
				style={{
					background: "var(--paper, #ffffff)",
					color: "var(--ink, #0f172a)",
					borderRadius: "16px",
					width: "100%",
					maxWidth: "1380px",
					maxHeight: "92vh",
					display: "flex",
					flexDirection: "column",
					boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.35)",
					overflow: "hidden",
					border: "1px solid var(--border, #e2e8f0)",
				}}
			>
				{/* Modal Header */}
				<div
					className="sanpin-modal-header"
					style={{
						padding: "1rem 1.5rem",
						display: "flex",
						alignItems: "center",
						justifyContent: "space-between",
						borderBottom: "1px solid var(--border, #e2e8f0)",
						background: "var(--paper-alt, #f8fafc)",
					}}
				>
					<div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
						<div
							style={{
								width: "40px",
								height: "40px",
								borderRadius: "10px",
								background: "linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)",
								display: "flex",
								alignItems: "center",
								justifyContent: "center",
								color: "#ffffff",
								boxShadow: "0 4px 12px rgba(37, 99, 235, 0.25)",
							}}
						>
							<Sparkles size={22} />
						</div>
						<div>
							<h3
								style={{
									margin: 0,
									fontSize: "1.15rem",
									fontWeight: 800,
									display: "flex",
									alignItems: "center",
									gap: "0.5rem",
								}}
							>
								Пакетное закрытие журналов СанПиН
								<span
									style={{
										fontSize: "0.75rem",
										fontWeight: 700,
										padding: "0.15rem 0.5rem",
										borderRadius: "6px",
										background: "rgba(37, 99, 235, 0.1)",
										color: "var(--brand-primary, #2563eb)",
									}}
								>
									3.3686-21
								</span>
							</h3>
							<p style={{ margin: 0, fontSize: "0.8rem", color: "var(--muted, #64748b)" }}>
								Автоматическое ретроспективное формирование всех журналов клиники за выбранный период
							</p>
						</div>
					</div>
					<button
						type="button"
						onClick={onClose}
						className="sanpin-btn sanpin-btn-ghost"
						style={{ padding: "0.4rem", borderRadius: "8px", cursor: "pointer" }}
						aria-label="Закрыть"
					>
						<X size={20} />
					</button>
				</div>

				{/* Modal Scrollable Body */}
				<div style={{ flex: 1, overflowY: "auto", padding: "1.25rem 1.5rem" }}>
					<RetroactiveBatchTab
						initialPreset={initialPreset}
						onSuccess={onSuccess}
						onClose={onClose}
						isModal
					/>
				</div>
			</div>
		</div>
	);
}
