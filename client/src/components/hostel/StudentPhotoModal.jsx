import React from 'react';
import { Modal } from '../ui/Modal.jsx';
import { Badge } from '../ui/Badge.jsx';
import { Button } from '../ui/Button.jsx';

export const StudentPhotoModal = ({ isOpen, onClose, student }) => {
  if (!student) return null;

  const name = student.name || student.studentName || 'Student Profile';
  const admissionNo = student.admissionNo || student.admission_no || 'N/A';
  const guardianName = student.guardianName || student.guardian_name || 'N/A';
  const photoUrl = student.photoUrl || student.photo_url || null;
  const className = student.className || null;
  const sectionName = student.sectionName || null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Student Profile Photo"
      size="sm"
    >
      <div className="space-y-4 text-center p-2">
        <div className="w-52 h-52 mx-auto rounded-2xl overflow-hidden border-2 border-indigo-100 shadow-md bg-slate-50 relative flex items-center justify-center">
          {photoUrl ? (
            <img
              src={photoUrl}
              alt={name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-indigo-50 font-black text-4xl text-indigo-600 flex items-center justify-center uppercase">
              {name ? name.slice(0, 2) : 'ST'}
            </div>
          )}
        </div>

        <div className="space-y-1 text-xs">
          <h4 className="text-base font-extrabold text-slate-900">{name}</h4>
          <div className="flex items-center justify-center gap-2 text-xs flex-wrap">
            <Badge variant="indigo" size="sm font-mono">
              Adm: {admissionNo}
            </Badge>
            {className && (
              <Badge variant="neutral" size="sm">
                Class {className} {sectionName ? `- ${sectionName}` : ''}
              </Badge>
            )}
          </div>
          <p className="text-slate-600 pt-1">
            Guardian Name: <strong className="text-slate-900">{guardianName}</strong>
          </p>
        </div>

        <div className="pt-3 border-t border-slate-100 flex justify-end">
          <Button variant="outline" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </Modal>
  );
};
