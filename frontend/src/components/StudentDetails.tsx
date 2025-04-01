import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Grid,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { ru } from 'date-fns/locale';
import { format } from 'date-fns';
import api from '@/services/api';

interface Student {
  id: number;
  first_name: string;
  last_name: string;
  phone: string;
  email: string;
  subscriptions: Subscription[];
}

interface Subscription {
  id: number;
  subscription_type_id: number;
  start_date: string;
  lessons_remaining: number;
  status: string;
}

interface SubscriptionType {
  id: number;
  name: string;
  price: number;
  lessons_count: number;
}

interface StudentDetailsProps {
  studentId: number;
}

const StudentDetails: React.FC<StudentDetailsProps> = ({ studentId }) => {
  const [student, setStudent] = useState<Student | null>(null);
  const [subscriptionTypes, setSubscriptionTypes] = useState<SubscriptionType[]>([]);
  const [showAddSubscription, setShowAddSubscription] = useState(false);
  const [newSubscription, setNewSubscription] = useState<Partial<Subscription>>({
    subscription_type_id: 0,
    start_date: new Date().toISOString().split('T')[0],
    lessons_remaining: 0,
    status: 'active'
  });
  const [selectedSubscriptionType, setSelectedSubscriptionType] = useState<SubscriptionType | null>(null);

  useEffect(() => {
    fetchStudent();
    fetchSubscriptionTypes();
  }, [studentId]);

  const fetchStudent = async () => {
    try {
      const response = await api.get(`/students/${studentId}`);
      setStudent(response.data);
    } catch (error) {
      console.error('Error fetching student:', error);
    }
  };

  const fetchSubscriptionTypes = async () => {
    try {
      const response = await api.get('/subscription-types/');
      setSubscriptionTypes(response.data);
    } catch (error) {
      console.error('Error fetching subscription types:', error);
    }
  };

  const handleAddSubscription = async () => {
    if (!student || !selectedSubscriptionType) return;

    try {
      // Создаем абонемент
      const subscriptionResponse = await api.post('/subscriptions/', {
        name: selectedSubscriptionType.name,
        price: selectedSubscriptionType.price,
        lessons_count: selectedSubscriptionType.lessons_count,
        start_date: newSubscription.start_date,
        lessons_remaining: selectedSubscriptionType.lessons_count,
        status: newSubscription.status
      });

      // Обновляем данные ученика
      await api.put(`/students/${student.id}`, {
        subscription_id: subscriptionResponse.data.id,
        remaining_lessons: selectedSubscriptionType.lessons_count
      });

      // Создаем запись о доходе
      await api.post('/incomes/', {
        amount: selectedSubscriptionType.price,
        description: `Оплата абонемента: ${selectedSubscriptionType.name} - ${student.last_name} ${student.first_name}`,
        category: 'subscription',
        date: new Date().toISOString().split('T')[0]
      });

      // Обновляем данные студента
      await fetchStudent();

      setShowAddSubscription(false);
      setNewSubscription({
        subscription_type_id: 0,
        start_date: new Date().toISOString().split('T')[0],
        lessons_remaining: 0,
        status: 'active'
      });
      setSelectedSubscriptionType(null);
    } catch (error) {
      console.error('Error adding subscription:', error);
    }
  };

  const handleSubscriptionTypeChange = (subscriptionTypeId: number) => {
    const selectedType = subscriptionTypes.find(type => type.id === subscriptionTypeId);
    if (selectedType) {
      setSelectedSubscriptionType(selectedType);
      setNewSubscription(prev => ({
        ...prev,
        subscription_type_id: subscriptionTypeId,
        lessons_remaining: selectedType.lessons_count
      }));
    }
  };

  if (!student) {
    return <Typography>Загрузка...</Typography>;
  }

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={ru}>
      <Box sx={{ p: 3 }}>
        <Paper sx={{ p: 3 }}>
          <Typography variant="h4" gutterBottom>
            {student.last_name} {student.first_name}
          </Typography>

          <Grid container spacing={3} sx={{ mb: 3 }}>
            <Grid item xs={12} md={6}>
              <Typography variant="h6" gutterBottom>
                Контактная информация
              </Typography>
              <Typography>Телефон: {student.phone}</Typography>
              <Typography>Email: {student.email}</Typography>
            </Grid>
            <Grid item xs={12} md={6}>
              <Button
                variant="contained"
                onClick={() => setShowAddSubscription(true)}
                sx={{ mb: 2 }}
              >
                Добавить абонемент
              </Button>
            </Grid>
          </Grid>

          <Typography variant="h6" gutterBottom>
            Абонементы
          </Typography>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Тип абонемента</TableCell>
                  <TableCell>Дата начала</TableCell>
                  <TableCell>Осталось занятий</TableCell>
                  <TableCell>Статус</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {student.subscriptions.map((subscription) => {
                  const subscriptionType = subscriptionTypes.find(
                    type => type.id === subscription.subscription_type_id
                  );
                  return (
                    <TableRow key={subscription.id}>
                      <TableCell>{subscriptionType?.name || 'Неизвестный тип'}</TableCell>
                      <TableCell>{format(new Date(subscription.start_date), 'dd.MM.yyyy')}</TableCell>
                      <TableCell>{subscription.lessons_remaining}</TableCell>
                      <TableCell>{subscription.status}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>

          <Dialog open={showAddSubscription} onClose={() => setShowAddSubscription(false)}>
            <DialogTitle>Добавить абонемент</DialogTitle>
            <DialogContent>
              <FormControl fullWidth sx={{ mt: 2 }}>
                <InputLabel>Тип абонемента</InputLabel>
                <Select
                  value={newSubscription.subscription_type_id || 0}
                  onChange={(e) => handleSubscriptionTypeChange(Number(e.target.value))}
                  label="Тип абонемента"
                >
                  {subscriptionTypes.map((type) => (
                    <MenuItem key={type.id} value={type.id}>
                      {type.name} - {type.price}₽ ({type.lessons_count} занятий)
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <DatePicker
                label="Дата начала"
                value={new Date(newSubscription.start_date || '')}
                onChange={(date) => {
                  const dateString = date ? date.toISOString().split('T')[0] : new Date().toISOString().split('T')[0];
                  setNewSubscription(prev => ({ ...prev, start_date: dateString }));
                }}
                slotProps={{ textField: { fullWidth: true, margin: "dense" } }}
              />

              <FormControl fullWidth sx={{ mt: 2 }}>
                <InputLabel>Статус</InputLabel>
                <Select
                  value={newSubscription.status || ''}
                  onChange={(e) => setNewSubscription(prev => ({ ...prev, status: e.target.value }))}
                  label="Статус"
                >
                  <MenuItem value="active">Активный</MenuItem>
                  <MenuItem value="completed">Завершен</MenuItem>
                  <MenuItem value="cancelled">Отменен</MenuItem>
                </Select>
              </FormControl>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setShowAddSubscription(false)}>Отмена</Button>
              <Button onClick={handleAddSubscription} variant="contained" color="primary">
                Добавить
              </Button>
            </DialogActions>
          </Dialog>
        </Paper>
      </Box>
    </LocalizationProvider>
  );
};

export default StudentDetails; 