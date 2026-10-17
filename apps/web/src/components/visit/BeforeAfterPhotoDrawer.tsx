/**
 * BeforeAfterPhotoDrawer.tsx
 * Drawer for selecting photos for Before & After wiper comparison.
 */

import React from "react";
import type { BeforeAfterSplitterPhotoItem } from "./beforeAfterTypes.js";

interface BeforeAfterPhotoDrawerProps {
	photos: readonly BeforeAfterSplitterPhotoItem[];
	activeBeforeUrl: string;
	activeAfterUrl: string;
	onSelectBefore: (url: string) => void;
	onSelectAfter: (url: string) => void;
}

export const BeforeAfterPhotoDrawer: React.FC<BeforeAfterPhotoDrawerProps> = ({
	photos,
	activeBeforeUrl,
	activeAfterUrl,
	onSelectBefore,
	onSelectAfter,
}) => {
	return (
		<div className="p-3 bg-[var(--paper-strong)] border-b border-[var(--line)] flex flex-col gap-2 animate-in slide-in-from-top-2 duration-150">
			<div className="text-[11px] text-[var(--muted)] font-medium">Выберите снимок для каждой стороны:</div>
			<div className="flex gap-2 overflow-x-auto pb-1">
				{photos.map((item) => {
					const isBefore = item.url === activeBeforeUrl;
					const isAfter = item.url === activeAfterUrl;
					return (
						<div key={item.id} className="relative shrink-0 flex flex-col items-center gap-1 group">
							<img
								src={item.url}
								alt={item.name || "Снимок"}
								className="w-16 h-16 object-cover rounded-md border border-[var(--line)] shadow-xs"
							/>
							<div className="flex gap-1">
								<button
									type="button"
									onClick={() => onSelectBefore(item.url)}
									className={`text-[10px] px-1.5 py-0.5 rounded font-mono transition-colors ${
										isBefore
											? "bg-[var(--bad-fg)] text-white font-bold"
											: "bg-[var(--paper)] text-[var(--ink)] border border-[var(--line)] hover:bg-[var(--paper-soft)]"
									}`}
									title="Сделать снимком «ДО»"
								>
									ДО
								</button>
								<button
									type="button"
									onClick={() => onSelectAfter(item.url)}
									className={`text-[10px] px-1.5 py-0.5 rounded font-mono transition-colors ${
										isAfter
											? "bg-[var(--ok-fg)] text-white font-bold"
											: "bg-[var(--paper)] text-[var(--ink)] border border-[var(--line)] hover:bg-[var(--paper-soft)]"
									}`}
									title="Сделать снимком «ПОСЛЕ»"
								>
									ПОСЛЕ
								</button>
							</div>
						</div>
					);
				})}
			</div>
		</div>
	);
};
