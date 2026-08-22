import React, { useEffect, useState } from 'react';
import { User, Briefcase, CreditCard, ShieldCheck, CheckCircle2, AlertCircle } from 'lucide-react';
import { Modal } from '../../components/ui/Modal.jsx';
import { Input } from '../../components/ui/Input.jsx';
import { DatePicker } from '../../components/ui/DatePicker.jsx';
import { Select } from '../../components/ui/Select.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { Badge } from '../../components/ui/Badge.jsx';
import { staffService } from '../../services/staff.service.js';

const ROLE_OPTIONS = [
  { value: 'TEACHER', label: 'Teacher' },
  { value: 'ADMINISTRATOR', label: 'Administrator' },
  { value: 'ACCOUNTANT', label: 'Accountant' },
  { value: 'LIBRARIAN', label: 'Librarian' },
  { value: 'DRIVER', label: 'Driver' },
  { value: 'SUPPORT_STAFF', label: 'Support Staff' },
  { value: 'OTHER', label: 'Other' },
];

const STATUS_OPTIONS = [
  { value: 'ACTIVE', label: 'Active' },
  { value: 'INACTIVE', label: 'Inactive' },
  { value: 'RESIGNED', label: 'Resigned' },
  { value: 'ON_LEAVE', label: 'On Leave' },
];

