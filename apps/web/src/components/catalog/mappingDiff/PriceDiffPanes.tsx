/**
 * DENTE Dental CRM — Dual-Pane Table & Row Presentations for Price Diff View
 * Unified SSOT Presentation Module (Mandates 8b, 8zi)
 */

import { Check, FileText, Link2, Plus, ShieldCheck, X } from "lucide-react";
import React from "react";
import type { RefObject } from "react";
import type {
	ExistingCatalogReference,
	IngestedMappingItem,
	MappingConfidenceKind,
	PriceDiffTableProps,
	SuggestedAction,
} from "./types";

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
					title="Точный код классификатора"
				>
					{`${percent}% Код услуги`}
				</span>
			);
		}
		if (confidence >= 0.85 || kind === "high_keyword") {
			return (
				<span
					className="pricelist-diff-confidence-badge high"
					title="Высокая уверенность сопоставления по клиническим ключевым словам"
				>
					{`${percent}% Высокая`}
				</span>
			);
		}
		if (confidence >= 0.7 || kind === "medium_category") {
			return (
				<span
					className="pricelist-diff-confidence-badge medium"
					title="Средняя уверенность"
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
						onChange={(e) => onPriceBufferChange(e.target.value.replace(/[^\d]/g, "")) }
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

export const PriceDiffItemRow: React.FC<{
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
}> = ({
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
					<span
						className="pricelist-diff-statutory-code"
						title={item.statutoryTitle804n}
					>
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

/* --- Subcomponent: Left & Right Panes --- */

export const PriceDiffLeftPane: React.FC<{
	readonly filteredItems: readonly IngestedMappingItem[];
	readonly hoveredRowId: string | null;
	readonly leftBodyRef: RefObject<HTMLDivElement | null>;
	readonly onLeftScroll: () => void;
	readonly onHoverRow: (id: string | null) => void;
}> = ({ filteredItems, hoveredRowId, leftBodyRef, onLeftScroll, onHoverRow }) => {
	return (
		<section className="pricelist-diff-pane left-pane" aria-label="Исходный прейскурант клиники">
			<header className="pricelist-diff-pane-header">
				<div className="pricelist-diff-pane-title">
					<FileText size={13} style={{ flexShrink: 0 }} />
					<span className="pricelist-diff-pane-title-text">
						1. Исходный прейскурант клиники
					</span>
				</div>
				<span className="pricelist-diff-pane-counter">{`${filteredItems.length} строк`}</span>
			</header>

			<div
				ref={leftBodyRef}
				onScroll={onLeftScroll}
				className="pricelist-diff-pane-body"
				data-testid="diff-pane-left"
			>
				{filteredItems.map((item) => (
					<div
						key={`raw-${item.id}`}
						className={`pricelist-diff-raw-row ${hoveredRowId === item.id ? "is-hovered" : ""}`}
						onMouseEnter={() => onHoverRow(item.id)}
						onMouseLeave={() => onHoverRow(null)}
						data-testid={`diff-raw-row-${item.id}`}
					>
						<span className="pricelist-diff-line-number">{`#${item.sourceLineNumber}`}</span>
						<div className="pricelist-diff-raw-text">{item.rawLine}</div>
					</div>
				))}

				{filteredItems.length === 0 && (
					<div
						style={{
							textAlign: "center",
							padding: "2rem",
							color: "var(--muted)",
							fontSize: "0.8125rem",
						}}
					>
						Нет строк, соответствующих выбранному фильтру
					</div>
				)}
			</div>
		</section>
	);
};

export const PriceDiffRightPane: React.FC<Omit<PriceDiffTableProps, "leftBodyRef" | "onLeftScroll">> = ({
	filteredItems,
	totalApprovedCount,
	totalCount,
	activeLinkRowId,
	hoveredRowId,
	editingRowPriceId,
	editingRowPriceBuffer,
	existingCatalog,
	rightBodyRef,
	onRightScroll,
	onHoverRow,
	onToggleApproveRow,
	onSetCreateNew,
	onSetActiveLinkRowId,
	onSetLinkExisting,
	onStartEditPrice,
	onPriceBufferChange,
	onCommitRowPrice,
	onCancelEditPrice,
	onModifyRowDelta,
	onSetRowZeroPrice,
	formatPrice,
}) => {
	return (
		<section
			className="pricelist-diff-pane right-pane"
			aria-label="Сопоставление со стандартной номенклатурой"
		>
			<header className="pricelist-diff-pane-header">
				<div className="pricelist-diff-pane-title">
					<ShieldCheck size={13} style={{ color: "var(--ok-fg)", flexShrink: 0 }} />
					<span
						className="pricelist-diff-pane-title-text"
						title="2. Сопоставление со стандартной номенклатурой"
					>
						2. Сопоставление со стандартной номенклатурой
					</span>
				</div>
				<span className="pricelist-diff-pane-counter">
					{`Выбрано к загрузке: ${totalApprovedCount} из ${totalCount}`}
				</span>
			</header>

			<div
				ref={rightBodyRef}
				onScroll={onRightScroll}
				className="pricelist-diff-pane-body"
				data-testid="diff-pane-right"
			>
				{filteredItems.map((item) => (
					<PriceDiffItemRow
						key={`mapped-${item.id}`}
						item={item}
						isLinking={activeLinkRowId === item.id}
						isHovered={hoveredRowId === item.id}
						editingPriceId={editingRowPriceId}
						editingPriceBuffer={editingRowPriceBuffer}
						existingCatalog={existingCatalog}
						onHover={onHoverRow}
						onToggleApprove={() => onToggleApproveRow(item.id)}
						onSetCreateNew={() => onSetCreateNew(item.id)}
						onStartLinking={() => onSetActiveLinkRowId(item.id)}
						onCancelLinking={() => onSetActiveLinkRowId(null)}
						onLinkExisting={(targetId) => onSetLinkExisting(item.id, targetId)}
						onStartEditPrice={() => onStartEditPrice(item.id, item.priceRub)}
						onPriceBufferChange={onPriceBufferChange}
						onCommitPrice={(val) => onCommitRowPrice(item.id, val)}
						onCancelEditPrice={onCancelEditPrice}
						onModifyDelta={(delta) => onModifyRowDelta(item.id, delta)}
						onSetZeroPrice={() => onSetRowZeroPrice(item.id)}
						formatPrice={formatPrice}
					/>
				))}

				{filteredItems.length === 0 && (
					<div
						style={{
							textAlign: "center",
							padding: "2rem",
							color: "var(--muted)",
							fontSize: "0.8125rem",
						}}
					>
						Нет позиций для сопоставления
					</div>
				)}
			</div>
		</section>
	);
};

/* --- Composite Master Table --- */

export const PriceDiffTable: React.FC<PriceDiffTableProps> = ({
	filteredItems,
	totalApprovedCount,
	totalCount,
	activeLinkRowId,
	hoveredRowId,
	editingRowPriceId,
	editingRowPriceBuffer,
	existingCatalog,
	leftBodyRef,
	rightBodyRef,
	onLeftScroll,
	onRightScroll,
	onHoverRow,
	onToggleApproveRow,
	onSetCreateNew,
	onSetActiveLinkRowId,
	onSetLinkExisting,
	onStartEditPrice,
	onPriceBufferChange,
	onCommitRowPrice,
	onCancelEditPrice,
	onModifyRowDelta,
	onSetRowZeroPrice,
	formatPrice,
}) => {
	return (
		<div className="pricelist-diff-panes">
			<PriceDiffLeftPane
				filteredItems={filteredItems}
				hoveredRowId={hoveredRowId}
				leftBodyRef={leftBodyRef}
				onLeftScroll={onLeftScroll}
				onHoverRow={onHoverRow}
			/>
			<PriceDiffRightPane
				filteredItems={filteredItems}
				totalApprovedCount={totalApprovedCount}
				totalCount={totalCount}
				activeLinkRowId={activeLinkRowId}
				hoveredRowId={hoveredRowId}
				editingRowPriceId={editingRowPriceId}
				editingRowPriceBuffer={editingRowPriceBuffer}
				existingCatalog={existingCatalog}
				rightBodyRef={rightBodyRef}
				onRightScroll={onRightScroll}
				onHoverRow={onHoverRow}
				onToggleApproveRow={onToggleApproveRow}
				onSetCreateNew={onSetCreateNew}
				onSetActiveLinkRowId={onSetActiveLinkRowId}
				onSetLinkExisting={onSetLinkExisting}
				onStartEditPrice={onStartEditPrice}
				onPriceBufferChange={onPriceBufferChange}
				onCommitRowPrice={onCommitRowPrice}
				onCancelEditPrice={onCancelEditPrice}
				onModifyRowDelta={onModifyRowDelta}
				onSetRowZeroPrice={onSetRowZeroPrice}
				formatPrice={formatPrice}
			/>
		</div>
	);
};
