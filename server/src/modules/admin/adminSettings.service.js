import { prisma } from '../../config/prisma.js';

const DEFAULT_SETTINGS = {
  platformName: 'AxomSetu Platform',
  supportEmail: 'support@axomsetu.com',
  supportPhone: '+91 98765 43210',
  whatsappNumber: '+91 98765 43210',
  address: 'Guwahati, Assam, India',
  defaultCurrency: 'INR',
  defaultTrialDays: 30,
  allowSelfRegistration: true,
  maintenanceMode: false,
};

const CONTACT_PERSONS_INCLUDE = {
  contactPersons: {
    orderBy: { displayOrder: 'asc' },
  },
};

export const adminSettingsService = {
  /**
   * Fetch platform settings and all contact persons from DB.
   */
  async getSettings() {
    let settings = await prisma.platformSetting.findFirst({
      include: CONTACT_PERSONS_INCLUDE,
    });

    if (!settings) {
      settings = await prisma.platformSetting.create({
        data: DEFAULT_SETTINGS,
        include: CONTACT_PERSONS_INCLUDE,
      });
    }

    return settings;
  },

  /**
   * Update platform settings and contact persons in DB.
   */
  async updateSettings(data, actorUserId) {
    const current = await this.getSettings();
    const oldSettings = JSON.parse(JSON.stringify(current));

    // Sanitize contact persons array if provided
    let contactPersonsInput = null;
    if (Array.isArray(data.contactPersons)) {
      contactPersonsInput = data.contactPersons
        .filter((cp) => cp?.name && typeof cp.name === 'string' && cp.name.trim().length > 0)
        .map((cp, idx) => ({
          name: cp.name.trim(),
          role: cp.role?.trim() || null,
          email: cp.email?.trim() || null,
          phone: cp.phone?.trim() || null,
          whatsapp: cp.whatsapp?.trim() || null,
          isPrimary: Boolean(cp.isPrimary ?? idx === 0),
          displayOrder: typeof cp.displayOrder === 'number' ? cp.displayOrder : idx + 1,
        }));
    }

    const primaryContact = contactPersonsInput?.find((cp) => cp.isPrimary) || contactPersonsInput?.[0];

    const updatePayload = {
      ...(data.platformName !== undefined && { platformName: data.platformName.trim() }),
      ...(Array.isArray(data.contactPersons)
        ? {
            contactPersonName: primaryContact ? primaryContact.name : null,
            contactRole: primaryContact ? primaryContact.role : null,
          }
        : data.contactPersonName !== undefined
        ? {
            contactPersonName: data.contactPersonName ? data.contactPersonName.trim() : null,
            contactRole: data.contactRole ? data.contactRole.trim() : null,
          }
        : {}),
      ...(data.supportEmail !== undefined && { supportEmail: data.supportEmail?.trim() || null }),
      ...(data.supportPhone !== undefined && { supportPhone: data.supportPhone?.trim() || null }),
      ...(data.whatsappNumber !== undefined && { whatsappNumber: data.whatsappNumber?.trim() || null }),
      ...(data.address !== undefined && { address: data.address?.trim() || null }),
      ...(data.defaultCurrency !== undefined && { defaultCurrency: data.defaultCurrency.trim() }),
      ...(data.defaultTrialDays !== undefined && { defaultTrialDays: Number(data.defaultTrialDays) }),
      ...(data.allowSelfRegistration !== undefined && { allowSelfRegistration: Boolean(data.allowSelfRegistration) }),
      ...(data.maintenanceMode !== undefined && { maintenanceMode: Boolean(data.maintenanceMode) }),
    };

    const updated = await prisma.$transaction(async (tx) => {
      const settingRecord = await tx.platformSetting.update({
        where: { id: current.id },
        data: updatePayload,
      });

      if (Array.isArray(data.contactPersons)) {
        await tx.platformContactPerson.deleteMany({
          where: { platformSettingId: settingRecord.id },
        });

        if (contactPersonsInput?.length > 0) {
          await tx.platformContactPerson.createMany({
            data: contactPersonsInput.map((cp) => ({
              ...cp,
              platformSettingId: settingRecord.id,
            })),
          });
        }
      }

      return await tx.platformSetting.findUnique({
        where: { id: settingRecord.id },
        include: CONTACT_PERSONS_INCLUDE,
      });
    });

    if (actorUserId) {
      await prisma.auditLog.create({
        data: {
          userId: actorUserId,
          action: 'PLATFORM_SETTINGS_UPDATED',
          entityType: 'PlatformSettings',
          oldValues: oldSettings,
          newValues: updated,
        },
      });
    }

    return updated;
  },

  /**
   * Delete a specific contact person by ID directly.
   */
  async deleteContactPerson(personId, actorUserId) {
    const person = await prisma.platformContactPerson.findUnique({
      where: { id: personId },
    });

    if (!person) {
      return null;
    }

    await prisma.platformContactPerson.delete({
      where: { id: personId },
    });

    const remaining = await prisma.platformContactPerson.findMany({
      where: { platformSettingId: person.platformSettingId },
      orderBy: { displayOrder: 'asc' },
    });

    const primaryContact = remaining.find((p) => p.isPrimary) || remaining[0];

    if (person.platformSettingId) {
      await prisma.platformSetting.update({
        where: { id: person.platformSettingId },
        data: {
          contactPersonName: primaryContact ? primaryContact.name : null,
          contactRole: primaryContact ? primaryContact.role : null,
        },
      });
    }

    if (actorUserId) {
      await prisma.auditLog.create({
        data: {
          userId: actorUserId,
          action: 'PLATFORM_CONTACT_PERSON_DELETED',
          entityType: 'PlatformContactPerson',
          oldValues: person,
        },
      });
    }

    return remaining;
  },
};
