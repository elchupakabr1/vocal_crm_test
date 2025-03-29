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
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';

interface Subscription {
  id: number;
  name: string;
  price: number;
  lessons_count: number;
}

const Subscriptions: React.FC = () => {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [open, setOpen] = useState(false);
  const [openEdit, setOpenEdit] = useState(false);
  const [selectedSubscription, setSelectedSubscription] = useState<Subscription | null>(null);
  const [newSubscription, setNewSubscription] = useState({
    name: '',
    price: 0,
    lessons_count: 0,
  });

  useEffect(() => {
    fetchSubscriptions();
  }, []);

  const fetchSubscriptions = async () => {
    try {
      const response = await fetch('http://localhost:8000/subscriptions/');
      if (!response.ok) throw new Error('Failed to fetch subscriptions');
      const data = await response.json();
      setSubscriptions(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching subscriptions:', error);
      setSubscriptions([]);
    }
  };

  const handleOpen = () => setOpen(true);
  const handleClose = () => setOpen(false);

  const handleOpenEdit = (subscription: Subscription) => {
    setSelectedSubscription(subscription);
    setOpenEdit(true);
  };

  const handleCloseEdit = () => {
    setSelectedSubscription(null);
    setOpenEdit(false);
  };

  const handleSubmit = async () => {
    try {
      const response = await fetch('http://localhost:8000/subscriptions/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newSubscription),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to create subscription');
      }

      await fetchSubscriptions();
      handleClose();
      setNewSubscription({
        name: '',
        price: 0,
        lessons_count: 0,
      });
    } catch (error) {
      console.error('Error creating subscription:', error);
    }
  };

  const handleUpdate = async () => {
    if (!selectedSubscription) return;

    try {
      const response = await fetch(`http://localhost:8000/subscriptions/${selectedSubscription.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(selectedSubscription),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to update subscription');
      }

      await fetchSubscriptions();
      handleCloseEdit();
    } catch (error) {
      console.error('Error updating subscription:', error);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      const response = await fetch(`http://localhost:8000/subscriptions/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to delete subscription');
      }

      await fetchSubscriptions();
    } catch (error) {
      console.error('Error deleting subscription:', error);
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h4">Абонементы</Typography>
        <Button variant="contained" onClick={handleOpen} startIcon={<AddIcon />}>
          Добавить абонемент
        </Button>
      </Box>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Название</TableCell>
              <TableCell>Стоимость</TableCell>
              <TableCell>Количество занятий</TableCell>
              <TableCell>Действия</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {subscriptions.map((subscription) => (
              <TableRow key={subscription.id}>
                <TableCell>{subscription.name}</TableCell>
                <TableCell>{subscription.price} ₽</TableCell>
                <TableCell>{subscription.lessons_count}</TableCell>
                <TableCell>
                  <IconButton onClick={() => handleOpenEdit(subscription)}>
                    <EditIcon />
                  </IconButton>
                  <IconButton onClick={() => handleDelete(subscription.id)}>
                    <DeleteIcon />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Диалог добавления абонемента */}
      <Dialog open={open} onClose={handleClose}>
        <DialogTitle>Добавить абонемент</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Название"
            fullWidth
            value={newSubscription.name}
            onChange={(e) => setNewSubscription({ ...newSubscription, name: e.target.value })}
          />
          <TextField
            margin="dense"
            label="Стоимость"
            type="number"
            fullWidth
            value={newSubscription.price}
            onChange={(e) => setNewSubscription({ ...newSubscription, price: parseInt(e.target.value) || 0 })}
          />
          <TextField
            margin="dense"
            label="Количество занятий"
            type="number"
            fullWidth
            value={newSubscription.lessons_count}
            onChange={(e) => setNewSubscription({ ...newSubscription, lessons_count: parseInt(e.target.value) || 0 })}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>Отмена</Button>
          <Button onClick={handleSubmit} variant="contained">
            Сохранить
          </Button>
        </DialogActions>
      </Dialog>

      {/* Диалог редактирования абонемента */}
      <Dialog open={openEdit} onClose={handleCloseEdit}>
        <DialogTitle>Редактировать абонемент</DialogTitle>
        <DialogContent>
          {selectedSubscription && (
            <>
              <TextField
                margin="dense"
                label="Название"
                fullWidth
                value={selectedSubscription.name}
                onChange={(e) => setSelectedSubscription({ ...selectedSubscription, name: e.target.value })}
              />
              <TextField
                margin="dense"
                label="Стоимость"
                type="number"
                fullWidth
                value={selectedSubscription.price}
                onChange={(e) => setSelectedSubscription({ ...selectedSubscription, price: parseInt(e.target.value) || 0 })}
              />
              <TextField
                margin="dense"
                label="Количество занятий"
                type="number"
                fullWidth
                value={selectedSubscription.lessons_count}
                onChange={(e) => setSelectedSubscription({ ...selectedSubscription, lessons_count: parseInt(e.target.value) || 0 })}
              />
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseEdit}>Отмена</Button>
          <Button onClick={handleUpdate} variant="contained">
            Сохранить изменения
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Subscriptions; 