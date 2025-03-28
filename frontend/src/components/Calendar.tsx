import React, { useState, useEffect, useCallback, useMemo, memo } from 'react';
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
  setMinutes
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

// Вспомогательная функция для разбиения массива на чанки
const chunk = <T,>(array: T[], size: number): T[][] => {
  return Array.from({ length: Math.ceil(array.length / size) }, (_, i) =>
    array.slice(i * size, i * size + size)
  );
};

// Выносим константы за пределы компонента
const WEEKDAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
const HOURS = Array.from({ length: 24 }, (_, i) => i);

// Мемоизированный компонент для отображения времени
const TimeCell = memo(({ hour }: { hour: number }) => (
  <TableCell>{format(setHours(new Date(), hour), 'HH:mm')}</TableCell>
));

// Мемоизированный компонент для заголовка таблицы
const TableHeader = memo(({ viewType, weekDays }: { viewType: ViewType; weekDays: Date[] }) => (
  <TableHead>
    <TableRow>
      {viewType !== 'month' && <TableCell>Время</TableCell>}
      {viewType === 'month' ? (
        WEEKDAYS.map((day) => (
          <TableCell key={day}>{day}</TableCell>
        ))
      ) : (
        weekDays.map((date) => (
          <TableCell key={date.toISOString()}>
            {format(date, 'EEEE, d MMMM')}
          </TableCell>
        ))
      )}
    </TableRow>
  </TableHead>
));

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

  // Функция для загрузки уроков
  const fetchLessons = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        console.error('No authentication token found');
        return;
      }

      const response = await axios.get(`${process.env.REACT_APP_API_URL}/lessons`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      console.log('Raw server data:', response.data); // Для отладки

      const transformedLessons = response.data.map((lesson: any) => ({
        id: lesson.id,
        title: lesson.title,
        start_time: new Date(lesson.start_time),
        end_time: new Date(lesson.end_time),
        student_name: lesson.student_name,
        notes: lesson.notes || '',
      }));

      console.log('Transformed lessons:', transformedLessons); // Для отладки
      setLessons(transformedLessons);
    } catch (error) {
      console.error('Error fetching lessons:', error);
    }
  }, []);

  // Оптимизация вычисляемых значений
  const monthStart = useMemo(() => startOfMonth(selectedDate), [selectedDate]);
  const monthEnd = useMemo(() => endOfMonth(selectedDate), [selectedDate]);
  const days = useMemo(() => eachDayOfInterval({ start: monthStart, end: monthEnd }), [monthStart, monthEnd]);
  const weeks = useMemo(() => chunk(days, 7), [days]);
  const weekDays = useMemo(() => eachDayOfInterval({
    start: startOfWeek(selectedDate),
    end: endOfWeek(selectedDate),
  }), [selectedDate]);

  // Оптимизация функции фильтрации уроков
  const getLessonsForDate = useCallback((date: Date) => {
    return lessons.filter(lesson => {
      const lessonDate = new Date(lesson.start_time);
      return isSameDay(lessonDate, date);
    });
  }, [lessons]);

  // Оптимизация функции получения уроков за час
  const getLessonsForHour = useCallback((date: Date, hour: number) => {
    const startOfHour = setHours(date, hour);
    const endOfHour = setHours(date, hour + 1);
    
    return lessons.filter(lesson => {
      const lessonStart = new Date(lesson.start_time);
      return lessonStart >= startOfHour && lessonStart < endOfHour;
    });
  }, [lessons]);

  // Мемоизация функций
  const handleDateClick = useCallback((date: Date) => {
    setSelectedDate(date);
    setViewType('day');
  }, []);

  const handleTimeClick = useCallback((date: Date) => {
    setSelectedDate(date);
    setNewLesson(prev => ({
      ...prev,
      start_time: date,
    }));
    setOpenDialog(true);
  }, []);

  const handleAddLesson = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        console.error('No authentication token found');
        return;
      }

      const endTime = addMinutes(newLesson.start_time, newLesson.duration);
      
      // Форматируем даты в ISO формат с учетом часового пояса
      const startTimeISO = format(newLesson.start_time, "yyyy-MM-dd'T'HH:mm:ss");
      const endTimeISO = format(endTime, "yyyy-MM-dd'T'HH:mm:ss");
      
      const lessonData = {
        title: newLesson.title,
        student_name: newLesson.student_name,
        start_time: startTimeISO,
        end_time: endTimeISO,
        notes: newLesson.notes || '',
      };

      console.log('Sending lesson data:', lessonData); // Для отладки

      const response = await axios.post(`${process.env.REACT_APP_API_URL}/lessons`, lessonData, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      console.log('Server response:', response.data); // Для отладки

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
        console.error('Server response:', error.response.data);
        console.error('Request data:', error.config?.data);
      }
    }
  }, [newLesson]);

  // Мемоизированный компонент для отображения урока
  const LessonItem = memo(({ lesson }: { lesson: Lesson }) => {
    const [menuAnchorEl, setMenuAnchorEl] = useState<null | HTMLElement>(null);

    const handleMenuClick = (event: React.MouseEvent<HTMLElement>) => {
      event.stopPropagation();
      setMenuAnchorEl(event.currentTarget);
      setSelectedLesson(lesson);
    };

    const handleMenuClose = () => {
      setMenuAnchorEl(null);
      setSelectedLesson(null);
    };

    const handleEditClick = () => {
      setEditingLesson(lesson);
      setNewLesson({
        title: lesson.title,
        student_name: lesson.student_name,
        start_time: lesson.start_time,
        duration: 60,
        notes: lesson.notes || '',
      });
      setOpenDialog(true);
      handleMenuClose();
    };

    const handleDeleteClick = () => {
      handleDeleteLesson(lesson.id);
      handleMenuClose();
    };

    return (
      <Paper 
        onClick={handleMenuClick}
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
              {format(new Date(lesson.start_time), 'HH:mm')} - 
              {format(new Date(lesson.end_time), 'HH:mm')}
            </Typography>
            <Typography variant="body2">{lesson.student_name}</Typography>
            {lesson.notes && (
              <Typography variant="body2" color="text.secondary">
                {lesson.notes}
              </Typography>
            )}
          </Box>
          <IconButton onClick={handleMenuClick}>
            <MoreVertIcon />
          </IconButton>
        </Box>
        <Menu
          anchorEl={menuAnchorEl}
          open={Boolean(menuAnchorEl)}
          onClose={handleMenuClose}
          anchorOrigin={{
            vertical: 'top',
            horizontal: 'right',
          }}
          transformOrigin={{
            vertical: 'top',
            horizontal: 'right',
          }}
          PaperProps={{
            sx: {
              position: 'absolute',
              right: 0,
              top: 0,
              minWidth: 30,
            }
          }}
        >
          <MenuItem onClick={handleEditClick}>Редактировать</MenuItem>
          <MenuItem onClick={handleDeleteClick}>Удалить</MenuItem>
        </Menu>
      </Paper>
    );
  });

  // Мемоизированный компонент для отображения дня
  const DayCell = memo(({ date, lessons, onClick }: { 
    date: Date; 
    lessons: Lesson[]; 
    onClick: (date: Date) => void;
  }) => (
    <TableCell 
      onClick={() => onClick(date)}
      sx={{ 
        cursor: 'pointer',
        '&:hover': {
          backgroundColor: 'rgba(25, 118, 210, 0.05)',
        },
      }}
    >
      <Typography variant="body2">
        {format(date, 'd')}
      </Typography>
      {lessons.map((lesson) => (
        <LessonItem 
          key={lesson.id} 
          lesson={lesson}
        />
      ))}
    </TableCell>
  ));

  // Оптимизация рендеринга месячного представления
  const renderMonthView = useCallback(() => {
    return (
      <Table>
        <TableHeader viewType="month" weekDays={[]} />
        <TableBody>
          {weeks.map((week: Date[], weekIndex: number) => (
            <TableRow key={weekIndex}>
              {week.map((date: Date) => (
                <DayCell
                  key={date.toISOString()}
                  date={date}
                  lessons={getLessonsForDate(date)}
                  onClick={handleDateClick}
                />
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    );
  }, [weeks, getLessonsForDate, handleDateClick]);

  // Оптимизация рендеринга недельного представления
  const renderWeekView = useCallback(() => {
    return (
      <Table>
        <TableHeader viewType="week" weekDays={weekDays} />
        <TableBody>
          {HOURS.map((hour) => (
            <TableRow key={hour}>
              <TimeCell hour={hour} />
              {weekDays.map((date) => {
                const hourLessons = getLessonsForHour(date, hour);
                return (
                  <TableCell key={`${date.toISOString()}-${hour}`}>
                    {hourLessons.map((lesson) => (
                      <LessonItem
                        key={lesson.id}
                        lesson={lesson}
                      />
                    ))}
                  </TableCell>
                );
              })}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    );
  }, [weekDays, getLessonsForHour]);

  // Оптимизация рендеринга дневного представления
  const renderDayView = useCallback(() => {
    return (
      <Table>
        <TableHeader viewType="day" weekDays={[selectedDate]} />
        <TableBody>
          {HOURS.map((hour) => {
            const hourLessons = getLessonsForHour(selectedDate, hour);
            return (
              <TableRow key={hour}>
                <TimeCell hour={hour} />
                <TableCell>
                  {hourLessons.map((lesson) => (
                    <LessonItem
                      key={lesson.id}
                      lesson={lesson}
                    />
                  ))}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    );
  }, [selectedDate, getLessonsForHour]);

  // Оптимизация рендеринга представления
  const renderView = useCallback(() => {
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
  }, [viewType, renderDayView, renderWeekView, renderMonthView]);

  // Оптимизация эффекта загрузки данных
  useEffect(() => {
    const controller = new AbortController();
    fetchLessons();
    return () => controller.abort();
  }, [fetchLessons]);

  const handleDeleteLesson = async (lessonId: number) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        console.error('No authentication token found');
        return;
      }

      await axios.delete(`${process.env.REACT_APP_API_URL}/lessons/${lessonId}`, {
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

      await axios.put(`${process.env.REACT_APP_API_URL}/lessons/${editingLesson.id}`, lessonData, {
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

  const handleLessonMenuClick = useCallback((event: React.MouseEvent<HTMLElement>, lesson: Lesson) => {
    event.stopPropagation();
    setAnchorEl(event.currentTarget);
    setSelectedLesson(lesson);
  }, []);

  const handleLessonMenuClose = useCallback(() => {
    setAnchorEl(null);
    setSelectedLesson(null);
  }, []);

  const handleEditClick = useCallback(() => {
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
  }, [selectedLesson, handleLessonMenuClose]);

  const handleDeleteClick = useCallback(() => {
    if (selectedLesson) {
      handleDeleteLesson(selectedLesson.id);
    }
    handleLessonMenuClose();
  }, [selectedLesson, handleLessonMenuClose]);

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
      </Paper>
    </Container>
  );
};

export default memo(Calendar); 