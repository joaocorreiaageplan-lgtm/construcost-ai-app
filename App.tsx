import React, { useState, useEffect } from 'react';
import Layout from './Layout';
import Dashboard from './Dashboard';
import BudgetList from './BudgetList';
import BudgetForm from './BudgetForm';
import ImageEditor from './ImageEditor';
import Settings from './Settings';
import { getBudgets, saveBudget, deleteBudget } from './mockDataService';
import { Budget } from './types';

function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [editingBudget, setEditingBudget] = useState<Budget | null | undefined>(undefined);

  // Função centralizada para recarregar dados do localStorage
  const refreshBudgets = () => {
    setBudgets(getBudgets());
  };

  // Carrega os orçamentos inicial e sempre que a aba mudar
  useEffect(() => {
    refreshBudgets();
  }, [activeTab]);

  const handleSaveBudget = (budget: Budget) => {
    saveBudget(budget);
    refreshBudgets(); // Refresh list immediately
    setEditingBudget(undefined); // Close modal
  };

  const handleDeleteBudget = (id: string) => {
    deleteBudget(id);
    refreshBudgets();
  };

  return (
    <Layout activeTab={activeTab} setActiveTab={setActiveTab}>
      {activeTab === 'dashboard' && <Dashboard budgets={budgets} />}
      {activeTab === 'budgets' && (
        <BudgetList
          budgets={budgets}
          onEdit={setEditingBudget}
          onDelete={handleDeleteBudget}
        />
      )}
      {activeTab === 'form' && (
        <BudgetForm
          budget={editingBudget}
          onSave={handleSaveBudget}
          onCancel={() => setEditingBudget(undefined)}
        />
      )}
      {activeTab === 'image-editor' && <ImageEditor />}
      {activeTab === 'settings' && <Settings />}
    </Layout>
  );
}

export default App;
