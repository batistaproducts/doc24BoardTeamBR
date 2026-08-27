import React, { useState, useEffect, useRef } from 'react';
import {
  Shield,
  Activity,
  BarChart3,
  Settings2,
  LogOut,
  Lock,
  Unlock,
  AlertCircle,
  Timer,
  UserCheck,
  Zap,
  Info,
  ServerCrash,
  Check,
  RefreshCw,
  Layers,
  CalendarDays
} from 'lucide-react';
import { User, LockStatus } from './types';
import {
  initializeDataStore,
  getLockStatus,
  saveLockStatus,
  getRolePermissions,
  syncFromServer,
  isLocalOnlyMode,
  saveAllFilesToServer,
  saveRawFileAsync,
  pullFromGitHub,
  getGitHubConfig,
  pullLockStatusFromGitHub,
  checkDbStatus,
  setNeonConnected,
  getIsNeonConnected
} from './lib/dataStore';
import Login from './components/Login';
import Board from './components/Board';
import Metrics from './components/Metrics';
import AdminConfig from './components/AdminConfig';
import Doc24Logo from './components/Doc24Logo';
import PlanningRefinement from './components/PlanningRefinement';
import DatasAvisos from './components/DatasAvisos';
import PocketKnifeWidget from './components/PocketKnifeWidget';

