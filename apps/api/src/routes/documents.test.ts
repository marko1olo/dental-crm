import { test, describe } from 'node:test';
import assert from 'node:assert';
import { frozenTaxXmlClinicProfile } from './documents.js';
import type { GeneratedDocument, ClinicProfile } from '@dental/shared';

describe('frozenTaxXmlClinicProfile', () => {
  const fallbackProfile = {
    id: 'clinic-1',
    name: 'Fallback Clinic',
    inn: '1234567890',
    kpp: '123456789',
    ogrn: '1234567890123',
    address: '123 Main St',
    phone: '555-1234',
    email: 'info@clinic.com',
    licenseNumber: 'LIC-123',
    licenseDate: '2020-01-01',
    licenseIssuer: 'Ministry of Health',
  } as unknown as ClinicProfile;

  const snapshotProfile = {
    id: 'clinic-1',
    name: 'Snapshot Clinic',
    inn: '0987654321',
    kpp: '987654321',
    ogrn: '3210987654321',
    address: '456 Oak St',
    phone: '555-4321',
    email: 'info@snapshot.com',
    licenseNumber: 'LIC-456',
    licenseDate: '2021-01-01',
    licenseIssuer: 'Ministry of Health',
  } as unknown as ClinicProfile;

  test('returns fallback profile if taxXmlSourceSnapshot is missing', () => {
    const document = {
      id: 'doc-1',
      patientId: 'patient-1',
      kind: 'tax_deduction_certificate',
      status: 'draft',
      createdAt: '2023-01-01T00:00:00Z',
    } as unknown as GeneratedDocument;

    const result = frozenTaxXmlClinicProfile(document, fallbackProfile);
    assert.deepStrictEqual(result, fallbackProfile);
  });

  test('returns fallback profile if clinicProfile in taxXmlSourceSnapshot is missing', () => {
    const document = {
      id: 'doc-1',
      patientId: 'patient-1',
      kind: 'tax_deduction_certificate',
      status: 'draft',
      createdAt: '2023-01-01T00:00:00Z',
      taxXmlSourceSnapshot: {}
    } as unknown as GeneratedDocument;

    const result = frozenTaxXmlClinicProfile(document, fallbackProfile);
    assert.deepStrictEqual(result, fallbackProfile);
  });

  test('returns snapshot profile if present in taxXmlSourceSnapshot', () => {
    const document = {
      id: 'doc-1',
      patientId: 'patient-1',
      kind: 'tax_deduction_certificate',
      status: 'draft',
      createdAt: '2023-01-01T00:00:00Z',
      taxXmlSourceSnapshot: {
        clinicProfile: snapshotProfile
      }
    } as unknown as GeneratedDocument;

    const result = frozenTaxXmlClinicProfile(document, fallbackProfile);
    assert.deepStrictEqual(result, snapshotProfile);
  });
});
