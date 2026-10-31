/**
 * DENTE Dental CRM — Mapped Service Row Presentation & 1-Click Action Controls
 * Unified SSOT Presentation Module (Mandates 8b, 8zi, 8e, 8am)
 */

import { Check, Link2, Plus, X } from "lucide-react";
import React from "react";
import type {
	ExistingCatalogReference,
	IngestedMappingItem,
	MappingConfidenceKind,
	SuggestedAction,
} from "../types";

/* --- Subcomponent: Confidence & Action Badges --- */

export const PriceDiffRowBadges: React.FC<{
	readonly confidence: number;
	readonly kind: MappingConfidenceKind;
	readonly action: SuggestedAction;
}> = ({ confidence, kind, action }) => {
	const percent = Math.round(confidence * 100);

	const renderConfidenceBadge = () => {
		if (kind === "exact_code") {
			return (
				<span
					className="pricelist-diff-confidence-badge exact"
					title="Точный код классификатора прейскуранта"
				>
					{`${percent}% Код услуги`}
				</span>
			);
		}
		if (confidence >= 0.85 || kind === "high_keyword") {
			return (
				<span
					className="pricelist-diff-confidence-badge high"
					title="Высокая уверенность сопоставления"
				>
					{`${percent}% Высокая`}
				</span>
			);
		}
		if (confidence >= 0.7 || kind === "medium_category") {
			return (
				<span
					className="pricelist-diff-confidence-badge medium"
					title="Средняя уверенность сопоставления"
				>
					{`${percent}% Средняя`}
				</span>
			);
		}
		return (
			<span
				className="pricelist-diff-confidence-badge low"
				title="Низкая уверенность: требуется ручной выбор соответствия"
			>
				{`${percent}% Требует выбора`}
			</span>
		);
	};

	const renderActionBadge = () => {
		switch (action) {
			case "create_new":
				return <span className="pricelist-diff-action-tag create">+ Новая</span>;
			case "update_existing":
				return <span className="pricelist-diff-action-tag update">Обновить цену</span>;
			case "link_existing":
				return <span className="pricelist-diff-action-tag link">Привязана</span>;
			default:
				return null;
		}
	};

	return (
		<>
			{renderConfidenceBadge()}
			{renderActionBadge()}
		</>
	);
};

/* --- Subcomponent: Row Price Column & 1-Click Modifiers --- */

export const PriceDiffRowPriceCol: React.FC<{
	readonly item: IngestedMappingItem;
	readonly editingPriceId: string | null;
	readonly editingPriceBuffer: string;
	readonly onStartEditPrice: () => void;
	readonly onPriceBufferChange: (val: string) => void;
	readonly onCommitPrice: (val: string) => void;
	readonly onCancelEditPrice: () => void;
	readonly onModifyDelta: (deltaRub: number) => void;
	readonly onSetZeroPrice: () => void;
	readonly formatPrice: (rub: number) => string;
}> = ({
	item,
	editingPriceId,
	editingPriceBuffer,
	onStartEditPrice,
	onPriceBufferChange,
	onCommitPrice,
	onCancelEditPrice,
	onModifyDelta,
	onSetZeroPrice,
	formatPrice,
}) => {
	const isWarranty = item.priceRub === 0;
	const isEditingPrice = editingPriceId === item.id;

	return (
		<div className="pricelist-diff-price-col">
			{isEditingPrice ? (
				<div className="pricelist-diff-inline-input-box">
					<input
						type="text"
						inputMode="numeric"
						className="pricelist-diff-price-input"
						autoFocus
						value={editingPriceBuffer}
						onChange={(e) => onPriceBufferChange(e.target.value.replace(/[^\d]/g, ""))}
						onKeyDown={(e) => {
							if (e.key === "Enter") onCommitPrice(editingPriceBuffer);
							else if (e.key === "Escape") onCancelEditPrice();
						}}
						onBlur={() => onCommitPrice(editingPriceBuffer)}
					/>
					<span style={{ fontSize: "0.6875rem", color: "var(--muted)" }}>₽</span>
				</div>
			) : (
				<button
					type="button"
					className={`pricelist-diff-price-btn ${isWarranty ? "warranty" : ""}`}
					onClick={onStartEditPrice}
					title="Кликните для изменения цены вручную"
				>
					<span>{isWarranty ? "0 ₽ (Гарантия)" : formatPrice(item.priceRub)}</span>
				</button>
			)}

			<div className="pricelist-diff-price-modifiers">
				<button
					type="button"
					className="pricelist-diff-delta-btn"
					onClick={() => onModifyDelta(-500)}
					title="Вычесть 500 ₽"
				>
					-500 ₽
				</button>
				<button
					type="button"
					className="pricelist-diff-delta-btn"
					onClick={() => onModifyDelta(-100)}
					title="Вычесть 100 ₽"
				>
					-100 ₽
				</button>
				<button
					type="button"
					className="pricelist-diff-delta-btn"
					onClick={() => onModifyDelta(100)}
					title="Прибавить 100 ₽"
				>
					+100 ₽
				</button>
				<button
					type="button"
					className="pricelist-diff-delta-btn"
					onClick={() => onModifyDelta(500)}
					title="Прибавить 500 ₽"
				>
					+500 ₽
				</button>
				<button
					type="button"
					className={`pricelist-diff-delta-btn warranty ${isWarranty ? "active" : ""}`}
					onClick={onSetZeroPrice}
					title="Установить 0 ₽ (Гарантия / Бесплатно)"
				>
					0 ₽
				</button>
			</div>
		</div>
	);
};

