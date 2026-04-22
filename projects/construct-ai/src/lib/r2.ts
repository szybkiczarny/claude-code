const WORKER_URL = 'https://construct-ai-upload.construct-ai.workers.dev';

export async function uploadToR2(localUri: string, fileName: string): Promise<string> {
  const response = await fetch(localUri);
  const blob = await response.blob();

  const res = await fetch(WORKER_URL, {
    method: 'POST',
    headers: {
      'content-type': 'image/jpeg',
      'x-file-name': fileName,
    },
    body: blob,
  });

  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Upload error: ${res.status} ${txt}`);
  }

  const data = await res.json();
  return data.url as string;
}
