import React from 'react';
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { renderToString } from 'react-dom/server';
import {
  formatCopilotUiContextHeader,
  parseCopilotUiContextHeader,
  enrichMessageWithUiContext,
  getCurrentCopilotUiContext,
  getCanonicalViewName,
  CopilotDrawer,
  CopilotMessage,
} from '../index';
import { useAppStore } from '../../../store/appStore';
import { usePatientStore } from '../../../store/patientStore';

describe('CopilotContextSync Header Formatting & Parsing', () => {
  it('formats exact canonical UI context header with Odontogram, Patient, Tooth 36, Doctor', () => {
    const header = formatCopilotUiContextHeader({
      view: 'Odontogram',
      patientId: 'uuid-test-1234',
      activeTooth: 36,
      activeDoctor: 'Dr. Иванов',
    });

    assert.equal(
      header,
      "[UI Context: View='Odontogram', PatientId='uuid-test-1234', ActiveTooth=36, ActiveDoctor='Dr. Иванов']"
    );
  });

  it('handles null and missing context fields gracefully', () => {
    const header = formatCopilotUiContextHeader({
      view: 'Schedule',
      patientId: null,
      activeTooth: null,
      activeDoctor: null,
    });

    assert.equal(
      header,
      "[UI Context: View='Schedule', PatientId=null, ActiveTooth=null, ActiveDoctor=null]"
    );
  });

  it('resolves raw route names to canonical keys', () => {
    assert.equal(getCanonicalViewName('visit').canonicalKey, 'Odontogram');
    assert.equal(getCanonicalViewName('schedule').canonicalKey, 'Schedule');
    assert.equal(getCanonicalViewName('patients').canonicalKey, 'Patients');
    assert.equal(getCanonicalViewName('finance').canonicalKey, 'Finance');
    assert.equal(getCanonicalViewName('inventory').canonicalKey, 'Inventory');
  });

  it('correctly parses UI context header and separates clean text', () => {
    const rawTurn = "[UI Context: View='Odontogram', PatientId='patient-uuid-42', ActiveTooth=36, ActiveDoctor='Dr. Иванов']\nУдали этот зуб";
    const parsed = parseCopilotUiContextHeader(rawTurn);

    assert.ok(parsed.context !== null);
    assert.equal(parsed.context.view, 'Odontogram');
    assert.equal(parsed.context.patientId, 'patient-uuid-42');
    assert.equal(parsed.context.activeTooth, 36);
    assert.equal(parsed.context.activeDoctor, 'Dr. Иванов');
    assert.equal(parsed.cleanText, 'Удали этот зуб');
  });

  it('enriches a short command message with the current active context', () => {
    const enriched = enrichMessageWithUiContext('Удали этот зуб', {
      view: 'Odontogram',
      patientId: 'pat-999',
      activeTooth: 36,
      activeDoctor: 'Dr. Иванов',
    });

    assert.ok(enriched.includes("[UI Context: View='Odontogram', PatientId='pat-999', ActiveTooth=36, ActiveDoctor='Dr. Иванов']"));
    assert.ok(enriched.includes('Удали этот зуб'));
  });

  it('is idempotent and does not double-wrap an already enriched message', () => {
    const msg = "[UI Context: View='Odontogram', PatientId='pat-999', ActiveTooth=36, ActiveDoctor='Dr. Иванов']\nУдали этот зуб";
    const enriched = enrichMessageWithUiContext(msg);
    assert.equal(enriched, msg);
  });
});

describe('Copilot UI Two-Way Context Integration', () => {
  it('reads reactive context from Zustand stores', () => {
    useAppStore.setState({
      currentView: 'visit',
      activeTooth: 36,
      activeDoctorName: 'Dr. Смирнов',
    });
    usePatientStore.setState({
      selectedPatientId: 'pat-12345',
    });

    const ctx = getCurrentCopilotUiContext();
    assert.equal(ctx.view, 'Odontogram');
    assert.equal(ctx.activeTooth, 36);
    assert.equal(ctx.activeDoctor, 'Dr. Смирнов');
    assert.equal(ctx.patientId, 'pat-12345');
  });

  it('renders CopilotDrawer with live Context Telemetry bar', () => {
    useAppStore.setState({
      currentView: 'visit',
      activeTooth: 36,
      activeDoctorName: 'Dr. Иванов',
      activePatientId: 'pat-uuid-888',
    });

    const html = renderToString(
      <CopilotDrawer
        isOpen={true}
        messages={[]}
        busy={false}
        phase={null}
        pending={null}
        nameCache={{}}
        nudges={[]}
        activeTab="chat"
        onTabChange={() => {}}
        onClose={() => {}}
        onSend={() => {}}
        onConfirm={() => {}}
        onReset={() => {}}
        onDismissNudge={() => {}}
      />
    );

    assert.ok(html.includes('copilot-context-bar'));
    assert.ok(html.includes('Одонтограмма') || html.includes('Смена') || html.includes('Shift'));
    assert.ok(html.includes('Зуб #36'));
    assert.ok(html.includes('Dr. Иванов'));
  });

  it('renders CopilotMessage for user with context badge and clean message body', () => {
    const rawMsg = "[UI Context: View='Odontogram', PatientId='uuid-123', ActiveTooth=36, ActiveDoctor='Dr. Иванов']\nУдали этот зуб";
    const html = renderToString(
      <CopilotMessage
        message={{
          kind: 'text',
          role: 'user',
          text: rawMsg,
        }}
      />
    );

    assert.ok(html.includes('Одонтограмма'));
    assert.ok(html.includes('Зуб #36'));
    assert.ok(html.includes('Удали этот зуб'));
    // Ensure raw header bracket syntax is not dumped into plain user text
    assert.ok(!html.includes("PatientId='uuid-123'"));
  });
});
