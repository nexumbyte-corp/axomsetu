import React, { useState } from 'react';
import { Calendar, Lock, Unlock, CheckCircle2 } from 'lucide-react';
import { useAcademicYear } from '../hooks/useAcademicYear.js';
import { academicService } from '../services/academic.service.js';
import { Table, TableHeader, TableHead, TableBody, TableRow, TableCell } from '../components/ui/Table.jsx';
import { Button } from '../components/ui/Button.jsx';
import { Badge } from '../components/ui/Badge.jsx';
import { Alert } from '../components/ui/Alert.jsx';
import { TableSkeleton } from '../components/ui/Skeleton.jsx';
import { useToast } from '../components/ui/Toast.jsx';
import { ModulePageHeader } from '../components/ui/ModulePageHeader.jsx';

export const AcademicYearsPage = () => {
  const { academicYears, isLoading, refetchAcademicYears } = useAcademicYear();
  const { showToast } = useToast();

  const [loadingActionId, setLoadingActionId] = useState(null); // stores id of academic year currently being locked/unlocked
  const [errorMsg, setErrorMsg] = useState('');

  const handleToggleLock = async (year) => {
    setLoadingActionId(year.id);
    setErrorMsg('');

    try {
      if (year.isLocked) {
        await academicService.unlockAcademicYear(year.id);
        showToast(`Academic year ${year.name} unlocked successfully`, 'success');
      } else {
        await academicService.lockAcademicYear(year.id);
        showToast(`Academic year ${year.name} locked successfully`, 'success');
      }
      await refetchAcademicYears();
    } catch (err) {
      setErrorMsg(err.message || 'Failed to update academic year lock status');
      showToast(err.message || 'Action failed', 'error');
    } finally {
      setLoadingActionId(null);
    }
  };

  if (isLoading) {
    return <TableSkeleton rows={4} cols={5} />;
  }

  return (
    <div className="space-y-6">
      {/* Standardized Module Header */}
      <ModulePageHeader
        icon={Calendar}
        title="Academic Years"
        description="Manage academic session periods and lock past historical sessions to protect records."
      />

      {errorMsg && <Alert type="danger">{errorMsg}</Alert>}

      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Academic Year</TableHead>
              <TableHead>Period</TableHead>
              <TableHead>Session Status</TableHead>
              <TableHead>Lock Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {academicYears.map((yr) => {
              const isActionLoading = loadingActionId === yr.id;

              return (
                <TableRow key={yr.id}>
                  <TableCell className="font-semibold text-slate-900">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-indigo-600 shrink-0" />
                      <span>{yr.name}</span>
                    </div>
                  </TableCell>

                  <TableCell>
                    <span className="font-mono text-[11px] text-slate-600">
                      {new Date(yr.startDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })} –{' '}
                      {new Date(yr.endDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </span>
                  </TableCell>

                  <TableCell>
                    {yr.isCurrent ? (
                      <Badge variant="success" icon={CheckCircle2}>
                        Current Session
                      </Badge>
                    ) : (
                      <Badge variant="neutral">Historical Session</Badge>
                    )}
                  </TableCell>

                  <TableCell>
                    {yr.isLocked ? (
                      <Badge variant="danger" icon={Lock}>
                        Locked
                      </Badge>
                    ) : (
                      <Badge variant="info" icon={Unlock}>
                        Unlocked (Active)
                      </Badge>
                    )}
                  </TableCell>

                  <TableCell className="text-right">
                    {yr.isCurrent ? (
                      <span className="text-[11px] text-slate-400 font-medium italic">Cannot lock active current year</span>
                    ) : (
                      <Button
                        variant={yr.isLocked ? 'outline' : 'danger'}
                        size="sm"
                        loading={isActionLoading}
                        loadingText={yr.isLocked ? 'Unlocking...' : 'Locking...'}
                        onClick={() => handleToggleLock(yr)}
                        icon={yr.isLocked ? Unlock : Lock}
                      >
                        {yr.isLocked ? 'Unlock Year' : 'Lock Year'}
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};
