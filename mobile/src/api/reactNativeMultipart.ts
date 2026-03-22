/**
 * React Native FormData accepts a file descriptor object; the DOM type says Blob.
 * Keep the cast in one place.
 */
export function appendReactNativeFileField(
  formData: FormData,
  fieldName: string,
  file: { uri: string; type: string; name: string },
): void {
  formData.append(fieldName, file as unknown as Blob);
}
