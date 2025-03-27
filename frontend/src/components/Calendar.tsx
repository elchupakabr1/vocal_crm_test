import React, { useState, useEffect } from 'react';
import {
  Container,
  Paper,
  Typography,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Box,
  ToggleButtonGroup,
  ToggleButton,
  Grid,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Menu,
  MenuItem,
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { TimePicker } from '@mui/x-date-pickers/TimePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { ru } from 'date-fns/locale';
import { 
  format, 
  addMinutes, 
  startOfWeek, 
  endOfWeek, 
  eachDayOfInterval, 
  isSameDay,
  startOfMonth,
  endOfMonth,
  eachWeekOfInterval,
  isSameMonth,
  isToday,
  parseISO,
  setHours,
  setMinutes,
} from 'date-fns';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';

interface Lesson {
  id: number;
  title: string;
  start_time: Date;
  end_time: Date;
  student_name: string;
  notes?: string;
}

type ViewType = 'day' | 'week' | 'month';

const Calendar: React.FC = () => {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [viewType, setViewType] = useState<ViewType>('day');
  const [newLesson, setNewLesson] = useState({
    title: '',
    student_name: '',
    start_time: new Date(),
    duration: 60,
    notes: '',
  });
  const { isAuthenticated } = useAuth();
  const [editingLesson, setEditingLesson] = useState<Lesson | null>(null);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);

  useEffect(() => {
    fetchLessons();
  }, []);

  const fetchLessons = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        console.error('No authentication token found');
        return;
      }

      const response = await axios.get('http://localhost:8000/api/lessons', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      console.log('Полученные данные с сервера:', response.data);
      
      // Преобразуем массив в объекты с правильными ключами
      const processedLessons = response.data.map((lesson: any[]) => ({
        id: lesson[0],
        title: lesson[1],
        start_time: new Date(lesson[2]),
        end_time: new Date(lesson[3]),
        student_name: lesson[4],
        notes: lesson[5] || '',
      }));
      
      console.log('Обработанные занятия:', processedLessons);
      setLessons(processedLessons);
    } catch (error) {
      console.error('Error fetching lessons:', error);
      if (axios.isAxiosError(error) && error.response) {
        console.error('Response data:', error.response.data);
      }
    }
  };

  const handleAddLesson = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        console.error('No authentication token found');
        return;
      }

      const endTime = addMinutes(newLesson.start_time, newLesson.duration);
      
      const lessonData = {
        id: 0,
        title: newLesson.title,
        student_name: newLesson.student_name,
        start_time: format(newLesson.start_time, "yyyy-MM-dd HH:mm:ss"),
        end_time: format(endTime, "yyyy-MM-dd HH:mm:ss"),
        notes: newLesson.notes || '',
      };

      console.log('Отправляемые данные:', lessonData);

      await axios.post('http://localhost:8000/api/lessons', lessonData, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      setOpenDialog(false);
      setNewLesson({
        title: '',
        student_name: '',
        start_time: new Date(),
        duration: 60,
        notes: '',
      });
      fetchLessons();
    } catch (error) {
      console.error('Error adding lesson:', error);
      if (axios.isAxiosError(error) && error.response) {
        console.error('Response data:', error.response.data);
      }
    }
  };

  const getLessonsForDate = (date: Date) => {
    return lessons.filter(lesson => {
      return isSameDay(lesson.start_time, date);
    });
  };

  const handleDateClick = (date: Date) => {
    setSelectedDate(date);
    setViewType('day');
  };

  const handleTimeClick = (date: Date) => {
    setSelectedDate(date);
    setNewLesson(prev => ({
      ...prev,
      start_time: date,
    }));
    setOpenDialog(true);
  };

  const handleDeleteLesson = async (lessonId: number) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        console.error('No authentication token found');
        return;
      }

      await axios.delete(`http://localhost:8000/api/lessons/${lessonId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      setLessons(lessons.filter(lesson => lesson.id !== lessonId));
      setAnchorEl(null);
    } catch (error) {
      console.error('Error deleting lesson:', error);
    }
  };

  const handleEditLesson = async () => {
    if (!editingLesson) return;

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        console.error('No authentication token found');
        return;
      }

      const endTime = addMinutes(editingLesson.start_time, newLesson.duration);
      
      const lessonData = {
        title: editingLesson.title,
        student_name: editingLesson.student_name,
        start_time: format(editingLesson.start_time, "yyyy-MM-dd HH:mm:ss"),
        end_time: format(endTime, "yyyy-MM-dd HH:mm:ss"),
        notes: editingLesson.notes || '',
      };

      await axios.put(`http://localhost:8000/api/lessons/${editingLesson.id}`, lessonData, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      setOpenDialog(false);
      setEditingLesson(null);
      fetchLessons();
    } catch (error) {
      console.error('Error updating lesson:', error);
    }
  };

  const handleLessonMenuClick = (event: React.MouseEvent<HTMLElement>, lesson: Lesson) => {
    event.stopPropagation();
    setAnchorEl(event.currentTarget);
    setSelectedLesson(lesson);
  };

  const handleLessonMenuClose = () => {
    setAnchorEl(null);
    setSelectedLesson(null);
  };

  const handleEditClick = () => {
    if (selectedLesson) {
      setEditingLesson(selectedLesson);
      setNewLesson({
        title: selectedLesson.title,
        student_name: selectedLesson.student_name,
        start_time: selectedLesson.start_time,
        duration: 60,
        notes: selectedLesson.notes || '',
      });
      setOpenDialog(true);
    }
    handleLessonMenuClose();
  };

  const handleDeleteClick = () => {
    if (selectedLesson) {
      handleDeleteLesson(selectedLesson.id);
    }
    handleLessonMenuClose();
  };

  const renderMonthView = () => {
    const monthStart = startOfMonth(selectedDate);
    const monthEnd = endOfMonth(selectedDate);
    const weeks = eachWeekOfInterval({ start: monthStart, end: monthEnd });
    const weekDays = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

    return (
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              {weekDays.map(day => (
                <TableCell key={day} align="center">
                  <Typography variant="subtitle1">{day}</Typography>
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {weeks.map((week, weekIndex) => {
              const weekDays = eachDayOfInterval({ 
                start: startOfWeek(week), 
                end: endOfWeek(week) 
              });
              
              return (
                <TableRow key={weekIndex}>
                  {weekDays.map((day, dayIndex) => {
                    const dayLessons = getLessonsForDate(day);
                    const isCurrentMonth = isSameMonth(day, selectedDate);
                    const isCurrentDay = isToday(day);

                    return (
                      <TableCell 
                        key={dayIndex}
                        onClick={() => handleDateClick(day)}
                        sx={{
                          minHeight: '100px',
                          backgroundColor: isCurrentDay ? 'rgba(25, 118, 210, 0.1)' : 'inherit',
                          opacity: isCurrentMonth ? 1 : 0.5,
                          cursor: 'pointer',
                          '&:hover': {
                            backgroundColor: 'rgba(25, 118, 210, 0.05)',
                          },
                        }}
                      >
                        <Typography 
                          variant="body2" 
                          sx={{ 
                            mb: 1,
                            fontWeight: isCurrentDay ? 'bold' : 'normal',
                          }}
                        >
                          {format(day, 'd')}
                        </Typography>
                        {dayLessons.map((lesson) => (
                          <Paper 
                            key={lesson.id} 
                            onClick={(e) => {
                              e.stopPropagation();
                              handleTimeClick(lesson.start_time);
                            }}
                            sx={{ 
                              p: 0.5, 
                              mb: 0.5,
                              fontSize: '0.75rem',
                              backgroundColor: 'rgba(25, 118, 210, 0.1)',
                              cursor: 'pointer',
                              '&:hover': {
                                backgroundColor: 'rgba(25, 118, 210, 0.2)',
                              },
                            }}
                          >
                            <Typography variant="caption" display="block">
                              {format(lesson.start_time, 'HH:mm')}
                            </Typography>
                            <Typography variant="caption" display="block" noWrap>
                              {lesson.title}
                            </Typography>
                          </Paper>
                        ))}
                      </TableCell>
                    );
                  })}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>
    );
  };

  const renderWeekView = () => {
    const weekStart = startOfWeek(selectedDate);
    const weekEnd = endOfWeek(selectedDate);
    const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });

    return (
      <Grid container spacing={2}>
        {weekDays.map((day) => (
          <Grid item xs={12} sm={6} md={4} key={day.toISOString()}>
            <Card 
              onClick={() => handleDateClick(day)}
              sx={{ 
                cursor: 'pointer',
                '&:hover': {
                  backgroundColor: 'rgba(25, 118, 210, 0.05)',
                },
              }}
            >
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  {format(day, 'EEEE, d MMMM', { locale: ru })}
                </Typography>
                {getLessonsForDate(day).map((lesson) => (
                  <Paper 
                    key={lesson.id} 
                    onClick={(e) => {
                      e.stopPropagation();
                      handleTimeClick(lesson.start_time);
                    }}
                    sx={{ 
                      p: 1, 
                      mb: 1,
                      cursor: 'pointer',
                      '&:hover': {
                        backgroundColor: 'rgba(25, 118, 210, 0.1)',
                      },
                    }}
                  >
                    <Typography variant="subtitle1">{lesson.title}</Typography>
                    <Typography variant="body2">
                      {format(lesson.start_time, 'HH:mm')} - 
                      {format(lesson.end_time, 'HH:mm')}
                    </Typography>
                    <Typography variant="body2">{lesson.student_name}</Typography>
                  </Paper>
                ))}
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    );
  };

  const renderDayView = () => {
    const dayLessons = getLessonsForDate(selectedDate);
    const hours = Array.from({ length: 24 }, (_, i) => i);
    
    return (
      <Box>
        <Typography variant="h6" gutterBottom>
          {format(selectedDate, 'EEEE, d MMMM yyyy', { locale: ru })}
        </Typography>
        <TableContainer component={Paper}>
          <Table>
            <TableBody>
              {hours.map((hour) => {
                const hourDate = setHours(setMinutes(selectedDate, 0), hour);
                const hourLessons = dayLessons.filter(lesson => 
                  format(lesson.start_time, 'HH') === format(hourDate, 'HH')
                );

                return (
                  <TableRow key={hour}>
                    <TableCell sx={{ width: '100px' }}>
                      <Typography variant="body2">
                        {format(hourDate, 'HH:mm')}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      {hourLessons.map((lesson) => (
                        <Paper 
                          key={lesson.id} 
                          onClick={() => handleTimeClick(lesson.start_time)}
                          sx={{ 
                            p: 2, 
                            mb: 2,
                            cursor: 'pointer',
                            position: 'relative',
                            '&:hover': {
                              backgroundColor: 'rgba(25, 118, 210, 0.05)',
                            },
                          }}
                        >
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <Box>
                              <Typography variant="subtitle1">{lesson.title}</Typography>
                              <Typography variant="body2">
                                {format(lesson.start_time, 'HH:mm')} - 
                                {format(lesson.end_time, 'HH:mm')}
                              </Typography>
                              <Typography variant="body2">{lesson.student_name}</Typography>
                              {lesson.notes && (
                                <Typography variant="body2" color="text.secondary">
                                  {lesson.notes}
                                </Typography>
                              )}
                            </Box>
                            <IconButton
                              size="small"
                              onClick={(e) => handleLessonMenuClick(e, lesson)}
                            >
                              <MoreVertIcon />
                            </IconButton>
                          </Box>
                        </Paper>
                      ))}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>
    );
  };

  const renderView = () => {
    switch (viewType) {
      case 'day':
        return renderDayView();
      case 'week':
        return renderWeekView();
      case 'month':
        return renderMonthView();
      default:
        return renderDayView();
    }
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Paper sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
          <Typography variant="h4">Расписание занятий</Typography>
          <Box>
            <ToggleButtonGroup
              value={viewType}
              exclusive
              onChange={(e, newView) => newView && setViewType(newView)}
              sx={{ mr: 2 }}
            >
              <ToggleButton value="day">День</ToggleButton>
              <ToggleButton value="week">Неделя</ToggleButton>
              <ToggleButton value="month">Месяц</ToggleButton>
            </ToggleButtonGroup>
            <Button
              variant="contained"
              onClick={() => setOpenDialog(true)}
              disabled={!isAuthenticated}
            >
              Добавить занятие
            </Button>
          </Box>
        </Box>

        <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={ru}>
          <DatePicker
            label="Выберите дату"
            value={selectedDate}
            onChange={(newValue) => newValue && setSelectedDate(newValue)}
            sx={{ mb: 3 }}
          />
        </LocalizationProvider>

        {renderView()}

        <Dialog open={openDialog} onClose={() => setOpenDialog(false)}>
          <DialogTitle>
            {editingLesson ? 'Редактировать занятие' : 'Добавить новое занятие'}
          </DialogTitle>
          <DialogContent>
            <TextField
              autoFocus
              margin="dense"
              label="Название занятия"
              fullWidth
              value={newLesson.title}
              onChange={(e) => setNewLesson({ ...newLesson, title: e.target.value })}
            />
            <TextField
              margin="dense"
              label="Имя ученика"
              fullWidth
              value={newLesson.student_name}
              onChange={(e) => setNewLesson({ ...newLesson, student_name: e.target.value })}
            />
            <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={ru}>
              <TimePicker
                label="Время начала"
                value={newLesson.start_time}
                onChange={(newValue) => newValue && setNewLesson({ ...newLesson, start_time: newValue })}
                sx={{ mt: 2, width: '100%' }}
              />
            </LocalizationProvider>
            <TextField
              margin="dense"
              label="Длительность (минуты)"
              type="number"
              fullWidth
              value={newLesson.duration}
              onChange={(e) => setNewLesson({ ...newLesson, duration: parseInt(e.target.value) })}
            />
            <TextField
              margin="dense"
              label="Заметки"
              fullWidth
              multiline
              rows={4}
              value={newLesson.notes}
              onChange={(e) => setNewLesson({ ...newLesson, notes: e.target.value })}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => {
              setOpenDialog(false);
              setEditingLesson(null);
            }}>
              Отмена
            </Button>
            <Button 
              onClick={editingLesson ? handleEditLesson : handleAddLesson} 
              variant="contained"
            >
              {editingLesson ? 'Сохранить' : 'Добавить'}
            </Button>
          </DialogActions>
        </Dialog>

        <Menu
          anchorEl={anchorEl}
          open={Boolean(anchorEl)}
          onClose={handleLessonMenuClose}
        >
          <MenuItem onClick={handleEditClick}>Редактировать</MenuItem>
          <MenuItem onClick={handleDeleteClick}>Удалить</MenuItem>
        </Menu>
      </Paper>
    </Container>
  );
};

export default Calendar; 