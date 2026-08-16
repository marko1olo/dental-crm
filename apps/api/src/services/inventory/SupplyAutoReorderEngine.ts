export interface InventoryItemStats {
    id: string;
    name: string;
    currentStock: number;
    minQty: number;
    avgDailyUsage: number; // Среднедневной расход
    leadTimeDays: number; // Срок поставки в днях
}

export interface ReorderRecommendation {
    itemId: string;
    itemName: string;
    currentStock: number;
    rop: number; // Point of Reorder
    orderQuantity: number; // Оптимальный размер партии
    isCritical: boolean;
}

export class SupplyAutoReorderEngine {
    /**
     * ROP = (Среднедневной расход * Срок поставки в днях) + Страховой запас.
     * Мы считаем minQty как Страховой запас.
     */
    public static calculateROP(
        avgDailyUsage: number,
        leadTimeDays: number,
        safetyStock: number
    ): number {
        return (avgDailyUsage * leadTimeDays) + safetyStock;
    }

    /**
     * Анализ одного расходника
     */
    public static analyzeItem(
        stats: InventoryItemStats
    ): ReorderRecommendation {
        const rop = this.calculateROP(stats.avgDailyUsage, stats.leadTimeDays, stats.minQty);
        
        // Оптимальный размер партии: разница между ROP и текущим остатком
        // Если остаток > ROP, ничего не заказываем (0)
        const orderQuantity = Math.max(0, rop - stats.currentStock);
        
        // Критическое состояние, если текущий остаток <= минимального уровня (страхового запаса)
        const isCritical = stats.currentStock <= stats.minQty;

        return {
            itemId: stats.id,
            itemName: stats.name,
            currentStock: stats.currentStock,
            rop,
            orderQuantity,
            isCritical
        };
    }

    /**
     * Генерирует список рекомендаций для всего склада
     */
    public static generateOrders(
        items: InventoryItemStats[]
    ): ReorderRecommendation[] {
        return items
            .map(item => this.analyzeItem(item))
            .filter(rec => rec.orderQuantity > 0);
    }
}
