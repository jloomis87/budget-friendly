import React, { useState } from 'react';
import { Box, Table, TableBody } from '@mui/material';
import { TransactionTableHead } from './TransactionTableHead';
import { TransactionRow } from './TransactionRow';
import { AddTransactionRow } from './AddTransactionRow';
import { AddTransactionButton } from './AddTransactionButton';
import { TotalRow } from './TotalRow';
import { EmptyTable } from './EmptyTable';
import type { Transaction } from '../../services/fileParser';
import type { EditingRow } from './types';

interface DesktopTransactionTableProps {
  category: string;
  transactions: Transaction[];
  isDark: boolean;
  isAnyRowEditing: boolean;
  isAdding: boolean;
  editingRow: EditingRow | null;
  newDescription: string;
  newAmount: string;
  newDate: string;
  setNewDescription: (value: string) => void;
  setNewAmount: (value: string) => void;
  setNewDate: (value: string) => void;
  setIsAdding: (value: boolean) => void;
  handleAddTransaction: () => void;
  onEditingChange: (field: keyof EditingRow, value: string) => void;
  handleSaveEdit: (transaction: Transaction) => void;
  setEditingRow: (value: EditingRow | null) => void;
  handleDeleteClick: (e: React.MouseEvent, transaction: Transaction, index: number) => void;
  onDragStart: (e: React.DragEvent, transaction: Transaction, globalIndex: number) => void;
  findGlobalIndex: (transaction: Transaction) => number;
  getTransactionId: (transaction: Transaction) => string;
  generateDayOptions: () => number[];
  getOrdinalSuffix: (day: number) => string;
  formatDateForDisplay: (date: Date | string | number) => string;
  totalAmount: number;
  onRowClick: (transaction: Transaction, transactionId: string, index: number) => void;
  onReorder?: (category: string, sourceIndex: number, targetIndex: number) => void;
}

export function DesktopTransactionTable({
  category,
  transactions,
  isDark,
  isAnyRowEditing,
  isAdding,
  editingRow,
  newDescription,
  newAmount,
  newDate,
  setNewDescription,
  setNewAmount,
  setNewDate,
  setIsAdding,
  handleAddTransaction,
  onEditingChange,
  handleSaveEdit,
  setEditingRow,
  handleDeleteClick,
  onDragStart,
  findGlobalIndex,
  getTransactionId,
  generateDayOptions,
  getOrdinalSuffix,
  formatDateForDisplay,
  totalAmount,
  onRowClick,
  onReorder
}: DesktopTransactionTableProps) {
  // Add state to track which row is being dragged over
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  // Handle drag over for a specific row
  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    
    if (dragOverIndex !== index) {
      setDragOverIndex(index);
    }
  };

  // Handle drop on a specific row
  const handleDrop = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    setDragOverIndex(null);
    
    // Get the dragged transaction data
    try {
      const jsonData = e.dataTransfer.getData('application/json');
      if (jsonData) {
        const dragData = JSON.parse(jsonData);
        
        // If we're in the same category and have a valid source index
        if (dragData.category === category && typeof dragData.index === 'number') {
          // Call the parent reorder handler if provided
          if (onReorder) {
            onReorder(category, dragData.index, index);
          }
        }
      }
    } catch (err) {
      console.error('Error parsing drag data:', err);
    }
  };

  // Handle drag end
  const handleDragEnd = () => {
    setDragOverIndex(null);
  };

  return (
    <Box sx={{ overflowX: 'auto' }}>
      <Table size="small" sx={{ tableLayout: 'fixed' }}>
        <TransactionTableHead isDark={isDark} isAnyRowEditing={isAnyRowEditing} />
        <TableBody>
          {!isAdding && (!transactions || transactions.length === 0) && (
            <EmptyTable category={category} isDark={isDark} isAdding={isAdding} />
          )}

          {transactions.map((transaction, index) => {
            // Get a truly unique identifier for this transaction
            const transactionId = getTransactionId(transaction);
            
            // Check if this row is being edited
            const isEditing = editingRow && editingRow.identifier === transactionId;
            
            // Find the global index for drag operations
            const globalIndex = findGlobalIndex(transaction);
            
            return (
              <Box
                key={transactionId}
                onDragOver={(e) => !isEditing && handleDragOver(e, index)}
                onDrop={(e) => !isEditing && handleDrop(e, index)}
              >
                <TransactionRow
                  transaction={transaction}
                  isEditing={isEditing}
                  editingRow={editingRow}
                  isDark={isDark}
                  globalIndex={globalIndex}
                  onEditingChange={onEditingChange}
                  onSaveEdit={handleSaveEdit}
                  onCancelEdit={() => setEditingRow(null)}
                  onDeleteClick={handleDeleteClick}
                  onDragStart={onDragStart}
                  generateDayOptions={generateDayOptions}
                  getOrdinalSuffix={getOrdinalSuffix}
                  formatDateForDisplay={formatDateForDisplay}
                  onClick={() => !isEditing && onRowClick(transaction, transactionId, index)}
                  dragOver={dragOverIndex === index}
                />
              </Box>
            );
          })}

          {/* Add new transaction row */}
          {isAdding && (
            <AddTransactionRow
              isDark={isDark}
              isAdding={isAdding}
              newDescription={newDescription}
              newAmount={newAmount}
              newDate={newDate}
              setNewDescription={setNewDescription}
              setNewAmount={setNewAmount}
              setNewDate={setNewDate}
              handleAddTransaction={handleAddTransaction}
              setIsAdding={setIsAdding}
              generateDayOptions={generateDayOptions}
              getOrdinalSuffix={getOrdinalSuffix}
            />
          )}

          {/* Add Expense row (when not in adding mode) */}
          {!isAdding && (
            <AddTransactionButton
              isDark={isDark}
              transactions={transactions}
              setIsAdding={setIsAdding}
            />
          )}

          {transactions.length > 0 && (
            <TotalRow
              category={category}
              totalAmount={totalAmount}
              isDark={isDark}
            />
          )}
        </TableBody>
      </Table>
    </Box>
  );
} 