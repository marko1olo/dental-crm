const fs = require('fs');

const path = 'C:/Clinic_MVP/dental-crm/apps/web/src/components/InventoryView.tsx';
let code = fs.readFileSync(path, 'utf8');

// 1. Add AnimatePresence and motion if missing
if (!code.includes('import { AnimatePresence, motion } from "framer-motion"')) {
    code = code.replace(
        /import type React from "react";/,
        'import type React from "react";\nimport { AnimatePresence, motion } from "framer-motion";'
    );
}

// 2. Add History lucide icon
if (!code.includes('History')) {
    code = code.replace(
        /import \{\n\tAlertTriangle/g,
        'import {\n\tHistory,\n\tAlertTriangle'
    );
}

// 3. Extract new properties from useInventoryLogic
if (!code.includes('itemHistory')) {
    code = code.replace(
        /totalItems,\n\t\} = inventory;/g,
        'totalItems,\n\t\titemHistory,\n\t\tisLoadingHistory,\n\t\tfetchHistory,\n\t\tsetItemHistory\n\t} = inventory;\n\tconst [viewingItemHistory, setViewingItemHistory] = useState<InventoryItem | null>(null);'
    );
}

// 4. Update row click to open history
if (!code.includes('onClick={() => { setViewingItemHistory(item); fetchHistory(item.id); }}')) {
    code = code.replace(
        /<tr\n\t\t\t\t\t\t\t\t\t\t\t\tkey=\{item\.id\}/g,
        `<tr\n\t\t\t\t\t\t\t\t\t\t\t\tkey={item.id}\n\t\t\t\t\t\t\t\t\t\t\t\tonClick={() => { setViewingItemHistory(item); fetchHistory(item.id); }}\n\t\t\t\t\t\t\t\t\t\t\t\tclassName="inventory-row-hover"`
    );
}

