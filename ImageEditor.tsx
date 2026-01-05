import React, { useState, useRef } from 'react';
import { Upload, Wand2, Loader2, Save, Image as ImageIcon } from 'lucide-react';
import { editImageWithG'./geminiService'geminiService';

const ImageEditor: React.FC = () => {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [prompt, setPrompt] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [resultImage, setResultImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        setSelectedImage(base64String);
        setResultImage(null); // Reset previous result
      };
      reader.readAsDataURL(file);
    }
  };

  const handleGenerate = async () => {
    if (!selectedImage || !prompt) return;

    setIsProcessing(true);
    try {
      const result = await editImageWithGemini(selectedImage, prompt);
      setResultImage(result);
    } catch (error) {
      alert("Falha ao editar imagem. Por favor, tente novamente.");
      console.error(error);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
          <Wand2 className="text-purple-600" />
          Editor de Fotos de Obra com IA
        </h1>
        <p className="text-gray-600">
          Faça upload de fotos da obra ou plantas e use IA para visualizar mudanças, adicionar filtros ou limpar imagens.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Input Section */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col gap-6">
          <h2 className="text-lg font-semibold text-gray-800">Imagem Original</h2>
          
          <div 
            className={`
              flex-1 min-h-[300px] border-2 border-dashed rounded-xl flex items-center justify-center overflow-hidden relative bg-gray-50
              ${!selectedImage ? 'border-gray-300 hover:border-blue-400 cursor-pointer transition-colors' : 'border-blue-200'}
            `}
            onClick={() => !selectedImage && fileInputRef.current?.click()}
          >
            {selectedImage ? (
              <>
                <img src={selectedImage} alt="Source" className="w-full h-full object-contain absolute inset-0" />
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedImage(null);
                    setResultImage(null);
                  }}
                  className="absolute top-2 right-2 bg-white p-1.5 rounded-full shadow-md hover:bg-gray-100 text-gray-600"
                >
                  <Upload className="w-4 h-4 rotate-45" /> {/* Use generic icon to simulate remove/close */}
                </button>
              </>
            ) : (
              <div className="text-center p-6">
                <div className="mx-auto w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center mb-3">
                  <Upload className="w-6 h-6 text-blue-500" />
                </div>
                <p className="text-sm font-medium text-gray-900">Clique para fazer upload</p>
                <p className="text-xs text-gray-500 mt-1">PNG, JPG até 5MB</p>
              </div>
            )}
            <input 
              type="file" 
              ref={fileInputRef} 
              className="hidden" 
              accept="image/*" 
              onChange={handleFileChange}
            />
          </div>

          <div className="space-y-3">
            <label className="text-sm font-medium text-gray-700">Prompt IA</label>
            <div className="flex gap-2">
              <input 
                type="text" 
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="ex: Adicionar um filtro retrô, Remover pessoa do fundo"
                className="flex-1 border rounded-lg px-4 py-2 focus:ring-2 focus:ring-purple-500 outline-none"
                onKeyDown={(e) => e.key === 'Enter' && handleGenerate()}
              />
              <button
                onClick={handleGenerate}
                disabled={!selectedImage || !prompt || isProcessing}
                className={`
                  px-6 py-2 rounded-lg font-medium text-white flex items-center gap-2 transition-all
                  ${!selectedImage || !prompt || isProcessing 
                    ? 'bg-gray-300 cursor-not-allowed' 
                    : 'bg-purple-600 hover:bg-purple-700 shadow-md hover:shadow-lg'}
                `}
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Gerando...
                  </>
                ) : (
                  <>
                    <Wand2 className="w-4 h-4" />
                    Gerar
                  </>
                )}
              </button>
            </div>
            <p className="text-xs text-gray-500">
              Desenvolvido com Gemini 2.5 Flash Image. Descreva as alterações que deseja ver.
            </p>
          </div>
        </div>

        {/* Output Section */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col gap-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-800">Resultado</h2>
            {resultImage && (
              <a 
                href={resultImage} 
                download="edited_image.png"
                className="text-sm text-blue-600 hover:underline flex items-center gap-1"
              >
                <Save className="w-4 h-4" /> Salvar
              </a>
            )}
          </div>
          
          <div className="flex-1 min-h-[300px] border rounded-xl flex items-center justify-center overflow-hidden bg-gray-50 relative">
            {resultImage ? (
              <img src={resultImage} alt="Result" className="w-full h-full object-contain absolute inset-0" />
            ) : (
              <div className="text-center p-6 text-gray-400">
                {isProcessing ? (
                  <div className="flex flex-col items-center gap-3">
                    <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
                    <p>A IA está reimaginando sua imagem...</p>
                  </div>
                ) : (
                  <>
                    <ImageIcon className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>Imagem gerada aparecerá aqui</p>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ImageEditor;
