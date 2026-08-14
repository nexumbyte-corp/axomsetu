import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Clock, Filter, Eye, RefreshCw, Phone, Mail } from 'lucide-react';
import { adminService } from '../../../services/adminService.js';
import { ModulePageHeader } from '../../../components/ui/ModulePageHeader.jsx';
import { Spinner } from '../../../components/ui/Spinner.jsx';
import { Toast } from '../../../components/ui/Toast.jsx';
import { Table, TableHeader, TableHead, TableBody, TableRow, TableCell } from '../../../components/ui/Table.jsx';
import { Select } from '../../../components/ui/Select.jsx';
import { Button } from '../../../components/ui/Button.jsx';
import { Badge } from '../../../components/ui/Badge.jsx';

export const SuperAdminExpiringReportPage = () => {
  const [expiringList, setExpiringList] = useState([]);
  const [daysFilter, setDaysFilter] = useState('30');
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);

  const fetchReport = async () => {
    setLoading(true);
    try {
      const res = await adminService.getExpiringReport({ days: daysFilter });
      setExpiringList(res.data || []);
    } catch (err) {
      setToast({ type: 'danger', message: err.message || 'Failed to fetch expiring subscriptions' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, [daysFilter]);

  const formatCurrency = (val) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(
      val || 0
    );

  return (
    <div className="space-y-6">
      {toast && (
        <Toast
          type={toast.type}
          message={toast.message}
          onClose={() => setToast(null)}
        />
      )}

      <ModulePageHeader
        title="Subscriptions Expiring Soon Report"
        description="Identify active or trialing school subscriptions reaching their renewal deadline for proactive platform operations."
      />

      {/* Filter Bar */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xs">
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <label className="text-xs font-semibold text-slate-700 shrink-0">Expiry Horizon:</label>
          <Select
            value={daysFilter}
            onChange={(e) => setDaysFilter(e.target.value)}
            className="w-48"
          >
            <option value="7">Next 7 Days (Urgent)</option>
            <option value="15">Next 15 Days</option>
            <option value="30">Next 30 Days</option>
            <option value="60">Next 60 Days</option>
          </Select>
        </div>
        <Button variant="outline" size="sm" icon={RefreshCw} onClick={fetchReport}>
          Refresh List
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Spinner size="lg" label="Checking expiring subscriptions..." />
        </div>
      ) : (

        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>School</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead>Expiry Date</TableHead>
                <TableHead>Days Left</TableHead>
                <TableHead>School Owner & Contact</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {expiringList.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-10 text-slate-500">
                    No subscriptions expiring in the next {daysFilter} days.
                  </TableCell>
                </TableRow>
              ) : (
                expiringList.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-bold text-slate-900">
                      <Link to={`/admin/schools/${item.schoolId}`} className="hover:text-indigo-600">
                        {item.schoolName}
                      </Link>
                      <span className="text-[10px] text-slate-400 font-mono block">{item.schoolCode}</span>
                    </TableCell>

                    <TableCell className="font-semibold text-slate-800">{item.planName}</TableCell>

                    <TableCell className="text-xs text-slate-600">
                      {new Date(item.endDate).toLocaleDateString()}
                    </TableCell>

                    <TableCell>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          item.daysRemaining <= 7 ? 'bg-rose-50 text-rose-700' : 'bg-amber-50 text-amber-700'
                        }`}
                      >
                        {item.daysRemaining} days remaining
                      </span>
                    </TableCell>

                    <TableCell>
                      <div className="text-xs">
                        <p className="font-semibold text-slate-900">{item.ownerName}</p>
                        <p className="text-[11px] text-slate-500">{item.ownerEmail || item.schoolEmail}</p>
                      </div>
                    </TableCell>

                    <TableCell className="text-right">
                      <Link
                        to={`/admin/schools/${item.schoolId}`}
                        className="inline-flex items-center gap-1 text-xs font-bold text-indigo-600 hover:text-indigo-800"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Inspect School</span>
                      </Link>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
};
