import React, { useState, useMemo, useEffect } from 'react';
import { Budget, BudgetStatus } from './types';
import { Edit2, Trash2, Search, Filter, Plus, Clock, CheckCircle, XCircle } from 'lucide-react';

interface BudgetListProps {
  budgets: Budget[];
  onCreate?: () => void;
  onEdit: (budget: Budget) => void;
    onDelete: (id: string) => void;
  onRefresh?: () => void;
}

const BudgetList: React.FC<BudgetListProps> = ({ budgets: propBudgets, onCreate, onEdit, onDelete, onRefresh }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  useEffect(() => {
    if (onRefresh) onRefresh();
  }, []);

  const filteredBudgets = useMemo(() => {
    return propBudgets.filter(budget => {
      const matchesSearch =
        budget.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        budget.serviceDescription.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (budget.orderNumber && budget.orderNumber.includes(searchTerm));

      const matchesFilter = filterStatus === 'all' || budget.status === filterStatus;
      return matchesSearch && matchesFilter;
    })
    .sort((a, b) => {
      const dateA = a.date ? new Date(a.date).getTime() : 0;
      const dateB = b.date ? new Date(b.date).getTime() : 0;
      return dateB - dateA;
    });
  }, [propBudgets, searchTerm, filterStatus]);
  
  const getStatusIcon = (status: BudgetStatus) => {
    switch (status) {
      case BudgetStatus.APPROVED: return <CheckCircle className="w-4 h-4 text-green-500" />;
      case BudgetStatus.REJECTED: return <XCircle className="w-4 h-4 text-red-500" />;
      default: return <Clock className="w-4 h-4 text-yellow-500" />;
    }
  };

  const getStatusBadgeClass = (status: BudgetStatus) => {
    switch (status) {
      case BudgetStatus.APPROVED: return 'bg-green-100 text-green-700';
      case BudgetStatus.NOT_APPROVED: return 'bg-red-100 text-red-700';
      default: return 'bg-yellow-100 text-yellow-700';
    }
  };
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Budgets</h2>
          <p className="text-gray-600 mt-1">Manage and track the status of all budgets.</p>
        </div>
        {onCreate && (
          <button
            onClick={onCreate}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 transition-all shadow-md active:scale-95"
          >
            <Plus className="w-5 h-5" />
            New Budget
          </button>
        )}
      </div>
      
      <div className="flex gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Search by client, service or order..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="w-5 h-5 text-gray-400" />
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
          >
            <option value="all">All Status</option>
            {Object.values(BudgetStatus).map(status => (
              <option key={status} value={status}>{status}</option>
            ))}
          </select>
        </div>
      </div>
      
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
              <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Client / Service</th>
              <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Value</th>
              <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Order</th>
              <th className="px-6 py-4 whitespace-nowrap text-right text-xs font-mono font-semibold text-blue-600">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
                        {filteredBudgets.map((budget) => (
              <tr key={budget.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {budget.date || '---'}
                </td>
                <td className="px-6 py-4">
                  <div className="text-sm font-medium text-gray-900">{budget.clientName}</div>
                  <div className="text-sm text-gray-500">{budget.serviceDescription}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                  R$ {budget.budgetAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center gap-2">
                    {getStatusIcon(budget.status)}
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusBadgeClass(budget.status)}`}>
                      {budget.status}
                    </span>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-mono font-semibold text-blue-600">
                  {budget.orderNumber || '---'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right">
                  <div className="flex items-center justify-end gap-2">
                    <button onClick={() => onEdit(budget)} className="p-1 text-gray-400 hover:text-blue-600"><Edit2 className="w-4 h-4" /></button>
                    <button onClick={() => onDelete(budget.id)} className="p-1 text-gray-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default BudgetList;
