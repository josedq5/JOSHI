import React, { useState, useEffect, useMemo } from 'react';
import { Plus, Trash2, Save, Activity, Calendar, TrendingUp, Brain, Dumbbell, ChevronRight } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { DayType, WorkoutSession, ExerciseLog, SetData } from './types';
import { DEFAULT_EXERCISES } from './constants';
import { analyzeWorkoutProgress } from './services/geminiService';
import { Button } from './components/Button';

// --- Helper Functions ---
const generateId = () => Math.random().toString(36).substr(2, 9);
const formatDate = (dateStr: string) => new Date(dateStr).toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' });

const App: React.FC = () => {
  // --- State ---
  const [activeTab, setActiveTab] = useState<'log' | 'history' | 'stats' | 'ai'>('log');
  const [workouts, setWorkouts] = useState<WorkoutSession[]>(() => {
    const saved = localStorage.getItem('gym_tracker_workouts');
    return saved ? JSON.parse(saved) : [];
  });
  
  // Logging State
  const [selectedDay, setSelectedDay] = useState<DayType>(DayType.PECHO);
  const [currentSession, setCurrentSession] = useState<ExerciseLog[]>([]);
  const [aiAnalysis, setAiAnalysis] = useState<string>("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [selectedStatExercise, setSelectedStatExercise] = useState<string>('');

  // --- Effects ---
  useEffect(() => {
    localStorage.setItem('gym_tracker_workouts', JSON.stringify(workouts));
  }, [workouts]);

  // --- Logic for Logging ---
  const addExerciseToSession = (exerciseName: string) => {
    const newExercise: ExerciseLog = {
      id: generateId(),
      name: exerciseName,
      sets: [{ id: generateId(), reps: 0, weight: 0 }]
    };
    setCurrentSession([...currentSession, newExercise]);
  };

  const updateSet = (exerciseId: string, setId: string, field: 'reps' | 'weight', value: number) => {
    setCurrentSession(prev => prev.map(ex => {
      if (ex.id !== exerciseId) return ex;
      return {
        ...ex,
        sets: ex.sets.map(s => s.id === setId ? { ...s, [field]: value } : s)
      };
    }));
  };

  const addSet = (exerciseId: string) => {
    setCurrentSession(prev => prev.map(ex => {
      if (ex.id !== exerciseId) return ex;
      // Copy previous set values for convenience
      const lastSet = ex.sets[ex.sets.length - 1];
      return {
        ...ex,
        sets: [...ex.sets, { id: generateId(), reps: lastSet?.reps || 0, weight: lastSet?.weight || 0 }]
      };
    }));
  };

  const removeSet = (exerciseId: string, setId: string) => {
    setCurrentSession(prev => prev.map(ex => {
      if (ex.id !== exerciseId) return ex;
      return { ...ex, sets: ex.sets.filter(s => s.id !== setId) };
    }));
  };

  const removeExercise = (exerciseId: string) => {
    setCurrentSession(prev => prev.filter(ex => ex.id !== exerciseId));
  };

  const saveWorkout = () => {
    if (currentSession.length === 0) return;
    const newWorkout: WorkoutSession = {
      id: generateId(),
      date: new Date().toISOString(),
      type: selectedDay,
      exercises: currentSession
    };
    setWorkouts([newWorkout, ...workouts]);
    setCurrentSession([]);
    setActiveTab('history');
  };

  // --- Logic for Stats ---
  const uniqueExercises = useMemo(() => {
    const allNames = new Set<string>();
    workouts.forEach(w => w.exercises.forEach(e => allNames.add(e.name)));
    return Array.from(allNames).sort();
  }, [workouts]);

  const statsData = useMemo(() => {
    if (!selectedStatExercise) return [];
    
    return workouts
      .filter(w => w.exercises.some(e => e.name === selectedStatExercise))
      .map(w => {
        const exercise = w.exercises.find(e => e.name === selectedStatExercise);
        if (!exercise) return null;
        
        // Calculate max weight and total volume for this session
        const maxWeight = Math.max(...exercise.sets.map(s => s.weight));
        const totalVolume = exercise.sets.reduce((acc, s) => acc + (s.weight * s.reps), 0);
        
        return {
          date: new Date(w.date).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' }),
          rawDate: w.date, // for sorting
          weight: maxWeight,
          volume: totalVolume
        };
      })
      .filter(Boolean)
      .sort((a, b) => new Date(a!.rawDate).getTime() - new Date(b!.rawDate).getTime());
  }, [workouts, selectedStatExercise]);

  // --- Logic for AI ---
  const handleAIAnalysis = async () => {
    setIsAnalyzing(true);
    const result = await analyzeWorkoutProgress(workouts);
    setAiAnalysis(result);
    setIsAnalyzing(false);
  };

  // --- Render Components ---

  const renderLogTab = () => (
    <div className="space-y-6 animate-fade-in">
      {/* Selector de Día */}
      <div className="grid grid-cols-3 gap-2 mb-6">
        {Object.values(DayType).map((type) => (
          <button
            key={type}
            onClick={() => setSelectedDay(type)}
            className={`p-3 rounded-xl font-bold text-sm sm:text-base transition-colors ${
              selectedDay === type 
              ? 'bg-gradient-to-r from-primary to-blue-600 text-white shadow-lg shadow-blue-500/20' 
              : 'bg-card text-gray-400 hover:bg-gray-700'
            }`}
          >
            {type}
          </button>
        ))}
      </div>

      {/* Agregar Ejercicios Rápidos */}
      <div className="mb-6">
        <h3 className="text-gray-400 text-sm font-semibold uppercase mb-3 tracking-wider">Ejercicios Sugeridos</h3>
        <div className="flex flex-wrap gap-2">
          {DEFAULT_EXERCISES[selectedDay].map(ex => (
            <button
              key={ex}
              onClick={() => addExerciseToSession(ex)}
              className="bg-card hover:bg-gray-700 border border-gray-700 text-xs sm:text-sm px-3 py-1.5 rounded-full transition-colors text-gray-200"
            >
              + {ex}
            </button>
          ))}
        </div>
      </div>

      {/* Lista de Sesión Actual */}
      <div className="space-y-4">
        {currentSession.length === 0 ? (
          <div className="text-center py-10 border-2 border-dashed border-gray-700 rounded-xl">
            <Dumbbell className="w-12 h-12 text-gray-600 mx-auto mb-2" />
            <p className="text-gray-500">Selecciona ejercicios para empezar tu rutina de <span className="text-primary font-bold">{selectedDay}</span></p>
          </div>
        ) : (
          currentSession.map((exercise, exIndex) => (
            <div key={exercise.id} className="bg-card rounded-xl p-4 shadow-sm border border-gray-800">
              <div className="flex justify-between items-center mb-3">
                <h4 className="font-bold text-lg text-white">{exercise.name}</h4>
                <button 
                  onClick={() => removeExercise(exercise.id)}
                  className="text-red-400 hover:text-red-300 p-1"
                >
                  <Trash2 size={18} />
                </button>
              </div>
              
              <div className="space-y-2">
                <div className="grid grid-cols-6 gap-2 text-xs text-gray-500 uppercase font-semibold text-center mb-1">
                  <div className="col-span-1">Set</div>
                  <div className="col-span-2">Kg/Lbs</div>
                  <div className="col-span-2">Reps</div>
                  <div className="col-span-1"></div>
                </div>
                {exercise.sets.map((set, setIndex) => (
                  <div key={set.id} className="grid grid-cols-6 gap-2 items-center">
                    <div className="col-span-1 flex justify-center">
                      <span className="bg-gray-800 text-gray-400 w-6 h-6 rounded-full flex items-center justify-center text-xs">
                        {setIndex + 1}
                      </span>
                    </div>
                    <div className="col-span-2">
                      <input
                        type="number"
                        value={set.weight || ''}
                        onChange={(e) => updateSet(exercise.id, set.id, 'weight', parseFloat(e.target.value))}
                        placeholder="0"
                        className="w-full bg-darker border border-gray-700 rounded-md p-2 text-center text-white focus:border-primary focus:outline-none"
                      />
                    </div>
                    <div className="col-span-2">
                      <input
                        type="number"
                        value={set.reps || ''}
                        onChange={(e) => updateSet(exercise.id, set.id, 'reps', parseFloat(e.target.value))}
                        placeholder="0"
                        className="w-full bg-darker border border-gray-700 rounded-md p-2 text-center text-white focus:border-primary focus:outline-none"
                      />
                    </div>
                    <div className="col-span-1 flex justify-center">
                      <button onClick={() => removeSet(exercise.id, set.id)} className="text-gray-600 hover:text-red-400">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              
              <button 
                onClick={() => addSet(exercise.id)}
                className="mt-3 w-full py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-md text-sm font-medium flex items-center justify-center gap-1 transition-colors"
              >
                <Plus size={14} /> Agregar Serie
              </button>
            </div>
          ))
        )}
      </div>

      {currentSession.length > 0 && (
        <div className="fixed bottom-20 left-4 right-4 md:static md:mt-6 z-10">
          <Button 
            onClick={saveWorkout} 
            fullWidth 
            className="shadow-xl shadow-primary/20 py-4 text-lg"
          >
            <Save size={20} /> Terminar Entrenamiento
          </Button>
        </div>
      )}
      {/* Spacer for fixed bottom button on mobile */}
      <div className="h-24 md:h-0"></div>
    </div>
  );

  const renderHistoryTab = () => (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold mb-4">Historial</h2>
      {workouts.length === 0 ? (
        <p className="text-gray-500 text-center py-10">No hay entrenamientos registrados aún.</p>
      ) : (
        workouts.map((workout) => (
          <div key={workout.id} className="bg-card rounded-xl p-5 border border-gray-800 hover:border-gray-600 transition-colors">
            <div className="flex justify-between items-start mb-3">
              <div>
                <span className={`inline-block px-2 py-1 rounded text-xs font-bold uppercase mb-1 ${
                  workout.type === DayType.PECHO ? 'bg-blue-900 text-blue-200' :
                  workout.type === DayType.ESPALDA ? 'bg-purple-900 text-purple-200' :
                  'bg-orange-900 text-orange-200'
                }`}>
                  {workout.type}
                </span>
                <div className="text-gray-400 text-sm flex items-center gap-1">
                  <Calendar size={14} /> {formatDate(workout.date)}
                </div>
              </div>
              <div className="text-right">
                <span className="text-xs text-gray-500">Ejercicios</span>
                <div className="text-xl font-bold text-white">{workout.exercises.length}</div>
              </div>
            </div>
            
            <div className="space-y-1">
              {workout.exercises.slice(0, 3).map(ex => (
                <div key={ex.id} className="text-sm text-gray-300 flex justify-between">
                  <span>{ex.name}</span>
                  <span className="text-gray-500">{ex.sets.length} series</span>
                </div>
              ))}
              {workout.exercises.length > 3 && (
                <div className="text-xs text-gray-500 mt-1">
                  + {workout.exercises.length - 3} más...
                </div>
              )}
            </div>
          </div>
        ))
      )}
    </div>
  );

  const renderStatsTab = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold mb-4">Progreso y Métricas</h2>
      
      <div className="bg-card p-4 rounded-xl border border-gray-800">
        <label className="block text-sm text-gray-400 mb-2">Seleccionar Ejercicio</label>
        <select 
          value={selectedStatExercise}
          onChange={(e) => setSelectedStatExercise(e.target.value)}
          className="w-full bg-darker border border-gray-700 rounded-lg p-3 text-white focus:ring-2 focus:ring-primary outline-none"
        >
          <option value="">-- Elige un ejercicio --</option>
          {uniqueExercises.map(ex => (
            <option key={ex} value={ex}>{ex}</option>
          ))}
        </select>
      </div>

      {selectedStatExercise && statsData.length > 1 ? (
        <div className="bg-card p-4 rounded-xl border border-gray-800 h-96">
          <h3 className="text-lg font-bold mb-4 text-center">Peso Máximo (kg/lbs)</h3>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={statsData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="date" stroke="#9ca3af" tick={{fontSize: 12}} />
              <YAxis stroke="#9ca3af" />
              <Tooltip 
                contentStyle={{ backgroundColor: '#1f2937', borderColor: '#374151', color: '#fff' }}
                itemStyle={{ color: '#3b82f6' }}
              />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="weight" 
                name="Peso Máximo" 
                stroke="#3b82f6" 
                strokeWidth={3}
                dot={{ r: 4, fill: '#3b82f6' }}
                activeDot={{ r: 8 }} 
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      ) : selectedStatExercise ? (
        <div className="text-center py-12 bg-card rounded-xl border border-gray-800">
          <Activity className="mx-auto w-12 h-12 text-gray-600 mb-2" />
          <p className="text-gray-400">Necesitas al menos 2 sesiones de este ejercicio para ver una gráfica.</p>
        </div>
      ) : null}

      {/* Summary stats could go here */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-gradient-to-br from-gray-800 to-gray-900 p-4 rounded-xl border border-gray-700">
          <div className="text-gray-400 text-xs uppercase font-bold mb-1">Total Entrenamientos</div>
          <div className="text-3xl font-bold text-white">{workouts.length}</div>
        </div>
        <div className="bg-gradient-to-br from-gray-800 to-gray-900 p-4 rounded-xl border border-gray-700">
          <div className="text-gray-400 text-xs uppercase font-bold mb-1">Días Registrados</div>
          <div className="text-3xl font-bold text-secondary">{new Set(workouts.map(w => w.date.split('T')[0])).size}</div>
        </div>
      </div>
    </div>
  );

  const renderAITab = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-2xl font-bold">IA Coach</h2>
        <span className="text-xs font-mono bg-blue-900/30 text-blue-400 px-2 py-1 rounded">Gemini Powered</span>
      </div>
      
      <div className="bg-gradient-to-br from-indigo-900/40 to-purple-900/40 border border-indigo-500/30 p-6 rounded-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 p-4 opacity-10">
          <Brain size={100} />
        </div>
        
        <p className="text-indigo-200 mb-6 relative z-10">
          Obtén un análisis personalizado de tu rendimiento, sugerencias de sobrecarga progresiva y detección de estancamientos basado en tu historial.
        </p>

        {workouts.length < 3 ? (
           <div className="bg-red-900/20 border border-red-900/50 p-4 rounded-lg text-red-200 text-sm">
             Registra al menos 3 entrenamientos para obtener un análisis preciso.
           </div>
        ) : (
          <Button 
            onClick={handleAIAnalysis} 
            disabled={isAnalyzing}
            className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 border-none relative z-10"
          >
            {isAnalyzing ? (
              <span className="flex items-center gap-2">Analizando datos <Activity className="animate-spin" size={16}/></span>
            ) : (
              <span className="flex items-center gap-2">Generar Análisis de Progreso <Brain size={18}/></span>
            )}
          </Button>
        )}
      </div>

      {aiAnalysis && (
        <div className="bg-card rounded-xl p-6 border border-gray-700 shadow-2xl animate-fade-in">
          <h3 className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-emerald-400 mb-4 flex items-center gap-2">
            <TrendingUp size={20} className="text-blue-400"/> Reporte del Entrenador
          </h3>
          <div className="prose prose-invert prose-sm max-w-none text-gray-300 leading-relaxed">
            {aiAnalysis.split('\n').map((line, i) => (
               <p key={i} className="mb-2">{line}</p>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="max-w-md mx-auto min-h-screen flex flex-col bg-darker pb-24 md:pb-0 relative">
      {/* Header */}
      <header className="p-4 bg-darker/95 backdrop-blur-sm sticky top-0 z-20 border-b border-gray-800 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-gradient-to-tr from-primary to-blue-400 rounded-lg flex items-center justify-center text-white font-bold shadow-lg shadow-blue-500/20">
            GT
          </div>
          <h1 className="text-xl font-bold tracking-tight">GymTracker AI</h1>
        </div>
        <div className="text-xs text-gray-500 font-mono">v1.0</div>
      </header>

      {/* Main Content */}
      <main className="flex-1 p-4 overflow-y-auto">
        {activeTab === 'log' && renderLogTab()}
        {activeTab === 'history' && renderHistoryTab()}
        {activeTab === 'stats' && renderStatsTab()}
        {activeTab === 'ai' && renderAITab()}
      </main>

      {/* Mobile Navigation Bar */}
      <nav className="fixed bottom-0 left-0 right-0 bg-darker/95 backdrop-blur-md border-t border-gray-800 p-2 flex justify-around items-center z-30 max-w-md mx-auto">
        <button 
          onClick={() => setActiveTab('log')}
          className={`flex flex-col items-center p-2 rounded-xl transition-all ${activeTab === 'log' ? 'text-primary scale-110' : 'text-gray-500 hover:text-gray-300'}`}
        >
          <Dumbbell size={24} />
          <span className="text-[10px] font-medium mt-1">Registrar</span>
        </button>
        
        <button 
          onClick={() => setActiveTab('history')}
          className={`flex flex-col items-center p-2 rounded-xl transition-all ${activeTab === 'history' ? 'text-primary scale-110' : 'text-gray-500 hover:text-gray-300'}`}
        >
          <Calendar size={24} />
          <span className="text-[10px] font-medium mt-1">Historial</span>
        </button>
        
        <button 
          onClick={() => setActiveTab('stats')}
          className={`flex flex-col items-center p-2 rounded-xl transition-all ${activeTab === 'stats' ? 'text-primary scale-110' : 'text-gray-500 hover:text-gray-300'}`}
        >
          <Activity size={24} />
          <span className="text-[10px] font-medium mt-1">Avances</span>
        </button>
        
        <button 
          onClick={() => setActiveTab('ai')}
          className={`flex flex-col items-center p-2 rounded-xl transition-all ${activeTab === 'ai' ? 'text-purple-400 scale-110' : 'text-gray-500 hover:text-gray-300'}`}
        >
          <Brain size={24} />
          <span className="text-[10px] font-medium mt-1">Coach IA</span>
        </button>
      </nav>
    </div>
  );
};

export default App;
