import type {
	AiRecognitionJob,
	Appointment,
	AuditEvent,
	Chair,
	ClinicalRule,
	ClinicProfile,
	CommunicationEvent,
	CommunicationTask,
	CommunicationTemplate,
	GeneratedDocument,
	ImagingStudy,
	ImportBatch,
	Patient,
	Payment,
	ProtocolTemplate,
	ServiceCatalogItem,
	StaffMember,
	TreatmentPlanItem,
	TreatmentPlanScenario,
	Visit,
} from "@dental/shared";

export interface DomainState {
	clinicProfile: ClinicProfile;
	staffMembers: StaffMember[];
	chairs: Chair[];
	patients: Patient[];
	appointments: Appointment[];
	activeVisit: Visit;
	documents: GeneratedDocument[];
	serviceCatalog: ServiceCatalogItem[];
	treatmentPlanItems: TreatmentPlanItem[];
	treatmentPlanScenarios: TreatmentPlanScenario[];
	clinicalRules: ClinicalRule[];
	payments: Payment[];
	communicationTemplates: CommunicationTemplate[];
	communicationTasks: CommunicationTask[];
	communicationEvents: CommunicationEvent[];
	imagingStudies: ImagingStudy[];
	aiRecognitionJobs: AiRecognitionJob[];
	importBatches: ImportBatch[];
	protocolTemplates: ProtocolTemplate[];
	auditEvents: AuditEvent[];
	unavailableSlices: string[];
}