export const AddEditStaffModal = ({ isOpen, onClose, staff = null, onSuccess }) => {
  const isEditing = Boolean(staff?.id);

  const [formData, setFormData] = useState({
    employeeId: '',
    name: '',
    email: '',
    phone: '',
    role: 'TEACHER',
    department: 'Teaching',
    designation: 'Teacher',
    joiningDate: new Date().toISOString().split('T')[0],
    baseSalary: '25000',
    bankName: '',
    bankAccountNo: '',
    ifscCode: '',
    status: 'ACTIVE',
  });

  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [submitError, setSubmitError] = useState(null);

  useEffect(() => {
    if (staff) {
      setFormData({
        employeeId: staff.employeeId || '',
        name: staff.name || '',
        email: staff.email || '',
        phone: staff.phone || '',
        role: staff.role || 'TEACHER',
        department: staff.department || '',
        designation: staff.designation || '',
        joiningDate: staff.joiningDate ? new Date(staff.joiningDate).toISOString().split('T')[0] : '',
        baseSalary: staff.baseSalary ? String(staff.baseSalary) : '0',
        bankName: staff.bankName || '',
        bankAccountNo: staff.bankAccountNo || '',
        ifscCode: staff.ifscCode || '',
        status: staff.status || 'ACTIVE',
      });
    } else {
      setFormData({
        employeeId: '',
        name: '',
        email: '',
        phone: '',
        role: 'TEACHER',
        department: 'Teaching',
        designation: 'Teacher',
        joiningDate: new Date().toISOString().split('T')[0],
        baseSalary: '',
        bankName: '',
        bankAccountNo: '',
        ifscCode: '',
        status: 'ACTIVE',
      });
    }
    setErrors({});
    setSubmitError(null);
  }, [staff, isOpen]);

  const validateField = (name, value) => {
    let fieldError = null;

    if (name === 'name') {
      if (!value.trim()) fieldError = 'Full Name is required';
      else if (value.trim().length < 2) fieldError = 'Name must be at least 2 characters';
    } else if (name === 'department') {
      if (!value.trim()) fieldError = 'Department is required';
    } else if (name === 'designation') {
      if (!value.trim()) fieldError = 'Designation is required';
    } else if (name === 'joiningDate') {
      if (!value) fieldError = 'Joining Date is required';
    } else if (name === 'phone' && value.trim()) {
      if (!/^[6-9]\d{9}$/.test(value.trim())) {
        fieldError = 'Enter a valid 10-digit phone number (starting 6-9)';
      }
    } else if (name === 'email' && value.trim()) {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())) {
        fieldError = 'Enter a valid email address';
      }
    } else if (name === 'baseSalary' && value !== '') {
      const num = parseFloat(value);
      if (isNaN(num) || num < 0) {
        fieldError = 'Base salary must be a positive number';
      }
    } else if (name === 'ifscCode' && value.trim()) {
      if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(value.trim().toUpperCase())) {
        fieldError = 'IFSC code must be 11 characters (e.g. SBIN0001234)';
      }
    } else if (name === 'bankAccountNo' && value.trim()) {
      if (!/^\d{9,18}$/.test(value.trim())) {
        fieldError = 'Account number must be 9 to 18 digits';
      }
    }

    setErrors((prev) => ({ ...prev, [name]: fieldError }));
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    let updatedValue = value;
    if (name === 'ifscCode') updatedValue = value.toUpperCase();
    setFormData((prev) => ({ ...prev, [name]: updatedValue }));

    if (errors[name]) {
      validateField(name, updatedValue);
    }
  };

  const validateAll = () => {
    const newErrors = {};

    if (!formData.name.trim()) newErrors.name = 'Full Name is required';
    else if (formData.name.trim().length < 2) newErrors.name = 'Name must be at least 2 characters';

    if (!formData.department.trim()) newErrors.department = 'Department is required';
    if (!formData.designation.trim()) newErrors.designation = 'Designation is required';
    if (!formData.joiningDate) newErrors.joiningDate = 'Joining Date is required';

    if (formData.phone?.trim() && !/^[6-9]\d{9}$/.test(formData.phone.trim())) {
      newErrors.phone = 'Enter a valid 10-digit phone number (starting 6-9)';
    }

    if (formData.email?.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
      newErrors.email = 'Enter a valid email address';
    }

    if (formData.baseSalary !== '' && (isNaN(parseFloat(formData.baseSalary)) || parseFloat(formData.baseSalary) < 0)) {
      newErrors.baseSalary = 'Base salary must be a positive number';
    }

    if (formData.ifscCode?.trim() && !/^[A-Z]{4}0[A-Z0-9]{6}$/.test(formData.ifscCode.trim().toUpperCase())) {
      newErrors.ifscCode = 'IFSC code must be 11 characters (e.g. SBIN0001234)';
    }

    if (formData.bankAccountNo?.trim() && !/^\d{9,18}$/.test(formData.bankAccountNo.trim())) {
      newErrors.bankAccountNo = 'Account number must be 9 to 18 digits';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitError(null);

    if (!validateAll()) {
      return;
    }

    setLoading(true);
    try {
      const payload = {
        ...formData,
        name: formData.name.trim(),
        email: formData.email?.trim() || null,
        phone: formData.phone?.trim() || null,
        department: formData.department.trim(),
        designation: formData.designation.trim(),
        bankName: formData.bankName?.trim() || null,
        bankAccountNo: formData.bankAccountNo?.trim() || null,
        ifscCode: formData.ifscCode?.trim()?.toUpperCase() || null,
        baseSalary: parseFloat(formData.baseSalary) || 0,
      };

      let response;
      if (isEditing) {
        response = await staffService.updateStaff(staff.id, payload);
      } else {
        response = await staffService.createStaff(payload);
      }

      if (onSuccess) onSuccess(response.data);
      onClose();
    } catch (err) {
      setSubmitError(err.response?.data?.message || err.message || 'Failed to save staff record');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg">
            <User className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              {isEditing ? 'Edit Staff Profile' : 'Add New Staff Member'}
            </h3>
            <p className="text-[11px] text-slate-500 font-normal">
              {isEditing ? `Editing record for ${staff?.name || 'Staff'}` : 'Register a staff member into payroll & operations'}
            </p>
          </div>
        </div>
      }
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4 text-xs">
        {submitError && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl font-medium flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
            <span>{submitError}</span>
          </div>
        )}

        {/* SECTION 1: PERSONAL & WORK DETAILS */}
        <div className="bg-slate-50/80 p-3.5 rounded-xl border border-slate-200/80 space-y-3">
          <div className="flex items-center justify-between border-b border-slate-200 pb-2">
            <div className="flex items-center gap-1.5 font-bold text-slate-800 text-xs uppercase tracking-wider">
              <Briefcase className="w-3.5 h-3.5 text-indigo-600" />
              <span>1. Work & Personal Information</span>
            </div>
            {!isEditing && (
              <Badge variant="indigo" size="sm">
                Auto Employee Code
              </Badge>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Input
                label="Full Name *"
                name="name"
                value={formData.name}
                onChange={handleChange}
                onBlur={() => validateField('name', formData.name)}
                placeholder="E.g. Rajesh Sharma"
                error={errors.name}
                className="text-xs"
              />
            </div>

            <div>
              <Input
                label="Employee Code"
                name="employeeId"
                value={formData.employeeId || (isEditing ? '' : 'Auto-generated (e.g. AHA-EMP-26-0001)')}
                disabled={true}
                readOnly
                placeholder="Auto-generated automatically"
                className="text-xs bg-slate-100/90 text-slate-500 font-mono cursor-not-allowed"
              />
            </div>

            <div>
              <Input
                label="Department *"
                name="department"
                value={formData.department}
                onChange={handleChange}
                onBlur={() => validateField('department', formData.department)}
                placeholder="E.g. Mathematics / Science / Admin"
                error={errors.department}
                className="text-xs"
              />
            </div>

            <div>
              <Input
                label="Designation *"
                name="designation"
                value={formData.designation}
                onChange={handleChange}
                onBlur={() => validateField('designation', formData.designation)}
                placeholder="E.g. Senior Teacher / Accountant"
                error={errors.designation}
                className="text-xs"
              />
            </div>

            <div>
              <Select
                label="Role / Category *"
                name="role"
                value={formData.role}
                onChange={handleChange}
                options={ROLE_OPTIONS}
                className="text-xs"
              />
            </div>

            <div>
              <DatePicker
                label="Joining Date *"
                name="joiningDate"
                value={formData.joiningDate}
                onChange={(val) => {
                  setFormData({ ...formData, joiningDate: val || '' });
                  if (errors.joiningDate) validateField('joiningDate', val);
                }}
                error={errors.joiningDate}
              />
            </div>

            <div>
              <Input
                label="Phone Number"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                onBlur={() => validateField('phone', formData.phone)}
                placeholder="10-digit mobile number"
                error={errors.phone}
                className="text-xs"
              />
            </div>

            <div>
              <Input
                label="Email Address"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                onBlur={() => validateField('email', formData.email)}
                placeholder="staff@school.com"
                error={errors.email}
                className="text-xs"
              />
            </div>
          </div>
        </div>

        {/* SECTION 2: PAYROLL & BANK ACCOUNT DETAILS */}
        <div className="bg-slate-50/80 p-3.5 rounded-xl border border-slate-200/80 space-y-3">
          <div className="flex items-center justify-between border-b border-slate-200 pb-2">
            <div className="flex items-center gap-1.5 font-bold text-slate-800 text-xs uppercase tracking-wider">
              <CreditCard className="w-3.5 h-3.5 text-emerald-600" />
              <span>2. Salary & Bank Deposit Details</span>
            </div>
            <span className="text-[10px] text-slate-400 font-normal">Optional for Direct Transfer</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <Input
                label="Base Monthly Salary (₹) *"
                name="baseSalary"
                type="number"
                min="0"
                step="500"
                value={formData.baseSalary}
                onChange={handleChange}
                onBlur={() => validateField('baseSalary', formData.baseSalary)}
                placeholder="Monthly base salary"
                error={errors.baseSalary}
                className="text-xs font-mono font-semibold"
              />
            </div>

            <div>
              <Input
                label="Bank Name"
                name="bankName"
                value={formData.bankName}
                onChange={handleChange}
                placeholder="E.g. SBI / HDFC Bank"
                className="text-xs"
              />
            </div>

            <div>
              <Input
                label="Account Number"
                name="bankAccountNo"
                value={formData.bankAccountNo}
                onChange={handleChange}
                onBlur={() => validateField('bankAccountNo', formData.bankAccountNo)}
                placeholder="9-18 digits account number"
                error={errors.bankAccountNo}
                className="text-xs font-mono"
              />
            </div>

            <div>
              <Input
                label="IFSC Code"
                name="ifscCode"
                value={formData.ifscCode}
                onChange={handleChange}
                onBlur={() => validateField('ifscCode', formData.ifscCode)}
                placeholder="11 chars (e.g. SBIN0001234)"
                error={errors.ifscCode}
                className="text-xs font-mono uppercase"
              />
            </div>

            {isEditing && (
              <div className="sm:col-span-2">
                <Select
                  label="Employment Status"
                  name="status"
                  value={formData.status}
                  onChange={handleChange}
                  options={STATUS_OPTIONS}
                  className="text-xs"
                />
              </div>
            )}
          </div>
        </div>

        {/* FOOTER ACTION CONTROLS */}
        <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
          <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={loading}>
            Cancel
          </Button>

          <Button type="submit" variant="primary" size="sm" loading={loading} loadingText="Saving Staff...">
            <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
            {isEditing ? 'Update Staff Profile' : 'Save & Register Staff'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

