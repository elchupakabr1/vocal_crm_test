import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Typography,
  IconButton,
  Menu,
  MenuItem,
} from '@mui/material';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { DateCalendar } from '@mui/x-date-pickers/DateCalendar';
import ru from 'date-fns/locale/ru';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import api from '@/services/api';
import '../styles/Calendar.css';
import { CompanyConfig } from '../config/CompanyConfig';

interface Lesson {
  id: number;
  date: string;
  duration: number;
  student_id: number;
  is_completed: boolean;
  student: {
    first_name: string;
    last_name: string;
  };
}

const Calendar: React.FC = () => {
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);
  const [openEditDialog, setOpenEditDialog] = useState(false);

  const handleOpenMenu = (event: React.MouseEvent<HTMLElement>, lesson: Lesson) => {
    event.stopPropagation();
    setAnchorEl(event.currentTarget);
    setSelectedLesson(lesson);
  };

  const handleCloseMenu = () => {
    setAnchorEl(null);
  };

  const handleOpenEditDialog = () => {
    handleCloseMenu();
    setOpenEditDialog(true);
  };

  const handleCloseEditDialog = () => {
    setOpenEditDialog(false);
    setSelectedLesson(null);
  };

  const handleSaveLesson = async () => {
    if (!selectedLesson) return;

    try {
      await api.patch(`/lessons/${selectedLesson.id}`, {
        date: selectedLesson.date,
        duration: selectedLesson.duration
      });
      await fetchLessons();
      handleCloseEditDialog();
    } catch (error) {
      console.error('Error updating lesson:', error);
      alert('Ошибка при обновлении занятия');
    }
  };

  const handleDeleteLesson = async () => {
    if (!selectedLesson) return;
    
    if (!window.confirm('Вы уверены, что хотите удалить это занятие?')) {
      return;
    }

    try {
      await api.delete(`/lessons/${selectedLesson.id}`);
      await fetchLessons();
      handleCloseMenu();
    } catch (error) {
      console.error('Error deleting lesson:', error);
      alert('Ошибка при удалении занятия');
    }
  };

  const fetchLessons = async () => {
    try {
      const response = await api.get('/lessons/');
      setLessons(response.data);
    } catch (error) {
      console.error('Error fetching lessons:', error);
    }
  };

  useEffect(() => {
    fetchLessons();
  }, []);

  return (
    <Box sx={{ p: 3 }}>
      <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={ru}>
        <DateCalendar
          value={selectedDate}
          onChange={(newValue) => setSelectedDate(newValue)}
          sx={{ width: '100%' }}
        />
      </LocalizationProvider>

      <Box sx={{ mt: 3 }}>
        <Typography variant="h6">Занятия на {selectedDate?.toLocaleDateString('ru-RU')}</Typography>
        {lessons
          .filter(lesson => new Date(lesson.date).toDateString() === selectedDate?.toDateString())
          .map(lesson => (
            <Box
              key={lesson.id}
              sx={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                p: 2,
                mb: 1,
                bgcolor: 'background.paper',
                borderRadius: 1,
                boxShadow: 1,
                cursor: 'pointer',
                '&:hover': {
                  bgcolor: 'action.hover',
                },
              }}
            >
              <Typography>
                {lesson.student.first_name} {lesson.student.last_name} - {lesson.duration} мин
              </Typography>
              <IconButton 
                onClick={(e) => handleOpenMenu(e, lesson)}
                size="small"
              >
                <EditIcon />
              </IconButton>
            </Box>
          ))}
      </Box>

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleCloseMenu}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'right',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
        PaperProps={{
          elevation: 0,
          sx: {
            overflow: 'visible',
            filter: 'drop-shadow(0px 2px 8px rgba(0,0,0,0.32))',
            mt: 1.5,
            '& .MuiAvatar-root': {
              width: 32,
              height: 32,
              ml: -0.5,
              mr: 1,
            },
            '&:before': {
              content: '""',
              display: 'block',
              position: 'absolute',
              top: 0,
              right: 14,
              width: 10,
              height: 10,
              bgcolor: 'background.paper',
              transform: 'translateY(-50%) rotate(45deg)',
              zIndex: 0,
            },
          },
        }}
      >
        <MenuItem onClick={handleOpenEditDialog}>
          <EditIcon sx={{ mr: 1 }} /> Редактировать
        </MenuItem>
        <MenuItem onClick={handleDeleteLesson}>
          <DeleteIcon sx={{ mr: 1 }} /> Удалить
        </MenuItem>
      </Menu>

      <Dialog open={openEditDialog} onClose={handleCloseEditDialog}>
        <DialogTitle>Редактировать занятие</DialogTitle>
        <DialogContent>
          {selectedLesson && (
            <>
              <TextField
                margin="dense"
                label="Дата и время"
                type="datetime-local"
                fullWidth
                value={new Date(selectedLesson.date).toISOString().slice(0, 16)}
                onChange={(e) => {
                  setSelectedLesson({
                    ...selectedLesson,
                    date: new Date(e.target.value).toISOString()
                  });
                }}
              />
              <TextField
                margin="dense"
                label="Длительность (минут)"
                type="number"
                fullWidth
                value={selectedLesson.duration}
                onChange={(e) => {
                  setSelectedLesson({
                    ...selectedLesson,
                    duration: parseInt(e.target.value)
                  });
                }}
              />
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseEditDialog}>{CompanyConfig.components.studentForm.cancel}</Button>
          <Button onClick={handleSaveLesson} variant="contained">
            {CompanyConfig.components.studentForm.save}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Calendar; 