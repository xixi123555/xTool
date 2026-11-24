import { httpClient } from '../../../shared/lib/http';

export type ConvertStage = 'uploading' | 'converting' | 'done';

export async function convertVideoToGif(
  file: File,
  onStage: (stage: ConvertStage) => void,
): Promise<Blob> {
  const formData = new FormData();
  formData.append('video', file);

  onStage('uploading');
  const response = await httpClient.post('/video-to-gif/convert', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    responseType: 'blob',
    timeout: 10 * 60 * 1000,
    onUploadProgress: (event) => {
      if (event.total && event.loaded < event.total) onStage('uploading');
      else onStage('converting');
    },
  });

  onStage('done');
  return response.data as Blob;
}
