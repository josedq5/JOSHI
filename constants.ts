import { DayType } from './types';

export const DEFAULT_EXERCISES: Record<DayType, string[]> = {
  [DayType.PECHO]: [
    'Press de Banca Plano',
    'Press Inclinado con Mancuernas',
    'Aperturas (Flyes)',
    'Press Militar (Hombro)',
    'Elevaciones Laterales',
    'Extensiones de Tríceps'
  ],
  [DayType.ESPALDA]: [
    'Dominadas (Pull-ups)',
    'Remo con Barra',
    'Jalón al Pecho',
    'Remo en Polea Baja',
    'Curl de Bíceps con Barra',
    'Curl Martillo'
  ],
  [DayType.PIERNA]: [
    'Sentadilla (Squat)',
    'Prensa de Piernas',
    'Peso Muerto Rumano',
    'Extensiones de Cuádriceps',
    'Curl Femoral',
    'Elevación de Talones (Gemelos)'
  ]
};
