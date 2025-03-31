# -*- coding: utf-8 -*-
from database import engine
import models

# Удаляем все таблицы
models.Base.metadata.drop_all(bind=engine)

# Создаем таблицы заново
models.Base.metadata.create_all(bind=engine)

print("База данных успешно пересоздана!") 