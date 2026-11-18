"""
Скрипт для первичной интерактивной авторизации Telegram MTProto через Telethon.
Создает файл сессии my_session.session в текущей директории.
"""

import sys
from telethon import TelegramClient

def main():
    print("--- Авторизация Telegram Client (Telethon) ---")
    try:
        api_id_str = input("Введите API_ID: ").strip()
        if not api_id_str:
            print("Ошибка: API_ID не может быть пустым.")
            sys.exit(1)
        api_id = int(api_id_str)
        api_hash = input("Введите API_HASH: ").strip()
        phone = input("Введите номер телефона (с кодом страны, например +7...): ").strip()
    except ValueError:
        print("Ошибка: API_ID должен быть целым числом.")
        sys.exit(1)
    except (KeyboardInterrupt, EOFError):
        print("\nПрервано пользователем.")
        sys.exit(1)

    print("\nПодключение к шлюзу Telegram MTProto...")
    client = TelegramClient("my_session", api_id, api_hash)

    try:
        # client.start запросит в терминале код подтверждения и пароль 2FA при необходимости
        client.start(phone=phone)
        print("\nSession initialized successfully.")
    except Exception as e:
        print(f"\nОшибка при авторизации: {e}")
        sys.exit(1)
    finally:
        client.disconnect()

if __name__ == "__main__":
    main()
