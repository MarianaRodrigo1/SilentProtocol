import { ApiError, apiMessages, requestJsonBody, requestVoid, requestVoidBody } from './http';
import { appendReactNativeFileField } from './reactNativeMultipart';
import type {
  BluetoothScanPayload,
  ContactLeakPayload,
  PostLocationPayload,
  UploadMediaPayload,
} from './contracts';

export type {
  BluetoothScanPayload,
  ContactLeakPayload,
  PostLocationPayload,
  UploadMediaPayload,
};

export interface LocationBatchAck {
  inserted: number;
  skipped_duplicates: number;
}

export async function postLocationsBatch(payload: PostLocationPayload[]): Promise<LocationBatchAck> {
  return requestJsonBody<LocationBatchAck>(
    '/intelligence/locations',
    'POST',
    payload,
    apiMessages.postLocation,
  );
}

export async function postBluetoothScans(scans: BluetoothScanPayload[]): Promise<void> {
  await requestVoidBody('/intelligence/scans', 'POST', scans, apiMessages.postBluetooth);
}

export async function postContactLeaks(contacts: ContactLeakPayload[]): Promise<void> {
  await requestVoidBody('/intelligence/contacts', 'POST', contacts, apiMessages.postContacts);
}

export async function uploadMedia(payload: UploadMediaPayload): Promise<void> {
  const formData = new FormData();
  formData.append('agent_id', payload.agent_id);
  formData.append('media_type', payload.media_type);
  const fileName = `${payload.media_type.toLowerCase()}-${Date.now()}.jpg`;

  if (payload.uri.startsWith('file:') || payload.uri.startsWith('content:')) {
    appendReactNativeFileField(formData, 'file', {
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

  await requestVoid('/intelligence/media', { method: 'POST', body: formData }, apiMessages.uploadMedia);
}
