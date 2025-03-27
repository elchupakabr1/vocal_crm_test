from telegram.ext import Application, CommandHandler, ContextTypes
from datetime import datetime, timedelta
import sqlite3
import os
from dotenv import load_dotenv

load_dotenv()

TELEGRAM_BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN")
CHAT_ID = os.getenv("CHAT_ID")

async def check_upcoming_lessons(context: ContextTypes.DEFAULT_TYPE):
    conn = sqlite3.connect('vocal_schedule.db')
    c = conn.cursor()
    
    # Получаем занятия на ближайшие 24 часа
    now = datetime.now()
    tomorrow = now + timedelta(days=1)
    
    c.execute('''
        SELECT title, start_time, student_name
        FROM lessons
        WHERE start_time BETWEEN ? AND ?
        ORDER BY start_time
    ''', (now, tomorrow))
    
    lessons = c.fetchall()
    conn.close()
    
    if lessons:
        message = "📅 Предстоящие занятия:\n\n"
        for lesson in lessons:
            title, start_time, student_name = lesson
            message += f"🎵 {title}\n👤 {student_name}\n🕒 {start_time}\n\n"
        
        await context.bot.send_message(chat_id=CHAT_ID, text=message)

def setup_bot():
    application = Application.builder().token(TELEGRAM_BOT_TOKEN).build()
    
    # Добавляем обработчик для проверки предстоящих занятий
    job_queue = application.job_queue
    job_queue.run_repeating(check_upcoming_lessons, interval=3600)  # Проверка каждый час
    
    # Запускаем бота
    application.run_polling()

if __name__ == "__main__":
    setup_bot() 