import React from 'react';
import { TransactionTable as TransactionTableComponent } from './transactions/TransactionTable';
import { useTransactions } from '../hooks/useTransactions';

export const TransactionTable = (props) => {
  const { setAlertMessage } = useTransactions();
  
  return (
    <TransactionTableComponent 
      {...props} 
      onAlertMessage={setAlertMessage}
    />
  );
}; 