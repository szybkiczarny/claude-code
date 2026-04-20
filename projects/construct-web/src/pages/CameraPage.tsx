import { useRef, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

interface Props {
  defectId: string;
  onDone: () => void;
  onCancel: () => void;
}

export default function CameraPage({ defectId, onDone, onCancel }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [captured, setCaptured] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false })
      .then((stream) => {
        streamRef.current = stream;
        if (videoRef.current) videoRef.current.srcObject = stream;
      })
      .catch(() => setError('Brak dostępu do aparatu'));
    return () => streamRef.current?.getTracks().forEach(t => t.stop());
  }, []);

  const capture = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d')!.drawImage(video, 0, 0);
    setCaptured(canvas.toDataURL('image/jpeg', 0.85));
    streamRef.current?.getTracks().forEach(t => t.stop());
  };

  const upload = async () => {
    if (!captured) return;
    setUploading(true);
    try {
      const res = await fetch(captured);
      const blob = await res.blob();
      const fileName = `defects/${defectId}-${Date.now()}.jpg`;
      const { error: upErr } = await supabase.storage
        .from('photos')
        .upload(fileName, blob, { contentType: 'image/jpeg' });
      if (upErr) throw upErr;

      const { data: { publicUrl } } = supabase.storage.from('photos').getPublicUrl(fileName);
      const { error: dbErr } = await supabase
        .from('defects')
        .update({ photo_url: publicUrl })
        .eq('id', defectId);
      if (dbErr) throw dbErr;
      onDone();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Błąd uploadu');
      setUploading(false);
    }
  };

  if (error) return (
    <div className="flex flex-col flex-1 items-center justify-center bg-gray-900 px-6 gap-4">
      <span className="text-4xl">📷</span>
      <p className="text-white text-center">{error}</p>
      <button onClick={onCancel} className="bg-white text-gray-900 rounded-xl px-6 py-3 font-semibold">Wróć</button>
    </div>
  );

  return (
    <div className="flex flex-col flex-1 bg-gray-900" style={{ height: '100dvh' }}>
      <div className="flex items-center gap-3 px-5 pt-14 pb-3">
        <button onClick={onCancel} className="text-white text-sm">Anuluj</button>
        <p className="flex-1 text-center text-white font-semibold">Zdjęcie usterki</p>
      </div>

      <div className="flex-1 relative overflow-hidden">
        {!captured ? (
          <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
        ) : (
          <img src={captured} alt="Podgląd" className="w-full h-full object-cover" />
        )}
      </div>

      <canvas ref={canvasRef} className="hidden" />

      <div className="px-6 py-6 flex items-center justify-center gap-8">
        {!captured ? (
          <button
            onClick={capture}
            className="w-18 h-18 rounded-full bg-white border-4 border-gray-400 active:scale-95 transition-transform"
            style={{ width: 72, height: 72 }}
          />
        ) : (
          <>
            <button
              onClick={() => { setCaptured(null); }}
              className="flex-1 bg-gray-700 text-white rounded-2xl py-4 font-semibold"
            >
              Ponów
            </button>
            <button
              onClick={upload}
              disabled={uploading}
              className="flex-1 bg-blue-600 text-white rounded-2xl py-4 font-semibold disabled:opacity-50"
            >
              {uploading ? 'Wysyłam...' : 'Zapisz'}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
