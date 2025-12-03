export enum DayType {
  PECHO = 'Pecho',
  ESPALDA = 'Espalda',
  PIERNA = 'Pierna'
}

export interface SetData {
  id: string;
  reps: number;
  weight: number;
}

export interface ExerciseLog {
  id: string;
  name: string;
  sets: SetData[];
}

export interface WorkoutSession {
  id: string;
  date: string; // ISO string
  type: DayType;
  exercises: ExerciseLog[];
  notes?: string;
}

// Chart data structure
export interface ProgressDataPoint {
  date: string;
  weight: number;
  volume: number; // sets * reps * weight
}
