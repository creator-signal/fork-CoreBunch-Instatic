export const COMPONENT_LIBRARY_FORM_SPECIMEN_DIRECTORY =
  'docs/features/component-library-form-specimens'

export const COMPONENT_LIBRARY_FORM_SPECIMEN_MANIFEST_REFERENCE =
  `${COMPONENT_LIBRARY_FORM_SPECIMEN_DIRECTORY}/manifest.json`

export function componentLibraryFormSpecimenReference(entryId: string): string {
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(entryId)) {
    throw new Error(
      `[component-library] Form specimen entry ID "${entryId}" is not path-safe.`,
    )
  }
  return `${COMPONENT_LIBRARY_FORM_SPECIMEN_DIRECTORY}/${entryId}.html`
}
