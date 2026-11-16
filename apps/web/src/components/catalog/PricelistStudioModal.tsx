/**
 * apps/web/src/components/catalog/PricelistStudioModal.tsx
 *
 * Каноническая студия каталога услуг и прейскуранта DENTE CRM (SSOT).
 * Мандаты: 8b/8zi (Sweet Spot ~250 строк), 8e (автономия врача, 0 disabled кнопок),
 * 8x (живой русский язык без канцелярита и приказов 804н), 8am (ровно 1 Primary CTA), Apple HIG.
 */

import React from "react";
import { createPortal } from "react-dom";
import {
	Package,
	Plus,
	Search,
	Sparkles,
	X,
} from "lucide-react";
import "./pricelistStudio.css";
import {
	CANONICAL_CLINICAL_BUNDLES,
	CANONICAL_CLINICAL_CATEGORIES,
	type PricelistClinicalBundle,
	type PricelistStudioItem,
	formatKopecksToRubles,
	kopecksToRublesExact,
} from "./pricelistCatalogData";
import { PriceItemEditModal } from "../settings/pricesTab/PriceItemEditModal";
import { PricelistStudioHeader } from "./pricelist/PricelistStudioHeader";
import { PricelistStudioTableView } from "./pricelist/PricelistStudioTableView";
import { PricelistStudioMobileView } from "./pricelist/PricelistStudioMobileView";
import {
	usePricelistStudioState,
	type PricelistInputItem,
	type UsePricelistStudioStateOptions,
} from "./pricelist/usePricelistStudioState";

export type { PricelistInputItem };

export interface PricelistStudioModalProps extends UsePricelistStudioStateOptions {
	readonly onClose: () => void;
	readonly adminSecret?: string | undefined;
}

export type ServicePriceListStudioModalProps = PricelistStudioModalProps;
export type ServicePricelistManagerModalProps = PricelistStudioModalProps;

