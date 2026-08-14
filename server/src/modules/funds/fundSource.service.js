import { prisma } from '../../config/prisma.js';
import { ApiError } from '../../utils/ApiError.js';

const DEFAULT_FUND_SOURCES = [
  { name: 'Owner Contribution', description: 'Personal capital contribution by school owner / founder' },
  { name: 'Management Fund', description: 'Management reserve capital infusion' },
  { name: 'Donation & Philanthropy', description: 'Charitable donations and philanthropic contributions' },
  { name: 'Government Grant', description: 'Educational grants and institutional aid' },
  { name: 'Other Fund Source', description: 'Miscellaneous capital fund additions' },
];

export const fundSourceService = {
  /**
   * Create a new FundSource
   */
  async createFundSource(schoolId, data) {
    const { name, description } = data;
    if (!name || !name.trim()) {
      throw ApiError.badRequest('Fund source name is required');
    }

    const trimmedName = name.trim();
    const existing = await prisma.fundSource.findUnique({
      where: {
        schoolId_name: {
          schoolId,
          name: trimmedName,
        },
      },
    });

    if (existing) {
      throw ApiError.conflict(`Fund source "${trimmedName}" already exists in this school.`);
    }

    return await prisma.fundSource.create({
      data: {
        schoolId,
        name: trimmedName,
        description: description || null,
        isActive: true,
      },
    });
  },

  /**
   * List all FundSources for a school. Auto-seeds defaults if empty.
   */
  async getFundSources(schoolId, query = {}) {
    const { includeInactive } = query;

    // Check count and auto-seed defaults if school has 0 fund sources
    const totalCount = await prisma.fundSource.count({ where: { schoolId } });
    if (totalCount === 0) {
      await prisma.fundSource.createMany({
        data: DEFAULT_FUND_SOURCES.map((src) => ({
          schoolId,
          name: src.name,
          description: src.description,
          isActive: true,
        })),
        skipDuplicates: true,
      });
    }

    const where = { schoolId };
    if (!includeInactive || includeInactive === 'false') {
      where.isActive = true;
    }

    const sources = await prisma.fundSource.findMany({
      where,
      include: {
        _count: {
          select: { fundTransactions: true },
        },
      },
      orderBy: { name: 'asc' },
    });

    return sources.map((src) => ({
      id: src.id,
      name: src.name,
      description: src.description,
      isActive: src.isActive,
      transactionCount: src._count.fundTransactions,
      createdAt: src.createdAt,
    }));
  },

  /**
   * Update fund source
   */
  async updateFundSource(schoolId, sourceId, data) {
    const source = await prisma.fundSource.findFirst({
      where: { id: sourceId, schoolId },
    });

    if (!source) {
      throw ApiError.notFound('Fund source not found.');
    }

    if (data.name && data.name.trim() !== source.name) {
      const trimmedName = data.name.trim();
      const existing = await prisma.fundSource.findUnique({
        where: {
          schoolId_name: {
            schoolId,
            name: trimmedName,
          },
        },
      });

      if (existing) {
        throw ApiError.conflict(`A fund source named "${trimmedName}" already exists.`);
      }
    }

    return await prisma.fundSource.update({
      where: { id: sourceId },
      data: {
        name: data.name ? data.name.trim() : source.name,
        description: data.description !== undefined ? (data.description || null) : source.description,
      },
    });
  },

  /**
   * Toggle active status
   */
  async toggleFundSourceStatus(schoolId, sourceId, isActive) {
    const source = await prisma.fundSource.findFirst({
      where: { id: sourceId, schoolId },
    });

    if (!source) {
      throw ApiError.notFound('Fund source not found.');
    }

    return await prisma.fundSource.update({
      where: { id: sourceId },
      data: { isActive: Boolean(isActive) },
    });
  },

  /**
   * Delete or deactivate fund source if referenced by transactions
   */
  async deleteFundSource(schoolId, sourceId) {
    const source = await prisma.fundSource.findFirst({
      where: { id: sourceId, schoolId },
      include: { _count: { select: { fundTransactions: true } } },
    });

    if (!source) {
      throw ApiError.notFound('Fund source not found.');
    }

    if (source._count.fundTransactions > 0) {
      await prisma.fundSource.update({
        where: { id: sourceId },
        data: { isActive: false },
      });
      return {
        message: `Fund source "${source.name}" has ${source._count.fundTransactions} historical transaction(s). It has been marked inactive instead of deleted.`,
        isDeactivated: true,
      };
    }

    await prisma.fundSource.delete({
      where: { id: sourceId },
    });

    return { message: `Fund source "${source.name}" deleted successfully.` };
  },
};
