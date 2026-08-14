import React, { useState, useEffect } from 'react';
import { BookOpen, Plus, Edit2, Trash2, CheckCircle2, XCircle, GitBranch, AlertTriangle } from 'lucide-react';
import { academicService } from '../services/academic.service.js';
import { Table, TableHeader, TableHead, TableBody, TableRow, TableCell } from '../components/ui/Table.jsx';
import { Button } from '../components/ui/Button.jsx';
import { Badge } from '../components/ui/Badge.jsx';
import { Modal } from '../components/ui/Modal.jsx';
import { Input } from '../components/ui/Input.jsx';
import { Checkbox } from '../components/ui/Checkbox.jsx';
import { Alert } from '../components/ui/Alert.jsx';
import { TableSkeleton } from '../components/ui/Skeleton.jsx';
import { useToast } from '../components/ui/Toast.jsx';
import { ModulePageHeader } from '../components/ui/ModulePageHeader.jsx';

export const ClassesPage = () => {
  const { showToast } = useToast();
  const [classes, setClasses] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  // Add/Edit Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingClass, setEditingClass] = useState(null);
  const [formData, setFormData] = useState({ name: '', order: 1, hasStream: false, isActive: true });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  // Delete Modal State
  const [deletingClass, setDeletingClass] = useState(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  const fetchClasses = async () => {
    setIsLoading(true);
    try {
      const res = await academicService.getClasses();
      if (res.success && Array.isArray(res.data)) {
        setClasses(res.data);
      }
    } catch (err) {
      setErrorMsg(err.message || 'Failed to fetch classes');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchClasses();
  }, []);

  const handleOpenAddModal = () => {
    setEditingClass(null);
    setFormData({ name: '', order: classes.length + 1, hasStream: false, isActive: true });
    setFormError('');
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (cls) => {
    setEditingClass(cls);
    setFormData({
      name: cls.name,
      order: cls.order,
      hasStream: cls.hasStream,
      isActive: cls.isActive,
    });
    setFormError('');
    setIsModalOpen(true);
  };

  const handleOpenDeleteModal = (cls) => {
    setDeletingClass(cls);
    setDeleteError('');
    setIsDeleteModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setFormError('Class name is required');
      return;
    }

    setIsSubmitting(true);
    setFormError('');

    try {
      if (editingClass) {
        await academicService.updateClass(editingClass.id, formData);
        showToast('Class updated successfully', 'success');
      } else {
        await academicService.addClass(formData);
        showToast('Class added successfully', 'success');
      }
      setIsModalOpen(false);
      fetchClasses();
    } catch (err) {
      setFormError(err.response?.data?.message || err.message || 'Operation failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteClass = async () => {
    if (!deletingClass) return;
    setIsDeleting(true);
    setDeleteError('');

    try {
      await academicService.deleteClass(deletingClass.id);
      showToast(`Class ${deletingClass.name} deleted successfully`, 'success');
      setIsDeleteModalOpen(false);
      setDeletingClass(null);
      fetchClasses();
    } catch (err) {
      setDeleteError(err.response?.data?.message || err.message || 'Failed to delete class');
    } finally {
      setIsDeleting(false);
    }
  };

  if (isLoading) {
    return <TableSkeleton rows={6} cols={5} />;
  }

  return (
    <div className="space-y-6">
      {/* Standardized Module Header */}
      <ModulePageHeader
        icon={BookOpen}
        title="Classes & Grade Configuration"
        description="Configure school class levels (PP to XII) and enable Stream applicability for higher secondary classes."
        actions={
          <Button variant="primary" size="sm" icon={Plus} onClick={handleOpenAddModal}>
            Add Class
          </Button>
        }
      />

      {errorMsg && <Alert type="danger">{errorMsg}</Alert>}

      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Order</TableHead>
              <TableHead>Class Name</TableHead>
              <TableHead>Stream Applicable</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {classes.map((cls) => (
              <TableRow key={cls.id}>
                <TableCell className="font-mono text-slate-500 font-medium">{cls.order}</TableCell>
                <TableCell className="font-semibold text-slate-900">
                  <div className="flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-indigo-600 shrink-0" />
                    <span>Class {cls.name}</span>
                  </div>
                </TableCell>
                <TableCell>
                  {cls.hasStream ? (
                    <Badge variant="indigo" icon={GitBranch}>
                      Yes (Stream Applicable)
                    </Badge>
                  ) : (
                    <Badge variant="neutral">No</Badge>
                  )}
                </TableCell>
                <TableCell>
                  {cls.isActive ? (
                    <Badge variant="success" icon={CheckCircle2}>
                      Active
                    </Badge>
                  ) : (
                    <Badge variant="danger" icon={XCircle}>
                      Inactive
                    </Badge>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    <Button variant="ghost" size="sm" icon={Edit2} onClick={() => handleOpenEditModal(cls)}>
                      Edit
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      icon={Trash2}
                      onClick={() => handleOpenDeleteModal(cls)}
                      className="text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                    >
                      Delete
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Add/Edit Class Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingClass ? `Edit Class ${editingClass.name}` : 'Add New Class'}
      >
        {formError && <Alert type="danger" className="mb-4">{formError}</Alert>}

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Class Name"
            placeholder="e.g. IX, X, XI, XII"
            required
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          />

          <Input
            label="Display Order Sort"
            type="number"
            min={1}
            required
            value={formData.order}
            onChange={(e) => setFormData({ ...formData, order: parseInt(e.target.value, 10) || 1 })}
          />

          <div className="pt-2 space-y-3 border-t border-slate-100">
            <Checkbox
              label="Stream Applicable"
              description="Enable if this class supports separate streams (e.g. Science, Arts, Commerce for Class XI/XII)"
              checked={formData.hasStream}
              onChange={(e) => setFormData({ ...formData, hasStream: e.target.checked })}
            />

            <Checkbox
              label="Active Status"
              description="Inactive classes will be hidden from student admissions"
              checked={formData.isActive}
              onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
            />
          </div>

          <div className="mt-6 flex justify-end gap-3 pt-4 border-t border-slate-100">
            <Button variant="outline" size="sm" onClick={() => setIsModalOpen(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              loading={isSubmitting}
              loadingText={editingClass ? 'Saving...' : 'Adding...'}
            >
              {editingClass ? 'Save Changes' : 'Create Class'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Class Confirmation Modal */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        title={`Delete Class ${deletingClass?.name}`}
        size="sm"
      >
        <div className="space-y-4 text-xs">
          {deleteError && <Alert type="danger">{deleteError}</Alert>}

          <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-900 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">Hard Delete Check:</p>
              <p className="mt-0.5">
                Class <span className="font-bold">Class {deletingClass?.name}</span> will be permanently deleted only if no students are currently or historically enrolled in it.
              </p>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
            <Button variant="outline" size="sm" onClick={() => setIsDeleteModalOpen(false)} disabled={isDeleting}>
              Cancel
            </Button>
            <Button
              variant="danger"
              size="sm"
              icon={Trash2}
              loading={isDeleting}
              loadingText="Deleting..."
              onClick={handleDeleteClass}
            >
              Delete Class
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
