import React, { useEffect, useState } from 'react';
import { Modal } from '../../components/ui/Modal.jsx';
import { Input } from '../../components/ui/Input.jsx';
import { DatePicker } from '../../components/ui/DatePicker.jsx';
import { Select } from '../../components/ui/Select.jsx';
import { Button } from '../../components/ui/Button.jsx';
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
    department: '',
    designation: '',
    joiningDate: '',
    baseSalary: '',
    bankName: '',
    bankAccountNo: '',
    ifscCode: '',
    status: 'ACTIVE',
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

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
        baseSalary: '25000',
        bankName: '',
        bankAccountNo: '',
        ifscCode: '',
        status: 'ACTIVE',
      });
    }
    setError(null);
  }, [staff, isOpen]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (!formData.name.trim()) {
      setError('Full Name is required');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        ...formData,
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
      setError(err.response?.data?.message || err.message || 'Failed to save staff record');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? 'Edit Staff Profile' : 'Add Staff Member'}
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg font-medium">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Full Name *"
            name="name"
            value={formData.name}
            onChange={handleChange}
            placeholder="Enter staff full name"
            required
          />

          <Input
            label="Employee Code (Auto-generated if left blank)"
            name="employeeId"
            value={formData.employeeId}
            onChange={handleChange}
            placeholder="Auto-generated employee code"
          />

          <Input
            label="Department *"
            name="department"
            value={formData.department}
            onChange={handleChange}
            placeholder="Enter department name"
            required
          />

          <Input
            label="Designation *"
            name="designation"
            value={formData.designation}
            onChange={handleChange}
            placeholder="Enter designation title"
            required
          />

          <Select
            label="Employment Type / Role *"
            name="role"
            value={formData.role}
            onChange={handleChange}
            options={ROLE_OPTIONS}
          />

          <DatePicker
            label="Joining Date *"
            name="joiningDate"
            value={formData.joiningDate}
            onChange={(e, isoVal) => setFormData({ ...formData, joiningDate: isoVal || e?.target?.value || '' })}
            required
          />

          <Input
            label="Phone Number"
            name="phone"
            value={formData.phone}
            onChange={handleChange}
            placeholder="Enter 10-digit phone number"
          />

          <Input
            label="Email Address"
            name="email"
            type="email"
            value={formData.email}
            onChange={handleChange}
            placeholder="Enter email address"
          />

          <Input
            label="Base Monthly Salary (₹)"
            name="baseSalary"
            type="number"
            min="0"
            step="500"
            value={formData.baseSalary}
            onChange={handleChange}
            placeholder="Enter base monthly salary"
          />

          {isEditing && (
            <Select
              label="Status"
              name="status"
              value={formData.status}
              onChange={handleChange}
              options={STATUS_OPTIONS}
            />
          )}
        </div>

        {/* Bank Account Details */}
        <div className="border-t border-slate-200 pt-4 mt-2">
          <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3">
            Bank Details (Optional for Salary Deposit)
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Input
              label="Bank Name"
              name="bankName"
              value={formData.bankName}
              onChange={handleChange}
              placeholder="Enter bank name"
            />
            <Input
              label="Account Number"
              name="bankAccountNo"
              value={formData.bankAccountNo}
              onChange={handleChange}
              placeholder="Enter bank account number"
            />
            <Input
              label="IFSC Code"
              name="ifscCode"
              value={formData.ifscCode}
              onChange={handleChange}
              placeholder="Enter bank IFSC code"
            />
          </div>
        </div>

        <div className="flex justify-end gap-3 border-t border-slate-200 pt-4 mt-4">
          <Button type="button" variant="secondary" onClick={onClose} disabled={loading}>
            Cancel
          </Button>

          <Button type="submit" variant="primary" loading={loading} loadingText="Saving...">
            {isEditing ? 'Update Staff' : 'Add Staff'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
