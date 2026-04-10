/*
  Warnings:

  - You are about to drop the column `department` on the `Employee` table. All the data in the column will be lost.
  - You are about to drop the column `name` on the `Employee` table. All the data in the column will be lost.
  - You are about to drop the column `position` on the `Employee` table. All the data in the column will be lost.
  - You are about to drop the `Notification` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[emp_id_ref]` on the table `Employee` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[employee_code]` on the table `Employee` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `updated_at` to the `Course` table without a default value. This is not possible if the table is not empty.
  - Added the required column `employee_code` to the `Employee` table without a default value. This is not possible if the table is not empty.
  - Added the required column `first_name_la` to the `Employee` table without a default value. This is not possible if the table is not empty.
  - Added the required column `last_name_la` to the `Employee` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updated_at` to the `Employee` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updated_at` to the `Enrollment` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'EMPLOYEE');

-- CreateEnum
CREATE TYPE "EmployeeStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "TrainingFormat" AS ENUM ('ONLINE', 'ONSITE');

-- CreateEnum
CREATE TYPE "LocationType" AS ENUM ('DOMESTIC', 'INTERNATIONAL');

-- AlterEnum
ALTER TYPE "Gender" ADD VALUE 'OTHER';

-- DropForeignKey
ALTER TABLE "CourseMaterial" DROP CONSTRAINT "CourseMaterial_course_id_fkey";

-- DropForeignKey
ALTER TABLE "Notification" DROP CONSTRAINT "Notification_target_employee_id_fkey";

-- AlterTable
ALTER TABLE "Course" ADD COLUMN     "country" TEXT,
ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "format" "TrainingFormat" NOT NULL DEFAULT 'ONSITE',
ADD COLUMN     "location_type" "LocationType",
ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "CourseMaterial" ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "Employee" DROP COLUMN "department",
DROP COLUMN "name",
DROP COLUMN "position",
ADD COLUMN     "emp_id_ref" INTEGER,
ADD COLUMN     "employee_code" TEXT NOT NULL,
ADD COLUMN     "first_name_la" TEXT NOT NULL,
ADD COLUMN     "image" TEXT,
ADD COLUMN     "last_name_la" TEXT NOT NULL,
ADD COLUMN     "password" TEXT NOT NULL DEFAULT 'EDL@123456',
ADD COLUMN     "phone" TEXT,
ADD COLUMN     "pos_code_id" INTEGER,
ADD COLUMN     "promotion_date" TIMESTAMP(3),
ADD COLUMN     "role" "Role" NOT NULL DEFAULT 'EMPLOYEE',
ADD COLUMN     "status" "EmployeeStatus" NOT NULL DEFAULT 'ACTIVE',
ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL,
ALTER COLUMN "email" DROP NOT NULL,
ALTER COLUMN "gender" SET DEFAULT 'MALE';

-- AlterTable
ALTER TABLE "Enrollment" ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL;

-- DropTable
DROP TABLE "Notification";

-- DropEnum
DROP TYPE "NotificationType";

-- CreateTable
CREATE TABLE "Department" (
    "id" INTEGER NOT NULL,
    "code" TEXT,
    "name" TEXT NOT NULL,
    "status" TEXT DEFAULT 'A',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Department_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Division" (
    "id" INTEGER NOT NULL,
    "code" TEXT,
    "name" TEXT NOT NULL,
    "status" TEXT DEFAULT 'A',
    "department_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Division_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Unit" (
    "id" INTEGER NOT NULL,
    "code" TEXT,
    "name" TEXT NOT NULL,
    "status" TEXT DEFAULT 'A',
    "division_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Unit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Position" (
    "id" INTEGER NOT NULL,
    "code" TEXT,
    "name" TEXT NOT NULL,
    "status" TEXT DEFAULT 'A',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Position_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PositionGroup" (
    "id" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PositionGroup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PositionCode" (
    "id" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "status" TEXT DEFAULT 'A',
    "group_id" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PositionCode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Office" (
    "id" SERIAL NOT NULL,
    "employee_id" INTEGER NOT NULL,
    "department_id" INTEGER,
    "division_id" INTEGER,
    "unit_id" INTEGER,
    "pos_id" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Office_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlaceOffice" (
    "id" SERIAL NOT NULL,
    "employee_id" INTEGER NOT NULL,
    "department_id" INTEGER,
    "division_id" INTEGER,
    "unit_id" INTEGER,
    "pos_id" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlaceOffice_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Department_code_key" ON "Department"("code");

-- CreateIndex
CREATE UNIQUE INDEX "Division_code_key" ON "Division"("code");

-- CreateIndex
CREATE INDEX "Division_department_id_idx" ON "Division"("department_id");

-- CreateIndex
CREATE UNIQUE INDEX "Unit_code_key" ON "Unit"("code");

-- CreateIndex
CREATE INDEX "Unit_division_id_idx" ON "Unit"("division_id");

-- CreateIndex
CREATE UNIQUE INDEX "Office_employee_id_key" ON "Office"("employee_id");

-- CreateIndex
CREATE INDEX "Office_department_id_idx" ON "Office"("department_id");

-- CreateIndex
CREATE INDEX "Office_division_id_idx" ON "Office"("division_id");

-- CreateIndex
CREATE UNIQUE INDEX "PlaceOffice_employee_id_key" ON "PlaceOffice"("employee_id");

-- CreateIndex
CREATE INDEX "PlaceOffice_department_id_idx" ON "PlaceOffice"("department_id");

-- CreateIndex
CREATE INDEX "PlaceOffice_division_id_idx" ON "PlaceOffice"("division_id");

-- CreateIndex
CREATE INDEX "Course_category_id_idx" ON "Course"("category_id");

-- CreateIndex
CREATE INDEX "Course_status_idx" ON "Course"("status");

-- CreateIndex
CREATE INDEX "Course_start_date_idx" ON "Course"("start_date");

-- CreateIndex
CREATE INDEX "Course_format_idx" ON "Course"("format");

-- CreateIndex
CREATE INDEX "CourseMaterial_course_id_idx" ON "CourseMaterial"("course_id");

-- CreateIndex
CREATE UNIQUE INDEX "Employee_emp_id_ref_key" ON "Employee"("emp_id_ref");

-- CreateIndex
CREATE UNIQUE INDEX "Employee_employee_code_key" ON "Employee"("employee_code");

-- CreateIndex
CREATE INDEX "Employee_employee_code_idx" ON "Employee"("employee_code");

-- CreateIndex
CREATE INDEX "Employee_email_idx" ON "Employee"("email");

-- CreateIndex
CREATE INDEX "Enrollment_employee_id_idx" ON "Enrollment"("employee_id");

-- CreateIndex
CREATE INDEX "Enrollment_course_id_idx" ON "Enrollment"("course_id");

-- CreateIndex
CREATE INDEX "Enrollment_status_idx" ON "Enrollment"("status");

-- CreateIndex
CREATE INDEX "TrainingCategory_name_idx" ON "TrainingCategory"("name");

-- AddForeignKey
ALTER TABLE "Division" ADD CONSTRAINT "Division_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "Department"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Unit" ADD CONSTRAINT "Unit_division_id_fkey" FOREIGN KEY ("division_id") REFERENCES "Division"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PositionCode" ADD CONSTRAINT "PositionCode_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "PositionGroup"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Office" ADD CONSTRAINT "Office_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Office" ADD CONSTRAINT "Office_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "Department"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Office" ADD CONSTRAINT "Office_division_id_fkey" FOREIGN KEY ("division_id") REFERENCES "Division"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Office" ADD CONSTRAINT "Office_unit_id_fkey" FOREIGN KEY ("unit_id") REFERENCES "Unit"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Office" ADD CONSTRAINT "Office_pos_id_fkey" FOREIGN KEY ("pos_id") REFERENCES "Position"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlaceOffice" ADD CONSTRAINT "PlaceOffice_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlaceOffice" ADD CONSTRAINT "PlaceOffice_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "Department"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlaceOffice" ADD CONSTRAINT "PlaceOffice_division_id_fkey" FOREIGN KEY ("division_id") REFERENCES "Division"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlaceOffice" ADD CONSTRAINT "PlaceOffice_unit_id_fkey" FOREIGN KEY ("unit_id") REFERENCES "Unit"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlaceOffice" ADD CONSTRAINT "PlaceOffice_pos_id_fkey" FOREIGN KEY ("pos_id") REFERENCES "Position"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Employee" ADD CONSTRAINT "Employee_pos_code_id_fkey" FOREIGN KEY ("pos_code_id") REFERENCES "PositionCode"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CourseMaterial" ADD CONSTRAINT "CourseMaterial_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;
