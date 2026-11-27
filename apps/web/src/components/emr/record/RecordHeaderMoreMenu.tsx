import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Check, Copy, Download, MoreHorizontal } from "lucide-react";

export interface RecordHeaderMoreMenuProps {
	readonly copiedToast: boolean;
	readonly onExportXml: () => void;
	readonly onExportJson: () => void;
	readonly onCopyText: () => void;
}

/**
 * Portal dropdown menu for secondary EMR actions so horizontal-scroll headers never clip items.
 */
export const RecordHeaderMoreMenu: React.FC<RecordHeaderMoreMenuProps> = React.memo(
	function RecordHeaderMoreMenu({ copiedToast, onExportXml, onExportJson, onCopyText }) {
		const [isOpen, setIsOpen] = useState(false);
		const [menuPos, setMenuPos] = useState<{ top: number; right: number }>({ top: 56, right: 16 });
		const containerRef = useRef<HTMLDivElement>(null);
		const buttonRef = useRef<HTMLButtonElement>(null);
		const dropdownRef = useRef<HTMLDivElement>(null);

		useEffect(() => {
			if (!isOpen) return;
			const handleClickOutside = (e: MouseEvent) => {
				const target = e.target as Node;
				if (!containerRef.current?.contains(target) && !dropdownRef.current?.contains(target)) {
					setIsOpen(false);
				}
			};
			const handleEscape = (e: KeyboardEvent) => {
				if (e.key === "Escape") {
					e.stopPropagation();
					setIsOpen(false);
				}
			};
			const handleResize = () => setIsOpen(false);
			document.addEventListener("mousedown", handleClickOutside);
			window.addEventListener("keydown", handleEscape, true);
			window.addEventListener("resize", handleResize);
			return () => {
				document.removeEventListener("mousedown", handleClickOutside);
				window.removeEventListener("keydown", handleEscape, true);
				window.removeEventListener("resize", handleResize);
			};
		}, [isOpen]);

		const handleToggle = () => {
			const rect = buttonRef.current?.getBoundingClientRect();
			if (rect) {
				setMenuPos({
					top: Math.round(rect.bottom + 6),
					right: Math.max(8, Math.round(window.innerWidth - rect.right)),
				});
			}
			setIsOpen((prev) => !prev);
		};

		return (
			<div className="relative inline-flex items-center" ref={containerRef}>
				<button
					ref={buttonRef}
					type="button"
					className="dente-btn dente-btn-secondary emr-studio-btn emr-studio-btn-secondary emr-studio-btn-icon-only"
					onClick={handleToggle}
					aria-expanded={isOpen}
					aria-haspopup="menu"
					title="Дополнительные действия"
					data-testid="btn-emr-more-actions"
				>
					<MoreHorizontal className="w-4 h-4 text-current" />
				</button>
				{isOpen && typeof document !== "undefined" && document.body &&
					createPortal(
						<div
							ref={dropdownRef}
							role="menu"
							data-testid="emr-more-actions-menu"
							style={{ top: `${menuPos.top}px`, right: `${menuPos.right}px` }}
							className="fixed w-56 bg-[var(--paper-strong)] border border-[var(--line)] rounded-lg shadow-xl z-[140] py-1 text-xs text-[var(--ink)] min-w-[210px]"
						>
							<button
								type="button"
								role="menuitem"
								title="Экспорт в XML для электронной медкарты"
								className="w-full text-left px-3 py-2 hover:bg-[var(--paper-soft)] flex items-center gap-2 cursor-pointer"
								onClick={() => {
									onExportXml();
									setIsOpen(false);
								}}
							>
								<Download className="w-3.5 h-3.5 text-current shrink-0" />
								<span>Электронная медкарта (XML)</span>
							</button>
							<button
								type="button"
								role="menuitem"
								className="w-full text-left px-3 py-2 hover:bg-[var(--paper-soft)] flex items-center gap-2 cursor-pointer"
								onClick={() => {
									onExportJson();
									setIsOpen(false);
								}}
							>
								<Download className="w-3.5 h-3.5 text-current shrink-0" />
								<span>Экспорт в JSON</span>
							</button>
							<button
								type="button"
								role="menuitem"
								className="w-full text-left px-3 py-2 hover:bg-[var(--paper-soft)] flex items-center gap-2 cursor-pointer border-t border-[var(--line)]"
								onClick={() => {
									onCopyText();
									setIsOpen(false);
								}}
							>
								{copiedToast ? (
									<Check className="w-3.5 h-3.5 text-[var(--success)] shrink-0" />
								) : (
									<Copy className="w-3.5 h-3.5 text-current shrink-0" />
								)}
								<span>{copiedToast ? "Скопировано!" : "Копировать текст карты"}</span>
							</button>
						</div>,
						document.body,
					)}
			</div>
		);
	},
);
