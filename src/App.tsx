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
  ServerCrash
} from 'lucide-react';
import { User, LockStatus } from './types';
import {
  initializeDataStore,
  getLockStatus,
  saveLockStatus,
  getRolePermissions
} from './lib/dataStore';
import Login from './components/Login';
import Board from './components/Board';
import Metrics from './components/Metrics';
import AdminConfig from './components/AdminConfig';
import Doc24Logo from './components/Doc24Logo';

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [activeMenu, setActiveMenu] = useState<'board' | 'metrics' | 'config'>('board');
  const [lockStatus, setLockStatus] = useState<LockStatus>({
    locked: false,
    lockedBy: null,
    lockedAt: null,
    expiresAt: null
  });

  // Remaining time for current edit lock in seconds (10 minutes = 600s)
  const [timerRemaining, setTimerRemaining] = useState<number>(600);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Simulation settings (to test lock conflict easily in one screen)
  const [simulateOtherUserLock, setSimulateOtherUserLock] = useState<boolean>(false);

  // Initialize store when App mounts
  useEffect(() => {
    initializeDataStore();
    
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

  // Poll lock status every second to keep lock synchronization fluid
  useEffect(() => {
    const interval = setInterval(() => {
      if (simulateOtherUserLock) {
        // Mock a lock by an external user
        setLockStatus({
          locked: true,
          lockedBy: 'Antônio Gonçalves Almeida Batista',
          lockedAt: new Date(Date.now() - 120000).toISOString(), // 2 minutes ago
          expiresAt: new Date(Date.now() + 480000).toISOString() // 8 minutes remaining
        });
      } else {
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
          } else {
            setLockStatus(currentLock);
          }
        } else {
          setLockStatus(currentLock);
        }
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [simulateOtherUserLock]);

  // Is edit mode currently active for the LOGGED IN user?
  const isEditModeActive =
    currentUser !== null &&
    lockStatus.locked === true &&
    lockStatus.lockedBy === currentUser.username;

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

  // Reset lock inactivity timer back to 10 minutes on user action
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

  // Turn on/request Edit Lock
  const handleRequestLock = () => {
    if (!currentUser) return;

    // Check RBAC permissions
    const permissionsData = getRolePermissions();
    const userPerms = permissionsData.roles[currentUser.role]?.permissions;
    if (!userPerms?.tasks.includes('update')) {
      alert('Seu perfil de usuário não possui permissão para ativar o Modo de Edição.');
      return;
    }

    const currentLock = getLockStatus();
    
    // Check if locked by someone else
    if (currentLock.locked && currentLock.lockedBy !== currentUser.username) {
      alert(
        `Não foi possível ativar o Modo de Edição!\n\n` +
        `O Board está atualmente bloqueado para edição pelo usuário "${currentLock.lockedBy}" ` +
        `desde ${new Date(currentLock.lockedAt || '').toLocaleTimeString()}.\n\n` +
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

    saveLockStatus(newLock);
    setLockStatus(newLock);
    setTimerRemaining(600); // Reset timer to 10:00
  };

  // Release Edit Lock
  const handleReleaseLock = (isTimeout: boolean = false) => {
    const releasedLock: LockStatus = {
      locked: false,
      lockedBy: null,
      lockedAt: null,
      expiresAt: null
    };

    saveLockStatus(releasedLock);
    setLockStatus(releasedLock);
    setTimerRemaining(600);

    if (isTimeout) {
      alert(
        'Seu tempo de edição expirou devido a 10 minutos de inatividade!\n\n' +
        'O Board retornou ao Modo de Leitura para liberar o acesso a outros analistas.'
      );
    }
  };

  // Bypass/force release (for Admins)
  const handleBypassRelease = () => {
    if (currentUser?.role !== 'Admin') {
      alert('Apenas administradores podem forçar a liberação do bloqueio.');
      return;
    }

    if (window.confirm('Aviso de Administrador: Deseja forçar a liberação da chave de concorrência? Isso cancelará a edição ativa de qualquer outro analista.')) {
      handleReleaseLock(false);
      setSimulateOtherUserLock(false); // turn off simulator too
    }
  };

  // Log in Success Handler
  const handleLoginSuccess = (user: User) => {
    setCurrentUser(user);
    sessionStorage.setItem('btb_current_user', JSON.stringify(user));
    // Reset page view
    setActiveMenu('board');
  };

  // Log out Handler
  const handleLogout = () => {
    // Release lock if logged out user owns it
    if (currentUser && lockStatus.locked && lockStatus.lockedBy === currentUser.username) {
      handleReleaseLock(false);
    }
    setCurrentUser(null);
    sessionStorage.removeItem('btb_current_user');
  };

  // Format countdown timer (MM:SS)
  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // If not logged in, render Login page
  if (!currentUser) {
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans" id="app-viewport-root">
      
      {/* 1. PERSISTENT EDITING ALERT BANNER (#F59E0B) */}
      {isEditModeActive && (
        <div
          className="bg-[#F59E0B] text-slate-950 font-semibold px-4 py-2.5 shadow-sm text-sm text-center flex items-center justify-center space-x-2 border-b border-amber-500 animate-pulse-slow"
          id="persistent-alert-banner"
          onClick={resetInactivityTimer}
        >
          <Timer className="h-4 w-4 shrink-0" />
          <span>
            Modo de Edição Ativo. Expira em <strong>{formatTimer(timerRemaining)}</strong> de inatividade.
          </span>
          <span className="text-xs bg-amber-900/10 px-2 py-0.5 rounded-full text-slate-900 border border-amber-900/10">
            Clique na tela para redefinir o temporizador
          </span>
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleReleaseLock(false);
            }}
            className="ml-4 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs py-1 px-3 rounded-lg transition-colors cursor-pointer"
          >
            Encerrar Edição
          </button>
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
                ) : lockStatus.locked ? (
                  <div className="flex items-center space-x-1.5">
                    <div className="px-2 py-1 bg-red-950/40 border border-red-500/30 text-red-300 text-[11px] rounded-lg flex items-center space-x-1">
                      <Lock className="h-3 w-3 shrink-0 text-red-400 animate-pulse" />
                      <span className="truncate max-w-[120px]">Bloqueado por: {lockStatus.lockedBy}</span>
                    </div>
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
                    className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-white/10 hover:bg-white/15 text-slate-200 hover:text-white text-xs font-bold rounded-lg border border-white/10 transition-colors cursor-pointer"
                    title="Obter controle exclusivo para edição"
                  >
                    <Lock className="h-3.5 w-3.5" />
                    <span>Ativar Edição</span>
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
          ) : lockStatus.locked ? (
            <span className="bg-red-100 text-red-800 px-2 py-0.5 rounded font-bold flex items-center space-x-0.5">
              <Lock className="h-3 w-3 inline" />
              <span>Bloqueado por {lockStatus.lockedBy?.split(' ')[0]}</span>
            </span>
          ) : (
            <span className="bg-slate-200 text-slate-700 px-2 py-0.5 rounded">Leitura Dinâmica</span>
          )}
        </div>

        {/* Request/Release action for mobile */}
        {!isEditModeActive && !lockStatus.locked && (
          <button
            onClick={handleRequestLock}
            className="text-[#343180] font-bold hover:underline"
          >
            Ativar Edição
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
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8" onClick={resetInactivityTimer}>
        
        {/* Dynamic Navigation router rendering */}
        {activeMenu === 'board' && (
          <Board
            currentUser={currentUser}
            isEditModeActive={isEditModeActive}
            onAtividadesChange={resetInactivityTimer}
            onActivityEditTrigger={resetInactivityTimer}
          />
        )}

        {activeMenu === 'metrics' && <Metrics />}

        {activeMenu === 'config' && (
          <AdminConfig
            currentUser={currentUser}
            onConfigChange={resetInactivityTimer}
          />
        )}

      </main>

      {/* 5. FLOATING PROTOTYPE/TEST CONTROLS (Simulate other users to test locks seamlessly!) */}
      <div className="fixed bottom-4 right-4 bg-slate-900 border border-slate-800 text-white p-4 rounded-xl shadow-xl z-40 max-w-xs font-mono text-xs hidden sm:block">
        <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-2">
          <span className="font-bold flex items-center text-emerald-400">
            <Zap className="h-3.5 w-3.5 mr-1" /> Painel de Prototipagem
          </span>
          <span className="text-[9px] bg-slate-800 text-slate-400 px-1 py-0.2 rounded">Simulação</span>
        </div>

        <p className="text-[10px] text-slate-400 mb-3 leading-relaxed">
          Para testar o controle de concorrência e o bloqueio de 10 min de inatividade sem abrir outra aba:
        </p>

        <div className="space-y-2.5">
          {/* Toggle Simulated Lock */}
          <label className="flex items-center space-x-2 cursor-pointer">
            <input
              type="checkbox"
              checked={simulateOtherUserLock}
              onChange={(e) => {
                setSimulateOtherUserLock(e.target.checked);
                if (e.target.checked) {
                  // If we simulate another lock, release current user's local lock if they have it
                  if (isEditModeActive) {
                    handleReleaseLock(false);
                  }
                }
              }}
              className="h-3.5 w-3.5 text-[#343180] border-slate-700 bg-slate-800 rounded cursor-pointer"
            />
            <span className="text-slate-300">Simular que outro analista bloqueou o board</span>
          </label>

          {/* Quick status information */}
          <div className="bg-slate-950 p-2 rounded border border-slate-800 text-[10px] space-y-1">
            <div>
              <strong>Usuário Logado:</strong> {currentUser.username} ({currentUser.role})
            </div>
            <div>
              <strong>Proprietário do Lock:</strong> {lockStatus.locked ? lockStatus.lockedBy?.split(' ')[0] : 'Ninguém'}
            </div>
            <div>
              <strong>Modo de Edição Local:</strong>{' '}
              <span className={isEditModeActive ? 'text-emerald-400 font-bold' : 'text-slate-400'}>
                {isEditModeActive ? 'ATIVO' : 'DESATIVADO'}
              </span>
            </div>
          </div>
        </div>
      </div>

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
          <span className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>SYNC ESTÁVEL</span>
          </span>
        </div>
        <div className="text-[10px] font-bold text-slate-400">
          TEAM BRASIL CORPORATE SOLUTIONS &copy; 2026
        </div>
      </footer>

    </div>
  );
}