/* --- Subcomponent: Row Actions & Link Drawer --- */

export const PriceDiffRowActions: React.FC<{
	readonly item: IngestedMappingItem;
	readonly isLinking: boolean;
	readonly onSetCreateNew: () => void;
	readonly onStartLinking: () => void;
	readonly onCancelLinking: () => void;
	readonly onToggleApprove: () => void;
}> = ({
	item,
	isLinking,
	onSetCreateNew,
	onStartLinking,
	onCancelLinking,
	onToggleApprove,
}) => {
	return (
		<div className="pricelist-diff-row-actions">
			<button
				type="button"
				className={`pricelist-diff-action-btn ${item.suggestedAction === "create_new" ? "active" : ""}`}
				onClick={onSetCreateNew}
				title="Создать новую услугу в прейскуранте"
			>
				<Plus size={11} />
				<span>Новая</span>
			</button>

			<button
				type="button"
				className={`pricelist-diff-action-btn ${item.suggestedAction === "link_existing" ? "active" : ""}`}
				onClick={isLinking ? onCancelLinking : onStartLinking}
				title="Привязать к существующей позиции каталога"
			>
				<Link2 size={11} />
				<span>Привязать</span>
			</button>

			<button
				type="button"
				className={`pricelist-diff-icon-btn ${item.isApproved ? "approved" : ""}`}
				onClick={onToggleApprove}
				title={
					item.isApproved
						? "Услуга будет загружена (нажмите, чтобы исключить)"
						: "Исключено из загрузки (нажмите, чтобы включить)"
				}
				aria-label={item.isApproved ? "Исключить услугу" : "Включить услугу"}
			>
				<Check size={13} />
			</button>
		</div>
	);
};

