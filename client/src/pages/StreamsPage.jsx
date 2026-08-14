import React, { useState, useEffect } from 'react';
import { GitBranch, Plus, Edit2, CheckCircle2, XCircle } from 'lucide-react';
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

export const StreamsPage = () => {
  const { showToast } = useToast();
  const [streams, setStreams] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStream, setEditingStream] = useState(null);
  const [formData, setFormData] = useState({ name: '', isActive: true });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  const fetchStreams = async () => {
    setIsLoading(true);
    try {
      const res = await academicService.getStreams();
      if (res.success && Array.isArray(res.data)) {
        setStreams(res.data);
      }
    } catch (err) {
      setErrorMsg(err.message || 'Failed to fetch streams');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStreams();
  }, []);

  const handleOpenAddModal = () => {
    setEditingStream(null);
    setFormData({ name: '', isActive: true });
    setFormError('');
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (str) => {
    setEditingStream(str);
    setFormData({ name: str.name, isActive: str.isActive });
    setFormError('');
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setFormError('Stream name is required');
      return;
    }

    setIsSubmitting(true);
    setFormError('');

    try {
      if (editingStream) {
        await academicService.updateStream(editingStream.id, formData);
        showToast('Stream updated successfully', 'success');
      } else {
        await academicService.addStream(formData);
        showToast('Stream created successfully', 'success');
      }
      setIsModalOpen(false);
      fetchStreams();
    } catch (err) {
      setFormError(err.message || 'Operation failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return <TableSkeleton rows={3} cols={3} />;
  }

  return (
    <div className="space-y-6">
      {/* Standardized Module Header */}
      <ModulePageHeader
        icon={GitBranch}
        title="Academic Streams"
        description="Configure higher secondary academic streams, subject groupings, and tracks."
        actions={
          <Button variant="primary" size="sm" icon={Plus} onClick={handleOpenAddModal}>
            Add Stream
          </Button>
        }
      />

      {errorMsg && <Alert type="danger">{errorMsg}</Alert>}

      {streams.length === 0 ? (
        <EmptyState
          icon={GitBranch}
          title="No streams configured"
          description="If your school offers Class XI/XII specialized streams (e.g. Science, Arts, Commerce), add them here."
          actionLabel="Add Stream"
          onAction={handleOpenAddModal}
        />
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Stream Name</TableHead>
                <TableHead>Applicable Classes</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {streams.map((str) => (
                <TableRow key={str.id}>
                  <TableCell className="font-semibold text-slate-900">
                    <div className="flex items-center gap-2">
                      <GitBranch className="w-4 h-4 text-indigo-600 shrink-0" />
                      <span>{str.name}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="indigo" size="sm">
                      Class XI, XII
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {str.isActive ? (
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
                    <Button variant="ghost" size="sm" icon={Edit2} onClick={() => handleOpenEditModal(str)}>
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
        title={editingStream ? `Edit Stream (${editingStream.name})` : 'Add Academic Stream'}
      >
        {formError && <Alert type="danger" className="mb-4">{formError}</Alert>}

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Stream Name"
            placeholder="e.g. Science, Arts, Commerce, Vocational"
            required
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          />

          <div className="pt-2 border-t border-slate-100">
            <Checkbox
              label="Active Status"
              description="Active streams can be selected for Class XI/XII admissions"
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
              loadingText={editingStream ? 'Saving...' : 'Adding...'}
            >
              {editingStream ? 'Save Changes' : 'Create Stream'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
