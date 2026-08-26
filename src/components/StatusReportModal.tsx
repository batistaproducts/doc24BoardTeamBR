import React, { useState, useEffect, useMemo } from 'react';
import { 
  X, 
  Mail, 
  CheckSquare, 
  Square, 
  Copy, 
  Check, 
  Download, 
  ExternalLink, 
  FileText, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  Sparkles, 
  Star, 
  ShieldAlert, 
  Layers, 
  User as UserIcon, 
  Calendar, 
  Filter, 
  Search, 
  Send, 
  ChevronRight,
  Code,
  Eye,
  RefreshCw,
  Info
} from 'lucide-react';
import { User, Period, Atividade, DeployItem } from '../types';
import { getPeriods, getAtividadesForPeriod, getDatasAvisos, getAppParameters } from '../lib/dataStore';

interface StatusReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User;
  initialPeriodId?: string;
}

interface TaskReportItem {
  task: Atividade;
  selected: boolean;
  isHighlight: boolean;
  isBlocker: boolean;
  customNote?: string;
}

// Antonio Batista - SEG_002 - Modal executivo do Status Report para geração e envio de e-mails corporativos Doc24
export default function StatusReportModal({
  isOpen,
  onClose,
  currentUser,
  initialPeriodId
}: StatusReportModalProps) {
  // Periods
  const [periods, setPeriods] = useState<Period[]>([]);
  const [selectedPeriodId, setSelectedPeriodId] = useState<string>('');
  
  // Tasks list state
  const [tasksState, setTasksState] = useState<TaskReportItem[]>([]);
  const [deploys, setDeploys] = useState<DeployItem[]>([]);
  
  // Search & Filter in task list
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('todos');
  const [filterPriority, setFilterPriority] = useState<string>('todas');
  const [filterOwner, setFilterOwner] = useState<string>('todos');

  // Email Config Fields
  const [emailSubject, setEmailSubject] = useState('');
  const [recipients, setRecipients] = useState('lideranca.ti@doc24.com.br, produto@doc24.com.br');
  const [executiveSummary, setExecutiveSummary] = useState(
    'Apresentamos o consolidado de entregas, atividades em andamento e principais marcos técnicos alcançados pela equipe de Tecnologia e Engenharia da Doc24 no período.'
  );
  const [blockersNotes, setBlockersNotes] = useState('');
  const [nextStepsNotes, setNextStepsNotes] = useState(
    '1. Conclusão dos testes integrados e validação em ambiente de homologação (Staging).\n2. Janela de deploy e monitoramento das versões programadas.\n3. Alinhamento de refinamento técnico para a próxima sprint.'
  );
  const [senderTitle, setSenderTitle] = useState(`${currentUser.name} | ${currentUser.role} Doc24 TI`);
  
  // UI Tabs & Copy status
  const [previewTab, setPreviewTab] = useState<'preview' | 'html' | 'text'>('preview');
  const [copyStatus, setCopyStatus] = useState<{ type: 'rich' | 'html' | 'text' | null; message: string }>({
    type: null,
    message: ''
  });

  // Load periods on mount
  useEffect(() => {
    if (!isOpen) return;
    const loadedPeriods = getPeriods();
    setPeriods(loadedPeriods);
    
    // Choose period
    let targetPeriodId = initialPeriodId;
    if (!targetPeriodId || !loadedPeriods.some(p => p.id === targetPeriodId)) {
      targetPeriodId = loadedPeriods.length > 0 ? loadedPeriods[0].id : '072026';
    }
    setSelectedPeriodId(targetPeriodId);

    // Load deploys from datas_avisos
    try {
      const datasAvisos = getDatasAvisos();
      setDeploys(datasAvisos.deploys || []);
    } catch (_) {}
  }, [isOpen, initialPeriodId]);

  // When period changes, load tasks
  useEffect(() => {
    if (!selectedPeriodId) return;
    const rawTasks = getAtividadesForPeriod(selectedPeriodId);
    
    // Default: select completed and in-progress tasks as active report candidates
    const mapped: TaskReportItem[] = rawTasks.map(t => {
      const st = (t.status || '').toLowerCase();
      const isDone = st.includes('conclu') || st.includes('finaliz') || st.includes('pronto') || st.includes('feito');
      const isInProgress = st.includes('andamento') || st.includes('exec') || st.includes('desenvol');
      const isImpediment = st.includes('impid') || st.includes('bloq') || st.includes('trav') || t.priority === 'P0';

      return {
        task: t,
        selected: isDone || isInProgress || isImpediment,
        isHighlight: isDone && (t.priority === 'P0' || t.priority === 'P1'),
        isBlocker: isImpediment,
        customNote: ''
      };
    });

    setTasksState(mapped);

    // Update default subject
    const pObj = periods.find(p => p.id === selectedPeriodId);
    const pLabel = pObj ? pObj.label : selectedPeriodId;
    setEmailSubject(`[Status Report] Sprint ${pLabel} - Tecnologia & Engenharia Doc24`);
  }, [selectedPeriodId, periods]);

  // Unique owners list for filter
  const uniqueOwners = useMemo(() => {
    const set = new Set<string>();
    tasksState.forEach(item => {
      if (item.task.owner && item.task.owner.trim()) {
        set.add(item.task.owner.trim());
      }
    });
    return Array.from(set).sort();
  }, [tasksState]);

  // Filtered tasks for the selection list
  const visibleTasks = useMemo(() => {
    return tasksState.filter(item => {
      const t = item.task;
      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = (t.name || '').toLowerCase().includes(q);
        const matchJira = (t.jiraOrMovidesk || t.movidesk || '').toLowerCase().includes(q);
        const matchOwner = (t.owner || '').toLowerCase().includes(q);
        const matchDesc = (t.description || '').toLowerCase().includes(q);
        if (!matchName && !matchJira && !matchOwner && !matchDesc) return false;
      }

      // Status filter
      if (filterStatus !== 'todos') {
        const st = (t.status || '').toLowerCase();
        if (filterStatus === 'concluido' && !(st.includes('conclu') || st.includes('finaliz') || st.includes('pronto'))) return false;
        if (filterStatus === 'andamento' && !(st.includes('andamento') || st.includes('exec') || st.includes('desenvol'))) return false;
        if (filterStatus === 'impedido' && !(st.includes('impid') || st.includes('bloq') || item.isBlocker)) return false;
        if (filterStatus === 'pendente' && !(st.includes('pend') || st.includes('iniciar') || st.includes('aberto'))) return false;
      }

      // Priority filter
      if (filterPriority !== 'todas' && t.priority !== filterPriority) {
        return false;
      }

      // Owner filter
      if (filterOwner !== 'todos' && t.owner !== filterOwner) {
        return false;
      }

      return true;
    });
  }, [tasksState, searchQuery, filterStatus, filterPriority, filterOwner]);

  // Selected Tasks
  const selectedTasks = useMemo(() => {
    return tasksState.filter(item => item.selected);
  }, [tasksState]);

  // Categorized tasks for the report
  const categorizedTasks = useMemo(() => {
    const highlights: TaskReportItem[] = [];
    const completed: TaskReportItem[] = [];
    const inProgress: TaskReportItem[] = [];
    const blockers: TaskReportItem[] = [];
    const upcoming: TaskReportItem[] = [];

    selectedTasks.forEach(item => {
      const st = (item.task.status || '').toLowerCase();
      const isDone = st.includes('conclu') || st.includes('finaliz') || st.includes('pronto') || st.includes('feito');
      const isInProg = st.includes('andamento') || st.includes('exec') || st.includes('desenvol');
      const isBlock = item.isBlocker || st.includes('impid') || st.includes('bloq');

      if (isBlock) {
        blockers.push(item);
      }
      if (item.isHighlight) {
        highlights.push(item);
      }

      if (isDone) {
        completed.push(item);
      } else if (isInProg) {
        inProgress.push(item);
      } else if (!isBlock) {
        upcoming.push(item);
      }
    });

    return { highlights, completed, inProgress, blockers, upcoming };
  }, [selectedTasks]);

  // Toggle Selection Handlers
  const handleToggleSelectAll = (select: boolean) => {
    setTasksState(prev => prev.map(item => ({ ...item, selected: select })));
  };

  const handleSelectOnlyCompletedAndProgress = () => {
    setTasksState(prev => prev.map(item => {
      const st = (item.task.status || '').toLowerCase();
      const isDone = st.includes('conclu') || st.includes('finaliz') || st.includes('pronto');
      const isInProgress = st.includes('andamento') || st.includes('exec') || st.includes('desenvol');
      const isBlock = item.isBlocker || st.includes('impid') || st.includes('bloq');
      return { ...item, selected: isDone || isInProgress || isBlock };
    }));
  };

  const handleToggleTask = (taskId: string) => {
    setTasksState(prev => prev.map(item => {
      if (item.task.id === taskId) {
        return { ...item, selected: !item.selected };
      }
      return item;
    }));
  };

  const handleToggleHighlight = (taskId: string) => {
    setTasksState(prev => prev.map(item => {
      if (item.task.id === taskId) {
        return { ...item, isHighlight: !item.isHighlight, selected: true };
      }
      return item;
    }));
  };

  const handleToggleBlocker = (taskId: string) => {
    setTasksState(prev => prev.map(item => {
      if (item.task.id === taskId) {
        return { ...item, isBlocker: !item.isBlocker, selected: true };
      }
      return item;
    }));
  };

  const handleCustomNoteChange = (taskId: string, note: string) => {
    setTasksState(prev => prev.map(item => {
      if (item.task.id === taskId) {
        return { ...item, customNote: note };
      }
      return item;
    }));
  };

  // Period label
  const periodLabel = useMemo(() => {
    const p = periods.find(item => item.id === selectedPeriodId);
    return p ? p.label : selectedPeriodId;
  }, [periods, selectedPeriodId]);

  // Generate Deterministic HTML Email Template with Doc24 Brand
  const generatedHtmlEmail = useMemo(() => {
    const dateFormatted = new Date().toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    });

    const totalCount = selectedTasks.length;
    const completedCount = categorizedTasks.completed.length;
    const inProgressCount = categorizedTasks.inProgress.length;
    const blockerCount = categorizedTasks.blockers.length;
    const completionRate = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

    const renderTaskRow = (item: TaskReportItem, badgeBg: string, badgeText: string) => {
      const t = item.task;
      const ticket = t.jiraOrMovidesk || t.movidesk || '';
      const priorityColor = t.priority === 'P0' ? '#ef4444' : t.priority === 'P1' ? '#f97316' : '#64748b';

      return `
        <tr style="border-bottom: 1px solid #e2e8f0;">
          <td style="padding: 10px 12px; vertical-align: top;">
            <div style="font-weight: 600; color: #1e293b; font-size: 13px; line-height: 1.4;">
              ${t.name}
            </div>
            ${t.description ? `<div style="font-size: 11px; color: #64748b; margin-top: 3px; line-height: 1.3;">${t.description}</div>` : ''}
            ${item.customNote ? `<div style="font-size: 11px; color: #343180; font-weight: 600; margin-top: 4px; background: #eef2ff; padding: 4px 8px; border-radius: 4px; border-left: 3px solid #343180;">Nota: ${item.customNote}</div>` : ''}
          </td>
          <td style="padding: 10px 12px; vertical-align: top; white-space: nowrap; font-size: 12px;">
            ${ticket ? `<span style="display: inline-block; background: #f1f5f9; color: #334155; padding: 2px 6px; border-radius: 4px; font-family: monospace; font-weight: 700; font-size: 11px; border: 1px solid #cbd5e1;">${ticket}</span>` : '<span style="color: #94a3b8;">-</span>'}
          </td>
          <td style="padding: 10px 12px; vertical-align: top; white-space: nowrap; font-size: 12px; color: #475569;">
            ${t.owner || 'Não atribuído'}
          </td>
          <td style="padding: 10px 12px; vertical-align: top; white-space: nowrap; text-align: center;">
            <span style="display: inline-block; background: ${priorityColor}15; color: ${priorityColor}; font-weight: 800; font-size: 10px; padding: 2px 6px; border-radius: 4px; border: 1px solid ${priorityColor}40;">
              ${t.priority}
            </span>
          </td>
          <td style="padding: 10px 12px; vertical-align: top; white-space: nowrap; text-align: right;">
            <span style="display: inline-block; background: ${badgeBg}; color: ${badgeText}; font-weight: 700; font-size: 11px; padding: 3px 8px; border-radius: 9999px;">
              ${t.status || 'Ativo'}
            </span>
          </td>
        </tr>
      `;
    };

    return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${emailSubject}</title>
