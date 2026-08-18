import { CanonicalImportPriceItem } from "./SmartImportEngine.js";

export class SmartPricelistImportService {
    public static normalizeCategory(category: string | null | undefined): string | null {
        if (!category) return null;
        return category.trim();
    }

    public static normalizePrice(price: number | string): number {
        if (typeof price === "number") return price;
        return parseFloat(price.replace(/,/g, ".")) || 0;
    }

    public static createPriceItem(data: {
        code: string;
        name: string;
        price: number | string;
        category?: string | null;
        unit?: string | null;
        sourceSystem: "infodent" | "dental4windows" | "ident" | "generic";
    }): CanonicalImportPriceItem {
        const priceKopecks = SmartPricelistImportService.normalizePrice(data.price) * 100;
        return {
            code: data.code,
            name: data.name,
            priceKopecks: priceKopecks,
            priceRub: priceKopecks / 100,
            category: SmartPricelistImportService.normalizeCategory(data.category),
            unit: data.unit ?? "усл.",
            isActive: true,
            sourceSystem: data.sourceSystem,
        };
    }
}
