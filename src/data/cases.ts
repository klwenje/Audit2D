import accessManagementCase from "./case_access_management.json";
import backupRecoveryCase from "./case_backup_recovery.json";
import changeManagementCase from "./case_change_management.json";
import incidentResponseCase from "./case_incident_response.json";
import patchVulnerabilityCase from "./case_patch_vulnerability.json";
import networkSegmentationCase from "./case_network_segmentation.json";
import saasLicenseGovernanceCase from "./case_saas_license_governance.json";
import serviceAccountGovernanceCase from "./case_service_account_governance.json";
import recordsDisposalCase from "./case_records_disposal.json";
import deviceDisposalCase from "./case_device_disposal.json";
import vendorAccessCase from "./case_vendor_access.json";
import type { AuditCase } from "../types/audit";

export const auditCases = [
  accessManagementCase,
  backupRecoveryCase,
  changeManagementCase,
  incidentResponseCase,
  patchVulnerabilityCase,
  networkSegmentationCase,
  saasLicenseGovernanceCase,
  serviceAccountGovernanceCase,
  recordsDisposalCase,
  deviceDisposalCase,
  vendorAccessCase,
] as AuditCase[];

export function getAuditCase(caseId: string) {
  return auditCases.find((auditCase) => auditCase.id === caseId) ?? auditCases[0];
}