// Antonio Batista - SEG_002 - Componente principal da aplicação Doc24 Board, gerenciando controle de versão, estado global, autenticação e sessão de edição.
export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [activeMenu, setActiveMenu] = useState<'board' | 'metrics' | 'config' | 'planning_refinement' | 'datas_avisos'>('board');
  const [lockStatus, setLockStatus] = useState<LockStatus>({
    locked: false,
    lockedBy: null,
    lockedAt: null,
    expiresAt: null
  });

  // Remaining time for current edit lock in seconds (10 minutes = 600s)
  const [timerRemaining, setTimerRemaining] = useState<number>(600);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const [isSyncing, setIsSyncing] = useState<boolean>(true);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [isServerConnected, setIsServerConnected] = useState<boolean>(true);

  // Data synchronization and background refresh triggers
  const [refreshTrigger, setRefreshTrigger] = useState<number>(0);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');
  const [lastSavedFile, setLastSavedFile] = useState<string>('');
  const [isCheckingLock, setIsCheckingLock] = useState<boolean>(false);
  const [isNeonActive, setIsNeonActive] = useState<boolean>(false);

  // Is edit mode currently active for the LOGGED IN user?
  const isEditModeActive =
    currentUser !== null &&
    lockStatus.locked === true &&
    lockStatus.lockedBy === currentUser.username &&
    (() => {
      if (lockStatus.expiresAt) {
        return Date.now() <= new Date(lockStatus.expiresAt).getTime();
      }
      return true;
    })();

  // Check if the lock is currently active on GitHub/local cache
  const isLockPhysicallyActive = (() => {
    if (!lockStatus.locked) return false;
    if (lockStatus.expiresAt) {
      const expiresTime = new Date(lockStatus.expiresAt).getTime();
      if (Date.now() > expiresTime) {
        return false; // lock has expired
      }
    }
    return true;
  })();

  const isLockedBySomeoneElse = isLockPhysicallyActive && lockStatus.lockedBy !== currentUser?.username;

  // Initialize store and sync with physical server files when App mounts
  useEffect(() => {
    async function loadData() {
      try {
        // Check Neon DB connection status
        try {
          const dbRes = await checkDbStatus();
          const dbConnected = !!(dbRes && dbRes.success);
          setIsNeonActive(dbConnected);
          setNeonConnected(dbConnected);
        } catch (dbErr) {
          console.warn("[App] Error checking Neon DB status:", dbErr);
          setIsNeonActive(false);
          setNeonConnected(false);
        }

        const result = await syncFromServer();
        if (!result.success) {
          console.warn("[App] Falha na sincronização física inicial com o servidor. Usando cache local (LocalStorage).", result.error);
          setIsServerConnected(false);
          initializeDataStore();
          // We do NOT set syncError so the application runs perfectly in Vercel/offline local mode!
        } else {
          setIsServerConnected(true);
        }

        // If GitHub integration is enabled and configured, pull the latest data from GitHub on mount
        const config = getGitHubConfig();
        if (config.enabled && config.token && config.owner && config.repo) {
          console.log("[App] GitHub sync is enabled. Auto-pulling latest lock status and data on startup...");
          
          // Pull lock status from GitHub first
          try {
            const lockRes = await pullLockStatusFromGitHub();
            if (lockRes.success && lockRes.lockStatus) {
              setLockStatus(lockRes.lockStatus);
            }
          } catch (e) {
            console.warn("[App] Failed to pull lock status from GitHub on startup:", e);
          }

          const gitResult = await pullFromGitHub();
          if (gitResult.success) {
            setRefreshTrigger(prev => prev + 1);
          } else {
            console.warn("[App] Failed to auto-pull from GitHub on startup:", gitResult.error);
          }
        }
      } catch (err: any) {
        console.warn("[App] Erro de rede ao sincronizar com o servidor. Usando cache local (LocalStorage).", err);
        setIsServerConnected(false);
        initializeDataStore();
      } finally {
        setIsSyncing(false);
      }
    }
    loadData();
    
    // Check if user session exists in sessionStorage
    const savedUser = sessionStorage.getItem('btb_current_user');
    if (savedUser) {
      try {
        setCurrentUser(JSON.parse(savedUser));
      } catch {
        sessionStorage.removeItem('btb_current_user');
      }
    }

    // Load initial lock status
    const currentLock = getLockStatus();
    setLockStatus(currentLock);
  }, []);

  // Listen to file saving events dispatched by saveRawFile to display visual synchronization progress
  useEffect(() => {
    const handleSaveStart = (e: Event) => {
      const customEvent = e as CustomEvent;
      setSaveStatus('saving');
      if (customEvent.detail && customEvent.detail.fileName) {
        setLastSavedFile(customEvent.detail.fileName);
      }
    };

    const handleSaveSuccess = () => {
      setSaveStatus('success');
      const timer = setTimeout(() => {
        setSaveStatus('idle');
      }, 3000);
      return () => clearTimeout(timer);
    };

    const handleSaveError = () => {
      setSaveStatus('error');
    };

    window.addEventListener('btb_save_start', handleSaveStart);
    window.addEventListener('btb_save_success', handleSaveSuccess);
    window.addEventListener('btb_save_error', handleSaveError);

    return () => {
      window.removeEventListener('btb_save_start', handleSaveStart);
      window.removeEventListener('btb_save_success', handleSaveSuccess);
      window.removeEventListener('btb_save_error', handleSaveError);
    };
  }, []);

  // Refresh data and lock status from server/GitHub every 10 seconds, EXCEPT in edit mode or when offline/Vercel (no server connection)
  useEffect(() => {
    if (isEditModeActive) return;

    const interval = setInterval(async () => {
      try {
        // Periodically refresh Neon DB status
        try {
          const dbRes = await checkDbStatus();
          const dbConnected = !!(dbRes && dbRes.success);
          setIsNeonActive(dbConnected);
          setNeonConnected(dbConnected);
        } catch (e) {
          // Keep prior status or false on network error
        }

        const config = getGitHubConfig();
        if (config.enabled && config.token && config.owner && config.repo) {
          console.log("[App] Automatic background 10s sync: fetching latest lock status and files from GitHub...");
          
          // Pull lock status
          try {
            const lockRes = await pullLockStatusFromGitHub();
            if (lockRes.success && lockRes.lockStatus) {
              setLockStatus(lockRes.lockStatus);
            }
          } catch (e) {
            console.warn("[App] Background lock status pull failed:", e);
          }

          // Pull general data
          const result = await syncFromServer();
          if (result.success) {
            setRefreshTrigger(prev => prev + 1);
          }
        } else if (isServerConnected) {
          console.log("[App] Automatic background 10s sync: syncing files from server...");
          const result = await syncFromServer();
          if (result.success) {
            setRefreshTrigger(prev => prev + 1);
          }
        }
      } catch (err) {
        console.error("Failed to auto-refresh background data:", err);
      }
    }, 10000);

    return () => clearInterval(interval);
  }, [isEditModeActive, isServerConnected]);

  // Poll lock status every second to keep lock synchronization fluid
  useEffect(() => {
    const interval = setInterval(() => {
      const currentLock = getLockStatus();
      
      // If locked, verify if it has physically expired
      if (currentLock.locked && currentLock.expiresAt) {
        const expiresTime = new Date(currentLock.expiresAt).getTime();
        if (Date.now() > expiresTime) {
          // Expired lock, release it
          const releasedLock: LockStatus = {
            locked: false,
            lockedBy: null,
            lockedAt: null,
            expiresAt: null
          };
          saveLockStatus(releasedLock);
          setLockStatus(releasedLock);
          return;
        }
      }

      // Only update state if lock status values actually changed
      setLockStatus((prev) => {
        if (
          prev.locked === currentLock.locked &&
          prev.lockedBy === currentLock.lockedBy &&
          prev.lockedAt === currentLock.lockedAt &&
          prev.expiresAt === currentLock.expiresAt
        ) {
          return prev; // Keeps reference, prevents re-render!
        }
        return currentLock;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // Active lock session timer countdown
  useEffect(() => {
    if (isEditModeActive) {
      // Start/continue countdown interval
      if (!timerIntervalRef.current) {
        timerIntervalRef.current = setInterval(() => {
          setTimerRemaining((prev) => {
            if (prev <= 1) {
              // Expired due to 10 minutes inactivity
              handleReleaseLock(true); // Forced release due to inactivity
              return 600;
            }
            return prev - 1;
          });
        }, 1000);
      }
    } else {
      // If edit mode turned off, clear timer
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
      setTimerRemaining(600); // reset
    }

    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
    };
  }, [isEditModeActive]);

  // Antonio Batista - SEG_002 - Reinicia o cronômetro de inatividade do usuário para manter a trava de edição ativa.
  const resetInactivityTimer = () => {
    if (isEditModeActive) {
      setTimerRemaining(600);
      
      // Also update the database lock expiration time dynamically in localStorage to prevent server-side timeout!
      const currentLock = getLockStatus();
      if (currentLock.locked && currentLock.lockedBy === currentUser?.username) {
        const updatedLock: LockStatus = {
          ...currentLock,
          expiresAt: new Date(Date.now() + 600000).toISOString() // extend for another 10 mins
        };
        saveLockStatus(updatedLock);
        setLockStatus(updatedLock);
      }
    }
  };

  // Antonio Batista - SEG_002 - Efetua a solicitação da chave de concorrência (lock) para ativar o modo de edição.
  const handleRequestLock = async () => {
    if (!currentUser) return;

    // Check RBAC permissions
    const permissionsData = getRolePermissions();
    const userPerms = permissionsData.roles[currentUser.role]?.permissions;
    if (!userPerms?.tasks.includes('update')) {
      alert('Seu perfil de usuário não possui permissão para ativar o Modo de Edição.');
      return;
    }

    setSaveStatus('saving');
    setIsCheckingLock(true);

    // 1-b: CRITICAL: Check the lock status directly on GitHub BEFORE letting the user enter edit mode!
    console.log("[App] Solicitação de Modo de Edição. Buscando status em tempo real do lock_status.json no GitHub...");
    let latestLock: LockStatus = { locked: false, lockedBy: null, lockedAt: null, expiresAt: null };

    const config = getGitHubConfig();
    if (config.enabled && config.token && config.owner && config.repo) {
      try {
        const pullRes = await pullLockStatusFromGitHub();
        if (pullRes.success && pullRes.lockStatus) {
          latestLock = pullRes.lockStatus;
        } else {
          console.warn("[App] Falha ao verificar lock no GitHub. Usando cache local como plano B:", pullRes.error);
          latestLock = getLockStatus();
        }
      } catch (err) {
        console.error("[App] Erro de rede ao buscar lock no GitHub antes de adquirir:", err);
        latestLock = getLockStatus();
      }
    } else {
      latestLock = getLockStatus();
    }

    // Determine if the lock is actually active or expired
    let isExpired = false;
    if (latestLock.locked && latestLock.expiresAt) {
      const expiresTime = new Date(latestLock.expiresAt).getTime();
      if (Date.now() > expiresTime) {
        isExpired = true;
      }
    }

    // Check if locked by someone else and NOT expired
    if (latestLock.locked && latestLock.lockedBy !== currentUser.username && !isExpired) {
      setLockStatus(latestLock);
      setSaveStatus('idle');
      setIsCheckingLock(false);
      alert(
        `Não foi possível ativar o Modo de Edição!\n\n` +
        `O Board está atualmente bloqueado para edição pelo usuário "${latestLock.lockedBy}" ` +
        `desde ${new Date(latestLock.lockedAt || '').toLocaleTimeString()}.\n\n` +
        `O sistema permanece em Modo de Leitura para garantir a consistência dos dados.`
      );
      return;
    }

    // Acquire lock
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 600000); // 10 minutes from now

    const newLock: LockStatus = {
      locked: true,
      lockedBy: currentUser.username,
      lockedAt: now.toISOString(),
      expiresAt: expiresAt.toISOString()
    };

    try {
      // Save locally first to keep UI responsive
      saveLockStatus(newLock);
      setLockStatus(newLock);

      // Persist to physical file / GitHub
      const res = await saveRawFileAsync('lock_status.json', JSON.stringify(newLock, null, 2));
      if (!res.success) {
        throw new Error(res.error || "Falha ao gravar lock no servidor/GitHub.");
      }
      setSaveStatus('success');
      setTimeout(() => {
        setSaveStatus('idle');
      }, 3000);
    } catch (e: any) {
      console.error("Erro ao ativar o modo de edição:", e);
      setSaveStatus('error');
      alert(`Erro ao ativar modo de edição: ${e.message || e}`);
      
      // Rollback
      const rolledBackLock = { locked: false, lockedBy: null, lockedAt: null, expiresAt: null };
      saveLockStatus(rolledBackLock);
      setLockStatus(rolledBackLock);
      return;
    } finally {
      setIsCheckingLock(false);
    }

    setTimerRemaining(600); // Reset timer to 10:00
  };

  // Antonio Batista - SEG_002 - Libera a trava de edição e salva as alterações pendentes no servidor/GitHub.
  const handleReleaseLock = async (isTimeout: boolean = false) => {
    // Show saving progress indicator
    setSaveStatus('saving');
    
    // Setting expiresAt to null when releasing lock
    const releasedLock: LockStatus = {
      locked: false,
      lockedBy: null,
      lockedAt: null,
      expiresAt: null
    };

    try {
      // First save all board/activity/periods files
      const result = await saveAllFilesToServer();
      if (!result.success) {
        throw new Error(result.error || "Falha ao persistir arquivos.");
      }
      
      // Update locally
      saveLockStatus(releasedLock);
      setLockStatus(releasedLock);

      // Save lock status file physically and wait for it to succeed
      const saveRes = await saveRawFileAsync('lock_status.json', JSON.stringify(releasedLock, null, 2));
      if (!saveRes.success) {
        throw new Error(saveRes.error || "Falha ao gravar lock no servidor/GitHub.");
      }
      
      setSaveStatus('success');
      setTimeout(() => {
        setSaveStatus('idle');
      }, 3000);

      // If there was a non-blocking warning (e.g. GitHub failed but local disk succeeded)
      if (result.error) {
        alert(result.error);
      }
    } catch (e: any) {
      console.error("Erro ao persistir arquivos ao liberar o lock:", e);
      setSaveStatus('error');
      alert(`Erro ao salvar alterações: ${e.message || e}`);
    }

    setTimerRemaining(600);

    if (isTimeout) {
      alert(
        'Seu tempo de edição expirou devido a 10 minutos de inatividade!\n\n' +
        'O Board retornou ao Modo de Leitura para liberar o acesso a outros analistas.'
      );
    }
  };

  // Antonio Batista - SEG_002 - Consulta o status atualizado do bloqueio de edição diretamente no repositório do GitHub.
  const handleCheckLockStatusFromGitHub = async () => {
    if (isCheckingLock) return;
    setIsCheckingLock(true);
    try {
      console.log("[App] Verificando status atual do lock no GitHub a pedido do usuário...");
      const res = await pullLockStatusFromGitHub();
      if (res.success && res.lockStatus) {
        setLockStatus(res.lockStatus);
        
        let isExpired = false;
        if (res.lockStatus.locked && res.lockStatus.expiresAt) {
          if (Date.now() > new Date(res.lockStatus.expiresAt).getTime()) {
            isExpired = true;
          }
        }

        if (!res.lockStatus.locked || isExpired) {
          alert("O Board está liberado! O Modo de Edição agora está disponível.");
        } else {
          alert(`O Board permanece bloqueado pelo usuário "${res.lockStatus.lockedBy}" desde ${new Date(res.lockStatus.lockedAt || '').toLocaleTimeString()}.`);
        }
      } else {
        alert(`Erro ao buscar status de bloqueio no GitHub: ${res.error || 'Erro desconhecido'}`);
      }
    } catch (e: any) {
      alert(`Erro de conexão com o GitHub: ${e.message || e}`);
    } finally {
      setIsCheckingLock(false);
    }
  };

  // Antonio Batista - SEG_002 - Permite que usuários com perfil Admin forcem a liberação da chave de bloqueio de edição.
  const handleBypassRelease = () => {
    if (currentUser?.role !== 'Admin') {
      alert('Apenas administradores podem forçar a liberação do bloqueio.');
      return;
    }

    if (window.confirm('Aviso de Administrador: Deseja forçar a liberação da chave de concorrência? Isso cancelará a edição ativa de qualquer outro analista.')) {
      handleReleaseLock(false);
    }
  };

  // Antonio Batista - SEG_002 - Trata a autenticação bem-sucedida do usuário atualizando a sessão e sincronizando dados.
  const handleLoginSuccess = async (user: User) => {
    setCurrentUser(user);
    sessionStorage.setItem('btb_current_user', JSON.stringify(user));
    // Reset page view
    setActiveMenu('board');

    // Trigger a pull from GitHub on login to ensure any user gets the latest data immediately!
    const config = getGitHubConfig();
    if (config.enabled && config.token && config.owner && config.repo) {
      console.log("[App] User logged in. Pulling latest lock status and data from GitHub...");
      try {
        const lockRes = await pullLockStatusFromGitHub();
        if (lockRes.success && lockRes.lockStatus) {
          setLockStatus(lockRes.lockStatus);
        }
        const gitResult = await pullFromGitHub();
        if (gitResult.success) {
          setRefreshTrigger(prev => prev + 1);
        }
      } catch (e) {
        console.warn("[App] Failed to pull from GitHub on user login:", e);
      }
    }
  };

  // Antonio Batista - SEG_002 - Realiza o encerramento da sessão do usuário e libera eventuais travas ativas.
  const handleLogout = () => {
    // Release lock if logged out user owns it
    if (currentUser && lockStatus.locked && lockStatus.lockedBy === currentUser.username) {
      handleReleaseLock(false);
    }
    setCurrentUser(null);
    sessionStorage.removeItem('btb_current_user');
  };

  // Antonio Batista - SEG_002 - Trata alterações nas configurações globais re-sincronizando os dados do servidor.
  const handleConfigChange = async () => {
    resetInactivityTimer();
    try {
      console.log("[App] Config changed, resyncing from server...");
      const result = await syncFromServer();
      if (result.success) {
        setRefreshTrigger(prev => prev + 1);
        setIsServerConnected(true);
      }
    } catch (e) {
      console.error("Failed to resync after config change:", e);
    }
  };

  // Antonio Batista - SEG_002 - Executa a atualização manual dos dados locais a partir do servidor ou repositório remoto.
  const handleManualRefresh = async () => {
    try {
      console.log("[App] Manual refresh requested by user...");
      const config = getGitHubConfig();
      if (config.enabled && config.token && config.owner && config.repo) {
        console.log("[App] GitHub sync is enabled, pulling data from GitHub...");
        const result = await pullFromGitHub();
        if (result.success) {
          setRefreshTrigger(prev => prev + 1);
          setIsServerConnected(true);
          alert("Sincronização com o GitHub realizada com sucesso! Todos os dados foram atualizados e o cache local do navegador foi limpo.");
          return;
        } else {
          console.warn("[App] GitHub pull failed, falling back to local server sync...", result.error);
          alert(`Aviso: Falha ao sincronizar dados do GitHub: ${result.error}\nTentando obter os dados do servidor local...`);
        }
      }

      const result = await syncFromServer();
      if (result.success) {
        setRefreshTrigger(prev => prev + 1);
        setIsServerConnected(true);
      } else {
        console.warn("[App] Manual refresh sync physical fallback:", result.error);
        setIsServerConnected(false);
        setRefreshTrigger(prev => prev + 1);
      }
    } catch (err: any) {
      console.error("[App] Manual refresh connection error:", err);
      setIsServerConnected(false);
      setRefreshTrigger(prev => prev + 1);
    }
  };

  // Format countdown timer (MM:SS)
  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // If syncing data from server, show a beautiful professional loading view
  if (isSyncing) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-6 text-white text-center font-sans" id="syncing-loader-screen">
        <div className="space-y-4 max-w-md w-full">
          <Doc24Logo height="3.5rem" textColor="white" showText={true} />
          <div className="flex items-center justify-center space-x-3 mt-6">
            <div className="animate-spin rounded-full h-6 w-6 border-2 border-emerald-400 border-t-transparent"></div>
            <p className="text-sm font-medium text-slate-300">
              {isNeonActive ? "Sincronizando com o banco de dados..." : "Sincronizando banco de dados com arquivos físicos..."}
            </p>
          </div>
          <p className="text-xs text-slate-500">
            {isNeonActive 
              ? "Conexão com o banco de dados Neon ativa. Carregando dados persistidos em nuvem." 
              : "Isso garante que toda alteração feita no sistema seja lida e persistida diretamente nos arquivos JSON físicos do repositório (GitHub)."}
          </p>
        </div>
      </div>
    );
  }

  // If sync error occurred, show a recovery screen
  if (syncError) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-6 text-white text-center font-sans" id="sync-error-screen">
        <div className="bg-slate-800 rounded-xl p-6 border border-rose-500 max-w-md w-full space-y-4">
          <AlertCircle className="h-12 w-12 text-rose-500 mx-auto animate-pulse" />
          <h2 className="text-lg font-bold">Erro de Sincronização</h2>
          <p className="text-sm text-slate-300">{syncError}</p>
          <button
            onClick={() => window.location.reload()}
            className="w-full py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-sm font-semibold transition-all cursor-pointer"
          >
            Tentar Sincronizar Novamente
          </button>
        </div>
      </div>
    );
  }

  // If not logged in, render Login page
  if (!currentUser) {
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans" id="app-viewport-root">
      
      {/* 1. PERSISTENT EDITING ALERT BANNER (#F59E0B) */}
      {isEditModeActive && (
        <div
          className="bg-[#F59E0B] text-slate-950 font-semibold px-4 py-2.5 shadow-sm text-sm text-center flex flex-col md:flex-row items-center justify-between gap-2 border-b border-amber-500"
          id="persistent-alert-banner"
          onClick={resetInactivityTimer}
        >
          <div className="flex items-center space-x-2 flex-wrap justify-center">
            <Timer className="h-4 w-4 shrink-0" />
            <span>
              Modo de Edição Ativo. Expira em <strong>{formatTimer(timerRemaining)}</strong> de inatividade.
            </span>
            <span className="text-[10px] bg-amber-900/10 px-2 py-0.5 rounded-full text-slate-950 border border-amber-900/10 hidden sm:inline">
              Clique na tela para redefinir o temporizador
            </span>
          </div>

          <div className="flex items-center space-x-3">
            {saveStatus === 'saving' && (
              <span className="inline-flex items-center space-x-1 px-2 py-0.5 bg-amber-900/10 rounded text-xs font-bold text-slate-900 animate-pulse">
                <RefreshCw className="h-3 w-3 animate-spin text-amber-900" />
                <span>{isNeonActive ? "Sincronizando com o banco de dados..." : `Sincronizando ${lastSavedFile}...`}</span>
              </span>
            )}
            {saveStatus === 'success' && (
              <span className="inline-flex items-center space-x-1 px-2 py-0.5 bg-emerald-100 rounded text-xs font-bold text-emerald-800 border border-emerald-300">
                <Check className="h-3 w-3" />
                <span>{isNeonActive ? "Banco de Dados Sincronizado!" : "JSON Sincronizado!"}</span>
              </span>
            )}
            {saveStatus === 'error' && (
              <span className="inline-flex items-center space-x-1 px-2 py-0.5 bg-red-100 rounded text-xs font-bold text-red-800 border border-red-300 animate-bounce">
                <AlertCircle className="h-3 w-3" />
                <span>{isNeonActive ? "Erro ao Salvar no Banco" : "Erro de Sincronização"}</span>
              </span>
            )}

            <button
              onClick={(e) => {
                e.stopPropagation();
                handleReleaseLock(false);
              }}
              className="bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs py-1 px-3 rounded-lg transition-colors cursor-pointer"
            >
              Encerrar Edição
            </button>
          </div>
        </div>
      )}

      {/* 2. CORPORATE HEADER NAVIGATION (#343180) */}
      <header className="bg-[#343180] text-white shadow-md font-sans" id="corporate-header">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            
            {/* Left Brand Area */}
            <div className="flex items-center space-x-3 cursor-pointer" onClick={() => setActiveMenu('board')} id="brand-logo-area">
              <Doc24Logo height="2.25rem" textColor="white" showText={true} />
              
              <div className="h-6 w-px bg-white/20 hidden sm:block"></div>
              
              <div className="hidden sm:block">
                <span className="text-[10px] font-bold text-slate-300 tracking-widest uppercase block leading-none">
                  TEAM BRASIL
                </span>
                <span className="text-[8px] text-emerald-300 font-bold block mt-0.5 tracking-wider">
                  BOARD DE TI
                </span>
              </div>
            </div>

            {/* Middle Nav Items */}
            <nav className="flex items-center space-x-1" id="nav-navigation-menu">
              <button
                onClick={() => setActiveMenu('board')}
                className={`px-3.5 py-2 rounded-lg text-sm font-semibold transition-all cursor-pointer ${
                  activeMenu === 'board'
                    ? 'bg-white/15 text-white shadow-xs'
                    : 'text-slate-200 hover:bg-white/5 hover:text-white'
                }`}
                id="btn-nav-board"
              >
                Board de Atividades
              </button>

              <button
                onClick={() => setActiveMenu('metrics')}
                className={`px-3.5 py-2 rounded-lg text-sm font-semibold transition-all cursor-pointer ${
                  activeMenu === 'metrics'
                    ? 'bg-white/15 text-white shadow-xs'
                    : 'text-slate-200 hover:bg-white/5 hover:text-white'
                }`}
                id="btn-nav-metrics"
              >
                <span className="flex items-center space-x-1">
                  <BarChart3 className="h-4 w-4" />
                  <span>Métricas</span>
                </span>
              </button>

              <button
                onClick={() => setActiveMenu('planning_refinement')}
                className={`px-3.5 py-2 rounded-lg text-sm font-semibold transition-all cursor-pointer ${
                  activeMenu === 'planning_refinement'
                    ? 'bg-white/15 text-white shadow-xs'
                    : 'text-slate-200 hover:bg-white/5 hover:text-white'
                }`}
                id="btn-nav-planning-refinement"
              >
                <span className="flex items-center space-x-1">
                  <Layers className="h-4 w-4" />
                  <span>Planning/Refaiment</span>
                </span>
              </button>

              <button
                onClick={() => setActiveMenu('datas_avisos')}
                className={`px-3.5 py-2 rounded-lg text-sm font-semibold transition-all cursor-pointer ${
                  activeMenu === 'datas_avisos'
                    ? 'bg-white/15 text-white shadow-xs'
                    : 'text-slate-200 hover:bg-white/5 hover:text-white'
                }`}
                id="btn-nav-datas-avisos"
              >
                <span className="flex items-center space-x-1">
                  <CalendarDays className="h-4 w-4" />
                  <span>Datas e avisos</span>
                </span>
              </button>

              {/* Only show Config menu to Admins */}
              {currentUser.role === 'Admin' && (
                <button
                  onClick={() => setActiveMenu('config')}
                  className={`px-3.5 py-2 rounded-lg text-sm font-semibold transition-all cursor-pointer ${
                    activeMenu === 'config'
                      ? 'bg-white/15 text-white shadow-xs'
                      : 'text-slate-200 hover:bg-white/5 hover:text-white'
                  }`}
                  id="btn-nav-config"
                >
                  <span className="flex items-center space-x-1">
                    <Settings2 className="h-4 w-4" />
                    <span>Configurações</span>
                  </span>
                </button>
              )}
            </nav>

            {/* Right Concurrency Switch and User Profile Area */}
            <div className="flex items-center space-x-4">
              
              {/* CONCURRENCY TOGGLE */}
              <div className="hidden lg:flex items-center space-x-2 border-l border-white/10 pl-4 py-1">
                {isEditModeActive ? (
                  <button
                    onClick={() => handleReleaseLock(false)}
                    className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-inner transition-colors cursor-pointer"
                    title="Seu lock está ativo. Clique para liberar."
                  >
                    <Unlock className="h-3.5 w-3.5" />
                    <span>Modo Edição ON</span>
                  </button>
                ) : isLockedBySomeoneElse ? (
                  <div className="flex items-center space-x-1.5">
                    <div className="px-2 py-1 bg-red-950/40 border border-red-500/30 text-red-300 text-[11px] rounded-lg flex items-center space-x-1">
                      <Lock className="h-3 w-3 shrink-0 text-red-400 animate-pulse" />
                      <span className="truncate max-w-[120px]">Bloqueado por: {lockStatus.lockedBy}</span>
                    </div>
                    {/* Refresh Lock Status from GitHub Button */}
                    <button
                      onClick={handleCheckLockStatusFromGitHub}
                      disabled={isCheckingLock}
                      className="p-1 bg-white/10 hover:bg-white/15 text-slate-200 hover:text-white border border-white/10 rounded-md transition-all cursor-pointer flex items-center justify-center"
                      title="Atualizar status de bloqueio do GitHub"
                      id="btn-refresh-lock-header"
                    >
                      <RefreshCw className={`h-3 w-3 ${isCheckingLock ? 'animate-spin' : ''}`} />
                    </button>
                    {currentUser.role === 'Admin' && (
                      <button
                        onClick={handleBypassRelease}
                        className="p-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 rounded-md text-[10px] font-bold transition-all cursor-pointer"
                        title="Forçar Liberação (Bypass)"
                      >
                        Bypass
                      </button>
                    )}
                  </div>
                ) : (
                  <button
                    onClick={handleRequestLock}
                    disabled={isCheckingLock}
                    className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-white/10 hover:bg-white/15 text-slate-200 hover:text-white text-xs font-bold rounded-lg border border-white/10 transition-colors cursor-pointer"
                    title="Obter controle exclusivo para edição"
                  >
                    <Lock className="h-3.5 w-3.5" />
                    <span>{isCheckingLock ? 'Verificando...' : 'Ativar Edição'}</span>
                  </button>
                )}
              </div>

              {/* User badge + Logout */}
              <div className="flex items-center space-x-2.5">
                <div className="text-right">
                  <span className="text-xs font-bold text-white block truncate max-w-[150px]" title={currentUser.name}>
                    {currentUser.name.split(' ')[0]} {currentUser.name.split(' ').slice(-1)[0]}
                  </span>
                  <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded-full uppercase tracking-wide inline-block ${
                    currentUser.role === 'Admin'
                      ? 'bg-rose-500 text-white'
                      : currentUser.role === 'Analista'
                      ? 'bg-amber-500 text-slate-950'
                      : 'bg-slate-400 text-white'
                  }`}>
                    {currentUser.role}
                  </span>
                </div>
                
                <button
                  onClick={handleLogout}
                  className="p-2 bg-white/5 hover:bg-white/10 rounded-lg text-slate-200 hover:text-white transition-colors cursor-pointer"
                  title="Sair da aplicação"
                  id="btn-logout"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </div>

            </div>

          </div>
        </div>
      </header>

      {/* 3. MOBILE SAFETY LOCK STATUS BAR (Visible only on smaller viewports) */}
      <div className="lg:hidden bg-slate-100 border-b border-slate-200 px-4 py-2 flex items-center justify-between text-xs">
        <div className="flex items-center space-x-1.5">
          <span className="font-semibold text-slate-600">Status do Board:</span>
          {isEditModeActive ? (
            <span className="bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded font-bold">Edição Permitida</span>
          ) : isLockedBySomeoneElse ? (
            <div className="flex items-center space-x-1">
              <span className="bg-red-100 text-red-800 px-2 py-0.5 rounded font-bold flex items-center space-x-0.5">
                <Lock className="h-3 w-3 inline" />
                <span>Bloqueado por {lockStatus.lockedBy?.split(' ')[0]}</span>
              </span>
              <button
                onClick={handleCheckLockStatusFromGitHub}
                disabled={isCheckingLock}
                className="p-1 text-slate-600 bg-white border border-slate-200 rounded"
                title="Atualizar status do GitHub"
              >
                <RefreshCw className={`h-3 w-3 ${isCheckingLock ? 'animate-spin' : ''}`} />
              </button>
            </div>
          ) : (
            <span className="bg-slate-200 text-slate-700 px-2 py-0.5 rounded">Leitura Dinâmica</span>
          )}
        </div>

        {/* Request/Release action for mobile */}
        {!isEditModeActive && !isLockedBySomeoneElse && (
          <button
            onClick={handleRequestLock}
            disabled={isCheckingLock}
            className="text-[#343180] font-bold hover:underline"
          >
            {isCheckingLock ? 'Verificando...' : 'Ativar Edição'}
          </button>
        )}
        {isEditModeActive && (
          <button
            onClick={() => handleReleaseLock(false)}
            className="text-red-600 font-bold hover:underline"
          >
            Sair da Edição
          </button>
        )}
      </div>

      {/* 4. MAIN CONTENT WRAPPER */}
      {/*<main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8" onClick={resetInactivityTimer}>*/}
      <main className="flex-1 mx-auto w-full px-4 sm:px-6 lg:px-8 py-8" onClick={resetInactivityTimer}>  
        {/* Dynamic Navigation router rendering */}
        {activeMenu === 'board' && (
          <Board
            currentUser={currentUser}
            isEditModeActive={isEditModeActive}
            onAtividadesChange={resetInactivityTimer}
            onActivityEditTrigger={resetInactivityTimer}
            refreshTrigger={refreshTrigger}
            onManualRefresh={handleManualRefresh}
            lockStatus={lockStatus}
            onCheckLockStatus={handleCheckLockStatusFromGitHub}
          />
        )}

        {activeMenu === 'metrics' && <Metrics refreshTrigger={refreshTrigger} currentUser={currentUser} />}

        {activeMenu === 'planning_refinement' && (
          <PlanningRefinement
            currentUser={currentUser}
            isEditModeActive={isEditModeActive}
            refreshTrigger={refreshTrigger}
            onDataChange={resetInactivityTimer}
          />
        )}

        {activeMenu === 'datas_avisos' && (
          <DatasAvisos
            currentUser={currentUser}
            isEditModeActive={isEditModeActive}
            refreshTrigger={refreshTrigger}
            onDataChange={resetInactivityTimer}
          />
        )}

        {activeMenu === 'config' && (
          <AdminConfig
            currentUser={currentUser}
            onConfigChange={handleConfigChange}
          />
        )}

      </main>

      {/* Global PocketKnife Widget (Active across all tabs and persistent timer background execution) */}
      <PocketKnifeWidget
        currentUser={currentUser}
        userPermissions={getRolePermissions().roles[currentUser.role]?.permissions}
        onRefreshBoard={() => setRefreshTrigger(prev => prev + 1)}
      />

        {/* Navigation Router components render here */}

      {/* Footer Status Bar (Professional Polish) */}
      <footer className="bg-white border-t border-slate-200 px-6 py-3 flex flex-col sm:flex-row items-center justify-between shrink-0 gap-2 font-sans" id="app-footer-statusbar">
        <div className="flex flex-wrap items-center gap-4 text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
          <span>ARQUIVO: btb_atividades.json</span>
          <span className="flex items-center space-x-1">
            <span>CONCORRÊNCIA:</span>
            {isEditModeActive ? (
              <span className="text-emerald-600 font-extrabold bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">EXCLUSIVA (VOCÊ)</span>
            ) : lockStatus.locked ? (
              <span className="text-red-600 font-extrabold bg-red-50 px-1.5 py-0.5 rounded border border-red-200">ATIVO ({lockStatus.lockedBy?.toUpperCase()})</span>
            ) : (
              <span className="text-slate-500 font-bold bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">COMPARTILHADO (LEITURA)</span>
            )}
          </span>
          {isNeonActive ? (
            <span className="flex items-center gap-1 text-emerald-600 font-bold" title="Conexão com o banco de dados Neon ativa. Dados persistidos com segurança no PostgreSQL.">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>NEON DB ATIVO</span>
            </span>
          ) : isServerConnected ? (
            <span className="flex items-center gap-1" title="Sincronizado diretamente com arquivos JSON físicos no servidor">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>SYNC ESTÁVEL</span>
            </span>
          ) : (
            <span className="flex items-center gap-1" title="Sincronização em nuvem inativa no Vercel. Operando em cache local de segurança (LocalStorage)">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
              <span>LOCAL (VERCEL)</span>
            </span>
          )}
        </div>
        <div className="text-[10px] font-bold text-slate-400">
          ANTONIO BATISTA - 2026
        </div>
      </footer>

    </div>
  );
}
