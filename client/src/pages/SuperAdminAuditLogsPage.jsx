import React, { useState, useEffect } from 'react';
import { Search, RefreshCw, Eye } from 'lucide-react';
import { Badge } from '../components/ui/Badge.jsx';
import { Button } from '../components/ui/Button.jsx';
import { Input } from '../components/ui/Input.jsx';
import { Select } from '../components/ui/Select.jsx';
import { Modal } from '../components/ui/Modal.jsx';
import { Alert } from '../components/ui/Alert.jsx';
import { Spinner } from '../components/ui/Spinner.jsx';
import { ModulePageHeader } from '../components/ui/ModulePageHeader.jsx';
import { Table, TableHeader, TableHead, TableBody, TableRow, TableCell } from '../components/ui/Table.jsx';
import { Pagination } from '../components/ui/Pagination.jsx';
import { adminService } from '../services/adminService.js';
import { formatDateTime } from '../utils/formatters.js';

export const SuperAdminAuditLogsPage = () => {
  const [loading, setLoading] = useState(true);
  const [logs, setLogs] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 15, totalPages: 1, total: 0 });
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [moduleFilter, setModuleFilter] = useState('');

  const [selectedLog, setSelectedLog] = useState(null);
  const [error, setError] = useState(null);

  const fetchAuditLogs = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await adminService.listAuditLogs({
        page: pagination.page,
        limit: pagination.limit,
        search,
        action: actionFilter,
        entityType: moduleFilter,
      });

      setLogs(res.data || []);
      if (res.pagination) {
        setPagination((prev) => ({
          ...prev,
          total: res.pagination.total,
          totalPages: res.pagination.totalPages,
        }));
      }
    } catch (err) {
      console.error('Error fetching audit logs:', err);
      setError(err.message || 'Failed to fetch platform audit logs.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAuditLogs();
  }, [pagination.page, actionFilter, moduleFilter]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPagination((prev) => ({ ...prev, page: 1 }));
    fetchAuditLogs();
  };

  const formatActionBadge = (action) => {
    if (action.includes('CREATED') || action.includes('REGISTERED') || action.includes('ACTIVATED')) {
      return <Badge variant="success">{action}</Badge>;
    }
    if (action.includes('SUSPENDED') || action.includes('CANCELLED') || action.includes('DELETED')) {
      return <Badge variant="danger">{action}</Badge>;
    }
    if (action.includes('RENEWED') || action.includes('EXTENDED') || action.includes('CHANGED') || action.includes('UPDATED')) {
      return <Badge variant="warning">{action}</Badge>;
    }
    return <Badge variant="neutral">{action}</Badge>;
  };

  return (
    <div className="space-y-6">
      {error && <Alert type="error" message={error} onClose={() => setError(null)} />}

      <ModulePageHeader
        title="Audit Logs"
        description="Immutable, read-only system audit trail recording platform activity, administrative events, and security logs."
        actions={
          <Button variant="outline" size="sm" icon={RefreshCw} onClick={fetchAuditLogs}>
            Refresh
          </Button>
        }
      />

      {/* Read-Only Filter & Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
        <form onSubmit={handleSearchSubmit} autoComplete="off" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="lg:col-span-2">
            <Input
              placeholder="Search action, entity, user, or IP address..."
              icon={Search}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div>
            <Select value={moduleFilter} onChange={(e) => setModuleFilter(e.target.value)}>
              <option value="">All Modules / Entities</option>
              <option value="School">School Module</option>
              <option value="SubscriptionPlan">Plans Module</option>
              <option value="SchoolSubscription">Subscriptions Module</option>
              <option value="SubscriptionPayment">Payments Module</option>
              <option value="PlatformSettings">Platform Settings</option>
              <option value="User">User Module</option>
            </Select>
          </div>

          <div>
            <Select value={actionFilter} onChange={(e) => setActionFilter(e.target.value)}>
              <option value="">All Action Types</option>
              <option value="CREATE_SCHOOL">CREATE_SCHOOL</option>
              <option value="SCHOOL_SUSPENDED">SCHOOL_SUSPENDED</option>
              <option value="SCHOOL_ACTIVATED">SCHOOL_ACTIVATED</option>
              <option value="SUBSCRIPTION_PLAN_CREATED">SUBSCRIPTION_PLAN_CREATED</option>
              <option value="SUBSCRIPTION_PAYMENT_APPROVED">SUBSCRIPTION_PAYMENT_APPROVED</option>
              <option value="PLATFORM_SETTINGS_UPDATED">PLATFORM_SETTINGS_UPDATED</option>
            </Select>
          </div>
        </form>
      </div>

      {/* Audit Logs Table */}
      {loading ? (
        <div className="bg-white p-12 rounded-xl border border-slate-200 flex flex-col items-center justify-center">
          <Spinner size="lg" label="Loading audit trail records..." />
        </div>
      ) : (
        <>
          <Table minWidth="min-w-[900px]">
          <TableHeader>
              <TableRow>
                <TableHead>Timestamp</TableHead>
                <TableHead>User</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Module / Entity</TableHead>
                <TableHead>Target Entity</TableHead>
                <TableHead>IP Address</TableHead>
                <TableHead className="text-right">Result / Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-12 text-slate-500">
                    No audit records matching search filter.
                  </TableCell>
                </TableRow>
              ) : (
                logs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="font-mono text-xs text-slate-500">{formatDateTime(log.createdAt)}</TableCell>

                    <TableCell className="font-bold text-slate-900 text-xs">
                      {log.user?.name || 'System'}
                      <span className="text-[10px] text-slate-400 font-mono block">{log.user?.email || '-'}</span>
                    </TableCell>

                    <TableCell className="font-semibold text-slate-700 text-xs">
                      {log.user?.role || 'SYSTEM'}
                    </TableCell>

                    <TableCell>{formatActionBadge(log.action)}</TableCell>

                    <TableCell className="font-semibold text-slate-800 text-xs">{log.entityType}</TableCell>

                    <TableCell className="font-mono text-xs text-slate-600">
                      {log.school ? (
                        <span>{log.school.name} ({log.school.code})</span>
                      ) : log.entityId ? (
                        <span>{log.entityId.slice(0, 8)}...</span>
                      ) : (
                        'Platform'
                      )}
                    </TableCell>

                    <TableCell className="font-mono text-xs text-slate-500">{log.ipAddress || '127.0.0.1'}</TableCell>

                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="xs"
                        icon={Eye}
                        onClick={() => setSelectedLog(log)}
                      >
                        Inspect
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>

          <Pagination
            page={pagination.page}
            limit={pagination.limit}
            total={pagination.total}
            onPageChange={(pg) => setPagination((prev) => ({ ...prev, page: pg }))}
          />
        </>
      )}

      {/* Read-Only Payload Inspector Modal */}
      {selectedLog && (
        <Modal
          isOpen={Boolean(selectedLog)}
          onClose={() => setSelectedLog(null)}
          title={`Audit Log Record — ${selectedLog.action}`}
        >
          <div className="space-y-4 text-xs">
            <div className="bg-slate-50 p-3.5 rounded-lg border border-slate-200 grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase block">Triggered By</span>
                <span className="font-bold text-slate-900">{selectedLog.user?.name || 'System Auto'}</span>
                <span className="text-[10px] text-indigo-600 block">{selectedLog.user?.role}</span>
              </div>

              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase block">Timestamp</span>
                <span className="font-mono text-slate-800">{formatDateTime(selectedLog.createdAt)}</span>
              </div>
            </div>

            {selectedLog.oldValues && (
              <div>
                <span className="font-bold text-slate-700 block mb-1">State Before Action:</span>
                <pre className="p-3 bg-slate-900 text-amber-300 rounded-lg font-mono text-[11px] overflow-x-auto">
                  {JSON.stringify(selectedLog.oldValues, null, 2)}
                </pre>
              </div>
            )}

            {selectedLog.newValues && (
              <div>
                <span className="font-bold text-slate-700 block mb-1">State After Action:</span>
                <pre className="p-3 bg-slate-900 text-emerald-300 rounded-lg font-mono text-[11px] overflow-x-auto">
                  {JSON.stringify(selectedLog.newValues, null, 2)}
                </pre>
              </div>
            )}

            <div className="flex justify-end pt-3 border-t border-slate-100">
              <Button variant="outline" size="sm" onClick={() => setSelectedLog(null)}>
                Close
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
