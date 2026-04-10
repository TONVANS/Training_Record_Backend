import { ApiProperty } from '@nestjs/swagger';

/**
 * Employee Organization Entity
 * Represents the organizational hierarchy and assignments for an employee
 */
export class EmployeeOrganizationEntity {
  @ApiProperty({ description: 'Employee ID' })
  id: number;

  @ApiProperty({ description: 'Employee code' })
  employee_code: string;

  @ApiProperty({ description: 'Employee full name' })
  full_name: string;

  @ApiProperty({ description: 'Department ID' })
  department_id?: number;

  @ApiProperty({ description: 'Department name' })
  department_name?: string;

  @ApiProperty({ description: 'Division ID' })
  division_id?: number;

  @ApiProperty({ description: 'Division name' })
  division_name?: string;

  @ApiProperty({ description: 'Unit ID' })
  unit_id?: number;

  @ApiProperty({ description: 'Unit name' })
  unit_name?: string;

  @ApiProperty({ description: 'Position ID' })
  position_id?: number;

  @ApiProperty({ description: 'Position name' })
  position_name?: string;

  @ApiProperty({ description: 'Position code ID' })
  pos_code_id?: number;

  @ApiProperty({ description: 'Position code name' })
  pos_code_name?: string;

  @ApiProperty({ description: 'Employee status' })
  status: string;

  @ApiProperty({ description: 'Employee email' })
  email?: string;

  @ApiProperty({ description: 'Employee phone' })
  phone?: string;

  @ApiProperty({ description: 'Employee gender' })
  gender: string;

  @ApiProperty({ description: 'Employee role' })
  role: string;

  @ApiProperty({ description: 'Creation date' })
  created_at: Date;

  @ApiProperty({ description: 'Last update date' })
  updated_at: Date;
}
