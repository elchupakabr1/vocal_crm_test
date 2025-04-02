import React, { useState, useEffect } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Button,
  IconButton,
  Typography,
  Box,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem
} from '@mui/material';
import { Edit as EditIcon, Delete as DeleteIcon, Add as AddIcon } from '@mui/icons-material';
import axios from 'axios';
import { Student } from '../types/Student';
import { Subscription } from '../types/Subscription';
import { StudentForm } from './StudentForm';

const api = axios.create({
  baseURL: 'http://localhost:8000/api',
  withCredentials: true,
  headers: {
    'Cache-Control': 'no-cache, no-store, must-revalidate, max-age=0',
    'Pragma': 'no-cache',
    'Expires': '0',
    'X-Content-Type-Options': 'nosniff'
  }
});

export const Students: React.FC = () => {
  const [students, setStudents] = useState<Student[]>([]);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [openAddDialog, setOpenAddDialog] = useState(false);
  const [openSubscriptionDialog, setOpenSubscriptionDialog] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);

  const fetchStudents = async () => {
    try {
      const response = await api.get('/students/');
      setStudents(response.data);
    } catch (error) {
      console.error('Error fetching students:', error);
    }
  };

  const fetchSubscriptions = async () => {
    try {
      const response = await api.get('/subscriptions/');
      setSubscriptions(response.data);
    } catch (error) {
      console.error('Error fetching subscriptions:', error);
    }
  };

  useEffect(() => {
    fetchStudents();
    fetchSubscriptions();
  }, []);

  const handleEdit = (student: Student) => {
    setEditingStudent(student);
    setOpenAddDialog(true);
  };

  const handleSubmit = async (studentData: any) => {
    try {
      console.log('Отправляемые данные:', JSON.stringify(studentData, null, 2));
      
      if (editingStudent) {
        // При редактировании
        const updateData = {
          ...studentData,
          subscription_id: studentData.subscription_id
        };
        console.log('Данные для обновления:', JSON.stringify(updateData, null, 2));
        
        const response = await api.put(`/students/${editingStudent.id}`, updateData);
        console.log('Ответ сервера:', response.data);
        
        // Оптимизированное обновление состояния
        setStudents(prevStudents => 
          prevStudents.map(student => 
            student.id === editingStudent.id ? response.data : student
          )
        );
        
        // Обновляем selectedStudent, если он редактируется
        if (selectedStudent?.id === editingStudent.id) {
          setSelectedStudent(response.data);
        }
      } else {
        // При создании нового студента
        const createData = {
          ...studentData,
          subscription_id: studentData.subscription_id
        };
        console.log('Данные для создания:', JSON.stringify(createData, null, 2));
        
        const response = await api.post('/students/', createData);
        console.log('Ответ сервера:', response.data);
        setStudents(prevStudents => [...prevStudents, response.data]);
      }
      
      setOpenAddDialog(false);
      setEditingStudent(null);
    } catch (error) {
      console.error('Ошибка при сохранении студента:', error);
      if (axios.isAxiosError(error)) {
        console.error('Детали ошибки:', error.response?.data);
      }
    }
  };

  const handleDelete = async (id: number) => {
    if (window.confirm('Вы уверены, что хотите удалить этого студента?')) {
      try {
        await api.delete(`/students/${id}`);
        setStudents(prevStudents => prevStudents.filter(student => student.id !== id));
      } catch (error) {
        console.error('Error deleting student:', error);
      }
    }
  };

  const handleAssignSubscription = async (studentId: number, subscriptionId: number | null) => {
    try {
      console.log('Назначение абонемента. ID студента:', studentId, 'ID абонемента:', subscriptionId);
      
      const student = students.find(s => s.id === studentId);
      if (!student) {
        console.error('Студент не найден:', studentId);
        return;
      }

      const subscription = subscriptions.find(s => s.id === subscriptionId);
      console.log('Найденный абонемент:', subscription);
      
      const studentData = {
        first_name: student.first_name,
        last_name: student.last_name,
        phone: student.phone,
        email: student.email,
        subscription_id: subscriptionId,
        total_lessons: subscription ? subscription.lessons_count : 0,
        remaining_lessons: subscription ? subscription.lessons_count : 0
      };

      console.log('Отправляемые данные для назначения абонемента:', JSON.stringify(studentData, null, 2));
      const response = await api.put(`/students/${studentId}`, studentData);
      console.log('Ответ сервера при назначении абонемента:', response.data);
      
      // Оптимизированное обновление состояния
      setStudents(prevStudents => 
        prevStudents.map(student => 
          student.id === studentId ? response.data : student
        )
      );
      
      // Обновляем выбранного студента
      setSelectedStudent(response.data);
      
      // Закрываем диалог только после успешного обновления
      setOpenSubscriptionDialog(false);
    } catch (error) {
      console.error('Ошибка при назначении абонемента:', error);
      if (axios.isAxiosError(error)) {
        console.error('Детали ошибки:', error.response?.data);
      }
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h4">Студенты</Typography>
        <Button
          variant="contained"
          color="primary"
          startIcon={<AddIcon />}
          onClick={() => setOpenAddDialog(true)}
        >
          Добавить студента
        </Button>
      </Box>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Имя</TableCell>
              <TableCell>Телефон</TableCell>
              <TableCell>Email</TableCell>
              <TableCell>Всего уроков</TableCell>
              <TableCell>Осталось уроков</TableCell>
              <TableCell>Активный абонемент</TableCell>
              <TableCell>Действия</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {students.map((student) => (
              <TableRow key={student.id}>
                <TableCell>{student.first_name} {student.last_name}</TableCell>
                <TableCell>{student.phone}</TableCell>
                <TableCell>{student.email || '-'}</TableCell>
                <TableCell>{student.total_lessons}</TableCell>
                <TableCell>{student.remaining_lessons}</TableCell>
                <TableCell>
                  {student.subscription_id ? (
                    <Typography
                      sx={{ cursor: 'pointer', color: 'primary.main', textDecoration: 'underline' }}
                      onClick={() => {
                        console.log('Выбран студент:', student);
                        setSelectedStudent(student);
                        setOpenSubscriptionDialog(true);
                      }}
                    >
                      {subscriptions.find(s => s.id === student.subscription_id)?.name || 'Неизвестный абонемент'}
                    </Typography>
                  ) : (
                    <Typography
                      sx={{ cursor: 'pointer', color: 'text.secondary' }}
                      onClick={() => {
                        console.log('Выбран студент:', student);
                        setSelectedStudent(student);
                        setOpenSubscriptionDialog(true);
                      }}
                    >
                      Нет абонемента
                    </Typography>
                  )}
                </TableCell>
                <TableCell>
                  <IconButton
                    color="primary"
                    onClick={() => handleEdit(student)}
                  >
                    <EditIcon />
                  </IconButton>
                  <IconButton
                    color="error"
                    onClick={() => handleDelete(student.id)}
                  >
                    <DeleteIcon />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <StudentForm
        open={openAddDialog}
        onClose={() => {
          console.log('Закрытие формы студента');
          setOpenAddDialog(false);
          setEditingStudent(null);
        }}
        onSubmit={handleSubmit}
        subscriptions={subscriptions}
        initialData={editingStudent || undefined}
      />

      {selectedStudent && (
        <Dialog 
          open={openSubscriptionDialog} 
          onClose={() => {
            console.log('Закрытие диалога абонемента');
            setOpenSubscriptionDialog(false);
          }}
        >
          <DialogTitle>Назначить абонемент</DialogTitle>
          <DialogContent>
            <Typography variant="subtitle1" gutterBottom>
              Студент: {selectedStudent.first_name} {selectedStudent.last_name}
            </Typography>
            <TextField
              select
              fullWidth
              label="Выберите абонемент"
              value={selectedStudent.subscription_id || ''}
              onChange={(e) => {
                const subscriptionId = e.target.value ? Number(e.target.value) : null;
                console.log('Выбран абонемент:', subscriptionId);
                handleAssignSubscription(selectedStudent.id, subscriptionId);
              }}
              sx={{ mt: 2 }}
            >
              <MenuItem value="">
                <em>Без абонемента</em>
              </MenuItem>
              {subscriptions.map((subscription) => (
                <MenuItem key={subscription.id} value={subscription.id}>
                  {subscription.name} ({subscription.lessons_count} уроков)
                </MenuItem>
              ))}
            </TextField>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => {
              console.log('Закрытие диалога абонемента по кнопке');
              setOpenSubscriptionDialog(false);
            }}>
              Закрыть
            </Button>
          </DialogActions>
        </Dialog>
      )}
    </Box>
  );
}; 