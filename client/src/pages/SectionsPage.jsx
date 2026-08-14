import React, { useState, useEffect } from 'react';
import { Layers, Plus, Edit2, CheckCircle2, XCircle } from 'lucide-react';
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

export const SectionsPage = () => {
  const { showToast } = useToast();
  const [sections, setSections] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSection, setEditingSection] = useState(null);
  const [formData, setFormData] = useState({ name: '', isActive: true });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  const fetchSections = async () => {
    setIsLoading(true);
    try {
      const res = await academicService.getSections();
      if (res.success && Array.isArray(res.data)) {
        setSections(res.data);
      }
    } catch (err) {
      setErrorMsg(err.message || 'Failed to fetch sections');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSections();
  }, []);

  const handleOpenAddModal = () => {
    setEditingSection(null);
    setFormData({ name: '', isActive: true });
    setFormError('');
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (sec) => {
    setEditingSection(sec);
    setFormData({ name: sec.name, isActive: sec.isActive });
    setFormError('');
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setFormError('Section name is required');
      return;
    }

    setIsSubmitting(true);
    setFormError('');

    try {
      if (editingSection) {
        await academicService.updateSection(editingSection.id, formData);
        showToast('Section updated successfully', 'success');
      } else {
        await academicService.addSection(formData);
        showToast('Section created successfully', 'success');
      }
      setIsModalOpen(false);
      fetchSections();
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
        icon={Layers}
        title="Class Sections"
        description="Manage class section divisions, classroom allocations, and capacity limits."
        actions={
          <Button variant="primary" size="sm" icon={Plus} onClick={handleOpenAddModal}>
            Add Section
          </Button>
        }
      />

      {errorMsg && <Alert type="danger">{errorMsg}</Alert>}

      {sections.length === 0 ? (
        <EmptyState
          icon={Layers}
          title="No sections configured"
          description="Sections are optional. Add sections only if your school divides classes into divisions such as A, B or C."
          actionLabel="Add Section"
          onAction={handleOpenAddModal}
        />
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Section Name</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sections.map((sec) => (
                <TableRow key={sec.id}>
                  <TableCell className="font-semibold text-slate-900">
                    <div className="flex items-center gap-2">
                      <Layers className="w-4 h-4 text-indigo-600 shrink-0" />
                      <span>Section {sec.name}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    {sec.isActive ? (
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
                    <Button variant="ghost" size="sm" icon={Edit2} onClick={() => handleOpenEditModal(sec)}>
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
        title={editingSection ? `Edit Section (${editingSection.name})` : 'Add Class Section'}
      >
        {formError && <Alert type="danger" className="mb-4">{formError}</Alert>}

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Section Name"
            placeholder="e.g. A, B, C, Blue, Red"
            required
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          />

          <div className="pt-2 border-t border-slate-100">
            <Checkbox
              label="Active Status"
              description="Active sections can be assigned during student admissions"
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
              loadingText={editingSection ? 'Saving...' : 'Adding...'}
            >
              {editingSection ? 'Save Changes' : 'Create Section'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
