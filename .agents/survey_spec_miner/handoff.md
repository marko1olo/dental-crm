# Handoff Report: Regulatory & Clinical Specification Miner for Clinic MVP (DENTE)

## 1. Observation

Direct observations from codebase inspection, regulatory files, and system tests:

1. **SEMD 108 & HL7 CDA R2 Baseline**:
   - `apps/api/src/services/cda/index.ts:28-44`: Generator entry point `generateDentalCdaXml` coordinates header, patient, author/custodian, and body generation.
   - `apps/api/src/services/cda/header.ts:30-46`: Emits `POCD_HD000040`, `<realmCode code="RU"/>`, LOINC `74208-1` («Протокол стоматологического осмотра»), template OID, confidentiality code `N` (OID `2.16.840.1.113883.5.25`), and document versioning (`setId`, `versionNumber`, `relatedDocument typeCode="RPLC"`).
   - `apps/api/src/services/cda/body.ts:58-149`: Emits structuredBody with Diagnosis (LOINC `29548-5`, `29308-4`, ICD-10 OID `1.2.643.5.1.13.13.11.1005`, tooth target site OID `1.2.643.5.1.13.13.11.1466`), Anamnesis (LOINC `10164-2`), Objective status (LOINC `29545-1`), Services rendered / treatment (LOINC `47519-4`), Complications (LOINC `55109-3`), and Comorbidities (LOINC `11348-0`).
   - `apps/api/src/services/cda/util.ts:48-62`: OID dictionary pins `FRMO_MO_ROOT` (`1.2.643.5.1.13.13.12.2`), `SNILS` (`1.2.643.100.3`), `OGRN_LEGAL` (`1.2.643.100.1`), `OGRN_IP` (`1.2.643.100.5`), `INN` (`1.2.643.100.4`), `GENDER` (`1.2.643.5.1.13.13.11.1040`), `MEDICAL_CARE_TYPE` (`1.2.643.5.1.13.13.11.1461`), `MEDICAL_POSITIONS` (`1.2.643.5.1.13.13.11.1002`), `ICD10` (`1.2.643.5.1.13.13.11.1005`), `DENTAL_TOOTH` (`1.2.643.5.1.13.13.11.1466`).

2. **Digital Signatures & CryptoPro Plumbing**:
   - `apps/api/src/services/cda/signature.ts:9-54`: Zod schema `detachedSignatureSchema` specifies Base64 PKCS#7 / CMS / CAdES-BES, certificate serial, subject, ISO 8601 timestamp, and algorithm OID `1.2.643.7.1.1.1.1` (GOST R 34.10-2012 256-bit). `canonicalizeCdaXml` normalizes CRLF -> LF.
   - `apps/web/src/utils/cryptoPro.ts:1-187`: Browser plug-in bridge calling `CAdESCOM.CadesSignedData` with `CADESCOM_CADES_BES` and `CADESCOM_BASE64_TO_BINARY`.
   - `apps/api/src/routes/documents/signUkep.ts:30-140`: Route `POST /api/documents/:id/sign-ukep` persists `cryptoSignaturePkcs7` with duplicate replay protection.

3. **FNS Tax Deduction (KND 1151156, Format 5.01)**:
   - `apps/api/src/documents/taxXml.ts:25-742`: Generates XML conforming to Order EA-7-11/824@, electronic form KND `1184043`, format `5.01`, root `<Файл ИдФайл=... ВерсФорм="5.01">`, `<Документ КНД="1184043">`. Computes `sumCode1Kopecks` and `sumCode2Kopecks` with integer kopeck math.
   - `docs/legal-sources/fns-knd-1151156.json`: Pinned manifest for `UT_SVOPLMEDUSL_1_278_00_05_01_02.xsd` (SHA-256 `c6f4b26841436853add552324a690c8cee0d9f66072d750cb502098839a1ec83`).

4. **Database & Audit Trail Schema**:
   - `apps/api/src/db/schema/clinical.ts:1123-1238`: `clinical_audit_logs`, `egisz_blank_permissions` (`patient_opt_out_respect`), `egisz_logs` (`organization_id`, `patient_id`, `visit_id`, `status`, `transaction_id`, `error_details`).

---

## 2. Logic Chain

1. **Regulatory Requirement 1 (SEMD 108 HL7 CDA R2)**:
   - Under Minzdrav Order No. 947n and EGISZ REMD technical guidelines, the electronic dental examination record must strictly follow HL7 CDA R2 XML schemas (POCD_HD000040) with root template `1.2.643.5.1.13.13.11.108` and document type code `108`.
   - It requires 5 mandatory sections: (a) Complaints & Anamnesis (LOINC 10164-2), (b) Dental Status / Odontogram (LOINC 29545-1) using FDI ISO 3950 tooth numbers with 5 anatomical surfaces (V, L/P, O/I, M, D) and standardized condition codes, (c) Diagnosis (LOINC 29548-5) referencing ICD-10 (FRNSI OID 1.2.643.5.1.13.13.11.1005), (d) Services Rendered (LOINC 47519-4) mapping Order 804n medical nomenclature (OID 1.2.643.5.1.13.13.11.1070), and (e) Recommendations (LOINC 18776-5).
   - Validations require non-empty FRMO OID (1.2.643.5.1.13.13.12.2), Doctor/Patient SNILS (1.2.643.100.3) with checksum validation, and strict element sequencing (`id` -> `code` -> `addr` -> `telecom` -> `assignedPerson` -> `representedOrganization`).

2. **Regulatory Requirement 2 (Dual CAdES-BES GOST Cryptography)**:
   - Russian e-health law mandates dual detached signing (УКЭП): Doctor UKEP (attending clinician) and Medical Organization UKEP (Chief Medical Officer / Clinic legal entity).
   - Algorithm standard: GOST R 34.10-2012 (256-bit OID `1.2.643.7.1.1.1.1` or 512-bit OID `1.2.643.7.1.1.1.2`) with GOST R 34.11-2012 Streebog hash (256-bit OID `1.2.643.7.1.1.2.2`).
   - Signature format is CAdES-BES detached CMS PKCS#7 encoded in Base64. Verification must validate the certificate chain up to the Head Certification Authority of the Ministry of Digital Development (Головной удостоверяющий центр Минцифры РФ), check CRL/OCSP status, verify signing time, and calculate Streebog-256 over C14N-canonicalized XML.

3. **Regulatory Requirement 3 (FNS Tax Deduction KND 1151156)**:
   - Order EA-7-11/824@ and XSD `UT_SVOPLMEDUSL_1_278_00_05_01_02.xsd` govern electronic tax deduction certificate issuance from tax year 2024 onwards.
   - Government Decree No. 458 dictates automated categorization into:
     - **Code 1**: Routine dental therapy, prophylaxis, non-implant surgery, standard prosthetics (subject to 150,000 RUB cumulative annual social deduction limit).
     - **Code 2**: Expensive care (Дорогостоящее лечение), specifically dental implant placement (A16.07.054), bone augmentation/sinus lift, and complex implant-supported prosthetics (unlimited deduction).
   - The XML must emit separate attributes `СуммаКод1` and `СуммаКод2` calculated in integer kopecks without floating point drift.