// 5. Inject History Drawer at the end of the file, before the closing </div>
if (!code.includes('{/* INVENTORY ITEM DRAWER */}')) {
    const drawerCode = `
			{/* INVENTORY ITEM DRAWER */}
			<AnimatePresence>
				{viewingItemHistory && (
					<div
						style={{
							position: "fixed",
							inset: 0,
							zIndex: 90,
							display: "flex",
							justifyContent: "flex-end",
							background: "rgba(0,0,0,0.3)",
							backdropFilter: "blur(2px)",
						}}
						onClick={(e) => { if (e.target === e.currentTarget) { setViewingItemHistory(null); setItemHistory([]); } }}
					>
						<motion.div
							initial={{ x: "100%" }}
							animate={{ x: 0 }}
							exit={{ x: "100%" }}
							transition={{ type: "spring", damping: 25, stiffness: 200 }}
							style={{
								width: "500px",
								maxWidth: "100%",
								background: "var(--paper)",
								borderLeft: \`1px solid var(--line)\`,
								boxShadow: "-10px 0 30px rgba(0,0,0,0.1)",
								height: "100%",
								display: "flex",
								flexDirection: "column",
								overflow: "hidden"
							}}
						>
							<div style={{ padding: 24, borderBottom: \`1px solid var(--line)\`, display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
								<div>
									<h2 style={{ margin: 0, fontSize: 22, color: "var(--ink)", display: "flex", alignItems: "center", gap: 8 }}>
										{viewingItemHistory.name}
									</h2>
									<div style={{ display: "flex", gap: 12, marginTop: 12 }}>
										<span style={{ fontSize: 14, color: "var(--teal)", fontWeight: 600 }}>
											Остаток: {viewingItemHistory.stockQuantity} шт.
										</span>
										<span style={{ fontSize: 14, color: "var(--muted)" }}>
											Цена: {Number(viewingItemHistory.unitCostRub || 0).toLocaleString("ru-RU")} ₽
										</span>
									</div>
								</div>
								<button onClick={() => { setViewingItemHistory(null); setItemHistory([]); }} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted)" }}>
									<X size={24} />
								</button>
							</div>

							<div style={{ flex: 1, overflowY: "auto", padding: 24, background: "var(--paper-soft)" }}>
								<h3 style={{ margin: "0 0 16px 0", fontSize: 16, color: "var(--ink)", display: "flex", alignItems: "center", gap: 8 }}>
									<History size={18} /> Журнал операций
								</h3>
								
								{isLoadingHistory ? (
									<div style={{ color: "var(--muted)", textAlign: "center", padding: 24 }}>Загрузка истории...</div>
								) : itemHistory.length === 0 ? (
									<div style={{ textAlign: "center", padding: 24, color: "var(--muted)", fontSize: 13, border: \`1px dashed var(--line)\`, borderRadius: 12 }}>
										История операций пуста.
									</div>
								) : (
									<div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
										{itemHistory.map((tx: any) => {
											const isPositive = tx.quantityChanged > 0;
											return (
												<div key={tx.id} style={{ background: "var(--paper)", padding: 16, borderRadius: 12, border: \`1px solid var(--line)\`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
													<div>
														<div style={{ fontSize: 14, color: "var(--ink)", fontWeight: 500 }}>
															{tx.transactionType === "manual_adjust" ? "Ручная корректировка" : "Авто-списание"}
														</div>
														<div style={{ fontSize: 12, color: "var(--muted)", marginTop: 4 }}>
															{new Date(tx.createdAt).toLocaleString("ru-RU")}
														</div>
													</div>
													<div style={{ 
														fontSize: 16, 
														fontWeight: 700, 
														color: isPositive ? "var(--teal)" : "var(--tomato)",
														background: isPositive ? "rgba(20, 184, 166, 0.1)" : "rgba(239, 68, 68, 0.1)",
														padding: "4px 10px",
														borderRadius: 8
													}}>
														{isPositive ? "+" : ""}{tx.quantityChanged} шт.
													</div>
												</div>
											)
										})}
									</div>
								)}
							</div>
							<div style={{ padding: 24, borderTop: \`1px solid var(--line)\`, display: "flex", gap: 12, background: "var(--paper)" }}>
								<button 
									className="primary-button" 
									style={{ flex: 1, justifyContent: "center" }}
									onClick={() => {
										setViewingItemHistory(null);
										openEditModal(viewingItemHistory);
									}}
								>
									<Edit2 size={16} /> Редактировать
								</button>
								<button 
									className="secondary-button" 
									style={{ flex: 1, justifyContent: "center" }}
									onClick={() => {
										setViewingItemHistory(null);
										setAdjustingItem(viewingItemHistory);
										setAdjustType("in");
										setAdjustAmount("");
									}}
								>
									<ArrowDownToLine size={16} /> Оприходовать
								</button>
							</div>
						</motion.div>
					</div>
				)}
			</AnimatePresence>`;

    code = code.replace(
        /(\s*)<\/div>\n\t\);\n\};/g,
        `\n$1${drawerCode}\n$1</div>\n\t);\n};`
    );
}

// 6. Fix "Actions" buttons z-index or stopPropagation so clicking Edit/Adjust doesn't open drawer
code = code.replace(
    /onClick=\{\(\) => openEditModal\(item\)\}/g,
    `onClick={(e) => { e.stopPropagation(); openEditModal(item); }}`
);
code = code.replace(
    /onClick=\{\(\) => \{[\s\S]*?setAdjustingItem\(item\);[\s\S]*?\}\}/g,
    match => match.replace(/onClick=\{\(\) => \{/, 'onClick={(e) => { e.stopPropagation();')
);
code = code.replace(
    /onClick=\{\(\) => handleDeleteItem\(item\.id\)\}/g,
    `onClick={(e) => { e.stopPropagation(); handleDeleteItem(item.id); }}`
);

fs.writeFileSync(path, code);
console.log('Updated InventoryView.tsx with History Drawer functionality');
