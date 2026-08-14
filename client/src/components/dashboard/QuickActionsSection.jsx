import React from 'react';
import { Link } from 'react-router-dom';
import { UserPlus, UserCheck, Zap, CreditCard, DollarSign, Receipt, PlusCircle, Sparkles } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card.jsx';
import { Button } from '../ui/Button.jsx';

export const QuickActionsSection = () => {
  const actions = [
    { label: 'Add Student', path: '/app/students', icon: UserPlus, variant: 'outline' },
    { label: 'Add Staff', path: '/app/staff', icon: UserCheck, variant: 'outline' },
    { label: 'Generate Fees', path: '/app/fees', icon: Zap, variant: 'outline' },
    { label: 'Collect Fee', path: '/app/fees', icon: CreditCard, variant: 'outline' },
    { label: 'Pay Salary', path: '/app/staff', icon: DollarSign, variant: 'outline' },
    { label: 'Add Expense', path: '/app/expenses', icon: Receipt, variant: 'outline' },
    { label: 'Add Fund', path: '/app/finance', icon: PlusCircle, variant: 'outline' },
  ];

  return (
    <Card className="border-slate-200 bg-white shadow-2xs">
      <CardHeader className="py-3 px-4 sm:px-5 border-b border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-indigo-600" />
          <CardTitle className="text-sm font-bold text-slate-900">Quick Actions</CardTitle>
        </div>
      </CardHeader>

      <CardContent className="p-3 sm:p-4">
        <div className="flex flex-wrap gap-2">
          {actions.map((act, idx) => {
            const IconComp = act.icon;
            return (
              <Link key={idx} to={act.path}>
                <Button
                  variant="outline"
                  size="sm"
                  icon={IconComp}
                  className="text-xs font-semibold hover:border-indigo-300 hover:bg-indigo-50/50 hover:text-indigo-700 transition-all"
                >
                  {act.label}
                </Button>
              </Link>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};
