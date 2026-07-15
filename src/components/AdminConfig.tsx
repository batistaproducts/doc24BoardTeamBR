import React, { useState, useEffect } from 'react';
import {
  Settings,
  Database,
  Calendar,
  Save,
  CheckCircle,
  AlertCircle,
  FileCode,
  ArrowRight,
  Info
} from 'lucide-react';
import { Period, User } from '../types';
import {
  getPeriods,
  getRawFile,
  saveRawFile,
  duplicatePeriod
} from '../lib/dataStore';

interface AdminConfigProps {
  currentUser: User;
  onConfigChange: () => void;
}

export default function AdminConfig({ currentUser, onConfigChange }: AdminConfigProps) {
  // Check authorization
  if (currentUser.role !== 'Admin') {
    return (
      <div className="bg-red-50 border-l-4 border-red-500 p-6 rounded-lg text-sm text-red-700 font-sans" id="admin-forbidden-view">
        <div className="flex items-start space-x-3">
          <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
          <div>
            <h3 className="font-bold text-base text-red-900">Acesso Restrito ao Administrador</h3>
            <p className="mt-1 leading-relaxed">
              Desculpe, seu perfil atual (<strong>{currentUser.role}</strong>) não tem permissão para acessar esta área.
              Se você precisa fazer alterações, entre em contato com o gestor do "Board de TI - Team Brasil" ou faça login como <strong>Admin</strong>.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Active sub-tab
  const [activeTab, setActiveTab] = useState<'periods' | 'json'>('periods');

  // JSON Editing State
  const [availableFiles, setAvailableFiles] = useState<string[]>([]);
  const [selectedFile, setSelectedFile] = useState<string>('');
  const [rawJsonContent, setRawJsonContent] = useState<string>('');
  const [jsonSaveStatus, setJsonSaveStatus] = useState<{ type: 'success' | 'error' | null; message: string }>({ type: null, message: '' });

  // Period Duplication State
  const [periods, setPeriods] = useState<Period[]>([]);
  const [sourcePeriodId, setSourcePeriodId] = useState<string>('');
  const [newPeriodId, setNewPeriodId] = useState<string>(''); // e.g. "082026"
  const [newPeriodLabel, setNewPeriodLabel] = useState<string>(''); // e.g. "08/2026"
  const [inheritUnfinished, setInheritUnfinished] = useState<boolean>(true);
  const [periodStatus, setPeriodStatus] = useState<{ type: 'success' | 'error' | null; message: string }>({ type: null, message: '' });

  // Load available periods and files
  const loadPeriodsAndFiles = () => {
    const loadedPeriods = getPeriods();
    setPeriods(loadedPeriods);
    if (loadedPeriods.length > 0) {
      setSourcePeriodId(loadedPeriods[0].id);
    }

    const files = [
      'usuarios.json',
      'roles_permissions.json',
      'lock_status.json',
      'periods.json',
      ...loadedPeriods.map(p => `atividades_${p.id}.json`)
    ];
    setAvailableFiles(files);
    if (files.length > 0 && !selectedFile) {
      setSelectedFile(files[0]);
    }
  };

  useEffect(() => {
    loadPeriodsAndFiles();
  }, []);

  // Load selected JSON file content
  useEffect(() => {
    if (selectedFile) {
      const content = getRawFile(selectedFile);
      setRawJsonContent(content);
      setJsonSaveStatus({ type: null, message: '' });
    }
  }, [selectedFile]);

  // Handle JSON Saving
  const handleSaveJson = () => {
    setJsonSaveStatus({ type: null, message: '' });
    
    // Attempt parse to validate
    try {
      JSON.parse(rawJsonContent);
    } catch (e: any) {
      setJsonSaveStatus({
        type: 'error',
        message: `Formato JSON inválido! Detalhes: ${e.message}`
      });
      return;
    }

    const success = saveRawFile(selectedFile, rawJsonContent);
    if (success) {
      setJsonSaveStatus({
        type: 'success',
        message: `Arquivo ${selectedFile} salvo com sucesso no banco simulado!`
      });
      onConfigChange(); // Notify parent of changes
      loadPeriodsAndFiles(); // Reload if periods file was updated
    } else {
      setJsonSaveStatus({
        type: 'error',
        message: `Falha ao salvar o arquivo ${selectedFile}.`
      });
    }
  };

  // Handle Period Duplication
  const handleCreatePeriod = (e: React.FormEvent) => {
    e.preventDefault();
    setPeriodStatus({ type: null, message: '' });

    // Validations
    if (!newPeriodId.trim() || !newPeriodLabel.trim()) {
      setPeriodStatus({ type: 'error', message: 'Preencha todos os campos do novo período.' });
      return;
    }

    if (!/^\d{6}$/.test(newPeriodId)) {
      setPeriodStatus({ type: 'error', message: 'O ID do período deve ser exatamente 6 dígitos no padrão MMYYYY (ex: 082026).' });
      return;
    }

    if (!/^\d{2}\/\d{4}$/.test(newPeriodLabel)) {
      setPeriodStatus({ type: 'error', message: 'O rótulo do período deve estar no formato MM/YYYY (ex: 08/2026).' });
      return;
    }

    const result = duplicatePeriod(sourcePeriodId, newPeriodId, newPeriodLabel, inheritUnfinished);

    if (result.success) {
      setPeriodStatus({
        type: 'success',
        message: `Período ${newPeriodLabel} criado com sucesso a partir de ${sourcePeriodId}! ${inheritUnfinished ? 'Tarefas não concluídas foram migradas.' : ''}`
      });
      onConfigChange(); // Notify parent
      loadPeriodsAndFiles(); // Reload
      // Reset inputs
      setNewPeriodId('');
      setNewPeriodLabel('');
    } else {
      setPeriodStatus({
        type: 'error',
        message: result.error || 'Erro ao duplicar o período.'
      });
    }
  };

  // Helper to auto-complete the label when user types ID
  const handlePeriodIdChange = (idVal: string) => {
    const cleaned = idVal.replace(/\D/g, '').substring(0, 6);
    setNewPeriodId(cleaned);
    
    if (cleaned.length === 6) {
      const month = cleaned.substring(0, 2);
      const year = cleaned.substring(2);
      setNewPeriodLabel(`${month}/${year}`);
    }
  };

  return (
    <div className="space-y-6 font-sans animate-fade-in" id="admin-config-root">
      
      {/* Title block */}
      <div className="bg-white border border-slate-200/80 rounded-xl p-5 shadow-xs">
        <h2 className="text-lg font-bold text-slate-900 font-display flex items-center space-x-2">
          <Settings className="h-5 w-5 text-[#343180]" />
          <span>Configurações do Sistema (Exclusivo Admin)</span>
        </h2>
        <p className="text-xs text-slate-500 mt-0.5">Mapeamento de permissões dinâmicas, duplicação e edição direta de arquivos parametrizados</p>
      </div>

      {/* Sub-tab selection */}
      <div className="flex border-b border-slate-200">
        <button
          onClick={() => setActiveTab('periods')}
          className={`pb-3 px-6 text-sm font-semibold transition-all cursor-pointer ${
            activeTab === 'periods'
              ? 'border-b-2 border-[#343180] text-[#343180]'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <div className="flex items-center space-x-2">
            <Calendar className="h-4 w-4" />
            <span>Gerenciar Períodos</span>
          </div>
        </button>

        <button
          onClick={() => setActiveTab('json')}
          className={`pb-3 px-6 text-sm font-semibold transition-all cursor-pointer ${
            activeTab === 'json'
              ? 'border-b-2 border-[#343180] text-[#343180]'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <div className="flex items-center space-x-2">
            <Database className="h-4 w-4" />
            <span>Editar Arquivos JSON</span>
          </div>
        </button>
      </div>

      {/* View A: Period Management */}
      {activeTab === 'periods' && (
        <div className="bg-white border border-slate-200/80 rounded-xl p-6 shadow-xs space-y-6">
          <div className="border-b border-slate-100 pb-3">
            <h3 className="text-sm font-bold text-slate-800">Criação de Novo Período Mensal</h3>
            <p className="text-xs text-slate-400 mt-0.5">Utilize este assistente para encerrar o mês corrente e abrir o período de trabalho seguinte herdando as configurações.</p>
          </div>

          {periodStatus.type && (
            <div className={`p-4 rounded-lg flex items-start space-x-3 text-sm ${
              periodStatus.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-100' : 'bg-red-50 text-red-800 border border-red-100'
            }`}>
              {periodStatus.type === 'success' ? <CheckCircle className="h-5 w-5 shrink-0" /> : <AlertCircle className="h-5 w-5 shrink-0" />}
              <span>{periodStatus.message}</span>
            </div>
          )}

          <form onSubmit={handleCreatePeriod} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Source selection */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                  Período de Origem (Para Cópia/Herança)
                </label>
                <select
                  value={sourcePeriodId}
                  onChange={(e) => setSourcePeriodId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#343180]"
                >
                  {periods.map(p => (
                    <option key={p.id} value={p.id}>Copiar dados de: {p.label}</option>
                  ))}
                </select>
                <span className="text-[10px] text-slate-400 block mt-1">Status e dados gerais deste período serão usados como base.</span>
              </div>

              {/* Arrow Indicator on Desktop */}
              <div className="hidden md:flex items-center justify-center p-4">
                <div className="h-10 w-10 bg-slate-50 border border-slate-200 rounded-full flex items-center justify-center text-[#343180]">
                  <ArrowRight className="h-5 w-5" />
                </div>
              </div>

              {/* ID of the new period */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                  Novo ID do Período (MMYYYY)
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: 082026"
                  maxLength={6}
                  value={newPeriodId}
                  onChange={(e) => handlePeriodIdChange(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#343180]"
                />
                <span className="text-[10px] text-slate-400 block mt-1">Apenas dígitos no padrão MMYYYY. Ex: agosto de 2026 deve ser 082026.</span>
              </div>

              {/* Label of the new period */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                  Rótulo do Período (Visualizado nas Abas)
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: 08/2026"
                  value={newPeriodLabel}
                  onChange={(e) => setNewPeriodLabel(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#343180]"
                />
                <span className="text-[10px] text-slate-400 block mt-1">Formato visual das abas. Ex: 08/2026. Auto-completa ao preencher o ID.</span>
              </div>

            </div>

            {/* Checkbox: Inherit Unfinished Tasks */}
            <div className="bg-slate-50 border border-slate-200/60 rounded-xl p-4 flex items-start space-x-3">
              <input
                id="inherit"
                type="checkbox"
                checked={inheritUnfinished}
                onChange={(e) => setInheritUnfinished(e.target.checked)}
                className="h-4.5 w-4.5 text-[#343180] border-slate-300 rounded-md focus:ring-[#343180] mt-0.5 cursor-pointer"
              />
              <div className="text-sm">
                <label htmlFor="inherit" className="font-bold text-slate-800 cursor-pointer">
                  Herdar Atividades Não Finalizadas
                </label>
                <p className="text-xs text-slate-500 mt-1">
                  Se ativado, todas as atividades do período de origem que não possuem status <strong>"Finalizada"</strong> ou <strong>"Concluída"</strong> serão criadas automaticamente no novo período como tarefas de continuação.
                </p>
              </div>
            </div>

            {/* Submit */}
            <div className="flex justify-end pt-4 border-t border-slate-100">
              <button
                type="submit"
                className="px-6 py-2.5 bg-[#343180] hover:bg-[#2c2a6d] text-white rounded-lg text-sm font-semibold shadow-xs hover:shadow-md transition-all cursor-pointer"
                id="btn-confirm-duplicate-period"
              >
                Duplicar e Criar Novo Período
              </button>
            </div>
          </form>
        </div>
      )}

      {/* View B: Raw JSON Files Editor */}
      {activeTab === 'json' && (
        <div className="bg-white border border-slate-200/80 rounded-xl p-6 shadow-xs space-y-4">
          <div className="border-b border-slate-100 pb-3 flex items-center justify-between flex-wrap gap-2">
            <div>
              <h3 className="text-sm font-bold text-slate-800">Editor Cru de Arquivos JSON de Parametrização</h3>
              <p className="text-xs text-slate-400 mt-0.5">Edite diretamente os dados do banco de dados em formato JSON para depurações.</p>
            </div>

            {/* Select File */}
            <div className="flex items-center space-x-2">
              <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider shrink-0">Arquivo:</label>
              <select
                value={selectedFile}
                onChange={(e) => setSelectedFile(e.target.value)}
                className="px-3 py-1.5 border border-slate-300 rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#343180] bg-slate-50 font-mono"
              >
                {availableFiles.map(file => (
                  <option key={file} value={file}>{file}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Feedback messages */}
          {jsonSaveStatus.type && (
            <div className={`p-4 rounded-lg flex items-start space-x-3 text-sm ${
              jsonSaveStatus.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-100' : 'bg-red-50 text-red-800 border border-red-100'
            }`}>
              {jsonSaveStatus.type === 'success' ? <CheckCircle className="h-5 w-5 shrink-0" /> : <AlertCircle className="h-5 w-5 shrink-0" />}
              <span className="whitespace-pre-wrap">{jsonSaveStatus.message}</span>
            </div>
          )}

          {/* Textarea Editor */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono">
              <span className="flex items-center"><FileCode className="h-3.5 w-3.5 mr-1" /> {selectedFile}</span>
              <span>Lembre-se de manter os colchetes e as chaves corretas</span>
            </div>
            <textarea
              value={rawJsonContent}
              onChange={(e) => setRawJsonContent(e.target.value)}
              className="w-full h-[380px] p-4 bg-slate-950 text-emerald-400 border border-slate-800 rounded-xl font-mono text-xs focus:outline-none focus:ring-1 focus:ring-emerald-400 leading-relaxed"
              spellCheck="false"
            />
          </div>

          <div className="bg-amber-50 rounded-lg p-3 border border-amber-100 flex items-start space-x-2">
            <Info className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
            <div className="text-[11px] text-amber-800 leading-relaxed">
              <strong>Aviso de Integridade:</strong> O editor realiza a verificação de sintaxe antes de salvar. Se você digitar um JSON malformado, o sistema rejeitará as mudanças e informará o local exato do erro para evitar falhas no carregamento das telas do Board de TI.
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end pt-2 border-t border-slate-100">
            <button
              onClick={handleSaveJson}
              className="flex items-center space-x-2 px-5 py-2.5 bg-[#343180] hover:bg-[#2c2a6d] text-white rounded-lg text-sm font-semibold shadow-xs hover:shadow-md transition-all cursor-pointer"
              id="btn-save-raw-json"
            >
              <Save className="h-4.5 w-4.5" />
              <span>Salvar Arquivo JSON</span>
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
