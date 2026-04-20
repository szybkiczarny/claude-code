const CLOUD_NAME = process.env.EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME!;
const UPLOAD_PRESET = process.env.EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET!;
const UPLOAD_URL = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`;

export async function uploadPhoto(uri: string): Promise<string> {
  const formData = new FormData();
  formData.append('file', { uri, type: 'image/jpeg', name: 'defect.jpg' } as any);
  formData.append('upload_preset', UPLOAD_PRESET);
  formData.append('folder', 'construct-ai/defects');

  const response = await fetch(UPLOAD_URL, { method: 'POST', body: formData });
  if (!response.ok) throw new Error(`Cloudinary error: ${response.status}`);

  const data = await response.json();
  return data.secure_url as string;
}
