import React, { useState, useRef, useEffect } from 'react';
import { Check, ChevronDown, X } from 'lucide-react';

interface Option {
  id: string;
  label: string;
  color?: string;
}

interface MultiSelectFilterProps {
  label?: string;
  options: Option[];
  selectedValues: string[];
  onChange: (values: string[]) => void;
  placeholder?: string;
}

// Antonio Batista - SEG_002 - Componente de filtro com seleção múltipla de opções para tabelas e painéis do sistema.
export default function MultiSelectFilter({
  label,
  options,
  selectedValues,
  onChange,
  placeholder = "Todos"
}: MultiSelectFilterProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Antonio Batista - SEG_002 - Alterna a seleção de uma opção específica no filtro.
  const toggleOption = (id: string) => {
    if (selectedValues.includes(id)) {
      onChange(selectedValues.filter(v => v !== id));
    } else {
      onChange([...selectedValues, id]);
    }
  };

  // Antonio Batista - SEG_002 - Limpa todas as opções selecionadas no filtro.
  const clearSelection = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange([]);
  };

  // Antonio Batista - SEG_002 - Retorna o texto formatado para o gatilho do filtro de acordo com a quantidade de itens selecionados.
  const getLabel = () => {
    if (selectedValues.length === 0) return placeholder;
    if (selectedValues.length === 1) {
      return options.find(o => o.id === selectedValues[0])?.label || selectedValues[0];
    }
    return `${selectedValues.length} selecionados`;
  };

  return (
    <div className="relative" ref={containerRef}>
      {label && (
        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
          {label}
        </label>
      )}
      <div
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center justify-between w-full px-2.5 py-1.5 border rounded-lg text-sm transition-all cursor-pointer bg-slate-50/50 ${
          isOpen ? 'border-[#343180] ring-1 ring-[#343180]' : 'border-slate-300'
        }`}
      >
        <span className={`truncate ${selectedValues.length > 0 ? 'text-slate-800 font-semibold' : 'text-slate-400'}`}>
          {getLabel()}
        </span>
        <div className="flex items-center space-x-1">
          {selectedValues.length > 0 && (
            <div 
              onClick={clearSelection}
              className="p-0.5 hover:bg-slate-200 rounded-full transition-colors"
            >
              <X className="h-3 w-3 text-slate-400" />
            </div>
          )}
          <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </div>
      </div>

      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg py-1 max-h-60 overflow-y-auto animate-in fade-in zoom-in duration-100">
          <div className="px-2 py-1.5 border-b border-slate-50 flex items-center justify-between">
             <button 
                type="button"
                onClick={() => onChange(options.map(o => o.id))}
                className="text-[10px] font-bold text-[#343180] hover:underline cursor-pointer"
             >
                Selecionar Todos
             </button>
             {selectedValues.length > 0 && (
               <button 
                  type="button"
                  onClick={() => onChange([])}
                  className="text-[10px] font-bold text-slate-500 hover:underline cursor-pointer"
               >
                  Limpar
               </button>
             )}
          </div>
          {options.map((option) => (
            <div
              key={option.id}
              onClick={() => toggleOption(option.id)}
              className="flex items-center px-3 py-2 hover:bg-slate-50 transition-colors cursor-pointer group"
            >
              <div className={`flex items-center justify-center w-4 h-4 border rounded mr-3 transition-colors ${
                selectedValues.includes(option.id) 
                  ? 'bg-[#343180] border-[#343180]' 
                  : 'border-slate-300 group-hover:border-slate-400'
              }`}>
                {selectedValues.includes(option.id) && <Check className="h-3 w-3 text-white" />}
              </div>
              <div className="flex items-center space-x-2 flex-1 truncate">
                {option.color && (
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: option.color }}></span>
                )}
                <span className={`text-sm ${selectedValues.includes(option.id) ? 'text-slate-900 font-medium' : 'text-slate-600'}`}>
                  {option.label}
                </span>
              </div>
            </div>
          ))}
          {options.length === 0 && (
            <div className="px-3 py-4 text-center text-slate-400 italic text-xs">
              Nenhuma opção disponível
            </div>
          )}
        </div>
      )}
    </div>
  );
}
