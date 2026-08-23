import React, { useState, useEffect } from 'react';
import { Languages, Plus, Edit2, CheckCircle2, XCircle } from 'lucide-react';
import { academicService } from '../services/academic.service.js';
import { Table, TableHeader, TableHead, TableBody, TableRow, TableCell } from '../components/ui/Table.jsx';
import { Button } from '../components/ui/Button.jsx';
import { Badge } from '../components/ui/Badge.jsx';
import { Modal } from '../components/ui/Modal.jsx';
import { Input } from '../components/ui/Input.jsx';
import { Checkbox } from '../components/ui/Checkbox.jsx';
import { Alert } from '../components/ui/Alert.jsx';
import { EmptyState } from '../components/ui/EmptyState.jsx';
import { TableSkeleton } from '../components/ui/Skeleton.jsx';
import { useToast } from '../components/ui/Toast.jsx';
import { ModulePageHeader } from '../components/ui/ModulePageHeader.jsx';

export const MediumsPage = () => {
  const { showToast } = useToast();
  const [mediums, setMediums] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMedium, setEditingMedium] = useState(null);
  const [formData, setFormData] = useState({ name: '', isActive: true });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  const fetchMediums = async () => {
    setIsLoading(true);
    try {
      const res = await academicService.getMediums();
      if (res.success && Array.isArray(res.data)) {
        setMediums(res.data);
      }
    } catch (err) {
      setErrorMsg(err.message || 'Failed to fetch teaching mediums');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMediums();
  }, []);

  const handleOpenAddModal = () => {
    setEditingMedium(null);
    setFormData({ name: '', isActive: true });
    setFormError('');
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (med) => {
    setEditingMedium(med);
    setFormData({ name: med.name, isActive: med.isActive });
    setFormError('');
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setFormError('Medium name is required');
      return;
    }

    setIsSubmitting(true);
    setFormError('');

    try {
      if (editingMedium) {
        await academicService.updateMedium(editingMedium.id, formData);
        showToast('Medium updated successfully', 'success');
      } else {
        await academicService.addMedium(formData);
        showToast('Medium created successfully', 'success');
      }
      setIsModalOpen(false);
      fetchMediums();
    } catch (err) {
      setFormError(err.message || 'Operation failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return <TableSkeleton rows={4} cols={3} />;
  }

  return (
    <div className="space-y-6">
      {/* Standardized Module Header */}
      <ModulePageHeader
        icon={Languages}
        title="Teaching Mediums"
        description="Configure instruction languages and medium divisions across school programs."
        actions={
          <Button variant="primary" size="sm" icon={Plus} onClick={handleOpenAddModal}>
            Add Medium
          </Button>
        }
      />

      {errorMsg && <Alert type="danger">{errorMsg}</Alert>}

      {mediums.length === 0 ? (
        <EmptyState
          icon={Languages}
          title="No mediums configured yet"
          description="Add the teaching mediums used by your school to enable class and student section assignments."
          actionLabel="Add Medium"
          onAction={handleOpenAddModal}
        />
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Medium Name</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {mediums.map((med) => (
                <TableRow key={med.id}>
                  <TableCell className="font-semibold text-slate-900">
                    <div className="flex items-center gap-2">
                      <Languages className="w-4 h-4 text-indigo-600 shrink-0" />
                      <span>{med.name}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    {med.isActive ? (
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
                    <Button variant="ghost" size="sm" icon={Edit2} onClick={() => handleOpenEditModal(med)}>
                      Edit
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Add/Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingMedium ? `Edit Medium (${editingMedium.name})` : 'Add Teaching Medium'}
      >
        {formError && <Alert type="danger" className="mb-4">{formError}</Alert>}

        <form onSubmit={handleSubmit} autoComplete="off" className="space-y-4">
          <Input
            label="Medium Name"
            placeholder="e.g. English, Assamese, Hindi, Bengali"
            required
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          />

          <div className="pt-2 border-t border-slate-100">
            <Checkbox
              label="Active Status"
              description="Active mediums can be assigned during student admissions"
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
              loadingText={editingMedium ? 'Saving...' : 'Adding...'}
            >
              {editingMedium ? 'Save Changes' : 'Create Medium'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
