/**
 * 视频转 GIF API
 */
import { getHttpClient } from '../utils/http';

export interface ConvertProgress {
  status: 'uploading' | 'converting' | 'done' | 'error';
  message: string;
}

export async function convertVideoToGif(
  file: File,
  onProgress?: (progress: ConvertProgress) => void
): Promise<Blob> {
  onProgress?.({ status: 'uploading', message: '正在上传视频...' });

  const formData = new FormData();
  formData.append('video', file);

  const client = getHttpClient();

  const response = await client.post('/video-to-gif/convert', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
    responseType: 'blob',
    timeout: 10 * 60 * 1000, // 10分钟超时（大文件转换可能较慢）
    onUploadProgress: (event) => {
      if (event.total && event.loaded < event.total) {
        onProgress?.({ status: 'uploading', message: '正在上传视频...' });
      } else {
        onProgress?.({ status: 'converting', message: '视频转换中，请稍候...' });
      }
    },
  });

  onProgress?.({ status: 'done', message: '转换完成！' });
  return response.data as Blob;
}
