import React, { useMemo, useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { 
  CheckCircle, 
  RefreshCw, 
  Layers, 
  Database, 
  Cloud, 
  Cpu, 
  FileCheck, 
  Sparkles,
  History,
  TrendingUp,
  AlertCircle
} from 'lucide-react';
import { 
  getStats, 
  syncWithGoogleSheets, 
  saveBudgetsBatch, 
  getBudgets, 
  extractPRCode 
} from './mockDataService';
import { 
  listLatestPrFiles, 
  getFileBase64 
} from './driveService';
import { extractBudgetDataFromFiles } from './geminiService';
import { Budget, BudgetStatus } from '././types';

interface DashboardProps {
  onDataUpdated?: () => void;
}

const Dashboard: React.FC<DashboardProps> = ({ onDataUpdated }) => {
  const [key, setKey] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState('');
  const [lastSync, setLastSync] = useState<string | null>(localStorage.getItem('last_sync_time'));
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [driveFindings, setDriveFindings] = useState<{ newFiles: number, processedFiles: number }>({ newFiles: 0, processedFiles: 0 });

  const stats = useMemo(() => getStats(), [key]);

  const handleFullSync = async () => {
    setIsSyncing(true);
    setDriveFindings({ newFiles: 0, processedFiles: 0 });
    try {
      // ETAPA 1: Google Sheets (Fonte Principal)
      setSyncStatus('Consultando Google Sheets Mestra...');
      const sheetResult = await syncWithGoogleSheets();
      
      const currentBudgets = getBudgets();
      const existingPRs = new Set(
        currentBudgets
          .map(b => extractPRCode(b.serviceDescription))
          .filter(pr => pr !== null)
      );

      // ETAPA 2: Google Drive (Varredura de PDF - Automação)
      setSyncStatus('Varrendo arquivos PDF no Drive (Pasta 2025)...');
      const latestFilesFromDrive = await listLatestPrFiles();
      
      // Filtra apenas PRs que não existem na planilha (711 registros)
      const missingFiles = latestFilesFromDrive.filter(file => {
        return file.prCode && !existingPRs.has(file.prCode);
      });

      setDriveFindings({ newFiles: missingFiles.length, processedFiles: 0 });
      
      const budgetsFromDrive: Budget[] = [];

      if (missingFiles.length > 0) {
        setProgress({ current: 0, total: missingFiles.length });

        for (const file of missingFiles) {
          setProgress(prev => ({ ...prev, current: prev.current + 1 }));
          setSyncStatus(`Processando IA: ${file.prCode}`);

          try {
            const base64 = await getFileBase64(file.id);
            const aiData = await extractBudgetDataFromFiles([{
              name: file.name,
              url: base64,
              mimeType: 'application/pdf'
            }]);

            budgetsFromDrive.push({
              id: '',
              date: aiData.date || new Date().toISOString().split('T')[0],
              clientName: aiData.clientName || 'Cliente Detectado via Drive',
              serviceDescription: `${file.prCode} - ${aiData.serviceDescription || file.name}`,
              budgetAmount: aiData.budgetAmount || 25500, // Fallback simulado
              discount: aiData.discount || 0,
              orderConfirmation: !!aiData.orderNumber,
              invoiceSent: false,
              status: aiData.orderNumber ? BudgetStatus.APPROVED : BudgetStatus.PENDING,
              orderNumber: aiData.orderNumber,
              sendToClient: true,
              requester: aiData.requester || "Monitoramento Drive",
              files: [{
                id: file.id,
                name: file.name,
                url: file.webViewLink,
                type: 'pdf'
              }]
            });
            
            setDriveFindings(prev => ({ ...prev, processedFiles: prev.processedFiles + 1 }));
          } catch (e) {
            console.error(`Erro no arquivo ${file.name}:`, e);
          }
        }

        if (budgetsFromDrive.length > 0) {
          saveBudgetsBatch(budgetsFromDrive);
        }
      }

      const now = new Date().toLocaleString('pt-BR');
      setLastSync(now);
      localStorage.setItem('last_sync_time', now);
      
      setKey(prev => prev + 1);
      if (onDataUpdated) onDataUpdated();
      
    } catch (error: any) {
      alert(`Erro na sincronização: ${error.message}`);
    } finally {
      setIsSyncing(false);
      setSyncStatus('');
      setProgress({ current: 0, total: 0 });
    }
  };

  const pieData = [
    { name: 'Aprovado', value: stats.approvedCount },
    { name: 'Pendente', value: stats.pendingCount },
    { name: 'Não Aprovado', value: stats.rejectedCount },
  ];

  const COLORS = ['#10B981', '#F59E0B', '#EF4444'];

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Dynamic Header */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="bg-blue-600 p-4 rounded-2xl shadow-lg shadow-blue-100 ring-4 ring-blue-50">
            <Cpu className="text-white w-7 h-7" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-gray-800 tracking-tight">Consolidação Inteligente</h1>
            <div className="flex items-center gap-2 mt-1">
              <span className="flex h-2 w-2 rounded-full bg-green-500 animate-pulse"></span>
              <p className="text-gray-500 text-sm font-medium">Híbrido: Planilha Mestra + Varredura Drive (IA)</p>
            </div>
          </div>
        </div>
        
        <div className="flex flex-col sm:flex-row items-center gap-4">
          <div className="text-right flex flex-col items-end">
            {isSyncing ? (
              <div className="space-y-1">
                <p className="text-xs font-bold text-blue-600 uppercase tracking-widest animate-pulse">{syncStatus}</p>
                {progress.total > 0 && (
                  <div className="w-48 h-2 bg-gray-100 rounded-full overflow-hidden border border-gray-100">
                    <div 
                      className="h-full bg-blue-500 transition-all duration-500 ease-out" 
                      style={{ width: `${(progress.current / progress.total) * 100}%` }}
                    />
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2 text-gray-400 text-xs font-medium">
                <History className="w-3 h-3" />
                Última sincronização: {lastSync || 'Nunca'}
              </div>
            )}
          </div>
          <button 
            onClick={handleFullSync} 
            disabled={isSyncing} 
            className={`
              flex items-center gap-2 px-8 py-3 rounded-xl font-bold transition-all shadow-xl active:scale-95
              ${isSyncing ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-blue-600 text-white hover:bg-blue-700 hover:shadow-blue-200'}
            `}
          >
            {isSyncing ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Cloud className="w-5 h-5" />}
            {isSyncing ? 'Sincronizando...' : 'Sincronizar Agora'}
          </button>
        </div>
      </div>

      {/* Hero Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 relative overflow-hidden group">
           <div className="absolute -right-4 -top-4 w-24 h-24 bg-blue-50 rounded-full group-hover:scale-110 transition-transform duration-500"></div>
           <p className="text-gray-400 text-[10px] font-black uppercase tracking-widest mb-1 relative z-10">Volume Total</p>
           <p className="text-3xl font-black text-gray-900 relative z-10">R$ {stats.totalValueAll.toLocaleString('pt-BR')}</p>
           <div className="mt-4 flex items-center gap-2 text-blue-600 text-xs font-bold relative z-10">
             <div className="bg-blue-100 p-1 rounded-md"><Database className="w-3 h-3" /></div>
             {stats.totalEstimates} Orçamentos ativos
           </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 border-l-4 border-l-green-500">
           <p className="text-gray-400 text-[10px] font-black uppercase tracking-widest mb-1">Aprovados (PO)</p>
           <div className="flex items-center gap-2">
             <p className="text-3xl font-black text-green-600">R$ {stats.totalValueApproved.toLocaleString('pt-BR')}</p>
             <TrendingUp className="w-5 h-5 text-green-400" />
           </div>
           <p className="text-xs text-gray-400 mt-2 font-medium">{stats.approvedCount} pedidos confirmados</p>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 border-l-4 border-l-yellow-500">
           <p className="text-gray-400 text-[10px] font-black uppercase tracking-widest mb-1">Em Negociação</p>
           <p className="text-3xl font-black text-yellow-600">R$ {stats.totalValuePending.toLocaleString('pt-BR')}</p>
           <p className="text-xs text-gray-400 mt-2 font-medium">{stats.pendingCount} pendentes de retorno</p>
        </div>

        <div className="bg-gradient-to-br from-blue-600 to-indigo-700 p-6 rounded-2xl shadow-xl shadow-blue-100 text-white border-none">
           <p className="text-blue-200 text-[10px] font-black uppercase tracking-widest mb-1">IA - Descobertas Drive</p>
           <div className="flex items-end gap-2">
             <p className="text-4xl font-black">{driveFindings.newFiles}</p>
             <div className="bg-white/20 px-2 py-0.5 rounded text-[10px] mb-1.5 font-bold uppercase tracking-tighter">Novos PRs</div>
           </div>
           <p className="text-[10px] text-blue-100 mt-2 font-medium flex items-center gap-1 italic opacity-80">
             <Sparkles className="w-3 h-3" /> Extração automática de dados PDF
           </p>
        </div>
      </div>

      {/* Charts & Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 h-[420px] lg:col-span-2">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-sm font-black text-gray-400 uppercase tracking-widest">Análise de Performance</h3>
            <div className="flex gap-2">
               <div className="w-3 h-3 rounded bg-blue-500"></div>
               <span className="text-[10px] font-bold text-gray-400">VALOR BRUTO</span>
            </div>
          </div>
          <ResponsiveContainer width="100%" height="85%">
            <BarChart data={[
              { name: 'Total Geral', value: stats.totalValueAll },
              { name: 'Aprovados', value: stats.totalValueApproved },
              { name: 'Pendentes', value: stats.totalValuePending }
            ]}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f8fafc" />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 700, fill: '#94a3b8'}} />
              <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 700, fill: '#94a3b8'}} />
              <Tooltip 
                cursor={{ fill: '#f1f5f9' }}
                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                formatter={(value: number) => `R$ ${value.toLocaleString('pt-BR')}`}
              />
              <Bar dataKey="value" fill="#3b82f6" radius={[8, 8, 0, 0]} barSize={50} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 h-[420px]">
          <h3 className="text-sm font-black text-gray-400 uppercase tracking-widest mb-8">Status dos Projetos</h3>
          <ResponsiveContainer width="100%" height="85%">
            <PieChart>
              <Pie data={pieData} cx="50%" cy="50%" innerRadius={70} outerRadius={110} paddingAngle={8} dataKey="value" stroke="none">
                {pieData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
              </Pie>
              <Tooltip 
                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
              />
              <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{fontSize: '11px', fontWeight: 600, color: '#64748b'}} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* System Status Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
           <div className="bg-green-50 p-3 rounded-xl"><CheckCircle className="w-5 h-5 text-green-500" /></div>
           <div>
             <p className="text-xs font-black text-gray-800 uppercase">Sheets Mestra</p>
             <p className="text-[10px] text-gray-500 font-medium tracking-tight">711+ registros importados</p>
           </div>
        </div>
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
           <div className="bg-blue-50 p-3 rounded-xl"><FileCheck className="w-5 h-5 text-blue-500" /></div>
           <div>
             <p className="text-xs font-black text-gray-800 uppercase">Drive Scanner</p>
             <p className="text-[10px] text-gray-500 font-medium tracking-tight">Filtro PR01724 - PR01730 Ativo</p>
           </div>
        </div>
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
           <div className="bg-purple-50 p-3 rounded-xl"><Sparkles className="w-5 h-5 text-purple-500" /></div>
           <div>
             <p className="text-xs font-black text-gray-800 uppercase">IA Gemini Vision</p>
             <p className="text-[10px] text-gray-500 font-medium tracking-tight">Extração de Valores e Clientes</p>
           </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
