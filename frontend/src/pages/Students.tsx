import React, { useState, useEffect } from 'react';
import {
  Box,
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
  Paper,
  Typography,
  IconButton,
  TableSortLabel,
  DialogContentText,
  Switch,
  FormControlLabel,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import { SelectChangeEvent } from '@mui/material/Select';
import api from '@/services/api';

interface Student {
  id: number;
  first_name: string;
  last_name: string;
  phone: string;
  total_lessons: number;
  remaining_lessons: number;
  created_at: string;
  subscription_id?: number;
}

interface Subscription {
  id: number;
  name: string;
  price: number;
  lessons_count: number;
  created_at: string;
}

interface SortConfig {
  key: keyof Student;
  direction: 'asc' | 'desc';
}

const Students: React.FC = () => {
  const [students, setStudents] = useState<Student[]>([]);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [open, setOpen] = useState(false);
  const [openStudentCard, setOpenStudentCard] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'first_name', direction: 'asc' });
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    subscriptionId: '',
  });

  useEffect(() => {
    fetchStudents();
    fetchSubscriptions();
  }, []);

  const fetchStudents = async () => {
    try {
      const response = await api.get('/students/');
      setStudents(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error('Error fetching students:', error);
      setStudents([]);
    }
  };

  const fetchSubscriptions = async () => {
    try {
      const response = await api.get('/subscriptions/');
      setSubscriptions(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error('Error fetching subscriptions:', error);
      setSubscriptions([]);
    }
  };

  const handleSort = (key: keyof Student) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const sortedStudents = [...students].sort((a, b) => {
    if (sortConfig.key === 'first_name' || sortConfig.key === 'last_name') {
      return sortConfig.direction === 'asc'
        ? a[sortConfig.key].localeCompare(b[sortConfig.key])
        : b[sortConfig.key].localeCompare(a[sortConfig.key]);
    }
    const aValue = a[sortConfig.key];
    const bValue = b[sortConfig.key];
    if (typeof aValue === 'number' && typeof bValue === 'number') {
      return sortConfig.direction === 'asc'
        ? aValue - bValue
        : bValue - aValue;
    }
    return 0;
  });

  const handleOpen = () => setOpen(true);
  const handleClose = () => {
    setOpen(false);
    setFormData({
      firstName: '',
      lastName: '',
      phone: '',
      subscriptionId: '',
    });
  };

  const handleOpenStudentCard = (student: Student) => {
    setSelectedStudent(student);
    setOpenStudentCard(true);
  };

  const handleCloseStudentCard = () => {
    setOpenStudentCard(false);
    setSelectedStudent(null);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | { name?: string; value: unknown }>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name as string]: value
    }));
  };

  const handleSubscriptionChange = (e: SelectChangeEvent) => {
    setFormData(prev => ({
      ...prev,
      subscriptionId: e.target.value
    }));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      const selectedSubscription = subscriptions.find(sub => sub.id === parseInt(formData.subscriptionId));
      const response = await api.post('/students/', {
        first_name: formData.firstName,
        last_name: formData.lastName,
        phone: formData.phone,
        total_lessons: selectedSubscription ? selectedSubscription.lessons_count : 0,
        remaining_lessons: selectedSubscription ? selectedSubscription.lessons_count : 0
      });

      setStudents([...students, response.data]);
      handleClose();
      setFormData({
        firstName: '',
        lastName: '',
        phone: '',
        subscriptionId: '',
      });
    } catch (error) {
      console.error('Error creating student:', error);
      alert('Ошибка при создании студента');
    }
  };

  const handleEditSubmit = async () => {
    if (!selectedStudent) return;
    try {
      const response = await api.put(`/students/${selectedStudent.id}`, {
        first_name: selectedStudent.first_name,
        last_name: selectedStudent.last_name,
        phone: selectedStudent.phone,
        total_lessons: selectedStudent.total_lessons,
        remaining_lessons: selectedStudent.remaining_lessons
      });

      await fetchStudents();
      handleCloseStudentCard();
    } catch (error) {
      console.error('Error updating student:', error);
      alert('Ошибка при обновлении студента');
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Вы уверены, что хотите удалить этого студента?')) {
      return;
    }
    try {
      await api.delete(`/students/${id}`);
      await fetchStudents();
    } catch (error) {
      console.error('Error deleting student:', error);
      alert('Ошибка при удалении студента');
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h4">Студенты</Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={handleOpen}>
          Добавить студента
        </Button>
      </Box>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell onClick={() => handleSort('first_name')} style={{ cursor: 'pointer' }}>
                Имя {sortConfig.key === 'first_name' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
              </TableCell>
              <TableCell onClick={() => handleSort('last_name')} style={{ cursor: 'pointer' }}>
                Фамилия {sortConfig.key === 'last_name' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
              </TableCell>
              <TableCell>Телефон</TableCell>
              <TableCell onClick={() => handleSort('total_lessons')} style={{ cursor: 'pointer' }}>
                Всего уроков {sortConfig.key === 'total_lessons' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
              </TableCell>
              <TableCell onClick={() => handleSort('remaining_lessons')} style={{ cursor: 'pointer' }}>
                Осталось уроков {sortConfig.key === 'remaining_lessons' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
              </TableCell>
              <TableCell>Действия</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {sortedStudents.map((student) => (
              <TableRow key={student.id}>
                <TableCell>{student.first_name}</TableCell>
                <TableCell>{student.last_name}</TableCell>
                <TableCell>{student.phone}</TableCell>
                <TableCell>{student.total_lessons}</TableCell>
                <TableCell>{student.remaining_lessons}</TableCell>
                <TableCell>
                  <IconButton onClick={() => handleOpenStudentCard(student)}>
                    <EditIcon />
                  </IconButton>
                  <IconButton onClick={() => handleDelete(student.id)}>
                    <DeleteIcon />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Диалог добавления ученика */}
      <Dialog open={open} onClose={handleClose}>
        <DialogTitle>Добавить студента</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Имя"
            fullWidth
            name="firstName"
            value={formData.firstName}
            onChange={handleInputChange}
            required
          />
          <TextField
            margin="dense"
            label="Фамилия"
            fullWidth
            name="lastName"
            value={formData.lastName}
            onChange={handleInputChange}
            required
          />
          <TextField
            margin="dense"
            label="Телефон"
            fullWidth
            name="phone"
            value={formData.phone}
            onChange={handleInputChange}
            required
          />
          <FormControl fullWidth margin="dense">
            <InputLabel>Абонемент</InputLabel>
            <Select
              name="subscriptionId"
              value={formData.subscriptionId}
              onChange={handleSubscriptionChange}
              label="Абонемент"
            >
              <MenuItem value="">Нет абонемента</MenuItem>
              {subscriptions.map((sub) => (
                <MenuItem key={sub.id} value={sub.id}>
                  {sub.name} ({sub.lessons_count} занятий)
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          {formData.subscriptionId && (
            <Box sx={{ mt: 2, p: 2, bgcolor: 'grey.100', borderRadius: 1 }}>
              <Typography variant="body2" color="text.secondary">
                Количество занятий будет установлено автоматически на основе выбранного абонемента
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>Отмена</Button>
          <Button onClick={handleSubmit} variant="contained">
            Добавить
          </Button>
        </DialogActions>
      </Dialog>

      {/* Карточка ученика */}
      <Dialog open={openStudentCard} onClose={handleCloseStudentCard}>
        <DialogTitle>Редактировать студента</DialogTitle>
        <DialogContent>
          {selectedStudent && (
            <>
              <TextField
                margin="dense"
                label="Имя"
                fullWidth
                value={selectedStudent.first_name}
                onChange={(e) => setSelectedStudent({ ...selectedStudent, first_name: e.target.value })}
              />
              <TextField
                margin="dense"
                label="Фамилия"
                fullWidth
                value={selectedStudent.last_name}
                onChange={(e) => setSelectedStudent({ ...selectedStudent, last_name: e.target.value })}
              />
              <TextField
                margin="dense"
                label="Телефон"
                fullWidth
                value={selectedStudent.phone}
                onChange={(e) => setSelectedStudent({ ...selectedStudent, phone: e.target.value })}
              />
              <FormControl fullWidth margin="dense">
                <InputLabel>Абонемент</InputLabel>
                <Select
                  value={selectedStudent.subscription_id?.toString() || ''}
                  onChange={(e) => {
                    const subscriptionId = parseInt(e.target.value);
                    const subscription = subscriptions.find(sub => sub.id === subscriptionId);
                    if (subscription) {
                      setSelectedStudent({
                        ...selectedStudent,
                        subscription_id: subscriptionId,
                        total_lessons: subscription.lessons_count,
                        remaining_lessons: subscription.lessons_count
                      });
                    } else {
                      setSelectedStudent({
                        ...selectedStudent,
                        subscription_id: undefined,
                        total_lessons: 0,
                        remaining_lessons: 0
                      });
                    }
                  }}
                  label="Абонемент"
                >
                  <MenuItem value="">Нет абонемента</MenuItem>
                  {subscriptions.map((sub) => (
                    <MenuItem key={sub.id} value={sub.id}>
                      {sub.name} ({sub.lessons_count} занятий)
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <Box sx={{ mt: 2, p: 2, bgcolor: 'grey.100', borderRadius: 1 }}>
                <Typography variant="body2" color="text.secondary">
                  Всего занятий: {selectedStudent.total_lessons}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Осталось занятий: {selectedStudent.remaining_lessons}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                  Количество занятий обновляется автоматически на основе абонемента и проведенных уроков
                </Typography>
              </Box>
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseStudentCard}>Закрыть</Button>
          <Button onClick={handleEditSubmit} variant="contained">
            Сохранить изменения
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Students; 