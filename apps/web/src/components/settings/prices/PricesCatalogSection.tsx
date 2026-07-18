import { Edit3, FolderTree, Plus, ReceiptText, Search, Trash2 } from "lucide-react";

export function PricesCatalogSection({
	searchQuery,
	setSearchQuery,
	groupedCatalog,
	serviceCategoryLabels,
	specialtyLabels,
	setEditServiceForm,
	setEditServiceId,
	handleDeleteService,
	NEW_SERVICE_TEMPLATE,
}: {
	searchQuery: string;
	setSearchQuery: (q: string) => void;
	groupedCatalog: Record<string, any[]>;
	serviceCategoryLabels: Record<string, string>;
	specialtyLabels: Record<string, string>;
	setEditServiceForm: (form: any) => void;
	setEditServiceId: (id: string) => void;
	handleDeleteService: (id: string) => void;
	NEW_SERVICE_TEMPLATE: any;
}) {
	return (
		<section className="pricelist-section-card">
			<div className="pricelist-section-header">
				<div
					className="pricelist-section-icon"
					style={{
						background: "rgba(59, 130, 246, 0.1)",
						color: "var(--blue)",
					}}
				>
					<ReceiptText size={24} />
				</div>
				<div className="pricelist-section-title">
					<h3>Управление Прайс-листом</h3>
					<p>Ручное добавление, удаление и редактирование услуг клиники</p>
				</div>
				<div className="pricelist-header-actions">
					<div className="pricelist-search-wrapper">
						<Search size={16} />
						<input
							type="text"
							placeholder="Поиск по названию или коду..."
							value={searchQuery}
							onChange={(e) => setSearchQuery(e.target.value)}
						/>
					</div>
					<button
						className="primary-button"
						onClick={() => {
							setEditServiceForm(NEW_SERVICE_TEMPLATE);
							setEditServiceId("new");
						}}
					>
						<Plus size={18} /> Добавить услугу
					</button>
				</div>
			</div>

			<div className="catalog-groups">
				{Object.entries(groupedCatalog).map(([category, items]) => (
					<div key={category} className="catalog-group">
						<h4 className="catalog-group-title">
							{serviceCategoryLabels[category] || category}
							<span className="catalog-group-count">{items.length}</span>
						</h4>
						<div className="catalog-items-grid">
							{items.map((item) => (
								<div className="catalog-item-card" key={item.id}>
									<div className="catalog-item-info">
										<div className="catalog-item-code">
											{item.code || "Без кода"}
										</div>
										<div className="catalog-item-title">{item.title}</div>
										<div className="catalog-item-badges">
											<span>{specialtyLabels[item.specialty]}</span>
											{item.taxDeductible && (
												<span className="badge-tax">Вычет</span>
											)}
											{!item.isActive && (
												<span className="badge-inactive">Архив</span>
											)}
										</div>
									</div>
									<div className="catalog-item-actions">
										<div className="catalog-item-price">
											{(
												item.priceRub ||
												item.basePriceRub ||
												0
											).toLocaleString("ru-RU")}{" "}
											₽<small>{item.durationMinutes} мин.</small>
										</div>
										<button
											className="icon-button"
											onClick={() => {
												setEditServiceForm({
													title: item.title,
													code: item.code || "",
													category: item.category,
													specialty: item.specialty,
													basePriceRub:
														item.basePriceRub || item.priceRub || 0,
													durationMinutes: item.durationMinutes || 30,
													taxDeductible: item.taxDeductible,
													active: item.isActive,
												});
												setEditServiceId(item.id);
											}}
										>
											<Edit3 size={16} />
										</button>
										<button
											className="icon-button danger"
											onClick={() => handleDeleteService(item.id)}
										>
											<Trash2 size={16} />
										</button>
									</div>
								</div>
							))}
						</div>
					</div>
				))}
				{Object.keys(groupedCatalog).length === 0 && (
					<div className="empty-catalog-state">
						<FolderTree size={48} color="var(--border)" />
						<p>Ничего не найдено</p>
					</div>
				)}
			</div>
		</section>
	);
}
