import React from 'react';
import { Badge } from '../ui/Badge.jsx';

export const StudentStatusBadge = ({ status, size = 'sm' }) => {
  switch (status) {
    case 'ACTIVE':
      return <Badge variant="success" size={size}>ACTIVE</Badge>;
    case 'LEFT':
      return <Badge variant="danger" size={size}>Left School</Badge>;
    case 'GRADUATED':
      return <Badge variant="info" size={size}>Graduated</Badge>;
    case 'ARCHIVED':
      return <Badge variant="neutral" size={size}>ARCHIVED</Badge>;
    case 'PROMOTED':
      return <Badge variant="info" size={size}>PROMOTED</Badge>;
    case 'REPEATED':
      return <Badge variant="warning" size={size}>REPEATED</Badge>;
    default:
      return <Badge variant="neutral" size={size}>{status || 'UNKNOWN'}</Badge>;
  }
};
