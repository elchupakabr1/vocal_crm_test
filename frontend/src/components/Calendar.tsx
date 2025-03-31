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
  Select,
  FormControl,
  InputLabel,
  Alert,
  Snackbar,
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

interface Student {
  id: number;
  first_name: string;
  last_name: string;
  phone: string;
  total_lessons: number;
  remaining_lessons: number;
}

interface Lesson {
  id: number;
  student_id: number;
  date: Date;
  duration: number;
  is_completed: boolean;
  student: Student;
}

interface NewLesson {
  student_id: string;
  date: Date;
  duration: number;
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
  const [selectedTime, setSelectedTime] = useState<Date>(new Date());
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [viewType, setViewType] = useState<ViewType>('day');
  const [newLesson, setNewLesson] = useState<NewLesson>({
    student_id: '',
    date: new Date(),
    duration: 60,
  });
  const { isAuthenticated } = useAuth();
  const [editingLesson, setEditingLesson] = useState<Lesson | null>(null);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [duration, setDuration] = useState('60');

  // Функция для загрузки учеников с повторными попытками
  const fetchStudents = useCallback(async (retryCount = 0) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      const response = await axios.get(`${process.env.REACT_APP_API_URL}/students/`, {
        headers: {
          'Authorization': `Bearer ${token}`
        },
        timeout: 10000 // 10 секунд таймаут
      });

      if (Array.isArray(response.data)) {
        setStudents(response.data);
      } else {
        console.error('Invalid response format:', response.data);
        setStudents([]);
      }
    } catch (error) {
      console.error('Error fetching students:', error);
      if (retryCount < 3) { // Максимум 3 попытки
        setTimeout(() => {
          fetchStudents(retryCount + 1);
        }, 1000 * (retryCount + 1)); // Увеличиваем задержку с каждой попыткой
      } else {
        setStudents([]);
      }
    }
  }, []);

  // Функция для загрузки уроков с повторными попытками
  const fetchLessons = useCallback(async (retryCount = 0) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      const response = await axios.get(`${process.env.REACT_APP_API_URL}/lessons/`, {
        headers: {
          'Authorization': `Bearer ${token}`
        },
        timeout: 10000 // 10 секунд таймаут
      });

      if (Array.isArray(response.data)) {
        setLessons(response.data);
      } else {
        console.error('Invalid response format:', response.data);
        setLessons([]);
      }
    } catch (error) {
      console.error('Error fetching lessons:', error);
      if (retryCount < 3) { // Максимум 3 попытки
        setTimeout(() => {
          fetchLessons(retryCount + 1);
        }, 1000 * (retryCount + 1)); // Увеличиваем задержку с каждой попыткой
      } else {
        setLessons([]);
      }
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
      const lessonDate = new Date(lesson.date);
      return isSameDay(lessonDate, date);
    });
  }, [lessons]);

  // Оптимизация функции получения уроков за час
  const getLessonsForHour = useCallback((date: Date, hour: number) => {
    const startOfHour = setHours(date, hour);
    const endOfHour = setHours(date, hour + 1);
    
    return lessons.filter(lesson => {
      const lessonStart = new Date(lesson.date);
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
      date: date,
    }));
    setOpenDialog(true);
  }, []);

  const handleAddLesson = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      if (!selectedStudent) {
        throw new Error('Please select student');
      }

      const combinedDate = new Date(selectedDate);
      combinedDate.setHours(selectedTime.getHours());
      combinedDate.setMinutes(selectedTime.getMinutes());

      const response = await axios.post<Lesson>(`${process.env.REACT_APP_API_URL}/lessons/`, {
        student_id: selectedStudent.id,
        date: combinedDate,
        duration: parseInt(duration),
        is_completed: false
      }, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.status === 200) {
        setLessons([...lessons, response.data]);
        setOpenDialog(false);
        setSelectedDate(new Date());
        setSelectedTime(new Date());
        setSelectedStudent(null);
        setDuration('60');
      }
    } catch (error) {
      console.error('Error creating lesson:', error);
      alert('Ошибка при создании занятия');
    }
  }, [selectedDate, selectedTime, selectedStudent, lessons, duration]);

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
        student_id: lesson.student_id.toString(),
        date: lesson.date,
        duration: lesson.duration,
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
            <Typography variant="subtitle1">{lesson.student.last_name} {lesson.student.first_name}</Typography>
            <Typography variant="body2">
              {format(new Date(lesson.date), 'HH:mm')} - 
              {format(new Date(lesson.date), 'HH:mm')}
            </Typography>
            <Typography variant="body2">{lesson.student.remaining_lessons} занятий</Typography>
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
    const signal = controller.signal;

    // Функция для загрузки данных с учетом сигнала отмены
    const loadData = async () => {
      if (!signal.aborted) {
        await Promise.all([
          fetchStudents(),
          fetchLessons()
        ]);
      }
    };

    loadData();

    // Очистка при размонтировании
    return () => {
      controller.abort();
    };
  }, [fetchStudents, fetchLessons]);

  const handleDeleteLesson = async (lessonId: number) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      const response = await axios.delete(`${process.env.REACT_APP_API_URL}/lessons/${lessonId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.status === 200) {
        setLessons(lessons.filter(lesson => lesson.id !== lessonId));
        setSelectedLesson(null);
        setAnchorEl(null);
      }
    } catch (error) {
      console.error('Error deleting lesson:', error);
      alert('Ошибка при удалении занятия');
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

      const endTime = addMinutes(editingLesson.date, editingLesson.duration);
      
      const lessonData = {
        student_id: editingLesson.student_id,
        date: format(editingLesson.date, "yyyy-MM-dd HH:mm:ss"),
        duration: editingLesson.duration,
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

  const handleMarkAsCompleted = async () => {
    if (!selectedLesson) return;
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      const response = await axios.put(`${process.env.REACT_APP_API_URL}/lessons/${selectedLesson.id}/complete`, {}, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.status === 200) {
        setLessons(lessons.map(lesson => 
          lesson.id === selectedLesson.id 
            ? { ...lesson, is_completed: true }
            : lesson
        ));
        setSelectedLesson(null);
        setAnchorEl(null);
      }
    } catch (error) {
      console.error('Error marking lesson as completed:', error);
      alert('Ошибка при отметке занятия как выполненного');
    }
  };

  const handleEditClick = useCallback(() => {
    if (selectedLesson) {
      setEditingLesson(selectedLesson);
      setNewLesson({
        student_id: selectedLesson.student_id.toString(),
        date: selectedLesson.date,
        duration: selectedLesson.duration,
      });
      setOpenDialog(true);
    }
  }, [selectedLesson]);

  const handleDeleteClick = useCallback(() => {
    if (selectedLesson) {
      handleDeleteLesson(selectedLesson.id);
    }
    handleLessonMenuClose();
  }, [selectedLesson, handleLessonMenuClose]);

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={ru}>
      <Box sx={{ p: 3 }}>
        <Paper sx={{ p: 3 }}>
          <Typography variant="h4" gutterBottom>
            Календарь занятий
          </Typography>

          <Box sx={{ mb: 3 }}>
            <Button
              variant="contained"
              onClick={() => setOpenDialog(true)}
              disabled={!isAuthenticated}
            >
              Добавить занятие
            </Button>
          </Box>

          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
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
            </Box>
          </Box>

          <DatePicker
            label="Выберите дату"
            value={selectedDate}
            onChange={(newValue) => newValue && setSelectedDate(newValue)}
            sx={{ mb: 3 }}
          />

          {renderView()}

          <Dialog open={openDialog} onClose={() => setOpenDialog(false)}>
            <DialogTitle>Добавить занятие</DialogTitle>
            <DialogContent>
              <FormControl fullWidth margin="dense">
                <InputLabel>Ученик</InputLabel>
                <Select
                  value={selectedStudent?.id?.toString() || ''}
                  onChange={(e) => setSelectedStudent(students.find(s => s.id === parseInt(e.target.value)) || null)}
                  label="Ученик"
                >
                  {students.map((student) => (
                    <MenuItem key={student.id} value={student.id}>
                      {student.first_name} {student.last_name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <DatePicker
                label="Дата"
                value={selectedDate}
                onChange={(date) => setSelectedDate(date || new Date())}
                slotProps={{ textField: { fullWidth: true, margin: "dense" } }}
              />
              <TimePicker
                label="Время"
                value={selectedTime}
                onChange={(date) => setSelectedTime(date || new Date())}
                slotProps={{ textField: { fullWidth: true, margin: "dense" } }}
              />
              <TextField
                margin="dense"
                label="Длительность (минут)"
                type="number"
                fullWidth
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
              />
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setOpenDialog(false)}>Отмена</Button>
              <Button onClick={handleAddLesson} variant="contained">
                Добавить
              </Button>
            </DialogActions>
          </Dialog>
        </Paper>
      </Box>
    </LocalizationProvider>
  );
};

export default memo(Calendar); 