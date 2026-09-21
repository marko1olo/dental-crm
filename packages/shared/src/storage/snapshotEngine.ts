/**
 * DENTE CRM — Database Snapshot Engine (IndexedDB / SQLite / Memory / LocalStorage)
 */

import { canonicalJsonStringify, sha256Hex } from "../sync/hashing.js";
import {
	calculateObjectSha256,
	computeRootStorageSha256,
	computeTableSha256,
} from "./checksum.js";
import type {
	ChecksumValidationResult,
	DatabaseSnapshot,
	SnapshotDriverType,
	SnapshotMetadata,
	TableSnapshot,
} from "./types.js";

export interface CreateSnapshotInput {
	organizationId?: string | undefined;
	clinicName?: string | undefined;
	driver?: SnapshotDriverType | undefined;
	appVersion?: string | undefined;
	notes?: string | undefined;
	tables: {
		mutations?: unknown[] | undefined;
		drafts?: unknown[] | undefined;
		clinicalCache?: unknown[] | undefined;
		schedules?: unknown[] | undefined;
		patients?: unknown[] | undefined;
		odontograms?: unknown[] | undefined;
		pricelists?: unknown[] | undefined;
		icd10?: unknown[] | undefined;
		payments?: unknown[] | undefined;
	};
}

/**
 * Creates an immutable, cryptographically verified database snapshot with SHA-256 per table and root Merkle hash.
 */
export function createDatabaseSnapshot(input: CreateSnapshotInput): DatabaseSnapshot {
	const now = new Date();
	const driver = input.driver || "indexeddb";
	const appVersion = input.appVersion || "0.1.0";

	const buildTableSnapshot = <T>(name: string, items?: T[]): TableSnapshot<T> => {
		const rows = Array.isArray(items) ? items : [];
		return {
			tableName: name,
			rowCount: rows.length,
			tableSha256: computeTableSha256(rows),
			rows,
		};
	};

	const mutationsTable = buildTableSnapshot("mutations", input.tables.mutations);
	const draftsTable = buildTableSnapshot("drafts", input.tables.drafts);
	const clinicalCacheTable = buildTableSnapshot("clinicalCache", input.tables.clinicalCache);
	const schedulesTable = input.tables.schedules ? buildTableSnapshot("schedules", input.tables.schedules) : undefined;
	const patientsTable = input.tables.patients ? buildTableSnapshot("patients", input.tables.patients) : undefined;
	const odontogramsTable = input.tables.odontograms ? buildTableSnapshot("odontograms", input.tables.odontograms) : undefined;
	const pricelistsTable = input.tables.pricelists ? buildTableSnapshot("pricelists", input.tables.pricelists) : undefined;
	const icd10Table = input.tables.icd10 ? buildTableSnapshot("icd10", input.tables.icd10) : undefined;
	const paymentsTable = input.tables.payments ? buildTableSnapshot("payments", input.tables.payments) : undefined;

	const tableHashes: Record<string, string> = {
		mutations: mutationsTable.tableSha256,
		drafts: draftsTable.tableSha256,
		clinicalCache: clinicalCacheTable.tableSha256,
	};
	if (schedulesTable) tableHashes.schedules = schedulesTable.tableSha256;
	if (patientsTable) tableHashes.patients = patientsTable.tableSha256;
	if (odontogramsTable) tableHashes.odontograms = odontogramsTable.tableSha256;
	if (pricelistsTable) tableHashes.pricelists = pricelistsTable.tableSha256;
	if (icd10Table) tableHashes.icd10 = icd10Table.tableSha256;
	if (paymentsTable) tableHashes.payments = paymentsTable.tableSha256;

	const rootSha256 = computeRootStorageSha256(tableHashes);
	const totalRecords =
		mutationsTable.rowCount +
		draftsTable.rowCount +
		clinicalCacheTable.rowCount +
		(schedulesTable?.rowCount ?? 0) +
		(patientsTable?.rowCount ?? 0) +
		(odontogramsTable?.rowCount ?? 0) +
		(pricelistsTable?.rowCount ?? 0) +
		(icd10Table?.rowCount ?? 0) +
		(paymentsTable?.rowCount ?? 0);

	const metadata: SnapshotMetadata = {
		snapshotId: `snap_${now.getTime()}_${Math.random().toString(36).substring(2, 9)}`,
		organizationId: input.organizationId,
		clinicName: input.clinicName,
		createdAtIso: now.toISOString(),
		createdAtMs: now.getTime(),
		driver,
		appVersion,
		totalRecords,
		rootSha256,
		notes: input.notes,
	};

	return {
		metadata,
		tables: {
			mutations: mutationsTable,
			drafts: draftsTable,
			clinicalCache: clinicalCacheTable,
			...(schedulesTable ? { schedules: schedulesTable } : {}),
			...(patientsTable ? { patients: patientsTable } : {}),
			...(odontogramsTable ? { odontograms: odontogramsTable } : {}),
			...(pricelistsTable ? { pricelists: pricelistsTable } : {}),
			...(icd10Table ? { icd10: icd10Table } : {}),
			...(paymentsTable ? { payments: paymentsTable } : {}),
		},
	};
}

/**
 * Validates integrity of all table hashes and root SHA-256 checksum in a snapshot.
 */
export function verifyDatabaseSnapshot(snapshot: DatabaseSnapshot): ChecksumValidationResult {
	if (!snapshot || !snapshot.metadata || !snapshot.tables) {
		return {
			valid: false,
			expectedRootSha256: "",
			calculatedRootSha256: "",
			mismatchedTables: ["root"],
			checkedTablesCount: 0,
			totalRecordsChecked: 0,
			errorMessage: "Некорректная структура снимка базы данных",
		};
	}

	const mismatched: string[] = [];
	const computedHashes: Record<string, string> = {};
	let totalRecordsChecked = 0;
	let tableCount = 0;

	const verifyTable = (name: string, table?: TableSnapshot) => {
		if (!table) return;
		tableCount++;
		totalRecordsChecked += Array.isArray(table.rows) ? table.rows.length : 0;
		const actualHash = computeTableSha256(table.rows || []);
		computedHashes[name] = actualHash;
		if (actualHash !== table.tableSha256) {
			mismatched.push(name);
		}
	};

	verifyTable("mutations", snapshot.tables.mutations);
	verifyTable("drafts", snapshot.tables.drafts);
	verifyTable("clinicalCache", snapshot.tables.clinicalCache);
	verifyTable("schedules", snapshot.tables.schedules);
	verifyTable("patients", snapshot.tables.patients);
	verifyTable("odontograms", snapshot.tables.odontograms);
	verifyTable("pricelists", snapshot.tables.pricelists);
	verifyTable("icd10", snapshot.tables.icd10);
	verifyTable("payments", snapshot.tables.payments);

	const computedRoot = computeRootStorageSha256(computedHashes);
	const rootMatches = computedRoot === snapshot.metadata.rootSha256;
	if (!rootMatches && !mismatched.includes("rootSha256")) {
		mismatched.push("rootSha256");
	}

	return {
		valid: mismatched.length === 0,
		expectedRootSha256: snapshot.metadata.rootSha256,
		calculatedRootSha256: computedRoot,
		mismatchedTables: mismatched,
		checkedTablesCount: tableCount,
		totalRecordsChecked,
		errorMessage: mismatched.length > 0
			? `Несоответствие контрольных сумм в таблицах: ${mismatched.join(", ")}`
			: undefined,
	};
}
