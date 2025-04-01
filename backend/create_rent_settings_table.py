from sqlalchemy import create_engine, MetaData, Table, Column, Integer, Float, DateTime, ForeignKey
from datetime import datetime
import models

# Создаем подключение к базе данных
engine = create_engine('sqlite:///vocal_schedule.db')
metadata = MetaData()

# Загружаем существующие таблицы
metadata.reflect(bind=engine)

# Определяем таблицу
rent_settings = Table(
    'rent_settings',
    metadata,
    Column('id', Integer, primary_key=True),
    Column('user_id', Integer, ForeignKey('users.id'), nullable=False),
    Column('amount', Float, nullable=False),
    Column('payment_day', Integer, nullable=False),
    Column('created_at', DateTime, default=datetime.utcnow),
    Column('updated_at', DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
)

# Создаем таблицу
def create_table():
    try:
        rent_settings.create(engine)
        print("Таблица rent_settings успешно создана")
    except Exception as e:
        print(f"Ошибка при создании таблицы: {e}")

if __name__ == "__main__":
    create_table() 