</head>
<body style="margin: 0; padding: 20px; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b; -webkit-font-smoothing: antialiased;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 680px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.08); border: 1px solid #e2e8f0;">
    
    <!-- DOC24 BRAND HEADER -->
    <tr>
      <td style="background-color: #343180; padding: 28px 32px; color: #ffffff;">
        <table width="100%" border="0" cellspacing="0" cellpadding="0">
          <tr>
            <td style="vertical-align: middle;">
              <!-- Logo Doc24 Oficial -->
              <img src="https://doc24.com.br/wp-content/uploads/2024/08/doc24_iso_w.png" alt="Doc24" width="130" style="display: block; margin-bottom: 12px; border: 0;" />
              <div style="font-size: 20px; font-weight: 800; letter-spacing: -0.5px; line-height: 1.2;">
                Status Report Executivo
              </div>
              <div style="font-size: 13px; color: #c7d2fe; margin-top: 4px; font-weight: 500;">
                Sprint: <strong>${periodLabel}</strong> &bull; Emissão: ${dateFormatted}
              </div>
            </td>
            <td align="right" style="vertical-align: top;">
              <span style="background-color: rgba(255,255,255,0.15); color: #ffffff; padding: 6px 12px; border-radius: 6px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; border: 1px solid rgba(255,255,255,0.25);">
                Tecnologia & TI
              </span>
            </td>
          </tr>
        </table>
      </td>
    </tr>

    <!-- EXECUTIVE METRICS BAR -->
    <tr>
      <td style="background-color: #f8fafc; padding: 16px 32px; border-bottom: 1px solid #e2e8f0;">
        <table width="100%" border="0" cellspacing="0" cellpadding="0">
          <tr>
            <td align="center" style="padding: 6px; border-right: 1px solid #e2e8f0;">
              <div style="font-size: 22px; font-weight: 900; color: #343180;">${totalCount}</div>
              <div style="font-size: 10px; font-weight: 700; color: #64748b; text-transform: uppercase;">Tasks no Report</div>
            </td>
            <td align="center" style="padding: 6px; border-right: 1px solid #e2e8f0;">
              <div style="font-size: 22px; font-weight: 900; color: #16a34a;">${completedCount}</div>
              <div style="font-size: 10px; font-weight: 700; color: #64748b; text-transform: uppercase;">Concluídas</div>
            </td>
            <td align="center" style="padding: 6px; border-right: 1px solid #e2e8f0;">
              <div style="font-size: 22px; font-weight: 900; color: #2563eb;">${inProgressCount}</div>
              <div style="font-size: 10px; font-weight: 700; color: #64748b; text-transform: uppercase;">Em Andamento</div>
            </td>
            <td align="center" style="padding: 6px; border-right: 1px solid #e2e8f0;">
              <div style="font-size: 22px; font-weight: 900; color: ${blockerCount > 0 ? '#dc2626' : '#64748b'};">${blockerCount}</div>
              <div style="font-size: 10px; font-weight: 700; color: #64748b; text-transform: uppercase;">Impedimentos</div>
            </td>
            <td align="center" style="padding: 6px;">
              <div style="font-size: 22px; font-weight: 900; color: #0891b2;">${completionRate}%</div>
              <div style="font-size: 10px; font-weight: 700; color: #64748b; text-transform: uppercase;">Taxa Entrega</div>
            </td>
          </tr>
        </table>
      </td>
    </tr>

    <!-- MAIN BODY CONTENT -->
    <tr>
      <td style="padding: 28px 32px;">
        
        <!-- RESUMO EXECUTIVO -->
        <div style="margin-bottom: 24px;">
          <div style="font-size: 14px; font-weight: 800; color: #343180; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px; display: flex; align-items: center;">
            📌 Resumo Executivo
          </div>
          <div style="background-color: #f8fafc; border-left: 4px solid #343180; padding: 14px 16px; border-radius: 0 8px 8px 0; font-size: 13px; line-height: 1.6; color: #334155;">
            ${executiveSummary.replace(/\n/g, '<br/>')}
          </div>
        </div>

        ${categorizedTasks.highlights.length > 0 ? `
        <!-- DESTAQUES PRINCIPAIS -->
        <div style="margin-bottom: 24px;">
          <div style="font-size: 14px; font-weight: 800; color: #d97706; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px;">
            ⭐ Destaques & Principais Entregas
          </div>
          <table width="100%" border="0" cellspacing="0" cellpadding="0" style="border-collapse: collapse; background: #fffbeb; border-radius: 8px; border: 1px solid #fde68a;">
            <thead>
              <tr style="border-bottom: 2px solid #fde68a; text-align: left; font-size: 11px; text-transform: uppercase; color: #92400e; font-weight: 800;">
                <th style="padding: 8px 12px;">Atividade</th>
                <th style="padding: 8px 12px;">Ticket</th>
                <th style="padding: 8px 12px;">Responsável</th>
                <th style="padding: 8px 12px; text-align: center;">Prioridade</th>
                <th style="padding: 8px 12px; text-align: right;">Status</th>
              </tr>
            </thead>
            <tbody>
              ${categorizedTasks.highlights.map(item => renderTaskRow(item, '#fef3c7', '#92400e')).join('')}
            </tbody>
          </table>
        </div>
        ` : ''}

        ${categorizedTasks.blockers.length > 0 ? `
        <!-- IMPEDIMENTOS E RISCOS -->
        <div style="margin-bottom: 24px;">
          <div style="font-size: 14px; font-weight: 800; color: #dc2626; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px;">
            🚨 Atenção: Riscos & Impedimentos
          </div>
          <table width="100%" border="0" cellspacing="0" cellpadding="0" style="border-collapse: collapse; background: #fef2f2; border-radius: 8px; border: 1px solid #fecaca; margin-bottom: 10px;">
            <thead>
              <tr style="border-bottom: 2px solid #fecaca; text-align: left; font-size: 11px; text-transform: uppercase; color: #991b1b; font-weight: 800;">
                <th style="padding: 8px 12px;">Item Crítico</th>
                <th style="padding: 8px 12px;">Ticket</th>
                <th style="padding: 8px 12px;">Responsável</th>
                <th style="padding: 8px 12px; text-align: center;">Prioridade</th>
                <th style="padding: 8px 12px; text-align: right;">Status</th>
              </tr>
            </thead>
            <tbody>
              ${categorizedTasks.blockers.map(item => renderTaskRow(item, '#fee2e2', '#991b1b')).join('')}
            </tbody>
          </table>
          ${blockersNotes ? `
          <div style="background: #fff; border: 1px dashed #ef4444; border-radius: 6px; padding: 10px 12px; font-size: 12px; color: #991b1b; line-height: 1.5;">
            <strong>Observações de Mitigação:</strong><br/>
            ${blockersNotes.replace(/\n/g, '<br/>')}
          </div>
          ` : ''}
        </div>
        ` : ''}

        ${categorizedTasks.completed.length > 0 ? `
        <!-- ATIVIDADES CONCLUÍDAS -->
        <div style="margin-bottom: 24px;">
          <div style="font-size: 14px; font-weight: 800; color: #16a34a; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px;">
            ✅ Entregas Concluídas no Período (${categorizedTasks.completed.length})
          </div>
          <table width="100%" border="0" cellspacing="0" cellpadding="0" style="border-collapse: collapse; background: #ffffff; border-radius: 8px; border: 1px solid #e2e8f0;">
            <thead>
              <tr style="background: #f8fafc; border-bottom: 2px solid #e2e8f0; text-align: left; font-size: 11px; text-transform: uppercase; color: #64748b; font-weight: 800;">
                <th style="padding: 8px 12px;">Atividade / Entrega</th>
                <th style="padding: 8px 12px;">Ticket</th>
                <th style="padding: 8px 12px;">Responsável</th>
                <th style="padding: 8px 12px; text-align: center;">Prioridade</th>
                <th style="padding: 8px 12px; text-align: right;">Status</th>
              </tr>
            </thead>
            <tbody>
              ${categorizedTasks.completed.map(item => renderTaskRow(item, '#dcfce7', '#15803d')).join('')}
            </tbody>
          </table>
        </div>
        ` : ''}

        ${categorizedTasks.inProgress.length > 0 ? `
        <!-- ATIVIDADES EM ANDAMENTO -->
        <div style="margin-bottom: 24px;">
          <div style="font-size: 14px; font-weight: 800; color: #2563eb; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px;">
            🔄 Atividades em Desenvolvimento / Andamento (${categorizedTasks.inProgress.length})
          </div>
          <table width="100%" border="0" cellspacing="0" cellpadding="0" style="border-collapse: collapse; background: #ffffff; border-radius: 8px; border: 1px solid #e2e8f0;">
            <thead>
              <tr style="background: #f8fafc; border-bottom: 2px solid #e2e8f0; text-align: left; font-size: 11px; text-transform: uppercase; color: #64748b; font-weight: 800;">
                <th style="padding: 8px 12px;">Atividade</th>
                <th style="padding: 8px 12px;">Ticket</th>
                <th style="padding: 8px 12px;">Responsável</th>
                <th style="padding: 8px 12px; text-align: center;">Prioridade</th>
                <th style="padding: 8px 12px; text-align: right;">Status</th>
              </tr>
            </thead>
            <tbody>
              ${categorizedTasks.inProgress.map(item => renderTaskRow(item, '#dbeafe', '#1d4ed8')).join('')}
            </tbody>
          </table>
        </div>
        ` : ''}

        <!-- PRÓXIMOS PASSOS & DEPLOYS -->
        <div style="margin-bottom: 24px;">
          <div style="font-size: 14px; font-weight: 800; color: #343180; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px;">
            🚀 Próximos Passos & Planejamento
          </div>
          <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; padding: 14px 16px; border-radius: 8px; font-size: 13px; line-height: 1.6; color: #334155;">
            ${nextStepsNotes.replace(/\n/g, '<br/>')}
          </div>
        </div>

        <!-- EMISSOR & ASSINATURA -->
        <div style="border-top: 2px solid #f1f5f9; padding-top: 18px; margin-top: 28px;">
          <table width="100%" border="0" cellspacing="0" cellpadding="0">
            <tr>
              <td>
                <div style="font-size: 13px; font-weight: 700; color: #1e293b;">${senderTitle}</div>
                <div style="font-size: 11px; color: #64748b; margin-top: 2px;">Doc24 Tecnologia &bull; Gestão de Projetos & Engenharia</div>
              </td>
              <td align="right">
                <span style="font-size: 11px; font-weight: 600; color: #343180; background: #e0e7ff; padding: 4px 10px; border-radius: 4px;">
                  Doc24 TI Board
                </span>
              </td>
            </tr>
          </table>
        </div>

      </td>
    </tr>

    <!-- FOOTER -->
    <tr>
      <td style="background-color: #0f172a; padding: 16px 32px; color: #94a3b8; font-size: 11px; text-align: center; border-top: 1px solid #1e293b;">
        Este e-mail é um relatório de acompanhamento interno emitido a partir do sistema de controle de atividades da <strong>Doc24</strong>.<br/>
        &copy; ${new Date().getFullYear()} Doc24. Todos os direitos reservados.
      </td>
    </tr>

  </table>
