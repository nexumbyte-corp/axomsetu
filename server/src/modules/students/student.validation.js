import { z } from 'zod';

const rollSchema = z
  .union([
    z
      .string()
      .trim()
      .max(3, 'Roll number must not exceed 3 digits')
      .refine((val) => !val || (!isNaN(val) && Number(val) >= 1 && Number(val) <= 999), {
        message: 'Roll number must be between 1 and 999',
      }),
    z.number().min(1, 'Roll number must be at least 1').max(999, 'Roll number must not exceed 999'),
  ])
  .optional()
  .nullable();

export const createStudentSchema = z.object({
  admissionNo: z
    .string()
    .trim()
    .min(1, 'Admission number cannot be empty')
    .max(50, 'Admission number must not exceed 50 characters')
    .optional()
    .nullable(),
  admissionDate: z.string().or(z.date()).optional().nullable(),
  name: z
    .string({ required_error: 'Student name is required' })
    .trim()
    .min(2, 'Student name must be at least 2 characters')
    .max(100, 'Student name must not exceed 100 characters'),
  guardianName: z
    .string({ required_error: 'Guardian name is required' })
    .trim()
    .min(2, 'Guardian name must be at least 2 characters')
    .max(100, 'Guardian name must not exceed 100 characters'),
  phone: z
    .string({ required_error: 'Phone number is required' })
    .trim()
    .regex(/^\d{10}$/, 'Phone number must be exactly 10 digits'),
  gender: z
    .string({ required_error: 'Gender is required' })
    .trim()
    .min(1, 'Gender is required')
    .max(20, 'Gender must not exceed 20 characters'),
  caste: z
    .string()
    .trim()
    .max(50, 'Caste must not exceed 50 characters')
    .optional()
    .nullable(),
  address: z
    .string()
    .trim()
    .max(300, 'Address must not exceed 300 characters')
    .optional()
    .nullable(),
  photoUrl: z
    .string({ required_error: 'Student photo is required' })
    .trim()
    .min(1, 'Student photo is required')
    .max(500, 'Photo URL must not exceed 500 characters'),

  academicYearId: z.string({ required_error: 'Academic year ID is required' }).uuid('Invalid Academic Year ID'),
  classId: z.string({ required_error: 'Class ID is required' }).uuid('Invalid Class ID'),
  sectionId: z.string().uuid('Invalid Section ID').optional().nullable(),
  mediumId: z.string({ required_error: 'Medium ID is required' }).uuid('Invalid Medium ID'),
  streamId: z.string().uuid('Invalid Stream ID').optional().nullable(),
  rollNumber: rollSchema,
  rollNo: rollSchema,

  generateInitialFees: z.boolean().optional().default(true),

  feeOverrides: z
    .array(
      z.object({
        feeTypeId: z.string().uuid('Invalid Fee Type ID').optional().nullable(),
        title: z.string().max(100, 'Fee title must not exceed 100 characters').optional().nullable(),
        finalAmount: z
          .union([z.number(), z.string()])
          .transform((val) => Number(val))
          .refine((val) => !isNaN(val) && val >= 0 && val <= 10000000, 'Final amount must be between 0 and 10,000,000'),
        reason: z.string().trim().max(200, 'Reason must not exceed 200 characters').optional().nullable(),
      })
    )
    .optional()
    .nullable(),
});

export const updateStudentProfileSchema = z.object({
  admissionNo: z
    .string()
    .trim()
    .min(1, 'Admission number cannot be empty')
    .max(50, 'Admission number must not exceed 50 characters')
    .optional()
    .nullable(),
  admissionDate: z.string().or(z.date()).optional().nullable(),
  name: z
    .string()
    .trim()
    .min(2, 'Student name must be at least 2 characters')
    .max(100, 'Student name must not exceed 100 characters')
    .optional(),
  guardianName: z
    .string()
    .trim()
    .min(2, 'Guardian name must be at least 2 characters')
    .max(100, 'Guardian name must not exceed 100 characters')
    .optional(),
  phone: z.string().trim().regex(/^\d{10}$/, 'Phone number must be exactly 10 digits').optional().nullable(),
  gender: z.string().trim().max(20, 'Gender must not exceed 20 characters').optional().nullable(),
  caste: z.string().trim().max(50, 'Caste must not exceed 50 characters').optional().nullable(),
  address: z.string().trim().max(300, 'Address must not exceed 300 characters').optional().nullable(),
  photoUrl: z.string().trim().max(500, 'Photo URL must not exceed 500 characters').optional().nullable(),
});

