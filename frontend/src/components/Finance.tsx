import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  Box,
  Paper,
  Typography,
  Grid,
  Card,
  CardContent,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Menu,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Pagination,
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import ru from 'date-fns/locale/ru';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import api from '@/services/api';
import { Expense, Income, FinanceSummary } from '@/types/finance';
import RentSettings from './RentSettings';
import { useDebounce } from '@/hooks/useDebounce';
import '../styles/Finance.css';
import { CompanyConfig } from '../config/CompanyConfig';

interface Subscription {
  id: number;
  name: string;
  price: number;
  lessons_count: number;
}

interface Student {
  id: number;
  first_name: string;
  last_name: string;
}

const ITEMS_PER_PAGE = 10;

const Finance: React.FC = () => {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [incomes, setIncomes] = useState<Income[]>([]);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [summary, setSummary] = useState<FinanceSummary>({
    totalIncome: 0,
    totalExpenses: 0,
    profit: 0,
    subscriptionIncome: 0,
    otherIncome: 0,
    rentExpense: 0,
    otherExpenses: 0,
  });
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [showAddIncome, setShowAddIncome] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [editingIncome, setEditingIncome] = useState<Income | null>(null);
  const [newExpense, setNewExpense] = useState<Partial<Expense>>({
    amount: 0,
    description: '',
    category: '',
    date: new Date().toISOString().split('T')[0]
  });
  const [newIncome, setNewIncome] = useState<Partial<Income>>({
    amount: 0,
    description: '',
    category: '',
    date: new Date().toISOString().split('T')[0]
  });
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const debouncedDate = useDebounce(selectedDate, 500);
  const abortControllerRef = useRef<AbortController | null>(null);

  const fetchData = useCallback(async () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    setLoading(true);
    setError(null);

    try {
      const [expensesResponse, incomesResponse, subscriptionsResponse, studentsResponse] = await Promise.all([
        api.get('/expenses/', {
          params: { skip: (page - 1) * ITEMS_PER_PAGE, limit: ITEMS_PER_PAGE },
          signal: abortControllerRef.current.signal
        }).catch((err: Error) => {
          if (err.name === 'CanceledError') return { data: [] };
          throw err;
        }),
        api.get('/incomes/', {
          params: { skip: (page - 1) * ITEMS_PER_PAGE, limit: ITEMS_PER_PAGE },
          signal: abortControllerRef.current.signal
        }).catch((err: Error) => {
          if (err.name === 'CanceledError') return { data: [] };
          throw err;
        }),
        api.get('/subscriptions/', { 
          signal: abortControllerRef.current.signal 
        }).catch((err: Error) => {
          if (err.name === 'CanceledError') return { data: [] };
          throw err;
        }),
        api.get('/students/', { 
          signal: abortControllerRef.current.signal 
        }).catch((err: Error) => {
          if (err.name === 'CanceledError') return { data: [] };
          throw err;
        })
      ]);

      setExpenses(expensesResponse.data);
      setIncomes(incomesResponse.data);
      setSubscriptions(subscriptionsResponse.data);
      setStudents(studentsResponse.data);
      setTotalPages(Math.ceil(expensesResponse.data.length / ITEMS_PER_PAGE));
    } catch (err) {
      if (err instanceof Error && err.name === 'CanceledError') return;
      setError('Ошибка при загрузке данных');
      console.error('Error fetching data:', err);
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    fetchData();
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [fetchData, debouncedDate]);

  const calculateSummary = useCallback(() => {
    const monthStart = startOfMonth(debouncedDate);
    const monthEnd = endOfMonth(debouncedDate);

    const monthExpenses = expenses.filter(expense => {
      const expenseDate = new Date(expense.date);
      return expenseDate >= monthStart && expenseDate <= monthEnd;
    });

    const monthIncomes = incomes.filter(income => {
      const incomeDate = new Date(income.date);
      return incomeDate >= monthStart && incomeDate <= monthEnd;
    });

    const rentExpense = monthExpenses
      .filter(expense => expense.category === 'rent')
      .reduce((sum, expense) => sum + expense.amount, 0);

    const otherExpenses = monthExpenses
      .filter(expense => expense.category !== 'rent')
      .reduce((sum, expense) => sum + expense.amount, 0);

    const subscriptionIncome = monthIncomes
      .filter(income => income.category === 'subscription')
      .reduce((sum, income) => sum + income.amount, 0);

    const otherIncome = monthIncomes
      .filter(income => income.category !== 'subscription')
      .reduce((sum, income) => sum + income.amount, 0);

    const totalExpenses = rentExpense + otherExpenses;
    const totalIncome = subscriptionIncome + otherIncome;

    setSummary({
      totalIncome,
      totalExpenses,
      profit: totalIncome - totalExpenses,
      subscriptionIncome,
      otherIncome,
      rentExpense,
      otherExpenses,
    });
  }, [expenses, incomes, debouncedDate]);

  useEffect(() => {
    calculateSummary();
  }, [calculateSummary]);

  const handleAddExpense = async () => {
    try {
      if (!newExpense.category || newExpense.category.length < 2) {
        setError('Категория должна содержать минимум 2 символа');
        return;
      }
      if (!newExpense.amount || newExpense.amount <= 0) {
        setError('Сумма должна быть больше 0');
        return;
      }

      const newExpenseResponse = await api.post('/expenses/', newExpense);
      setExpenses(prev => [...prev, newExpenseResponse.data]);
      setShowAddExpense(false);
      setNewExpense({
        amount: 0,
        description: '',
        category: '',
        date: new Date().toISOString().split('T')[0]
      });
      setError(null);
    } catch (error) {
      console.error('Error adding expense:', error);
      setError('Ошибка при добавлении расхода');
    }
  };

  const handleAddIncome = async () => {
    try {
      if (!newIncome.category || newIncome.category.length < 2) {
        setError('Категория должна содержать минимум 2 символа');
        return;
      }
      if (!newIncome.amount || newIncome.amount <= 0) {
        setError('Сумма должна быть больше 0');
        return;
      }

      const response = await api.post('/incomes/', newIncome);
      setIncomes(prev => [response.data, ...prev]);
      setShowAddIncome(false);
      setNewIncome({
        amount: 0,
        description: '',
        category: '',
        date: new Date().toISOString().split('T')[0]
      });
      setError(null);
    } catch (error) {
      console.error('Error adding income:', error);
      setError('Ошибка при добавлении дохода');
    }
  };

  const handleEditExpense = async () => {
    if (!editingExpense) return;
    try {
      const updatedExpenseResponse = await api.put(`/expenses/${editingExpense.id}`, editingExpense);
      setExpenses(prev => prev.map(expense => 
        expense.id === editingExpense.id ? updatedExpenseResponse.data : expense
      ));
      setShowAddExpense(false);
      setEditingExpense(null);
    } catch (error) {
      console.error('Error updating expense:', error);
      setError('Ошибка при обновлении расхода');
    }
  };

  const handleEditIncome = async () => {
    if (!editingIncome) return;
    try {
      const updatedIncomeResponse = await api.put(`/incomes/${editingIncome.id}`, editingIncome);
      setIncomes(prev => prev.map(income => 
        income.id === editingIncome.id ? updatedIncomeResponse.data : income
      ));
      setShowAddIncome(false);
      setEditingIncome(null);
    } catch (error) {
      console.error('Error updating income:', error);
      setError('Ошибка при обновлении дохода');
    }
  };

  const handleDeleteExpense = async (id: number) => {
    try {
      await api.delete(`/expenses/${id}`);
      setExpenses(prev => prev.filter(expense => expense.id !== id));
    } catch (error) {
      console.error('Error deleting expense:', error);
      setError('Ошибка при удалении расхода');
    }
  };

  const handleDeleteIncome = async (id: number) => {
    try {
      await api.delete(`/incomes/${id}`);
      setIncomes(prev => prev.filter(income => income.id !== id));
    } catch (error) {
      console.error('Error deleting income:', error);
      setError('Ошибка при удалении дохода');
    }
  };

  const handleCategoryChange = (type: 'expense' | 'income', category: string) => {
    const defaultDescriptions = {
      expense: {
        'rent': 'Аренда помещения',
        'utilities': 'Коммунальные услуги',
        'equipment': 'Покупка оборудования',
        'salary': 'Зарплата сотрудникам',
        'other': 'Прочие расходы'
      },
      income: {
        'subscription': 'Оплата абонемента',
        'lesson': 'Оплата разового занятия',
        'other': 'Прочие доходы'
      }
    };

    if (type === 'expense') {
      setNewExpense(prev => ({
        ...prev,
        category,
        description: defaultDescriptions.expense[category as keyof typeof defaultDescriptions.expense] || ''
      }));
    } else {
      setNewIncome(prev => ({
        ...prev,
        category,
        description: defaultDescriptions.income[category as keyof typeof defaultDescriptions.income] || '',
        amount: category === 'subscription' ? 0 : prev.amount
      }));
    }
  };

  const handleStudentSelect = (studentId: number) => {
    const selectedStudent = students.find(s => s.id === studentId);
    if (selectedStudent) {
      setSelectedStudent(selectedStudent);
      if (newIncome.category === 'subscription') {
        setNewIncome(prev => ({
          ...prev,
          description: `Оплата абонемента: ${selectedStudent.last_name} ${selectedStudent.first_name}`
        }));
      }
    }
  };

  const handleSubscriptionSelect = (subscriptionId: number) => {
    const selectedSubscription = subscriptions.find(s => s.id === subscriptionId);
    if (selectedSubscription) {
      setNewIncome(prev => ({
        ...prev,
        amount: selectedSubscription.price,
        description: selectedStudent 
          ? `Оплата абонемента: ${selectedSubscription.name} - ${selectedStudent.last_name} ${selectedStudent.first_name}`
          : `Оплата абонемента: ${selectedSubscription.name}`
      }));
    }
  };

  const handlePageChange = (event: React.ChangeEvent<unknown>, value: number) => {
    setPage(value);
  };

  if (loading) {
    return <Typography>Загрузка...</Typography>;
  }

  if (error) {
    return <Typography color="error">{error}</Typography>;
  }

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={ru}>
      <Box sx={{ p: 3 }}>
        <Grid container spacing={3}>
          {/* Финансовый обзор */}
          <Grid item xs={12}>
            <Paper sx={{ p: 2 }}>
              <Typography variant="h6" gutterBottom>
                Финансовый обзор
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6} md={3}>
                  <Card>
                    <CardContent>
                      <Typography color="textSecondary" gutterBottom>
                        {CompanyConfig.components.finance.totalIncome}
                      </Typography>
                      <Typography variant="h5">
                        {summary.totalIncome.toFixed(2)} ₽
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Card>
                    <CardContent>
                      <Typography color="textSecondary" gutterBottom>
                        {CompanyConfig.components.finance.totalExpenses}
                      </Typography>
                      <Typography variant="h5">
                        {summary.totalExpenses.toFixed(2)} ₽
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Card>
                    <CardContent>
                      <Typography color="textSecondary" gutterBottom>
                        {CompanyConfig.components.finance.profit}
                      </Typography>
                      <Typography variant="h5" color={summary.profit >= 0 ? 'success.main' : 'error.main'}>
                        {summary.profit.toFixed(2)} ₽
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Card>
                    <CardContent>
                      <Typography color="textSecondary" gutterBottom>
                        {CompanyConfig.components.finance.subscriptionIncome}
                      </Typography>
                      <Typography variant="h5">
                        {summary.subscriptionIncome.toFixed(2)} ₽
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>
            </Paper>
          </Grid>

          {/* Таблица расходов */}
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 2 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                <Typography variant="h6">{CompanyConfig.components.finance.expenses}</Typography>
                <Button variant="contained" onClick={() => setShowAddExpense(true)}>
                  {CompanyConfig.components.finance.addExpense}
                </Button>
              </Box>
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Дата</TableCell>
                      <TableCell>Описание</TableCell>
                      <TableCell>Категория</TableCell>
                      <TableCell align="right">Сумма</TableCell>
                      <TableCell>Действия</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {expenses.map((expense) => (
                      <TableRow key={expense.id}>
                        <TableCell>{format(new Date(expense.date), 'dd.MM.yyyy')}</TableCell>
                        <TableCell>{expense.description}</TableCell>
                        <TableCell>{expense.category}</TableCell>
                        <TableCell align="right">{expense.amount.toFixed(2)} ₽</TableCell>
                        <TableCell>
                          <IconButton onClick={() => {
                            setEditingExpense(expense);
                            setShowAddExpense(true);
                          }}>
                            <EditIcon />
                          </IconButton>
                          <IconButton onClick={() => handleDeleteExpense(expense.id)}>
                            <DeleteIcon />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
              <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
                <Pagination count={totalPages} page={page} onChange={handlePageChange} />
              </Box>
            </Paper>
          </Grid>

          {/* Таблица доходов */}
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 2 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                <Typography variant="h6">{CompanyConfig.components.finance.incomes}</Typography>
                <Button variant="contained" onClick={() => setShowAddIncome(true)}>
                  {CompanyConfig.components.finance.addIncome}
                </Button>
              </Box>
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Дата</TableCell>
                      <TableCell>Описание</TableCell>
                      <TableCell>Категория</TableCell>
                      <TableCell align="right">Сумма</TableCell>
                      <TableCell>Действия</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {incomes.map((income) => (
                      <TableRow key={income.id}>
                        <TableCell>{format(new Date(income.date), 'dd.MM.yyyy')}</TableCell>
                        <TableCell>{income.description}</TableCell>
                        <TableCell>{income.category}</TableCell>
                        <TableCell align="right">{income.amount.toFixed(2)} ₽</TableCell>
                        <TableCell>
                          <IconButton onClick={() => {
                            setEditingIncome(income);
                            setShowAddIncome(true);
                          }}>
                            <EditIcon />
                          </IconButton>
                          <IconButton onClick={() => handleDeleteIncome(income.id)}>
                            <DeleteIcon />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
              <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
                <Pagination count={totalPages} page={page} onChange={handlePageChange} />
              </Box>
            </Paper>
          </Grid>
        </Grid>

        {/* Диалоги добавления/редактирования */}
        <Dialog open={showAddExpense} onClose={() => setShowAddExpense(false)}>
          <DialogTitle>
            {editingExpense ? 'Редактировать расход' : 'Добавить расход'}
          </DialogTitle>
          <DialogContent>
            <TextField
              fullWidth
              margin="dense"
              label="Сумма"
              type="number"
              value={editingExpense?.amount || newExpense.amount}
              onChange={(e) => {
                if (editingExpense) {
                  setEditingExpense({ ...editingExpense, amount: parseFloat(e.target.value) });
                } else {
                  setNewExpense({ ...newExpense, amount: parseFloat(e.target.value) });
                }
              }}
            />
            <TextField
              fullWidth
              margin="dense"
              label="Описание"
              value={editingExpense?.description || newExpense.description}
              onChange={(e) => {
                if (editingExpense) {
                  setEditingExpense({ ...editingExpense, description: e.target.value });
                } else {
                  setNewExpense({ ...newExpense, description: e.target.value });
                }
              }}
            />
            <FormControl fullWidth margin="dense">
              <InputLabel>Категория</InputLabel>
              <Select
                value={editingExpense?.category || newExpense.category}
                onChange={(e) => handleCategoryChange('expense', e.target.value)}
              >
                <MenuItem value="rent">Аренда</MenuItem>
                <MenuItem value="utilities">Коммунальные услуги</MenuItem>
                <MenuItem value="equipment">Оборудование</MenuItem>
                <MenuItem value="salary">Зарплата</MenuItem>
                <MenuItem value="other">Прочее</MenuItem>
              </Select>
            </FormControl>
            <DatePicker
              label="Дата"
              value={editingExpense?.date ? new Date(editingExpense.date) : newExpense.date ? new Date(newExpense.date) : new Date()}
              onChange={(date) => {
                const dateString = date ? date.toISOString().split('T')[0] : new Date().toISOString().split('T')[0];
                if (editingExpense) {
                  setEditingExpense({ ...editingExpense, date: dateString });
                } else {
                  setNewExpense({ ...newExpense, date: dateString });
                }
              }}
              slotProps={{ textField: { fullWidth: true, margin: "dense" } }}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setShowAddExpense(false)}>Отмена</Button>
            <Button onClick={editingExpense ? handleEditExpense : handleAddExpense} variant="contained">
              {editingExpense ? 'Сохранить' : 'Добавить'}
            </Button>
          </DialogActions>
        </Dialog>

        <Dialog open={showAddIncome} onClose={() => setShowAddIncome(false)}>
          <DialogTitle>
            {editingIncome ? 'Редактировать доход' : 'Добавить доход'}
          </DialogTitle>
          <DialogContent>
            <TextField
              fullWidth
              margin="dense"
              label="Сумма"
              type="number"
              value={editingIncome?.amount || newIncome.amount}
              onChange={(e) => {
                if (editingIncome) {
                  setEditingIncome({ ...editingIncome, amount: parseFloat(e.target.value) });
                } else {
                  setNewIncome({ ...newIncome, amount: parseFloat(e.target.value) });
                }
              }}
              disabled={newIncome.category === 'subscription'}
            />
            <TextField
              fullWidth
              margin="dense"
              label="Описание"
              value={editingIncome?.description || newIncome.description}
              onChange={(e) => {
                if (editingIncome) {
                  setEditingIncome({ ...editingIncome, description: e.target.value });
                } else {
                  setNewIncome({ ...newIncome, description: e.target.value });
                }
              }}
              disabled={newIncome.category === 'subscription'}
            />
            <FormControl fullWidth margin="dense">
              <InputLabel>Категория</InputLabel>
              <Select
                value={editingIncome?.category || newIncome.category}
                onChange={(e) => handleCategoryChange('income', e.target.value)}
              >
                <MenuItem value="subscription">Абонемент</MenuItem>
                <MenuItem value="lesson">Разовое занятие</MenuItem>
                <MenuItem value="other">Прочее</MenuItem>
              </Select>
            </FormControl>
            {newIncome.category === 'subscription' && (
              <>
                <FormControl fullWidth margin="dense">
                  <InputLabel>Ученик</InputLabel>
                  <Select
                    value={selectedStudent?.id || ''}
                    onChange={(e) => handleStudentSelect(Number(e.target.value))}
                  >
                    {students.map(student => (
                      <MenuItem key={student.id} value={student.id}>
                        {student.last_name} {student.first_name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <FormControl fullWidth margin="dense">
                  <InputLabel>Абонемент</InputLabel>
                  <Select
                    value={newIncome.subscription_id || ''}
                    onChange={(e) => handleSubscriptionSelect(Number(e.target.value))}
                  >
                    {subscriptions.map(subscription => (
                      <MenuItem key={subscription.id} value={subscription.id}>
                        {subscription.name} - {subscription.price} ₽ ({subscription.lessons_count} занятий)
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </>
            )}
            <DatePicker
              label="Дата"
              value={editingIncome?.date ? new Date(editingIncome.date) : newIncome.date ? new Date(newIncome.date) : new Date()}
              onChange={(date) => {
                const dateString = date ? date.toISOString().split('T')[0] : new Date().toISOString().split('T')[0];
                if (editingIncome) {
                  setEditingIncome({ ...editingIncome, date: dateString });
                } else {
                  setNewIncome({ ...newIncome, date: dateString });
                }
              }}
              slotProps={{ textField: { fullWidth: true, margin: "dense" } }}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setShowAddIncome(false)}>Отмена</Button>
            <Button onClick={editingIncome ? handleEditIncome : handleAddIncome} variant="contained">
              {editingIncome ? 'Сохранить' : 'Добавить'}
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </LocalizationProvider>
  );
};

export default React.memo(Finance); 