</body>
</html>`;
  }, [
    emailSubject,
    periodLabel,
    executiveSummary,
    blockersNotes,
    nextStepsNotes,
    senderTitle,
    selectedTasks,
    categorizedTasks
  ]);

  // Generate Plain Text / Markdown for Chat & WhatsApp
  const generatedPlainText = useMemo(() => {
    const totalCount = selectedTasks.length;
    const completedCount = categorizedTasks.completed.length;
    const inProgressCount = categorizedTasks.inProgress.length;
    const blockerCount = categorizedTasks.blockers.length;

    let text = `📊 *STATUS REPORT DOC24 TI - SPRINT ${periodLabel}*\n`;
    text += `📅 Data: ${new Date().toLocaleDateString('pt-BR')}\n`;
    text += `👤 Emissor: ${senderTitle}\n\n`;

    text += `📈 *MÉTRICAS DA SPRINT:*\n`;
    text += `• Total de Tasks: ${totalCount}\n`;
    text += `• Concluídas: ${completedCount}\n`;
    text += `• Em Andamento: ${inProgressCount}\n`;
    text += `• Impedimentos: ${blockerCount}\n\n`;

    text += `📌 *RESUMO EXECUTIVO:*\n${executiveSummary}\n\n`;

    if (categorizedTasks.highlights.length > 0) {
      text += `⭐ *DESTAQUES & PRINCIPAIS ENTREGAS:*\n`;
      categorizedTasks.highlights.forEach(item => {
        const t = item.task;
        const ticket = t.jiraOrMovidesk || t.movidesk ? `[${t.jiraOrMovidesk || t.movidesk}] ` : '';
        text += `• ${ticket}${t.name} (${t.owner || 'Doc24'}) - ${t.status}\n`;
        if (item.customNote) text += `  ↳ Nota: ${item.customNote}\n`;
      });
      text += `\n`;
    }

    if (categorizedTasks.blockers.length > 0) {
      text += `🚨 *ATENÇÃO: RISCOS & IMPEDIMENTOS:*\n`;
      categorizedTasks.blockers.forEach(item => {
        const t = item.task;
        const ticket = t.jiraOrMovidesk || t.movidesk ? `[${t.jiraOrMovidesk || t.movidesk}] ` : '';
        text += `• [${t.priority}] ${ticket}${t.name} (${t.owner || 'Doc24'}) - ${t.status}\n`;
      });
      if (blockersNotes) {
        text += `  ↳ Mitigação: ${blockersNotes}\n`;
      }
      text += `\n`;
    }

    if (categorizedTasks.completed.length > 0) {
      text += `✅ *ENTREGAS CONCLUÍDAS (${categorizedTasks.completed.length}):*\n`;
      categorizedTasks.completed.forEach(item => {
        const t = item.task;
        const ticket = t.jiraOrMovidesk || t.movidesk ? `[${t.jiraOrMovidesk || t.movidesk}] ` : '';
        text += `• ${ticket}${t.name} - ${t.owner || 'Doc24'}\n`;
      });
      text += `\n`;
    }

    if (categorizedTasks.inProgress.length > 0) {
      text += `🔄 *EM ANDAMENTO (${categorizedTasks.inProgress.length}):*\n`;
      categorizedTasks.inProgress.forEach(item => {
        const t = item.task;
        const ticket = t.jiraOrMovidesk || t.movidesk ? `[${t.jiraOrMovidesk || t.movidesk}] ` : '';
        text += `• ${ticket}${t.name} (${t.owner || 'Doc24'}) - ${t.status}\n`;
      });
      text += `\n`;
    }

    text += `🚀 *PRÓXIMOS PASSOS:*\n${nextStepsNotes}\n\n`;
    text += `---\nDoc24 Tecnologia & Saúde\n`;

    return text;
  }, [
    periodLabel,
    senderTitle,
    executiveSummary,
    blockersNotes,
    nextStepsNotes,
    selectedTasks,
    categorizedTasks
  ]);

  // Copy Handlers
  const handleCopyRichHtml = async () => {
    try {
      if (navigator.clipboard && window.ClipboardItem) {
        const typeHtml = 'text/html';
        const typePlain = 'text/plain';
        const blobHtml = new Blob([generatedHtmlEmail], { type: typeHtml });
        const blobPlain = new Blob([generatedPlainText], { type: typePlain });
        const data = [new ClipboardItem({ [typeHtml]: blobHtml, [typePlain]: blobPlain })];
        await navigator.clipboard.write(data);
      } else {
        await navigator.clipboard.writeText(generatedHtmlEmail);
      }
      setCopyStatus({
        type: 'rich',
        message: 'E-mail formatado copiado! Cole diretamente no Outlook, Gmail ou Webmail.'
      });
      setTimeout(() => setCopyStatus({ type: null, message: '' }), 4000);
    } catch (err: any) {
      console.warn('Erro ao copiar Rich Text:', err);
      // Fallback to plain text
      await navigator.clipboard.writeText(generatedPlainText);
      setCopyStatus({
        type: 'text',
        message: 'Copiado como texto formatado.'
      });
      setTimeout(() => setCopyStatus({ type: null, message: '' }), 4000);
    }
  };

  const handleCopyHtmlCode = async () => {
    await navigator.clipboard.writeText(generatedHtmlEmail);
    setCopyStatus({
      type: 'html',
      message: 'Código HTML do e-mail copiado para a área de transferência!'
    });
    setTimeout(() => setCopyStatus({ type: null, message: '' }), 4000);
  };

  const handleCopyPlainText = async () => {
    await navigator.clipboard.writeText(generatedPlainText);
    setCopyStatus({
      type: 'text',
      message: 'Texto e Markdown copiados para envio no Slack, Teams ou WhatsApp!'
    });
    setTimeout(() => setCopyStatus({ type: null, message: '' }), 4000);
  };

  const handleDownloadHtml = () => {
    const blob = new Blob([generatedHtmlEmail], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Status_Report_Doc24_${selectedPeriodId}_${Date.now()}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleOpenMailto = () => {
    const mailtoUrl = `mailto:${encodeURIComponent(recipients)}?subject=${encodeURIComponent(
      emailSubject
    )}&body=${encodeURIComponent(generatedPlainText)}`;
    window.open(mailtoUrl, '_blank');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-7xl max-h-[96vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* MODAL HEADER */}
        <div className="px-6 py-4 bg-[#343180] text-white flex items-center justify-between shadow-md shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/10 rounded-xl flex items-center justify-center border border-white/10">
              <Mail className="h-6 w-6 text-amber-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white tracking-tight">
                  Status Report Executivo
                </h3>
                <span className="bg-amber-400 text-slate-950 text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider">
                  Admin Exclusivo
                </span>
                <span className="bg-indigo-400/30 text-indigo-100 text-[10px] font-semibold px-2 py-0.5 rounded-full border border-indigo-300/30">
                  Identidade Doc24 &bull; Determinístico (Sem IA)
                </span>
              </div>
              <p className="text-xs text-indigo-200 mt-0.5">
                Selecione as principais entregas e gere um e-mail estruturado pronto para envio à diretoria e clientes
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="p-1.5 text-indigo-200 hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
              title="Fechar janela"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* NOTIFICATION BANNER ON COPY */}
        {copyStatus.message && (
          <div className="bg-emerald-600 text-white px-4 py-2.5 text-xs font-semibold flex items-center justify-between shadow-inner animate-in slide-in-from-top duration-200">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-200" />
              <span>{copyStatus.message}</span>
            </div>
            <button 
              onClick={() => setCopyStatus({ type: null, message: '' })}
              className="text-emerald-100 hover:text-white"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        {/* MODAL MAIN CONTENT: 2-COLUMN DESKTOP LAYOUT */}
        <div className="grid grid-cols-1 lg:grid-cols-12 flex-1 overflow-hidden">
          
          {/* LEFT COLUMN: CONTROLS & TASK SELECTION (5 COLS) */}
          <div className="lg:col-span-5 border-r border-slate-200 flex flex-col bg-slate-50/50 overflow-hidden">
            
            {/* Top Config & Filters Section */}
            <div className="p-4 border-b border-slate-200 bg-white space-y-3 shrink-0">
              
              {/* Period & Recipients selector */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1 uppercase tracking-wider">
                    Período / Sprint
                  </label>
                  <select
                    value={selectedPeriodId}
                    onChange={(e) => setSelectedPeriodId(e.target.value)}
                    className="w-full text-xs font-semibold bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-800 focus:ring-2 focus:ring-[#343180] focus:border-transparent outline-hidden"
                  >
                    {periods.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.label} {p.id === '072026' ? '(Atual)' : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1 uppercase tracking-wider">
                    Emissor
                  </label>
                  <input
                    type="text"
                    value={senderTitle}
                    onChange={(e) => setSenderTitle(e.target.value)}
                    className="w-full text-xs bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-800 focus:ring-2 focus:ring-[#343180] outline-hidden"
                  />
                </div>
              </div>

              {/* Subject */}
              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1 uppercase tracking-wider">
                  Assunto do E-mail
                </label>
                <input
                  type="text"
                  value={emailSubject}
                  onChange={(e) => setEmailSubject(e.target.value)}
                  className="w-full text-xs font-medium bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-800 focus:ring-2 focus:ring-[#343180] outline-hidden"
                />
              </div>

              {/* Executive Summary */}
              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1 uppercase tracking-wider flex items-center justify-between">
                  <span>Resumo Executivo (Introdução)</span>
                  <span className="text-[10px] text-slate-400 font-normal">Editável</span>
                </label>
                <textarea
                  rows={2}
                  value={executiveSummary}
                  onChange={(e) => setExecutiveSummary(e.target.value)}
                  placeholder="Texto introdutório com os principais avanços da sprint..."
                  className="w-full text-xs bg-slate-50 border border-slate-300 rounded-lg p-2 text-slate-800 focus:ring-2 focus:ring-[#343180] outline-hidden resize-none"
                />
              </div>

              {/* Search & Status Filters */}
              <div className="pt-2 border-t border-slate-100 space-y-2">
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <Search className="h-3.5 w-3.5 absolute left-2.5 top-2 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Buscar por nome, ticket ou responsável..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full text-xs pl-8 pr-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 focus:ring-2 focus:ring-[#343180] outline-hidden"
                    />
                  </div>

                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 text-slate-700 font-medium outline-hidden"
                  >
                    <option value="todos">Status: Todos</option>
                    <option value="concluido">Concluídas</option>
                    <option value="andamento">Em Andamento</option>
                    <option value="impedido">Impedimentos</option>
                    <option value="pendente">A Iniciar</option>
                  </select>
                </div>

                {/* Quick Selection Buttons */}
                <div className="flex items-center justify-between text-[11px] pt-1">
                  <span className="font-bold text-slate-600">
                    {selectedTasks.length} de {tasksState.length} selecionadas
                  </span>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={handleSelectOnlyCompletedAndProgress}
                      className="text-[#343180] hover:text-[#282666] font-semibold hover:underline cursor-pointer"
                    >
                      Padrão
                    </button>
                    <span className="text-slate-300">&bull;</span>
                    <button
                      type="button"
                      onClick={() => handleToggleSelectAll(true)}
                      className="text-indigo-600 hover:text-indigo-800 font-semibold hover:underline cursor-pointer"
                    >
                      Todas
                    </button>
                    <span className="text-slate-300">&bull;</span>
                    <button
                      type="button"
                      onClick={() => handleToggleSelectAll(false)}
                      className="text-slate-500 hover:text-slate-700 hover:underline cursor-pointer"
                    >
                      Limpar
                    </button>
                  </div>
                </div>
              </div>

            </div>

            {/* Scrollable Tasks List */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {visibleTasks.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-xs">
                  Nenhuma atividade encontrada com os filtros atuais.
                </div>
              ) : (
                visibleTasks.map((item) => {
                  const t = item.task;
                  const st = (t.status || '').toLowerCase();
                  const isDone = st.includes('conclu') || st.includes('finaliz') || st.includes('pronto');
                  const isInProg = st.includes('andamento') || st.includes('exec') || st.includes('desenvol');
                  const isBlock = item.isBlocker || st.includes('impid') || st.includes('bloq');

                  return (
                    <div
                      key={t.id}
                      className={`p-2.5 rounded-xl border transition-all duration-150 text-xs ${
                        item.selected
                          ? 'bg-white border-indigo-200 shadow-xs'
                          : 'bg-slate-100/60 border-slate-200/80 opacity-70'
                      }`}
                    >
                      <div className="flex items-start gap-2.5">
                        <button
                          type="button"
                          onClick={() => handleToggleTask(t.id)}
                          className="mt-0.5 text-slate-400 hover:text-[#343180] cursor-pointer shrink-0"
                        >
                          {item.selected ? (
                            <CheckSquare className="h-4 w-4 text-[#343180]" />
                          ) : (
                            <Square className="h-4 w-4" />
                          )}
                        </button>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-1">
                            <span className="font-semibold text-slate-800 line-clamp-1">
                              {t.name}
                            </span>
                            <span className={`text-[10px] font-black px-1.5 py-0.2 rounded shrink-0 ${
                              t.priority === 'P0' ? 'bg-rose-100 text-rose-700' :
                              t.priority === 'P1' ? 'bg-amber-100 text-amber-700' :
                              'bg-slate-100 text-slate-600'
                            }`}>
                              {t.priority}
                            </span>
                          </div>

                          <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-1 flex-wrap">
                            {(t.jiraOrMovidesk || t.movidesk) && (
                              <span className="font-mono font-bold text-slate-700 bg-slate-100 px-1 rounded">
                                {t.jiraOrMovidesk || t.movidesk}
                              </span>
                            )}
                            <span>{t.owner || 'Doc24'}</span>
                            <span className={`font-semibold px-1.5 py-0.2 rounded-full text-[10px] ${
                              isDone ? 'bg-emerald-100 text-emerald-800' :
                              isInProg ? 'bg-blue-100 text-blue-800' :
                              isBlock ? 'bg-rose-100 text-rose-800' :
                              'bg-slate-200 text-slate-700'
                            }`}>
                              {t.status || 'Ativo'}
                            </span>
                          </div>

                          {/* Quick Toggles: Destaque / Impedimento */}
                          {item.selected && (
                            <div className="flex items-center gap-2 mt-2 pt-1.5 border-t border-slate-100">
                              <button
                                type="button"
                                onClick={() => handleToggleHighlight(t.id)}
                                className={`flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded cursor-pointer transition-colors ${
                                  item.isHighlight
                                    ? 'bg-amber-100 text-amber-800 border border-amber-300'
                                    : 'bg-slate-50 text-slate-500 hover:bg-slate-100 border border-slate-200'
                                }`}
                                title="Marcar como Destaque principal no e-mail"
                              >
                                <Star className={`h-3 w-3 ${item.isHighlight ? 'fill-amber-500 text-amber-500' : ''}`} />
                                <span>{item.isHighlight ? 'Destaque' : '+ Destaque'}</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => handleToggleBlocker(t.id)}
                                className={`flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded cursor-pointer transition-colors ${
                                  item.isBlocker
                                    ? 'bg-rose-100 text-rose-800 border border-rose-300'
                                    : 'bg-slate-50 text-slate-500 hover:bg-slate-100 border border-slate-200'
                                }`}
                                title="Marcar como Impedimento / Risco crítico"
                              >
                                <AlertTriangle className={`h-3 w-3 ${item.isBlocker ? 'text-rose-600' : ''}`} />
                                <span>{item.isBlocker ? 'Impedimento' : '+ Risco'}</span>
                              </button>

                              <input
                                type="text"
                                placeholder="Nota opcional no e-mail..."
                                value={item.customNote || ''}
                                onChange={(e) => handleCustomNoteChange(t.id, e.target.value)}
                                className="flex-1 text-[10px] px-2 py-0.5 bg-slate-50 border border-slate-200 rounded text-slate-700 outline-hidden"
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Bottom Supplementary Notes Accordion */}
            <div className="p-3 bg-white border-t border-slate-200 space-y-2 shrink-0">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-bold text-slate-700 block uppercase">
                    Obs. Impedimentos
                  </label>
                  <input
                    type="text"
                    value={blockersNotes}
                    onChange={(e) => setBlockersNotes(e.target.value)}
                    placeholder="Ações de mitigação..."
                    className="w-full text-xs p-1.5 bg-slate-50 border border-slate-200 rounded"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-700 block uppercase">
                    Próximos Passos
                  </label>
                  <input
                    type="text"
                    value={nextStepsNotes}
                    onChange={(e) => setNextStepsNotes(e.target.value)}
                    placeholder="Metas da próxima sprint..."
                    className="w-full text-xs p-1.5 bg-slate-50 border border-slate-200 rounded"
                  />
                </div>
              </div>
            </div>

          </div>

          {/* RIGHT COLUMN: INTERACTIVE EMAIL PREVIEW & ACTIONS (7 COLS) */}
          <div className="lg:col-span-7 flex flex-col bg-slate-100 overflow-hidden">
            
            {/* Action Bar & Tabs */}
            <div className="px-4 py-3 bg-white border-b border-slate-200 flex flex-wrap items-center justify-between gap-2 shrink-0">
              
              {/* Tab Switcher */}
              <div className="flex items-center bg-slate-100 p-1 rounded-lg border border-slate-200 text-xs">
                <button
                  type="button"
                  onClick={() => setPreviewTab('preview')}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-md font-bold transition-all cursor-pointer ${
                    previewTab === 'preview'
                      ? 'bg-white text-[#343180] shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Eye className="h-3.5 w-3.5" />
                  <span>Preview Visual</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewTab('html')}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-md font-bold transition-all cursor-pointer ${
                    previewTab === 'html'
                      ? 'bg-white text-[#343180] shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Code className="h-3.5 w-3.5" />
                  <span>Código HTML</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewTab('text')}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-md font-bold transition-all cursor-pointer ${
                    previewTab === 'text'
                      ? 'bg-white text-[#343180] shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <FileText className="h-3.5 w-3.5" />
                  <span>Texto / Chat</span>
                </button>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleCopyRichHtml}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[#343180] hover:bg-[#282666] text-white text-xs font-bold shadow-xs hover:shadow-md transition-all cursor-pointer"
                  title="Copiar com formatação completa para colar no Outlook ou Gmail"
                >
                  <Copy className="h-3.5 w-3.5 text-amber-300" />
                  <span>Copiar E-mail Formatado</span>
                </button>

                <button
                  type="button"
                  onClick={handleDownloadHtml}
                  className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg border border-slate-200 transition-colors cursor-pointer"
                  title="Baixar arquivo .html"
                >
                  <Download className="h-4 w-4" />
                </button>

                <button
                  type="button"
                  onClick={handleOpenMailto}
                  className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg border border-slate-200 transition-colors cursor-pointer"
                  title="Abrir no aplicativo de e-mail (mailto)"
                >
                  <Send className="h-4 w-4" />
                </button>
              </div>

            </div>

            {/* Preview Container */}
            <div className="flex-1 overflow-y-auto p-4 flex justify-center">
              {previewTab === 'preview' && (
                <div className="w-full max-w-2xl bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden self-start">
                  <div
                    dangerouslySetInnerHTML={{ __html: generatedHtmlEmail }}
                    className="status-report-preview-body"
                  />
                </div>
              )}

              {previewTab === 'html' && (
                <div className="w-full max-w-3xl bg-slate-900 rounded-xl p-4 text-slate-100 font-mono text-xs overflow-x-auto shadow-inner">
                  <div className="flex justify-between items-center pb-2 mb-2 border-b border-slate-800 text-slate-400">
                    <span>HTML Responsivo para E-mail Corporativo</span>
                    <button
                      type="button"
                      onClick={handleCopyHtmlCode}
                      className="text-xs text-amber-400 hover:underline flex items-center gap-1"
                    >
                      <Copy className="h-3 w-3" />
                      <span>Copiar código HTML</span>
                    </button>
                  </div>
                  <pre className="whitespace-pre-wrap">{generatedHtmlEmail}</pre>
                </div>
              )}

              {previewTab === 'text' && (
                <div className="w-full max-w-3xl bg-white rounded-xl p-6 border border-slate-200 text-slate-800 font-sans text-xs whitespace-pre-wrap leading-relaxed shadow-sm">
                  <div className="flex justify-between items-center pb-3 mb-3 border-b border-slate-100 text-slate-400">
                    <span className="font-semibold text-slate-700">Versão Formatada para Slack, Teams e WhatsApp</span>
                    <button
                      type="button"
                      onClick={handleCopyPlainText}
                      className="text-xs text-[#343180] font-bold hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <Copy className="h-3.5 w-3.5" />
                      <span>Copiar Texto</span>
                    </button>
                  </div>
                  {generatedPlainText}
                </div>
              )}
            </div>

            {/* Bottom Tip Bar */}
            <div className="px-4 py-2 bg-slate-50 border-t border-slate-200 text-[11px] text-slate-500 flex items-center justify-between shrink-0">
              <span className="flex items-center gap-1.5">
                <Info className="h-3.5 w-3.5 text-[#343180]" />
                <span>Dica: Use <strong>"Copiar E-mail Formatado"</strong> e pressione <strong>Ctrl+V</strong> direto no corpo do Outlook ou Gmail.</span>
              </span>
              <span className="font-semibold text-slate-600">Doc24 Tecnologia</span>
            </div>

          </div>

        </div>

      </div>
    </div>
  );
}
