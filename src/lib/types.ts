export type ReconciliationResult = "OK" | "FALTANTE" | "PARCIAL" | string;

export interface NecessaryPart {
  jobId: string;
  partId: string;
  description: string;
  requestedQuantity: number;
  plannedQuantity: number;
  shippedQuantity: number;
  missingQuantity: number;
  reconciliationResult: ReconciliationResult;
  analysisDate: string;
  status: string;
}

export type OrderStatus =
  | "Solicitado"
  | "Em cotação"
  | "Aguardando aprovação"
  | "Aprovado"
  | "Comprado"
  | "Em transporte"
  | "Recebido"
  | "Cancelado";

export type OrderOrigin = "Nacional" | "Internacional" | "A definir";

export interface Order {
  orderId: string;
  jobId: string;
  partId: string;
  description: string;
  missingQuantity: number;
  origin: OrderOrigin;
  orderStatus: OrderStatus;
  orderDate?: string;
  expectedDeliveryDate?: string;
  supplier?: string;
  responsible?: string;
  notes?: string;
}

export interface DashboardData {
  necessaryParts: NecessaryPart[];
  orders: Order[];
  lastUpdated: string;
  demoMode: boolean;
}