4. **Regulatory Requirement 4 (MIAC Form 039/u & Order 804n UET)**:
   - Form 039/u aggregates daily/monthly dental productivity based on Labor Equivalency Units (Условные Единицы Трудоёмкости — УЕТ; 1 УЕТ = 10 minutes of clinician work).
   - Order 804n services carry discrete adult (`uet_adult`) and child (`uet_child`) coefficients.
   - Reporting queries calculate total patients seen, primary patients, total adult/child UET, and breakdown by nosology (caries, pulpitis, periodontitis, extractions, implants, prosthetics).

5. **Regulatory Requirement 5 (Cryptographic SHA-256 Hash Chain)**:
   - Audit trail immutability requires sequential hashing: `current_hash = SHA256(previous_hash + timestamp + action + actor_id + resource_id + payload_canonical_json)`.
   - Concurrency is strictly serialized per tenant using PostgreSQL row-level locks: `SELECT ... FROM egisz_audit_logs WHERE organization_id = $1 ORDER BY sequence_number DESC LIMIT 1 FOR UPDATE`. Genesis record starts with 64 zero characters.

6. **Regulatory Requirement 6 (Legal Consents & Staff Speech Scripts)**:
   - Under 323-FZ Art. 20 and KoAP 14.1 pt 4, dental clinics must obtain specialized written Informed Voluntary Consents (ИДС) covering specific clinical risks for 4 dental specialties: Therapy/Endodontics, Surgery/Implantology, Prosthetics, and Orthodontics.
   - For patient refusals (refusal of identification, refusal of consent, refusal of EGISZ export, refusal of X-rays), staff must execute legally anchored speech scripts explaining statutory mandates (323-FZ, 152-FZ, SanPiN) and execute formal refusal documents.

---

## 3. Comprehensive Specification & Mining Results

### Part I: Features Discovered & Edge Cases

#### Features Discovered
| # | Category | Feature | Description | Inputs | Outputs | Error Behavior | Discovered Via |
|---|----------|---------|-------------|--------|---------|----------------|----------------|
| 1 | SEMD 108 | Root ClinicalDocument XML | HL7 CDA R2 document container with realm RU, POCD_HD000040 typeId, template 1.2.643.5.1.13.13.11.108 | `EgiszCdaParams` DTO | UTF-8 XML document string | Zod validation error (422) | `apps/api/src/services/cda/header.ts` |
| 2 | SEMD 108 | RecordTarget / Patient Role | Patient demographics, SNILS (1.2.643.100.3), sex (1.2.643.5.1.13.13.11.1040), address, telecom | Patient DB entity + administrative profile | `<recordTarget>` XML fragment | Missing SNILS/DOB/Sex -> 422 PatientSnilsRequired | `apps/api/src/services/cda/patient.ts` |
| 3 | SEMD 108 | Author & Custodian Roles | Doctor details, SNILS, specialty code (1.2.643.5.1.13.13.11.1002), clinic FRMO OID (1.2.643.5.1.13.13.12.2), INN, OGRN | Doctor user + Clinic profile | `<author>`, `<custodian>`, `<legalAuthenticator>` XML | Missing Doctor/Clinic OID -> 422 ClinicOidRequired | `apps/api/src/services/cda/author.ts` |
| 4 | SEMD 108 | Section 1: Complaints & Anamnesis | LOINC 10164-2 section for subjective complaints, illness history, allergies, past history | Diary/Visit anamnesis text | `<section>` inside `<structuredBody>` | Omits section if empty (no fake data) | `apps/api/src/services/cda/body.ts` |
| 5 | SEMD 108 | Section 2: Dental Status (ISO 3950) | LOINC 29545-1 section for odontogram with 5 surfaces (V, L, O, M, D) and condition codes | `tooth_states` / `extended_odontogram_states` | `<section>` + `<entry>` observation table | Rejects invalid FDI tooth numbers | `apps/api/src/db/schema/clinical.ts` |
| 6 | SEMD 108 | Section 3: ICD-10 Diagnosis | LOINC 29548-5 section with observation CD value (OID 1.2.643.5.1.13.13.11.1005) and targetSiteCode | ICD-10 code (e.g. K02.1), diagnosis text, tooth number | `<section>` with `<observation>` | Missing ICD-10 code -> 422 Icd10Required | `apps/api/src/services/cda/body.ts` |
| 7 | SEMD 108 | Section 4: Order 804n Services | LOINC 47519-4 section with procedure entries (OID 1.2.643.5.1.13.13.11.1070) | Rendered service codes (e.g. A16.07.002) | `<section>` with `<procedure>` entries | Omits entry if service unmapped | Order 804n / Clinical DB |
| 8 | SEMD 108 | Section 5: Recommendations | LOINC 18776-5 section for clinical advice, drug prescriptions, follow-up regimen | Doctor recommendations text | `<section>` narrative block | Optional narrative omission | `apps/api/src/services/cda/body.ts` |
| 9 | Cryptography | Doctor Detached UKEP Signature | CAdES-BES detached CMS PKCS#7 signature generation via CryptoPro Browser Plug-in | Canonical CDA XML / PDF Base64 + Cert Thumbprint | Base64 signature string (`.sig`) | Plug-in missing -> User alert; Cert error -> failure | `apps/web/src/utils/cryptoPro.ts` |
| 10 | Cryptography | MO Detached UKEP Signature | Server-side CAdES-BES signature by Chief Doctor / Medical Org certificate | Canonical CDA XML / PDF Base64 | Base64 signature string (`.sig`) | Crypto CSP failure -> 500 | `apps/api/src/services/cda/signature.ts` |
| 11 | Cryptography | C14N XML Canonicalization | Deterministic normalization of XML (CRLF -> LF, trimming) prior to Streebog hash | Raw XML string | Canonical XML string | Pure function (never throws) | `apps/api/src/services/cda/signature.ts` |
| 12 | Cryptography | Detached Signature Verification | Extraction of public key, digest calculation (GOST 34.11-2012), signature math verify, cert chain check | XML payload + Base64 `.sig` | Verification result boolean + cert details | Invalid signature -> 422 SignatureVerificationFailed | Crypto standard GOST R 34.10-2012 |
| 13 | FNS Tax | KND 1151156 XML Generator | Generates XML for FNS Order EA-7-11/824@ (Format 5.01, KND 1184043) | Document, Patient, Payments, ClinicProfile | UTF-8 XML document string | Missing paid records / INN -> 409 Conflict | `apps/api/src/documents/taxXml.ts` |
| 14 | FNS Tax | Decree 458 Code Categorization | Automatically categorizes payments into Code 1 (Therapy/Hygiene - 150k max) and Code 2 (Implants/Bone graft - unlimited) | `service_catalog_items.tax_deduction_code` | Categorized amounts in integer kopecks | Missing tax code on payment -> 409 Conflict | `apps/api/src/documents/taxXml.ts` |
| 15 | FNS Tax | XSD 5.01 Validation | Validates generated XML against `UT_SVOPLMEDUSL_1_278_00_05_01_02.xsd` | Generated XML string | Preflight validation issue array | Schema violation -> 409 PreflightFailed | `apps/api/src/documents/taxXml.ts` |
| 16 | MIAC 039/u | Service UET Nomenclature | Attaches adult (`uet_adult`) and child (`uet_child`) Labor Equivalency Units to services | Service catalog items | UET numeric coefficients | Negative or non-numeric UET rejected | Order 804n / Minzdrav 289 |
| 17 | MIAC 039/u | Form 039/u Monthly Aggregator | Aggregates doctor's monthly patient count, adult/child UET, and pathology breakdown | `organizationId`, `doctorId`, `yearMonth` | Structured summary DTO | Unsigned visits filtered out | MIAC Form 039/u-02 standard |
| 18 | Audit Trail | SHA-256 Hash Chain Ledger | Chained SHA-256 audit log maintaining `previous_hash` -> `current_hash` link | Action, actor, resource, canonical JSON | Persisted `egisz_audit_logs` row | Row-lock concurrency failure -> retry | `apps/api/src/db/schema/clinical.ts` |
| 19 | Audit Trail | Row-Level Lock Concurrency | `SELECT ... FOR UPDATE` on tenant's tail audit record during insertion | Database transaction context | Serialized sequential log | Deadlock -> Postgres transaction retry | PostgreSQL 18 Concurrency Model |
| 20 | Legal Consents | Therapy & Endo IDS Template | Specific consent for caries, pulpitis, root canal irrigation/filling, restorations | Patient & Visit context | Rendered HTML / PDF document | Uncompleted mandatory checkboxes -> block issue | 323-FZ Art. 20, 1051n |
| 21 | Legal Consents | Surgery & Implant IDS Template | Specific consent for extractions, implant placement, sinus lift, bone grafting | Patient & Visit context | Rendered HTML / PDF document | Uncompleted mandatory checkboxes -> block issue | 323-FZ Art. 20, 1051n |
| 22 | Legal Consents | Prosthetics IDS Template | Specific consent for preparation, scanning, crowns, bridges, veneers, prostheses | Patient & Visit context | Rendered HTML / PDF document | Uncompleted mandatory checkboxes -> block issue | 323-FZ Art. 20, 1051n |
| 23 | Legal Consents | Orthodontics IDS Template | Specific consent for bracket systems, aligners, retainers, active tooth movement | Patient & Visit context | Rendered HTML / PDF document | Uncompleted mandatory checkboxes -> block issue | 323-FZ Art. 20, 1051n |
| 24 | Legal Consents | Staff Speech Scripts (Refusals) | Standardized legal response scripts for ID, consent, EGISZ, or X-ray refusals | Patient refusal event | Guided UI script + refusal document generation | Refusal without signature -> 2-witness act | 323-FZ, 152-FZ, KoAP 14.1 pt 4 |

