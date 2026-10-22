import { X } from "lucide-react";
import React, { useMemo, useState } from "react";
import { MobileStudiesDrawerFooter } from "./MobileStudiesDrawerFooter.js";
import { MobileStudiesListItems } from "./MobileStudiesListItems.js";
import type { MobileStudiesDrawerProps } from "./types.js";

export * from "./MobileStudiesDrawerFooter.js";

const FILTER_KINDS = [
	{ id: "all", label: "Все" },
	{ id: "periapical", label: "Прицельные" },
	{ id: "opg", label: "ОПТГ" },
	{ id: "cbct", label: "КТ 3D" },
];

export const MobileStudiesDrawer: React.FC<MobileStudiesDrawerProps> = ({
	isOpen,
	onClose,
	studies = [],
	selectedStudyId,
	activePatient,
	imagingKindLabels = {},
	onSelectStudy,
	onCaptureCamera,
	onPickFiles,
	triggerHaptic,
}) => {
	const [filter, setFilter] = useState<string>("all");
	const filtered = useMemo(
		() =>
			filter === "all" ? studies : studies.filter((s) => s.kind === filter),
		[studies, filter],
	);

	if (!isOpen) return null;

	return (
		<div
			className="mobile-radiology-drawer-overlay"
			data-testid="mobile-studies-drawer-overlay"
		>
			<button
				type="button"
				className="absolute inset-0 w-full h-full bg-transparent border-0 cursor-default"
				onClick={onClose}
				aria-label="Закрыть шторку"
			/>
			<div
				role="dialog"
				aria-modal="true"
				aria-label="Снимки пациента"
				tabIndex={-1}
				className="mobile-radiology-drawer"
				data-testid="mobile-studies-drawer"
			>
				<div className="mobile-radiology-drag-handle" />
				<div className="mobile-radiology-drawer-header">
					<div>
						<h3 className="text-base font-bold text-[var(--ink)]">
							Снимки пациента ({studies.length})
						</h3>
						<p className="text-xs text-[var(--muted)] truncate max-w-[260px]">
							{activePatient?.fullName || "Пациент не выбран"}
						</p>
					</div>
					<button
						type="button"
						onClick={onClose}
						className="w-11 h-11 rounded-full flex items-center justify-center bg-[var(--paper-soft)] text-[var(--muted)] hover:text-[var(--ink)] active:scale-95 transition-transform cursor-pointer shrink-0"
						aria-label="Закрыть шторку"
					>
						<X size={20} />
					</button>
				</div>

				<div className="px-4 py-2 flex items-center gap-2 overflow-x-auto scrollbar-none border-b border-[var(--line-subtle)]">
					{FILTER_KINDS.map((k) => (
						<button
							key={k.id}
							type="button"
							onClick={() => setFilter(k.id)}
							className={`mobile-radiology-filter-chip ${filter === k.id ? "active" : ""}`}
						>
							{k.id === "all" ? `Все (${studies.length})` : k.label}
						</button>
					))}
				</div>

				<div className="mobile-radiology-drawer-body">
					<MobileStudiesListItems
						studies={filtered}
						selectedStudyId={selectedStudyId}
						imagingKindLabels={imagingKindLabels}
						onSelectStudy={onSelectStudy}
						onClose={onClose}
						triggerHaptic={triggerHaptic}
					/>
				</div>

				<MobileStudiesDrawerFooter
					onClose={onClose}
					onCaptureCamera={onCaptureCamera}
					onPickFiles={onPickFiles}
				/>
			</div>
		</div>
	);
};
