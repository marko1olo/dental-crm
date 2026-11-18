# -*- coding: utf-8 -*-
"""
STOMCHAT 7-GATE TRIAGE ENGINE REFERENCE IMPLEMENTATION
Эталонный исполняемый модуль проверки правил триажа и допуска сообщений.
"""
import re
from typing import Dict, Any, Tuple

# Ключевые слова клинического намерения (dental_vocab)
DENTAL_KEYWORDS = {
    "дозировка", "карпул", "артикаин", "лидокаин", "мепивакаин", "коффердам",
    "вертипреп", "bopt", "уступ", "ресипрок", "апекс", "перфорация", "отлом",
    "гипохлорит", "мта", "биодентин", "эстилайт", "пульпит", "периодонтит",
    "имплант", "синус", "абатмент", "коронка", "винир", "феррул"
}

def evaluate_7_gates(message: Dict[str, Any], bot_id: int = 999999) -> Tuple[bool, str, int]:
    """
    Оценивает входящее сообщение по 7 шлюзам допуска.
    Возвращает: (допущено_ли, причина/действие, номер_шлюза)
    """
    text = (message.get("text") or "").strip()
    sender_id = message.get("sender_id")
    is_bot = message.get("is_bot", False)
    is_reply_to_bot = message.get("reply_to_msg_is_bot", False)
    is_mentioned = message.get("is_mentioned", False)
    user_cooldown_active = message.get("user_cooldown_active", False)
    dispute_detected = message.get("dispute_detected", False)
    
    # ШЛЮЗ 1: Entity & Integrity Filter
    if sender_id == bot_id or is_bot:
        return False, "REJECTED: Sender is bot or self (loop protection)", 1
    if len(text) < 3 and not message.get("has_media"):
        return False, "REJECTED: Message too short (< 3 chars)", 1
        
    # ШЛЮЗ 2: Cooldown & Flood Discipline
    if user_cooldown_active and not (is_mentioned or is_reply_to_bot):
        return False, "REJECTED: User cooldown active (flood prevention)", 2
        
    # ШЛЮЗ 3: Direct Mention / Reply
    if is_mentioned or is_reply_to_bot:
        return True, "PASSED: Explicit direct mention or reply to bot", 3
        
    # ШЛЮЗ 4: Clinical Intent Classification
    has_dental_term = any(k in text.lower() for k in DENTAL_KEYWORDS)
    is_question = "?" in text or any(q in text.lower() for q in ["как", "чем", "какой", "подскажите", "доза"])
    if has_dental_term and is_question:
        return True, "PASSED: Valid clinical dental inquiry", 4
        
    # ШЛЮЗ 5: Passive Case Gate (Confidence threshold >= 0.88)
    confidence = message.get("passive_confidence", 0.0)
    if confidence >= 0.88:
        return True, f"PASSED: Passive case chime-in (confidence: {confidence:.2f})", 5
        
    # ШЛЮЗ 6: Dispute Referee Gate (Clinical Peer Colleague)
    if dispute_detected:
        return True, "PASSED: Clinical dispute detected -> Peer Clinician intervention (15m cd)", 6
        
    # ШЛЮЗ 7: Default Silence
    return False, "SILENCE: No clinical triggers satisfied", 7

if __name__ == "__main__":
    test_cases = [
        {"text": "Привет всем", "sender_id": 101, "is_mentioned": False},
        {"text": "@stomchat_bot какая максимальная доза артикаина на 15 кг?", "sender_id": 102, "is_mentioned": True},
        {"text": "Коллеги, чем лучше промывать при перфорации дна?", "sender_id": 103, "is_mentioned": False},
        {"text": "Да ты бред несешь, вертипреп на молярах без уступа не держит!", "sender_id": 104, "dispute_detected": True},
        {"text": "ок", "sender_id": 105, "is_mentioned": False},
    ]
    
    print("=== ТЕСТИРОВАНИЕ 7 ШЛЮЗОВ ТРИАЖА ===")
    for idx, tc in enumerate(test_cases, 1):
        ok, reason, gate = evaluate_7_gates(tc)
        status = "[ДОПУЩЕНО]" if ok else "[ТИШИНА]  "
        print(f"Кейс {idx}: {status} Шлюз {gate} -> {reason}")
