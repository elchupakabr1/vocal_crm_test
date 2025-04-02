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
import ru from 'date-fns/locale/ru';
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
  addMonths,
  subMonths,
  startOfDay,
  addDays,
  endOfDay
} from 'date-fns';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import AddIcon from '@mui/icons-material/Add';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import api from '@/services/api';
import { useAuth } from '@/contexts/AuthContext';
import '@/styles/Calendar.css';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import CheckIcon from '@mui/icons-material/Check';
import CancelIcon from '@mui/icons-material/Cancel';

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
  is_cancelled: boolean;
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

  // Объявляем все функции в начале компонента
  const handleLessonMenuClose = useCallback(() => {
    setAnchorEl(null);
    setSelectedLesson(null);
  }, []);

  const handleDeleteLesson = useCallback(async () => {
    if (selectedLesson) {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          throw new Error('No authentication token found');
        }

        await api.delete(`/lessons/${selectedLesson.id}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        setLessons(prevLessons => prevLessons.filter(l => l.id !== selectedLesson.id));
        handleLessonMenuClose();
      } catch (error) {
        console.error('Error deleting lesson:', error);
      }
    }
  }, [selectedLesson, handleLessonMenuClose]);

  const handleMarkAsCompleted = useCallback(async () => {
    if (selectedLesson) {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          throw new Error('No authentication token found');
        }

        await api.patch(`/lessons/${selectedLesson.id}/`, {
          status: 'completed'
        }, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        setLessons(prevLessons => prevLessons.map(l => 
          l.id === selectedLesson.id ? { ...l, status: 'completed' } : l
        ));
        handleLessonMenuClose();
      } catch (error) {
        console.error('Error marking lesson as completed:', error);
      }
    }
  }, [selectedLesson, handleLessonMenuClose]);

  const handleCancelLesson = useCallback(async () => {
    if (selectedLesson) {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          throw new Error('No authentication token found');
        }

        await api.patch(`/lessons/${selectedLesson.id}/`, {
          status: 'cancelled'
        }, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        setLessons(prevLessons => prevLessons.map(l => 
          l.id === selectedLesson.id ? { ...l, status: 'cancelled' } : l
        ));
        handleLessonMenuClose();
      } catch (error) {
        console.error('Error cancelling lesson:', error);
      }
    }
  }, [selectedLesson, handleLessonMenuClose]);

  // Функция для загрузки учеников с повторными попытками
  const fetchStudents = useCallback(async (retryCount = 0) => {
    try {
      const response = await api.get('/students/');
      if (Array.isArray(response.data)) {
        setStudents(response.data);
      } else {
        console.error('Invalid response format:', response.data);
        setStudents([]);
      }
    } catch (error) {
      console.error('Error fetching students:', error);
      if (retryCount < 3) {
        setTimeout(() => {
          fetchStudents(retryCount + 1);
        }, 1000 * (retryCount + 1));
      } else {
        setStudents([]);
      }
    }
  }, []);

  // Функция для загрузки уроков с повторными попытками
  const fetchLessons = useCallback(async (retryCount = 0) => {
    try {
      const response = await api.get('/lessons/');
      if (Array.isArray(response.data)) {
        setLessons(response.data);
      } else {
        console.error('Invalid response format:', response.data);
        setLessons([]);
      }
    } catch (error) {
      console.error('Error fetching lessons:', error);
      if (retryCount < 3) {
        setTimeout(() => {
          fetchLessons(retryCount + 1);
        }, 1000 * (retryCount + 1));
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

      const response = await api.post('/lessons/', {
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
  const LessonItem = memo(({ 
    lesson, 
    onEdit, 
    onDelete 
  }: { 
    lesson: Lesson;
    onEdit: (lesson: Lesson) => void;
    onDelete: (lessonId: number) => void;
  }) => {
    const [menuAnchorEl, setMenuAnchorEl] = useState<null | HTMLElement>(null);

    const handleMenuClick = (event: React.MouseEvent<HTMLElement>) => {
      event.stopPropagation();
      setMenuAnchorEl(event.currentTarget);
    };

    const handleMenuClose = () => {
      setMenuAnchorEl(null);
    };

    const handleEditClick = () => {
      onEdit(lesson);
      handleMenuClose();
    };

    const handleDeleteClick = () => {
      onDelete(lesson.id);
      handleMenuClose();
    };

    return (
      <Paper 
        sx={{ 
          p: 2, 
          mb: 2,
          position: 'relative',
          backgroundColor: lesson.is_cancelled ? '#ffebee' : 'inherit',
          color: lesson.is_cancelled ? '#c62828' : 'inherit',
          textDecoration: lesson.is_cancelled ? 'line-through' : 'none',
          '&:hover': {
            backgroundColor: lesson.is_cancelled ? '#ffcdd2' : 'rgba(25, 118, 210, 0.05)',
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
            {lesson.is_cancelled && (
              <Typography variant="body2" color="error">Отменено</Typography>
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
          {!lesson.is_cancelled && (
            <MenuItem onClick={handleCancelLesson}>Отменить занятие</MenuItem>
          )}
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
          onEdit={(lesson) => {
            setEditingLesson(lesson);
            setNewLesson({
              student_id: lesson.student_id.toString(),
              date: lesson.date,
              duration: lesson.duration,
            });
            setOpenDialog(true);
          }}
          onDelete={handleDeleteLesson}
        />
      ))}
    </TableCell>
  ));

  const handleLessonClick = useCallback((event: React.MouseEvent<HTMLElement>, lesson: Lesson) => {
    event.stopPropagation();
    setSelectedLesson(lesson);
    setAnchorEl(event.currentTarget);
  }, []);

  const handleEditLesson = useCallback(() => {
    if (selectedLesson) {
      setEditingLesson(selectedLesson);
      setOpenDialog(true);
      handleLessonMenuClose();
    }
  }, [selectedLesson, handleLessonMenuClose]);

  const renderDayView = useCallback(() => {
    const hours = Array.from({ length: 24 }, (_, i) => i);
    const dayStart = startOfDay(selectedDate);
    
    return (
      <Table className="calendar-table calendar-day-view">
        <TableHead>
          <TableRow>
            <TableCell className="calendar-time-cell"></TableCell>
            <TableCell className="calendar-day-header">
              {format(selectedDate, 'EEEE, d MMMM yyyy', { locale: ru })}
            </TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {hours.map((hour) => {
            const hourStart = setHours(dayStart, hour);
            const hourEnd = setHours(dayStart, hour + 1);
            const hourLessons = lessons.filter(lesson => {
              const lessonDate = new Date(lesson.date);
              const lessonEnd = addMinutes(lessonDate, lesson.duration);
              return (
                (lessonDate >= hourStart && lessonDate < hourEnd) ||
                (lessonEnd > hourStart && lessonEnd <= hourEnd) ||
                (lessonDate <= hourStart && lessonEnd >= hourEnd)
              );
            });

            return (
              <TableRow key={hour}>
                <TableCell className="calendar-time-cell">
                  {format(hourStart, 'HH:mm')}
                </TableCell>
                <TableCell className="calendar-day-cell">
                  {hourLessons.map((lesson) => {
                    const lessonDate = new Date(lesson.date);
                    const lessonEnd = addMinutes(lessonDate, lesson.duration);
                    const top = (lessonDate.getMinutes() / 60) * 100;
                    const height = ((lessonEnd.getTime() - lessonDate.getTime()) / (60 * 60 * 1000)) * 100;

                    return (
                      <div
                        key={lesson.id}
                        className={`calendar-event ${lesson.is_cancelled ? 'cancelled' : ''}`}
                        style={{
                          top: `${top}%`,
                          height: `${height}%`
                        }}
                        onClick={(e) => handleLessonClick(e, lesson)}
                      >
                        {lesson.student.first_name} {lesson.student.last_name}
                        {lesson.is_cancelled && <span> (Отменено)</span>}
                      </div>
                    );
                  })}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    );
  }, [selectedDate, lessons, handleLessonClick]);

  const renderWeekView = useCallback(() => {
    const hours = Array.from({ length: 24 }, (_, i) => i);
    const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 });
    const weekDays = eachDayOfInterval({
      start: weekStart,
      end: addDays(weekStart, 6)
    });

    return (
      <Table className="calendar-table calendar-week-view">
        <TableHead>
          <TableRow>
            <TableCell className="calendar-time-cell"></TableCell>
            {weekDays.map((day) => (
              <TableCell key={day.toISOString()} className="calendar-day-header">
                {format(day, 'EEEE, d MMMM', { locale: ru })}
              </TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {hours.map((hour) => (
            <TableRow key={hour}>
              <TableCell className="calendar-time-cell">
                {format(setHours(new Date(), hour), 'HH:mm')}
              </TableCell>
              {weekDays.map((day) => {
                const dayStart = setHours(day, hour);
                const dayEnd = setHours(day, hour + 1);
                const hourLessons = lessons.filter(lesson => {
                  const lessonDate = new Date(lesson.date);
                  const lessonEnd = addMinutes(lessonDate, lesson.duration);
                  return (
                    (lessonDate >= dayStart && lessonDate < dayEnd) ||
                    (lessonEnd > dayStart && lessonEnd <= dayEnd) ||
                    (lessonDate <= dayStart && lessonEnd >= dayEnd)
                  );
                });

                return (
                  <TableCell key={day.toISOString()} className="calendar-day-cell">
                    {hourLessons.map((lesson) => {
                      const lessonDate = new Date(lesson.date);
                      const lessonEnd = addMinutes(lessonDate, lesson.duration);
                      const top = (lessonDate.getMinutes() / 60) * 100;
                      const height = ((lessonEnd.getTime() - lessonDate.getTime()) / (60 * 60 * 1000)) * 100;

                      return (
                        <div
                          key={lesson.id}
                          className={`calendar-event ${lesson.is_cancelled ? 'cancelled' : ''}`}
                          style={{
                            top: `${top}%`,
                            height: `${height}%`
                          }}
                          onClick={(e) => handleLessonClick(e, lesson)}
                        >
                          {lesson.student.first_name} {lesson.student.last_name}
                          {lesson.is_cancelled && <span> (Отменено)</span>}
                        </div>
                      );
                    })}
                  </TableCell>
                );
              })}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    );
  }, [selectedDate, lessons, handleLessonClick]);

  const renderMonthView = useCallback(() => {
    const monthStart = startOfMonth(selectedDate);
    const monthEnd = endOfMonth(selectedDate);
    const startDate = startOfWeek(monthStart, { weekStartsOn: 1 });
    const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });
    const days = eachDayOfInterval({ start: startDate, end: endDate });
    const weeks = chunk(days, 7);

    return (
      <div className="calendar-month-view">
        <div className="calendar-day-header">Пн</div>
        <div className="calendar-day-header">Вт</div>
        <div className="calendar-day-header">Ср</div>
        <div className="calendar-day-header">Чт</div>
        <div className="calendar-day-header">Пт</div>
        <div className="calendar-day-header">Сб</div>
        <div className="calendar-day-header">Вс</div>

        {weeks.map((week, weekIndex) => (
          <React.Fragment key={weekIndex}>
            {week.map((date) => {
              const dayLessons = lessons.filter(lesson => isSameDay(new Date(lesson.date), date));
              const isToday = isSameDay(date, new Date());
              const isCurrentMonth = isSameMonth(date, selectedDate);

              return (
                <div
                  key={date.toISOString()}
                  className={`calendar-day-cell ${!isCurrentMonth ? 'other-month' : ''} ${isToday ? 'today' : ''}`}
                >
                  <div className="calendar-day-number">
                    {format(date, 'd')}
                  </div>
                  {dayLessons.map((lesson) => (
                    <div
                      key={lesson.id}
                      className={`calendar-event ${lesson.is_cancelled ? 'cancelled' : ''}`}
                      onClick={(e) => handleLessonClick(e, lesson)}
                    >
                      {format(new Date(lesson.date), 'HH:mm')} - {lesson.student.first_name} {lesson.student.last_name}
                    </div>
                  ))}
                </div>
              );
            })}
          </React.Fragment>
        ))}
      </div>
    );
  }, [selectedDate, lessons, handleLessonClick]);

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

  const handlePrevDay = useCallback(() => {
    setSelectedDate(prev => {
      switch (viewType) {
        case 'day':
          return addDays(prev, -1);
        case 'week':
          return addDays(prev, -7);
        case 'month':
          return subMonths(prev, 1);
        default:
          return prev;
      }
    });
  }, [viewType]);

  const handleNextDay = useCallback(() => {
    setSelectedDate(prev => {
      switch (viewType) {
        case 'day':
          return addDays(prev, 1);
        case 'week':
          return addDays(prev, 7);
        case 'month':
          return addMonths(prev, 1);
        default:
          return prev;
      }
    });
  }, [viewType]);

  const handleToday = useCallback(() => {
    setSelectedDate(new Date());
  }, []);

  return (
    <Container className="calendar-container">
      <Box className="calendar-header">
        <Box className="calendar-controls">
          <IconButton onClick={handlePrevDay}>
            <ChevronLeftIcon />
          </IconButton>
          <Button onClick={handleToday}>Сегодня</Button>
          <IconButton onClick={handleNextDay}>
            <ChevronRightIcon />
          </IconButton>
          <Typography variant="h6" className="calendar-title">
            {(() => {
              switch (viewType) {
                case 'day':
                  return format(selectedDate, 'EEEE, d MMMM yyyy', { locale: ru });
                case 'week':
                  return `${format(startOfWeek(selectedDate, { weekStartsOn: 1 }), 'd MMMM', { locale: ru })} - ${format(endOfWeek(selectedDate, { weekStartsOn: 1 }), 'd MMMM yyyy', { locale: ru })}`;
                case 'month':
                  return format(selectedDate, 'MMMM yyyy', { locale: ru });
                default:
                  return '';
              }
            })()}
          </Typography>
        </Box>
        <ToggleButtonGroup
          value={viewType}
          exclusive
          onChange={(_, newView) => newView && setViewType(newView)}
        >
          <ToggleButton value="day">День</ToggleButton>
          <ToggleButton value="week">Неделя</ToggleButton>
          <ToggleButton value="month">Месяц</ToggleButton>
        </ToggleButtonGroup>
      </Box>
      {renderView()}

      <Dialog open={openDialog} onClose={() => setOpenDialog(false)}>
        <DialogTitle>
          {editingLesson ? 'Редактировать занятие' : 'Добавить новое занятие'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>Ученик</InputLabel>
              <Select
                value={newLesson.student_id}
                onChange={(e) => setNewLesson({ ...newLesson, student_id: e.target.value })}
                label="Ученик"
              >
                {students.map((student) => (
                  <MenuItem key={student.id} value={student.id}>
                    {student.first_name} {student.last_name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={ru}>
              <DatePicker
                label="Дата"
                value={newLesson.date}
                onChange={(date) => date && setNewLesson({ ...newLesson, date })}
                sx={{ mb: 2, width: '100%' }}
              />
              <TimePicker
                label="Время"
                value={newLesson.date}
                onChange={(date) => date && setNewLesson({ ...newLesson, date })}
                sx={{ mb: 2, width: '100%' }}
              />
            </LocalizationProvider>
            <TextField
              label="Длительность (минуты)"
              type="number"
              value={newLesson.duration}
              onChange={(e) => setNewLesson({ ...newLesson, duration: parseInt(e.target.value) })}
              fullWidth
              sx={{ mb: 2 }}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>Отмена</Button>
          <Button onClick={editingLesson ? handleEditLesson : handleAddLesson} variant="contained">
            {editingLesson ? 'Сохранить' : 'Добавить'}
          </Button>
        </DialogActions>
      </Dialog>

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleLessonMenuClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'right',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
      >
        <MenuItem onClick={handleEditLesson}>
          <EditIcon sx={{ mr: 1 }} /> Редактировать
        </MenuItem>
        <MenuItem onClick={handleDeleteLesson}>
          <DeleteIcon sx={{ mr: 1 }} /> Удалить
        </MenuItem>
        {selectedLesson && !selectedLesson.is_completed && (
          <MenuItem onClick={handleMarkAsCompleted}>
            <CheckIcon sx={{ mr: 1 }} /> Отметить как выполненное
          </MenuItem>
        )}
        {selectedLesson && !selectedLesson.is_cancelled && (
          <MenuItem onClick={handleCancelLesson}>
            <CancelIcon sx={{ mr: 1 }} /> Отменить занятие
          </MenuItem>
        )}
      </Menu>
    </Container>
  );
};

export default memo(Calendar); 