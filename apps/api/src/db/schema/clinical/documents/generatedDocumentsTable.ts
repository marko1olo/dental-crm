import type {
	DocumentIssueSignatureAttestation,
	DocumentReleaseJournalEntry,
	DocumentVoidAttestation,
	TaxXmlSnapshot,
	TaxXmlSourceSnapshot,
} from "@dental/shared";
import { sql } from "drizzle-orm";
import {
	foreignKey,
	index,
	integer,
	jsonb,
	numeric,
	pgTable,
	text,
	timestamp,
	uuid,
} from "drizzle-orm/pg-core";
import {
	documentKind,
	documentStatus,
} from "../../_common.js";
import { organizations, users } from "../../auth.js";
import { patients } from "../../patients.js";
import { visits } from "../visitsSchema.js";

export const generatedDocuments = pgTable(
	"generated_documents",
	{
		id: uuid("id").primaryKey().default(sql`uuidv7()`),
		organizationId: uuid("organization_id")
			.notNull()
			.references(() => organizations.id),
		patientId: uuid("patient_id")
			.notNull()
			.references(() => patients.id),
		visitId: uuid("visit_id").references(() => visits.id),
		kind: documentKind("kind").notNull(),
		status: documentStatus("status").notNull().default("draft"),
		title: text("title").notNull(),
		storagePath: text("storage_path"),
		totalAmountRub: numeric("total_amount_rub", {
			precision: 12,
			scale: 2,
			mode: "number",
		}),
		taxYear: integer("tax_year"),
		taxPayerInn: text("tax_payer_inn"),
		payloadJson: text("payload_json"),
		taxPaymentSnapshotJson: text("tax_payment_snapshot_json"),
		taxXmlSourceSnapshot: jsonb(
			"tax_xml_source_snapshot",
		).$type<TaxXmlSourceSnapshot | null>(),
		taxXmlSnapshot: jsonb("tax_xml_snapshot").$type<TaxXmlSnapshot | null>(),
		signatureAttestation: jsonb(
			"signature_attestation",
		).$type<DocumentIssueSignatureAttestation | null>(),
		voidAttestation: jsonb(
			"void_attestation",
		).$type<DocumentVoidAttestation | null>(),
		releaseJournalEntry: jsonb(
			"release_journal_entry",
		).$type<DocumentReleaseJournalEntry | null>(),
		issuedAt: timestamp("issued_at", { withTimezone: true }),
		issuedSnapshotSha256: text("issued_snapshot_sha256"),
		issuedSnapshotCreatedAt: timestamp("issued_snapshot_created_at", {
			withTimezone: true,
		}),
		issuedByUserId: uuid("issued_by_user_id").references(() => users.id),
		voidedAt: timestamp("voided_at", { withTimezone: true }),
		voidedByUserId: uuid("voided_by_user_id").references(() => users.id),
		// Ink / canvas signature captured in browser (base64 SVG or PNG data-URL)
		signatureSvg: text("signature_svg"),
		// UKEP / GOST-2012 detached PKCS#7 CMS signature blob (base64)
		cryptoSignaturePkcs7: text("crypto_signature_pkcs7"),
		cdaXmlSnapshot: text("cda_xml_snapshot"),
		cdaXmlSha256: text("cda_xml_sha256"),
		cdaTemplateOid: text("cda_template_oid"),
		cdaDocumentVersion: integer("cda_document_version").default(1),
		doctorSignaturePkcs7: text("doctor_signature_pkcs7"),
		doctorCertSerial: text("doctor_cert_serial"),
		doctorCertSubject: text("doctor_cert_subject"),
		doctorSignedAt: timestamp("doctor_signed_at", { withTimezone: true }),
		moSignaturePkcs7: text("mo_signature_pkcs7"),
		moCertSerial: text("mo_cert_serial"),
		moCertSubject: text("mo_cert_subject"),
		moSignedAt: timestamp("mo_signed_at", { withTimezone: true }),
		egiszOutboxId: uuid("egisz_outbox_id"),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(table) => {
		return {
			documentVisitPatientOrganizationFk: foreignKey({
				columns: [table.visitId, table.patientId, table.organizationId],
				foreignColumns: [visits.id, visits.patientId, visits.organizationId],
				name: "generated_documents_visit_patient_organization_fk",
			}),
			organizationIdIdx: index("generated_documents_organization_id_idx").on(
				table.organizationId,
			),
			patientIdIdx: index("generated_documents_patient_id_idx").on(
				table.patientId,
			),
			visitIdIdx: index("generated_documents_visit_id_idx").on(
				table.visitId,
			),
			idxOrgPatientCreated: index(
				"idx_generated_documents_org_patient_created",
			).on(table.organizationId, table.patientId, table.createdAt),
			issuedByUserIdIdx: index("generated_documents_issued_by_idx").on(
				table.issuedByUserId,
			),
			voidedByUserIdIdx: index("generated_documents_voided_by_idx").on(
				table.voidedByUserId,
			),
			orgStatusIdx: index("generated_documents_org_status_idx").on(
				table.organizationId,
				table.status,
			),
			orgCreatedIdx: index("generated_documents_org_created_idx").on(
				table.organizationId,
				table.createdAt,
			),
			orgKindIdx: index("generated_documents_org_kind_idx").on(
				table.organizationId,
				table.kind,
			),
		};
	},
);

export type GeneratedDocument = typeof generatedDocuments.$inferSelect;
export type NewGeneratedDocument = typeof generatedDocuments.$inferInsert;
