import React, { useState } from 'react';
import { Shield, Key, User as UserIcon } from 'lucide-react';
import { User } from '../types';
import { getUsers, getVersionamento, hashPassword, syncFromServer, loginWithDatabase } from '../lib/dataStore';
import Doc24Logo from './Doc24Logo';

interface LoginProps {
  onLoginSuccess: (user: User) => void;
}

// Antonio Batista - SEG_002 - Componente de autenticação e formulário de login de acesso ao sistema Doc24 Board.
export default function Login({ onLoginSuccess }: LoginProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [connectionMode, setConnectionMode] = useState<'database' | 'json'>(() => {
    return (localStorage.getItem('btb_connection_mode') as 'database' | 'json') || 'database';
  });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const versionInfo = getVersionamento();

  // Antonio Batista - SEG_002 - Valida as credenciais digitadas pelo usuário e efetua o login no sistema.
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!username.trim() || !password.trim()) {
      setError('Por favor, preencha todos os campos.');
      return;
    }

    setLoading(true);
    
    // Save connection mode first so getUsers() and syncFromServer() use the correct mode
    localStorage.setItem('btb_connection_mode', connectionMode);

    try {
      if (connectionMode === 'database') {
        console.log("[Login] Modo Banco de Dados ativo. Validando credenciais via API segura Neon...");
        const authRes = await loginWithDatabase(username.trim(), password.trim());
        
        if (authRes.success && authRes.user) {
          console.log("[Login] Autenticação Neon bem-sucedida para:", authRes.user.username);
          onLoginSuccess(authRes.user);
          return;
        } else {
          console.warn("[Login] Falha na autenticação Neon:", authRes.error);
          setError(authRes.error || 'Usuário ou senha incorretos no Banco de Dados Neon.');
          setLoading(false);
          return;
        }
      } else {
        // Modo JSON (Local/GitHub)
        const users = getUsers();
        console.log(`[Login] Validando usuário "${username}" contra ${users.length} usuários carregados (Modo JSON).`);
        
        const typedPassword = password.trim();
        const hashedPassword = hashPassword(typedPassword);

        const foundUser = users.find(
          u => u.username.toLowerCase() === username.trim().toLowerCase() && 
               (u.password === typedPassword || u.password === hashedPassword)
        );

        if (foundUser) {
          console.log("[Login] Autenticação JSON bem-sucedida para:", foundUser.username);
          const { password: _, ...userWithoutPassword } = foundUser;
          onLoginSuccess(userWithoutPassword);
        } else {
          console.warn("[Login] Falha na autenticação JSON: Usuário ou senha inválidos.");
          setError('Usuário ou senha incorretos. Tente novamente.');
        }
      }
    } catch (err: any) {
      console.error("[Login] Erro durante o processo de login:", err);
      setError(`Erro ao realizar login: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Antonio Batista - SEG_002 - Executa o login rápido pré-definido para perfis de testes/demonstração.
  const handleQuickLogin = (userRole: 'admin' | 'analista' | 'convidado') => {
    // Logic kept but UI is disabled per user request
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-sans" id="login-screen-root">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <Doc24Logo height="4rem" textColor="primary" showText={true} className="drop-shadow-sm" />
        </div>
        <h2 className="mt-6 text-center text-xl font-bold font-display tracking-tight text-slate-800">
          Board de TI - Team Brasil
        </h2>
        <p className="mt-2 text-center text-sm text-slate-500">
          Substituição ágil de planilhas de atividades corporativas
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow-sm border border-slate-200/80 rounded-xl sm:px-10">
          {error && (
            <div className="mb-4 bg-red-50 border-l-4 border-red-500 p-4 text-sm text-red-700 rounded-r-md">
              <div className="flex">
                <span>{error}</span>
              </div>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-6">
            <fieldset disabled={loading} className="space-y-6">
              <div>
                <label htmlFor="username" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Usuário
                </label>
                <div className="mt-1 relative rounded-md shadow-xs">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <UserIcon className="h-4 w-4" />
                  </div>
                  <input
                    id="username"
                    name="username"
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="block w-full pl-10 pr-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#343180] focus:border-[#343180] text-sm text-slate-900 bg-slate-50/50"
                    placeholder="Nome de usuário"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="password" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Senha
                </label>
                <div className="mt-1 relative rounded-md shadow-xs">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Key className="h-4 w-4" />
                  </div>
                  <input
                    id="password"
                    name="password"
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="block w-full pl-10 pr-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#343180] focus:border-[#343180] text-sm text-slate-900 bg-slate-50/50"
                    placeholder="••••••••"
                  />
                </div>
              </div>

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-2">
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Modo de Conexão de Dados
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <label className={`flex items-center space-x-2 p-2.5 rounded-lg border text-xs font-medium cursor-pointer transition-all ${connectionMode === 'database' ? 'bg-[#343180]/10 border-[#343180] text-[#343180]' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'}`}>
                    <input
                      type="radio"
                      name="connectionMode"
                      value="database"
                      checked={connectionMode === 'database'}
                      onChange={() => setConnectionMode('database')}
                      className="text-[#343180] focus:ring-[#343180]"
                    />
                    <span>Banco de Dados (Neon) <span className="block text-[10px] font-normal opacity-75">Padrão / Principal</span></span>
                  </label>
                  <label className={`flex items-center space-x-2 p-2.5 rounded-lg border text-xs font-medium cursor-pointer transition-all ${connectionMode === 'json' ? 'bg-[#343180]/10 border-[#343180] text-[#343180]' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'}`}>
                    <input
                      type="radio"
                      name="connectionMode"
                      value="json"
                      checked={connectionMode === 'json'}
                      onChange={() => setConnectionMode('json')}
                      className="text-[#343180] focus:ring-[#343180]"
                    />
                    <span>Modo JSON (GitHub) <span className="block text-[10px] font-normal opacity-75">Backup / Contingência</span></span>
                  </label>
                </div>
              </div>

              <div>
                <button
                  type="submit"
                  disabled={loading}
                  className={`w-full flex justify-center items-center py-2.5 px-4 border border-transparent rounded-lg text-sm font-semibold text-white bg-[#343180] hover:bg-[#2c2a6d] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#343180] transition-colors ${loading ? 'opacity-70 cursor-not-allowed' : 'cursor-pointer'}`}
                  id="btn-login-submit"
                >
                  {loading ? (
                    <>
                      <Shield className="animate-spin h-4 w-4 mr-2" />
                      Validando Acesso...
                    </>
                  ) : (
                    'Entrar no Board'
                  )}
                </button>
                
                <div 
                  className="mt-4 text-center text-[10px] text-slate-400 font-mono tracking-wide cursor-help hover:text-slate-600 transition-colors"
                  id="login-version-display"
                  title={`Resumo do Deploy: ${versionInfo.description}`}
                >
                  Versão: <span className="font-semibold text-slate-500">{versionInfo.version}</span> • {versionInfo.date}
                </div>
              </div>
            </fieldset>
          </form>

          {/* Removed quick/demonstration login buttons per user request */}
        </div>
      </div>
    </div>
  );
}
