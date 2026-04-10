// src/sync/sync.types.ts

export interface HrmDepartment {
  department_id: number;
  department_code: string;
  department_name: string;
  department_status: string;
}

export interface HrmDivision {
  division_id: number;
  division_name: string;
  division_code: string;
  division_status: string;
  department_id: number;
}

export interface HrmUnit {
  unit_id: number;
  unit_name: string;
  unit_code: string;
  unit_status: string;
  division_id: number;
}

export interface HrmOffice {
  office_id: number;
  office_name: string;
  office_code: string;
  office_status: string;
  division_id: number;
}

export interface HrmPositionGroup {
  pos_group_id: number;
  pos_group_name: string;
}

export interface HrmPositionCode {
  pos_code_id: number;
  pos_code_name: string;
  pos_code_status: string;
  pos_group_id: number;
}

export interface HrmPosition {
  pos_id: number;
  pos_name: string;
  pos_status: string;
  pos_code_id: number;
}

export interface SyncResult {
  entity: string;
  synced: number;
  errors: number;
}

export interface HrmOfficeDetail {
  place_office_id: number;
  department_id:   number;
  division_id:     number;
  unit_id:         number | null;
  pos_id:          number | null;
  special_subject_id: number | null;
  revolution_date: string | null;
  state_date:      string | null;
  remark:          string | null;
  specialSubject?: {
    special_subject_id:   number;
    special_subject_name: string;
  } | null;
}

export interface HrmEmployee {
  emp_id:        number;
  emp_code:      string;
  first_name_la: string;
  last_name_la:  string;
  email:         string;
  phone:         string;
  gender:        string;         // "Male" | "Female"
  image:         string | null;
  status:        string;         // "A" | "I"
  pos_code_id?:  number | null;
  office:        HrmOfficeDetail | null;
  placeOffice:   HrmOfficeDetail | null;
  positionCode?: {
    pos_code_id:   number;
    pos_code_name: string;
    pos_group_id:  number;
  } | null;
}