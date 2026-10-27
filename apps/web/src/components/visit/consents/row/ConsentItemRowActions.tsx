import React from "react";
import { Check, RotateCcw, Printer, Eye, EyeOff, MoreVertical, FileText, Tablet, History } from "lucide-react";
import { showToast } from "../../../GlobalToast";
import type { ConsentItemRowProps } from "./types";

type ConsentItemRowActionsProps = Pick<
	ConsentItemRowProps,
	"item" | "isExpanded" | "onToggleExpand" | "onTogglePaperSigned" | "onPrintSingleFilled" |
	"onPrintSingleBlank" | "onOpenTabletModal" | "isDropdownOpen" | "onToggleDropdown" | "onCloseDropdown"
>;

export function ConsentItemRowActions({
	item, isExpanded, onToggleExpand, onTogglePaperSigned, onPrintSingleFilled,
	onPrintSingleBlank, onOpenTabletModal, isDropdownOpen, onToggleDropdown, onCloseDropdown,
}: ConsentItemRowActionsProps) {
	const isSigned = item.status === "signed";

	return (
		<div className="vct-card-actions">
			<button
				type="button"
				onClick={onTogglePaperSigned}
				className={`vct-btn ${isSigned ? "vct-btn-secondary" : "vct-btn-success"}`}
				title={isSigned ? "Снять отметку о подписи" : "Отметка: пациент подписал согласие на бумаге"}
			>
				{isSigned ? <><RotateCcw size={13} /><span>Изменить</span></> : <><Check size={14} /><span>Отметить подписанным</span></>}
			</button>

			<button
				type="button"
				onClick={onPrintSingleFilled}
				className="vct-btn vct-btn-secondary"
				data-testid={item.key === "CONSENT_INSPECTION_1051N" ? "btn-visit-fast-print-consent-1051n" : undefined}
				title="Распечатать предварительно заполненный бланк согласия (А4)"
			>
				<Printer size={13} />
				<span>Печать бланка</span>
			</button>

			<button
				type="button"
				onClick={onToggleExpand}
				className={`vct-btn ${isExpanded ? "vct-btn-outline-teal" : "vct-btn-secondary"}`}
				title={isExpanded ? "Скрыть текст согласия" : "Раскрыть текст согласия для ознакомления"}
			>
				{isExpanded ? <EyeOff size={13} /> : <Eye size={13} />}
				<span>{isExpanded ? "Скрыть" : "Быстрый просмотр"}</span>
			</button>

			<div className="vct-dropdown-wrapper">
				<button
					type="button"
					onClick={onToggleDropdown}
					className={`vct-btn-icon ${isDropdownOpen ? "active" : ""}`}
					title="Дополнительные действия"
					aria-label="Дополнительные действия"
					aria-expanded={isDropdownOpen}
				>
					<MoreVertical size={15} />
				</button>

				{isDropdownOpen && (
					<div className="vct-dropdown-menu" role="menu">
						<button
							type="button"
							className="vct-dropdown-item"
							role="menuitem"
							onClick={() => { onCloseDropdown(); onPrintSingleBlank(); }}
						>
							<FileText size={14} style={{ color: "var(--muted)" }} />
							<span>Чистый бланк со строками</span>
						</button>
						<button
							type="button"
							className="vct-dropdown-item"
							role="menuitem"
							onClick={() => { onCloseDropdown(); onOpenTabletModal?.(); }}
						>
							<Tablet size={14} style={{ color: "var(--teal)" }} />
							<span>Подпись на экране (если есть планшет)</span>
						</button>
						<div className="vct-dropdown-divider" />
						<button
							type="button"
							className="vct-dropdown-item"
							role="menuitem"
							onClick={() => {
								onCloseDropdown();
								if (item.record?.integrityHash) {
									showToast(`SHA-256: ${item.record.integrityHash}`, "info");
								} else {
									showToast(`Согласие «${item.title}» ожидает оформления`, "info");
								}
							}}
						>
							<History size={14} style={{ color: "var(--muted)" }} />
							<span>История и целостность</span>
						</button>
					</div>
				)}
			</div>
		</div>
	);
}
