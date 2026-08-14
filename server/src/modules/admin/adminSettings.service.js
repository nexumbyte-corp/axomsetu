import { prisma } from '../../config/prisma.js';

// Default platform settings configuration
let platformSettings = {
  platformName: 'AxomSetu Platform',
  supportEmail: 'support@axomsetu.com',
  supportPhone: '+91 98765 43210',
  whatsappNumber: '+91 98765 43210',
  defaultCurrency: 'INR',
  defaultTrialDays: 60,
  allowSelfRegistration: true,
  maintenanceMode: false,
};

export const adminSettingsService = {
  async getSettings() {
    return { ...platformSettings };
  },

  async updateSettings(data, actorUserId) {
    const oldSettings = { ...platformSettings };
    platformSettings = {
      ...platformSettings,
      ...data,
    };

    await prisma.auditLog.create({
      data: {
        userId: actorUserId,
        action: 'PLATFORM_SETTINGS_UPDATED',
        entityType: 'PlatformSettings',
        oldValues: oldSettings,
        newValues: platformSettings,
      },
    });

    return { ...platformSettings };
  },
};
