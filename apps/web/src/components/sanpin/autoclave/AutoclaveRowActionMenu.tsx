import type { SterilizationLogRecord } from "@dental/shared";
import { MoreHorizontal, Printer, QrCode, Tag } from "lucide-react";
import React from "react";

export interface AutoclaveRowActionMenuProps {
	readonly log: SterilizationLogRecord;
	readonly isMenuOpen: boolean;
	readonly onToggleMenu: () => void;
	readonly menuRef?: React.RefObject<HTMLDivElement | null> | undefined;
	readonly onOpenKraftForLog: (log: SterilizationLogRecord) => void;
	readonly onPrintSinglePouch: (log: SterilizationLogRecord) => void;
	readonly onPrintBatchPouches: (log: SterilizationLogRecord, count?: number) => void;
}

const itemBtnStyle: React.CSSProperties = {
	display: "flex",
	alignItems: "center",
	gap: "0.5rem",
	padding: "0.4rem 0.6rem",
	fontSize: "0.75rem",
	textAlign: "left",
	background: "none",
	border: "none",
	borderRadius: "4px",
	cursor: "pointer",
	color: "var(--ink)",
};

export function AutoclaveRowActionMenu({
	log,
	isMenuOpen,
	onToggleMenu,
	menuRef,
	onOpenKraftForLog,
	onPrintSinglePouch,
	onPrintBatchPouches,
}: AutoclaveRowActionMenuProps) {
	return (
		<div style={{ position: "relative" }}>
			<button
				type="button"
				onClick={onToggleMenu}
				className="sanpin-btn sanpin-btn-secondary"
				style={{
					minHeight: "24px",
					height: "24px",
					width: "24px",
					padding: 0,
					cursor: "pointer",
					display: "inline-flex",
					alignItems: "center",
					justifyContent: "center",
					flexShrink: 0,
				}}
				title="Дополнительные действия печати и этикеток"
				aria-label="Опции этикеток"
			>
				<MoreHorizontal size={13} />
			</button>

			{isMenuOpen && (
				<div
					ref={menuRef}
					style={{
						position: "absolute",
						right: 0,
						top: "100%",
						marginTop: "4px",
						zIndex: 40,
						width: "230px",
						background: "var(--paper, #ffffff)",
						border: "1px solid var(--line, #e2e8f0)",
						borderRadius: "8px",
						boxShadow: "0 4px 16px rgba(0, 0, 0, 0.12)",
						padding: "0.3rem",
						display: "flex",
						flexDirection: "column",
						gap: "0.2rem",
					}}
				>
					<button
						type="button"
						onClick={() => onOpenKraftForLog(log)}
						style={itemBtnStyle}
						className="hover:bg-[var(--paper-soft,#f1f5f9)]"
					>
						<QrCode size={13} color="var(--brand-primary)" />
						<span>Партия в студии термоэтикеток</span>
					</button>
					<button
						type="button"
						onClick={() => onPrintSinglePouch(log)}
						style={itemBtnStyle}
						className="hover:bg-[var(--paper-soft,#f1f5f9)]"
					>
						<Tag size={13} />
						<span>Печать 1 этикетки (58x40 мм)</span>
					</button>
					<button
						type="button"
						onClick={() => onPrintBatchPouches(log, 10)}
						style={{ ...itemBtnStyle, color: "var(--teal, #0d9488)", fontWeight: 600 }}
						className="hover:bg-[var(--paper-soft,#f1f5f9)]"
					>
						<Printer size={13} />
						<span>Печать пачки 10 шт (30 дней)</span>
					</button>
				</div>
			)}
		</div>
	);
}
