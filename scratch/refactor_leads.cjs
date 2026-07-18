const fs = require('fs');

const storePath = 'C:/Clinic_MVP/dental-crm/apps/web/src/store/leadsStore.ts';
let storeCode = fs.readFileSync(storePath, 'utf8');

if (!storeCode.includes('notes?: { text: string; date: string }[]')) {
    storeCode = storeCode.replace(
        /expectedRevenue\?: string;/g,
        'expectedRevenue?: string;\n\tnotes?: { text: string; date: string }[];'
    );
    fs.writeFileSync(storePath, storeCode);
    console.log('Updated leadsStore.ts');
}

const viewPath = 'C:/Clinic_MVP/dental-crm/apps/web/src/components/leads/LeadsKanbanView.tsx';
let viewCode = fs.readFileSync(viewPath, 'utf8');

// 1. Imports
if (!viewCode.includes('MessageSquare')) {
    viewCode = viewCode.replace(
        /import \{([\s\S]*?)\} from "lucide-react";/g,
        'import {$1, MessageSquare, ListTodo} from "lucide-react";'
    );
}

// 2. Add LeadDrawer State
if (!viewCode.includes('selectedLeadForDrawer')) {
    viewCode = viewCode.replace(
        /const \[draggedLeadId, setDraggedLeadId\] = useState<string \| null>\(null\);/g,
        'const [draggedLeadId, setDraggedLeadId] = useState<string | null>(null);\n\tconst [selectedLeadForDrawer, setSelectedLeadForDrawer] = useState<Lead | null>(null);\n\tconst [newNote, setNewNote] = useState("");'
    );
}

// 3. Change onClick of the Lead card from openEditModal to setSelectedLeadForDrawer
viewCode = viewCode.replace(
    /onClick=\{\(\) => openEditModal\(lead\)\}/g,
    'onClick={() => setSelectedLeadForDrawer(lead)}'
);

