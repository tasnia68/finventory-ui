import { request } from './api';
import { getAuthorizationHeaders } from './authStorage';

const unwrap = (response) => response?.data ?? response;

export const getPayrollOverview = () => request('/payroll/overview').then(unwrap);
export const getPayrollUserOptions = () => request('/payroll/users/options').then(unwrap);
export const getPayrollDepartments = () => request('/payroll/departments').then(unwrap);
export const createPayrollDepartment = (body) => request('/payroll/departments', { method: 'POST', body }).then(unwrap);
export const updatePayrollDepartment = (id, body) => request(`/payroll/departments/${id}`, { method: 'PUT', body }).then(unwrap);
export const deletePayrollDepartment = (id) => request(`/payroll/departments/${id}`, { method: 'DELETE' }).then(unwrap);
export const getPayrollDesignations = () => request('/payroll/designations').then(unwrap);
export const createPayrollDesignation = (body) => request('/payroll/designations', { method: 'POST', body }).then(unwrap);
export const updatePayrollDesignation = (id, body) => request(`/payroll/designations/${id}`, { method: 'PUT', body }).then(unwrap);
export const deletePayrollDesignation = (id) => request(`/payroll/designations/${id}`, { method: 'DELETE' }).then(unwrap);
export const getPayrollEmployees = () => request('/payroll/employees').then(unwrap);
export const createPayrollEmployee = (body) => request('/payroll/employees', { method: 'POST', body }).then(unwrap);
export const updatePayrollEmployee = (id, body) => request(`/payroll/employees/${id}`, { method: 'PUT', body }).then(unwrap);
export const archivePayrollEmployee = (id) => request(`/payroll/employees/${id}/archive`, { method: 'POST' }).then(unwrap);
export const assignSalaryStructure = (body) => request('/payroll/employees/assignments', { method: 'POST', body }).then(unwrap);
export const getPayrollComponents = () => request('/payroll/components').then(unwrap);
export const createPayrollComponent = (body) => request('/payroll/components', { method: 'POST', body }).then(unwrap);
export const updatePayrollComponent = (id, body) => request(`/payroll/components/${id}`, { method: 'PUT', body }).then(unwrap);
export const deletePayrollComponent = (id) => request(`/payroll/components/${id}`, { method: 'DELETE' }).then(unwrap);
export const getSalaryStructures = () => request('/payroll/salary-structures').then(unwrap);
export const createSalaryStructure = (body) => request('/payroll/salary-structures', { method: 'POST', body }).then(unwrap);
export const updateSalaryStructure = (id, body) => request(`/payroll/salary-structures/${id}`, { method: 'PUT', body }).then(unwrap);
export const deleteSalaryStructure = (id) => request(`/payroll/salary-structures/${id}`, { method: 'DELETE' }).then(unwrap);
export const getAttendanceAdjustments = () => request('/payroll/attendance-adjustments').then(unwrap);
export const createAttendanceAdjustment = (body) => request('/payroll/attendance-adjustments', { method: 'POST', body }).then(unwrap);
export const updateAttendanceAdjustment = (id, body) => request(`/payroll/attendance-adjustments/${id}`, { method: 'PUT', body }).then(unwrap);
export const deleteAttendanceAdjustment = (id) => request(`/payroll/attendance-adjustments/${id}`, { method: 'DELETE' }).then(unwrap);
export const getPayrollSettings = () => request('/payroll/settings').then(unwrap);
export const savePayrollSettings = (body) => request('/payroll/settings', { method: 'PUT', body }).then(unwrap);
export const getPayrollRuns = () => request('/payroll/runs').then(unwrap);
export const getPayrollRun = (id) => request(`/payroll/runs/${id}`).then(unwrap);
export const createPayrollRun = (body) => request('/payroll/runs', { method: 'POST', body }).then(unwrap);
export const updatePayrollRunItem = (runId, itemId, body) => request(`/payroll/runs/${runId}/items/${itemId}`, { method: 'PUT', body }).then(unwrap);
export const approvePayrollRun = (id, body = {}) => request(`/payroll/runs/${id}/approve`, { method: 'POST', body }).then(unwrap);
export const markPayrollRunPaid = (id, body = {}) => request(`/payroll/runs/${id}/pay`, { method: 'POST', body }).then(unwrap);
export const getPayrollPayslips = () => request('/payroll/payslips').then(unwrap);
export const getPayrollPayslip = (id) => request(`/payroll/payslips/${id}`).then(unwrap);

export const importAttendanceAdjustments = async (file) => {
  const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080/api/v1';
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch(`${API_BASE_URL}/payroll/attendance-adjustments/import`, {
    method: 'POST',
    headers: getAuthorizationHeaders(),
    body: formData,
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data?.message || response.statusText);
  }
  return data?.data ?? data;
};
