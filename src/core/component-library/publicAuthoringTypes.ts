export interface PublicAuthoringDiagnostic {
  code: string
  path: string
  message: string
  remediation: string
}

export function diagnostic(
  code: string,
  path: string,
  message: string,
  remediation: string,
): PublicAuthoringDiagnostic {
  return { code, path, message, remediation }
}
