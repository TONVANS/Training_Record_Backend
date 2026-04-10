// prisma/seed.ts --- SEED SCRIPT FOR DATABASE POPULATION ---
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import 'dotenv/config';
import {
  PrismaClient,
  Role,
  Gender,
  TrainingFormat,
  LocationType,
  MaterialType,
  CourseStatus,
  EnrollmentStatus,
  EmployeeStatus,
} from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import * as bcrypt from 'bcrypt';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

/* eslint-disable @typescript-eslint/no-unsafe-assignment */
async function main() {
  console.log('🌱 Starting database seeding...');

  // ========== 1. CLEANUP ==========
  // ລຶບຂໍ້ມູນເກົ່າຕາມລຳດັບ ເພື່ອບໍ່ໃຫ້ຕິດ Foreign Key
  console.log('🧹 Cleaning existing data...');

  // Training System
  await prisma.enrollment.deleteMany();
  await prisma.courseMaterial.deleteMany();
  await prisma.course.deleteMany();
  await prisma.trainingCategory.deleteMany();

  // Employee & Organization Details
  await prisma.placeOffice.deleteMany();
  await prisma.office.deleteMany();
  await prisma.employee.deleteMany();

  // Organization Master Data
  await prisma.positionCode.deleteMany();
  await prisma.positionGroup.deleteMany();
  await prisma.position.deleteMany();
  await prisma.unit.deleteMany();
  await prisma.division.deleteMany();
  await prisma.department.deleteMany();

  // Special Subject (ວິຊາສະເພາະ)
  await prisma.specialSubject.deleteMany();

  console.log('✅ Cleanup complete');

  // ========== 2. SPECIAL SUBJECTS (ວິຊາສະເພາະ) ==========
  console.log('Creating special subjects...');

  const subjectTech = await prisma.specialSubject.create({
    data: { special_subject_name: 'ເຕັກນິກ' },
  });

  const subjectAdmin = await prisma.specialSubject.create({
    data: { special_subject_name: 'ບໍລິຫານ' },
  });

  console.log(`✅ Special subjects created`);

  // ========== 3. ORGANIZATION MASTER DATA ==========
  console.log('Creating organization master data...');

  // ຕາມ Schema ໄອດີພວກນີ້ບໍ່ແມ່ນ autoincrement ດັ່ງນັ້ນຕ້ອງກຳນົດເອງ
  const deptIT = await prisma.department.create({
    data: { id: 22, code: '213', name: 'ຝ່າຍເຕັກໂນໂລຊີ ການສື່ສານ ຂໍ້ມູນຂ່າວສານ', status: 'A' },
  });

  const deptAdmin = await prisma.department.create({
    data: { id: 10, code: '100', name: 'ຫ້ອງວ່າການ', status: 'A' },
  });

  const divSoft = await prisma.division.create({
    data: { id: 102, code: '21302', name: 'ພະແນກພັດທະນາ-ຄຸ້ມຄອງຊອບແວ', department_id: deptIT.id, status: 'A' },
  });

  const unitUX = await prisma.unit.create({
    data: { id: 1040, code: '2130201', name: 'ໜ່ວຍງານວິເຄາະລະບົບ-ອອກແບບ UX/UI', division_id: divSoft.id, status: 'A' },
  });

  const posMember = await prisma.position.create({
    data: { id: 97, code: '84', name: 'ສະມາຊິກ', status: 'A' },
  });

  const posAdmin = await prisma.position.create({
    data: { id: 99, code: '99', name: 'System Admin', status: 'A' },
  });

  const groupG = await prisma.positionGroup.create({
    data: { id: 32, name: 'G' },
  });

  const groupM = await prisma.positionGroup.create({
    data: { id: 33, name: 'M' },
  });

  const codeMember = await prisma.positionCode.create({
    data: { id: 84, name: 'Member', group_id: groupG.id, status: 'A' },
  });

  const codeManager = await prisma.positionCode.create({
    data: { id: 85, name: 'Manager', group_id: groupM.id, status: 'A' },
  });

  console.log('✅ Organization structure created');

  // ========== 4. EMPLOYEES ==========
  console.log('Creating employees...');
  const defaultPassword = await bcrypt.hash('EDL@123456', 10);

  // 4.1 Admin User
  const admin = await prisma.employee.create({
    data: {
      employee_code: 'ADM001',
      first_name_la: 'Admin',
      last_name_la: 'User',
      email: 'admin@company.com',
      password: defaultPassword,
      gender: Gender.MALE,
      role: Role.ADMIN,
      status: EmployeeStatus.ACTIVE,

      // ສັງກັດຫຼັກ (Direct Relations)
      department_id: deptAdmin.id,
      position_id: posAdmin.id,
      pos_code_id: codeManager.id,
      special_subject_id: subjectAdmin.special_subject_id,

      // Office Relation (1-to-1)
      office: {
        create: {
          department_id: deptAdmin.id,
          pos_id: posAdmin.id,
          special_subject_id: subjectAdmin.special_subject_id,
        },
      },
      // PlaceOffice Relation (1-to-1)
      placeOffice: {
        create: {
          department_id: deptAdmin.id,
          pos_id: posAdmin.id,
          special_subject_id: subjectAdmin.special_subject_id,
        },
      },
    },
  });
  console.log(`✅ Admin created: ${admin.employee_code}`);

  // 4.2 User: ສອນວິໄຊ (44481)
  const emp1 = await prisma.employee.create({
    data: {
      emp_id_ref: 5658,
      employee_code: '44481',
      first_name_la: 'ສອນວິໄຊ',
      last_name_la: 'ບັນດາສັກ',
      email: 'sonexay@example.com',
      phone: '91461063',
      password: defaultPassword,
      gender: Gender.MALE,
      role: Role.EMPLOYEE,
      status: EmployeeStatus.ACTIVE,

      // ສັງກັດຫຼັກ (Direct Relations)
      department_id: deptIT.id,
      division_id: divSoft.id,
      unit_id: unitUX.id,
      position_id: posMember.id,
      pos_code_id: codeMember.id,
      special_subject_id: subjectTech.special_subject_id,

      // Office Relation (1-to-1)
      office: {
        create: {
          department_id: deptIT.id,
          division_id: divSoft.id,
          unit_id: unitUX.id,
          pos_id: posMember.id,
          special_subject_id: subjectTech.special_subject_id,
          revolution_date: new Date('2024-10-01'),
          state_date: new Date('2024-10-01'),
          remark: 'ຂໍ້ມູນຕົວຢ່າງ',
        },
      },
      // PlaceOffice Relation (1-to-1)
      placeOffice: {
        create: {
          department_id: deptIT.id,
          division_id: divSoft.id,
          unit_id: unitUX.id,
          pos_id: posMember.id,
          special_subject_id: subjectTech.special_subject_id,
          revolution_date: new Date('2024-10-01'),
          state_date: new Date('2024-10-01'),
        },
      },
    },
  });
  console.log(`✅ Employee created: ${emp1.first_name_la} ${emp1.last_name_la}`);

  // ========== 5. TRAINING CATEGORIES & COURSES ==========
  console.log('Creating training data...');

  const catTech = await prisma.trainingCategory.create({ data: { name: 'ທັກສະທາງເຕັກນິກ' } });

  // Course 1
  const course1 = await prisma.course.create({
    data: {
      title: 'ການພັດທະນາ Web ດ້ວຍ React & TypeScript',
      description: 'ຮຽນຮູ້ການຂຽນ Web Application ແບບທັນສະໄໝ ແລະ ປອດໄພດ້ວຍ Type Safety',
      category_id: catTech.id,
      start_date: new Date('2026-03-15'),
      end_date: new Date('2026-03-19'),
      format: TrainingFormat.ONLINE,
      location: 'https://zoom.us/j/123456789',
      budget: 1500.0,
      status: CourseStatus.SCHEDULED,
      trainer: 'ອ. ວິລະ ສີທອງ',
      institution: 'NUOL',
    },
  });

  // Course 2
  const course2 = await prisma.course.create({
    data: {
      title: 'ພື້ນຖານການອອກແບບ UX/UI',
      description: 'ຫຼັກການອອກແບບປະສົບການຜູ້ໃຊ້ ສຳລັບນັກພັດທະນາລະບົບ',
      category_id: catTech.id,
      start_date: new Date('2026-04-01'),
      end_date: new Date('2026-04-05'),
      format: TrainingFormat.ONSITE,
      location_type: LocationType.DOMESTIC,
      location: 'ຫ້ອງປະຊຸມ 3, ສຳນັກງານໃຫຍ່ EDL',
      budget: 5000.0,
      status: CourseStatus.ACTIVE,
      trainer: 'ອ. ນາງ ສຸພາ ແກ້ວມະນີ',
      organization: 'EDL Training Center',
    },
  });

  // ========== 6. COURSE MATERIALS (ພຽງແຕ່ເປັນລິ້ງ) ==========
  console.log('Creating course materials...');

  await Promise.all([
    prisma.courseMaterial.create({
      data: {
        course_id: course1.id,
        type: MaterialType.URL,
        file_path_or_link: 'https://react.dev/learn',
      },
    }),
    prisma.courseMaterial.create({
      data: {
        course_id: course1.id,
        type: MaterialType.URL,
        file_path_or_link: 'https://www.typescriptlang.org/docs/',
      },
    }),
    prisma.courseMaterial.create({
      data: {
        course_id: course2.id,
        type: MaterialType.URL,
        file_path_or_link: 'https://www.nngroup.com/articles/',
      },
    }),
  ]);

  console.log('✅ Course materials created (URL Only)');

  // ========== 7. ENROLLMENTS ==========
  console.log('Creating enrollments...');

  await Promise.all([
    // ສອນວິໄຊ: ລົງທະບຽນ React (Scheduled)
    prisma.enrollment.create({
      data: {
        employee_id: emp1.id,
        course_id: course1.id,
        status: EnrollmentStatus.ENROLLED,
      },
    }),

    // ສອນວິໄຊ: ກຳລັງຮຽນ UX/UI (Active)
    prisma.enrollment.create({
      data: {
        employee_id: emp1.id,
        course_id: course2.id,
        status: EnrollmentStatus.IN_PROGRESS,
      },
    }),
  ]);

  console.log('✅ Enrollments created');

  // ========== SUMMARY ==========
  console.log('');
  console.log('🎉 Database seeding completed successfully!');
  console.log('');
  console.log('📋 Login Credentials:');
  console.log('  Admin: ADM001 / EDL@123456');
  console.log('  User:  44481  / EDL@123456  (ສອນວິໄຊ)');
  console.log('');
  console.log('📦 Seeded:');
  console.log('  • 2 Employees (1 Admin + 1 Staff)');
  console.log('  • 2 Courses (Online + Domestic)');
  console.log('  • 3 Course Materials (All URLs)');
  console.log('  • 2 Enrollments');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });