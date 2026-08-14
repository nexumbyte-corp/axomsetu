import { prisma } from '../../config/prisma.js';
import { ApiError } from '../../utils/ApiError.js';

const DEFAULT_EXPENSE_CATEGORIES = [
  { name: 'Electricity', description: 'Electricity bills and power charges' },
  { name: 'Water', description: 'Water bills and supply charges' },
  { name: 'Internet & Telecom', description: 'Broadband, Wi-Fi, and phone bills' },
  { name: 'Stationery & Office Supplies', description: 'Paper, notebooks, pens, and office materials' },
  { name: 'Maintenance & Repairs', description: 'Building, furniture, and equipment maintenance' },
  { name: 'Transport & Fuel', description: 'School bus fuel, vehicle servicing, and travel' },
  { name: 'Teaching Materials', description: 'Lab equipment, books, and educational supplies' },
  { name: 'Rent & Infrastructure', description: 'Building rent and land lease payments' },
  { name: 'Events & Annual Functions', description: 'Sports day, cultural events, and celebrations' },
  { name: 'Other Expenditure', description: 'Miscellaneous operational expenses' },
];

export const expenseCategoryService = {
  /**
   * Create new ExpenseCategory (unique name per school)
   */
  async createCategory(schoolId, data) {
    const { name, description } = data;
    if (!name || !name.trim()) {
      throw ApiError.badRequest('Category name is required');
    }

    const trimmedName = name.trim();
    const existing = await prisma.expenseCategory.findUnique({
      where: {
        schoolId_name: {
          schoolId,
          name: trimmedName,
        },
      },
    });

    if (existing) {
      throw ApiError.conflict(`Expense category "${trimmedName}" already exists in this school.`);
    }

    return await prisma.expenseCategory.create({
      data: {
        schoolId,
        name: trimmedName,
        description: description || null,
        isActive: true,
      },
    });
  },

  /**
   * List all ExpenseCategories for a school. Auto-seeds default categories if empty.
   */
  async getCategories(schoolId, query = {}) {
    const { includeInactive } = query;

    // Check count and auto-seed defaults if school has 0 categories
    const totalCount = await prisma.expenseCategory.count({ where: { schoolId } });
    if (totalCount === 0) {
      await prisma.expenseCategory.createMany({
        data: DEFAULT_EXPENSE_CATEGORIES.map((cat) => ({
          schoolId,
          name: cat.name,
          description: cat.description,
          isActive: true,
        })),
        skipDuplicates: true,
      });
    }

    const where = { schoolId };
    if (!includeInactive || includeInactive === 'false') {
      where.isActive = true;
    }

    const categories = await prisma.expenseCategory.findMany({
      where,
      include: {
        _count: {
          select: { expenses: true },
        },
      },
      orderBy: { name: 'asc' },
    });

    return categories.map((cat) => ({
      id: cat.id,
      name: cat.name,
      description: cat.description,
      isActive: cat.isActive,
      expenseCount: cat._count.expenses,
      createdAt: cat.createdAt,
    }));
  },

  /**
   * Update category name & description
   */
  async updateCategory(schoolId, categoryId, data) {
    const category = await prisma.expenseCategory.findFirst({
      where: { id: categoryId, schoolId },
    });

    if (!category) {
      throw ApiError.notFound('Expense category not found.');
    }

    if (data.name && data.name.trim() !== category.name) {
      const trimmedName = data.name.trim();
      const existing = await prisma.expenseCategory.findUnique({
        where: {
          schoolId_name: {
            schoolId,
            name: trimmedName,
          },
        },
      });

      if (existing) {
        throw ApiError.conflict(`An expense category named "${trimmedName}" already exists.`);
      }
    }

    return await prisma.expenseCategory.update({
      where: { id: categoryId },
      data: {
        name: data.name ? data.name.trim() : category.name,
        description: data.description !== undefined ? (data.description || null) : category.description,
      },
    });
  },

  /**
   * Toggle active/inactive status of category
   */
  async toggleCategoryStatus(schoolId, categoryId, isActive) {
    const category = await prisma.expenseCategory.findFirst({
      where: { id: categoryId, schoolId },
    });

    if (!category) {
      throw ApiError.notFound('Expense category not found.');
    }

    return await prisma.expenseCategory.update({
      where: { id: categoryId },
      data: { isActive: Boolean(isActive) },
    });
  },

  /**
   * Delete expense category if unused, or set inactive if referenced
   */
  async deleteCategory(schoolId, categoryId) {
    const category = await prisma.expenseCategory.findFirst({
      where: { id: categoryId, schoolId },
      include: { _count: { select: { expenses: true } } },
    });

    if (!category) {
      throw ApiError.notFound('Expense category not found.');
    }

    if (category._count.expenses > 0) {
      await prisma.expenseCategory.update({
        where: { id: categoryId },
        data: { isActive: false },
      });
      return {
        message: `Category "${category.name}" has ${category._count.expenses} historical expense record(s). It has been marked inactive instead of deleted.`,
        isDeactivated: true,
      };
    }

    await prisma.expenseCategory.delete({
      where: { id: categoryId },
    });

    return { message: `Category "${category.name}" deleted successfully.` };
  },
};
