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
 * Utiliza o endpoint de visualização incorporada para obter IDs e nomes sem necessidade de API Key autenticada.
 */
export const listLatestPrFiles = async (): Promise<DriveFile[]> => {
  try {
    const url = `https://drive.google.com/embeddedfolderview?id=${ROOT_FOLDER_ID}`;
    const response = await fetch(url);
    if (!response.ok) throw new Error("Falha ao acessar a pasta do Drive.");
    
    const html = await response.text();
    
    // Regex para capturar padrões de dados de arquivos no HTML do Drive
    // Padrão comum em JS de pastas do Drive: ["ID", "NOME", "MIMETYPE", ...]
    const fileRegex = /"([^"]+)","([^"]+\.pdf)","application\/pdf"/g;
    const allFiles: DriveFile[] = [];
    let match;
    
    while ((match = fileRegex.exec(html)) !== null) {
      const id = match[1];
      const name = match[2];
      
      // Filtrar apenas arquivos que parecem ser IDs válidos do Drive
      if (id.length > 20) {
        allFiles.push({
          id: id,
          name: name,
          mimeType: 'application/pdf',
          webViewLink: `https://drive.google.com/file/d/${id}/view`,
          modifiedTime: new Date().toISOString(),
          prCode: extractPRCode(name),
          revision: extractRevisionNumber(name)
        });
      }
    }

    // Agrupar por PR e selecionar a maior revisão
    const prGroups: Record<string, DriveFile> = {};
    allFiles.forEach(file => {
      if (!file.prCode) return;
      const existing = prGroups[file.prCode];
      if (!existing || file.revision > existing.revision) {
        prGroups[file.prCode] = file;
      }
    });

    return Object.values(prGroups);
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
    // Link de download direto para arquivos públicos (contorna restrições de API em arquivos pequenos)
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
