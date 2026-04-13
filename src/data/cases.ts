import accessManagementCase from "./case_access_management.json";
import backupRecoveryCase from "./case_backup_recovery.json";
import type { AuditCase } from "../types/audit";

export const auditCases = [accessManagementCase, backupRecoveryCase] as AuditCase[];

export function getAuditCase(caseId: string) {
  return auditCases.find((auditCase) => auditCase.id === caseId) ?? auditCases[0];
}
