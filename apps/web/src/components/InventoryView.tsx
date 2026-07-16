import React, { useEffect, useState, useMemo } from "react";
import { Plus, Package, AlertTriangle, ArrowDownToLine, ArrowUpFromLine, Search, Edit2, X, Trash2 } from "lucide-react";
import { useAppLogicContext } from "../contexts/AppLogicContext";
import { showToast } from "./GlobalToast";

interface InventoryItem {
  id: string;
  name: string;
  stockQuantity: number;
  criticalThreshold: number;
  unitCostRub: string;
  updatedAt: string;
}

export const InventoryView: React.FC<{ organizationId: string }> = ({ organizationId }) => {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { auth } = useAppLogicContext();

  const [searchQuery, setSearchQuery] = useState("");

  // Add/Edit Modal
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [formData, setFormData] = useState({ name: "", threshold: "5" });

  // Adjust Modal
  const [adjustingItem, setAdjustingItem] = useState<InventoryItem | null>(null);
  const [adjustAmount, setAdjustAmount] = useState("");
  const [adjustType, setAdjustType] = useState<"in" | "out">("in");

  const fetchItems = async () => {
    try {
      setIsLoading(true);
      const res = await fetch(`/api/inventory/${organizationId}`, {
        headers: auth.denteClinicalReadHeaders()
      });
      if (res.ok) {
        const data = await res.json();
        setItems(data);
      }
    } catch (e) {
      console.error(e);
      showToast("Ошибка загрузки склада", "error");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (organizationId) {
      fetchItems();
    }
  }, [organizationId]);

  const openAddModal = () => {
    setEditingItem(null);
    setFormData({ name: "", threshold: "5" });
    setShowModal(true);
  };

  const openEditModal = (item: InventoryItem) => {
    setEditingItem(item);
    setFormData({ name: item.name, threshold: String(item.criticalThreshold) });
    setShowModal(true);
  };

  const handleSaveItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) return;
    try {
      if (editingItem) {
        // Backend currently only has PATCH for stock. We'll simulate editing or skip it if backend lacks it, 
        // wait, let's just show a toast if edit is not supported, or check if we can add it.
        // For MVP, we might only be able to add. If we lack edit API, we'll tell the user.
        showToast("Редактирование пока недоступно в API", "error");
      } else {
        const res = await fetch(`/api/inventory/${organizationId}`, {
          method: "POST",
          headers: auth.denteClinicalReadHeaders({ "Content-Type": "application/json" }),
          body: JSON.stringify({
            name: formData.name,
            criticalThreshold: parseInt(formData.threshold) || 5,
            stockQuantity: 0,
          })
        });
        if (res.ok) {
          showToast("Материал добавлен", "success");
          setShowModal(false);
          fetchItems();
        } else {
          showToast("Ошибка добавления", "error");
        }
      }
    } catch (e) {
      console.error(e);
      showToast("Системная ошибка", "error");
    }
  };

  const handleAdjustStock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustingItem || !adjustAmount) return;
    
    const amount = parseInt(adjustAmount);
    if (isNaN(amount) || amount <= 0) return;

    const adjustment = adjustType === "in" ? amount : -amount;

    try {
      const res = await fetch(`/api/inventory/${organizationId}/${adjustingItem.id}/stock`, {
        method: "PATCH",
        headers: auth.denteClinicalReadHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({ adjustment })
      });
      if (res.ok) {
        setAdjustingItem(null);
        setAdjustAmount("");
        fetchItems();
        showToast(adjustType === "in" ? "Приход оформлен" : "Списание оформлено", "success");
      } else {
        showToast("Ошибка изменения остатков", "error");
      }
    } catch (e) {
      console.error(e);
      showToast("Системная ошибка", "error");
    }
  };

  const filteredItems = useMemo(() => {
    return items.filter(i => i.name.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [items, searchQuery]);

  const totalValue = items.reduce((acc, i) => acc + (i.stockQuantity * (Number(i.unitCostRub) || 0)), 0);
  const lowStockCount = items.filter(i => i.stockQuantity <= i.criticalThreshold).length;

  if (isLoading && items.length === 0) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: "var(--muted)" }}>
        Загрузка склада...
      </div>
    );
  }

  const paperBg = "var(--paper)";
  const paperSoftBg = "var(--paper-soft)";
  const borderColor = "var(--line)";

  return (
    <div style={{ padding: 24, maxWidth: 1200, margin: "0 auto", height: "100%", display: "flex", flexDirection: "column" }}>
      {/* HEADER */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0, display: "flex", alignItems: "center", gap: 12, color: "var(--ink)" }}>
            <Package color="var(--teal)" size={28} /> Склад
          </h1>
          <p style={{ color: "var(--muted)", margin: "4px 0 0 0", fontSize: 14 }}>
            Учёт расходных материалов, приход и списание
          </p>
        </div>
        <div style={{ display: "flex", gap: 12 }}>
          <div style={{ 
            background: paperBg, border: `1px solid ${borderColor}`, padding: "12px 20px", 
            borderRadius: 12, display: "flex", flexDirection: "column", alignItems: "center", minWidth: 120
          }}>
            <span style={{ fontSize: 12, color: "var(--muted)", textTransform: "uppercase", letterSpacing: 1 }}>В дефиците</span>
            <strong style={{ fontSize: 24, color: lowStockCount > 0 ? "var(--tomato)" : "var(--teal)" }}>{lowStockCount}</strong>
          </div>
          {/* We hide total value since unitCostRub logic is incomplete in UI currently, but leaving space for it */}
        </div>
      </div>

      {/* CONTROLS */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <div style={{ position: "relative", width: 300 }}>
          <Search size={16} color="var(--muted)" style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)" }} />
          <input 
            type="text" 
            placeholder="Поиск материала..." 
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            style={{
              width: "100%", padding: "10px 12px 10px 36px", borderRadius: 8,
              border: `1px solid ${borderColor}`, background: paperBg, color: "var(--ink)",
              outline: "none"
            }}
          />
        </div>
        <button className="primary-button" onClick={openAddModal}>
          <Plus size={18} /> Добавить позицию
        </button>
      </div>

      {/* TABLE */}
      <div style={{ flex: 1, overflowY: "auto", background: paperBg, borderRadius: 16, border: `1px solid ${borderColor}` }}>
        <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
          <thead style={{ position: "sticky", top: 0, background: paperSoftBg, zIndex: 10 }}>
            <tr>
              <th style={{ padding: "16px 20px", fontSize: 13, color: "var(--muted)", fontWeight: 600, borderBottom: `1px solid ${borderColor}` }}>НАИМЕНОВАНИЕ</th>
              <th style={{ padding: "16px 20px", fontSize: 13, color: "var(--muted)", fontWeight: 600, borderBottom: `1px solid ${borderColor}` }}>ОСТАТОК</th>
              <th style={{ padding: "16px 20px", fontSize: 13, color: "var(--muted)", fontWeight: 600, borderBottom: `1px solid ${borderColor}` }}>КРИТИЧЕСКИЙ МИНИМУМ</th>
              <th style={{ padding: "16px 20px", fontSize: 13, color: "var(--muted)", fontWeight: 600, borderBottom: `1px solid ${borderColor}`, textAlign: "right" }}>ДЕЙСТВИЯ</th>
            </tr>
          </thead>
          <tbody>
            {filteredItems.length === 0 ? (
              <tr>
                <td colSpan={4} style={{ padding: 40, textAlign: "center", color: "var(--muted)" }}>
                  Список пуст. Добавьте материалы на склад.
                </td>
              </tr>
            ) : filteredItems.map(item => {
              const isLowStock = item.stockQuantity <= item.criticalThreshold;
              return (
                <tr key={item.id} style={{ borderBottom: `1px solid ${borderColor}` }}>
                  <td style={{ padding: "16px 20px", color: "var(--ink)", fontWeight: 500 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      {isLowStock && <AlertTriangle size={16} color="var(--tomato)" />}
                      {item.name}
                    </div>
                  </td>
                  <td style={{ padding: "16px 20px" }}>
                    <span style={{
                      background: isLowStock ? "rgba(239, 68, 68, 0.1)" : "rgba(16, 185, 129, 0.1)",
                      color: isLowStock ? "var(--tomato)" : "var(--teal)",
                      padding: "4px 10px",
                      borderRadius: 6,
                      fontWeight: 600,
                      fontSize: 14,
                      border: isLowStock ? "1px solid rgba(239, 68, 68, 0.3)" : "none"
                    }}>
                      {item.stockQuantity} шт.
                    </span>
                  </td>
                  <td style={{ padding: "16px 20px", color: "var(--muted)", fontSize: 14 }}>
                    {item.criticalThreshold} шт.
                  </td>
                  <td style={{ padding: "16px 20px", textAlign: "right" }}>
                    <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
                      <button 
                        onClick={() => { setAdjustingItem(item); setAdjustType("in"); setAdjustAmount(""); }}
                        style={{
                          background: "rgba(59, 130, 246, 0.1)", color: "#3b82f6", border: "none",
                          padding: "6px 12px", borderRadius: 6, fontWeight: 600, cursor: "pointer",
                          display: "flex", alignItems: "center", gap: 6, fontSize: 13
                        }}
                      >
                        <ArrowDownToLine size={14} /> ПРИХОД
                      </button>
                      <button 
                        onClick={() => { setAdjustingItem(item); setAdjustType("out"); setAdjustAmount(""); }}
                        style={{
                          background: "rgba(239, 68, 68, 0.1)", color: "var(--tomato)", border: "none",
                          padding: "6px 12px", borderRadius: 6, fontWeight: 600, cursor: "pointer",
                          display: "flex", alignItems: "center", gap: 6, fontSize: 13
                        }}
                      >
                        <ArrowUpFromLine size={14} /> РАСХОД
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* MODALS */}
      {showModal && (
        <div style={{ position: "fixed", inset: 0, zIndex: 1000, background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ background: paperBg, width: 400, borderRadius: 16, padding: 24, border: `1px solid ${borderColor}`, boxShadow: "0 24px 48px rgba(0,0,0,0.2)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 20 }}>
              <h2 style={{ margin: 0, fontSize: 18, fontWeight: 600, color: "var(--ink)" }}>{editingItem ? "Редактировать материал" : "Новый материал"}</h2>
              <button onClick={() => setShowModal(false)} style={{ background: "none", border: "none", color: "var(--muted)", cursor: "pointer" }}><X size={20}/></button>
            </div>
            <form onSubmit={handleSaveItem} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <label style={{ fontSize: 13, color: "var(--muted)" }}>Наименование</label>
                <input 
                  type="text" required value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })}
                  style={{ padding: 10, borderRadius: 8, border: `1px solid ${borderColor}`, background: paperSoftBg, color: "var(--ink)" }}
                />
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <label style={{ fontSize: 13, color: "var(--muted)" }}>Критический остаток (min)</label>
                <input 
                  type="number" min="0" required value={formData.threshold} onChange={e => setFormData({ ...formData, threshold: e.target.value })}
                  style={{ padding: 10, borderRadius: 8, border: `1px solid ${borderColor}`, background: paperSoftBg, color: "var(--ink)" }}
                />
              </div>
              <button type="submit" className="primary-button" style={{ marginTop: 12, justifyContent: "center" }}>Сохранить</button>
            </form>
          </div>
        </div>
      )}

      {adjustingItem && (
        <div style={{ position: "fixed", inset: 0, zIndex: 1000, background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ background: paperBg, width: 360, borderRadius: 16, padding: 24, border: `1px solid ${borderColor}`, boxShadow: "0 24px 48px rgba(0,0,0,0.2)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
              <h2 style={{ margin: 0, fontSize: 18, fontWeight: 600, color: "var(--ink)" }}>{adjustType === "in" ? "Приход на склад" : "Списание со склада"}</h2>
              <button onClick={() => setAdjustingItem(null)} style={{ background: "none", border: "none", color: "var(--muted)", cursor: "pointer" }}><X size={20}/></button>
            </div>
            <p style={{ margin: "0 0 20px 0", color: "var(--teal)", fontWeight: 500 }}>{adjustingItem.name}</p>
            <form onSubmit={handleAdjustStock} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <label style={{ fontSize: 13, color: "var(--muted)" }}>Количество (шт)</label>
                <input 
                  type="number" min="1" required autoFocus value={adjustAmount} onChange={e => setAdjustAmount(e.target.value)}
                  style={{ padding: "12px 16px", borderRadius: 8, border: `1px solid ${borderColor}`, background: paperSoftBg, color: "var(--ink)", fontSize: 18, fontWeight: 600 }}
                />
              </div>
              <button type="submit" style={{ 
                marginTop: 12, padding: "12px", borderRadius: 8, border: "none", fontWeight: 600, color: "#fff", cursor: "pointer",
                background: adjustType === "in" ? "#3b82f6" : "var(--tomato)" 
              }}>
                {adjustType === "in" ? "Оприходовать" : "Списать"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
