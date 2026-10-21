import { X } from "lucide-react";
import type React from "react";
import type {
	ExistingCatalogReference,
	IngestedMappingItem,
} from "./itemTypes";

export interface PriceDiffRowLinkDrawerProps {
	readonly item: IngestedMappingItem;
	readonly existingCatalog: readonly ExistingCatalogReference[];
	readonly onLinkExisting: (targetServiceId: string) => void;
	readonly onCancelLinking: () => void;
	readonly formatPrice: (rub: number) => string;
}

export const PriceDiffRowLinkDrawer: React.FC<PriceDiffRowLinkDrawerProps> = ({
	item,
	existingCatalog,
	onLinkExisting,
	onCancelLinking,
	formatPrice,
}) => {
	return (
		<div className="pricelist-diff-link-drawer">
			{existingCatalog.length > 0 ? (
				<select
					className="pricelist-diff-link-select"
					defaultValue={item.matchedExistingServiceId ?? ""}
					onChange={(e) => {
						if (e.target.value) {
							onLinkExisting(e.target.value);
						}
					}}
				>
					<option value="">Выберите существующую услугу клиники...</option>
					{existingCatalog.map((catItem) => (
						<option key={catItem.id} value={catItem.id}>
							{catItem.code ? `[${catItem.code}] ` : ""}
							{catItem.title} ({formatPrice(catItem.basePriceRub ?? 0)})
						</option>
					))}
				</select>
			) : (
				<div style={{ fontSize: "0.75rem", color: "var(--muted)", flex: 1 }}>
					В каталоге клиники пока нет сохранённых услуг. Будет создана как
					новая.
				</div>
			)}
			<button
				type="button"
				className="pricelist-diff-icon-btn"
				onClick={onCancelLinking}
				title="Отмена"
			>
				<X size={12} />
			</button>
		</div>
	);
};