export const PricelistStudioModal: React.FC<PricelistStudioModalProps> = ({
	isOpen,
	onClose,
	initialItems,
	onSaveCatalog,
	onApplyBundleToVisit,
	onAddServiceToInvoice,
	clinicName = "Стоматологическая клиника «DENTE»",
	clinicAddress,
	clinicPhone,
	clinicLicense,
	chiefDoctorName,
}) => {
	const {
		items,
		selectedCategory,
		setSelectedCategory,
		searchQuery,
		setSearchQuery,
		toastText,
		editingPriceId,
		setEditingPriceId,
		inlinePriceInput,
		setInlinePriceInput,
		isDrawerOpen,
		setIsDrawerOpen,
		editingItem,
		formCode,
		setFormCode,
		formTitle,
		setFormTitle,
		formCategory,
		setFormCategory,
		formPriceRub,
		setFormPriceRub,
		formCostRub,
		setFormCostRub,
		formDuration,
		setFormDuration,
		fileInputRef,
		filteredItems,
		stats,
		handleOpenCreate,
		handleOpenEdit,
		handleSaveForm,
		handleInlinePriceSave,
		handleToggleActive,
		handleApplyQuickBundle,
		handleExportCsv,
		handleImportFileChange,
		handlePrintA4,
	} = usePricelistStudioState({
		isOpen,
		initialItems,
		onSaveCatalog,
		onApplyBundleToVisit,
		onAddServiceToInvoice,
		clinicName,
		clinicAddress,
		clinicPhone,
		clinicLicense,
		chiefDoctorName,
	});

	if (!isOpen) return null;

	const modalContent = (
		<div
			className="pricelist-studio-overlay"
			role="dialog"
			aria-modal="true"
			data-testid="service-pricelist-studio-modal"
		>
			<div className="pricelist-studio-modal">
				<div className="pricelist-drag-handle sm:hidden" />
				<PricelistStudioHeader
					clinicName={clinicName}
					activeItems={stats.activeItems}
					avgMarginPercent={stats.avgMarginPercent}
					fileInputRef={fileInputRef}
					onImportFileChange={handleImportFileChange}
					onPrintA4={handlePrintA4}
					onExportCsv={handleExportCsv}
					onOpenCreate={handleOpenCreate}
					onClose={onClose}
				/>

				{/* Лента готовых клинических комплексов (Мандаты 8e, 8n, 8zg) */}
				<div className="pricelist-quick-bundles-strip">
					<div className="pricelist-quick-bundles-title">
						<Sparkles size={14} className="text-current" />
						<span>Готовые комплексы:</span>
					</div>
					<div className="pricelist-quick-bundles-scroll">
						{CANONICAL_CLINICAL_BUNDLES.map((bundle: PricelistClinicalBundle) => (
							<button
								key={bundle.id}
								type="button"
								className="pricelist-quick-bundle-chip dente-btn-pill"
								onClick={() => handleApplyQuickBundle(bundle)}
								title={`${bundle.description} · Нажмите для добавления`}
							>
								<Package size={13} className="text-current shrink-0" />
								<span className="font-medium">{bundle.shortTitle}</span>
								<span className="pricelist-quick-bundle-price">
									{formatKopecksToRubles(bundle.priceKopecks)}
								</span>
							</button>
						))}
					</div>
				</div>

				{/* Тулбар поиска */}
				<div className="pricelist-studio-toolbar">
					<div className="pricelist-search-wrapper">
						<Search size={16} className="pricelist-search-icon" />
						<input
							type="text"
							className="pricelist-search-input"
							placeholder="Поиск по названию, коду или процедуре..."
							value={searchQuery}
							onChange={(e) => setSearchQuery(e.target.value)}
						/>
						{searchQuery && (
							<button
								type="button"
								className="pricelist-search-clear"
								onClick={() => setSearchQuery("")}
								aria-label="Очистить поиск"
							>
								<X size={14} />
							</button>
						)}
					</div>
					<div className="pricelist-toolbar-stats text-xs text-[var(--muted)]">
						Найдено: <strong>{filteredItems.length}</strong> из {items.length}
					</div>
				</div>

				{/* Мобильная лента категорий */}
				<div className="pricelist-mobile-chips-bar">
					<button
						type="button"
						className={`pricelist-chip-btn ${selectedCategory === "all" ? "active" : ""}`}
						onClick={() => setSelectedCategory("all")}
					>
						Все ({items.length})
					</button>
					{CANONICAL_CLINICAL_CATEGORIES.map((cat) => (
						<button
							key={cat.key}
							type="button"
							className={`pricelist-chip-btn ${selectedCategory === cat.key ? "active" : ""}`}
							onClick={() => setSelectedCategory(cat.key)}
						>
							{cat.shortTitle} ({items.filter((i) => i.category === cat.key).length})
						</button>
					))}
				</div>

				{/* Рабочая область: Сайдбар + Таблица */}
				<div className="pricelist-studio-body">
					<aside className="pricelist-categories-sidebar">
						<button
							type="button"
							className={`pricelist-category-item ${selectedCategory === "all" ? "active" : ""}`}
							onClick={() => setSelectedCategory("all")}
						>
							<span>Все категории</span>
							<span className="pricelist-category-count">{items.length}</span>
						</button>
						{CANONICAL_CLINICAL_CATEGORIES.map((cat) => (
							<button
								key={cat.key}
								type="button"
								className={`pricelist-category-item ${selectedCategory === cat.key ? "active" : ""}`}
								onClick={() => setSelectedCategory(cat.key)}
							>
								<span>{cat.title}</span>
								<span className="pricelist-category-count">
									{items.filter((i) => i.category === cat.key).length}
								</span>
							</button>
						))}
					</aside>

					<main className="pricelist-items-container">
						<PricelistStudioTableView
							items={filteredItems}
							searchQuery={searchQuery}
							editingPriceId={editingPriceId}
							inlinePriceInput={inlinePriceInput}
							onStartEditPrice={(item) => {
								setEditingPriceId(item.id);
								setInlinePriceInput(kopecksToRublesExact(item.priceKopecks));
							}}
							onInlinePriceInputChange={setInlinePriceInput}
							onInlinePriceSave={handleInlinePriceSave}
							onCancelEditPrice={() => setEditingPriceId(null)}
							onOpenEdit={handleOpenEdit}
							onToggleActive={handleToggleActive}
						/>

						<PricelistStudioMobileView
							items={filteredItems}
							searchQuery={searchQuery}
							onOpenEdit={handleOpenEdit}
							onToggleActive={handleToggleActive}
						/>
					</main>
				</div>

				{/* Плавающая нижняя панель на мобильном (Thumb Zone, Мандат Apple HIG) */}
				<div className="pricelist-floating-bottom-bar sm:hidden">
					<button
						type="button"
						className="pricelist-btn pricelist-btn-primary"
						style={{ width: "100%", height: "48px", minHeight: "48px", fontSize: "0.9375rem" }}
						onClick={handleOpenCreate}
					>
						<Plus size={18} />
						<span>Добавить услугу</span>
					</button>
				</div>

				{toastText && (
					<div
						style={{
							position: "absolute",
							bottom: "1rem",
							left: "50%",
							transform: "translateX(-50%)",
							background: "var(--ink)",
							color: "var(--paper)",
							padding: "0.5rem 1rem",
							borderRadius: "9999px",
							fontSize: "0.8125rem",
							fontWeight: 500,
							boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.3)",
							zIndex: 100,
						}}
					>
						{toastText}
					</div>
				)}
			</div>

			<PriceItemEditModal
				isOpen={isDrawerOpen}
				editingItem={editingItem}
				formCode={formCode}
				formTitle={formTitle}
				formCategory={formCategory}
				formPriceRub={formPriceRub}
				formCostRub={formCostRub}
				formDuration={formDuration}
				onCodeChange={setFormCode}
				onTitleChange={setFormTitle}
				onCategoryChange={setFormCategory}
				onPriceChange={setFormPriceRub}
				onCostChange={setFormCostRub}
				onDurationChange={setFormDuration}
				onClose={() => setIsDrawerOpen(false)}
				onSubmit={handleSaveForm}
			/>
		</div>
	);

	return typeof document !== "undefined" ? createPortal(modalContent, document.body) : modalContent;
};

export const ServicePriceListStudioModal = PricelistStudioModal;
export const ServicePricelistManagerModal = PricelistStudioModal;

export default PricelistStudioModal;
