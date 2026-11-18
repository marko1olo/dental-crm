# -*- coding: utf-8 -*-
"""
Master Inquisitor Verification Script for Legal Quartet:
01 ИДС, 02 Отказ ЕГИСЗ, 03 Договор ПП 736, 06 Акт сдачи-приемки.
Audits Word COM and pypdf pagination, checks text for forbidden names (e.g. M.V. Sidorkin),
verifies GOST signatures, renders PNG proofs, and syncs to Desktop.
"""

import os
import shutil
import win32com.client
from pypdf import PdfReader
import fitz

DESKTOP_DIR = r"C:\Users\Admin\Desktop\Клиника_Виктория_Документы_ИП_Сидоркина"
DOCS_DIR = r"docs\клиника_виктория_документы"
PROOFS_DIR = r"docs\proofs\legal"

DOCS_CONFIG = [
    {
        "id": "01",
        "name": "01_ИДС_Терапевтическая_Стоматология_ИП_Сидоркина_А4",
        "script": "scripts/generate_official_ids_docx.py",
        "expected_pages": 1,
        "format": "A4"
    },
    {
        "id": "02",
        "name": "02_Заявление_Отказ_от_передачи_в_ЕГИСЗ_ИП_Сидоркина_А4",
        "script": "scripts/generate_egisz_refusal_docx.py",
        "expected_pages": 1,
        "format": "A4"
    },
    {
        "id": "03",
        "name": "03_Договор_Платные_Медуслуги_ПП736_ИП_Сидоркина_2стр_А4",
        "script": "scripts/generate_contract_pp736_docx.py",
        "expected_pages": 2,
        "format": "A4"
    },
    {
        "id": "06",
        "name": "06_Акт_сдачи_приемки_оказанных_услуг_ИП_Сидоркина_А5",
        "script": "scripts/generate_act_acceptance_docx.py",
        "expected_pages": 1,
        "format": "A5"
    }
]

def run_generators():
    print("=== STEP 1: RUNNING GENERATORS ===")
    for doc in DOCS_CONFIG:
        print(f"\n--- Running generator for {doc['id']} ({doc['name']}) ---")
        ret = os.system(f"python {doc['script']}")
        if ret != 0:
            raise RuntimeError(f"Script {doc['script']} failed with code {ret}")

def audit_word_and_pypdf():
    print("\n=== STEP 2: AUDITING WORD COM & PYPDF PAGINATION ===")
    word = win32com.client.Dispatch("Word.Application")
    word.Visible = False
    results = []
    try:
        for doc_cfg in DOCS_CONFIG:
            docx_path = os.path.abspath(os.path.join(DOCS_DIR, f"{doc_cfg['name']}.docx"))
            pdf_path = os.path.abspath(os.path.join(DOCS_DIR, f"{doc_cfg['name']}.pdf"))
            
            wdoc = word.Documents.Open(docx_path)
            word_pages = wdoc.ComputeStatistics(2)
            wdoc.Close()
            
            reader = PdfReader(pdf_path)
            pdf_pages = len(reader.pages)
            
            # Extract text to verify NO forbidden strings
            pdf_text = ""
            for p in reader.pages:
                pdf_text += p.extract_text() or ""
                
            forbidden_found = False
            for f_str in ["Сидоркин М", "М.В. Сидоркин", "Сидоркин Матвей"]:
                if f_str in pdf_text:
                    forbidden_found = True
                    print(f"CRITICAL ERROR: Found forbidden string '{f_str}' in {doc_cfg['name']}!")
                    
            gost_sig_found = "Сидоркина" in pdf_text and "М.П." in pdf_text
            
            docx_size = os.path.getsize(docx_path)
            pdf_size = os.path.getsize(pdf_path)
            
            status = (
                word_pages == doc_cfg["expected_pages"] and 
                pdf_pages == doc_cfg["expected_pages"] and 
                not forbidden_found and 
                gost_sig_found
            )
            
            results.append({
                "id": doc_cfg["id"],
                "name": doc_cfg["name"],
                "format": doc_cfg["format"],
                "expected": doc_cfg["expected_pages"],
                "word_pages": word_pages,
                "pdf_pages": pdf_pages,
                "docx_size": docx_size,
                "pdf_size": pdf_size,
                "forbidden_clean": not forbidden_found,
                "gost_sig": gost_sig_found,
                "passed": status
            })
            print(f"[{'PASS' if status else 'FAIL'}] {doc_cfg['name']}: Word={word_pages}, PDF={pdf_pages} (Expected: {doc_cfg['expected_pages']}), Clean={not forbidden_found}, GOST Sig={gost_sig_found}")
    finally:
        word.Quit()
    return results

