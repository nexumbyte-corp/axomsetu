import React from 'react';
import {
  ADMIT_CARD_PRESETS,
  DEFAULT_PRESET_ID,
  Preset1Classic,
  Preset2ModernNavy,
  Preset3HeritageBurgundy,
  Preset4MinimalTech,
  Preset5EmeraldAcademic,
  Preset6SplitCompact,
  Preset7RoyalSapphire,
  Preset8OfficialBoard,
  Preset9ModernRounded,
  Preset10GoldAcademy,
} from './admit-card-presets/index.js';

export { ADMIT_CARD_PRESETS, DEFAULT_PRESET_ID };

/**
 * AdmitCardTemplate Dispatcher Component
 * 
 * Supports 10 professionally designed presets (Preset 1 to Preset 10).
 * Preset 1 is the default and preserves the original classic high-contrast design.
 */
export const AdmitCardTemplate = ({
  templateId = DEFAULT_PRESET_ID,
  school = {},
  academicYearName = '',
  examName = '',
  validUpto = '',
  student = null,
  enrollment = null,
  isPreview = false,
  className = '',
}) => {
  const commonProps = {
    school,
    academicYearName,
    examName,
    validUpto,
    student,
    enrollment,
    isPreview,
    className,
  };

  // Normalize templateId to handle 'preset-1', 'Preset 1', 'preset1', etc.
  const normalizedId = String(templateId || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/^preset([0-9]+)$/, 'preset-$1');

  switch (normalizedId) {
    case 'preset-2':
      return <Preset2ModernNavy {...commonProps} />;
    case 'preset-3':
      return <Preset3HeritageBurgundy {...commonProps} />;
    case 'preset-4':
      return <Preset4MinimalTech {...commonProps} />;
    case 'preset-5':
      return <Preset5EmeraldAcademic {...commonProps} />;
    case 'preset-6':
      return <Preset6SplitCompact {...commonProps} />;
    case 'preset-7':
      return <Preset7RoyalSapphire {...commonProps} />;
    case 'preset-8':
      return <Preset8OfficialBoard {...commonProps} />;
    case 'preset-9':
      return <Preset9ModernRounded {...commonProps} />;
    case 'preset-10':
      return <Preset10GoldAcademy {...commonProps} />;
    case 'preset-1':
    default:
      return <Preset1Classic {...commonProps} />;
  }
};

export default AdmitCardTemplate;
