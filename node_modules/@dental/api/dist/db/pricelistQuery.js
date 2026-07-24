import { db } from "./client.js";
import * as schema from "./schema.js";
import { eq } from "drizzle-orm";
function useInMemory() {
    return process.env.DENTAL_STATE_PERSISTENCE === "off";
}
export async function getDefaultOrganizationId() {
    if (useInMemory()) {
        return "00000000-0000-0000-0000-000000000001";
    }
    try {
        const [org] = await db.select().from(schema.organizations).limit(1);
        return org?.id || "00000000-0000-0000-0000-000000000001";
    }
    catch {
        return "00000000-0000-0000-0000-000000000001";
    }
}
export async function getServiceCatalogForOrganization(organizationId) {
    const items = await db.select().from(schema.serviceCatalogItems).where(eq(schema.serviceCatalogItems.organizationId, organizationId));
    return items.map(item => ({
        id: item.id,
        organizationId: item.organizationId,
        code: item.code || "",
        title: item.title,
        category: item.category,
        specialty: item.specialty,
        basePriceRub: item.basePriceRub,
        durationMinutes: item.durationMinutes,
        taxDeductible: item.taxDeductible,
        active: item.isActive,
        aliases: []
    }));
}