export const updateStudentStatusSchema = z.object({
  status: z.enum(['ACTIVE', 'LEFT', 'GRADUATED', 'ARCHIVED'], {
    errorMap: () => ({ message: 'Status must be ACTIVE, LEFT, GRADUATED, or ARCHIVED' }),
  }),
});

export const updateEnrollmentSchema = z.object({
  classId: z.string({ required_error: 'Class ID is required' }).uuid('Invalid Class ID'),
  sectionId: z.string().uuid('Invalid Section ID').optional().nullable(),
  mediumId: z.string({ required_error: 'Medium ID is required' }).uuid('Invalid Medium ID'),
  streamId: z.string().uuid('Invalid Stream ID').optional().nullable(),
  rollNumber: rollSchema,
  rollNo: rollSchema,
});

export const promoteStudentSchema = z
  .object({
    action: z.enum(['PROMOTE', 'REPEAT', 'GRADUATE', 'LEFT']).optional(),
    sourceEnrollmentId: z.string({ required_error: 'Source enrollment ID is required' }).uuid('Invalid Source Enrollment ID'),
    targetAcademicYearId: z.string().uuid('Invalid Target Academic Year ID').optional().nullable(),
    classId: z.string().uuid('Invalid Class ID').optional().nullable(),
    targetClassId: z.string().uuid('Invalid Target Class ID').optional().nullable(),
    sectionId: z.string().uuid('Invalid Section ID').optional().nullable(),
    targetSectionId: z.string().uuid('Invalid Target Section ID').optional().nullable(),
    mediumId: z.string().uuid('Invalid Medium ID').optional().nullable(),
    targetMediumId: z.string().uuid('Invalid Target Medium ID').optional().nullable(),
    streamId: z.string().uuid('Invalid Stream ID').optional().nullable(),
    targetStreamId: z.string().uuid('Invalid Target Stream ID').optional().nullable(),
    rollNumber: rollSchema,
    rollNo: rollSchema,
    resultStatus: z.enum(['PROMOTED', 'REPEATED']).optional(),
  })
  .superRefine((data, ctx) => {
    const action = data.action || (data.resultStatus === 'REPEATED' ? 'REPEAT' : 'PROMOTE');
    const targetClass = data.targetClassId || data.classId;
    const targetMedium = data.targetMediumId || data.mediumId;

    if (action === 'PROMOTE' || action === 'REPEAT') {
      if (!data.targetAcademicYearId) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Target academic year ID is required',
          path: ['targetAcademicYearId'],
        });
      }
      if (!targetClass) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Target class ID is required',
          path: ['targetClassId'],
        });
      }
      if (!targetMedium) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Target medium ID is required',
          path: ['targetMediumId'],
        });
      }
    }
  });


export const bulkPromoteStudentsSchema = z.object({
  sourceAcademicYearId: z.string({ required_error: 'Source academic year ID is required' }).uuid('Invalid Source Academic Year ID'),
  targetAcademicYearId: z.string({ required_error: 'Target academic year ID is required' }).uuid('Invalid Target Academic Year ID'),
  sourceClassId: z.string().uuid('Invalid Source Class ID').optional().nullable(),
  studentIds: z.array(z.string().uuid('Invalid Student ID')).max(500, 'Cannot bulk promote more than 500 students at a time').optional().nullable(),
  students: z.array(
    z.object({
      studentId: z.string({ required_error: 'Student ID is required' }).uuid('Invalid Student ID'),
      sourceEnrollmentId: z.string().uuid('Invalid Source Enrollment ID').optional().nullable(),
      classId: z.string().uuid('Invalid Class ID').optional().nullable(),
      sectionId: z.string().uuid('Invalid Section ID').optional().nullable(),
      mediumId: z.string().uuid('Invalid Medium ID').optional().nullable(),
      streamId: z.string().uuid('Invalid Stream ID').optional().nullable(),
      rollNumber: rollSchema,
      rollNo: rollSchema,
      action: z.enum(['PROMOTE', 'REPEAT', 'GRADUATE', 'LEFT']).optional(),
      result: z.enum(['PROMOTED', 'REPEATED']).optional(),
    })
  ).max(500, 'Cannot bulk promote more than 500 students at a time').optional().nullable(),
});


