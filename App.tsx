import React, { useState, useEffect } from 'react';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import BudgetList from './components/BudgetList';
import BudgetForm from './components/BudgetForm';
import ImageEditor from './components/ImageEditor';
import Settings from './components/Settings';
import { getBudgets, saveBudget, deleteBudget } from './services/mockDataService';
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
    if (confirm("Tem certeza que deseja excluir este orçamento?")) {
      deleteBudget(id);
      refreshBudgets();
    }
  };

  return (
    <Layout activeTab={activeTab} setActiveTab={setActiveTab}>
      {activeTab === 'dashboard' && (
        <Dashboard onDataUpdated={refreshBudgets} />
      )}
      
      {activeTab === 'budgets' && (
        <>
          <BudgetList
            budgets={budgets}
            onCreate={() => setEditingBudget(null)}
            onEdit={(b) => setEditingBudget(b)}
            onDelete={handleDeleteBudget}
            onRefresh={refreshBudgets}
          />
          {editingBudget !== undefined && (
            <BudgetForm
              initialData={editingBudget}
              onSave={handleSaveBudget}
              onCancel={() => setEditingBudget(undefined)}
            />
          )}
        </>
      )}

      {activeTab === 'image-editor' && <ImageEditor />}
      
      {activeTab === 'settings' && <Settings />}
    </Layout>
  );
}

export default App;