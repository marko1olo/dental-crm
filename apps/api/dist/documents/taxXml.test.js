import { test, describe } from 'node:test';
import assert from 'node:assert';
import { buildKnd1151156Xml } from './taxXml.js';
describe('buildKnd1151156Xml', () => {
    const baseDocument = {
        id: 'doc-1',
        patientId: 'patient-1',
        payload: { taxPaymentSelection: { selectedPaymentIds: ['payment-1'] } },
        kind: 'tax_deduction_certificate',
        taxYear: 2024,
        issuedAt: '2024-05-15T12:00:00Z',
    };
    const basePatient = {
        id: 'patient-1',
        fullName: 'Иванов Иван Иванович',
        birthDate: '1990-01-01',
        administrativeProfile: {
            taxpayerInn: '123456789012',
            identityDocument: 'Паспорт 11 22 333444 выдан 01.01.2010',
        },
    };
    const baseClinic = {
        clinicName: 'Test Clinic',
        legalName: 'ООО Тест',
        inn: '1234567890',
        kpp: '123456789',
        ogrn: '1234567890123',
        address: '123456, г Москва, ул Тестовая, д 1',
        phone: '88005553535',
        email: 'test@example.com',
        signatoryName: 'Петров Петр Петрович',
    };
    const basePayment = {
        id: 'payment-1',
        amountRub: 1000,
        taxDeductionCode: '1',
        payerFullName: 'Иванов Иван Иванович',
        payerBirthDate: '1990-01-01',
        payerInn: '123456789012',
        payerRelationship: 'self',
        patientId: 'patient-1',
        status: 'paid',
        paidAt: '2024-05-15T12:00:00Z',
    };
    const baseContext = {
        clinicProfile: baseClinic,
        payments: [basePayment],
        taxOfficeCode: '7700',
    };
    test('happy path: generates valid XML for self payer', () => {
        const result = buildKnd1151156Xml(baseDocument, basePatient, baseContext);
        assert.strictEqual(result.ok, true);
        if (!result.ok)
            return;
        assert.match(result.xml, /<\?xml version="1\.0" encoding="UTF-8"\?>/);
        assert.match(result.xml, /<Документ КНД="1184043" ДатаДок="15\.05\.2024" КодНО="7700" ОтчГод="2024">/);
        assert.match(result.xml, /<СвНП><НПЮЛ НаимОрг="ООО Тест" ИННЮЛ="1234567890" КПП="123456789"\/><\/СвНП>/);
        assert.match(result.xml, /<Подписант ПрПодп="1"><ФИО Фамилия="Петров" Имя="Петр" Отчество="Петрович"\/><\/Подписант>/);
        assert.match(result.xml, /ПрПациент="1" СуммаКод1="1000\.00"/);
        assert.match(result.xml, /<НППлатМедУсл ИНН="123456789012" ДатаРожд="01\.01\.1990"><ФИО Фамилия="Иванов" Имя="Иван" Отчество="Иванович"\/><\/НППлатМедУсл>/);
        // When PrPatient="1" there should be no separate Patient block
        assert.strictEqual(result.xml.includes('<Пациент'), false);
    });
    test('happy path: generates valid XML for other payer', () => {
        const payment = { ...basePayment, payerRelationship: 'child', payerFullName: 'Иванова Мария Ивановна', patientId: 'patient-1', status: 'paid', paidAt: '2024-05-15T12:00:00Z' };
        const doc = { ...baseDocument, patientId: 'patient-1', payload: { taxPaymentSelection: { selectedPaymentIds: ['payment-1'] } } };
        const result = buildKnd1151156Xml(doc, basePatient, { ...baseContext, payments: [payment] });
        assert.strictEqual(result.ok, true);
        if (!result.ok)
            return;
        assert.match(result.xml, /ПрПациент="0"/);
        assert.match(result.xml, /<НППлатМедУсл ИНН="123456789012" ДатаРожд="01\.01\.1990"><ФИО Фамилия="Иванова" Имя="Мария" Отчество="Ивановна"\/><\/НППлатМедУсл>/);
        assert.match(result.xml, /<Пациент ИНН="123456789012" ДатаРожд="01\.01\.1990"><ФИО Фамилия="Иванов" Имя="Иван" Отчество="Иванович"\/><\/Пациент>/);
    });
    test('error: wrong document kind', () => {
        const result = buildKnd1151156Xml({ ...baseDocument, kind: 'completed_works_act' }, basePatient, baseContext);
        assert.strictEqual(result.ok, false);
        if (!result.ok) {
            assert.strictEqual(result.statusCode, 409);
            assert.match(result.error, /доступен только для справки/);
        }
    });
    test('error: wrong tax year', () => {
        const result = buildKnd1151156Xml({ ...baseDocument, taxYear: 2023 }, basePatient, baseContext);
        assert.strictEqual(result.ok, false);
        if (!result.ok) {
            assert.match(result.error, /требует налоговый год 2024/);
        }
    });
    test('error: missing tax office code', () => {
        const result = buildKnd1151156Xml(baseDocument, basePatient, { ...baseContext, taxOfficeCode: null });
        assert.strictEqual(result.ok, false);
        if (!result.ok) {
            assert.match(result.error, /укажите в серверных настройках 4-значный код налогового органа/);
        }
    });
    test('error: missing clinic details (INN length)', () => {
        const clinic = { ...baseClinic, inn: '123' };
        const result = buildKnd1151156Xml(baseDocument, basePatient, { ...baseContext, clinicProfile: clinic });
        assert.strictEqual(result.ok, false);
        if (!result.ok) {
            assert.match(result.error, /нужен корректный ИНН клиники/);
        }
    });
    test('error: no tax payments', () => {
        const result = buildKnd1151156Xml(baseDocument, basePatient, { ...baseContext, payments: [] });
        assert.strictEqual(result.ok, false);
        if (!result.ok) {
            assert.match(result.error, /нужен хотя бы один оплаченный платеж/);
        }
    });
    test('error: invalid tax deduction code', () => {
        const payment = { ...basePayment, taxDeductionCode: '3' };
        const result = buildKnd1151156Xml(baseDocument, basePatient, { ...baseContext, payments: [payment] });
        assert.strictEqual(result.ok, false);
        if (!result.ok) {
            assert.match(result.error, /каждый платеж должен иметь код услуги 1 или 2/);
        }
    });
    test('error: missing payer details (no INN or identity doc)', () => {
        const payment = { ...basePayment, payerInn: null, payerIdentityDocument: null };
        const result = buildKnd1151156Xml(baseDocument, basePatient, { ...baseContext, payments: [payment] });
        assert.strictEqual(result.ok, false);
        if (!result.ok) {
            assert.match(result.error, /нужны ФИО, дата рождения и 12-значный ИНН либо документ личности налогоплательщика/);
        }
    });
    test('error: different patient but missing patient details', () => {
        const payment = { ...basePayment, payerRelationship: 'child' };
        const patient = { ...basePatient, administrativeProfile: { taxpayerInn: null, identityDocument: null } };
        const result = buildKnd1151156Xml(baseDocument, patient, { ...baseContext, payments: [payment] });
        assert.strictEqual(result.ok, false);
        if (!result.ok) {
            assert.match(result.error, /нужны ФИО, дата рождения и 12-значный ИНН либо документ личности пациента/);
        }
    });
});
