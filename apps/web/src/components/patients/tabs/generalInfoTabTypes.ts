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

export {
	REPRESENTATIVE_RELATIONSHIP_CATALOG,
	REPRESENTATIVE_RELATIONSHIP_CATALOG as STOMX_REPRESENTATIVE_CATALOG,
	isStatutoryLegalRepresentative,
	IDENTITY_DOCUMENT_TYPES,
	REGISTRY_SERVICE_TAGS,
	DOCTOR_CLINICAL_TAGS,
	POPULAR_DMS_COMPANIES,
} from "./generalInfo/constants";

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
