import React, { useState, useEffect } from 'react';
import { Save, Cloud, CheckCircle, RefreshCw, Folder, Mail, Bell, Key, Database, Download, ExternalLink, Info, ShieldCheck } from 'lucide-react';
import { getSettings, saveSettings, AppSettings, getBudgets } from './mockDataService'
import { openAiStudioKeySelector, isKeySe'./geminiService'eminiService';

const Settings: React.FC = () => {
  const [settings, setSettings] = useState<AppSettings>(getSettings());
  const [isSaving, setIsSaving] = useState(false);
  const [hasGoogleKey, setHasGoogleKey] = useState(false);

  useEffect(() => {
    const checkKey = async () => {
      const selected = await isKeySelected();
      setHasGoogleKey(selected);
    };
    checkKey();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setSetti(prev: any)prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSelectKey = async () => {
    const success = await openAiStudioKeySelector();
    if (success) {
      setHasGoogleKey(true);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    await new Promise(resolve => setTimeout(resolve, 800));
    saveSettings(settings);
    setIsSaving(false);
    alert("Configurações salvas com sucesso!");
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-12">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold text-gray-800">Configurações do Sistema</h1>
        <p className="text-gray-500">Gerencie as chaves de IA e preferências de sincronização.</p>
      </div>

      {/* Google AI Studio Key Selector Card */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-6 border-b border-gray-100 bg-blue-50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${hasGoogleKey ? 'bg-green-100 text-green-600' : 'bg-blue-100 text-blue-600'}`}>
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-800">Autenticação Google AI</h2>
              <p className="text-sm text-gray-500">Gerencie o acesso aos modelos Gemini</p>
            </div>
          </div>
          {hasGoogleKey && (
            <span className="flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 text-xs font-bold rounded-full">
              <CheckCircle className="w-3 h-3" /> CHAVE ATIVA
            </span>
          )}
        </div>
        <div className="p-6 space-y-4">
          <p className="text-sm text-gray-600">
            Para que o sistema consiga ler PDFs e editar imagens, você precisa selecionar uma chave de API válida vinculada a um projeto com faturamento ativado no Google Cloud.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 items-center">
            <button
              onClick={handleSelectKey}
              className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 transition-all shadow-md active:scale-95"
            >
              <Key className="w-4 h-4" />
              {hasGoogleKey ? 'Alterar Chave do AI Studio' : 'Selecionar Chave no Google AI Studio'}
            </button>
            <a 
              href="https://ai.google.dev/gemini-api/docs/billing" 
              target="_blank" 
              rel="noreferrer"
              className="text-xs text-blue-600 hover:underline flex items-center gap-1"
            >
              Documentação de Faturamento <ExternalLink className="w-3 h-3" />
            </a>
          </div>
          {!hasGoogleKey && (
            <div className="p-3 bg-yellow-50 border border-yellow-100 rounded-lg flex gap-2 items-start animate-pulse">
              <Info className="w-4 h-4 text-yellow-600 mt-0.5" />
              <p className="text-xs text-yellow-700">
                A IA não funcionará até que você clique no botão acima e selecione uma chave.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Legacy Credentials (Fallback) */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden opacity-60">
        <div className="p-6 border-b border-gray-100 flex items-center gap-3">
          <Database className="w-5 h-5 text-gray-400" />
          <h2 className="text-md font-medium text-gray-700">Outras Credenciais (Google Sheets/Drive)</h2>
        </div>
        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-xs font-medium text-gray-500">Client ID</label>
            <input type="text" name="googleClientId" value={settings.googleClientId} onChange={handleChange} className="w-full border rounded p-2 text-xs bg-gray-50" />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-gray-500">API Key Adicional</label>
            <input type="password" name="googleApiKey" value={settings.googleApiKey} onChange={handleChange} className="w-full border rounded p-2 text-xs bg-gray-50" />
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="flex items-center gap-2 px-8 py-3 bg-green-600 text-white rounded-lg font-bold hover:bg-green-700 transition-all shadow-sm"
        >
          {isSaving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Salvar Preferências
        </button>
      </div>
    </div>
  );
};

export default Settings;
