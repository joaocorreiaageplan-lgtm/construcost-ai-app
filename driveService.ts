import { extractPRCode } from './mockDataService';

const ROOT_FOLDER_ID = '1-IAFNjeRjt4p_hZB_c0Si8myi60u6PfY';

export interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  webViewLink: string;
  modifiedTime: string;
  prCode: string | null;
  revision: number;
}

/**
 * Extrai o número da revisão de strings como "rev01", "rev.02", "v3", etc.
 */
export const extractRevisionNumber = (name: string): number => {
  const match = name.match(/rev[\s._-]?(\d+)/i) || 
                name.match(/v(\d+)/i) || 
                name.match(/_r(\d+)/i);
  return match ? parseInt(match[1], 10) : 0;
};

/**
 * Realiza a listagem real de arquivos na pasta pública do Google Drive.
 * Utiliza abordagem mais robusta para extrair PDFs da pasta 2025.
 */
export const listLatestPrFiles = async (): Promise<DriveFile[]> => {
  try {
    const url = `https://drive.google.com/embeddedfolderview?id=${ROOT_FOLDER_ID}`;
    const response = await fetch(url);
    if (!response.ok) {
      console.error('Falha ao acessar a pasta do Drive:', response.status);
      return [];
    }
    
    const html = await response.text();
    
    // Regex mais flexível para capturar arquivos PDF
    // Busca por padrões que contenham IDs do Drive (33 caracteres) seguidos de nomes .pdf
    const allFiles: DriveFile[] = [];
    
    // Padrão 1: Formato JSON em arrays JavaScript do Drive
    const jsonPattern = /\["([A-Za-z0-9_-]{25,})",\s*"([^"]*\.pdf[^"]*)"/gi;
    let match;
    
    while ((match = jsonPattern.exec(html)) !== null) {
      const id = match[1];
      const name = match[2];
      
      // Filtrar apenas IDs válidos do Drive (geralmente 33 caracteres)
      if (id.length >= 25 && name.toLowerCase().endsWith('.pdf')) {
        const prCode = extractPRCode(name);
        if (prCode) {
          allFiles.push({
            id: id,
            name: name,
            mimeType: 'application/pdf',
            webViewLink: `https://drive.google.com/file/d/${id}/view`,
            modifiedTime: new Date().toISOString(),
            prCode: prCode,
            revision: extractRevisionNumber(name)
          });
        }
      }
    }
    
    console.log(`Drive scan: encontrados ${allFiles.length} arquivos PDF com PR code`);
    
    // Agrupar por PR e selecionar a maior revisão
    const prGroups: Record<string, DriveFile> = {};
    allFiles.forEach(file => {
      if (!file.prCode) return;
      const existing = prGroups[file.prCode];
      if (!existing || file.revision > existing.revision) {
        prGroups[file.prCode] = file;
      }
    });
    
    const result = Object.values(prGroups);
    console.log(`Drive scan: ${result.length} PRs únicos (última revisão)`);
    return result;
    
  } catch (error) {
    console.error("Erro ao listar arquivos reais do Drive:", error);
    return [];
  }
};

/**
 * Obtém o conteúdo REAL do arquivo em Base64 através do link de download direto do Google Drive.
 */
export const getFileBase64 = async (fileId: string): Promise<string> => {
  try {
    // Link de download direto para arquivos públicos
    const url = `https://drive.google.com/uc?export=download&id=${fileId}`;
    
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Erro de download: ${response.status}`);
    
    const blob = await response.blob();
    
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.error(`Erro ao obter Base64 real do arquivo ${fileId}:`, error);
    throw error;
  }
};