export const PriceDiffRowLinkDrawer: React.FC<{
	readonly item: IngestedMappingItem;
	readonly existingCatalog: readonly ExistingCatalogReference[];
	readonly onLinkExisting: (targetServiceId: string) => void;
	readonly onCancelLinking: () => void;
	readonly formatPrice: (rub: number) => string;
}> = ({ item, existingCatalog, onLinkExisting, onCancelLinking, formatPrice }) => {
	return (
		<div className="pricelist-diff-link-drawer">
			{existingCatalog.length > 0 ? (
				<select
					className="pricelist-diff-link-select"
					defaultValue={item.matchedExistingServiceId ?? ""}
					onChange={(e) => {
						if (e.target.value) onLinkExisting(e.target.value);
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
					В каталоге клиники пока нет сохранённых услуг. Будет создана как новая.
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

/* --- Subcomponent: Single Mapped Item Row --- */

export interface PriceDiffItemRowProps {
	readonly item: IngestedMappingItem;
	readonly isLinking: boolean;
	readonly isHovered: boolean;
	readonly editingPriceId: string | null;
	readonly editingPriceBuffer: string;
	readonly existingCatalog: readonly ExistingCatalogReference[];
	readonly onHover: (id: string | null) => void;
	readonly onToggleApprove: () => void;
	readonly onSetCreateNew: () => void;
	readonly onStartLinking: () => void;
	readonly onCancelLinking: () => void;
	readonly onLinkExisting: (targetId: string) => void;
	readonly onStartEditPrice: () => void;
	readonly onPriceBufferChange: (val: string) => void;
	readonly onCommitPrice: (val: string) => void;
	readonly onCancelEditPrice: () => void;
	readonly onModifyDelta: (deltaRub: number) => void;
	readonly onSetZeroPrice: () => void;
	readonly formatPrice: (rub: number) => string;
}

export const PriceDiffItemRow: React.FC<PriceDiffItemRowProps> = ({
	item,
	isLinking,
	isHovered,
	editingPriceId,
	editingPriceBuffer,
	existingCatalog,
	onHover,
	onToggleApprove,
	onSetCreateNew,
	onStartLinking,
	onCancelLinking,
	onLinkExisting,
	onStartEditPrice,
	onPriceBufferChange,
	onCommitPrice,
	onCancelEditPrice,
	onModifyDelta,
	onSetZeroPrice,
	formatPrice,
}) => {
	const isDismissed = !item.isApproved;

	return (
		<div
			className={`pricelist-diff-mapped-row ${isHovered ? "is-hovered" : ""} ${isDismissed ? "is-dismissed" : ""}`}
			onMouseEnter={() => onHover(item.id)}
			onMouseLeave={() => onHover(null)}
			data-testid={`diff-mapped-row-${item.id}`}
		>
			<div className="pricelist-diff-mapped-header">
				<div className="pricelist-diff-badges-wrap">
					<span className="pricelist-diff-statutory-code" title={item.statutoryTitle804n}>
						{item.code804n}
					</span>
					<PriceDiffRowBadges
						confidence={item.confidence}
						kind={item.confidenceKind}
						action={item.suggestedAction}
					/>
				</div>

				<div className="pricelist-diff-mapped-title-block">
					<div className="pricelist-diff-title-row">
						<span className="pricelist-diff-commercial-title" title={item.cleanedTitle}>
							{item.cleanedTitle}
						</span>
					</div>
					<div
						className="pricelist-diff-statutory-title"
						title={`Номенклатура: ${item.statutoryTitle804n}`}
					>
						{`Номенклатура: ${item.statutoryTitle804n}`}
					</div>
				</div>
			</div>

			<PriceDiffRowPriceCol
				item={item}
				editingPriceId={editingPriceId}
				editingPriceBuffer={editingPriceBuffer}
				onStartEditPrice={onStartEditPrice}
				onPriceBufferChange={onPriceBufferChange}
				onCommitPrice={onCommitPrice}
				onCancelEditPrice={onCancelEditPrice}
				onModifyDelta={onModifyDelta}
				onSetZeroPrice={onSetZeroPrice}
				formatPrice={formatPrice}
			/>

			<PriceDiffRowActions
				item={item}
				isLinking={isLinking}
				onSetCreateNew={onSetCreateNew}
				onStartLinking={onStartLinking}
				onCancelLinking={onCancelLinking}
				onToggleApprove={onToggleApprove}
			/>

			{isLinking && (
				<PriceDiffRowLinkDrawer
					item={item}
					existingCatalog={existingCatalog}
					onLinkExisting={onLinkExisting}
					onCancelLinking={onCancelLinking}
					formatPrice={formatPrice}
				/>
			)}
		</div>
	);
};
