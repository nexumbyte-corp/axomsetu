import React, { useEffect, useState } from 'react';
import { User, Briefcase, CreditCard, CheckCircle2, AlertCircle } from 'lucide-react';
import { Modal } from '../../components/ui/Modal.jsx';
import { Input } from '../../components/ui/Input.jsx';
import { DatePicker } from '../../components/ui/DatePicker.jsx';
import { Select } from '../../components/ui/Select.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { Badge } from '../../components/ui/Badge.jsx';
import { staffService } from '../../services/staff.service.js';
import { getFormErrors } from '../../utils/errorUtils.js';
import { getISTTodayString, formatDateForInput } from '../../utils/formatters.js';

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

const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9]+(?:[.-][a-zA-Z0-9]+)*\.[a-zA-Z]{2,10}$/;
const PHONE_REGEX = /^[6-9]\d{9}$/;
const IFSC_REGEX = /^[A-Z0-9]{4,20}$/;
const BANK_ACCOUNT_REGEX = /^\d{9,18}$/;
const NAME_REGEX = /^[a-zA-Z\s.'-]+$/;
const BANK_NAME_REGEX = /^[a-zA-Z0-9\s.&',()/-]+$/;

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
    joiningDate: getISTTodayString(),
    baseSalary: '',
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
        phone: staff.phone ? String(staff.phone).replace(/\D/g, '').slice(0, 10) : '',
        role: staff.role || 'TEACHER',
        department: staff.department || '',
        designation: staff.designation || '',
        joiningDate: staff.joiningDate ? formatDateForInput(staff.joiningDate) : '',
        baseSalary: staff.baseSalary !== undefined && staff.baseSalary !== null ? String(staff.baseSalary) : '',
        bankName: staff.bankName || '',
        bankAccountNo: staff.bankAccountNo ? String(staff.bankAccountNo).replace(/\D/g, '').slice(0, 18) : '',
        ifscCode: staff.ifscCode ? String(staff.ifscCode).toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 20) : '',
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
        joiningDate: getISTTodayString(),
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
      const trimmed = (value || '').trim();
      if (!trimmed) {
        fieldError = 'Full Name is required';
      } else if (trimmed.length < 2) {
        fieldError = 'Name must be at least 2 characters';
      } else if (trimmed.length > 100) {
        fieldError = 'Name must not exceed 100 characters';
      } else if (!NAME_REGEX.test(trimmed)) {
        fieldError = 'Name can only contain letters, spaces, dots, and hyphens';
      } else if (/(.)\1{5,}/.test(trimmed)) {
        fieldError = 'Name contains excessive repeated characters';
      }
    } else if (name === 'department') {
      const trimmed = (value || '').trim();
      if (!trimmed) {
        fieldError = 'Department is required';
      } else if (trimmed.length < 2) {
        fieldError = 'Department must be at least 2 characters';
      } else if (trimmed.length > 50) {
        fieldError = 'Department must not exceed 50 characters';
      }
    } else if (name === 'designation') {
      const trimmed = (value || '').trim();
      if (!trimmed) {
        fieldError = 'Designation is required';
      } else if (trimmed.length < 2) {
        fieldError = 'Designation must be at least 2 characters';
      } else if (trimmed.length > 50) {
        fieldError = 'Designation must not exceed 50 characters';
      }
    } else if (name === 'joiningDate') {
      if (!value) {
        fieldError = 'Joining Date is required';
      }
    } else if (name === 'phone') {
      const trimmed = (value || '').trim();
      if (trimmed) {
        if (trimmed.length < 10) {
          fieldError = 'Phone number must be exactly 10 digits';
        } else if (!PHONE_REGEX.test(trimmed)) {
          fieldError = 'Enter a valid 10-digit mobile number starting with 6, 7, 8, or 9';
        }
      }
    } else if (name === 'email') {
      const trimmed = (value || '').trim();
      if (trimmed) {
        if (trimmed.length > 150) {
          fieldError = 'Email must not exceed 150 characters';
        } else if (!EMAIL_REGEX.test(trimmed)) {
          fieldError = 'Enter a valid email address (e.g. name@example.com)';
        }
      }
    } else if (name === 'baseSalary') {
      const strVal = String(value || '').trim();
      if (!strVal) {
        fieldError = 'Base monthly salary is mandatory';
      } else {
        const num = parseFloat(strVal);
        if (isNaN(num) || num <= 0) {
          fieldError = 'Base monthly salary must be greater than 0';
        } else if (num > 10000000) {
          fieldError = 'Base monthly salary must not exceed ₹10,000,000';
        }
      }
    } else if (name === 'bankName') {
      const trimmed = (value || '').trim();
      if (trimmed) {
        if (trimmed.length < 2) {
          fieldError = 'Bank name must be at least 2 characters';
        } else if (trimmed.length > 50) {
          fieldError = 'Bank name must not exceed 50 characters';
        } else if (!BANK_NAME_REGEX.test(trimmed)) {
          fieldError = 'Bank name contains invalid characters';
        } else if (!/[a-zA-Z]{2,}/.test(trimmed)) {
          fieldError = 'Bank name must contain valid alphabetic characters';
        } else if (/(.)\1{7,}/.test(trimmed)) {
          fieldError = 'Bank name contains excessive repeated characters';
        }
      }
    } else if (name === 'bankAccountNo') {
      const trimmed = (value || '').trim();
      if (trimmed) {
        if (trimmed.length < 9) {
          fieldError = 'Account number must be 9 to 18 digits';
        } else if (!BANK_ACCOUNT_REGEX.test(trimmed)) {
          fieldError = 'Account number must be 9 to 18 digits';
        }
      }
    } else if (name === 'ifscCode') {
      const trimmed = (value || '').trim().toUpperCase();
      if (trimmed) {
        if (trimmed.length < 4) {
          fieldError = 'IFSC code must be at least 4 characters';
        } else if (trimmed.length > 20) {
          fieldError = 'IFSC code must not exceed 20 characters';
        } else if (!IFSC_REGEX.test(trimmed)) {
          fieldError = 'IFSC code can only contain letters and numbers (up to 20 chars)';
        }
      }
    }

    setErrors((prev) => ({ ...prev, [name]: fieldError }));
    return fieldError === null;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    let updatedValue = value;

    if (name === 'phone') {
      updatedValue = value.replace(/\D/g, '').slice(0, 10);
    } else if (name === 'bankAccountNo') {
      updatedValue = value.replace(/\D/g, '').slice(0, 18);
    } else if (name === 'ifscCode') {
      updatedValue = value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 20);
    } else if (name === 'baseSalary') {
      if (value.startsWith('-')) return;
      const clean = value.replace(/[^\d.]/g, '');
      if (clean.length > 8) return;
      updatedValue = clean;
    } else if (name === 'email') {
      updatedValue = value.replace(/\s/g, '').slice(0, 150);
    } else if (name === 'bankName') {
      updatedValue = value.slice(0, 50);
    } else if (name === 'name') {
      updatedValue = value.slice(0, 100);
    } else if (name === 'department' || name === 'designation') {
      updatedValue = value.slice(0, 50);
    }

    setFormData((prev) => ({ ...prev, [name]: updatedValue }));

    if (errors[name]) {
      validateField(name, updatedValue);
    }
  };

  const validateAll = () => {
    const newErrors = {};

    const trimmedName = formData.name.trim();
    if (!trimmedName) {
      newErrors.name = 'Full Name is required';
    } else if (trimmedName.length < 2) {
      newErrors.name = 'Name must be at least 2 characters';
    } else if (trimmedName.length > 100) {
      newErrors.name = 'Name must not exceed 100 characters';
    } else if (!NAME_REGEX.test(trimmedName)) {
      newErrors.name = 'Name can only contain letters, spaces, dots, and hyphens';
    } else if (/(.)\1{5,}/.test(trimmedName)) {
      newErrors.name = 'Name contains excessive repeated characters';
    }

    const trimmedDept = formData.department.trim();
    if (!trimmedDept) {
      newErrors.department = 'Department is required';
    } else if (trimmedDept.length < 2) {
      newErrors.department = 'Department must be at least 2 characters';
    } else if (trimmedDept.length > 50) {
      newErrors.department = 'Department must not exceed 50 characters';
    }

    const trimmedDesig = formData.designation.trim();
    if (!trimmedDesig) {
      newErrors.designation = 'Designation is required';
    } else if (trimmedDesig.length < 2) {
      newErrors.designation = 'Designation must be at least 2 characters';
    } else if (trimmedDesig.length > 50) {
      newErrors.designation = 'Designation must not exceed 50 characters';
    }

    if (!formData.joiningDate) {
      newErrors.joiningDate = 'Joining Date is required';
    }

    if (formData.phone?.trim()) {
      const trimmedPhone = formData.phone.trim();
      if (trimmedPhone.length < 10) {
        newErrors.phone = 'Phone number must be exactly 10 digits';
      } else if (!PHONE_REGEX.test(trimmedPhone)) {
        newErrors.phone = 'Enter a valid 10-digit mobile number starting with 6, 7, 8, or 9';
      }
    }

    if (formData.email?.trim()) {
      const trimmedEmail = formData.email.trim();
      if (trimmedEmail.length > 150) {
        newErrors.email = 'Email must not exceed 150 characters';
      } else if (!EMAIL_REGEX.test(trimmedEmail)) {
        newErrors.email = 'Enter a valid email address (e.g. name@example.com)';
      }
    }

    const salaryStr = String(formData.baseSalary || '').trim();
    if (!salaryStr) {
      newErrors.baseSalary = 'Base monthly salary is mandatory';
    } else {
      const num = parseFloat(salaryStr);
      if (isNaN(num) || num <= 0) {
        newErrors.baseSalary = 'Base monthly salary must be greater than 0';
      } else if (num > 10000000) {
        newErrors.baseSalary = 'Base monthly salary must not exceed ₹10,000,000';
      }
    }

    if (formData.bankName?.trim()) {
      const trimmedBank = formData.bankName.trim();
      if (trimmedBank.length < 2) {
        newErrors.bankName = 'Bank name must be at least 2 characters';
      } else if (trimmedBank.length > 50) {
        newErrors.bankName = 'Bank name must not exceed 50 characters';
      } else if (!BANK_NAME_REGEX.test(trimmedBank)) {
        newErrors.bankName = 'Bank name contains invalid characters';
      } else if (!/[a-zA-Z]{2,}/.test(trimmedBank)) {
        newErrors.bankName = 'Bank name must contain valid alphabetic characters';
      } else if (/(.)\1{7,}/.test(trimmedBank)) {
        newErrors.bankName = 'Bank name contains excessive repeated characters';
      }
    }

    if (formData.bankAccountNo?.trim()) {
      const trimmedAcc = formData.bankAccountNo.trim();
      if (trimmedAcc.length < 9 || !BANK_ACCOUNT_REGEX.test(trimmedAcc)) {
        newErrors.bankAccountNo = 'Account number must be 9 to 18 digits';
      }
    }

    if (formData.ifscCode?.trim()) {
      const trimmedIfsc = formData.ifscCode.trim().toUpperCase();
      if (trimmedIfsc.length < 4) {
        newErrors.ifscCode = 'IFSC code must be at least 4 characters';
      } else if (trimmedIfsc.length > 20) {
        newErrors.ifscCode = 'IFSC code must not exceed 20 characters';
      } else if (!IFSC_REGEX.test(trimmedIfsc)) {
        newErrors.ifscCode = 'IFSC code can only contain letters and numbers (up to 20 chars)';
      }
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
        baseSalary: parseFloat(formData.baseSalary),
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
      setSubmitError(err.message || 'Failed to save staff record');
      const backendErrors = getFormErrors(err);
      if (Object.keys(backendErrors).length > 0) {
        setErrors((prev) => ({ ...prev, ...backendErrors }));
      }
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
      size="xl"
    >
      <form onSubmit={handleSubmit} autoComplete="off" className="space-y-4 text-xs">
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
                size="sm"
                label="Full Name *"
                name="name"
                value={formData.name}
                onChange={handleChange}
                onBlur={() => validateField('name', formData.name)}
                placeholder="Full Name"
                error={errors.name}
                maxLength={100}
                required
              />
            </div>

            <div>
              <Input
                size="sm"
                label="Employee Code"
                name="employeeId"
                value={formData.employeeId || (isEditing ? '' : 'Auto-generated')}
                disabled={true}
                readOnly
                placeholder="Auto-generated automatically"
                className="bg-slate-100/90 text-slate-500 font-mono cursor-not-allowed"
              />
            </div>

            <div>
              <Input
                size="sm"
                label="Department *"
                name="department"
                value={formData.department}
                onChange={handleChange}
                onBlur={() => validateField('department', formData.department)}
                placeholder="Department"
                error={errors.department}
                maxLength={50}
                required
              />
            </div>

            <div>
              <Input
                size="sm"
                label="Designation *"
                name="designation"
                value={formData.designation}
                onChange={handleChange}
                onBlur={() => validateField('designation', formData.designation)}
                placeholder="Designation"
                error={errors.designation}
                maxLength={50}
                required
              />
            </div>

            <div>
              <Select
                size="sm"
                label="Role / Category *"
                name="role"
                value={formData.role}
                onChange={handleChange}
                options={ROLE_OPTIONS}
              />
            </div>

            <div>
              <DatePicker
                size="sm"
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
                size="sm"
                label="Phone Number"
                name="phone"
                type="tel"
                inputMode="numeric"
                value={formData.phone}
                onChange={handleChange}
                onBlur={() => validateField('phone', formData.phone)}
                placeholder="10-digit phone number"
                error={errors.phone}
                maxLength={10}
                className="font-mono"
              />
            </div>

            <div>
              <Input
                size="sm"
                label="Email Address"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                onBlur={() => validateField('email', formData.email)}
                placeholder="Email Address"
                error={errors.email}
                maxLength={150}
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
            <span className="text-[10px] text-slate-500 font-medium">Bank details optional</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <Input
                size="sm"
                label="Base Monthly Salary (₹) *"
                name="baseSalary"
                type="number"
                min="0"
                max="10000000"
                maxLength={8}
                step="500"
                inputMode="decimal"
                value={formData.baseSalary}
                onChange={handleChange}
                onBlur={() => validateField('baseSalary', formData.baseSalary)}
                onKeyDown={(e) => {
                  if (['-', 'e', 'E', '+'].includes(e.key)) e.preventDefault();
                }}
                placeholder="Base Salary"
                error={errors.baseSalary}
                className="font-mono font-semibold"
                required
              />
            </div>

            <div>
              <Input
                size="sm"
                label="Bank Name"
                name="bankName"
                value={formData.bankName}
                onChange={handleChange}
                onBlur={() => validateField('bankName', formData.bankName)}
                placeholder="Bank Name"
                error={errors.bankName}
                maxLength={50}
              />
            </div>

            <div>
              <Input
                size="sm"
                label="Account Number"
                name="bankAccountNo"
                type="text"
                inputMode="numeric"
                value={formData.bankAccountNo}
                onChange={handleChange}
                onBlur={() => validateField('bankAccountNo', formData.bankAccountNo)}
                placeholder="Account Number"
                error={errors.bankAccountNo}
                maxLength={18}
                className="font-mono"
              />
            </div>

            <div>
              <Input
                size="sm"
                label="IFSC Code"
                name="ifscCode"
                value={formData.ifscCode}
                onChange={handleChange}
                onBlur={() => validateField('ifscCode', formData.ifscCode)}
                placeholder="IFSC Code"
                error={errors.ifscCode}
                maxLength={20}
                className="font-mono uppercase"
                autoCapitalize="characters"
              />
            </div>

            {isEditing && (
              <div className="sm:col-span-2">
                <Select
                  size="sm"
                  label="Employment Status"
                  name="status"
                  value={formData.status}
                  onChange={handleChange}
                  options={STATUS_OPTIONS}
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

