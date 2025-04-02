export const CompanyConfig = {
  // Общие названия
  companyName: 'Вокальная школа',
  
  // Названия страниц
  pages: {
    calendar: 'Календарь',
    students: 'Студенты',
    subscriptions: 'Абонементы',
    settings: 'Настройки',
    finance: 'Финансы',
    login: 'Вход в систему'
  },
  
  // Названия компонентов
  components: {
    studentForm: {
      addTitle: 'Добавить студента',
      editTitle: 'Редактировать студента',
      firstName: 'Имя',
      lastName: 'Фамилия',
      phone: 'Телефон',
      email: 'Email',
      subscription: 'Абонемент',
      lessonsCount: 'Количество уроков',
      cancel: 'Отмена',
      save: 'Сохранить',
      add: 'Добавить'
    },
    rentSettings: {
      title: 'Настройки аренды',
      amount: 'Сумма аренды',
      paymentDay: 'День списания',
      configure: 'Настроить',
      save: 'Сохранить'
    },
    finance: {
      totalIncome: 'Общий доход',
      totalExpenses: 'Общие расходы',
      profit: 'Чистая прибыль',
      subscriptionIncome: 'Доход от абонементов',
      expenses: 'Расходы',
      incomes: 'Доходы',
      addExpense: 'Добавить расход',
      addIncome: 'Добавить доход'
    }
  },
  
  // Сообщения
  messages: {
    confirmDelete: 'Вы уверены, что хотите удалить?',
    success: {
      saved: 'Данные успешно сохранены',
      deleted: 'Данные успешно удалены'
    },
    error: {
      required: 'Это поле обязательно для заполнения',
      invalidPhone: 'Неверный формат телефона',
      passwordsNotMatch: 'Пароли не совпадают'
    }
  }
}; 