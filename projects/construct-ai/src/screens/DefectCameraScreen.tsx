import { useState, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image, ActivityIndicator, Alert } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { uploadToR2 } from '../lib/r2';
import { supabase } from '../lib/supabase';

const SEVERITY_OPTIONS = [
  { label: 'Niska', value: 'low', color: '#4CAF50' },
  { label: 'Średnia', value: 'medium', color: '#F5A623' },
  { label: 'Wysoka', value: 'high', color: '#FF7043' },
  { label: 'Krytyczna', value: 'critical', color: '#E53935' },
];

type Step = 'camera' | 'preview' | 'uploading' | 'done';

export default function DefectCameraScreen({ navigation, route }: { navigation: any; route: any }) {
  const { projectId, reportId } = route.params;
  const [permission, requestPermission] = useCameraPermissions();
  const [step, setStep] = useState<Step>('camera');
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [severity, setSeverity] = useState<string>('medium');
  const [location, setLocation] = useState('');
  const cameraRef = useRef<CameraView>(null);

  if (!permission) return <View style={styles.container} />;

  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <Text style={styles.label}>Brak dostępu do kamery</Text>
        <TouchableOpacity style={styles.btnPrimary} onPress={requestPermission}>
          <Text style={styles.btnText}>Zezwól</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const takePicture = async () => {
    const photo = await cameraRef.current?.takePictureAsync({ quality: 0.7 });
    if (photo?.uri) {
      setPhotoUri(photo.uri);
      setStep('preview');
    }
  };

  const saveDefect = async () => {
    if (!photoUri) return;
    setStep('uploading');
    try {
      const photoUrl = await uploadToR2(photoUri, `${Date.now()}.jpg`);
      await supabase.from('defects').insert({
        project_id: projectId,
        report_id: reportId,
        photo_url: photoUrl,
        severity,
        location_desc: location || null,
        description: `Usterka sfotografowana na budowie`,
        status: 'open',
      });
      setStep('done');
    } catch (err: any) {
      Alert.alert('Błąd', err?.message ?? 'Nie udało się zapisać zdjęcia');
      setStep('preview');
    }
  };

  if (step === 'camera') {
    return (
      <View style={styles.container}>
        <CameraView ref={cameraRef} style={styles.camera} facing="back">
          <View style={styles.cameraOverlay}>
            <Text style={styles.cameraHint}>Skieruj na usterkę</Text>
            <TouchableOpacity style={styles.shutterBtn} onPress={takePicture}>
              <View style={styles.shutterInner} />
            </TouchableOpacity>
          </View>
        </CameraView>
      </View>
    );
  }

  if (step === 'preview') {
    return (
      <View style={styles.container}>
        {photoUri && <Image source={{ uri: photoUri }} style={styles.preview} />}

        <View style={styles.form}>
          <Text style={styles.label}>Stopień usterki:</Text>
          <View style={styles.severityRow}>
            {SEVERITY_OPTIONS.map((opt) => (
              <TouchableOpacity
                key={opt.value}
                style={[styles.severityBtn, severity === opt.value && { backgroundColor: opt.color }]}
                onPress={() => setSeverity(opt.value)}
              >
                <Text style={[styles.severityText, severity === opt.value && { color: '#1A1A1A' }]}>
                  {opt.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.actions}>
            <TouchableOpacity style={styles.btnSecondary} onPress={() => setStep('camera')}>
              <Text style={styles.btnSecondaryText}>↩ Powtórz</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.btnPrimary} onPress={saveDefect}>
              <Text style={styles.btnText}>Zapisz usterkę</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }

  if (step === 'uploading') {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#F5A623" />
        <Text style={styles.label}>Wysyłanie zdjęcia...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={{ fontSize: 48 }}>✅</Text>
      <Text style={styles.doneText}>Usterka zapisana!</Text>
      <TouchableOpacity style={styles.btnPrimary} onPress={() => navigation.goBack()}>
        <Text style={styles.btnText}>Gotowe</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.btnSecondary} onPress={() => { setPhotoUri(null); setStep('camera'); }}>
        <Text style={styles.btnSecondaryText}>+ Kolejne zdjęcie</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1A1A1A', alignItems: 'center', justifyContent: 'center' },
  camera: { flex: 1, width: '100%' },
  cameraOverlay: { flex: 1, justifyContent: 'flex-end', alignItems: 'center', paddingBottom: 48 },
  cameraHint: { color: '#fff', fontSize: 14, marginBottom: 24, opacity: 0.8 },
  shutterBtn: {
    width: 72, height: 72, borderRadius: 36,
    borderWidth: 4, borderColor: '#fff', alignItems: 'center', justifyContent: 'center',
  },
  shutterInner: { width: 56, height: 56, borderRadius: 28, backgroundColor: '#fff' },
  preview: { width: '100%', height: 280, resizeMode: 'cover' },
  form: { padding: 20, width: '100%' },
  label: { color: '#9E9E9E', fontSize: 13, marginBottom: 10 },
  severityRow: { flexDirection: 'row', gap: 8, marginBottom: 24 },
  severityBtn: { flex: 1, paddingVertical: 10, borderRadius: 8, borderWidth: 1, borderColor: '#3C3C3C', alignItems: 'center' },
  severityText: { color: '#9E9E9E', fontSize: 12, fontWeight: '600' },
  actions: { flexDirection: 'row', gap: 12 },
  btnPrimary: { flex: 1, backgroundColor: '#F5A623', paddingVertical: 14, borderRadius: 10, alignItems: 'center' },
  btnText: { color: '#1A1A1A', fontWeight: '700', fontSize: 15 },
  btnSecondary: { flex: 1, borderWidth: 1, borderColor: '#F5A623', paddingVertical: 14, borderRadius: 10, alignItems: 'center' },
  btnSecondaryText: { color: '#F5A623', fontWeight: '600', fontSize: 15 },
  doneText: { color: '#F5F5F5', fontSize: 20, fontWeight: '700', marginVertical: 16 },
});
