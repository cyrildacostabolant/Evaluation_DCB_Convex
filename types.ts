
export interface Category {
  id: string;
  name: string;
  color: string; // Hex code
  user_id?: string;
}

export interface Question {
  id: string;
  evaluation_id?: string;
  section_name: string; // e.g., "Exercise 1"
  question_text: string;
  teacher_answer: string; // HTML/Rich Text
  student_prompt: string | null; // HTML or null for dotted lines
  order_index: number;
  points: number;
}

export interface Evaluation {
  id: string;
  title: string;
  category_id: string;
  created_at?: string;
  is_archived?: boolean;
  questions: Question[];
}

export type Tab = 'dashboard' | 'categories' | 'editor' | 'preview' | 'archives' | 'ai_search';
