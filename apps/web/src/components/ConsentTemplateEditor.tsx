import React, { useState, useEffect } from 'react';
import './ConsentTemplateEditor.css';
import DOMPurify from 'dompurify';

export const ConsentTemplateEditor: React.FC = () => {
  const [content, setContent] = useState<string>('');
  const [previewMode, setPreviewMode] = useState<boolean>(false);

  useEffect(() => {
    // Cleanup state for State Bleeding Fix
    setContent('Я, {{patient_name}}, даю согласие на лечение зуба {{tooth_numbers}}...');

    return () => {
      setContent('');
      setPreviewMode(false);
    };
  }, []);

  const insertPlaceholder = (placeholder: string) => {
    setContent((prev) => prev + ` {{${placeholder}}} `);
  };

  const getPreviewHtml = () => {
    // Mock rendering for preview
    let preview = content;
    preview = preview.replace(/{{patient_name}}/g, '<strong class="preview-var">Иванов И.И.</strong>');
    preview = preview.replace(/{{tooth_numbers}}/g, '<strong class="preview-var">16, 17</strong>');
    preview = preview.replace(/{{total_cost}}/g, '<strong class="preview-var">45,000 ₽</strong>');
    return { __html: DOMPurify.sanitize(preview) };
  };

  return (
    <div className="consent-editor">
      <div className="editor-header">
        <h3>Consent Template Editor</h3>
        <button 
          className="toggle-preview-btn"
          onClick={() => setPreviewMode(!previewMode)}
        >
          {previewMode ? 'Edit Mode' : 'Preview Mode'}
        </button>
      </div>

      {!previewMode && (
        <div className="editor-toolbar">
          <span className="toolbar-label">Insert:</span>
          <button onClick={() => insertPlaceholder('patient_name')}>Patient Name</button>
          <button onClick={() => insertPlaceholder('tooth_numbers')}>Tooth Numbers</button>
          <button onClick={() => insertPlaceholder('total_cost')}>Total Cost</button>
        </div>
      )}

      <div className="editor-workspace">
        {!previewMode ? (
          <textarea
            className="content-textarea"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Type your consent text here..."
          />
        ) : (
          <div className="preview-area" dangerouslySetInnerHTML={getPreviewHtml()} />
        )}
      </div>

      <div className="editor-footer">
        <button className="save-btn">Save Template</button>
        <button className="print-btn">Print Consent</button>
      </div>
    </div>
  );
};
