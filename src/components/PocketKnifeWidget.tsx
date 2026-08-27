import React, { useState, useEffect, useMemo } from 'react';
import { 
  CheckSquare, 
  Plus, 
  Trash2, 
  Edit3, 
  X, 
  Lock, 
  Search, 
  Clock, 
  AlertCircle, 
  CheckCircle2,
  ListTodo,
  Wrench,
  ChevronRight,
  AlertTriangle,
  PlayCircle,
  Timer,
  Play,
  Pause,
  RotateCcw,
  Volume2,
  VolumeX,
  Maximize2,
  Minimize2,
  Settings,
  Sparkles,
  Bell,
  FastForward,
  Mail
} from 'lucide-react';
import { User, Permissions, PersonalTask, TimerPreset } from '../types';
import { getAllUserTasks, saveUserTasksAsync, getTimerPresets } from '../lib/dataStore';
import StatusReportModal from './StatusReportModal';

interface PocketKnifeWidgetProps {
  currentUser: User;
  userPermissions?: Permissions;
  onRefreshBoard?: () => void;
}

// Icon wrapper for PocketKnife/Tools
export function PocketKnifeIcon({ className = "h-5 w-5" }: { className?: string }) {
  return <Wrench className={className} />;
}

export default function PocketKnifeWidget({ currentUser, userPermissions, onRefreshBoard }: PocketKnifeWidgetProps) {
  // Permission check: Allowed for Admin and Analista (controlled via roles_permissions.json or role fallback)
  const hasPocketknifeAccess = useMemo(() => {
    if (!userPermissions) return currentUser?.role === 'Admin' || currentUser?.role === 'Analista';
    const pkPerms = userPermissions.pocketknife_tools;
    if (Array.isArray(pkPerms) && pkPerms.length > 0) return true;
    return currentUser?.role === 'Admin' || currentUser?.role === 'Analista';
  }, [userPermissions, currentUser]);

  // Permission check for Status Report: Exclusive to Admin or parameterized via roles_permissions.json
  const hasStatusReportAccess = useMemo(() => {
    if (userPermissions?.status_report && Array.isArray(userPermissions.status_report) && userPermissions.status_report.length > 0) {
      return true;
    }
    if (userPermissions?.pocketknife_tools && Array.isArray(userPermissions.pocketknife_tools) && userPermissions.pocketknife_tools.includes('status_report')) {
      return true;
    }
    return currentUser?.role === 'Admin';
  }, [userPermissions, currentUser]);

  const [isBalloonOpen, setIsBalloonOpen] = useState(false);
  const [isTasksModalOpen, setIsTasksModalOpen] = useState(false);
  const [isStatusReportModalOpen, setIsStatusReportModalOpen] = useState(false);

  // User Personal Tasks State
  const [userTasks, setUserTasks] = useState<PersonalTask[]>([]);
  const [activeTab, setActiveTab] = useState<'Todas' | 'Pendentes' | 'Em Andamento' | 'Concluídas'>('Todas');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Task Form State
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [formTitle, setFormTitle] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formPriority, setFormPriority] = useState<'P0' | 'P1' | 'P2' | 'P3'>('P2');
  const [formStatus, setFormStatus] = useState<'Pendente' | 'Em Andamento' | 'Concluída'>('Pendente');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Task Deletion Confirmation state (In-UI dialog instead of window.confirm)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Timer & Cronômetro State (Parametrizado via timer_presets.json com persistência em segundo plano)
  const [isTimerModalOpen, setIsTimerModalOpen] = useState(false);
  const [timerPresets, setTimerPresets] = useState<TimerPreset[]>([]);
  const [selectedPreset, setSelectedPreset] = useState<TimerPreset | null>(null);
  const [timerCategoryFilter, setTimerCategoryFilter] = useState<'Todos' | 'Reunião' | 'Foco' | 'Intervalo'>('Todos');
  const [timerSeconds, setTimerSeconds] = useState<number>(15 * 60);
  const [initialSeconds, setInitialSeconds] = useState<number>(15 * 60);
  const [isTimerRunning, setIsTimerRunning] = useState<boolean>(false);
  const [soundAlertEnabled, setSoundAlertEnabled] = useState<boolean>(true);
  const [customMinutesInput, setCustomMinutesInput] = useState<string>('10');
  const [isTimerMiniFloating, setIsTimerMiniFloating] = useState<boolean>(false);
  const [timerFinishedAlert, setTimerFinishedAlert] = useState<boolean>(false);

  // Load Presets & initialize persistent background timer on mount
  useEffect(() => {
    const loaded = getTimerPresets();
    setTimerPresets(loaded);

    try {
      const savedRunning = localStorage.getItem('btb_timer_is_running') === 'true';
      const savedTarget = localStorage.getItem('btb_timer_target_timestamp');
      const savedInitial = localStorage.getItem('btb_timer_initial');
      const savedSound = localStorage.getItem('btb_timer_sound_enabled');
      const savedPreset = localStorage.getItem('btb_timer_selected_preset');

      if (savedInitial) {
        setInitialSeconds(parseInt(savedInitial, 10));
      } else if (loaded.length > 0) {
        setInitialSeconds(loaded[0].durationMinutes * 60);
      }

      if (savedSound !== null) setSoundAlertEnabled(savedSound === 'true');
      if (savedPreset) {
        try { setSelectedPreset(JSON.parse(savedPreset)); } catch {}
      } else if (loaded.length > 0) {
        setSelectedPreset(loaded[0]);
      }

      if (savedRunning && savedTarget) {
        const target = parseInt(savedTarget, 10);
        const now = Date.now();
        const diffSec = Math.max(0, Math.ceil((target - now) / 1000));
        if (diffSec > 0) {
          setTimerSeconds(diffSec);
          setIsTimerRunning(true);
        } else {
          setTimerSeconds(0);
          setIsTimerRunning(false);
          setTimerFinishedAlert(true);
          localStorage.setItem('btb_timer_is_running', 'false');
        }
      } else {
        const savedRem = localStorage.getItem('btb_timer_remaining');
        if (savedRem) {
          setTimerSeconds(parseInt(savedRem, 10));
        } else if (loaded.length > 0) {
          setTimerSeconds(loaded[0].durationMinutes * 60);
        }
      }
    } catch (e) {
      console.warn("Error loading background timer state:", e);
      if (loaded.length > 0 && !selectedPreset) {
        setSelectedPreset(loaded[0]);
        setTimerSeconds(loaded[0].durationMinutes * 60);
        setInitialSeconds(loaded[0].durationMinutes * 60);
      }
    }
  }, []);

  // Audio Chime Generator using Web Audio API
  const playChimeSound = () => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();

      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(880, ctx.currentTime);
      gain1.gain.setValueAtTime(0.3, ctx.currentTime);
      gain1.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(ctx.currentTime);
      osc1.stop(ctx.currentTime + 0.6);

      setTimeout(() => {
        const osc2 = ctx.createOscillator();
        const gain2 = ctx.createGain();
        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(1046.5, ctx.currentTime);
        gain2.gain.setValueAtTime(0.4, ctx.currentTime);
        gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.8);
        osc2.connect(gain2);
        gain2.connect(ctx.destination);
        osc2.start(ctx.currentTime);
        osc2.stop(ctx.currentTime + 0.8);
      }, 200);
    } catch (e) {
      console.warn("Audio Context sound error:", e);
    }
  };

  // Timer Countdown & Background Persistence Effect using target timestamp
  useEffect(() => {
    let interval: any = null;

    if (isTimerRunning) {
      let targetTime = parseInt(localStorage.getItem('btb_timer_target_timestamp') || '0', 10);
      if (!targetTime || targetTime <= Date.now()) {
        targetTime = Date.now() + timerSeconds * 1000;
        localStorage.setItem('btb_timer_target_timestamp', targetTime.toString());
      }

      localStorage.setItem('btb_timer_is_running', 'true');
      localStorage.setItem('btb_timer_initial', initialSeconds.toString());
      localStorage.setItem('btb_timer_sound_enabled', soundAlertEnabled.toString());
      if (selectedPreset) {
        localStorage.setItem('btb_timer_selected_preset', JSON.stringify(selectedPreset));
      }

      interval = setInterval(() => {
        const now = Date.now();
        const remaining = Math.max(0, Math.ceil((targetTime - now) / 1000));
        setTimerSeconds(remaining);
        localStorage.setItem('btb_timer_remaining', remaining.toString());

        if (remaining <= 0) {
          clearInterval(interval);
          setIsTimerRunning(false);
          setTimerFinishedAlert(true);
          localStorage.setItem('btb_timer_is_running', 'false');
          localStorage.removeItem('btb_timer_target_timestamp');
          if (soundAlertEnabled) {
            playChimeSound();
          }
        }
      }, 1000);
    } else {
      localStorage.setItem('btb_timer_is_running', 'false');
      localStorage.removeItem('btb_timer_target_timestamp');
      localStorage.setItem('btb_timer_remaining', timerSeconds.toString());
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isTimerRunning, initialSeconds, soundAlertEnabled, selectedPreset]);

  const toggleTimerRunning = () => {
    const nextRunning = !isTimerRunning;
    setIsTimerRunning(nextRunning);
    if (nextRunning) {
      const targetTime = Date.now() + timerSeconds * 1000;
      localStorage.setItem('btb_timer_target_timestamp', targetTime.toString());
      localStorage.setItem('btb_timer_is_running', 'true');
    } else {
      localStorage.setItem('btb_timer_is_running', 'false');
      localStorage.removeItem('btb_timer_target_timestamp');
    }
  };

  const handleSelectPreset = (preset: TimerPreset) => {
    setSelectedPreset(preset);
    const totalSec = preset.durationMinutes * 60;
    setTimerSeconds(totalSec);
    setInitialSeconds(totalSec);
    setIsTimerRunning(false);
    setTimerFinishedAlert(false);
    localStorage.setItem('btb_timer_is_running', 'false');
    localStorage.setItem('btb_timer_remaining', totalSec.toString());
    localStorage.setItem('btb_timer_initial', totalSec.toString());
    localStorage.setItem('btb_timer_selected_preset', JSON.stringify(preset));
    localStorage.removeItem('btb_timer_target_timestamp');
  };

  const handleApplyCustomTime = () => {
    const mins = parseInt(customMinutesInput, 10);
    if (isNaN(mins) || mins <= 0) return;
    const totalSec = mins * 60;
    const customPreset: TimerPreset = {
      id: 'custom',
      name: `Timebox Customizado (${mins} min)`,
      durationMinutes: mins,
      category: 'Geral',
      description: `Timer customizado configurado para ${mins} minutos`,
      color: '#f59e0b'
    };
    setSelectedPreset(customPreset);
    setTimerSeconds(totalSec);
    setInitialSeconds(totalSec);
    setIsTimerRunning(false);
    setTimerFinishedAlert(false);
    localStorage.setItem('btb_timer_is_running', 'false');
    localStorage.setItem('btb_timer_remaining', totalSec.toString());
    localStorage.setItem('btb_timer_initial', totalSec.toString());
    localStorage.setItem('btb_timer_selected_preset', JSON.stringify(customPreset));
    localStorage.removeItem('btb_timer_target_timestamp');
  };

  const addTimeMinutes = (mins: number) => {
    const addedSec = mins * 60;
    setTimerSeconds(prev => {
      const next = prev + addedSec;
      localStorage.setItem('btb_timer_remaining', next.toString());
      if (isTimerRunning) {
        const newTarget = Date.now() + next * 1000;
        localStorage.setItem('btb_timer_target_timestamp', newTarget.toString());
      }
      return next;
    });
    setInitialSeconds(prev => {
      const next = prev + addedSec;
      localStorage.setItem('btb_timer_initial', next.toString());
      return next;
    });
  };

  const resetTimer = () => {
    setTimerSeconds(initialSeconds);
    setIsTimerRunning(false);
    setTimerFinishedAlert(false);
    localStorage.setItem('btb_timer_is_running', 'false');
    localStorage.setItem('btb_timer_remaining', initialSeconds.toString());
    localStorage.removeItem('btb_timer_target_timestamp');
  };

  const formatTime = (totalSec: number) => {
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const filteredPresets = useMemo(() => {
    if (timerCategoryFilter === 'Todos') return timerPresets;
    return timerPresets.filter(p => p.category === timerCategoryFilter);
  }, [timerPresets, timerCategoryFilter]);

  // Load User Tasks
  const loadPersonalTasks = () => {
    if (!currentUser?.username) return;
    const all = getAllUserTasks();
    const userOnly = all.filter(t => (t.ownerUsername || '').toLowerCase().trim() === currentUser.username.toLowerCase().trim());
    setUserTasks(userOnly);
  };

  useEffect(() => {
    if (hasPocketknifeAccess) {
      loadPersonalTasks();
    }
  }, [currentUser, hasPocketknifeAccess]);

  if (!hasPocketknifeAccess) {
    return null;
  }

  // Count pending user tasks for badge indicator
  const pendingCount = userTasks.filter(t => t.status !== 'Concluída').length;

  // Filter tasks based on activeTab and searchQuery
  const filteredTasks = userTasks.filter(t => {
    if (activeTab === 'Pendentes' && t.status !== 'Pendente') return false;
    if (activeTab === 'Em Andamento' && t.status !== 'Em Andamento') return false;
    if (activeTab === 'Concluídas' && t.status !== 'Concluída') return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (t.title || '').toLowerCase().includes(q) || (t.description || '').toLowerCase().includes(q);
    }
    return true;
  });

  const handleSaveTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim()) {
      setStatusMessage({ type: 'error', text: 'Informe um título para a tarefa.' });
      return;
    }

    setIsSubmitting(true);
    setStatusMessage(null);

    try {
      const allTasks = getAllUserTasks();
      const nowIso = new Date().toISOString();

      if (editingTaskId) {
        // Update existing task
        const updatedAll = allTasks.map(t => {
          if (t.id === editingTaskId && t.ownerUsername.toLowerCase() === currentUser.username.toLowerCase()) {
            return {
              ...t,
              title: formTitle.trim(),
              description: formDescription.trim(),
              priority: formPriority,
              status: formStatus,
              updatedAt: nowIso
            };
          }
          return t;
        });
        await saveUserTasksAsync(updatedAll);
        setStatusMessage({ type: 'success', text: 'Tarefa atualizada com sucesso!' });
      } else {
        // Create new task
        const newTask: PersonalTask = {
          id: `task-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          ownerUsername: currentUser.username,
          title: formTitle.trim(),
          description: formDescription.trim(),
          priority: formPriority,
          status: formStatus || 'Pendente',
          createdAt: nowIso
        };
        await saveUserTasksAsync([...allTasks, newTask]);
        setStatusMessage({ type: 'success', text: 'Nova tarefa pessoal salva!' });
      }

      // Reset form & reload
      resetForm();
      loadPersonalTasks();
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'Erro ao salvar tarefa.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditClick = (task: PersonalTask) => {
    setEditingTaskId(task.id);
    setFormTitle(task.title);
    setFormDescription(task.description || '');
    setFormPriority(task.priority || 'P2');
    setFormStatus(task.status || 'Pendente');
    setConfirmDeleteId(null);
  };

  const handleDeleteTask = async (taskId: string) => {
    setIsSubmitting(true);
    try {
      const allTasks = getAllUserTasks();
      // Remove task by matching id
      const filteredAll = allTasks.filter(t => t.id !== taskId);
      await saveUserTasksAsync(filteredAll);
      loadPersonalTasks();
      if (editingTaskId === taskId) resetForm();
      setStatusMessage({ type: 'success', text: 'Tarefa excluída com sucesso!' });
      setConfirmDeleteId(null);
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: 'Erro ao excluir tarefa: ' + (err.message || '') });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSetStatus = async (task: PersonalTask, newStatus: 'Pendente' | 'Em Andamento' | 'Concluída') => {
    try {
      const allTasks = getAllUserTasks();
      const updatedAll = allTasks.map(t => {
        if (t.id === task.id && t.ownerUsername.toLowerCase() === currentUser.username.toLowerCase()) {
          return { ...t, status: newStatus, updatedAt: new Date().toISOString() };
        }
        return t;
      });
      await saveUserTasksAsync(updatedAll);
      loadPersonalTasks();
      setStatusMessage({ type: 'success', text: `Estado alterado para "${newStatus}"!` });
    } catch (err: any) {
      console.error('Error updating status:', err);
    }
  };

  const handleToggleStatus = async (task: PersonalTask) => {
    const nextStatus: 'Pendente' | 'Concluída' = task.status === 'Concluída' ? 'Pendente' : 'Concluída';
    await handleSetStatus(task, nextStatus);
  };

  const resetForm = () => {
    setEditingTaskId(null);
    setFormTitle('');
    setFormDescription('');
    setFormPriority('P2');
    setFormStatus('Pendente');
  };

  return (
    <>
      {/* Floating Pocketknife Container */}
      <div id="pocketknife-floating-container" className="fixed bottom-6 right-6 z-40 flex flex-col items-end gap-3">
        
        {/* Floating Speech Balloon / Menu */}
        {isBalloonOpen && (
          <div className="bg-white/95 backdrop-blur-md border border-slate-200 shadow-2xl rounded-2xl p-4 w-72 animate-in fade-in slide-in-from-bottom-3 duration-200 text-slate-800">
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-indigo-100 rounded-lg text-[#343180]">
                  <Wrench className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Canivete de Ferramentas</h4>
                  <p className="text-[10px] text-slate-500">Acesso: {currentUser.role}</p>
                </div>
              </div>
              <button 
                onClick={() => setIsBalloonOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-full hover:bg-slate-100 transition-colors"
                title="Fechar menu"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Tools Action Buttons */}
            <div className="space-y-2">
              <button
                onClick={() => {
                  setIsTasksModalOpen(true);
                  setIsBalloonOpen(false);
                }}
                className="w-full flex items-center justify-between p-2.5 rounded-xl bg-slate-50 hover:bg-[#343180]/10 hover:text-[#343180] border border-slate-200/80 transition-all text-left group"
              >
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-lg bg-[#343180] text-white group-hover:scale-105 transition-transform">
                    <CheckSquare className="h-4 w-4" />
                  </div>
                  <div>
                    <span className="text-xs font-bold block text-slate-800 group-hover:text-[#343180]">Tarefas Pessoais</span>
                    <span className="text-[10px] text-slate-500 block">Minhas anotações privadas</span>
                  </div>
                </div>
                {pendingCount > 0 && (
                  <span className="bg-amber-500 text-white text-[10px] font-extrabold px-2 py-0.5 rounded-full shadow-xs">
                    {pendingCount}
                  </span>
                )}
              </button>

              {/* Tool 2: Timer & Cronômetro de Reuniões */}
              <button
                onClick={() => {
                  setIsTimerModalOpen(true);
                  setIsBalloonOpen(false);
                  setIsTimerMiniFloating(false);
                }}
                className="w-full flex items-center justify-between p-2.5 rounded-xl bg-slate-50 hover:bg-[#343180]/10 hover:text-[#343180] border border-slate-200/80 transition-all text-left group"
              >
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-lg bg-amber-500 text-white group-hover:scale-105 transition-transform">
                    <Timer className="h-4 w-4" />
                  </div>
                  <div>
                    <span className="text-xs font-bold block text-slate-800 group-hover:text-[#343180]">Timer de Reuniões & Foco</span>
                    <span className="text-[10px] text-slate-500 block">Daily, Refinamento & Timebox</span>
                  </div>
                </div>
                {isTimerRunning ? (
                  <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded-full border border-amber-300 animate-pulse">
                    {formatTime(timerSeconds)}
                  </span>
                ) : (
                  <ChevronRight className="h-4 w-4 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
                )}
              </button>

              {/* Tool 3: Status Report (Exclusivo Admin / Parametrizado) */}
              {hasStatusReportAccess && (
                <button
                  onClick={() => {
                    setIsStatusReportModalOpen(true);
                    setIsBalloonOpen(false);
                  }}
                  className="w-full flex items-center justify-between p-2.5 rounded-xl bg-slate-50 hover:bg-[#343180]/10 hover:text-[#343180] border border-slate-200/80 transition-all text-left group"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-lg bg-indigo-600 text-white group-hover:scale-105 transition-transform">
                      <Mail className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold block text-slate-800 group-hover:text-[#343180]">Status Report</span>
                        <span className="bg-amber-400 text-slate-950 text-[9px] font-black px-1.5 py-0.2 rounded-full uppercase">
                          Admin
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-500 block">Gerador de e-mail executivo</span>
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
                </button>
              )}
            </div>

            <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400">
              <span className="flex items-center gap-1">
                <Lock className="h-3 w-3 text-slate-400" />
                Privativo por Usuário
              </span>
              <span className="font-semibold text-slate-500">Doc24 TI</span>
            </div>
          </div>
        )}

        {/* Main Floating Balloon Trigger Button */}
        <button
          onClick={() => setIsBalloonOpen(!isBalloonOpen)}
          className={`relative flex items-center gap-2.5 px-4 py-3 rounded-full shadow-2xl transition-all duration-300 font-bold text-xs border-2 ${
            isBalloonOpen 
              ? 'bg-[#282666] text-white border-indigo-400 scale-105 ring-4 ring-indigo-200' 
              : 'bg-[#343180] text-white border-white/20 hover:bg-[#282666] hover:scale-105 active:scale-95 shadow-[#343180]/30'
          }`}
          title="Ferramentas (Tarefas & Utilidades)"
        >
          <Wrench className="h-5 w-5" />
          <span className="hidden sm:inline">Canivete TI</span>
          
          {pendingCount > 0 && !isBalloonOpen && (
            <span className="absolute -top-1.5 -right-1.5 bg-amber-500 text-white text-[10px] font-black h-5 w-5 rounded-full flex items-center justify-center border-2 border-white shadow-md">
              {pendingCount}
            </span>
          )}
        </button>
      </div>

      {/* Right Slide-Over Modal for Tarefas Pessoais */}
      {isTasksModalOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity"
            onClick={() => setIsTasksModalOpen(false)}
          />

          <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
            <div className="w-screen max-w-md bg-white shadow-2xl border-l border-slate-200 flex flex-col transform transition-all duration-300 animate-in slide-in-from-right">
              
              {/* Modal Header */}
              <div className="px-6 py-4 bg-[#343180] text-white flex items-center justify-between shadow-md">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white/10 rounded-xl flex items-center justify-center">
                    <ListTodo className="h-6 w-6 text-amber-300" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold flex items-center gap-2">
                      Tarefas Pessoais
                      <span className="bg-amber-400 text-slate-900 text-[10px] font-black px-2 py-0.5 rounded-full">
                        {userTasks.length}
                      </span>
                    </h3>
                    <p className="text-xs text-indigo-200 flex items-center gap-1.5 mt-0.5">
                      <Lock className="h-3 w-3 text-amber-300" />
                      Privativo de <strong>@{currentUser.username}</strong> ({currentUser.name})
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setIsTasksModalOpen(false)}
                  className="text-white/80 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Status Message Alert */}
              {statusMessage && (
                <div className={`px-6 py-2.5 text-xs font-semibold flex items-center justify-between ${
                  statusMessage.type === 'success' ? 'bg-emerald-50 text-emerald-800 border-b border-emerald-200' : 'bg-rose-50 text-rose-800 border-b border-rose-200'
                }`}>
                  <span>{statusMessage.text}</span>
                  <button onClick={() => setStatusMessage(null)} className="underline text-[10px]">Fechar</button>
                </div>
              )}

              {/* Modal Body */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                
                {/* Add / Edit Task Form */}
                <form onSubmit={handleSaveTask} className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3 shadow-xs">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                    <span className="text-xs font-bold uppercase text-slate-700 flex items-center gap-1.5">
                      {editingTaskId ? <Edit3 className="h-3.5 w-3.5 text-indigo-600" /> : <Plus className="h-3.5 w-3.5 text-indigo-600" />}
                      {editingTaskId ? 'Editar Anotação' : 'Nova Tarefa Pessoal'}
                    </span>
                    {editingTaskId && (
                      <button
                        type="button"
                        onClick={resetForm}
                        className="text-[10px] text-slate-500 hover:text-slate-800 underline font-semibold"
                      >
                        Cancelar Edição
                      </button>
                    )}
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Título da Tarefa *</label>
                    <input
                      type="text"
                      value={formTitle}
                      onChange={e => setFormTitle(e.target.value)}
                      placeholder="Ex: Revisar chamados ou código pendente..."
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#343180] focus:border-transparent outline-none bg-white text-slate-800 font-medium"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Prioridade</label>
                      <select
                        value={formPriority}
                        onChange={e => setFormPriority(e.target.value as any)}
                        className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white text-slate-800 outline-none font-medium"
                      >
                        <option value="P0">P0 (Urgente)</option>
                        <option value="P1">P1 (Alta)</option>
                        <option value="P2">P2 (Média)</option>
                        <option value="P3">P3 (Baixa)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Estado Inicial</label>
                      <select
                        value={formStatus}
                        onChange={e => setFormStatus(e.target.value as any)}
                        className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white text-slate-800 outline-none font-medium"
                      >
                        <option value="Pendente">Pendente</option>
                        <option value="Em Andamento">Em Andamento</option>
                        <option value="Concluída">Concluída</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Anotações / Descrição</label>
                    <textarea
                      rows={2}
                      value={formDescription}
                      onChange={e => setFormDescription(e.target.value)}
                      placeholder="Detalhes adicionais, links, notas de refinamento..."
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#343180] focus:border-transparent outline-none bg-white text-slate-800"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full py-2.5 px-4 bg-[#343180] hover:bg-[#282666] text-white font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center justify-center gap-2"
                  >
                    {editingTaskId ? <CheckCircle2 className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                    {editingTaskId ? 'Salvar Alterações' : 'Adicionar à Minha Lista'}
                  </button>
                </form>

                {/* Filter Tabs & Search */}
                <div className="space-y-3">
                  <div className="relative">
                    <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      placeholder="Buscar em minhas anotações..."
                      className="w-full pl-8 pr-3 py-1.5 text-xs border border-slate-200 rounded-xl bg-slate-50 text-slate-800 focus:bg-white outline-none"
                    />
                  </div>

                  <div className="flex items-center gap-1 border-b border-slate-200 pb-2 overflow-x-auto text-xs">
                    {(['Todas', 'Pendentes', 'Em Andamento', 'Concluídas'] as const).map(tab => (
                      <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`px-3 py-1 rounded-lg font-bold transition-all whitespace-nowrap ${
                          activeTab === tab
                            ? 'bg-[#343180] text-white shadow-xs'
                            : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800'
                        }`}
                      >
                        {tab}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Task List */}
                <div className="space-y-2.5">
                  {filteredTasks.length === 0 ? (
                    <div className="text-center py-8 border-2 border-dashed border-slate-200 rounded-2xl p-6">
                      <ListTodo className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                      <p className="text-xs font-bold text-slate-600">Nenhuma tarefa pessoal encontrada.</p>
                      <p className="text-[10px] text-slate-400 mt-1">Use o formulário acima para adicionar suas anotações privadas.</p>
                    </div>
                  ) : (
                    filteredTasks.map(task => {
                      const isCompleted = task.status === 'Concluída';
                      const isInProgress = task.status === 'Em Andamento';
                      const isDeletingThis = confirmDeleteId === task.id;

                      return (
                        <div 
                          key={task.id}
                          className={`p-3.5 rounded-xl border transition-all ${
                            isCompleted 
                              ? 'bg-slate-50 border-slate-200 opacity-75' 
                              : isInProgress
                              ? 'bg-amber-50/50 border-amber-200 shadow-xs'
                              : 'bg-white border-slate-200 shadow-xs hover:border-indigo-200'
                          }`}
                        >
                          <div className="flex items-start gap-2.5">
                            {/* Status Checkbox */}
                            <button
                              onClick={() => handleToggleStatus(task)}
                              className="mt-0.5 text-slate-400 hover:text-[#343180] transition-colors"
                              title={isCompleted ? 'Marcar como pendente' : 'Finalizar tarefa'}
                            >
                              {isCompleted ? (
                                <CheckCircle2 className="h-5 w-5 text-emerald-600 fill-emerald-100" />
                              ) : isInProgress ? (
                                <PlayCircle className="h-5 w-5 text-amber-600 fill-amber-100" />
                              ) : (
                                <div className="h-5 w-5 rounded-md border-2 border-slate-300 hover:border-[#343180]" />
                              )}
                            </button>

                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-2">
                                <span className={`text-xs font-bold ${isCompleted ? 'line-through text-slate-400' : 'text-slate-800'}`}>
                                  {task.title}
                                </span>
                                
                                <div className="flex items-center gap-1.5 shrink-0">
                                  {/* Status Tag */}
                                  <span className={`text-[9px] font-black px-1.5 py-0.2 rounded-full uppercase ${
                                    isCompleted ? 'bg-emerald-100 text-emerald-800' :
                                    isInProgress ? 'bg-amber-100 text-amber-800' :
                                    'bg-slate-100 text-slate-600'
                                  }`}>
                                    {task.status}
                                  </span>

                                  {/* Priority Badge */}
                                  <span className={`text-[9px] font-black px-1.5 py-0.2 rounded-full uppercase ${
                                    task.priority === 'P0' ? 'bg-red-100 text-red-700' :
                                    task.priority === 'P1' ? 'bg-orange-100 text-orange-700' :
                                    task.priority === 'P2' ? 'bg-blue-100 text-blue-700' :
                                    'bg-slate-100 text-slate-600'
                                  }`}>
                                    {task.priority}
                                  </span>
                                </div>
                              </div>

                              {task.description && (
                                <p className={`text-xs mt-1.5 whitespace-pre-wrap ${isCompleted ? 'text-slate-400' : 'text-slate-600'}`}>
                                  {task.description}
                                </p>
                              )}

                              {/* In-UI Deletion Confirmation Block */}
                              {isDeletingThis ? (
                                <div className="mt-3 p-2.5 bg-rose-50 border border-rose-200 rounded-lg text-rose-900 animate-in fade-in duration-150">
                                  <div className="flex items-center gap-1.5 text-xs font-bold mb-2 text-rose-800">
                                    <AlertTriangle className="h-4 w-4 text-rose-600" />
                                    <span>Excluir esta tarefa definitivamente?</span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteTask(task.id)}
                                      disabled={isSubmitting}
                                      className="px-3 py-1 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-md shadow-xs transition-colors"
                                    >
                                      Sim, Excluir
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setConfirmDeleteId(null)}
                                      className="px-3 py-1 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs rounded-md transition-colors"
                                    >
                                      Cancelar
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <div className="mt-2.5 flex items-center justify-between text-[10px] text-slate-400 pt-2 border-t border-slate-100">
                                  <span className="flex items-center gap-1">
                                    <Clock className="h-3 w-3 text-slate-400" />
                                    {new Date(task.createdAt).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                                  </span>

                                  <div className="flex items-center gap-2.5">
                                    {/* Quick State Toggle Buttons */}
                                    {!isCompleted ? (
                                      <button
                                        type="button"
                                        onClick={() => handleSetStatus(task, 'Concluída')}
                                        className="text-emerald-700 hover:text-emerald-900 font-bold flex items-center gap-0.5 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200"
                                      >
                                        <CheckCircle2 className="h-3 w-3" />
                                        Finalizar
                                      </button>
                                    ) : (
                                      <button
                                        type="button"
                                        onClick={() => handleSetStatus(task, 'Pendente')}
                                        className="text-slate-600 hover:text-slate-800 font-bold flex items-center gap-0.5 bg-slate-100 px-2 py-0.5 rounded"
                                      >
                                        Reabrir
                                      </button>
                                    )}

                                    <button
                                      type="button"
                                      onClick={() => handleEditClick(task)}
                                      className="text-indigo-600 hover:text-indigo-800 font-bold flex items-center gap-0.5"
                                    >
                                      <Edit3 className="h-3 w-3" />
                                      Editar
                                    </button>

                                    <button
                                      type="button"
                                      onClick={() => setConfirmDeleteId(task.id)}
                                      className="text-rose-600 hover:text-rose-800 font-bold flex items-center gap-0.5"
                                    >
                                      <Trash2 className="h-3 w-3" />
                                      Excluir
                                    </button>
                                  </div>
                                </div>
                              )}

                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

              </div>

              {/* Modal Footer */}
              <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 text-center text-[10px] text-slate-500 flex items-center justify-between">
                <span>Armazenado no arquivo <code className="bg-slate-200 px-1 py-0.5 rounded text-slate-700 font-bold">user_tasks.json</code></span>
                <span className="font-semibold text-slate-700">Doc24 Team Brasil</span>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* Floating Mini Timer Widget (Active on Screen) */}
      {(isTimerMiniFloating || (isTimerRunning && !isTimerModalOpen)) && (
        <div className="fixed bottom-24 right-6 z-40 bg-slate-900/95 text-white backdrop-blur-md border border-amber-500/50 shadow-2xl rounded-2xl p-3 flex items-center gap-3 animate-in fade-in slide-in-from-bottom-3 duration-200 ring-2 ring-amber-500/20">
          <div className="p-2 rounded-xl bg-amber-500 text-slate-950 font-bold shadow-sm">
            <Timer className={`h-5 w-5 ${isTimerRunning ? 'animate-spin' : ''}`} />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-extrabold tracking-wider text-amber-400 uppercase truncate max-w-[120px]">
                {selectedPreset ? selectedPreset.name : 'Timer TI'}
              </span>
              <span className="text-[9px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-300 font-semibold">
                {selectedPreset?.category || 'Geral'}
              </span>
            </div>
            <div className="text-lg font-black tracking-tight font-mono text-white leading-none mt-0.5">
              {formatTime(timerSeconds)}
            </div>
          </div>
          <div className="flex items-center gap-1 ml-2 border-l border-slate-700/80 pl-2">
            <button
              onClick={toggleTimerRunning}
              className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
              title={isTimerRunning ? "Pausar" : "Iniciar"}
            >
              {isTimerRunning ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 fill-white" />}
            </button>
            <button
              onClick={() => {
                setIsTimerModalOpen(true);
                setIsTimerMiniFloating(false);
              }}
              className="p-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white transition-colors"
              title="Expandir Timer"
            >
              <Maximize2 className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Full Timer Modal / Slide-Over */}
      {isTimerModalOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          <div 
            className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs transition-opacity"
            onClick={() => setIsTimerModalOpen(false)}
          />

          <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
            <div className="w-screen max-w-lg bg-white shadow-2xl border-l border-slate-200 flex flex-col transform transition-all duration-300 animate-in slide-in-from-right">
              
              {/* Modal Header */}
              <div className="px-6 py-4 bg-[#343180] text-white flex items-center justify-between shadow-md">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-amber-500 rounded-xl text-slate-950 flex items-center justify-center shadow-sm">
                    <Timer className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold flex items-center gap-2">
                      Timer & Cronômetro de Reuniões
                    </h3>
                    <p className="text-xs text-indigo-200 flex items-center gap-1 mt-0.5">
                      <Settings className="h-3 w-3 text-amber-300" />
                      Parametrizado via <code className="bg-white/10 px-1 py-0.2 rounded text-[10px] text-amber-300 font-mono">timer_presets.json</code>
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => {
                      setIsTimerMiniFloating(true);
                      setIsTimerModalOpen(false);
                    }}
                    className="text-white/80 hover:text-white p-2 rounded-lg hover:bg-white/10 transition-colors flex items-center gap-1 text-xs font-semibold"
                    title="Minimizar e continuar na tela"
                  >
                    <Minimize2 className="h-4 w-4" />
                    <span className="hidden sm:inline">Minimizar</span>
                  </button>
                  <button
                    onClick={() => setIsTimerModalOpen(false)}
                    className="text-white/80 hover:text-white p-2 rounded-lg hover:bg-white/10 transition-colors"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>

              {/* Main Modal Body */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50/50">
                
                {/* Finished Alert Banner */}
                {timerFinishedAlert && (
                  <div className="p-4 bg-gradient-to-r from-amber-500 to-rose-600 text-white rounded-2xl shadow-lg border border-amber-400/30 animate-bounce flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-white/20 rounded-xl">
                        <Bell className="h-6 w-6 text-white" />
                      </div>
                      <div>
                        <h4 className="font-extrabold text-sm uppercase tracking-wider">O Tempo Acabou!</h4>
                        <p className="text-xs text-amber-100">Timebox concluído. Hora de encerrar ou avançar de tópico!</p>
                      </div>
                    </div>
                    <button
                      onClick={() => setTimerFinishedAlert(false)}
                      className="px-3 py-1.5 bg-white text-slate-900 font-black text-xs rounded-xl shadow-xs hover:bg-amber-50 transition-colors"
                    >
                      OK / Dispensar
                    </button>
                  </div>
                )}

                {/* Central Display & Timer Controls Card */}
                <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-5 text-center relative overflow-hidden">
                  <div className="absolute top-0 inset-x-0 h-1.5 bg-slate-100">
                    <div 
                      className="h-full bg-gradient-to-r from-amber-500 via-indigo-600 to-emerald-500 transition-all duration-500"
                      style={{ 
                        width: `${initialSeconds > 0 ? Math.min(100, Math.max(0, ((initialSeconds - timerSeconds) / initialSeconds) * 100)) : 0}%` 
                      }}
                    />
                  </div>

                  {/* Selected Preset Name & Badge */}
                  <div className="flex items-center justify-center gap-2 pt-1">
                    <span 
                      className="px-2.5 py-0.5 text-[10px] font-black rounded-full text-white uppercase tracking-wider"
                      style={{ backgroundColor: selectedPreset?.color || '#3b82f6' }}
                    >
                      {selectedPreset?.category || 'Geral'}
                    </span>
                    <h4 className="text-sm font-extrabold text-slate-800">
                      {selectedPreset ? selectedPreset.name : 'Timer TI'}
                    </h4>
                  </div>

                  {/* Main Time Readout */}
                  <div className="py-2">
                    <div className="text-5xl sm:text-6xl font-black font-mono tracking-tight text-slate-900 drop-shadow-xs">
                      {formatTime(timerSeconds)}
                    </div>
                    {selectedPreset?.description && (
                      <p className="text-xs text-slate-500 mt-2 max-w-xs mx-auto">
                        {selectedPreset.description}
                      </p>
                    )}
                  </div>

                  {/* Primary Action Controls */}
                  <div className="flex items-center justify-center gap-3 pt-1">
                    <button
                      onClick={toggleTimerRunning}
                      className={`px-6 py-3 rounded-2xl font-black text-xs flex items-center gap-2 shadow-md transition-all ${
                        isTimerRunning 
                          ? 'bg-amber-500 hover:bg-amber-600 text-slate-950 scale-105' 
                          : 'bg-[#343180] hover:bg-[#282666] text-white hover:scale-105'
                      }`}
                    >
                      {isTimerRunning ? (
                        <>
                          <Pause className="h-4 w-4" />
                          <span>Pausar</span>
                        </>
                      ) : (
                        <>
                          <Play className="h-4 w-4 fill-white" />
                          <span>Iniciar Timebox</span>
                        </>
                      )}
                    </button>

                    <button
                      onClick={resetTimer}
                      className="p-3 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors border border-slate-200"
                      title="Reiniciar Timer"
                    >
                      <RotateCcw className="h-4 w-4" />
                    </button>

                    <button
                      onClick={() => setSoundAlertEnabled(!soundAlertEnabled)}
                      className={`p-3 rounded-2xl border transition-colors ${
                        soundAlertEnabled 
                          ? 'bg-indigo-50 border-indigo-200 text-indigo-700' 
                          : 'bg-slate-100 border-slate-200 text-slate-400'
                      }`}
                      title={soundAlertEnabled ? "Alerta Sonoro Ativo" : "Alerta Sonoro Mudo"}
                    >
                      {soundAlertEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
                    </button>
                  </div>

                  {/* Quick Extension Buttons */}
                  <div className="flex items-center justify-center gap-2 pt-2 border-t border-slate-100 text-xs">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Adicionar Tempo:</span>
                    <button
                      onClick={() => addTimeMinutes(1)}
                      className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[11px] border border-slate-200 transition-colors"
                    >
                      +1 min
                    </button>
                    <button
                      onClick={() => addTimeMinutes(5)}
                      className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[11px] border border-slate-200 transition-colors"
                    >
                      +5 min
                    </button>
                  </div>
                </div>

                {/* Presets List Section */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                      <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                      Presets de Reunião & Foco
                    </h4>
                    <span className="text-[10px] text-slate-400 font-medium">
                      {timerPresets.length} presets em JSON
                    </span>
                  </div>

                  {/* Category Filter Pills */}
                  <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
                    {(['Todos', 'Reunião', 'Foco', 'Intervalo'] as const).map(cat => (
                      <button
                        key={cat}
                        onClick={() => setTimerCategoryFilter(cat)}
                        className={`px-3 py-1 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                          timerCategoryFilter === cat
                            ? 'bg-[#343180] text-white shadow-xs'
                            : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                        }`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>

                  {/* Presets Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {filteredPresets.map(preset => {
                      const isSelected = selectedPreset?.id === preset.id;
                      return (
                        <button
                          key={preset.id}
                          onClick={() => handleSelectPreset(preset)}
                          className={`p-3 rounded-2xl text-left border transition-all relative group ${
                            isSelected 
                              ? 'bg-indigo-50/80 border-indigo-400 ring-2 ring-indigo-200/50 shadow-xs' 
                              : 'bg-white border-slate-200/90 hover:border-indigo-300 hover:bg-slate-50'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span 
                              className="text-[9px] font-black px-2 py-0.2 rounded-full text-white uppercase tracking-wider"
                              style={{ backgroundColor: preset.color || '#3b82f6' }}
                            >
                              {preset.category}
                            </span>
                            <span className="text-xs font-black text-slate-900 font-mono">
                              {preset.durationMinutes} min
                            </span>
                          </div>
                          <h5 className="text-xs font-bold text-slate-800 group-hover:text-indigo-900">
                            {preset.name}
                          </h5>
                          {preset.description && (
                            <p className="text-[10px] text-slate-500 mt-1 line-clamp-2">
                              {preset.description}
                            </p>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Custom Timebox Input Section */}
                <div className="bg-white rounded-2xl p-4 border border-slate-200/90 space-y-2">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Timebox Personalizado
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="1"
                      max="300"
                      value={customMinutesInput}
                      onChange={e => setCustomMinutesInput(e.target.value)}
                      placeholder="Minutos"
                      className="flex-1 px-3 py-2 text-xs border border-slate-300 rounded-xl bg-slate-50 font-bold text-slate-800 focus:ring-2 focus:ring-indigo-200 focus:outline-hidden"
                    />
                    <button
                      onClick={handleApplyCustomTime}
                      className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs rounded-xl shadow-xs transition-colors"
                    >
                      Aplicar
                    </button>
                  </div>
                </div>

              </div>

              {/* Modal Footer */}
              <div className="p-4 bg-white border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
                <span className="text-[10px] text-slate-400">
                  Tip: Edite <code className="text-indigo-600 font-bold">timer_presets.json</code> no menu Admin para incluir novos timers padrão.
                </span>
                <button
                  onClick={() => setIsTimerModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-xl transition-colors"
                >
                  Fechar
                </button>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* Status Report Modal (Admin Exclusive & Parameterized) */}
      <StatusReportModal
        isOpen={isStatusReportModalOpen}
        onClose={() => setIsStatusReportModalOpen(false)}
        currentUser={currentUser}
      />
    </>
  );
}
