import { useRef, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Icons } from '../components/Icons';

const T = {
  bg: '#0B1729', surface: '#142338', line: '#24385A',
  text: '#F2F5FA', textMid: '#9AA9C2', textDim: '#667690',
  primary: '#F6B93B', primaryInk: '#1A1205', danger: '#FF5A5F',
};

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
    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: 'environment' }, audio: false })
      .then((stream) => {
        streamRef.current = stream;
        if (videoRef.current) videoRef.current.srcObject = stream;
      })
      .catch(() => setError('Brak dostępu do aparatu. Zezwól w ustawieniach przeglądarki.'));
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

  const retake = () => {
    setCaptured(null);
    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: 'environment' }, audio: false })
      .then((stream) => {
        streamRef.current = stream;
        if (videoRef.current) videoRef.current.srcObject = stream;
      });
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
    <div style={{
      display: 'flex', flexDirection: 'column', height: '100dvh',
      alignItems: 'center', justifyContent: 'center',
      background: '#000', gap: 20, padding: '0 24px',
    }}>
      <Icons.Camera size={52} style={{ color: T.textMid }} />
      <p style={{ color: T.text, textAlign: 'center', fontSize: 15, fontWeight: 600 }}>{error}</p>
      <button onClick={onCancel} style={{
        padding: '14px 32px', borderRadius: 14, background: T.surface,
        color: T.text, border: `1px solid ${T.line}`, fontWeight: 600, cursor: 'pointer', fontSize: 15,
      }}>Wróć</button>
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100dvh', background: '#000' }}>

      {/* Top bar */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '52px 20px 12px',
        background: 'linear-gradient(to bottom, rgba(0,0,0,0.7) 0%, transparent 100%)',
        position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10,
      }}>
        <button onClick={onCancel} style={{
          width: 44, height: 44, borderRadius: 12,
          background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(8px)',
          border: 'none', color: '#fff', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Icons.X size={22} />
        </button>
        <span style={{ color: '#fff', fontWeight: 700, fontSize: 15, letterSpacing: 0.2 }}>
          Zdjęcie usterki
        </span>
        <div style={{ width: 44 }} />
      </div>

      {/* Viewfinder */}
      <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
        {!captured ? (
          <video ref={videoRef} autoPlay playsInline style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          <img src={captured} alt="Podgląd" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        )}

        {/* Focus grid overlay */}
        {!captured && (
          <div style={{
            position: 'absolute', inset: 0, pointerEvents: 'none',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <div style={{
              width: 180, height: 180, borderRadius: 8,
              border: '1.5px solid rgba(255,255,255,0.4)',
              boxShadow: '0 0 0 9999px rgba(0,0,0,0.15)',
            }} />
          </div>
        )}
      </div>

      <canvas ref={canvasRef} style={{ display: 'none' }} />

      {/* Bottom controls */}
      <div style={{
        padding: '24px 32px 40px',
        background: 'linear-gradient(to top, rgba(0,0,0,0.85) 0%, transparent 100%)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 32,
      }}>
        {!captured ? (
          <>
            <div style={{ width: 56 }} />
            {/* Shutter */}
            <button onClick={capture} style={{
              width: 76, height: 76, borderRadius: '50%',
              background: '#fff', border: '5px solid rgba(255,255,255,0.4)',
              cursor: 'pointer', padding: 0,
              boxShadow: '0 0 0 3px rgba(255,255,255,0.2)',
            }} />
            <div style={{ width: 56 }} />
          </>
        ) : (
          <>
            {/* Ponów */}
            <button onClick={retake} style={{
              flex: 1, padding: '16px', borderRadius: 14,
              background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(8px)',
              border: '1px solid rgba(255,255,255,0.2)',
              color: '#fff', fontWeight: 700, fontSize: 15,
              fontFamily: 'inherit', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            }}>
              <Icons.X size={18} /> Ponów
            </button>
            {/* Zapisz */}
            <button onClick={upload} disabled={uploading} style={{
              flex: 1, padding: '16px', borderRadius: 14,
              background: uploading ? 'rgba(246,185,59,0.6)' : T.primary,
              border: 'none', color: T.primaryInk,
              fontWeight: 700, fontSize: 15, fontFamily: 'inherit',
              cursor: uploading ? 'default' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            }}>
              {uploading
                ? <><div className="w-4 h-4 border-2 border-app-ink border-t-transparent rounded-full animate-spin" /> Wysyłam…</>
                : <><Icons.Check size={18} /> Zapisz</>
              }
            </button>
          </>
        )}
      </div>
    </div>
  );
}
