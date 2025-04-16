import type { Transaction } from '../../services/fileParser';

export interface EditingRow {
  index: number;
  identifier: string;
  amount: string;
  date: string;
  description: string;
  icon?: string;
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
  onReorder?: (category: string, sourceIndex: number, targetIndex: number) => void;
  selectedMonths?: string[];
}

export interface TransactionUtilsHook {
  generateDayOptions: () => { value: string; label: string }[];
  getOrdinalSuffix: (day: number) => string;
  getDateString: (date: Date | string | number) => string;
  formatDateForDisplay: (date: Date | string | number) => string;
  findGlobalIndex: (transaction: Transaction, allTransactions: Transaction[]) => number;
  getTransactionId: (transaction: Transaction) => string;
  isDuplicateTransaction: (a: Transaction, b: Transaction) => boolean;
  updateTransactionsWithSameName: (description: string, icon: string, allTransactions: Transaction[], excludeId?: string) => number[];
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
  generateDayOptions: () => { value: string; label: string }[];
  getOrdinalSuffix: (day: number) => string;
  formatDateForDisplay: (date: Date | string | number) => string;
  onClick?: () => void;
  dragOver?: boolean;
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
  generateDayOptions: () => { value: string; label: string }[];
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
  onDragStart?: (e: React.DragEvent, transaction: Transaction, globalIndex: number) => void;
  globalIndex: number;
}

export interface MobileTransactionListProps {
  category: string;
  transactions: Transaction[];
  isDark: boolean;
  isAdding: boolean;
  handleOpenMobileEdit: (transaction: Transaction, index: number) => void;
  handleOpenMobileAdd: () => void;
  setIsAdding: (value: boolean) => void;
  formatDateForDisplay: (date: Date | string | number) => string;
  onDragStart?: (e: React.DragEvent, transaction: Transaction, globalIndex: number) => void;
  allTransactions?: Transaction[];
  findGlobalIndex?: (transaction: Transaction, allTransactions: Transaction[]) => number;
  onReorder?: (category: string, sourceIndex: number, targetIndex: number) => void;
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
  tableColor: string;
  isDark: boolean;
}

export interface MobileAddDialogProps {
  open: boolean;
  category?: string;
  newDescription: string;
  newAmount: string;
  newDate: string;
  setNewDescription: (value: string) => void;
  setNewAmount: (value: string) => void;
  setNewDate: (value: string) => void;
  onClose: () => void;
  onAdd: () => void;
  generateDayOptions: () => { value: string; label: string }[];
  getOrdinalSuffix: (day: number) => string;
  tableColor?: string;
  isDark?: boolean;
  icon?: string;
  setIcon?: (value: string) => void;
}

export interface TransactionCardProps {
  transaction: Transaction;
  index: number;
  month: string;
  isDark: boolean;
  hasCustomColor: boolean;
  hasCustomDarkColor: boolean;
  category: string;
  isDragging: boolean;
  draggedTransaction: Transaction | null;
  draggedIndex: number | null;
  dragSourceMonth: string | null;
  dragOverMonth: string | null;
  dragOverIndex: number | null;
  isIntraMonthDrag: boolean;
  isCopyMode: boolean;
  getCardBackgroundColor: (isHover?: boolean) => string;
  getTextColor: (isHover?: boolean) => string;
  handleTransactionDragStart: (e: React.DragEvent, transaction: Transaction, index: number, sourceMonth: string) => void;
  handleTransactionDragOver: (e: React.DragEvent, targetMonth: string, targetIndex: number) => void;
  handleTransactionDrop: (e: React.DragEvent, targetMonth: string, targetIndex: number) => void;
  handleDragEnd: (e: React.DragEvent) => void;
  handleOpenMobileEdit: (transaction: Transaction, index: number) => void;
}

export interface MonthColumnProps {
  month: string;
  monthTransactions: Transaction[];
  category: string;
  isDark: boolean;
  hasCustomColor: boolean;
  hasCustomDarkColor: boolean;
  isDragging: boolean;
  draggedTransaction: Transaction | null;
  draggedIndex: number | null;
  dragSourceMonth: string | null;
  dragOverMonth: string | null;
  dragOverIndex: number | null;
  isIntraMonthDrag: boolean;
  isCopyMode: boolean;
  getCardBackgroundColor: (isHover?: boolean) => string;
  getTextColor: (isHover?: boolean) => string;
  handleMonthDragOver: (e: React.DragEvent, targetMonth: string) => void;
  handleMonthDragLeave: (e: React.DragEvent) => void;
  handleMonthDrop: (e: React.DragEvent, targetMonth: string) => void;
  handleTransactionDragStart: (e: React.DragEvent, transaction: Transaction, index: number, sourceMonth: string) => void;
  handleTransactionDragOver: (e: React.DragEvent, targetMonth: string, targetIndex: number) => void;
  handleTransactionDrop: (e: React.DragEvent, targetMonth: string, targetIndex: number) => void;
  handleDragEnd: (e: React.DragEvent) => void;
  handleOpenMobileEdit: (transaction: Transaction, index: number) => void;
  handleOpenMobileAdd: (month: string) => void;
  handleCopyMonthClick: (month: string, transactions: Transaction[]) => void;
  getNextMonth: (currentMonth: string) => string;
  getMonthOrder: (month: string) => number;
  tableColors?: Record<string, string>;
}

export interface DragIndicatorProps {
  isDragging: boolean;
  isCopyMode: boolean;
  isIntraMonthDrag: boolean;
  dragSourceMonth: string | null;
}

export type SortOption = 'amount' | 'date' | 'description';

export interface TransactionTableHeaderProps {
  category: string;
  totalAmount: number;
  hasCustomColor: boolean;
  hasCustomDarkColor: boolean;
  isDark: boolean;
  tableColors: Record<string, string>;
  sortOption: SortOption;
  onSortChange: (option: SortOption) => void;
  totalBudget?: number;
  categoryData?: {
    percentage?: number;
    isIncome?: boolean;
  };
}

export interface TransactionTableContextProps {
  category: string;
  transactions: Transaction[];
  allTransactions: Transaction[];
  isDark: boolean;
  onUpdateTransaction: (index: number, updatedTransaction: Partial<Transaction>) => void;
  onDeleteTransaction: (index: number) => void;
  onAddTransaction: (transaction: Transaction) => void;
  onUpdateAllTransactionsWithSameName?: (description: string, icon: string, excludeId?: string) => Promise<number | undefined>;
  onDragStart?: (e: React.DragEvent, transaction: Transaction, globalIndex: number) => void;
  onDragOver?: (e: React.DragEvent, category: string) => void;
  onDrop?: (e: React.DragEvent, targetCategory: string) => void;
  dragOverCategory?: string | null;
  recentlyDropped?: string | null;
  onReorder?: (category: string, sourceIndex: number, targetIndex: number) => void;
  selectedMonths?: string[];
  month: string;
  onTransactionsChange: (newTransactions: Transaction[]) => void;
}

export interface DragDropState {
  draggedTransaction: Transaction | null;
  draggedIndex: number | null;
  dragSourceMonth: string | null;
  dragOverMonth: string | null;
  isDragging: boolean;
  isCopyMode: boolean;
  dragLeaveTimeout: number | null;
  dragOverIndex: number | null;
  isIntraMonthDrag: boolean;
} 