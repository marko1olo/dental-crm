import type {
	IdentityDocType,
	PatientGeneralInfo,
	PatientGeneralInfoTabProps,
	PatientVisitHistoryItem,
	RepresentativeRelationshipType,
	RepresentativeRelationshipMeta,
	StomxRepresentativeType,
	StomxRepresentativeTypeMeta,
} from "./generalInfo/types";

import {
	DENTE_REPRESENTATIVE_RELATIONSHIP_CATALOG,
	REPRESENTATIVE_RELATIONSHIP_CATALOG,
	isStatutoryLegalRepresentative,
	IDENTITY_DOCUMENT_TYPES,
	REGISTRY_SERVICE_TAGS,
	DOCTOR_CLINICAL_TAGS,
	POPULAR_DMS_COMPANIES,
} from "./generalInfo/constants";

export const PATIENT_LEGAL_REPRESENTATIVE_CATALOG = DENTE_REPRESENTATIVE_RELATIONSHIP_CATALOG;
export const STOMX_REPRESENTATIVE_CATALOG = DENTE_REPRESENTATIVE_RELATIONSHIP_CATALOG;
export type LegalRepresentativeType = RepresentativeRelationshipType;
export type LegalRepresentativeTypeMeta = RepresentativeRelationshipMeta;

export {
	DENTE_REPRESENTATIVE_RELATIONSHIP_CATALOG,
	REPRESENTATIVE_RELATIONSHIP_CATALOG,
	isStatutoryLegalRepresentative,
	IDENTITY_DOCUMENT_TYPES,
	REGISTRY_SERVICE_TAGS,
	DOCTOR_CLINICAL_TAGS,
	POPULAR_DMS_COMPANIES,
};

export type {
	RepresentativeRelationshipType,
	RepresentativeRelationshipMeta,
	StomxRepresentativeType,
	StomxRepresentativeTypeMeta,
	IdentityDocType,
	PatientVisitHistoryItem,
	PatientGeneralInfo,
	PatientGeneralInfoTabProps,
};