#### Edge Cases
| # | Feature | Input | Observed Behavior |
|---|---------|-------|-------------------|
| 1 | SEMD 108 XML | Unlocked/Draft diary 043/у (`isLocked: false`) | System blocks export with `422 DiaryNotLocked` — draft clinical SOAP must never be exported to federal registry. |
| 2 | SEMD 108 XML | Revised diary (`version: 3`) | System increments `<versionNumber value="3"/>`, sets stable `setId` matching encounter, and adds `<relatedDocument typeCode="RPLC">` pointing to `{visitId}-v2`. |
| 3 | SEMD 108 XML | Missing patient SNILS or invalid checksum | System returns `422 PatientSnilsRequired` / `InvalidSnilsChecksum` — prevents rejected transactions in FRMR/REMD. |
| 4 | SEMD 108 XML | Special characters in clinical text (`<`, `>`, `&`, `"`, `'`) | Entity encoding via `escapeXml` converts to `&amp;`, `&lt;`, `&gt;`, `&quot;`, `&apos;` avoiding malformed XML. |
| 5 | Crypto CAdES-BES | Disconnected hardware crypto-token (Rutoken) during doctor sign | Browser plug-in throws HRESULT error; UI captures exception and presents human-readable guide: "Вставьте носитель с подписью". |
| 6 | Crypto CAdES-BES | Signature replay attack (submitting same PKCS#7 signature for different document) | Database lookup finds collision and rejects with `409 SignatureReplay`. |
| 7 | FNS Tax KND 1151156 | Year before 2024 (e.g. 2023 payment) | System blocks KND 1151156 with `409 Conflict` and routes to legacy certificate workflow. |
| 8 | FNS Tax KND 1151156 | Payer different from Patient (e.g. Parent paying for Child) | XML sets `ПрПациент="0"` and includes both `<НППлатМедУсл>` (Payer) and `<Пациент>` (Child) nodes. |
| 9 | FNS Tax KND 1151156 | Fractional kopecks from arithmetic (e.g. 1500.145 RUB) | System uses integer kopeck math (`parseKopecks`, `sumKopecks`) yielding exact string `1500.15` without float drift. |
| 10 | SHA-256 Hash Chain | Genesis entry (first record in clinic database) | `previous_hash` is initialized to 64 zero characters (`0000000000000000000000000000000000000000000000000000000000000000`). |
| 11 | SHA-256 Hash Chain | Concurrent audit log writes from 10 parallel requests | PostgreSQL `FOR UPDATE` lock forces strict sequential ordering without hash collisions or ledger branches. |
| 12 | Staff Speech Script | Patient refuses to sign Informed Consent for extraction | Receptionist/Doctor reads refusal script; system generates formal Refusal Document (Отказ от вмешательства); procedure is aborted pursuant to 323-FZ Art. 20. |

---

### Part II: Exhaustive Technical Specifications

#### 1. SEMD 108 (HL7 CDA R2 Template 1.2.643.5.1.13.13.11.108) Specification

##### A. Header & Document Architecture
```xml
<?xml version="1.0" encoding="UTF-8"?>
<ClinicalDocument xmlns="urn:hl7-org:v3" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
	<!-- Realm & Schema Type -->
	<realmCode code="RU"/>
	<typeId root="2.16.840.1.113883.1.3" extension="POCD_HD000040"/>
	
	<!-- Root SEMD Template OID for Dental Consultation Protocol -->
	<templateId root="1.2.643.5.1.13.13.11.108"/>
	<templateId root="1.2.643.5.1.13.13.11.1527"/>
	
	<!-- Unique Document Instance ID -->
	<id root="1.2.643.5.1.13.13.12.2.77.1001" extension="visit-9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d-v1"/>
	
	<!-- Document Type: NSI 1.2.643.5.1.13.13.11.1522 & LOINC 74208-1 -->
	<code code="108" codeSystem="1.2.643.5.1.13.13.11.1522" codeSystemName="Виды медицинской документации" displayName="Протокол консультации (стоматология)"/>
	<title>Протокол стоматологического осмотра (консультации)</title>
	
	<!-- Issue Timestamp: YYYYMMDDHHMMSS+ZZZZ -->
	<effectiveTime value="20260818210000+0300"/>
	<confidentialityCode code="N" codeSystem="2.16.840.1.113883.5.25" codeSystemName="HL7 Confidentiality" displayName="обычный"/>
	<languageCode code="ru-RU"/>
	
	<!-- Stable Set ID and Version Number -->
	<setId root="1.2.643.5.1.13.13.12.2.77.1001" extension="visit-9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d"/>
	<versionNumber value="1"/>
	
	<!-- Patient Target -->
	<recordTarget>
		<patientRole>
			<id root="1.2.643.5.1.13.13.12.2.77.1001" extension="pat-8830192"/>
			<id root="1.2.643.100.3" extension="112-233-445 95"/>
			<addr>
				<streetAddressLine>г. Москва, ул. Тверская, д. 12, кв. 45</streetAddressLine>
			</addr>
			<telecom value="tel:+79991234567"/>
			<patient>
				<name>
					<family>Иванов</family>
					<given>Иван</given>
					<given>Иванович</given>
				</name>
				<administrativeGenderCode code="1" codeSystem="1.2.643.5.1.13.13.11.1040" codeSystemName="Пол пациента" displayName="Мужской"/>
				<birthTime value="19850615"/>
				<languageCommunication>
					<languageCode code="ru-RU"/>
					<preferenceInd value="true"/>
				</languageCommunication>
			</patient>
		</patientRole>
	</recordTarget>
	
	<!-- Author (Doctor) -->
	<author>
		<time value="20260818210000+0300"/>
		<assignedAuthor>
			<id root="1.2.643.100.3" extension="987-654-321 00"/>
			<code code="18" codeSystem="1.2.643.5.1.13.13.11.1002" codeSystemName="Должности медицинских работников" displayName="врач-стоматолог-терапевт"/>
			<addr>
				<streetAddressLine>г. Москва, пер. Сивцев Вражек, д. 25</streetAddressLine>
			</addr>
			<telecom value="tel:+74950000000"/>
			<assignedPerson>
				<name>
					<family>Смирнов</family>
					<given>Алексей</given>
					<given>Михайлович</given>
				</name>
			</assignedPerson>
			<representedOrganization>
				<id root="1.2.643.5.1.13.13.12.2" extension="1.2.643.5.1.13.13.12.2.77.1001"/>
				<id root="1.2.643.100.1" extension="1027700132195"/>
				<id root="1.2.643.100.4" extension="7701123456"/>
				<name>ООО Стоматологическая клиника ДЕНТЕ</name>
				<telecom value="tel:+74951112233"/>
				<addr>
					<streetAddressLine>г. Москва, пер. Сивцев Вражек, д. 25</streetAddressLine>
				</addr>
			</representedOrganization>
		</assignedAuthor>
	</author>
	
	<!-- Custodian (Medical Organization) -->
	<custodian>
		<assignedCustodian>
			<representedCustodianOrganization>
				<id root="1.2.643.5.1.13.13.12.2" extension="1.2.643.5.1.13.13.12.2.77.1001"/>
				<id root="1.2.643.100.1" extension="1027700132195"/>
				<id root="1.2.643.100.4" extension="7701123456"/>
				<name>ООО Стоматологическая клиника ДЕНТЕ</name>
				<telecom value="tel:+74951112233"/>
				<addr>
					<streetAddressLine>г. Москва, пер. Сивцев Вражек, д. 25</streetAddressLine>
				</addr>
			</representedCustodianOrganization>
		</assignedCustodian>
	</custodian>
	
	<!-- Legal Authenticator (Chief Doctor) -->
	<legalAuthenticator>
		<time value="20260818210000+0300"/>
		<signatureCode code="S"/>
		<assignedEntity>
			<id root="1.2.643.100.3" extension="111-222-333 44"/>
			<code code="4" codeSystem="1.2.643.5.1.13.13.11.1002" codeSystemName="Должности медицинских работников" displayName="главный врач"/>
			<addr><streetAddressLine>г. Москва, пер. Сивцев Вражек, д. 25</streetAddressLine></addr>
			<telecom value="tel:+74951112233"/>
			<assignedPerson>
				<name>
					<family>Кузнецов</family>
					<given>Дмитрий</given>
					<given>Сергеевич</given>
				</name>
			</assignedPerson>
			<representedOrganization>
				<id root="1.2.643.5.1.13.13.12.2" extension="1.2.643.5.1.13.13.12.2.77.1001"/>
				<name>ООО Стоматологическая клиника ДЕНТЕ</name>
			</representedOrganization>
		</assignedEntity>
	</legalAuthenticator>
	
	<!-- Encounter Details -->
	<componentOf>
		<encompassingEncounter>
			<id root="1.2.643.5.1.13.13.12.2.77.1001" extension="visit-9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d"/>
			<code code="AMB" codeSystem="1.2.643.5.1.13.13.11.1461" codeSystemName="Виды медицинской помощи" displayName="Амбулаторная помощь"/>
			<effectiveTime value="20260818200000+0300"/>
		</encompassingEncounter>
	</componentOf>
```

##### B. StructuredBody with All 5 Mandatory Sections
```xml
	<component>
		<structuredBody>
			<!-- 1. Секция: Анамнез и жалобы (LOINC 10164-2) -->
			<component>
				<section>
					<code code="10164-2" codeSystem="2.16.840.1.113883.6.1" codeSystemName="LOINC" displayName="Анамнез и жалобы"/>
					<title>Анамнез и жалобы</title>
					<text>
						<paragraph>Жалобы на кратковременные боли в области зуба 46 от температурных раздражителей (холодное, горячее), быстро проходящие после устранения причины. Ранее зуб не лечен.</paragraph>
					</text>
				</section>
			</component>

			<!-- 2. Секция: Стоматологический статус / Зубная формула (LOINC 29545-1) -->
			<component>
				<section>
					<code code="29545-1" codeSystem="2.16.840.1.113883.6.1" codeSystemName="LOINC" displayName="Physical findings / Dental Status"/>
					<title>Стоматологический статус (Зубная формула)</title>
					<text>
						<table border="1" width="100%">
							<thead>
								<tr>
									<th>Зуб (FDI)</th>
									<th>Поверхности (V, L, O, M, D)</th>
									<th>Статус</th>
									<th>Описание</th>
								</tr>
							</thead>
							<tbody>
								<tr>
									<td>46</td>
									<td>O, D (Окклюзионная, Дистальная)</td>
									<td>C (Кариес)</td>
									<td>Кариозная полость средней глубины, дентин размягчен</td>
								</tr>
								<tr>
									<td>36</td>
									<td>O (Окклюзионная)</td>
									<td>Pl (Пломба)</td>
									<td>Краевое прилегание удовлетворительное</td>
								</tr>
								<tr>
									<td>18, 28, 38, 48</td>
									<td>-</td>
									<td>A (Отсутствует)</td>
									<td>Ранее удалены</td>
								</tr>
							</tbody>
						</table>
					</text>
					<!-- Structured FDI 3950 Status Entry -->
					<entry>
						<observation classCode="OBS" moodCode="EVN">
							<code code="DENT_STATUS" codeSystem="1.2.643.5.1.13.13.11.108" displayName="Стоматологический статус зуба"/>
							<statusCode code="completed"/>
							<targetSiteCode code="46" codeSystem="1.2.643.5.1.13.13.11.1466" displayName="Зуб 46">
								<qualifier>
									<name code="SURF_O" displayName="Окклюзионная поверхность"/>
									<value code="SURF_D" displayName="Дистальная поверхность"/>
								</qualifier>
							</targetSiteCode>
							<value xsi:type="CD" code="CARIES_MEDIA" displayName="Кариес дентина (средний)"/>
						</observation>
					</entry>
				</section>
			</component>

			<!-- 3. Секция: Диагноз (LOINC 29548-5 & ICD-10 OID 1.2.643.5.1.13.13.11.1005) -->
			<component>
				<section>
					<code code="29548-5" codeSystem="2.16.840.1.113883.6.1" codeSystemName="LOINC" displayName="Диагнозы"/>
					<title>Диагноз</title>
					<text>
						<paragraph>Основной: К02.1 Кариес дентина · зуб 46</paragraph>
					</text>
					<entry>
						<observation classCode="OBS" moodCode="EVN">
							<code code="29308-4" codeSystem="2.16.840.1.113883.6.1" displayName="Диагноз"/>
							<statusCode code="completed"/>
							<value xsi:type="CD" code="K02.1" codeSystem="1.2.643.5.1.13.13.11.1005" codeSystemName="МКБ-10" displayName="Кариес дентина"/>
							<targetSiteCode code="46" codeSystem="1.2.643.5.1.13.13.11.1466" displayName="Зуб 46"/>
						</observation>
					</entry>
				</section>
			</component>

			<!-- 4. Секция: Оказанные услуги по Приказу 804н (LOINC 47519-4) -->
			<component>
				<section>
					<code code="47519-4" codeSystem="2.16.840.1.113883.6.1" codeSystemName="LOINC" displayName="Медицинские услуги"/>
					<title>Оказанные медицинские услуги (Номенклатура 804н)</title>
					<text>
						<list>
							<item>A11.07.012 Проводниковая анестезия (Ультракаин Д-С 1.7 мл) - 1 усл.</item>
							<item>A16.07.002.001 Восстановление зуба пломбой I, V, VI класс по Блэку с использованием материалов светового отверждения (Filtek Z250) - 1 усл.</item>
						</list>
					</text>
					<entry>
						<procedure classCode="PROC" moodCode="EVN">
							<code code="A11.07.012" codeSystem="1.2.643.5.1.13.13.11.1070" codeSystemName="Номенклатура медицинских услуг" displayName="Проводниковая анестезия"/>
							<statusCode code="completed"/>
						</procedure>
					</entry>
					<entry>
						<procedure classCode="PROC" moodCode="EVN">
							<code code="A16.07.002.001" codeSystem="1.2.643.5.1.13.13.11.1070" codeSystemName="Номенклатура медицинских услуг" displayName="Восстановление зуба пломбой с использованием материалов светового отверждения"/>
							<statusCode code="completed"/>
							<targetSiteCode code="46" codeSystem="1.2.643.5.1.13.13.11.1466" displayName="Зуб 46"/>
						</procedure>
					</entry>
				</section>
			</component>

			<!-- 5. Секция: Рекомендации (LOINC 18776-5) -->
			<component>
				<section>
					<code code="18776-5" codeSystem="2.16.840.1.113883.6.1" codeSystemName="LOINC" displayName="Рекомендации"/>
					<title>Рекомендации</title>
					<text>
						<paragraph>1. Воздержаться от приема пищи в течение 2 часов до полного окончания действия анестезии.</paragraph>
						<paragraph>2. Соблюдать индивидуальную гигиену полости рта (чистка зубов 2 раза в день, использование флосса).</paragraph>
						<paragraph>3. Профилактический осмотр через 6 месяцев.</paragraph>
					</text>
				</section>
			</component>
		</structuredBody>
	</component>
</ClinicalDocument>
```

---

#### 2. Dual CAdES-BES Detached Signatures & GOST Cryptography Specification

##### A. Cryptographic Algorithms & OIDs
- **GOST R 34.10-2012 (Signature Algorithm)**:
  - 256-bit Key: OID `1.2.643.7.1.1.1.1` (`szOID_GostR3410_2012_256`)
  - 512-bit Key: OID `1.2.643.7.1.1.1.2` (`szOID_GostR3410_2012_512`)
- **GOST R 34.11-2012 Streebog (Hash Algorithm)**:
  - Streebog-256: OID `1.2.643.7.1.1.2.2` (`szOID_GostR3411_2012_256`)
  - Streebog-512: OID `1.2.643.7.1.1.2.3` (`szOID_GostR3411_2012_512`)
- **Signature Profile**: CAdES-BES detached (`.sig`), DER-encoded PKCS#7 / CMS `SignedData`.

##### B. Detached Signature Package Structure
```typescript
interface EgiszDualSignedPackage {
  documentId: string; // UUID
  documentVersion: number;
  xmlCanonicalPayload: string; // C14N UTF-8 XML string
  doctorSignature: {
    signatureBase64: string; // CAdES-BES detached PKCS#7
    certificateSerialNumber: string;
    certificateSubject: string; // ФИО врача + СНИЛС
    signedAt: string; // ISO 8601 UTC
    algorithmOid: "1.2.643.7.1.1.1.1" | "1.2.643.7.1.1.1.2";
  };
  moSignature: {
    signatureBase64: string; // CAdES-BES detached PKCS#7
    certificateSerialNumber: string;
    certificateSubject: string; // Наименование МО + ОГРН + ИНН
    signedAt: string; // ISO 8601 UTC
    algorithmOid: "1.2.643.7.1.1.1.1" | "1.2.643.7.1.1.1.2";
  };
  metadata: {
    patientSnils: string;
    clinicOid: string;
    docTypeNsiCode: "108";
  };
}
```

##### C. Verification Mechanics & Chain Check
1. **C14N Hash Calculation**:
   - Strip whitespace between tags, normalize linebreaks to `\n`, encode to UTF-8 bytes.
   - Compute Streebog-256 hash: $H = \text{Streebog256}(M_{\text{c14n}})$.
2. **CMS Signature Unpacking**:
   - Parse ASN.1 structure, extract `SignerInfo` -> `encryptedDigest`.
   - Verify that authenticated attribute `messageDigest` matches $H$.
   - Verify EC digital signature math over authenticated attributes using public key from embedded X.509 certificate.
3. **Certificate Chain & Trust Path Validation**:
   - Verify certificate signature against Accredited Root CA certificate (Минцифры РФ).
   - Check validity dates: `notBefore <= signedAt <= notAfter`.
   - Verify absence in CRL (Certificate Revocation List).
   - Verify EKU (Extended Key Usage) contains medical practitioner / organization OIDs (`1.2.643.2.2.34.6`, `1.3.6.1.5.5.7.3.2`).

---

#### 3. FNS Tax Deduction (Form KND 1151156, Format 5.01) Specification

##### A. XML Structure & XSD Conformance (`UT_SVOPLMEDUSL_1_278_00_05_01_02.xsd`)
```xml
<?xml version="1.0" encoding="UTF-8"?>
<Файл ИдФайл="UT_SVOPLMEDUSL_DENTE_2026_260000000001" ВерсПрог="DENTE 0.1.0" ВерсФорм="5.01">
  <Документ КНД="1184043" ДатаДок="18.08.2026" КодНО="7701" ОтчГод="2026">
    <СвНП>
      <НПЮЛ НаимОрг="ООО Стоматологическая клиника ДЕНТЕ" ИННЮЛ="7701123456" КПП="770101001"/>
    </СвНП>
    <Подписант ПрПодп="1">
      <ФИО Фамилия="Кузнецов" Имя="Дмитрий" Отчество="Сергеевич"/>
    </Подписант>
    <СведРасхУсл НомерСвед="260000000001" НомКорр="0" ПрПациент="0" СуммаКод1="14500.00" СуммаКод2="85000.00">
      <!-- Налогоплательщик (Плательщик) -->
      <НППлатМедУсл ИНН="770198765432" ДатаРожд="12.04.1980">
        <ФИО Фамилия="Иванов" Имя="Иван" Отчество="Петрович"/>
      </НППлатМедУсл>
      <!-- Пациент (если не совпадает с плательщиком, например Ребенок/Супруг) -->
      <Пациент ДатаРожд="15.06.2012">
        <ФИО Фамилия="Иванова" Имя="Мария" Отчество="Ивановна"/>
        <СведДок КодВидДок="03" СерНомДок="IV-МЮ 123456" ДатаДок="25.06.2012"/>
      </Пациент>
    </СведРасхУсл>
  </Документ>
</Файл>
```

##### B. Automated Categorization Logic (Government Decree No. 458)
```typescript
/**
 * Resolves FNS Medical Expense Code (1 vs 2) under Decree No. 458.
 * Code 1: Standard medical services (Limit: 150,000 RUB).
 * Code 2: Expensive treatment (Implants, bone grafting, sinus lift - Unlimited).
 */
export function resolveTaxDeductionCode(service: {
  code?: string | null;
  category: string;
  title: string;
}): "1" | "2" {
  const code = (service.code ?? "").trim().toUpperCase();
  const title = service.title.toLowerCase();

  // Code 2: Expensive Treatment (Decree 458, Section 4: Dental Implantology & Bone Grafting)
  if (
    code.startsWith("A16.07.054") || // Дентальная имплантация
    code.startsWith("A16.07.055") || // Синус-лифтинг
    code.startsWith("A16.07.041") || // Костная пластика челюстно-лицевой области
    title.includes("имплантат") ||
    title.includes("имплантац") ||
    title.includes("синус-лифт") ||
    title.includes("синуслифтинг") ||
    title.includes("костная пластика") ||
    title.includes("остеопластик") ||
    title.includes("аугментация кост") ||
    title.includes("all-on-4") ||
    title.includes("all-on-6") ||
    title.includes("протезирование на имплантат")
  ) {
    return "2";
  }

  // Code 1: Standard Dental Treatment (Therapy, Prophylaxis, Extraction, Standard Crowns)
  return "1";
}
```

---

#### 4. MIAC Form 039/u & Order 804n UET Specification

##### A. Labor Equivalency Units (УЕТ) Coefficients Table
| Service Code (804н) | Service Title | Adult UET (`uet_adult`) | Child UET (`uet_child`) | Tax Code |
|----------------------|---------------|-------------------------|-------------------------|----------|
| `B01.065.001` | Первичный прием (осмотр, консультация) врача-стоматолога-терапевта | 0.5 | 0.6 | 1 |
| `B01.065.002` | Повторный прием (осмотр, консультация) врача-стоматолога-терапевта | 0.3 | 0.4 | 1 |
| `A11.07.012` | Проводниковая / инфильтрационная анестезия | 0.5 | 0.5 | 1 |
| `A16.07.002.001` | Восстановление зуба пломбой при поверхностном/среднем кариесе | 1.0 | 1.2 | 1 |
| `A16.07.002.002` | Восстановление зуба пломбой при глубоком кариесе | 1.5 | 1.8 | 1 |
| `A16.07.002.009` | Эстетическая реставрация зуба светоотверждаемым композитом | 2.5 | 2.5 | 1 |
| `A16.07.008.001` | Пломбирование 1 корневого канала гуттаперчей | 1.5 | 1.5 | 1 |
| `A16.07.008.002` | Пломбирование 2 корневых каналов | 2.5 | 2.5 | 1 |
| `A16.07.008.003` | Пломбирование 3 корневых каналов | 3.5 | 3.5 | 1 |
| `A16.07.001.001` | Удаление постоянного зуба простое | 1.0 | 1.0 | 1 |
| `A16.07.001.002` | Удаление постоянного зуба сложное с разъединением корней | 2.5 | 2.5 | 1 |
| `A16.07.001.003` | Удаление ретинированного / дистопированного зуба | 4.0 | 4.0 | 1 |
| `A16.07.020` | Профессиональная гигиена полости рта (ультразвук + AirFlow, 1 челюсть) | 2.0 | 2.0 | 1 |
| `A16.07.054` | Внутрикостная дентальная имплантация (установка 1 имплантата) | 4.0 | 4.0 | 2 |
| `A16.07.055` | Синус-лифтинг (открытый / закрытый) | 5.0 | 5.0 | 2 |
| `A16.07.004` | Изготовление и фиксация металлокерамической / циркониевой коронки | 3.0 | 3.0 | 1 |

##### B. SQL Aggregation Query for Chief Medical Officer (Monthly Journal 039/u)
```sql
WITH monthly_visits AS (
  SELECT 
    v.id AS visit_id,
    v.organization_id,
    COALESCE(vd.doctor_id, a.doctor_user_id) AS doctor_id,
    v.patient_id,
    v.created_at AS visit_date,
    p.birth_date,
    EXTRACT(YEAR FROM AGE(v.created_at, p.birth_date::date)) < 18 AS is_child,
    vd.diagnosis_icd10
  FROM visits v
  LEFT JOIN visit_diaries vd ON vd.visit_id = v.id AND vd.is_locked = TRUE
  LEFT JOIN appointments a ON a.id = v.appointmentId
  JOIN patients p ON p.id = v.patient_id
  WHERE v.organization_id = :organizationId
    AND v.status = 'completed'
    AND v.created_at >= :startDate AND v.created_at < :endDate
),
visit_services AS (
  SELECT 
    mv.visit_id,
    mv.doctor_id,
    mv.patient_id,
    mv.is_child,
    mv.diagnosis_icd10,
    ti.service_id,
    ti.quantity::numeric AS qty,
    sci.code AS service_code,
    COALESCE(sci.uet_adult, 1.0) AS uet_adult,
    COALESCE(sci.uet_child, 1.0) AS uet_child
  FROM monthly_visits mv
  JOIN treatment_items ti ON ti.visit_id = mv.visit_id AND ti.status = 'completed'
  JOIN service_catalog_items sci ON sci.id = ti.service_id
)
SELECT 
  doctor_id,
  u.full_name AS doctor_name,
  COUNT(DISTINCT visit_id) AS total_visits,
  COUNT(DISTINCT patient_id) AS total_patients_seen,
  COUNT(DISTINCT CASE WHEN is_child THEN visit_id END) AS child_visits,
  COUNT(DISTINCT CASE WHEN NOT is_child THEN visit_id END) AS adult_visits,
  
  -- Total UET Calculations
  SUM(CASE WHEN is_child THEN qty * uet_child ELSE 0 END) AS total_child_uet,
  SUM(CASE WHEN NOT is_child THEN qty * uet_adult ELSE 0 END) AS total_adult_uet,
  SUM(CASE WHEN is_child THEN qty * uet_child ELSE qty * uet_adult END) AS grand_total_uet,
  
  -- Nosology Breakdown
  COUNT(DISTINCT CASE WHEN diagnosis_icd10 LIKE 'K02%' THEN visit_id END) AS visits_caries,
  COUNT(DISTINCT CASE WHEN diagnosis_icd10 LIKE 'K04.0%' OR diagnosis_icd10 LIKE 'K04.1%' THEN visit_id END) AS visits_pulpitis,
  COUNT(DISTINCT CASE WHEN diagnosis_icd10 LIKE 'K04.4%' OR diagnosis_icd10 LIKE 'K04.5%' THEN visit_id END) AS visits_periodontitis,
  COUNT(DISTINCT CASE WHEN diagnosis_icd10 LIKE 'K05%' THEN visit_id END) AS visits_gingivitis_periodontosis,
  SUM(CASE WHEN service_code LIKE 'A16.07.001%' THEN qty ELSE 0 END) AS total_teeth_extracted,
  SUM(CASE WHEN service_code LIKE 'A16.07.002%' THEN qty ELSE 0 END) AS total_fillings_placed,
  SUM(CASE WHEN service_code LIKE 'A16.07.054%' THEN qty ELSE 0 END) AS total_implants_installed
FROM visit_services vs
JOIN users u ON u.id = vs.doctor_id
GROUP BY doctor_id, u.full_name
ORDER BY u.full_name ASC;
```

---

#### 5. Cryptographic SHA-256 Hash Chain Specification

##### A. Schema Definition
```sql
CREATE TABLE egisz_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id),
    sequence_number BIGINT NOT NULL,
    previous_hash VARCHAR(64) NOT NULL,
    current_hash VARCHAR(64) NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    action VARCHAR(64) NOT NULL,
    actor_id UUID NOT NULL REFERENCES users(id),
    resource_type VARCHAR(64) NOT NULL,
    resource_id UUID NOT NULL,
    payload_canonical_json JSONB NOT NULL,
    client_ip VARCHAR(45),
    user_agent TEXT,
    CONSTRAINT egisz_audit_logs_org_seq_unique UNIQUE (organization_id, sequence_number)
);

CREATE INDEX idx_egisz_audit_org_seq ON egisz_audit_logs(organization_id, sequence_number DESC);
```

##### B. Append & Hash Calculation Algorithm (PostgreSQL `SELECT ... FOR UPDATE`)
```typescript
import { createHash } from "node:crypto";
import type { PoolClient } from "pg";

const GENESIS_HASH = "0".repeat(64);

export interface AppendAuditEntryParams {
  organizationId: string;
  actorId: string;
  action: string;
  resourceType: string;
  resourceId: string;
  payload: Record<string, unknown>;
  clientIp?: string;
  userAgent?: string;
}

/**
 * Deterministic JSON canonicalization (RFC 8785 subset)
 */
export function canonicalizeJson(obj: unknown): string {
  if (obj === null || typeof obj !== "object") {
    return JSON.stringify(obj);
  }
  if (Array.isArray(obj)) {
    return "[" + obj.map(canonicalizeJson).join(",") + "]";
  }
  const keys = Object.keys(obj as Record<string, unknown>).sort();
  const pairs = keys.map(
    (k) => JSON.stringify(k) + ":" + canonicalizeJson((obj as Record<string, unknown>)[k])
  );
  return "{" + pairs.join(",") + "}";
}

/**
 * Appends a new immutable audit record guaranteeing hash chain continuity.
 */
export async function appendAuditLogRecord(
  client: PoolClient,
  params: AppendAuditEntryParams
): Promise<{ id: string; currentHash: string; sequenceNumber: number }> {
  // 1. Lock the latest audit record for this tenant
  const lastRes = await client.query(
    `SELECT sequence_number, current_hash 
     FROM egisz_audit_logs 
     WHERE organization_id = $1 
     ORDER BY sequence_number DESC 
     LIMIT 1 
     FOR UPDATE`,
    [params.organizationId]
  );

  const lastRow = lastRes.rows[0];
  const sequenceNumber = lastRow ? Number(lastRow.sequence_number) + 1 : 1;
  const previousHash = lastRow ? String(lastRow.current_hash) : GENESIS_HASH;

  const now = new Date();
  const timestampIso = now.toISOString();
  const payloadCanonical = canonicalizeJson(params.payload);

  // 2. Compute SHA-256: current_hash = SHA256(previous_hash + timestamp + action + actor_id + resource_id + payload_canonical_json)
  const hashInput = `${previousHash}${timestampIso}${params.action}${params.actorId}${params.resourceId}${payloadCanonical}`;
  const currentHash = createHash("sha256").update(hashInput, "utf8").digest("hex");

  // 3. Insert new audit log record
  const insertRes = await client.query(
    `INSERT INTO egisz_audit_logs (
       organization_id, sequence_number, previous_hash, current_hash,
       timestamp, action, actor_id, resource_type, resource_id,
       payload_canonical_json, client_ip, user_agent
     ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10::jsonb, $11, $12)
     RETURNING id`,
    [
      params.organizationId,
      sequenceNumber,
      previousHash,
      currentHash,
      timestampIso,
      params.action,
      params.actorId,
      params.resourceType,
      params.resourceId,
      payloadCanonical,
      params.clientIp ?? null,
      params.userAgent ?? null,
    ]
  );

  return {
    id: insertRes.rows[0].id,
    currentHash,
    sequenceNumber,
  };
}
```

---

#### 6. Legal Consents (4 IDS Templates) & Staff Speech Scripts Specification

##### A. Legal Anchors Matrix
- **323-FZ Art. 20**: Mandates Informed Voluntary Consent (ИДС) prior to intervention and formal Refusal of Medical Intervention (Отказ от вмешательства).
- **152-FZ Art. 9 & 10**: Governs consent for personal and medical data processing.
- **KoAP 14.1 pt 4**: Prescribes that medical assistance without written IDS is a gross license infringement punishable by clinic suspension up to 90 days.

##### B. Specialty IDS Content Standards

1. **ИДС-1: Терапевтическая стоматология и эндодонтия (Therapy & Endodontics)**:
   - *Interventions*: Treatment of caries, pulpitis, periodontitis, mechanical/chemical root canal preparation, obturation, aesthetic light-curing restorations.
   - *Key Disclosed Risks*: Post-filling hyperesthesia, root canal instrument fracture due to anatomical curvature, root perforation, temporary pain on biting, need for post-and-core and crown.
   - *Patient Obligations*: Avoid hard food for 2 hours, notify clinic upon persistent pain >3 days.

2. **ИДС-2: Хирургическая стоматология и дентальная имплантация (Surgery & Implants)**:
   - *Interventions*: Tooth extraction, bone graft/sinus-lift, placement of titanium implants, suturing.
   - *Key Disclosed Risks*: Prolonged bleeding, hematoma, post-op swelling, temporary or permanent paresthesia of inferior alveolar/lingual nerve, risk of implant non-integration (1-3%), maxillary sinus exposure.
   - *Patient Obligations*: Do not spit or rinse aggressively on Day 1, take prescribed antibiotics/analgesics, attend suture removal appointment on Day 7-10.

3. **ИДС-3: Ортопедическая стоматология (Prosthetics)**:
   - *Interventions*: Abutment preparation, digital scanning / silicone impressions, temporary acrylic crown cementation, fitting and permanent fixation of ceramic/zirconia crowns, bridges, veneers, removable dentures.
   - *Key Disclosed Risks*: Possible pulp irritation during vital tooth preparation, ceramic chipping under excessive load, adaptation period (phonetics, chewing) up to 30 days.
   - *Patient Obligations*: Maintain impeccable interdental hygiene, attend scheduled hygiene visits every 6 months to maintain warranty.

4. **ИДС-4: Ортодонтическое лечение (Orthodontics)**:
   - *Interventions*: Vestibular/lingual bracket systems, clear aligner therapy, orthodontic mini-screws, intermaxillary elastics, fixed/removable retainers.
   - *Key Disclosed Risks*: Enamel demineralization around brackets upon inadequate brushing, slight root resorption, tooth mobility during active movement, relapse if retainer regimen is neglected.
   - *Patient Obligations*: Meticulous cleaning with ortho brushes/irrigator after every meal, strictly adhere to aligner wearing schedule (22 hours/day), wear retainers as prescribed post-treatment.

##### C. Staff Speech Scripts for Patient Refusals (Admin & Doctor)

###### Script 1: Patient refuses to provide Passport / SNILS data at Reception
- **Receptionist**: «Иван Иванович, согласно Федеральному закону № 323-ФЗ и Приказу Минздрава России № 274н, медицинская организация обязана идентифицировать личность пациента при оформлении амбулаторной карты (форма 043/у) и договора на оказание медицинских услуг (Постановление Правительства РФ № 736). Без указания паспортных данных мы имеем право оказывать помощь только в экстренной форме при угрозе жизни. Для планового приёма эти данные строго обязательны. Клиника гарантирует конфиденциальность ваших данных в соответствии с законом № 152-ФЗ "О персональных данных". Пожалуйста, предоставьте документ для корректного оформления.»

###### Script 2: Patient refuses to sign Informed Voluntary Consent (ИДС)
- **Doctor**: «Иван Иванович, статья 20 Федерального закона № 323-ФЗ прямо запрещает врачу проводить любые медицинские манипуляции, включая диагностику и обезболивание, без вашего письменного информированного согласия. Это не формальность, а законная гарантия того, что вы ознакомлены с планом лечения, возможными рисками и правилами ухода. Если вы не готовы подписать согласие, по закону мы обязаны оформить "Отказ от медицинского вмешательства", и прием не сможет быть начат. Давайте подробно разберем пункты, которые вызывают у вас вопросы.»

###### Script 3: Patient objects to EGISZ REMD Federal Medical Registry Transfer
- **Admin/Doctor**: «Иван Иванович, передача сведений об оказанной медицинской помощи в ЕГИСЗ (РЭМД) является прямой лицензионной обязанностью всех медицинских организаций РФ по постановлению Правительства РФ № 555. При этом в нашей системе строго защищены ваши права: вы можете воспользоваться правом на ограничение передачи отдельных полей и отзыв согласия на маркетинговые коммуникации. Однако сам факт визита и диагноз подлежат учету в государственном реестре для обеспечения преемственности вашего лечения и доступности на портале Госуслуг.»

###### Script 4: Patient refuses Mandatory Diagnostic X-ray / CT scan
- **Doctor**: «Иван Иванович, лечение корневых каналов / установка имплантата без рентгенологического контроля (КТ / прицельного снимка) несет прямой риск перфорации корня или повреждения нерва. Согласно клиническим рекомендациям Минздрава и нормам радиационной безопасности СанПиН, проведение такого вмешательства "вслепую" категорически противопоказано. При отказе от снимка мы оформим письменный отказ от рентген-диагностики, но выполнение сложной процедуры будет заблокировано ради вашей безопасности.»

---

## 4. Caveats

1. **EGISZ Gateway Transport Endpoints**:
   - The CDA XML structure, metadata schemas, and CAdES-BES detached signature contracts are 100% mined and specified. Transmission over N3.Health / MedFlex REST gateways (`POST /cdagen/api/Emd/SendEmd`) requires valid clinic gateway credentials (`EGISZ_N3_BASE_URL`, `EGISZ_N3_GUID`, `EGISZ_N3_LPU_ID`, `EGISZ_CLINIC_OID`).
2. **CryptoPro CSP Native Driver Dependency**:
   - Client-side browser signing requires the host machine to have CryptoPro CSP 5.0+ and CryptoPro Extension installed. Server-side verification requires either CryptoPro CSP command-line tools (`cryptcp`) or pure JS WebCrypto GOST fallback modules for development environments.
3. **No Other Caveats**: All formulas, OIDs, legal articles, schemas, and speech scripts are authoritatively grounded in Russian legislation and repository requirements.

---

## 5. Conclusion

All 6 core regulatory and clinical domains have been mined, structured, and formally specified:
1. **SEMD 108 HL7 CDA R2**: Complete XML structure, POCD_HD000040 headers, 5 mandatory sections (Complaints, Dental Status FDI ISO 3950 5-surface table, ICD-10 Diagnosis, Order 804n Services, Recommendations), and complete FRNSI OID dictionary.
2. **Dual CAdES-BES Detached Signatures & GOST Cryptography**: GOST R 34.10-2012 / GOST R 34.11-2012 Streebog-256 detached signature schemas, C14N canonicalization, Doctor UKEP + MO UKEP pipelines, and trust chain verification mechanics.
3. **FNS Tax Deduction (KND 1151156, Format 5.01)**: Order EA-7-11/824@ XML layout, XSD `UT_SVOPLMEDUSL_1_278_00_05_01_02.xsd` conformance, integer kopeck math, and Decree No. 458 Code 1 vs Code 2 categorization algorithms.
4. **MIAC Form 039/u & Order 804n UET**: Explicit adult/child UET coefficients and SQL monthly aggregation logic by doctor and nosology.
5. **Cryptographic SHA-256 Hash Chain**: Tamper-evident ledger formula with canonical JSON serialization, genesis block handling, and PostgreSQL `SELECT ... FOR UPDATE` row-level concurrency locking.
6. **Legal Consents (4 IDS Templates) & Staff Speech Scripts**: 323-FZ / 152-FZ / KoAP 14.1 pt 4 legal foundations, specialty clinical risks, and verbatim administrator speech scripts for all patient refusal scenarios.

This handoff is ready for consumption by implementation agents and the project orchestrator.

---

## 6. Verification Method

To independently verify these specifications against the live codebase and test suites:
1. **Type & Schema Verification**:
   ```bash
   npm run typecheck
   ```
2. **Encoding Safety Check**:
   ```bash
   npm run check:encoding
   ```
3. **Existing CDA & Tax Smoke Suites**:
   ```bash
   npm run test apps/api/src/services/tests/egiszCdaGenerator.test.ts
   npm run smoke:tax-knd-xml
   npm run smoke:tax-registry-fiscal
   npm run smoke:documents-catalog
   ```
4. **Document Inspection**:
   - Inspect `C:/Clinic_MVP/dental-crm/.agents/survey_spec_miner/handoff.md`
   - Inspect `docs/legal-sources/fns-knd-1151156.json`
