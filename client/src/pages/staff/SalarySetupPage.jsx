import React, { useEffect, useState } from 'react';
import { useAcademicYear } from '../../hooks/useAcademicYear.js';
import { staffService } from '../../services/staff.service.js';
import { Card } from '../../components/ui/Card.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { Select } from '../../components/ui/Select.jsx';
import { Input } from '../../components/ui/Input.jsx';
import { DatePicker } from '../../components/ui/DatePicker.jsx';
import { Badge } from '../../components/ui/Badge.jsx';
import { Spinner } from '../../components/ui/Spinner.jsx';
import { ModulePageHeader } from '../../components/ui/ModulePageHeader.jsx';
import { StaffSubNav } from './StaffSubNav.jsx';
import {
  DollarSign,
  Copy,
  Save,
  Calendar,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';

const getTodayFormatted = () => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const SalarySetupPage = () => {
  const { academicYears, selectedYearId } = useAcademicYear();

  const [targetYearId, setTargetYearId] = useState(selectedYearId || '');
  const [loading, setLoading] = useState(true);
  const [copying, setCopying] = useState(false);
  const [saving, setSaving] = useState(false);

  const [effectiveFrom, setEffectiveFrom] = useState(getTodayFormatted());
  const [rows, setRows] = useState([]);
  const [previousYearInfo, setPreviousYearInfo] = useState(null);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const [message, setMessage] = useState(null); // { type: 'success'|'error', text: '' }

  useEffect(() => {
    if (selectedYearId && !targetYearId) {
      setTargetYearId(selectedYearId);
    }
  }, [selectedYearId]);

  const fetchSalarySetup = async () => {
    if (!targetYearId) return;
    setLoading(true);
    setMessage(null);
    try {
      const res = await staffService.getSalarySetup(targetYearId);
      const data = res.data;

      setPreviousYearInfo(data.previousYear);
      setRows(data.rows || []);

      if (data.rows?.[0]?.effectiveFrom) {
        setEffectiveFrom(new Date(data.rows[0].effectiveFrom).toISOString().split('T')[0]);
      } else {
        setEffectiveFrom(getTodayFormatted());
      }
    } catch (err) {
      console.error('Failed to load salary setup:', err);
      setMessage({ type: 'error', text: err.response?.data?.message || 'Failed to load salary setup.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSalarySetup();
  }, [targetYearId]);

  const handleCopyPreviousYear = async () => {
    if (!targetYearId) return;
    setCopying(true);
    setMessage(null);
    try {
      const res = await staffService.copyPreviousYearSalary(targetYearId);
      setMessage({ type: 'success', text: res.message || 'Salary setup copied successfully!' });
      fetchSalarySetup();
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.message || err.message || 'Copying failed.' });
    } finally {
      setCopying(false);
    }
  };

  const handleSalaryChange = (staffId, newValue) => {
    setRows((prevRows) =>
      prevRows.map((r) => {
        if (r.staffId === staffId) {
          const numVal = Math.max(0, parseFloat(newValue) || 0);
          const diff = numVal - r.previousSalary;
          return {
            ...r,
            newSalary: numVal,
            change: diff,
            status: diff === 0 ? 'Same' : 'Changed',
          };
        }
        return r;
      })
    );
  };

  const handleSaveSetup = async () => {
    if (!targetYearId) return;
    setSaving(true);
    setMessage(null);
    try {
      const payloadRows = rows.map((r) => ({
        staffId: r.staffId,
        newSalary: r.newSalary,
        components: r.components,
      }));

      const res = await staffService.saveSalarySetup({
        academicYearId: targetYearId,
        effectiveFrom,
        rows: payloadRows,
      });

      setMessage({ type: 'success', text: res.message || 'Salary setup saved successfully!' });
      fetchSalarySetup();
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.message || err.message || 'Failed to save salary setup.' });
    } finally {
      setSaving(false);
    }
  };

  const yearOptions = academicYears.map((y) => ({
    value: y.id,
    label: `${y.name}${y.isCurrent ? ' (Current Year)' : ''}`,
  }));

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <ModulePageHeader
        icon={DollarSign}
        title="Salary Structure Setup"
        description="Define base monthly salaries and structure parameters by Academic Year for all staff members."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <div className="w-44">
              <Select
                value={targetYearId}
                onChange={(e) => setTargetYearId(e.target.value)}
                options={yearOptions}
              />
            </div>

            {previousYearInfo && (
              <Button
                variant="outline"
                size="sm"
                icon={Copy}
                loading={copying}
                loadingText="Copying..."
                onClick={handleCopyPreviousYear}
                title={`Copy setup from ${previousYearInfo.name}`}
              >
                Copy Previous Year
              </Button>
            )}

            <Button
              variant="primary"
              size="sm"
              icon={Save}
              loading={saving}
              loadingText="Saving..."
              onClick={handleSaveSetup}
            >
              Save Salary Setup
            </Button>
          </div>
        }
      />

      <StaffSubNav />

      {/* Alert Notification Message */}
      {message && (
        <div
          className={`p-4 rounded-xl border text-xs font-medium flex items-center gap-2 ${
            message.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-red-50 border-red-200 text-red-800'
          }`}
        >
          {message.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
          )}
          <span>{message.text}</span>
        </div>
      )}

      {/* Effective Date Bar */}
      <Card className="p-4 bg-white border border-slate-200 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Calendar className="w-4 h-4 text-indigo-600" />
          <div>
            <label className="text-xs font-bold text-slate-800">Salary Effective Date</label>
            <p className="text-[11px] text-slate-500">Historical salary records prior to this date remain unchanged.</p>
          </div>
        </div>

        <div className="w-48">
          <DatePicker
            value={effectiveFrom}
            onChange={(val) => setEffectiveFrom(val)}
          />
        </div>
      </Card>

      {/* Revision Screen Table */}
      <Card className="overflow-hidden shadow-2xs">
        {loading ? (
          <div className="flex justify-center items-center py-16">
            <Spinner size="lg" />
          </div>
        ) : rows.length === 0 ? (
          <div className="p-12 text-center text-slate-500 text-xs">
            No active staff members available for salary setup.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase font-bold text-[10px] tracking-wider">
                <tr>
                  <th className="py-3.5 px-4">Staff Member</th>
                  <th className="py-3.5 px-4 text-right">Previous Salary (₹)</th>
                  <th className="py-3.5 px-4 text-right w-44">New Salary (₹)</th>
                  <th className="py-3.5 px-4 text-right">Change</th>
                  <th className="py-3.5 px-4 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {rows.map((r) => (
                  <tr key={r.staffId} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-xs">
                          {r.name.charAt(0)}
                        </div>
                        <div>
                          <p className="font-bold text-slate-900">{r.name}</p>
                          <p className="text-[10px] text-slate-500 font-mono">
                            ID: {r.employeeId} | {r.department || 'General'}
                          </p>
                        </div>
                      </div>
                    </td>

                    <td className="py-3 px-4 text-right font-mono font-bold text-slate-500">
                      ₹{r.previousSalary.toLocaleString('en-IN')}
                    </td>

                    <td className="py-3 px-4 text-right">
                      <Input
                        type="number"
                        min="0"
                        step="500"
                        value={r.newSalary}
                        onChange={(e) => handleSalaryChange(r.staffId, e.target.value)}
                        className="text-right font-mono font-bold text-slate-900"
                      />
                    </td>

                    <td className="py-3 px-4 text-right font-mono font-bold">
                      {r.change > 0 ? (
                        <span className="text-emerald-600">+₹{r.change.toLocaleString('en-IN')}</span>
                      ) : r.change < 0 ? (
                        <span className="text-red-600">-₹{Math.abs(r.change).toLocaleString('en-IN')}</span>
                      ) : (
                        <span className="text-slate-400">₹0</span>
                      )}
                    </td>

                    <td className="py-3 px-4 text-center">
                      {r.status === 'Changed' ? (
                        <Badge variant="warning" size="sm">Changed</Badge>
                      ) : (
                        <Badge variant="neutral" size="sm">Same</Badge>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Advanced Salary Components Expander (Optional) */}
      <div className="pt-2">
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-indigo-600 transition-colors"
        >
          <span>{showAdvanced ? 'Hide Advanced Salary Details' : 'Advanced Salary Details'}</span>
          {showAdvanced ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>

        {showAdvanced && (
          <Card className="mt-3 p-4 bg-slate-50 border border-slate-200 text-xs text-slate-600 space-y-2">
            <h4 className="font-bold text-slate-800">Advanced Salary Component Breakdown</h4>
            <p>
              By default, normal school administrators manage monthly base salary directly. Component-level breakdowns
              (Basic, HRA, DA, Special Allowance) are automatically calculated proportionally during export if required by regulatory frameworks.
            </p>
          </Card>
        )}
      </div>
    </div>
  );
};
