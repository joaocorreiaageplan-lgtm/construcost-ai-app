import { Budget, BudgetStatus, AttachedFile } from './types';
const STORAGE_KEY = 'construcost_budgets';
const SETTINGS_KEY = 'construcost_settings';
const SPREADSHEET_ID = '1cgbinJp_tdj_y9jTzC0ms_THw9ppgqRx';

const generateId = () => Math.random().toString(36).substr(2, 9);

export interface AppSettings {
  driveConnected: boolean;
  driveFolderName: string;
  autoSync: boolean;
  emailNotifications: boolean;
  googleClientId?: string;
  googleApiKey?: string;
  googleSheetId?: string;
}

const INITIAL_SETTINGS: AppSettings = {
  driveConnected: false,
  driveFolderName: '',
  autoSync: false,
  emailNotifications: true,
  googleClientId: '',
  googleApiKey: '',
  googleSheetId: SPREADSHEET_ID
};

export const getBudgets = (): Budget[] => {
  const data = localStorage.getItem(STORAGE_KEY);
  if (!data) return [];
  try {
    const parsed = JSON.parse(data);
    return parsed.sort((a: Budget, b: Budget) => {
      // Sort by itemNumber in descending order (830, 829, 828...)
      const numA = (a as any).itemNumber || 0;
      const numB = (b as any).itemNumber || 0;
      return numB - numA;
          });
  } catch (e) {
    return [];
  }

  export const extractPRCode = (str: string): string | null => {
  if (!str) return null;
  // Captura PR seguido de 4 ou 5 dígitos (PR1724, PR01724, PR 01724, etc.)
  const match = str.match(/[Pp][Rr]\s?0?(\d{4,5})/);
  if (!match) return null;
  // Retorna no formato padronizado: PR01724
  const num = match[1].padStart(5, '0');
  return `PR${num}`;
};
export const saveBudget = (budget: Budget): Budget => {
  const budgets = getBudgets();
  const index = budgets.findIndex(b => b.id === budget.id);
  
  if (index >= 0) {
    budgets[index] = budget;
  } else {
    budget.id = budget.id || generateId();
    budgets.push(budget);
  }
  
  localStorage.setItem(STORAGE_KEY, JSON.stringify(budgets));
  return budget;
};

export const saveBudgetsBatch = (newBudgets: Budget[]): void => {
  const currentBudgets = getBudgets();
  const budgetMap = new Map<string, Budget>();
  
  currentBudgets.forEach(b => {
    const key = b.id || generateId();
    budgetMap.set(key, b);
  });
  
  newBudgets.forEach(nb => {
    // Fingerprint para identificar duplicatas sem ID
    const nbPR = extractPRCode(nb.serviceDescription);
    const nbFingerprint = nbPR || `${nb.date}-${nb.clientName}-${nb.budgetAmount}`.toLowerCase();
    
    let existingKey: string | null = null;
    for (const [key, eb] of budgetMap.entries()) {
      const ebPR = extractPRCode(eb.serviceDescription);
      const ebFingerprint = ebPR || `${eb.date}-${eb.clientName}-${eb.budgetAmount}`.toLowerCase();
      
      if (nbFingerprint === ebFingerprint) {
        existingKey = key;
        break;
      }
    }

    if (existingKey) {
      budgetMap.set(existingKey, { ...budgetMap.get(existingKey)!, ...nb, id: existingKey });
    } else {
      const newId = generateId();
      budgetMap.set(newId, { ...nb, id: newId });
    }
  });

  localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(budgetMap.values())));
};

export const deleteBudget = (id: string): void => {
  const budgets = getBudgets();
  localStorage.setItem(STORAGE_KEY, JSON.stringify(budgets.filter(b => b.id !== id)));
};

export const getSettings = (): AppSettings => {
  const data = localStorage.getItem(SETTINGS_KEY);
  return data ? JSON.parse(data) : INITIAL_SETTINGS;
};

export const saveSettings = (settings: AppSettings): void => {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
};

const parseBRCurrency = (val: any): number => {
  if (typeof val === 'number') return val;
  if (!val) return 0;
  const clean = String(val).replace('R$', '').replace(/\s/g, '').replace(/\./g, '').replace(',', '.');
  return parseFloat(clean) || 0;
};

