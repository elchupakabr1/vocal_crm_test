export interface Student {
  id: number;
  first_name: string;
  last_name: string;
  phone: string;
  email: string | null;
  total_lessons: number;
  remaining_lessons: number;
  subscription_id: number | null;
  user_id: number;
  created_at: string;
  updated_at: string;
} 