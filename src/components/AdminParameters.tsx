import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Trash2, 
  Save, 
  RotateCcw, 
  Palette,
  Check,
  AlertCircle
} from 'lucide-react';
import { AppParameters, ParameterItem, Goal } from '../types';
import { getAppParameters, saveParametersDataAsync } from '../lib/dataStore';

// Antonio Batista - SEG_002 - Componente de gerenciamento de parâmetros globais do sistema (Status, Prioridades, Classificações, Componentes e Metas).
export default function AdminParameters() {
  const [parameters, setParameters] = useState<AppParameters | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ text: string, type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    setParameters(getAppParameters());
  }, []);

  // Antonio Batista - SEG_002 - Salva os parâmetros globais editados de forma assíncrona.
  const handleSave = async () => {
    if (!parameters) return;
    setIsSaving(true);
    setMessage(null);
    try {
      const res = await saveParametersDataAsync(parameters);
      if (res.success) {
        setMessage({ text: 'Parâmetros salvos com sucesso!', type: 'success' });
      } else {
        setMessage({ text: `Erro ao salvar: ${res.error}`, type: 'error' });
      }
    } catch (err: any) {
      setMessage({ text: `Erro inesperado: ${err.message}`, type: 'error' });
    } finally {
      setIsSaving(false);
    }
  };

  // Antonio Batista - SEG_002 - Adiciona um novo item ou meta à lista de parâmetros selecionada.
  const handleAddItem = (type: keyof AppParameters) => {
    if (!parameters) return;
    
    if (type === 'goals') {
      const newGoal: Goal = {
        meta: 'Nova Meta',
        alvo: '50%',
        referencia: 'Finalizado',
        type: 'A'
      };
      setParameters({
        ...parameters,
        goals: [...(parameters.goals || []), newGoal]
      });
      return;
    }

    const newItem: ParameterItem = {
      id: `new-${Date.now()}`,
      label: 'Novo Item',
      color: '#64748b'
    };
    const currentItems = (parameters[type] as ParameterItem[]) || [];
    setParameters({
      ...parameters,
      [type]: [...currentItems, newItem]
    });
  };

  // Antonio Batista - SEG_002 - Atualiza o valor ou atributo de um parâmetro específico.
  const handleUpdateItem = (type: keyof AppParameters, id: string, field: keyof ParameterItem, value: string) => {
    if (!parameters) return;
    const items = (parameters[type] as ParameterItem[]) || [];
    setParameters({
      ...parameters,
      [type]: items.map(item => item.id === id ? { ...item, [field]: value } : item)
    });
  };

  // Antonio Batista - SEG_002 - Atualiza os campos de uma meta operacional do sistema.
  const handleUpdateGoal = (index: number, field: keyof Goal, value: string) => {
    if (!parameters || !parameters.goals) return;
    const newGoals = [...parameters.goals];
    newGoals[index] = { ...newGoals[index], [field]: value };
    setParameters({
      ...parameters,
      goals: newGoals
    });
  };

  // Antonio Batista - SEG_002 - Remove um item ou meta da lista de parâmetros.
  const handleRemoveItem = (type: keyof AppParameters, idOrIndex: string | number) => {
    if (!parameters) return;
    
    if (type === 'goals') {
      setParameters({
        ...parameters,
        goals: (parameters.goals || []).filter((_, idx) => idx !== idOrIndex)
      });
      return;
    }

    const items = (parameters[type] as ParameterItem[]) || [];
    setParameters({
      ...parameters,
      [type]: items.filter(item => item.id !== idOrIndex)
    });
  };

  if (!parameters) return <div className="p-8 text-center text-slate-400">Carregando...</div>;

  // Antonio Batista - SEG_002 - Renderiza uma seção de edição de parâmetro (Status, Prioridades, etc.).
  const renderSection = (title: string, type: 'statuses' | 'priorities' | 'classifications' | 'components', description: string) => (
    <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden mb-6">
      <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-slate-900">{title}</h3>
          <p className="text-xs text-slate-500">{description}</p>
        </div>
        <button
          onClick={() => handleAddItem(type)}
          className="flex items-center space-x-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg transition-colors cursor-pointer"
        >
          <Plus className="h-3.5 w-3.5" />
          <span>Adicionar</span>
        </button>
      </div>
      <div className="p-6">
        <div className="grid grid-cols-1 gap-4">
          {((parameters[type] as ParameterItem[]) || []).map((item) => (
            <div key={item.id} className="flex flex-col sm:flex-row items-start sm:items-center gap-4 p-4 border border-slate-100 rounded-lg bg-slate-50/30 hover:bg-slate-50 transition-colors">
              <div className="flex-1 w-full">
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Identificador / Valor</label>
                <input
                  type="text"
                  value={item.id}
                  onChange={(e) => handleUpdateItem(type, item.id, 'id', e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-md text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none"
                  placeholder="ID do parâmetro"
                />
              </div>
              <div className="flex-1 w-full">
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Rótulo (Exibição)</label>
                <input
                  type="text"
                  value={item.label}
                  onChange={(e) => handleUpdateItem(type, item.id, 'label', e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-md text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none"
                  placeholder="Nome para exibição"
                />
              </div>
              <div className="w-full sm:w-32">
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Cor</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={item.color}
                    onChange={(e) => handleUpdateItem(type, item.id, 'color', e.target.value)}
                    className="h-9 w-12 p-0 border-0 bg-transparent cursor-pointer"
                  />
                  <input
                    type="text"
                    value={item.color}
                    onChange={(e) => handleUpdateItem(type, item.id, 'color', e.target.value)}
                    className="flex-1 min-w-0 px-2 py-2 bg-white border border-slate-200 rounded-md text-[10px] font-mono focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none"
                  />
                </div>
              </div>
              <div className="pt-5 self-center sm:self-end">
                <button
                  onClick={() => handleRemoveItem(type, item.id)}
                  className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                  title="Remover"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
          {((parameters[type] as ParameterItem[]) || []).length === 0 && (
            <div className="py-8 text-center text-slate-400 italic text-sm">
              Nenhum item definido para esta seção.
            </div>
          )}
        </div>
      </div>
    </div>
  );

  const renderGoalsSection = () => (
    <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden mb-6">
      <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-slate-900">Metas do Time</h3>
          <p className="text-xs text-slate-500">Defina os objetivos de performance baseados em status.</p>
        </div>
        <button
          onClick={() => handleAddItem('goals')}
          className="flex items-center space-x-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg transition-colors cursor-pointer"
        >
          <Plus className="h-3.5 w-3.5" />
          <span>Nova Meta</span>
        </button>
      </div>
      <div className="p-6">
        <div className="grid grid-cols-1 gap-4">
          {(parameters.goals || []).map((goal, index) => (
            <div key={index} className="flex flex-col sm:flex-row items-start sm:items-center gap-4 p-4 border border-slate-100 rounded-lg bg-slate-50/30 hover:bg-slate-50 transition-colors">
              <div className="flex-1 w-full">
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Nome da Meta</label>
                <input
                  type="text"
                  value={goal.meta}
                  onChange={(e) => handleUpdateGoal(index, 'meta', e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-md text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none"
                  placeholder="Ex: Tickets Finalizados"
                />
              </div>
              <div className="w-full sm:w-24">
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Alvo (%)</label>
                <input
                  type="text"
                  value={goal.alvo}
                  onChange={(e) => handleUpdateGoal(index, 'alvo', e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-md text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none"
                  placeholder="Ex: 70%"
                />
              </div>
              <div className="w-full sm:w-32">
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Tipo</label>
                <select
                  value={goal.type || 'A'}
                  onChange={(e) => handleUpdateGoal(index, 'type', e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-md text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none"
                >
                  <option value="A">A - Acima (≥)</option>
                  <option value="L">L - Limite (≤)</option>
                </select>
              </div>
              <div className="flex-1 w-full">
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Status de Referência (Separado por vírgula)</label>
                <input
                  type="text"
                  value={goal.referencia}
                  onChange={(e) => handleUpdateGoal(index, 'referencia', e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-md text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none"
                  placeholder="Ex: Finalizado, Concluído"
                />
              </div>
              <div className="pt-5 self-center sm:self-end">
                <button
                  onClick={() => handleRemoveItem('goals', index)}
                  className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                  title="Remover"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
          {(parameters.goals || []).length === 0 && (
            <div className="py-8 text-center text-slate-400 italic text-sm">
              Nenhuma meta definida.
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 font-display">Parametrização</h2>
          <p className="text-slate-500 text-sm">Configure os status, prioridades, classificações e metas do sistema.</p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setParameters(getAppParameters())}
            className="flex items-center space-x-1.5 px-4 py-2 border border-slate-200 text-slate-600 text-sm font-bold rounded-lg hover:bg-slate-50 transition-colors cursor-pointer"
          >
            <RotateCcw className="h-4 w-4" />
            <span>Descartar Alterações</span>
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className={`flex items-center space-x-1.5 px-6 py-2 bg-indigo-600 text-white text-sm font-bold rounded-lg shadow-sm hover:bg-indigo-700 transition-all cursor-pointer ${isSaving ? 'opacity-70 cursor-not-allowed' : ''}`}
          >
            {isSaving ? <RotateCcw className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            <span>{isSaving ? 'Salvando...' : 'Salvar Alterações'}</span>
          </button>
        </div>
      </div>

      {message && (
        <div className={`p-4 rounded-xl border flex items-center space-x-3 ${
          message.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-red-50 border-red-200 text-red-800'
        }`}>
          {message.type === 'success' ? <Check className="h-5 w-5 shrink-0" /> : <AlertCircle className="h-5 w-5 shrink-0" />}
          <span className="text-sm font-medium">{message.text}</span>
        </div>
      )}

      {renderSection("Estados / Status", "statuses", "Defina os possíveis estados para atividades e itens de refinement.")}
      {renderSection("Prioridades", "priorities", "Configure os níveis de criticidade para as tarefas.")}
      {renderSection("Classificações / Categorias", "classifications", "Parâmetros para categorizar atividades (Funcional, Suporte a integração, Suporte L2, etc).")}
      {renderSection("Componentes", "components", "Componentes técnicos envolvidos (Front-End, Back-End, Mobile, Design, DevOps, QA, etc).")}
      {renderGoalsSection()}
    </div>
  );
}
