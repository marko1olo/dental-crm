import React, { useEffect, useState } from "react";
import { Plus, Package, AlertTriangle, ArrowDownToLine, ArrowUpFromLine } from "lucide-react";
import "./InventoryView.css";

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
  const [showAddModal, setShowAddModal] = useState(false);
  const [newItemName, setNewItemName] = useState("");
  const [newItemThreshold, setNewItemThreshold] = useState("5");

  const [adjustingItem, setAdjustingItem] = useState<InventoryItem | null>(null);
  const [adjustAmount, setAdjustAmount] = useState("");
  const [adjustType, setAdjustType] = useState<"in" | "out">("in");

  const fetchItems = async () => {
    try {
      setIsLoading(true);
      const res = await fetch(`/api/inventory/${organizationId}`);
      if (res.ok) {
        const data = await res.json();
        setItems(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, [organizationId]);

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemName) return;
    try {
      const res = await fetch(`/api/inventory/${organizationId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newItemName,
          criticalThreshold: parseInt(newItemThreshold) || 5,
          stockQuantity: 0,
        })
      });
      if (res.ok) {
        setShowAddModal(false);
        setNewItemName("");
        setNewItemThreshold("5");
        fetchItems();
      }
    } catch (e) {
      console.error(e);
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
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ adjustment })
      });
      if (res.ok) {
        setAdjustingItem(null);
        setAdjustAmount("");
        fetchItems();
      }
    } catch (e) {
      console.error(e);
    }
  };

  if (isLoading) {
    return <div className="p-8 text-center text-gray-500">Загрузка склада...</div>;
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Package className="text-blue-500" /> Склад
          </h1>
          <p className="text-gray-500 text-sm mt-1">Учёт расходных материалов</p>
        </div>
        <button 
          onClick={() => setShowAddModal(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-6 py-3 rounded-lg flex items-center gap-2 transition-colors text-lg shadow-md"
        >
          <Plus size={24} /> ДОБАВИТЬ МАТЕРИАЛ
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <th className="px-6 py-3 text-sm font-medium text-gray-500">Наименование</th>
              <th className="px-6 py-3 text-sm font-medium text-gray-500">Остаток</th>
              <th className="px-6 py-3 text-sm font-medium text-gray-500">Минимум</th>
              <th className="px-6 py-3 text-sm font-medium text-gray-500 text-right">Действия</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {items.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-6 py-8 text-center text-gray-500">
                  На складе пока нет материалов. Добавьте первую позицию.
                </td>
              </tr>
            ) : items.map((item) => {
              const isLowStock = item.stockQuantity <= item.criticalThreshold;
              return (
                <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="font-medium text-gray-900 flex items-center gap-2">
                      {isLowStock && <AlertTriangle size={16} className="text-orange-500" />}
                      {item.name}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-3 py-1 rounded-md text-base font-bold ${isLowStock ? 'bg-red-100 text-red-800 border-2 border-red-500' : 'bg-green-100 text-green-800'}`}>
                      {item.stockQuantity} шт.
                      {isLowStock && <span className="ml-2 uppercase tracking-wider text-xs">Критически мало</span>}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-gray-500 text-base font-medium">
                    {item.criticalThreshold} шт.
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-3">
                      <button
                        onClick={() => { setAdjustingItem(item); setAdjustType("in"); setAdjustAmount(""); }}
                        className="flex items-center gap-1 px-4 py-2 bg-blue-100 text-blue-800 font-bold border-2 border-blue-300 hover:bg-blue-200 rounded transition-colors"
                        title="Приход"
                      >
                        <ArrowDownToLine size={20} /> ПРИХОД
                      </button>
                      <button
                        onClick={() => { setAdjustingItem(item); setAdjustType("out"); setAdjustAmount(""); }}
                        className="flex items-center gap-1 px-4 py-2 bg-red-100 text-red-800 font-bold border-2 border-red-300 hover:bg-red-200 rounded transition-colors"
                        title="Расход"
                      >
                        <ArrowUpFromLine size={20} /> РАСХОД
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">Новый материал</h2>
            <form onSubmit={handleAddItem}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Название</label>
                  <input
                    type="text"
                    required
                    value={newItemName}
                    onChange={e => setNewItemName(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    placeholder="Например: Анестетик Ультракаин"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Критический остаток (предупреждение)</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={newItemThreshold}
                    onChange={e => setNewItemThreshold(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  />
                </div>
              </div>
              <div className="mt-6 flex justify-end gap-3">
                <button type="button" onClick={() => setShowAddModal(false)} className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg">Отмена</button>
                <button type="submit" className="px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-lg">Сохранить</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {adjustingItem && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-sm">
            <h2 className="text-xl font-bold mb-1">
              {adjustType === "in" ? "Приход на склад" : "Списание со склада"}
            </h2>
            <p className="text-gray-500 text-sm mb-4">{adjustingItem.name}</p>
            
            <form onSubmit={handleAdjustStock}>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Количество (шт)</label>
                <input
                  type="number"
                  min="1"
                  required
                  autoFocus
                  value={adjustAmount}
                  onChange={e => setAdjustAmount(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-lg"
                  placeholder="0"
                />
              </div>
              <div className="mt-6 flex justify-end gap-3">
                <button type="button" onClick={() => setAdjustingItem(null)} className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg">Отмена</button>
                <button type="submit" className={`px-4 py-2 text-white rounded-lg ${adjustType === 'in' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-red-600 hover:bg-red-700'}`}>
                  {adjustType === "in" ? "Оприходовать" : "Списать"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
