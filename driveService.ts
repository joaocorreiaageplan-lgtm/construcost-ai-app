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
 * Usa abordagem híbrida: scraping + API pública.
 */
export const listLatestPrFiles = async (): Promise<DriveFile[]> => {
  try {
    console.log('🔍 Iniciando varredura do Drive - Pasta 2025...');
    
    // MÉTODO 1: Tentar via embeddedfolderview (scraping)
    let allFiles: DriveFile[] = await scrapeEmbeddedView();
    
    // MÉTODO 2: Se scraping falhou ou retornou poucos arquivos, tentar API pública
    if (allFiles.length < 20) {
      console.warn(`⚠️ Scraping retornou apenas ${allFiles.length} arquivos. Tentando API pública...`);
      const apiFiles = await fetchViaPublicAPI();
      if (apiFiles.length > allFiles.length) {
        console.log(`✅ API pública encontrou ${apiFiles.length} arquivos (melhor resultado)`);
        allFiles = apiFiles;
      }
    }
    
    console.log(`📁 Total encontrado: ${allFiles.length} arquivos PDF com código PR`);
    
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
    console.log(`✨ ${result.length} PRs únicos (última revisão cada)`);
    console.log(`📊 Range: ${result[0]?.prCode} até ${result[result.length-1]?.prCode}`);
    
    return result;
    
  } catch (error) {
    console.error("❌ Erro ao listar arquivos do Drive:", error);
    return [];
  }
};

/**
 * Método 1: Scraping do embeddedfolderview
 */
async function scrapeEmbeddedView(): Promise<DriveFile[]> {
  try {
    const url = `https://drive.google.com/embeddedfolderview?id=${ROOT_FOLDER_ID}`;
    const response = await fetch(url);
    if (!response.ok) {
      console.error('❌ Falha ao acessar embeddedfolderview:', response.status);
      return [];
    }
    
    const html = await response.text();
    const allFiles: DriveFile[] = [];
    
    // Pattern 1: Array format ["ID", "NOME.pdf", ...]
    const pattern1 = /\["([A-Za-z0-9_-]{25,})",\s*"([^"]*\.pdf[^"]*)"/gi;
    let match;
    
    while ((match = pattern1.exec(html)) !== null) {
      const id = match[1];
      const name = match[2];
      
      if (id.length >= 25 && name.toLowerCase().includes('.pdf')) {
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
    
    console.log(`🔧 Scraping encontrou: ${allFiles.length} arquivos`);
    return allFiles;
  } catch (error) {
    console.error('❌ Erro no scraping:', error);
    return [];
  }
}

/**
 * Método 2: API pública do Drive (usando endpoint de listagem sem auth para pastas públicas)
 */
async function fetchViaPublicAPI(): Promise<DriveFile[]> {
  try {
    // Usar o endpoint de visualização que retorna JSON
    const url = `https://www.googleapis.com/drive/v3/files?q='${ROOT_FOLDER_ID}'+in+parents+and+mimeType='application/pdf'&fields=files(id,name,mimeType,webViewLink,modifiedTime)&key=AIzaSyB-PLACEHOLDER`;
    
    // Como não temos API key, vamos usar um workaround: acessar a página de listagem direta
    const listUrl = `https://drive.google.com/drive/folders/${ROOT_FOLDER_ID}`;
    const response = await fetch(listUrl);
    
    if (!response.ok) {
      console.warn('⚠️ API pública falhou:', response.status);
      return [];
    }
    
    const html = await response.text();
    const allFiles: DriveFile[] = [];
    
    // Extrair dados de window._DRIVE_ivd ou estruturas JS
    const patterns = [
      // Pattern para IDs e nomes em estruturas JS do Drive
      /"([A-Za-z0-9_-]{25,})","([^"]*[Pp][Rr]\d{5}[^"]*\.pdf[^"]*)"/gi,
      // Pattern alternativo
      /\["([^"]{25,})",.*?"([^"]*PR\d+[^"]*\.pdf[^"]*)"/gi
    ];
    
    for (const pattern of patterns) {
      let match;
      while ((match = pattern.exec(html)) !== null) {
        const id = match[1];
        const name = match[2];
        
        const prCode = extractPRCode(name);
        if (prCode && id.length >= 25) {
          // Evitar duplicatas
          if (!allFiles.find(f => f.id === id)) {
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
    }
    
    console.log(`🔧 API pública encontrou: ${allFiles.length} arquivos`);
    return allFiles;
  } catch (error) {
    console.error('❌ Erro na API pública:', error);
    return [];
  }
}

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
    console.error(`❌ Erro ao obter Base64 do arquivo ${fileId}:`, error);
    throw error;
  }
};
