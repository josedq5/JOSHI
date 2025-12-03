import React, { useState, useEffect, useMemo } from 'react';
import { Plus, Trash2, Save, Activity, Calendar, TrendingUp, Brain, Dumbbell, ChevronRight, LayoutGrid, Clock, Trophy } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, AreaChart, Area } from 'recharts';
import { DayType, WorkoutSession, ExerciseLog, SetData } from './types';
import { DEFAULT_EXERCISES } from './constants';
import { analyzeWorkoutProgress } from './services/geminiService';
import { Button } from './components/Button';

// --- Helper Functions ---
const generateId = () => Math.random().toString(36).substr(2, 9);
const formatDate = (dateStr: string) => new Date(dateStr).toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
const formatShortDate = (dateStr: string) => new Date(dateStr).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' });

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
        
        const maxWeight = Math.max(...exercise.sets.map(s => s.weight));
        const totalVolume = exercise.sets.reduce((acc, s) => acc + (s.weight * s.reps), 0);
        
        return {
          date: formatShortDate(w.date),
          rawDate: w.date,
          weight: maxWeight,
          volume: totalVolume
        };
      })
      .filter(Boolean)
      .sort((a, b) => new Date(a!.rawDate).getTime() - new Date(b!.rawDate).getTime());
  }, [workouts, selectedStatExercise]);

  const handleAIAnalysis = async () => {
    setIsAnalyzing(true);
    const result = await analyzeWorkoutProgress(workouts);
    setAiAnalysis(result);
    setIsAnalyzing(false);
  };

  // --- Navigation Config ---
  const navItems = [
    { id: 'log', label: 'Registrar', icon: Dumbbell },
    { id: 'history', label: 'Historial', icon: Calendar },
    { id: 'stats', label: 'Avances', icon: Activity },
    { id: 'ai', label: 'Coach IA', icon: Brain },
  ] as const;

  // --- Render Components ---

  const renderLogTab = () => (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-fade-in h-full">
      {/* Left Column: Controls & Suggestions */}
      <div className="lg:col-span-4 space-y-6">
        <div className="bg-card/50 backdrop-blur-sm p-6 rounded-2xl border border-gray-800 shadow-xl">
          <h3 className="text-gray-400 text-xs font-bold uppercase mb-4 tracking-wider flex items-center gap-2">
            <LayoutGrid size={14}/> Selecciona el Día
          </h3>
          <div className="grid grid-cols-1 gap-2">
            {Object.values(DayType).map((type) => (
              <button
                key={type}
                onClick={() => setSelectedDay(type)}
                className={`flex items-center justify-between p-4 rounded-xl font-bold transition-all duration-200 group ${
                  selectedDay === type 
                  ? 'bg-gradient-to-r from-primary to-blue-600 text-white shadow-lg shadow-blue-500/20 translate-x-1' 
                  : 'bg-darker text-gray-400 hover:bg-gray-700 hover:text-white'
                }`}
              >
                <span>{type}</span>
                {selectedDay === type && <ChevronRight size={18} className="animate-pulse"/>}
              </button>
            ))}
          </div>
        </div>

        <div className="bg-card/50 backdrop-blur-sm p-6 rounded-2xl border border-gray-800 shadow-xl">
          <h3 className="text-gray-400 text-xs font-bold uppercase mb-4 tracking-wider">Ejercicios Sugeridos</h3>
          <div className="flex flex-wrap gap-2">
            {DEFAULT_EXERCISES[selectedDay].map(ex => (
              <button
                key={ex}
                onClick={() => addExerciseToSession(ex)}
                className="bg-darker hover:bg-gray-700 border border-gray-700 hover:border-gray-500 text-sm px-3 py-2 rounded-lg transition-all text-gray-200 flex items-center gap-2 group"
              >
                <Plus size={14} className="text-primary group-hover:text-white transition-colors"/> {ex}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Right Column: Active Session */}
      <div className="lg:col-span-8 space-y-6">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <span className="w-2 h-8 bg-primary rounded-full"></span>
            Sesión Actual
          </h2>
          {currentSession.length > 0 && (
             <span className="text-sm text-gray-400 bg-card px-3 py-1 rounded-full border border-gray-700">
               {currentSession.length} Ejercicios
             </span>
          )}
        </div>

        <div className="space-y-4">
          {currentSession.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 border-2 border-dashed border-gray-800 rounded-3xl bg-card/30 text-center">
              <div className="w-20 h-20 bg-gray-800/50 rounded-full flex items-center justify-center mb-4">
                <Dumbbell className="w-10 h-10 text-gray-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-300 mb-1">Empieza tu entrenamiento</h3>
              <p className="text-gray-500 max-w-xs mx-auto">Selecciona ejercicios del panel izquierdo para comenzar tu rutina de <span className="text-primary font-bold">{selectedDay}</span></p>
            </div>
          ) : (
            currentSession.map((exercise) => (
              <div key={exercise.id} className="bg-card rounded-2xl p-5 shadow-lg border border-gray-800 transition-all hover:border-gray-700 group">
                <div className="flex justify-between items-center mb-4 border-b border-gray-800 pb-3">
                  <h4 className="font-bold text-xl text-white group-hover:text-blue-400 transition-colors">{exercise.name}</h4>
                  <button 
                    onClick={() => removeExercise(exercise.id)}
                    className="text-gray-500 hover:text-red-400 hover:bg-red-400/10 p-2 rounded-lg transition-all"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
                
                <div className="space-y-3">
                  <div className="grid grid-cols-10 gap-2 text-xs text-gray-500 uppercase font-bold tracking-wider text-center mb-2 px-1">
                    <div className="col-span-1">#</div>
                    <div className="col-span-4 sm:col-span-4">Peso (kg)</div>
                    <div className="col-span-4 sm:col-span-4">Reps</div>
                    <div className="col-span-1"></div>
                  </div>
                  {exercise.sets.map((set, setIndex) => (
                    <div key={set.id} className="grid grid-cols-10 gap-3 items-center">
                      <div className="col-span-1 flex justify-center">
                        <span className="bg-gray-800 text-gray-400 w-6 h-6 rounded-full flex items-center justify-center text-xs font-mono">
                          {setIndex + 1}
                        </span>
                      </div>
                      <div className="col-span-4 sm:col-span-4">
                        <input
                          type="number"
                          value={set.weight || ''}
                          onChange={(e) => updateSet(exercise.id, set.id, 'weight', parseFloat(e.target.value))}
                          placeholder="0"
                          className="w-full bg-darker border border-gray-700 hover:border-gray-600 rounded-lg py-2 px-3 text-center text-white focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none transition-all font-mono"
                        />
                      </div>
                      <div className="col-span-4 sm:col-span-4">
                        <input
                          type="number"
                          value={set.reps || ''}
                          onChange={(e) => updateSet(exercise.id, set.id, 'reps', parseFloat(e.target.value))}
                          placeholder="0"
                          className="w-full bg-darker border border-gray-700 hover:border-gray-600 rounded-lg py-2 px-3 text-center text-white focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none transition-all font-mono"
                        />
                      </div>
                      <div className="col-span-1 flex justify-center">
                        <button onClick={() => removeSet(exercise.id, set.id)} className="text-gray-600 hover:text-red-400 transition-colors p-1">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
                
                <button 
                  onClick={() => addSet(exercise.id)}
                  className="mt-5 w-full py-2.5 bg-gray-800/50 hover:bg-gray-800 text-blue-400 hover:text-blue-300 border border-dashed border-gray-700 hover:border-blue-500/50 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all"
                >
                  <Plus size={16} /> Agregar Serie
                </button>
              </div>
            ))
          )}
        </div>

        {currentSession.length > 0 && (
          <div className="fixed bottom-24 left-4 right-4 md:static md:mt-8 z-20">
            <Button 
              onClick={saveWorkout} 
              fullWidth 
              className="shadow-2xl shadow-primary/30 py-4 text-lg font-bold tracking-wide transform hover:-translate-y-1 transition-transform"
            >
              <Save size={20} /> Guardar Entrenamiento
            </Button>
          </div>
        )}
      </div>
    </div>
  );

  const renderHistoryTab = () => (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold text-white tracking-tight">Historial</h2>
        <div className="bg-card px-4 py-2 rounded-full border border-gray-700 text-sm text-gray-400">
           Total: <span className="text-white font-bold">{workouts.length}</span> sesiones
        </div>
      </div>
      
      {workouts.length === 0 ? (
        <div className="text-center py-20 bg-card/30 rounded-3xl border border-gray-800">
          <Calendar className="w-16 h-16 text-gray-700 mx-auto mb-4" />
          <p className="text-gray-500 text-lg">No hay entrenamientos registrados aún.</p>
          <button onClick={() => setActiveTab('log')} className="mt-4 text-primary hover:underline">
            Comenzar mi primer registro
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {workouts.map((workout) => (
            <div key={workout.id} className="bg-card rounded-2xl p-6 border border-gray-800 hover:border-gray-600 transition-all hover:shadow-xl hover:shadow-black/20 group relative overflow-hidden">
               <div className={`absolute top-0 left-0 w-1 h-full ${
                  workout.type === DayType.PECHO ? 'bg-blue-500' :
                  workout.type === DayType.ESPALDA ? 'bg-purple-500' :
                  'bg-orange-500'
               }`}></div>
              <div className="flex justify-between items-start mb-4 pl-3">
                <div>
                  <h3 className="text-xl font-bold text-white mb-1">{workout.type}</h3>
                  <div className="text-gray-400 text-sm flex items-center gap-1.5">
                    <Clock size={14} className="text-gray-500"/> {formatDate(workout.date)}
                  </div>
                </div>
              </div>
              
              <div className="space-y-2 pl-3 mb-4">
                {workout.exercises.slice(0, 4).map(ex => (
                  <div key={ex.id} className="text-sm text-gray-300 flex justify-between items-center border-b border-gray-800/50 pb-1 last:border-0">
                    <span className="truncate pr-2">{ex.name}</span>
                    <span className="text-xs font-mono text-gray-500 bg-darker px-1.5 py-0.5 rounded">{ex.sets.length}x</span>
                  </div>
                ))}
                {workout.exercises.length > 4 && (
                  <div className="text-xs text-primary font-medium pt-1">
                    + {workout.exercises.length - 4} ejercicios más
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const renderStatsTab = () => (
    <div className="space-y-8 animate-fade-in max-w-5xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
         <h2 className="text-3xl font-bold text-white tracking-tight">Métricas de Progreso</h2>
         <div className="w-full md:w-72">
            <select 
              value={selectedStatExercise}
              onChange={(e) => setSelectedStatExercise(e.target.value)}
              className="w-full bg-card border border-gray-700 hover:border-gray-500 rounded-xl p-3 text-white focus:ring-2 focus:ring-primary outline-none transition-all cursor-pointer"
            >
              <option value="">Seleccionar Ejercicio</option>
              {uniqueExercises.map(ex => (
                <option key={ex} value={ex}>{ex}</option>
              ))}
            </select>
         </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Chart */}
          <div className="lg:col-span-2 bg-card p-6 rounded-2xl border border-gray-800 shadow-xl h-[400px]">
            <h3 className="text-lg font-bold mb-6 flex items-center gap-2 text-gray-200">
              <Trophy size={18} className="text-yellow-500"/> Progreso de Peso Máximo
            </h3>
            {selectedStatExercise && statsData.length > 1 ? (
              <ResponsiveContainer width="100%" height="85%">
                <AreaChart data={statsData}>
                  <defs>
                    <linearGradient id="colorWeight" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} />
                  <XAxis 
                    dataKey="date" 
                    stroke="#9ca3af" 
                    tick={{fontSize: 12}} 
                    tickLine={false}
                    axisLine={false}
                    dy={10}
                  />
                  <YAxis 
                    stroke="#9ca3af" 
                    tick={{fontSize: 12}}
                    tickLine={false}
                    axisLine={false}
                    dx={-10}
                  />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#1f2937', borderColor: '#374151', borderRadius: '8px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                    itemStyle={{ color: '#fff' }}
                    cursor={{ stroke: '#3b82f6', strokeWidth: 1, strokeDasharray: '5 5' }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="weight" 
                    name="Peso Máximo (kg)" 
                    stroke="#3b82f6" 
                    strokeWidth={3}
                    fillOpacity={1} 
                    fill="url(#colorWeight)" 
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : selectedStatExercise ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-4">
                <Activity className="w-12 h-12 text-gray-700 mb-2" />
                <p className="text-gray-400">Registra al menos 2 sesiones para visualizar tu curva de progreso.</p>
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center p-4">
                <TrendingUp className="w-12 h-12 text-gray-700 mb-2" />
                <p className="text-gray-400">Selecciona un ejercicio arriba para ver las estadísticas.</p>
              </div>
            )}
          </div>

          {/* Stats Cards */}
          <div className="space-y-6">
            <div className="bg-gradient-to-br from-blue-900/40 to-card p-6 rounded-2xl border border-blue-900/30">
              <div className="text-blue-300 text-xs uppercase font-bold mb-2 flex items-center gap-2">
                <Dumbbell size={14}/> Total Entrenamientos
              </div>
              <div className="text-4xl font-bold text-white tracking-tight">{workouts.length}</div>
              <p className="text-xs text-gray-400 mt-2">Sesiones completadas</p>
            </div>
            
            <div className="bg-gradient-to-br from-emerald-900/40 to-card p-6 rounded-2xl border border-emerald-900/30">
              <div className="text-emerald-300 text-xs uppercase font-bold mb-2 flex items-center gap-2">
                <Calendar size={14}/> Consistencia
              </div>
              <div className="text-4xl font-bold text-white tracking-tight">{new Set(workouts.map(w => w.date.split('T')[0])).size}</div>
              <p className="text-xs text-gray-400 mt-2">Días únicos de gimnasio</p>
            </div>

            {selectedStatExercise && statsData.length > 0 && (
               <div className="bg-card p-6 rounded-2xl border border-gray-800">
                  <div className="text-gray-400 text-xs uppercase font-bold mb-2">Máximo Histórico</div>
                  <div className="text-3xl font-bold text-white flex items-end gap-2">
                     {Math.max(...statsData.map(d => d.weight))} <span className="text-lg text-gray-500 font-medium mb-1">kg</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">en {selectedStatExercise}</p>
               </div>
            )}
          </div>
      </div>
    </div>
  );

  const renderAITab = () => (
    <div className="max-w-4xl mx-auto space-y-8 animate-fade-in">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold text-white tracking-tight">Coach Inteligente</h2>
          <p className="text-gray-400 text-sm mt-1">Análisis de rendimiento impulsado por Gemini AI</p>
        </div>
        <span className="hidden md:inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/10 text-blue-400 text-xs font-mono border border-blue-500/20">
          <Brain size={12}/> AI Powered v1.0
        </span>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
         {/* Left: Action Card */}
         <div className="md:col-span-1 bg-gradient-to-b from-indigo-900/40 to-card border border-indigo-500/20 p-6 rounded-2xl relative overflow-hidden flex flex-col justify-between h-auto md:h-80">
            <div className="absolute top-0 right-0 p-4 opacity-5">
              <Brain size={120} />
            </div>
            
            <div className="relative z-10">
              <h3 className="text-lg font-bold text-indigo-200 mb-2">Generar Nuevo Análisis</h3>
              <p className="text-sm text-gray-400 mb-6 leading-relaxed">
                Nuestra IA analizará tu volumen, frecuencia y cargas progresivas para darte consejos personalizados.
              </p>
            </div>

            <div className="relative z-10 mt-auto">
              {workouts.length < 3 ? (
                 <div className="bg-red-500/10 border border-red-500/20 p-3 rounded-lg text-red-300 text-xs flex items-center gap-2">
                   <Activity size={14} className="shrink-0"/> Mínimo 3 entrenamientos requeridos.
                 </div>
              ) : (
                <Button 
                  onClick={handleAIAnalysis} 
                  disabled={isAnalyzing}
                  className="w-full bg-indigo-600 hover:bg-indigo-500 border-none shadow-lg shadow-indigo-900/50"
                >
                  {isAnalyzing ? (
                    <span className="flex items-center gap-2"><Activity className="animate-spin" size={16}/> Procesando...</span>
                  ) : (
                    <span className="flex items-center gap-2">Analizar Ahora <Brain size={16}/></span>
                  )}
                </Button>
              )}
            </div>
         </div>

         {/* Right: Result Area */}
         <div className="md:col-span-2">
            {aiAnalysis ? (
              <div className="bg-card rounded-2xl p-6 border border-gray-700 shadow-2xl h-full animate-fade-in relative">
                <div className="absolute top-4 right-4">
                   <TrendingUp className="text-emerald-500 opacity-20" size={40} />
                </div>
                <h3 className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-emerald-400 mb-6 flex items-center gap-2 border-b border-gray-800 pb-4">
                  Reporte del Entrenador
                </h3>
                <div className="prose prose-invert prose-sm max-w-none text-gray-300 leading-7">
                  {aiAnalysis.split('\n').map((line, i) => (
                     <p key={i} className={`mb-3 ${line.startsWith('#') ? 'font-bold text-white text-lg mt-4' : ''} ${line.startsWith('-') ? 'pl-4 border-l-2 border-gray-700' : ''}`}>
                       {line}
                     </p>
                  ))}
                </div>
                <div className="mt-6 text-xs text-gray-600 text-right italic">
                  Generado el {new Date().toLocaleDateString()}
                </div>
              </div>
            ) : (
               <div className="bg-card/30 rounded-2xl border-2 border-dashed border-gray-800 h-full min-h-[300px] flex flex-col items-center justify-center text-center p-8">
                  <div className="w-16 h-16 bg-gray-800 rounded-full flex items-center justify-center mb-4">
                     <Brain className="text-gray-600" size={32} />
                  </div>
                  <h4 className="text-gray-300 font-semibold mb-2">Esperando análisis</h4>
                  <p className="text-gray-500 text-sm max-w-xs">Haz clic en "Analizar Ahora" para recibir feedback sobre tu progreso reciente.</p>
               </div>
            )}
         </div>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-darker text-gray-100 overflow-hidden font-sans">
       {/* --- Desktop Sidebar --- */}
       <aside className="hidden md:flex w-72 flex-col bg-card/40 backdrop-blur-xl border-r border-gray-800/50 z-20">
          <div className="p-6 flex items-center gap-3 mb-2">
             <div className="w-10 h-10 bg-gradient-to-br from-primary to-blue-600 rounded-xl flex items-center justify-center text-white font-bold shadow-lg shadow-blue-500/20 text-lg">
               GT
             </div>
             <div>
               <h1 className="text-lg font-bold tracking-tight text-white leading-tight">GymTracker</h1>
               <p className="text-[10px] text-primary uppercase font-bold tracking-wider">AI Edition</p>
             </div>
          </div>

          <nav className="flex-1 px-4 space-y-2">
            {navItems.map(item => (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id as any)}
                className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all duration-200 group relative overflow-hidden ${
                  activeTab === item.id 
                    ? 'bg-primary/10 text-primary shadow-inner' 
                    : 'text-gray-400 hover:bg-gray-800/50 hover:text-gray-200'
                }`}
              >
                {activeTab === item.id && <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary rounded-r-full"/>}
                <item.icon className={`transition-transform duration-200 ${activeTab === item.id ? 'scale-110' : 'group-hover:scale-110'}`} size={20} />
                <span className="font-semibold text-sm">{item.label}</span>
              </button>
            ))}
          </nav>
          
          <div className="p-4 mt-auto">
             <div className="bg-gradient-to-br from-gray-800/80 to-gray-900/80 rounded-2xl p-5 border border-gray-700/30 shadow-lg relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                   <Trophy size={60} />
                </div>
                <p className="text-xs text-gray-400 mb-1 font-medium uppercase tracking-wider">Total Sesiones</p>
                <div className="text-3xl font-bold text-white tracking-tight">{workouts.length}</div>
             </div>
          </div>
       </aside>

       {/* --- Main Content Area --- */}
       <div className="flex-1 flex flex-col h-full relative overflow-hidden bg-darker">
          {/* Mobile Header */}
          <header className="md:hidden p-4 bg-darker/90 backdrop-blur-md sticky top-0 z-30 border-b border-gray-800 flex justify-between items-center">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-br from-primary to-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-sm">
                GT
              </div>
              <h1 className="text-lg font-bold tracking-tight">GymTracker</h1>
            </div>
            <div className="px-2 py-1 bg-gray-800 rounded text-xs text-gray-400 font-mono">v1.2</div>
          </header>

          <main className="flex-1 overflow-y-auto scroll-smooth">
             <div className="max-w-7xl mx-auto p-4 md:p-8 lg:p-10 pb-28 md:pb-10 h-full">
                {activeTab === 'log' && renderLogTab()}
                {activeTab === 'history' && renderHistoryTab()}
                {activeTab === 'stats' && renderStatsTab()}
                {activeTab === 'ai' && renderAITab()}
             </div>
          </main>

          {/* --- Mobile Bottom Navigation --- */}
          <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-darker/80 backdrop-blur-xl border-t border-gray-800/50 p-2 pb-safe flex justify-around items-center z-40">
            {navItems.map(item => (
              <button 
                key={item.id}
                onClick={() => setActiveTab(item.id as any)}
                className={`flex flex-col items-center p-2 rounded-2xl w-16 transition-all duration-300 ${
                  activeTab === item.id 
                  ? 'text-primary -translate-y-2' 
                  : 'text-gray-500 hover:text-gray-300'
                }`}
              >
                <div className={`p-2 rounded-xl mb-1 transition-all ${activeTab === item.id ? 'bg-primary/20 shadow-lg shadow-primary/10' : 'bg-transparent'}`}>
                   <item.icon size={20} strokeWidth={activeTab === item.id ? 2.5 : 2} />
                </div>
                <span className={`text-[10px] font-medium transition-opacity ${activeTab === item.id ? 'opacity-100' : 'opacity-70'}`}>
                  {item.label}
                </span>
              </button>
            ))}
          </nav>
       </div>
    </div>
  );
};

export default App;