const parseSheetDate = (dateVal: any): string => {
  if (!dateVal) return new Date().toISOString().split('T')[0];
  const str = String(dateVal);
  if (str.includes('/')) {
    const parts = str.split('/');
    if (parts.length === 3) {
      const day = parts[0].padStart(2, '0');
      const month = parts[1].padStart(2, '0');
      const year = parts[2].length === 2 ? `20${parts[2]}` : parts[2];
      return `${year}-${month}-${day}`;
    }
  }
  return str;
};

export const syncWithGoogleSheets = async (): Promise<{added: number, updated: number}> => {
  const sheetName = encodeURIComponent('CONTROLE DE ORÇAMENTOS');
  const url = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/gviz/tq?tqx=out:json&sheet=${sheetName}&range=A2:Z2000`;

  try {
    const response = await fetch(url);
    const text = await response.text();
    const jsonStr = text.substring(text.indexOf('(') + 1, text.lastIndexOf(')'));
    const gvizData = JSON.parse(jsonStr);
    
    const rows = gvizData.table.rows || [];
    const currentBudgets = getBudgets();
    const incomingBudgets: Budget[] = [];
    
    let addedCount = 0;
    let updatedCount = 0;

    rows.forEach((rowObj: any) => {
      const cells = rowObj.c;
      if (!cells || cells.length < 3) return;

      const getV = (i: number) => cells[i] ? cells[i].v : null;
      const getF = (i: number) => cells[i] ? (cells[i].f || String(cells[i].v || '')) : '';

      // Column A=item number, B=Nome Cliente, C=Descrição, D=Valor, E=Desconto, F=Pedido, G=Envio NF, H=Status, I=Data Pedido, J=Nota, K=Enviar, L=Solicitante
      const itemNumber = getV(0); // Not used but Column A contains item number
      const desc = String(getV(2) || '').trim();
      const rawStatus = String(getV(7) || '').toLowerCase();      const requester = String(getV(11) || '').trim(); // Column L: Solicitante

      if (!client && !desc) return;

      let status = BudgetStatus.PENDING;
      if (rawStatus.includes('não') || rawStatus.includes('rejeitado') || rawStatus.includes('recusado')) {
        status = BudgetStatus.NOT_APPROVED;
      } else if (rawStatus.includes('aprovado') || rawStatus.includes('fechado') || order.length > 2) {
        status = BudgetStatus.APPROVED;
      }

      incomingBudgets.push({
        id: '',
      itemNumber: parseInt(String(itemNumber || '0')), 
      date: new Date().toISOString().split('T')[0], // No date column in spreadsheet, using current date
      clientName: client || '---',
        serviceDescription: desc || '---',
        budgetAmount: value,
        discount: 0,
        orderConfirmation: status === BudgetStatus.APPROVED,
        invoiceSent: false,
        status: status,
        orderNumber: order,
        sendToClient: true,
      requester: requester || "Google Sheets",     
      files: []
      });
    });

    incomingBudgets.forEach(nb => {
      const nbPR = extractPRCode(nb.serviceDescription);
      const exists = currentBudgets.some(b => {
        const ebPR = extractPRCode(b.serviceDescription);
        if (nbPR && ebPR) return nbPR === ebPR;
        return b.clientName === nb.clientName && b.serviceDescription === nb.serviceDescription && b.date === nb.date;
      });
      if (exists) updatedCount++; else addedCount++;
    });

    saveBudgetsBatch(incomingBudgets);
    return { added: addedCount, updated: updatedCount };
  } catch (error: any) {
    console.error("Erro na Sincronização:", error);
    throw error;
  }
};

export const getStats = (): any => {
  const budgets = getBudgets();
  const approved = budgets.filter(b => b.status === BudgetStatus.APPROVED);
  const pending = budgets.filter(b => b.status === BudgetStatus.PENDING);
  const notApproved = budgets.filter(b => b.status === BudgetStatus.NOT_APPROVED);
  
  return {
    totalEstimates: budgets.length,
    approvedCount: approved.length,
    rejectedCount: notApproved.length,
    pendingCount: pending.length,
    totalValueApproved: approved.reduce((acc, curr) => acc + (curr.budgetAmount - curr.discount), 0),
    totalValuePending: pending.reduce((acc, curr) => acc + (curr.budgetAmount - curr.discount), 0),
    totalValueAll: budgets.reduce((acc, curr) => acc + (curr.budgetAmount - curr.discount), 0),
    invoicePendingCount: budgets.filter(b => b.status === BudgetStatus.APPROVED && !b.invoiceSent).length
  };
  };
