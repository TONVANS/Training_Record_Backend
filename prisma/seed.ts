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
  // ຕ້ອງສ້າງກ່ອນ Employee ເພາະ Employee.special_subject_id → SpecialSubject
  // ແຍກ 2 ປະເພດ: ເຕັກນິກ (ວິຊາການ) ແລະ ບໍລິຫານ (ຈັດການ)
  console.log('Creating special subjects...');

  // ສຳລັບພະນັກງານສາຍເຕັກນິກ: Dev, UX/UI, Network, IT, ວິສະວະກອນ ແລະ ອື່ນໆ
  const subjectTech = await prisma.specialSubject.create({
    data: { special_subject_name: 'ເຕັກນິກ' },
  });

  // ສຳລັບພະນັກງານສາຍບໍລິຫານ: Admin, HR, ຜູ້ຈັດການ, ຫ້ອງການ ແລະ ອື່ນໆ
  const subjectAdmin = await prisma.specialSubject.create({
    data: { special_subject_name: 'ບໍລິຫານ' },
  });

  console.log(`✅ Special subjects created:`);
  console.log(`   • ID ${subjectTech.special_subject_id}: ${subjectTech.special_subject_name}`);
  console.log(`   • ID ${subjectAdmin.special_subject_id}: ${subjectAdmin.special_subject_name}`);

  // ========== 3. ORGANIZATION MASTER DATA ==========
  console.log('Creating organization master data...');

  // 3.1 Departments (ຝ່າຍ)
  const deptIT = await prisma.department.create({
    data: {
      id: 22,
      code: '213',
      name: 'ຝ່າຍເຕັກໂນໂລຊີ ການສື່ສານ ຂໍ້ມູນຂ່າວສານ',
      status: 'A',
    },
  });

  const deptAdmin = await prisma.department.create({
    data: {
      id: 10,
      code: '100',
      name: 'ຫ້ອງວ່າການ',
      status: 'A',
    },
  });

  // 3.2 Divisions (ພະແນກ)
  const divSoft = await prisma.division.create({
    data: {
      id: 102,
      code: '21302',
      name: 'ພະແນກພັດທະນາ-ຄຸ້ມຄອງຊອບແວ',
      department_id: deptIT.id,
      status: 'A',
    },
  });

  const divInfra = await prisma.division.create({
    data: {
      id: 103,
      code: '21303',
      name: 'ພະແນກໂຄງສ້າງພື້ນຖານ ແລະ ເຄືອຂ່າຍ',
      department_id: deptIT.id,
      status: 'A',
    },
  });

  // 3.3 Units (ໜ່ວຍງານ)
  const unitUX = await prisma.unit.create({
    data: {
      id: 1040,
      code: '2130201',
      name: 'ໜ່ວຍງານວິເຄາະລະບົບ-ອອກແບບ UX/UI',
      division_id: divSoft.id,
      status: 'A',
    },
  });

  const unitDev = await prisma.unit.create({
    data: {
      id: 1041,
      code: '2130202',
      name: 'ໜ່ວຍງານພັດທະນາລະບົບ',
      division_id: divSoft.id,
      status: 'A',
    },
  });

  const unitNetwork = await prisma.unit.create({
    data: {
      id: 1042,
      code: '2130301',
      name: 'ໜ່ວຍງານເຄືອຂ່າຍ ແລະ ຄວາມປອດໄພ',
      division_id: divInfra.id,
      status: 'A',
    },
  });

  // 3.4 Positions (ຕຳແໜ່ງ)
  const posMember = await prisma.position.create({
    data: { id: 97, code: '84', name: 'ສະມາຊິກ', status: 'A' },
  });

  const posAdmin = await prisma.position.create({
    data: { id: 99, code: '99', name: 'System Admin', status: 'A' },
  });

  const posLeader = await prisma.position.create({
    data: { id: 100, code: '100', name: 'ຫົວໜ້າໜ່ວຍງານ', status: 'A' },
  });

  // 3.5 Position Groups & Codes (ກຸ່ມຕຳແໜ່ງ)
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

      // ສັງກັດຫຼັກ
      department_id: deptAdmin.id,
      position_id: posAdmin.id,
      pos_code_id: codeManager.id,
      special_subject_id: subjectAdmin.special_subject_id,

      // Office Details
      office: {
        create: {
          department_id: deptAdmin.id,
          pos_id: posAdmin.id,
          special_subject_id: subjectAdmin.special_subject_id,
        },
      },

      // PlaceOffice (ບ່ອນປະຈຳການ — ດຽວກັນກັບ Office ສຳລັບ Admin)
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

  // 4.2 ສອນວິໄຊ — UX/UI Designer (ສັງກັດ ໜ່ວຍງານ UX/UI)
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

      // ສັງກັດຫຼັກ
      department_id: deptIT.id,
      division_id: divSoft.id,
      unit_id: unitUX.id,
      position_id: posMember.id,
      pos_code_id: codeMember.id,
      special_subject_id: subjectTech.special_subject_id,

      // Office (ສັງກັດທາງການ)
      office: {
        create: {
          department_id: deptIT.id,
          division_id: divSoft.id,
          unit_id: unitUX.id,
          pos_id: posMember.id,
          special_subject_id: subjectTech.special_subject_id,
          revolution_date: new Date('2024-10-01'),
          state_date: new Date('2024-10-01'),
          remark: 'ຂໍ້ມູນຕົວຢ່າງຈາກ JSON',
        },
      },

      // PlaceOffice (ບ່ອນປະຈຳການ)
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

  // 4.3 ມະນີ — Developer (ສັງກັດ ໜ່ວຍງານ Dev)
  const emp2 = await prisma.employee.create({
    data: {
      employee_code: 'EMP002',
      first_name_la: 'ນາງ ມະນີ',
      last_name_la: 'ວົງສາ',
      email: 'manee@example.com',
      password: defaultPassword,
      gender: Gender.FEMALE,
      role: Role.EMPLOYEE,
      status: EmployeeStatus.ACTIVE,

      // ສັງກັດຫຼັກ
      department_id: deptIT.id,
      division_id: divSoft.id,
      unit_id: unitDev.id,
      position_id: posMember.id,
      pos_code_id: codeMember.id,
      special_subject_id: subjectTech.special_subject_id,

      // Office
      office: {
        create: {
          department_id: deptIT.id,
          division_id: divSoft.id,
          unit_id: unitDev.id,
          pos_id: posMember.id,
          special_subject_id: subjectTech.special_subject_id,
        },
      },

      // PlaceOffice (ເພີ່ມ — ຂາດໃນ seed ເກົ່າ)
      placeOffice: {
        create: {
          department_id: deptIT.id,
          division_id: divSoft.id,
          unit_id: unitDev.id,
          pos_id: posMember.id,
          special_subject_id: subjectTech.special_subject_id,
        },
      },
    },
  });
  console.log(`✅ Employee created: ${emp2.first_name_la} ${emp2.last_name_la}`);

  // 4.4 ສົມສາກ — Network Engineer (ສັງກັດ ໜ່ວຍງານ Network)
  const emp3 = await prisma.employee.create({
    data: {
      employee_code: 'EMP003',
      first_name_la: 'ສົມສາກ',
      last_name_la: 'ພົມມະວົງ',
      email: 'somsak@example.com',
      phone: '20555123456',
      password: defaultPassword,
      gender: Gender.MALE,
      role: Role.EMPLOYEE,
      status: EmployeeStatus.ACTIVE,

      // ສັງກັດຫຼັກ
      department_id: deptIT.id,
      division_id: divInfra.id,
      unit_id: unitNetwork.id,
      position_id: posLeader.id,
      pos_code_id: codeManager.id,
      special_subject_id: subjectTech.special_subject_id,

      // Office
      office: {
        create: {
          department_id: deptIT.id,
          division_id: divInfra.id,
          unit_id: unitNetwork.id,
          pos_id: posLeader.id,
          special_subject_id: subjectTech.special_subject_id,
          revolution_date: new Date('2022-01-15'),
          state_date: new Date('2022-01-15'),
        },
      },

      // PlaceOffice
      placeOffice: {
        create: {
          department_id: deptIT.id,
          division_id: divInfra.id,
          unit_id: unitNetwork.id,
          pos_id: posLeader.id,
          special_subject_id: subjectTech.special_subject_id,
          revolution_date: new Date('2022-01-15'),
          state_date: new Date('2022-01-15'),
        },
      },
    },
  });
  console.log(`✅ Employee created: ${emp3.first_name_la} ${emp3.last_name_la}`);

  // ========== 5. TRAINING CATEGORIES & COURSES ==========
  console.log('Creating training data...');

  const [catTech, catLeadership, catSecurity] = await Promise.all([
    prisma.trainingCategory.create({ data: { name: 'ທັກສະທາງເຕັກນິກ' } }),
    prisma.trainingCategory.create({ data: { name: 'ຄວາມເປັນຜູ້ນຳ ແລະ ການບໍລິຫານ' } }),
    prisma.trainingCategory.create({ data: { name: 'ຄວາມປອດໄພທາງໄຊເບີ' } }),
  ]);

  // Course 1: ONLINE — React & TypeScript
  const course1 = await prisma.course.create({
    data: {
      title: 'ການພັດທະນາ Web ດ້ວຍ React & TypeScript',
      description:
        'ຮຽນຮູ້ການຂຽນ Web Application ແບບທັນສະໄໝ ແລະ ປອດໄພດ້ວຍ Type Safety',
      category_id: catTech.id,
      start_date: new Date('2026-03-15'),
      end_date: new Date('2026-03-19'),
      format: TrainingFormat.ONLINE,
      location: 'https://zoom.us/j/123456789', // Meeting link for ONLINE
      budget: 1500.0,
      status: CourseStatus.SCHEDULED,
      trainer: 'ອ. ວິລະ ສີທອງ',
      institution: 'NUOL - ມະຫາວິທະຍາໄລແຫ່ງຊາດ',
    },
  });

  // Course 2: ONSITE DOMESTIC — UX/UI
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

  // Course 3: ONSITE INTERNATIONAL — Cybersecurity
  const course3 = await prisma.course.create({
    data: {
      title: 'Advanced Cybersecurity & Network Defense',
      description:
        'ການຝຶກອົບຮົມດ້ານຄວາມປອດໄພໄຊເບີ ລະດັບສູງ ສຳລັບຜູ້ດູແລລະບົບເຄືອຂ່າຍ',
      category_id: catSecurity.id,
      start_date: new Date('2025-11-10'),
      end_date: new Date('2025-11-20'),
      format: TrainingFormat.ONSITE,
      location_type: LocationType.INTERNATIONAL,
      country: 'Singapore',                 // country is used for INTERNATIONAL
      location: 'Marina Bay Sands Convention Centre',
      budget: 25000.0,
      status: CourseStatus.COMPLETED,
      trainer: 'Dr. James Chen',
      institution: 'ISACA Singapore Chapter',
      organization: 'ADB Technical Assistance Programme',
    },
  });

  // Course 4: ONLINE — Leadership (COMPLETED)
  const course4 = await prisma.course.create({
    data: {
      title: 'ຫຼັກການຜູ້ນຳ ແລະ ການຄຸ້ມຄອງທີມງານ',
      description: 'ເສີມສ້າງທັກສະການນຳ ແລະ ການຄຸ້ມຄອງທີມຢ່າງມີປະສິດທິຜົນ',
      category_id: catLeadership.id,
      start_date: new Date('2025-09-01'),
      end_date: new Date('2025-09-03'),
      format: TrainingFormat.ONLINE,
      location: 'https://teams.microsoft.com/l/meetup-join/abc123',
      budget: 800.0,
      status: CourseStatus.COMPLETED,
      trainer: 'ອ. ສົມບັດ ດາລາວົງ',
      institution: 'EDL Management Institute',
    },
  });

  // ========== 6. COURSE MATERIALS ==========
  console.log('Creating course materials...');

  await Promise.all([
    // Course 1 materials
    prisma.courseMaterial.create({
      data: {
        course_id: course1.id,
        type: MaterialType.URL,
        file_path_or_link: 'https://react.dev',
      },
    }),
    prisma.courseMaterial.create({
      data: {
        course_id: course1.id,
        type: MaterialType.URL,
        file_path_or_link: 'https://www.typescriptlang.org/docs/',
      },
    }),

    // Course 2 materials (PDF slide deck)
    prisma.courseMaterial.create({
      data: {
        course_id: course2.id,
        type: MaterialType.PDF,
        file_path_or_link: '/uploads/materials/uxui-fundamentals-slides.pdf',
      },
    }),

    // Course 3 materials
    prisma.courseMaterial.create({
      data: {
        course_id: course3.id,
        type: MaterialType.PDF,
        file_path_or_link: '/uploads/materials/cybersecurity-handbook.pdf',
      },
    }),
    prisma.courseMaterial.create({
      data: {
        course_id: course3.id,
        type: MaterialType.URL,
        file_path_or_link: 'https://www.isaca.org/resources',
      },
    }),
  ]);

  console.log('✅ Course materials created');

  // ========== 7. ENROLLMENTS ==========
  console.log('Creating enrollments...');

  await Promise.all([
    // ສອນວິໄຊ: ກຳລັງຮຽນ UX/UI (Active course)
    prisma.enrollment.create({
      data: {
        employee_id: emp1.id,
        course_id: course2.id,
        status: EnrollmentStatus.IN_PROGRESS,
      },
    }),

    // ສອນວິໄຊ: ຜ່ານ Leadership (Completed)
    prisma.enrollment.create({
      data: {
        employee_id: emp1.id,
        course_id: course4.id,
        status: EnrollmentStatus.COMPLETED,
        certificate_url: '/uploads/certificates/sonexay-leadership-2025.pdf',
      },
    }),

    // ມະນີ: ລົງທະບຽນ React (Scheduled)
    prisma.enrollment.create({
      data: {
        employee_id: emp2.id,
        course_id: course1.id,
        status: EnrollmentStatus.ENROLLED,
      },
    }),

    // ມະນີ: ຜ່ານ Leadership (Completed)
    prisma.enrollment.create({
      data: {
        employee_id: emp2.id,
        course_id: course4.id,
        status: EnrollmentStatus.COMPLETED,
        certificate_url: '/uploads/certificates/manee-leadership-2025.pdf',
      },
    }),

    // ສົມສາກ: ຜ່ານ Cybersecurity (International — Completed)
    prisma.enrollment.create({
      data: {
        employee_id: emp3.id,
        course_id: course3.id,
        status: EnrollmentStatus.COMPLETED,
        certificate_url: '/uploads/certificates/somsak-cybersec-2025.pdf',
      },
    }),

    // ສົມສາກ: ລົງທະບຽນ React
    prisma.enrollment.create({
      data: {
        employee_id: emp3.id,
        course_id: course1.id,
        status: EnrollmentStatus.ENROLLED,
      },
    }),
  ]);

  console.log('✅ Enrollments created');

  // ========== SUMMARY ==========
  console.log('');
  console.log('🎉 Database seeding completed successfully!');
  console.log('');
  console.log('📋 Login Credentials:');
  console.log('   Admin:  ADM001 / EDL@123456');
  console.log('   User 1: 44481  / EDL@123456  (ສອນວິໄຊ)');
  console.log('   User 2: EMP002 / EDL@123456  (ມະນີ)');
  console.log('   User 3: EMP003 / EDL@123456  (ສົມສາກ)');
  console.log('');
  console.log('📦 Seeded:');
  console.log('   • 2 Special Subjects');
  console.log('   • 2 Departments, 2 Divisions, 3 Units');
  console.log('   • 3 Positions, 2 Position Groups, 2 Position Codes');
  console.log('   • 4 Employees (1 Admin + 3 Staff), each with Office + PlaceOffice');
  console.log('   • 3 Training Categories');
  console.log('   • 4 Courses (Online + Domestic + International)');
  console.log('   • 5 Course Materials (PDF + URL)');
  console.log('   • 6 Enrollments (ENROLLED / IN_PROGRESS / COMPLETED)');
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