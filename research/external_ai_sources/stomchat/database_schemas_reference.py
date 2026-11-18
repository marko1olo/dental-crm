# -*- coding: utf-8 -*-
"""
STOMCHAT DATABASE SCHEMAS AND DIAGNOSTIC SCRIPT
Скрипт проверки целостности и инспекции таблиц баз данных StomChat.
"""
import sqlite3
import os
import sys

DATABASES = ["stomat_bot.db", "stomat_wiki.db", "stomat_archive.db"]

def inspect_database(db_path: str):
    if not os.path.exists(db_path):
        print(f"[-] Database {db_path} does not exist.")
        return
    conn = sqlite3.connect(db_path)
    cur = conn.cursor()
    cur.execute("SELECT name, type, sql FROM sqlite_master WHERE type IN ('table', 'view') ORDER BY name;")
    items = cur.fetchall()
    print(f"\n================ {os.path.basename(db_path)} ({os.path.getsize(db_path)} bytes) ================")
    for name, item_type, sql in items:
        if name.startswith("sqlite_"):
            continue
        try:
            cur.execute(f"SELECT COUNT(*) FROM `{name}`")
            cnt = cur.fetchone()[0]
        except Exception:
            cnt = "ERR"
        print(f"  • {item_type.upper():<6} {name:<25} [Rows: {cnt}]")
    conn.close()

if __name__ == "__main__":
    base_dir = r"c:\Users\danat\Desktop\stomchat"
    for db in DATABASES:
        inspect_database(os.path.join(base_dir, db))
