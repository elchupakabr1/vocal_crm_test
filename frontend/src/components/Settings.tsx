import React, { useState } from 'react';
import {
  Container,
  Paper,
  Typography,
  TextField,
  Button,
  Box,
  Alert,
} from '@mui/material';
import axios from 'axios';

const Settings: React.FC = () => {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [telegramToken, setTelegramToken] = useState('');
  const [chatId, setChatId] = useState('');
  const [message, setMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setMessage({
        type: 'error',
        text: 'Новые пароли не совпадают',
      });
      return;
    }

    try {
      const token = localStorage.getItem('token');
      await axios.post(
        `${process.env.REACT_APP_API_URL}/settings/password`,
        {
          current_password: currentPassword,
          new_password: newPassword,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      setMessage({
        type: 'success',
        text: 'Пароль успешно изменен',
      });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error) {
      setMessage({
        type: 'error',
        text: 'Ошибка при изменении пароля',
      });
    }
  };

  const handleTelegramSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      await axios.post(
        `${process.env.REACT_APP_API_URL}/settings/telegram`,
        {
          bot_token: telegramToken,
          chat_id: chatId,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      setMessage({
        type: 'success',
        text: 'Настройки Telegram успешно обновлены',
      });
    } catch (error) {
      setMessage({
        type: 'error',
        text: 'Ошибка при обновлении настроек Telegram',
      });
    }
  };

  return (
    <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" gutterBottom>
        Настройки
      </Typography>

      {message && (
        <Alert severity={message.type} sx={{ mb: 2 }}>
          {message.text}
        </Alert>
      )}

      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Изменение пароля
        </Typography>
        <Box component="form" onSubmit={handlePasswordChange}>
          <TextField
            margin="normal"
            required
            fullWidth
            label="Текущий пароль"
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
          />
          <TextField
            margin="normal"
            required
            fullWidth
            label="Новый пароль"
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
          />
          <TextField
            margin="normal"
            required
            fullWidth
            label="Подтвердите новый пароль"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
          />
          <Button
            type="submit"
            variant="contained"
            sx={{ mt: 2 }}
          >
            Изменить пароль
          </Button>
        </Box>
      </Paper>

      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom>
          Настройки Telegram
        </Typography>
        <Box component="form" onSubmit={handleTelegramSettings}>
          <TextField
            margin="normal"
            required
            fullWidth
            label="Токен бота"
            value={telegramToken}
            onChange={(e) => setTelegramToken(e.target.value)}
          />
          <TextField
            margin="normal"
            required
            fullWidth
            label="ID чата"
            value={chatId}
            onChange={(e) => setChatId(e.target.value)}
          />
          <Button
            type="submit"
            variant="contained"
            sx={{ mt: 2 }}
          >
            Сохранить настройки Telegram
          </Button>
        </Box>
      </Paper>
    </Container>
  );
};

export default Settings; 