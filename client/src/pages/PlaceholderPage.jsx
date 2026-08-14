import React from 'react';
import { Construction, BarChart3 } from 'lucide-react';
import { Card, CardContent } from '../components/ui/Card.jsx';
import { Badge } from '../components/ui/Badge.jsx';
import { ModulePageHeader } from '../components/ui/ModulePageHeader.jsx';

export const PlaceholderPage = ({ title, description }) => {
  return (
    <div className="space-y-6">
      <ModulePageHeader
        icon={BarChart3}
        title={title || 'Module'}
        description={description || 'Module under active backend development.'}
      />

      <Card>
        <CardContent className="p-12 text-center flex flex-col items-center justify-center">
          <div className="w-14 h-14 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-4 border border-indigo-100">
            <Construction className="w-7 h-7" />
          </div>
          <Badge variant="indigo" className="mb-3">
            Module Ready in Future Phase
          </Badge>
          <h2 className="text-base font-bold text-slate-900">{title} Workspace</h2>
          <p className="text-xs text-slate-500 max-w-md mt-2 leading-relaxed">
            The UI architecture for {title} is prepared. Backend APIs for student admissions, fee structures, and payroll disbursements are currently being finalized.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};