// 4. Implement LeadDrawer UI before EDIT / ADD MODAL
if (!viewCode.includes('/* LEAD DRAWER */')) {
    const leadDrawerCode = `
			{/* LEAD DRAWER */}
			<AnimatePresence>
				{selectedLeadForDrawer && (
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
						onClick={(e) => { if(e.target === e.currentTarget) setSelectedLeadForDrawer(null) }}
					>
						<motion.div
							initial={{ x: "100%" }}
							animate={{ x: 0 }}
							exit={{ x: "100%" }}
							transition={{ type: "spring", damping: 25, stiffness: 200 }}
							style={{
								width: "400px",
								maxWidth: "100%",
								background: cardBg,
								borderLeft: \`1px solid \${borderColor}\`,
								boxShadow: "-10px 0 30px rgba(0,0,0,0.1)",
								height: "100%",
								display: "flex",
								flexDirection: "column",
								overflow: "hidden"
							}}
						>
							<div style={{ padding: 24, borderBottom: \`1px solid \${borderColor}\`, display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
								<div>
									<h2 style={{ margin: 0, fontSize: 22, color: "var(--ink)", display: "flex", alignItems: "center", gap: 8 }}>
										{selectedLeadForDrawer.name}
									</h2>
									<div style={{ display: "flex", gap: 12, marginTop: 12 }}>
										{selectedLeadForDrawer.phone && (
											<span style={{ fontSize: 14, color: "var(--muted)", display: "flex", alignItems: "center", gap: 4 }}>
												<Phone size={14} /> {selectedLeadForDrawer.phone}
											</span>
										)}
										{selectedLeadForDrawer.source && (
											<span style={{ fontSize: 14, color: "var(--teal)", display: "flex", alignItems: "center", gap: 4 }}>
												<Globe size={14} /> {selectedLeadForDrawer.source}
											</span>
										)}
									</div>
								</div>
								<button onClick={() => setSelectedLeadForDrawer(null)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted)" }}>
									<X size={24} />
								</button>
							</div>

							<div style={{ padding: 24, display: "flex", gap: 12, borderBottom: \`1px solid \${borderColor}\` }}>
								<button 
									className="primary-button" 
									style={{ flex: 1, justifyContent: "center" }}
									onClick={() => {
										setSelectedLeadForDrawer(null);
										window.location.hash = "inbox";
									}}
								>
									<MessageSquare size={16} /> Написать
								</button>
								<button 
									className="secondary-button" 
									style={{ flex: 1, justifyContent: "center" }}
									onClick={() => {
										openEditModal(selectedLeadForDrawer);
									}}
								>
									<Edit2 size={16} /> Изменить
								</button>
							</div>

							<div style={{ flex: 1, overflowY: "auto", padding: 24, background: colBg }}>
								<h3 style={{ margin: "0 0 16px 0", fontSize: 16, color: "var(--ink)", display: "flex", alignItems: "center", gap: 8 }}>
									<ListTodo size={18} /> История работы
								</h3>
								
								<div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
									{(selectedLeadForDrawer.notes || []).map((note, i) => (
										<div key={i} style={{ background: cardBg, padding: 12, borderRadius: 12, border: \`1px solid \${borderColor}\` }}>
											<p style={{ margin: 0, fontSize: 14, color: "var(--ink)", lineHeight: 1.5 }}>{note.text}</p>
											<span style={{ fontSize: 11, color: "var(--muted)", display: "block", marginTop: 8 }}>
												{new Date(note.date).toLocaleString("ru-RU")}
											</span>
										</div>
									))}
									{(!selectedLeadForDrawer.notes || selectedLeadForDrawer.notes.length === 0) && (
										<div style={{ textAlign: "center", padding: 24, color: "var(--muted)", fontSize: 13, border: \`1px dashed \${borderColor}\`, borderRadius: 12 }}>
											История пуста. Добавьте первый комментарий.
										</div>
									)}
								</div>
							</div>

							<div style={{ padding: 20, borderTop: \`1px solid \${borderColor}\`, background: cardBg }}>
								<div style={{ display: "flex", gap: 8 }}>
									<input 
										type="text" 
										placeholder="Добавить комментарий..." 
										value={newNote}
										onChange={e => setNewNote(e.target.value)}
										onKeyDown={e => {
											if (e.key === "Enter" && newNote.trim()) {
												const updatedNotes = [...(selectedLeadForDrawer.notes || []), { text: newNote.trim(), date: new Date().toISOString() }];
												updateLeadDetails(selectedLeadForDrawer.id, { notes: updatedNotes });
												setSelectedLeadForDrawer({ ...selectedLeadForDrawer, notes: updatedNotes });
												setNewNote("");
											}
										}}
										style={{ flex: 1, padding: "10px 14px", borderRadius: 8, border: \`1px solid \${borderColor}\`, outline: "none", fontSize: 14, background: colBg }}
									/>
									<button 
										className="primary-button" 
										disabled={!newNote.trim()}
										onClick={() => {
											if (newNote.trim()) {
												const updatedNotes = [...(selectedLeadForDrawer.notes || []), { text: newNote.trim(), date: new Date().toISOString() }];
												updateLeadDetails(selectedLeadForDrawer.id, { notes: updatedNotes });
												setSelectedLeadForDrawer({ ...selectedLeadForDrawer, notes: updatedNotes });
												setNewNote("");
											}
										}}
									>
										Добавить
									</button>
								</div>
							</div>
						</motion.div>
					</div>
				)}
			</AnimatePresence>

			{/* EDIT / ADD MODAL */}`;
    viewCode = viewCode.replace(/\{\/\* EDIT \/ ADD MODAL \*\/\}/, leadDrawerCode);
}

fs.writeFileSync(viewPath, viewCode);
console.log('Updated LeadsKanbanView.tsx with LeadDrawer functionality');
