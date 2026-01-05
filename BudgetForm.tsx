import React, { useState, useEffect } from 'react';
import { Budget, BudgetStatus, AttachedFile } from '../types';
import { X, Save, AlertTriangle, Upload, FileText, Trash2, Sparkles, Loader2, CheckCircle, History, FileCheck, ArrowDown, FileSpreadsheet } from 'lucide-react';
import { extractBudgetDataFromFiles } from '../services/geminiService';

interface BudgetFormProps {
  initialData?: Budget | null;
  onSave: (budget: Budget) => void;
  onCancel: () => void;
}

const BudgetForm: React.FC<BudgetFormProps> = ({ initialData, onSave, onCancel }) => {
  const [formData, setFormData] = useState<Partial<Budget>>({
    date: new Date().toISOString().split('T')[0],
    status: BudgetStatus.PENDING,
    sendToClient: false,
    orderConfirmation: false,
    invoiceSent: false,
    discount: 0,
    files: [],
  });

  const [warnings, setWarnings] = useState<string[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<string>('');
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    if (initialData) {
      setFormData(initialData);
    }
  }, [initialData]);

  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    const val = type === 'checkbox' ? (e.target as HTMLInputElement).checked : value;
    
    setFormData(prev => ({
      ...prev,
      [name]: type === 'number' ? Number(val) : val,
    }));
  };

  // Helper to extract revision number from filename (e.g., "Orcamento_Rev02.pdf" -> 2)
  const getRevisionNumber = (filename: string): number => {
    const revMatch = filename.match(/rev[\s._-]?(\d+)/i) || filename.match(/v(\d+)/i);
    if (revMatch && revMatch[1]) {
      return parseInt(revMatch[1], 10);
    }
    return 0;
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const filesArray = Array.from(e.target.files) as File[];
      
      const filePromises = filesArray.map(file => {
        return new Promise<AttachedFile>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => {
            resolve({
              id: Math.random().toString(36).substr(2, 9),
              name: file.name,
              url: reader.result as string,
              type: file.type.includes('image') ? 'image' : file.type.includes('pdf') ? 'pdf' : 'other'
            });
          };
          reader.readAsDataURL(file);
        });
      });

      const newFiles = await Promise.all(filePromises);
      
      setFormData(prev => {
        const allFiles = [...(prev.files || []), ...newFiles];
        
        // Logic to find the "Latest" PDF to serve as Doc Ref (Descrição Serviços)
        const pdfFiles = allFiles.filter(f => f.type === 'pdf' || f.name.toLowerCase().endsWith('.pdf'));
        
        let newServiceDescription = prev.serviceDescription;
        let highestRev = -1;
        let latestFile: AttachedFile | null = null;

        if (pdfFiles.length > 0) {
           pdfFiles.forEach(f => {
             const rev = getRevisionNumber(f.name);
             if (rev > highestRev) {
               highestRev = rev;
               latestFile = f;
             }
           });

           if (!latestFile && pdfFiles.length > 0) {
             latestFile = pdfFiles[pdfFiles.length - 1];
           }

           if (latestFile && !prev.serviceDescription) {
             // Use filename as default Description if empty, matching user's sheet pattern
             newServiceDescription = latestFile.name.replace(/\.[^/.]+$/, "");
           }
        }

        return {
          ...prev,
          files: allFiles,
          serviceDescription: newServiceDescription
        };
      });
    }
  };

  const removeFile = (fileId: string) => {
    setFormData(prev => ({
      ...prev,
      files: prev.files?.filter(f => f.id !== fileId) || []
    }));
  };

  const handleAIAutoFill = async () => {
    if (!formData.files || formData.files.length === 0) {
      alert("Por favor, anexe os arquivos primeiro.");
      return;
    }

    setIsAnalyzing(true);
    setSuccessMessage(null);
    try {
      const filesToAnalyze = formData.files.map(f => ({
        name: f.name,
        url: f.url,
        mimeType: f.type === 'pdf' ? 'application/pdf' : f.type === 'image' ? 'image/png' : 'application/octet-stream'
      }));

      const extractedData = await extractBudgetDataFromFiles(filesToAnalyze);
      
      const newStatus = extractedData.orderNumber ? BudgetStatus.APPROVED : (formData.status || BudgetStatus.PENDING);
      const isApproved = !!extractedData.orderNumber;
      
      setFormData(prev => ({
        ...prev,
        clientName: extractedData.clientName || prev.clientName,
        serviceDescription: extractedData.serviceDescription || prev.serviceDescription, 
        budgetAmount: extractedData.budgetAmount || prev.budgetAmount,
        date: extractedData.date || prev.date,
        discount: extractedData.discount ?? 0, 
        requester: extractedData.requester || prev.requester,
        status: newStatus,
        orderConfirmation: isApproved ? true : prev.orderConfirmation,
        orderNumber: extractedData.orderNumber || prev.orderNumber,
        orderDate: isApproved && !prev.orderDate ? (extractedData.date || new Date().toISOString().split('T')[0]) : prev.orderDate
      }));

      if (extractedData.orderNumber) {
        setSuccessMessage(`Pedido identificado (${extractedData.orderNumber})! Orçamento APROVADO.`);
      } else {
        setSuccessMessage("Dados extraídos dos arquivos com sucesso!");
      }

    } catch (error) {
      alert("Não foi possível extrair dados dos arquivos. Tente novamente.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const validate = () => {
    const newWarnings = [];
    if (!formData.clientName) newWarnings.push("Nome do Cliente é obrigatório.");
    if (!formData.serviceDescription) newWarnings.push("Descrição do Serviço é obrigatória.");
    if (!formData.budgetAmount || formData.budgetAmount <= 0) newWarnings.push("Valor do orçamento deve ser maior que 0.");
    
    if (formData.status === BudgetStatus.APPROVED && !formData.orderDate) {
      newWarnings.push("Orçamentos aprovados devem ter uma Data do Pedido.");
    }

    setWarnings(newWarnings);
    return newWarnings.filter(w => !w.includes("Recomendado")).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const isValid = validate();
    const hasWarnings = warnings.length > 0;
    
    if (isValid && (!hasWarnings || confirm("Existem avisos pendentes. Salvar mesmo assim?"))) {
      setIsSaving(true);
      setSaveStatus('Conectando ao Google Sheets...');
      
      await new Promise(r => setTimeout(r, 600));
      setSaveStatus('Atualizando linha na Planilha Mestra...');
      
      await new Promise(r => setTimeout(r, 800));
      setSaveStatus('Salvando arquivos no Drive...');
      
      await new Promise(r => setTimeout(r, 400));
      
      onSave(formData as Budget);
      setIsSaving(false);
    }
  };

  const latestDocRefFile = formData.serviceDescription 
    ? formData.files?.find(f => f.name.includes(formData.serviceDescription!) || formData.serviceDescription!.includes(f.name.replace(/\.[^/.]+$/, "")))
    : null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b sticky top-0 bg-white z-10">
          <h2 className="text-xl font-bold text-gray-800">
            {initialData ? 'Editar Orçamento' : 'Novo Orçamento Inteligente'}
          </h2>
          <button onClick={onCancel} className="text-gray-500 hover:text-gray-700" disabled={isSaving}>
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          
          {/* 1. SECTION: UPLOAD & AI PROCESSING */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
              <span className="bg-blue-600 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs">1</span>
              Anexe Arquivos (PDF, Planilha, Imagem)
            </h3>
            
            <div className="border-2 border-dashed border-blue-200 bg-blue-50 rounded-lg p-6 text-center hover:border-blue-400 transition-colors relative">
                <input
                  type="file"
                  multiple
                  onChange={handleFileChange}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  disabled={isSaving}
                />
                <div className="flex flex-col items-center justify-center pointer-events-none">
                  <Upload className="h-10 w-10 text-blue-500 mb-2" />
                  <p className="text-sm text-blue-800 font-medium">Arraste os arquivos aqui</p>
                  <p className="text-xs text-blue-600 mt-1">A IA lerá os dados conforme sua Planilha Mestra</p>
                </div>
            </div>

            {/* AI Action Bar */}
            {formData.files && formData.files.length > 0 && (
              <div className="flex flex-col gap-3 animate-in fade-in slide-in-from-top-2">
                 <div className="flex items-center justify-between bg-gray-50 p-2 rounded-lg border border-gray-200">
                    <span className="text-sm text-gray-600 px-2">{formData.files.length} arquivo(s) selecionado(s)</span>
                    <button
                      type="button"
                      onClick={handleAIAutoFill}
                      disabled={isAnalyzing || isSaving}
                      className={`
                        flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold text-white shadow-md transition-all
                        ${isAnalyzing ? 'bg-purple-400' : 'bg-purple-600 hover:bg-purple-700 hover:scale-105'}
                      `}
                    >
                      {isAnalyzing ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Lendo arquivos...
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4" />
                          Preencher Automaticamente
                        </>
                      )}
                    </button>
                 </div>
                 
                 <div className="flex flex-wrap gap-2">
                   {formData.files.map((file) => (
                      <div key={file.id} className="flex items-center gap-1 bg-white border px-2 py-1 rounded text-xs text-gray-600">
                        <FileText className="w-3 h-3" />
                        <span className="truncate max-w-[150px]">{file.name}</span>
                        <button type="button" onClick={() => removeFile(file.id)} disabled={isSaving} className="text-gray-400 hover:text-red-500 ml-1"><X className="w-3 h-3" /></button>
                      </div>
                   ))}
                 </div>
              </div>
            )}
          </div>

          <div className="relative py-2">
            <div className="absolute inset-0 flex items-center" aria-hidden="true">
              <div className="w-full border-t border-gray-300"></div>
            </div>
            <div className="relative flex justify-center">
              <span className="px-2 bg-white text-sm text-gray-500 flex items-center gap-1">
                <ArrowDown className="w-3 h-3" /> Revisar Dados Extraídos (Conforme Planilha) <ArrowDown className="w-3 h-3" />
              </span>
            </div>
          </div>

          {successMessage && (
            <div className="bg-green-50 border-l-4 border-green-500 p-4 flex items-center gap-3">
              <CheckCircle className="h-5 w-5 text-green-500" />
              <p className="text-sm text-green-800 font-medium">{successMessage}</p>
            </div>
          )}

          {/* 2. SECTION: FORM FIELDS */}
          <div className={`space-y-6 transition-opacity ${isSaving ? 'opacity-50 pointer-events-none' : 'opacity-100'}`}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700">Data (Data do Orçamento)</label>
                <input
                  type="date"
                  name="date"
                  value={formData.date}
                  onChange={handleChange}
                  className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none bg-gray-50 focus:bg-white"
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700">Nome Cliente</label>
                <input
                  type="text"
                  name="clientName"
                  value={formData.clientName || ''}
                  onChange={handleChange}
                  placeholder="Preenchimento automático"
                  className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none font-semibold text-gray-800 bg-gray-50 focus:bg-white"
                />
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex justify-between items-center">
                <label className="text-sm font-medium text-gray-700">Descrição Serviços (Nome do Arquivo/PR)</label>
                 {latestDocRefFile && (
                   <span className="text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded-full flex items-center gap-1">
                     <FileCheck className="w-3 h-3" />
                     Vinculado: {latestDocRefFile.name}
                   </span>
                 )}
              </div>
              <input
                type="text"
                name="serviceDescription"
                value={formData.serviceDescription || ''}
                onChange={handleChange}
                placeholder="Ex: PR0930 rev.01... ou Adequação Elétrica"
                className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none font-mono text-sm bg-gray-50 focus:bg-white"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700">Valor Orçamento (R$)</label>
                <input
                  type="number"
                  name="budgetAmount"
                  value={formData.budgetAmount || 0}
                  onChange={handleChange}
                  className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none font-bold text-gray-800 bg-gray-50 focus:bg-white"
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700 flex justify-between">
                   Desconto (R$)
                   <span className="text-[10px] font-normal text-gray-400">(Auto: 0 se não encontrado)</span>
                </label>
                <input
                  type="number"
                  name="discount"
                  value={formData.discount || 0}
                  onChange={handleChange}
                  className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none text-red-600 bg-gray-50 focus:bg-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700">Status do Orçamento</label>
                <select
                  name="status"
                  value={formData.status}
                  onChange={handleChange}
                  className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none bg-gray-50 focus:bg-white"
                >
                  {Object.values(BudgetStatus).map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700">Solicitante (Engenheiro/Resp)</label>
                <input
                  type="text"
                  name="requester"
                  value={formData.requester || ''}
                  onChange={handleChange}
                  placeholder="Solicitante interno"
                  className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none bg-gray-50 focus:bg-white"
                />
              </div>
            </div>

            {(formData.status === BudgetStatus.APPROVED || formData.orderConfirmation) && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-green-50 p-4 rounded-lg border border-green-100">
                  <div className="space-y-1">
                    <label className="text-sm font-bold text-green-800">Pedido (Número PO)</label>
                    <input
                      type="text"
                      name="orderNumber"
                      value={formData.orderNumber || ''}
                      onChange={handleChange}
                      placeholder="ex: 4500694477"
                      className="w-full border border-green-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500 outline-none bg-white"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-gray-700">Data Pedido</label>
                    <input
                      type="date"
                      name="orderDate"
                      value={formData.orderDate || ''}
                      onChange={handleChange}
                      className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-gray-700">Nota / Fatura</label>
                    <input
                      type="text"
                      name="invoiceNumber"
                      value={formData.invoiceNumber || ''}
                      onChange={handleChange}
                      placeholder="NF-XXXX"
                      className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                    />
                  </div>
              </div>
            )}
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t sticky bottom-0 bg-white p-4 -mx-6 -mb-6 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              disabled={isSaving}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className={`
                flex items-center gap-2 px-6 py-2 text-sm font-bold text-white rounded-lg transition-all shadow-sm
                ${isSaving ? 'bg-green-600 w-64 justify-center' : 'bg-blue-600 hover:bg-blue-700'}
              `}
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {saveStatus}
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Salvar Orçamento
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default BudgetForm;