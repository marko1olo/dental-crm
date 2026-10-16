import React from "react";
import { CheckCircle2, ShieldCheck, X } from "lucide-react";
import { showToast } from "../../GlobalToast";

export interface SanPinScannerModalProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly onAttachPouchToVisit?: ((pouchCode: string, snippet: string) => void) | undefined;
}

export const SanPinScannerModal: React.FC<SanPinScannerModalProps> = ({
	isOpen,
	onClose,
	onAttachPouchToVisit,
}) => {
	if (!isOpen) return null;

	const handleAttach = () => {
		if (onAttachPouchToVisit) {
			onAttachPouchToVisit(
				"BATCH-AUTO-134",
				"Стерильный лоток (134°C, 5 мин, 5 класс, СанПиН 3.3686-21)",
			);
		}
		showToast("Стерильная партия лотков успешно прикреплена к приёму", "success");
		onClose();
	};

	return (
		<div
			style={{
				position: "fixed",
				inset: 0,
				background: "rgba(15, 23, 42, 0.6)",
				backdropFilter: "blur(4px)",
				display: "flex",
				alignItems: "center",
				justifyContent: "center",
				zIndex: 9999,
				padding: 16,
			}}
			onClick={onClose}
		>
			<div
				style={{
					background: "var(--paper, #fff)",
					borderRadius: 14,
					width: "100%",
					maxWidth: 480,
					padding: 24,
					boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.2)",
					position: "relative",
					border: "1px solid var(--line, #e2e8f0)",
				}}
				onClick={(e) => e.stopPropagation()}
			>
				<div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
					<div style={{ display: "flex", alignItems: "center", gap: 10 }}>
						<div
							style={{
								width: 36,
								height: 36,
								borderRadius: 8,
								background: "rgba(13, 148, 136, 0.12)",
								color: "var(--teal, #0d9488)",
								display: "flex",
								alignItems: "center",
								justifyContent: "center",
							}}
						>
							<ShieldCheck size={20} />
						</div>
						<h3 style={{ fontSize: "1.0625rem", fontWeight: 700, margin: 0, color: "var(--ink, #0f172a)" }}>
							Подтверждение стерильности партии лотков
						</h3>
					</div>
					<button
						type="button"
						onClick={onClose}
						style={{
							background: "transparent",
							border: "none",
							cursor: "pointer",
							color: "var(--muted, #64748b)",
							padding: 4,
							display: "flex",
							alignItems: "center",
							justifyContent: "center",
						}}
						aria-label="Закрыть"
					>
						<X size={18} />
					</button>
				</div>

				<p style={{ fontSize: "0.875rem", color: "var(--muted, #64748b)", lineHeight: 1.5, marginBottom: 16 }}>
					Согласно СанПиН 3.3686-21, инструменты из партии автоклава считаются стерильными по умолчанию
					при соблюдении параметров цикла (134°C, 2.15 бар, 5 мин) и норме химических индикаторов 4–5 классов.
					Поштучное сканирование каждого крафт-пакета не требуется.
				</p>

				<div
					style={{
						background: "var(--paper-soft, #f8fafc)",
						border: "1px solid var(--line-subtle, #f1f5f9)",
						borderRadius: 8,
						padding: "12px 14px",
						marginBottom: 20,
						fontSize: "0.8125rem",
						display: "flex",
						flexDirection: "column",
						gap: 6,
					}}
				>
					<div style={{ display: "flex", justifyContent: "space-between" }}>
						<span style={{ color: "var(--muted, #64748b)" }}>Партия:</span>
						<span style={{ fontWeight: 600, color: "var(--ink, #0f172a)" }}>Смена ЦСО (АК-01)</span>
					</div>
					<div style={{ display: "flex", justifyContent: "space-between" }}>
						<span style={{ color: "var(--muted, #64748b)" }}>Режим цикла:</span>
						<span style={{ fontWeight: 600, color: "var(--ink, #0f172a)" }}>134°C / 2.15 бар / 5 мин (Режим B)</span>
					</div>
					<div style={{ display: "flex", justifyContent: "space-between" }}>
						<span style={{ color: "var(--muted, #64748b)" }}>Химический контроль:</span>
						<span style={{ fontWeight: 600, color: "var(--teal, #0d9488)" }}>5 класс — Норма (коричневый)</span>
					</div>
					<div style={{ display: "flex", justifyContent: "space-between" }}>
						<span style={{ color: "var(--muted, #64748b)" }}>Предстерилизационная очистка:</span>
						<span style={{ fontWeight: 600, color: "var(--teal, #0d9488)" }}>Азопирам отрицательно</span>
					</div>
				</div>

				<div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
					<button
						type="button"
						className="secondary-button sanpin-btn sanpin-btn-secondary"
						onClick={onClose}
						style={{ minHeight: 44, padding: "0 16px", fontSize: "0.875rem" }}
					>
						Отмена
					</button>
					<button
						type="button"
						className="primary-button sanpin-btn sanpin-btn-primary"
						onClick={handleAttach}
						data-testid="attach-batch-btn"
						style={{ minHeight: 44, padding: "0 20px", fontSize: "0.875rem", display: "inline-flex", alignItems: "center", gap: 8 }}
					>
						<CheckCircle2 size={16} />
						<span>Прикрепить партию лотков к приёму</span>
					</button>
				</div>
			</div>
		</div>
	);
};
