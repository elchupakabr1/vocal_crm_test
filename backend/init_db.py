# -*- coding: utf-8 -*-
import sqlite3
from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def init_db():
    conn = sqlite3.connect('vocal_schedule.db')
    c = conn.cursor()
    
    # Создаем таблицы
    c.execute('''
        CREATE TABLE IF NOT EXISTS users (
            username TEXT PRIMARY KEY,
            password TEXT NOT NULL
        )
    ''')
    
    c.execute('''
        CREATE TABLE IF NOT EXISTS lessons (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            start_time DATETIME NOT NULL,
            end_time DATETIME NOT NULL,
            student_name TEXT NOT NULL,
            notes TEXT
        )
    ''')
    
    # Создаем первого пользователя (admin/admin)
    hashed_password = pwd_context.hash("admin")
    c.execute('INSERT OR IGNORE INTO users (username, password) VALUES (?, ?)',
              ("admin", hashed_password))
    
    conn.commit()
    conn.close()

if __name__ == "__main__":
    init_db()
    print("База данных успешно инициализирована!")
    print("Создан пользователь admin с паролем admin") 