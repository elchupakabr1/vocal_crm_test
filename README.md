# Vocal CRM

Система управления расписанием вокальных занятий с веб-интерфейсом и интеграцией с Telegram.

## Функциональность

- Авторизация пользователей
- Управление расписанием занятий (создание, редактирование, удаление)
- Просмотр календаря в разных форматах (месяц, неделя, день)
- Уведомления о предстоящих занятиях через Telegram
- Адаптивный веб-интерфейс

## Технологии

- Backend: FastAPI (Python)
- Frontend: React + TypeScript
- База данных: SQLite
- Уведомления: Telegram Bot API
- UI: Material-UI

## Установка и запуск

### Требования

- Python 3.8+
- Node.js 14+
- npm или yarn
- Git

### Развертывание на Ubuntu 22.04

1. Установите необходимые пакеты:
```bash
sudo apt update
sudo apt install -y python3-pip python3-venv nodejs npm git
```

2. Клонируйте репозиторий:
```bash
git clone https://github.com/your-username/vocal-crm.git
cd vocal-crm
```

3. Настройте бэкенд:
```bash
# Создайте и активируйте виртуальное окружение
python3 -m venv venv
source venv/bin/activate

# Установите зависимости
cd backend
pip install -r requirements.txt

# Создайте файл .env
cat > .env << EOL
SECRET_KEY=your-secret-key
TELEGRAM_BOT_TOKEN=your-telegram-bot-token
CHAT_ID=your-telegram-chat-id
EOL

# Инициализируйте базу данных
python init_db.py
```

4. Настройте фронтенд:
```bash
# В новом терминале
cd frontend
npm install

# Создайте файл .env
cat > .env << EOL
REACT_APP_API_URL=http://localhost:8000
EOL
```

5. Запустите приложение:

В первом терминале (бэкенд):
```bash
cd backend
source venv/bin/activate
uvicorn main:app --host 0.0.0.0 --port 8000
```

Во втором терминале (фронтенд):
```bash
cd frontend
npm start
```

В третьем терминале (Telegram бот):
```bash
cd backend
source venv/bin/activate
python telegram_bot.py
```

6. Откройте браузер и перейдите по адресу: http://localhost:3000

### Учетные данные по умолчанию

- Логин: admin
- Пароль: admin

## Лицензия

MIT

