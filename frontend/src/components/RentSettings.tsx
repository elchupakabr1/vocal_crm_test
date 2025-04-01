import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import api from '@/services/api';

interface RentSettings {
  amount: number;
  payment_day: number;
}

const RentSettings: React.FC = () => {
  const [settings, setSettings] = useState<RentSettings>({
    amount: 0,
    payment_day: 1,
  });
  const [showDialog, setShowDialog] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const response = await api.get('/rent-settings');
      if (response.data) {
        setSettings(response.data);
      }
    } catch (error) {
      console.error('Error fetching rent settings:', error);
    }
  };

  const handleSave = async () => {
    try {
      await api.post('/rent-settings', settings);
      setShowDialog(false);
      // Создаем запись о расходе на аренду
      const today = new Date();
      const paymentDate = new Date(today.getFullYear(), today.getMonth(), settings.payment_day);
      
      // Если день платежа уже прошел в текущем месяце, создаем запись
      if (today.getDate() >= settings.payment_day) {
        await api.post('/expenses', {
          amount: settings.amount,
          description: 'Аренда помещения',
          category: 'rent',
          date: paymentDate.toISOString().split('T')[0],
        });
      }
    } catch (error) {
      console.error('Error saving rent settings:', error);
    }
  };

  return (
    <Box sx={{ mb: 3 }}>
      <Paper sx={{ p: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6">Настройки аренды</Typography>
          <Button variant="contained" onClick={() => setShowDialog(true)}>
            Настроить
          </Button>
        </Box>
        <Typography>Сумма: {settings.amount} ₽</Typography>
        <Typography>День списания: {settings.payment_day}</Typography>
      </Paper>

      <Dialog open={showDialog} onClose={() => setShowDialog(false)}>
        <DialogTitle>Настройки аренды</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
            <TextField
              label="Сумма аренды"
              type="number"
              value={settings.amount}
              onChange={(e) => setSettings({ ...settings, amount: Number(e.target.value) })}
              fullWidth
            />
            <TextField
              label="День списания"
              type="number"
              value={settings.payment_day}
              onChange={(e) => setSettings({ ...settings, payment_day: Number(e.target.value) })}
              fullWidth
              inputProps={{ min: 1, max: 31 }}
              helperText="Число месяца, когда будет списываться аренда"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowDialog(false)}>Отмена</Button>
          <Button onClick={handleSave} variant="contained" color="primary">
            Сохранить
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default RentSettings; 