def render_png_proofs():
    print("\n=== STEP 3: RENDERING HIGH-RES PNG PROOFS ===")
    os.makedirs(PROOFS_DIR, exist_ok=True)
    proof_files = []
    for doc_cfg in DOCS_CONFIG:
        pdf_path = os.path.abspath(os.path.join(DOCS_DIR, f"{doc_cfg['name']}.pdf"))
        doc_fitz = fitz.open(pdf_path)
        for i, page in enumerate(doc_fitz):
            pix = page.get_pixmap(dpi=150)
            png_path = os.path.join(PROOFS_DIR, f"{doc_cfg['name']}_page_{i+1}.png")
            pix.save(png_path)
            size = os.path.getsize(png_path)
            print(f"  Proof rendered: {os.path.basename(png_path)} ({size} bytes)")
            proof_files.append((png_path, size))
        doc_fitz.close()
    return proof_files

def sync_to_desktop():
    print(f"\n=== STEP 4: SYNCING VERIFIED FILES TO DESKTOP: {DESKTOP_DIR} ===")
    os.makedirs(DESKTOP_DIR, exist_ok=True)
    synced = []
    for doc_cfg in DOCS_CONFIG:
        for ext in [".docx", ".pdf"]:
            src = os.path.join(DOCS_DIR, f"{doc_cfg['name']}{ext}")
            dst = os.path.join(DESKTOP_DIR, f"{doc_cfg['name']}{ext}")
            shutil.copy2(src, dst)
            size = os.path.getsize(dst)
            print(f"  Synced to Desktop: {os.path.basename(dst)} ({size} bytes)")
            synced.append((dst, size))
            
    # Also sync proofs folder
    desktop_proofs = os.path.join(DESKTOP_DIR, "proofs")
    os.makedirs(desktop_proofs, exist_ok=True)
    for doc_cfg in DOCS_CONFIG:
        for f in os.listdir(PROOFS_DIR):
            if f.startswith(doc_cfg['name']):
                src = os.path.join(PROOFS_DIR, f)
                dst = os.path.join(desktop_proofs, f)
                shutil.copy2(src, dst)
                print(f"  Synced proof to Desktop: {f}")
    return synced

def main():
    run_generators()
    audit_results = audit_word_and_pypdf()
    proof_files = render_png_proofs()
    synced_files = sync_to_desktop()
    
    print("\n=======================================================")
    print("      FINAL RED TEAM AUDIT REPORT (GOST & PAGINATION)  ")
    print("=======================================================")
    all_passed = True
    for res in audit_results:
        mark = "✓ PASS" if res["passed"] else "✗ FAIL"
        if not res["passed"]:
            all_passed = False
        print(f"{mark} | Doc {res['id']} ({res['format']}): Word={res['word_pages']}p, PDF={res['pdf_pages']}p (Target: {res['expected']}p) | Clean: {res['forbidden_clean']} | GOST: {res['gost_sig']}")
        
    assert all_passed, "Audit failed! Some documents violated pagination or content requirements!"
    print("\nALL INQUISITION GATES PASSED WITH ZERO TOLERANCE!")

if __name__ == "__main__":
    main()
