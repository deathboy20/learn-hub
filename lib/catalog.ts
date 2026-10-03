export type Field = { key: string; label: string; type?: 'text' | 'number' | 'date' | 'datetime-local' | 'textarea' | 'select'; options?: string[]; source?: string; required?: boolean }
export type Catalog = { title: string; table: string; permission: string; fields: Field[] }
const status: Field = { key: 'status', label: 'Status', type: 'select', options: ['active', 'archived'] }
const name: Field = { key: 'name', label: 'Name', required: true }
const code: Field = { key: 'code', label: 'Code', required: true }
const description: Field = { key: 'description', label: 'Description', type: 'textarea' }
export const catalogs: Record<string, Catalog> = {
  faculties: { title: 'Faculties & schools', table: 'faculties', permission: 'courses.manage', fields: [name, code, description, status] },
  departments: { title: 'Departments', table: 'departments', permission: 'courses.manage', fields: [name, code, { key: 'faculty_id', label: 'Faculty', source: 'faculties', required: true }, status] },
  programmes: { title: 'Programmes', table: 'programmes', permission: 'courses.manage', fields: [name, code, { key: 'department_id', label: 'Department', source: 'departments', required: true }, { key: 'degree_type', label: 'Degree', required: true }, { key: 'duration', label: 'Duration (years)', type: 'number', required: true }, description, status] },
  levels: { title: 'Academic levels', table: 'academic_levels', permission: 'courses.manage', fields: [name, { key: 'value', label: 'Level', type: 'number', required: true }] },
  terms: { title: 'Academic terms', table: 'academic_terms', permission: 'courses.manage', fields: [name, { key: 'academic_year', label: 'Academic year', required: true }, { key: 'start_date', label: 'Start', type: 'date', required: true }, { key: 'end_date', label: 'End', type: 'date', required: true }, status] },
  courses: { title: 'Courses', table: 'courses', permission: 'courses.manage', fields: [code, { key: 'title', label: 'Title', required: true }, description, { key: 'credit_hours', label: 'Credits', type: 'number', required: true }, { key: 'level', label: 'Level', type: 'number', required: true }, { key: 'department_id', label: 'Department', source: 'departments', required: true }, status] },
  'course-offerings': { title: 'Course offerings', table: 'course_offerings', permission: 'courses.manage', fields: [{ key: 'course_id', label: 'Course', source: 'courses', required: true }, { key: 'academic_term_id', label: 'Term', source: 'terms', required: true }, { key: 'lecturer_id', label: 'Lecturer', source: 'lecturers', required: true }, { key: 'programme_id', label: 'Programme', source: 'programmes', required: true }, { key: 'level', label: 'Level', type: 'number', required: true }, { key: 'capacity', label: 'Capacity', type: 'number', required: true }, status] },
}
