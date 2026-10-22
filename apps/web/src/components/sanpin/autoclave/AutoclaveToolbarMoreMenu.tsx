import { ChevronDown, FileSpreadsheet, MoreVertical, Plus, Sparkles } from "lucide-react";
import type React from "react";
import { useEffect, useRef, useState } from "react";

export interface AutoclaveToolbarMoreMenuProps {
	readonly onOpenNewCycleModal?: (() => void) | undefined;
	readonly onGenerateMonthlyForm257: () => void;
	readonly onOpenJournal257Modal: () => void;
}

export const AutoclaveToolbarMoreMenu: React.FC<AutoclaveToolbarMoreMenuProps> = ({
	onOpenNewCycleModal,
	onGenerateMonthlyForm257,
	onOpenJournal257Modal,
}) => {
	const [isOpen, setIsOpen] = useState(false);
	const menuRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		const handleClickOutside = (event: MouseEvent) => {
			if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
				setIsOpen(false);
			}
		};
		if (isOpen) document.addEventListener("mousedown", handleClickOutside);
		return () => document.removeEventListener("mousedown", handleClickOutside);
	}, [isOpen]);

	return (
		<div ref={menuRef} className="shrink-0" style={{ position: "relative", display: "inline-block", zIndex: 60 }}>
			<button
				type="button"
				onClick={() => setIsOpen((prev) => !prev)}
				className="sanpin-btn sanpin-btn-secondary touch-manipulation shrink-0 whitespace-nowrap"
				style={{
					minHeight: "32px", minWidth: "32px", height: "32px", padding: "0.25rem 0.45rem",
					fontSize: "0.8125rem", fontWeight: 600, display: "inline-flex", alignItems: "center",
					justifyContent: "center", gap: "0.25rem", borderRadius: "8px", flexShrink: 0,
				}}
				aria-expanded={isOpen}
				title="Дополнительные операции: журнал работы стерилизаторов (автоклавов), крафт-пакеты"
				data-testid="autoclave-more-options-btn"
			>
				<MoreVertical size={14} color="var(--brand-primary, #2563eb)" />
				<ChevronDown size={11} style={{ transform: isOpen ? "rotate(180deg)" : "none", transition: "transform 0.15s ease" }} />
			</button>

			{isOpen && (
				<div
					style={{
						position: "absolute", right: 0, top: "calc(100% + 4px)", minWidth: "260px",
						background: "var(--paper-strong, #ffffff)", border: "1px solid var(--line, #e2e8f0)",
						borderRadius: "8px", boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.25), 0 8px 10px -6px rgba(0, 0, 0, 0.15)",
						zIndex: 1000, padding: "0.35rem", display: "flex", flexDirection: "column", gap: "0.2rem",
					}}
				>
					{onOpenNewCycleModal && (
						<button
							type="button"
							onClick={() => { setIsOpen(false); onOpenNewCycleModal(); }}
							className="sanpin-dropdown-item flex items-center gap-2 p-2 rounded w-full text-left text-xs font-semibold text-ink cursor-pointer bg-transparent border-0"
							data-testid="open-new-cycle-modal-btn"
						>
							<Plus size={15} color="#0284c7" />
							<span>Внести цикл (параметры, КТ-1..5)</span>
						</button>
					)}

					<button
						type="button"
						onClick={() => { setIsOpen(false); onGenerateMonthlyForm257(); }}
						className="sanpin-dropdown-item flex items-center gap-2 p-2 rounded w-full text-left text-xs font-semibold text-ink cursor-pointer bg-transparent border-0"
						data-testid="generate-monthly-form257-btn"
					>
						<Sparkles size={15} color="#0d9488" />
						<span>Журнал автоклавирования за месяц</span>
					</button>

					<button
						type="button"
						onClick={() => { setIsOpen(false); onOpenJournal257Modal(); }}
						className="sanpin-dropdown-item flex items-center gap-2 p-2 rounded w-full text-left text-xs font-semibold text-ink cursor-pointer bg-transparent border-0"
						data-testid="open-journal-257-studio-btn"
					>
						<FileSpreadsheet size={15} color="#059669" />
						<span>Журнал автоклавирования</span>
					</button>
				</div>
			)}
		</div>
	);
};
