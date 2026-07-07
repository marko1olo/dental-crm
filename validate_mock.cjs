const { dashboardSchema } = require('./packages/shared/src/index.ts');

const NOW   = new Date().toISOString();
const TODAY = NOW.slice(0, 10);
const ORG   = '00000000-0000-0000-0000-000000000000';
const P1    = '00000000-0000-0000-0000-000000000001';
const P2    = '00000000-0000-0000-0000-000000000002';
const DOC   = '00000000-0000-0000-0000-000000000003';
const CHAIR1= '00000000-0000-0000-0000-000000000010';
const CHAIR2= '00000000-0000-0000-0000-000000000011';
const APP1  = '00000000-0000-0000-0000-000000000020';
const APP2  = '00000000-0000-0000-0000-000000000021';
const VISIT = '00000000-0000-0000-0000-000000000030';

const DASHBOARD = {
  clinicName: 'Elite Dental', todayIso: NOW,
  clinicSettings: {
    profile: {
      organizationId: ORG, clinicName: 'Elite Dental', legalName: null,
      inn: '7701234567', kpp: null, ogrn: null, address: 'Москва',
      phone: '+74991234567', email: null, website: null,
      medicalLicenseNumber: null, medicalLicenseIssuedAt: null, medicalLicenseIssuer: null,
      bankDetails: null, signatoryName: null, signatoryTitle: null,
      mode: 'small_clinic', timezone: 'Europe/Moscow', defaultVisitMinutes: 60,
      scheduleDefaults: { workdayStart: '09:00', workdayEnd: '21:00', workingDays: [1,2,3,4,5], appointmentBufferMinutes: 10 },
      networkEnabled: false, egiszEnabled: false, updatedAt: NOW,
    },
    staff: [{ id: DOC, organizationId: ORG, fullName: 'Иванов Иван', role: 'doctor', specialties: ['therapist'], phone: null, email: null, active: true, canSignMedicalRecords: true, canManageMoney: false, canManageImports: false, color: '#6366f1', workingHours: null, createdAt: NOW, updatedAt: NOW }],
    chairs: [
      { id: CHAIR1, organizationId: ORG, name: 'Кресло 1', room: 'Каб 1', specialization: 'therapist', active: true, hasXraySensor: true, hasMicroscope: false, hasSurgeryKit: false, notes: null, workingHours: null },
      { id: CHAIR2, organizationId: ORG, name: 'Кресло 2', room: 'Каб 2', specialization: 'orthopedist', active: true, hasXraySensor: false, hasMicroscope: true, hasSurgeryKit: false, notes: null, workingHours: null },
    ],
    integrationPresets: [], workspaceProfiles: [], roleAccessPolicies: [], modeHints: [], soloDoctorMode: false,
  },
  shiftIntelligence: {
    modeFit: { mode: 'small_clinic', title: 'Малая клиника', fitScore: 85, blockers: [], upgrades: [], lowFrictionNextStep: 'Создать расписание' },
    doctorLoads: [], assistantLoads: [], chairLoads: [], roleQueues: [], scheduleWarnings: [],
  },
  patients: [
    { id: P1, organizationId: ORG, status: 'active', fullName: 'Смирнов Алексей Васильевич', birthDate: '1980-05-15', phone: '+79991234567', email: null, notes: null, administrativeProfile: null, balanceRub: 0, createdAt: NOW, updatedAt: NOW },
    { id: P2, organizationId: ORG, status: 'active', fullName: 'Иванова Марина Игоревна', birthDate: '1990-07-22', phone: '+79997654321', email: 'ivanova@example.com', notes: null, administrativeProfile: null, balanceRub: 5000, createdAt: NOW, updatedAt: NOW },
  ],
  patientInsights: [], recommendedActions: [],
  appointments: [
    { id: APP1, organizationId: ORG, patientId: P1, doctorUserId: DOC, assistantUserId: null, chairId: CHAIR1, status: 'confirmed', startsAt: `${TODAY}T10:00:00+04:00`, endsAt: `${TODAY}T11:00:00+04:00`, reason: 'Кариес 16', comment: null },
    { id: APP2, organizationId: ORG, patientId: P2, doctorUserId: DOC, assistantUserId: null, chairId: CHAIR2, status: 'arrived', startsAt: `${TODAY}T11:30:00+04:00`, endsAt: `${TODAY}T12:30:00+04:00`, reason: 'Чистка', comment: null },
  ],
  appointmentReadiness: [], scheduleSuggestions: [],
  activeVisit: {
    id: VISIT, organizationId: ORG, patientId: P1, appointmentId: APP1, status: 'draft',
    revision: 1, complaint: 'Боль в зубе 16', anamnesis: 'Аллергия: пенициллин',
    objectiveStatus: 'Кариес 16', diagnosis: 'K02.1', treatmentPlan: 'Пломбирование',
    doctorSummary: '', createdAt: NOW, updatedAt: NOW,
  },
  visitCloseChecklist: { visitId: VISIT, readyToSign: false, score: 75, nextAction: 'complete_diagnosis', blockingItems: 1, items: [] },
  documents: [], imagingStudies: [], protocolTemplates: [], serviceCatalog: [],
  treatmentPlanItems: [], treatmentPlanScenarios: [],
  clinicalRules: [], clinicalRuleEvaluations: [],
  clinicalRuleSummary: { activeRules: 0, evaluatedRules: 0, unresolved: 0, blockers: 0, warnings: 0, requiredServices: 0, coveredRules: 0 },
  payments: [],
  billingSummary: { totalPlannedRub: 300000, totalDiscountRub: 0, totalPaidRub: 150000, totalDueRub: 25000, taxDeductionEligibleRub: 0, draftDocumentAmountRub: 0, openTreatmentItems: 5, unpaidDocuments: 1 },
  communicationTemplates: [], communicationTasks: [], communicationEvents: [],
  communicationSummary: { openTasks: 2, urgentTasks: 1, dueToday: 3, overdue: 0, completedToday: 4, appointmentConfirmations: 2, paymentReminders: 1, postVisitInstructions: 1 },
  importBatches: [], speechProviders: [], auditEvents: [], complianceWarnings: [],
};

const result = dashboardSchema.safeParse(DASHBOARD);
if (!result.success) {
  console.log(JSON.stringify(result.error.errors, null, 2));
} else {
  console.log('SUCCESS! Zod parsed correctly.');
}
