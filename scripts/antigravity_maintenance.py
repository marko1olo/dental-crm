import sqlite3
import glob
import os

def run_wal_checkpoint():
    dbs = glob.glob(r'C:\Users\Admin\.gemini\antigravity\brain\*\*.db')
    count = 0
    for db in dbs:
        if os.path.exists(db):
            try:
                conn = sqlite3.connect(db)
                conn.execute('PRAGMA wal_checkpoint(TRUNCATE);')
                conn.close()
                count += 1
            except Exception:
                pass
    print(f" [+] Выполнен WAL чекпоинт для {count} баз данных.")

if __name__ == '__main__':
    run_wal_checkpoint()
