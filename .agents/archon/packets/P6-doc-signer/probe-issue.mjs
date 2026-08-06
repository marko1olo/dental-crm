/**
 * P6-doc-signer — реальная проверка маршрута выдачи документа.
 *
 * Ходит по живому API 127.0.0.1:4100 подписанными токенами кабинета и
 * сотрудника и показывает, какой идентификатор попал в issued_by_user_id.
 * Скрипт только читает файлы окружения; секреты не печатаются.
 */
import { createHmac } from "node:crypto";
import { readFileSync } from "node:fs";
import { Pool } from "pg";

function readEnvFile(file) {
	const out = {};
	let text;
	try {
		text = readFileSync(file, "utf8");
	} catch {
		return out;
	}
	for (const line of text.split(/\r?\n/)) {
		const trimmed = line.trim();
		if (!trimmed || trimmed.startsWith("#")) continue;
		const eq = trimmed.indexOf("=");
		if (eq < 0) continue;
		out[trimmed.slice(0, eq).trim()] = trimmed.slice(eq + 1).trim();
	}
	return out;
}

const rootEnv = readEnvFile("C:/Clinic_MVP/dental-crm/.env");
const apiEnv = readEnvFile("C:/Clinic_MVP/dental-crm/apps/api/.env");
const secret = apiEnv.AUTH_TOKEN_SECRET || rootEnv.AUTH_TOKEN_SECRET;
if (!secret) throw new Error("AUTH_TOKEN_SECRET not found in .env files");

function signToken(payload, ttlSeconds = 3600) {
	const now = Math.floor(Date.now() / 1000);
	const full = { ...payload, exp: now + ttlSeconds, iat: now };
	const data = Buffer.from(JSON.stringify(full)).toString("base64url");
	const sig = createHmac("sha256", secret).update(data).digest("base64url");
	return `${data}.${sig}`;
}

const BASE = "http://127.0.0.1:4100";
const ORG = "4a3420d1-6ffb-4459-bd8f-7f7087f5e191";
const USER = "e44d32ca-7777-4c00-a001-c88f01b92e21"; // Петров Иван Иванович, owner
const PATIENT = "5755a8aa-73e3-40ce-9faf-e7bebe399cd4";

const headers = {
	"content-type": "application/json",
	"x-dente-clinic-token": signToken({ organizationId: ORG }),
	"x-dente-staff-token": signToken({
		userId: USER,
		fullName: "Петров Иван Иванович",
		role: "owner",
		organizationId: ORG,
	}),
};

async function call(method, url, body) {
	const res = await fetch(`${BASE}${url}`, {
		method,
		headers,
		body: body === undefined ? undefined : JSON.stringify(body),
	});
	const text = await res.text();
	let json = null;
	try {
		json = JSON.parse(text);
	} catch {
		/* non-JSON body kept as text */
	}
	return { status: res.status, json, text };
}

const attestation = {
	signatureAttestation: {
		mode: "paper_signed",
		signedAt: "28.07.2026 10:00",
		recipientFullName: "Пациент Тестовый Проверочный",
		recipientRole: "Пациент",
		staffFullName: "Петров Иван Иванович",
		staffRole: "Владелец",
		identityChecked: true,
		documentOpenedAndChecked: true,
		recipientSigned: true,
		clinicRepresentativeSigned: true,
		note: "P6 signer probe",
	},
};

const health = await call("GET", "/api/health");
console.log("HEALTH:", health.status, health.text.slice(0, 120));

const payloadByKind = {
	patient_intake_questionnaire: {
		patientIntakeQuestionnaire: {
			chiefComplaint: "Плановый осмотр, жалоб нет.",
			allergyStatus: "Аллергии отрицает.",
			currentMedications: "Постоянно принимаемых препаратов нет.",
			chronicConditions: "Хронические заболевания отрицает.",
			pregnancyStatus: "not_applicable",
			anticoagulants: "Антикоагулянты не принимает.",
			infectiousRiskNotes: "Инфекционные риски не выявлены.",
			cardioEndocrineNotes: "Сердечно-сосудистых и эндокринных нарушений нет.",
			emergencyContact: null,
			additionalNotes: null,
			accuracyConfirmed: true,
		},
	},
};

const kinds = ["patient_intake_questionnaire"];

let issuedId = null;
for (const kind of kinds) {
	const created = await call("POST", "/api/documents", {
		patientId: PATIENT,
		kind,
		title: `P6 проверка подписанта — ${kind}`,
		payload: payloadByKind[kind],
	});
	console.log(
		`\nCREATE ${kind}:`,
		created.status,
		JSON.stringify(created.json)?.slice(0, 220),
	);
	if (created.status !== 201 || !created.json?.id) continue;

	const issued = await call(
		"POST",
		`/api/documents/${created.json.id}/issue`,
		attestation,
	);
	console.log(`ISSUE  ${kind}:`, issued.status);
	console.log("  body:", (issued.text || "").slice(0, 400));
	if (issued.status === 200) {
		console.log(
			"  >>> issuedByUserId in RESPONSE:",
			JSON.stringify(issued.json?.issuedByUserId),
		);
		issuedId = created.json.id;
		break;
	}
}

if (issuedId) {
	const pool = new Pool({ connectionString: rootEnv.DATABASE_URL });
	const r = await pool.query(
		"select id, status, issued_by_user_id, voided_by_user_id from generated_documents where id = $1",
		[issuedId],
	);
	console.log("\nDB ROW AFTER ISSUE:", JSON.stringify(r.rows));

	const voided = await call("POST", `/api/documents/${issuedId}/void`, {
		voidAttestation: {
			reasonCode: "issued_in_error",
			reasonText: "Проверочная выдача подписанта, документ аннулируется.",
			voidedAt: "28.07.2026 10:05",
			staffFullName: "Петров Иван Иванович",
			staffRole: "Владелец",
			correctionDocumentId: null,
			replacementRequired: false,
			patientOrPayerNotified: true,
			archivePreserved: true,
			statusReviewed: true,
		},
	});
	console.log("\nVOID:", voided.status, (voided.text || "").slice(0, 300));
	const r2 = await pool.query(
		"select id, status, issued_by_user_id, voided_by_user_id from generated_documents where id = $1",
		[issuedId],
	);
	console.log("DB ROW AFTER VOID:", JSON.stringify(r2.rows));
	await pool.end();
} else {
	console.log("\nNo document reached issued status — see block reasons above.");
}
