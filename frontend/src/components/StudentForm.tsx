import React, { useState, useEffect } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField, MenuItem } from '@mui/material';
import { Student } from '../types/Student';
import { Subscription } from '../types/Subscription';
import '../styles/StudentForm.css';
import { CompanyConfig } from '../config/CompanyConfig';

interface StudentFormProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (student: Omit<Student, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => Promise<void>;
  subscriptions: Subscription[];
  initialData?: Student;
}

export const StudentForm: React.FC<StudentFormProps> = ({
  open,
  onClose,
  onSubmit,
  subscriptions,
  initialData
}) => {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [selectedSubscriptionId, setSelectedSubscriptionId] = useState<number | null>(null);
  const [totalLessons, setTotalLessons] = useState(0);
  const [remainingLessons, setRemainingLessons] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initialData) {
      setFirstName(initialData.first_name);
      setLastName(initialData.last_name);
      setPhone(initialData.phone);
      setEmail(initialData.email || '');
      setSelectedSubscriptionId(initialData.subscription_id);
      setTotalLessons(initialData.total_lessons);
      setRemainingLessons(initialData.remaining_lessons);
    } else {
      setFirstName('');
      setLastName('');
      setPhone('');
      setEmail('');
      setSelectedSubscriptionId(null);
      setTotalLessons(0);
      setRemainingLessons(0);
    }
  }, [initialData, open]);

  const handleSubscriptionChange = (event: React.ChangeEvent<{ value: unknown }>) => {
    const subscriptionId = event.target.value ? Number(event.target.value) : null;
    setSelectedSubscriptionId(subscriptionId);
    
    const selectedSubscription = subscriptions.find(s => s.id === subscriptionId);
    if (selectedSubscription) {
      setTotalLessons(selectedSubscription.lessons_count);
      setRemainingLessons(selectedSubscription.lessons_count);
    } else {
      setTotalLessons(0);
      setRemainingLessons(0);
    }
  };

  const formatPhoneNumber = (value: string): string => {
    const cleaned = value.replace(/\D/g, '');
    if (cleaned.length >= 10 && (cleaned.startsWith('7') || cleaned.startsWith('8'))) {
      return '+' + cleaned;
    }
    return cleaned;
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhoneNumber(e.target.value);
    setPhone(formatted);
  };

  const validatePhone = (phone: string): boolean => {
    const cleaned = phone.replace(/\D/g, '');
    return cleaned.length >= 10 && cleaned.length <= 15;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const selectedSubscription = subscriptions.find(s => s.id === selectedSubscriptionId);
      const formattedPhone = formatPhoneNumber(phone);
      
      if (!firstName || !lastName || !formattedPhone) {
        setError('Пожалуйста, заполните все обязательные поля');
        return;
      }
      
      const studentData = {
        first_name: firstName,
        last_name: lastName,
        phone: formattedPhone,
        email: email || null,
        subscription_id: selectedSubscriptionId,
        total_lessons: selectedSubscription?.lessons_count || 0,
        remaining_lessons: selectedSubscription?.lessons_count || 0
      };
      
      await onSubmit(studentData);
    } catch (error) {
      console.error('Ошибка при отправке формы:', error);
      setError('Произошла ошибка при сохранении данных');
    }
  };

  return (
    <Dialog open={open} onClose={onClose}>
      <DialogTitle>{initialData ? CompanyConfig.components.studentForm.editTitle : CompanyConfig.components.studentForm.addTitle}</DialogTitle>
      <form onSubmit={handleSubmit}>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label={CompanyConfig.components.studentForm.firstName}
            type="text"
            fullWidth
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            required
          />
          <TextField
            margin="dense"
            label={CompanyConfig.components.studentForm.lastName}
            type="text"
            fullWidth
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            required
          />
          <TextField
            margin="dense"
            label={CompanyConfig.components.studentForm.phone}
            type="tel"
            fullWidth
            value={phone}
            onChange={handlePhoneChange}
            required
            helperText="Формат: +79001234567"
          />
          <TextField
            margin="dense"
            label={CompanyConfig.components.studentForm.email}
            type="email"
            fullWidth
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <TextField
            select
            margin="dense"
            label={CompanyConfig.components.studentForm.subscription}
            fullWidth
            value={selectedSubscriptionId || ''}
            onChange={handleSubscriptionChange}
          >
            <MenuItem value="">
              <em>Нет</em>
            </MenuItem>
            {subscriptions.map((subscription) => (
              <MenuItem key={subscription.id} value={subscription.id}>
                {subscription.name} ({subscription.lessons_count} уроков)
              </MenuItem>
            ))}
          </TextField>
          {selectedSubscriptionId && (
            <TextField
              margin="dense"
              label={CompanyConfig.components.studentForm.lessonsCount}
              type="number"
              fullWidth
              value={totalLessons}
              disabled
            />
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>{CompanyConfig.components.studentForm.cancel}</Button>
          <Button type="submit" variant="contained" color="primary">
            {initialData ? CompanyConfig.components.studentForm.save : CompanyConfig.components.studentForm.add}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}; 