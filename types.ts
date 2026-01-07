export enum BudgetStatus {
  PENDING = 'Pendente',
  APPROVED = 'Aprovado',
  NOT_APPROVED = 'Não Aprovado',
}

export interface Budget {
  id: string;
    itemNumber?: number; // Column A from spreadsheet (830, 829, 828...)
  date: string; // ISO Date string
  clientName: string;
  serviceDescription: string;
  budgetAmount: number;
  discount: number;
  orderConfirmation: boolean;
  invoiceSent: boolean;
  status: BudgetStatus;
  orderDate?: string;
  orderNumber?: string; // New field for Order Number (PO)
  invoiceNumber?: string;
  sendToClient: boolean;
  requester: string;
  files: AttachedFile[];
}

export interface AttachedFile {
  id: string;
  name: string;
  url: string; // potentially a simulated Google Drive link
  type: 'image' | 'pdf' | 'spreadsheet' | 'other';
}

export interface DashboardStats {
  totalEstimates: number;
  approvedCount: number;
  rejectedCount: number;
  pendingCount: number;
  totalValueApproved: number;
  totalValuePending: number;
  invoicePendingCount: number;
}
