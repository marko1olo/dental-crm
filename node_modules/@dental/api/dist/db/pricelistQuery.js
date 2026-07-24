import { db } from "./client.js";
import * as schema from "./schema.js";
import { eq } from "drizzle-orm";
export async function getDefaultOrganizationId() {
    const [org] = await db.select().from(schema.organizations).limit(1);
    return org?.id || null;
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
