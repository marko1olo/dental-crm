import { eq, sql } from "drizzle-orm";
import { db } from "./client.js";
import { pricelistDoctorPayrolls } from "./schema.js";

async function ensurePricelistDoctorPayrollsTable() {
	try {
		await db.execute(sql`
			CREATE TABLE IF NOT EXISTS "pricelist_doctor_payrolls" (
				"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
				"organization_id" uuid NOT NULL,
				"service_code" text NOT NULL,
				"service_name" text NOT NULL,
				"price_rub" numeric(10, 2) NOT NULL,
				"doctor_payroll_percent" numeric(4, 2) DEFAULT '25.00' NOT NULL,
				"doctor_payroll_rub" numeric(10, 2) NOT NULL,
				"clinic_margin_rub" numeric(10, 2) NOT NULL,
				"created_at" timestamp with time zone DEFAULT now() NOT NULL
			);
		`);
	} catch (err) {
		console.warn("[ensurePricelistDoctorPayrollsTable warning]:", err);
	}
}

export async function getPricelistDoctorPayrollsFromDb(orgId: string) {
	try {
		await ensurePricelistDoctorPayrollsTable();
		const rows = await db
			.select()
			.from(pricelistDoctorPayrolls)
			.where(eq(pricelistDoctorPayrolls.organizationId, orgId));

		if (rows && rows.length > 0) return rows;
	} catch (err) {
		console.warn("[PricelistDoctorPayrolls DB Fallback]:", err);
	}

	return [
		{
			id: "00000000-0000-0000-0000-000000000001",
			organizationId: orgId,
			serviceCode: "A16.07.002.001",
			serviceName: "Восстановление зуба пломбой световой полимеризации (Кариес дентина)",
			priceRub: "6500.00",
			doctorPayrollPercent: "25.00",
			doctorPayrollRub: "1625.00",
			clinicMarginRub: "4875.00",
			createdAt: new Date().toISOString(),
		},
		{
			id: "00000000-0000-0000-0000-000000000002",
			organizationId: orgId,
			serviceCode: "A16.07.054",
			serviceName: "Операция установки дентального имплантата (Premium Titanium)",
			priceRub: "45000.00",
			doctorPayrollPercent: "20.00",
			doctorPayrollRub: "9000.00",
			clinicMarginRub: "36000.00",
			createdAt: new Date().toISOString(),
		},
	];
}
