import { ApiError, apiMessages, requestJson, requestJsonBody } from './http';
import type {
  BluetoothScanPayload,
  ContactLeakPayload,
  InsertedCountResponse,
  InsertedMediaRecord,
  LocationBatchInsertResponse,
  PostLocationPayload,
  UploadMediaPayload,
} from './contracts';

function appendReactNativeFile(
  formData: FormData,
  fieldName: string,
  file: { uri: string; type: string; name: string },
): void {
  formData.append(fieldName, file as unknown as Blob);
}

export async function postLocationsBatch(
  payload: PostLocationPayload[],
): Promise<LocationBatchInsertResponse> {
  return requestJsonBody<LocationBatchInsertResponse>(
    '/intelligence/locations',
    'POST',
    payload,
    apiMessages.postLocation,
  );
}

export async function postBluetoothScans(scans: BluetoothScanPayload[]): Promise<InsertedCountResponse> {
  return requestJsonBody<InsertedCountResponse>(
    '/intelligence/scans',
    'POST',
    scans,
    apiMessages.postBluetooth,
  );
}

export async function postContactLeaks(contacts: ContactLeakPayload[]): Promise<InsertedCountResponse> {
  return requestJsonBody<InsertedCountResponse>(
    '/intelligence/contacts',
    'POST',
    contacts,
    apiMessages.postContacts,
  );
}

export async function uploadMedia(payload: UploadMediaPayload): Promise<InsertedMediaRecord> {
  const formData = new FormData();
  formData.append('agent_id', payload.agent_id);
  formData.append('media_type', payload.media_type);
  const fileName = `${payload.media_type.toLowerCase()}-${Date.now()}.jpg`;

  if (payload.uri.startsWith('file:') || payload.uri.startsWith('content:')) {
    appendReactNativeFile(formData, 'file', {
      uri: payload.uri,
      type: 'image/jpeg',
      name: fileName,
    });
  } else {
    const blobResponse = await fetch(payload.uri);
    if (!blobResponse.ok) {
      throw new ApiError('Could not read media before upload.', 'HTTP_ERROR', blobResponse.status);
    }
    const blob = await blobResponse.blob();
    formData.append('file', blob, fileName);
  }

  return requestJson<InsertedMediaRecord>(
    '/intelligence/media',
    { method: 'POST', body: formData },
    apiMessages.uploadMedia,
  );
}
