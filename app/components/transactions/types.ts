import type { Transaction } from '../../services/fileParser';

export interface EditingRow {
  index: number;
  identifier: string;
  amount: string;
  date: string;
  description: string;
}

export interface EnhancedTransactionTableProps {
  category: string;
  transactions: Transaction[];
  allTransactions: Transaction[];
  onUpdateTransaction: (index: number, updatedTransaction: Partial<Transaction>) => void;
  onDeleteTransaction: (index: number) => void;
  onAddTransaction: (transaction: Transaction) => void;
  onDragStart: (e: React.DragEvent, transaction: Transaction, globalIndex: number) => void;
  onDragOver: (e: React.DragEvent, category: string) => void;
  onDrop: (e: React.DragEvent, targetCategory: string) => void;
  dragOverCategory: string | null;
  recentlyDropped: string | null;
}

export interface TransactionUtilsHook {
  generateDayOptions: () => number[];
  getOrdinalSuffix: (day: number) => string;
  getDateString: (date: Date | string | number) => string;
  formatDateForDisplay: (date: Date | string | number) => string;
  findGlobalIndex: (transaction: Transaction, allTransactions: Transaction[]) => number;
  getTransactionId: (transaction: Transaction) => string;
  isDuplicateTransaction: (a: Transaction, b: Transaction) => boolean;
}

export interface TableHeaderProps {
  category: string;
  totalAmount: number;
  isDark: boolean;
}

export interface TransactionRowProps {
  transaction: Transaction;
  isEditing: boolean;
  editingRow: EditingRow | null;
  isDark: boolean;
  globalIndex: number;
  onEditingChange: (field: keyof EditingRow, value: string) => void;
  onSaveEdit: (transaction: Transaction) => void;
  onCancelEdit: () => void;
  onDeleteClick: (e: React.MouseEvent, transaction: Transaction, index: number) => void;
  onDragStart: (e: React.DragEvent, transaction: Transaction, globalIndex: number) => void;
  generateDayOptions: () => number[];
  getOrdinalSuffix: (day: number) => string;
  formatDateForDisplay: (date: Date | string | number) => string;
  onClick?: () => void;
}

export interface AddTransactionRowProps {
  isDark: boolean;
  isAdding: boolean;
  newDescription: string;
  newAmount: string;
  newDate: string;
  setNewDescription: (value: string) => void;
  setNewAmount: (value: string) => void;
  setNewDate: (value: string) => void;
  handleAddTransaction: () => void;
  setIsAdding: (value: boolean) => void;
  generateDayOptions: () => number[];
  getOrdinalSuffix: (day: number) => string;
}

export interface AddTransactionButtonProps {
  isDark: boolean;
  transactions: Transaction[];
  setIsAdding: (value: boolean) => void;
}

export interface TotalRowProps {
  category: string;
  totalAmount: number;
  isDark: boolean;
}

export interface MobileTransactionCardProps {
  transaction: Transaction;
  isDark: boolean;
  handleOpenMobileEdit: (transaction: Transaction, index: number) => void;
  index: number;
  formatDateForDisplay: (date: Date | string | number) => string;
}

export interface DeleteConfirmationDialogProps {
  open: boolean;
  transactionToDelete: { transaction: Transaction, index: number } | null;
  onClose: () => void;
  onConfirm: () => void;
}

export interface MobileEditDialogProps {
  open: boolean;
  category: string;
  editingRow: EditingRow | null;
  onClose: () => void;
  onSave: () => void;
  onDelete: () => void;
  handleEditingChange: (field: keyof EditingRow, value: string) => void;
  generateDayOptions: () => number[];
  getOrdinalSuffix: (day: number) => string;
}

export interface MobileAddDialogProps {
  open: boolean;
  category: string;
  newDescription: string;
  newAmount: string;
  newDate: string;
  setNewDescription: (value: string) => void;
  setNewAmount: (value: string) => void;
  setNewDate: (value: string) => void;
  onClose: () => void;
  onAdd: () => void;
  generateDayOptions: () => number[];
  getOrdinalSuffix: (day: number) => string;
} 