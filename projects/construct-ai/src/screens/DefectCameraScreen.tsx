import { useState, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image, ActivityIndicator, Alert, TextInput, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import { uploadToR2 } from '../lib/r2';
import { supabase } from '../lib/supabase';
import { C } from '../theme';

const SEVERITY_OPTIONS = [
  { label: 'Niska',     value: 'low',      color: C.success },
  { label: 'Średnia',   value: 'medium',   color: C.warning },
  { label: 'Wysoka',    value: 'high',     color: C.danger },
  { label: 'Krytyczna', value: 'critical', color: '#CC0000' },
];

type Step = 'camera' | 'preview' | 'uploading' | 'done';

export default function DefectCameraScreen({ navigation, route }: { navigation: any; route: any }) {
  const { projectId, reportId } = route.params;
  const [permission, requestPermission] = useCameraPermissions();
  const [step, setStep] = useState<Step>('camera');
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [severity, setSeverity] = useState('medium');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const cameraRef = useRef<CameraView>(null);

  if (!permission) return <View style={s.container} />;

  if (!permission.granted) {
    return (
      <View style={s.container}>
        <Ionicons name="camera-outline" size={52} color={C.textDim} />
        <Text style={s.permLabel}>Brak dostępu do kamery</Text>
        <TouchableOpacity style={s.btnPrimary} onPress={requestPermission}>
          <Text style={s.btnText}>Zezwól na kamerę</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const takePicture = async () => {
    const photo = await cameraRef.current?.takePictureAsync({ quality: 0.75 });
    if (photo?.uri) { setPhotoUri(photo.uri); setStep('preview'); }
  };

  const saveDefect = async () => {
    if (!photoUri) return;
    setStep('uploading');
    try {
      const photoUrl = await uploadToR2(photoUri, `${Date.now()}.jpg`);
      const desc = description.trim() || 'Usterka sfotografowana na budowie';
      await supabase.from('defects').insert({
        project_id: projectId,
        report_id: reportId ?? null,
        photo_url: photoUrl,
        severity,
        location_desc: location.trim() || null,
        description: desc,
        status: 'open',
      });
      supabase.functions.invoke('send-push', {
        body: {
          project_id: projectId,
          title: 'Nowa usterka',
          body: desc,
          data: { project_id: projectId },
        },
      }).catch(() => {});
      setStep('done');
    } catch (err: any) {
      Alert.alert('Błąd', err?.message ?? 'Nie udało się zapisać');
      setStep('preview');
    }
  };

  const reset = () => { setPhotoUri(null); setDescription(''); setLocation(''); setSeverity('medium'); setStep('camera'); };

  /* ── Kamera ── */
  if (step === 'camera') {
    return (
      <View style={s.container}>
        <CameraView ref={cameraRef} style={s.camera} facing="back">
          <View style={s.camTop}>
            <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()}>
              <Ionicons name="chevron-back" size={22} color="#fff" />
            </TouchableOpacity>
          </View>
          <View style={s.camBottom}>
            <Text style={s.camHint}>Skieruj na usterkę i zrób zdjęcie</Text>
            <TouchableOpacity style={s.shutter} onPress={takePicture}>
              <View style={s.shutterInner} />
            </TouchableOpacity>
          </View>
        </CameraView>
      </View>
    );
  }

  /* ── Podgląd + formularz ── */
  if (step === 'preview') {
    return (
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1, backgroundColor: C.bg }}>
        <ScrollView keyboardShouldPersistTaps="handled">
          {photoUri && <Image source={{ uri: photoUri }} style={s.preview} />}
          <View style={s.form}>
            <Text style={s.sectionLabel}>OPIS USTERKI</Text>
            <TextInput
              style={s.input}
              placeholder="Co jest nie tak? (np. pęknięcie tynku, cieknąca rura…)"
              placeholderTextColor={C.textDim}
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={2}
            />
            <Text style={s.sectionLabel}>LOKALIZACJA</Text>
            <TextInput
              style={s.input}
              placeholder="np. 3. piętro, oś C, łazienka"
              placeholderTextColor={C.textDim}
              value={location}
              onChangeText={setLocation}
            />
            <Text style={s.sectionLabel}>POWAGA</Text>
            <View style={s.severityRow}>
              {SEVERITY_OPTIONS.map(opt => (
                <TouchableOpacity
                  key={opt.value}
                  style={[s.severityBtn, severity === opt.value && { backgroundColor: opt.color, borderColor: opt.color }]}
                  onPress={() => setSeverity(opt.value)}
                >
                  <Text style={[s.severityText, severity === opt.value && { color: '#fff' }]}>{opt.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={s.actions}>
              <TouchableOpacity style={s.btnSecondary} onPress={reset}>
                <Ionicons name="camera-outline" size={16} color={C.primary} />
                <Text style={s.btnSecondaryText}>Powtórz</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.btnPrimary} onPress={saveDefect}>
                <Text style={s.btnText}>Zapisz usterkę</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  /* ── Upload ── */
  if (step === 'uploading') {
    return (
      <View style={s.container}>
        <ActivityIndicator size="large" color={C.primary} />
        <Text style={s.permLabel}>Wysyłanie zdjęcia…</Text>
      </View>
    );
  }

  /* ── Sukces ── */
  return (
    <View style={s.container}>
      <Text style={{ fontSize: 52 }}>✅</Text>
      <Text style={s.doneText}>Usterka zapisana!</Text>
      <TouchableOpacity style={[s.btnPrimary, { marginTop: 8, width: 200 }]} onPress={() => navigation.goBack()}>
        <Text style={s.btnText}>Gotowe</Text>
      </TouchableOpacity>
      <TouchableOpacity style={[s.btnSecondary, { marginTop: 8, width: 200 }]} onPress={reset}>
        <Ionicons name="camera-outline" size={16} color={C.primary} />
        <Text style={s.btnSecondaryText}>Kolejne zdjęcie</Text>
      </TouchableOpacity>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center', gap: 16 },
  camera: { flex: 1, width: '100%' },
  camTop: { padding: 16, paddingTop: 52 },
  camBottom: { flex: 1, justifyContent: 'flex-end', alignItems: 'center', paddingBottom: 48, gap: 20 },
  camHint: { color: 'rgba(255,255,255,0.8)', fontSize: 14 },
  backBtn: { width: 44, height: 44, borderRadius: 12, backgroundColor: 'rgba(0,0,0,0.4)', alignItems: 'center', justifyContent: 'center' },
  shutter: { width: 76, height: 76, borderRadius: 38, borderWidth: 4, borderColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  shutterInner: { width: 60, height: 60, borderRadius: 30, backgroundColor: '#fff' },
  preview: { width: '100%', height: 260, resizeMode: 'cover' },
  form: { padding: 20, gap: 10 },
  sectionLabel: { fontSize: 11, color: C.textMid, textTransform: 'uppercase', letterSpacing: 1.2, fontWeight: '700', marginTop: 4 },
  input: { backgroundColor: C.surface, borderWidth: 1, borderColor: C.line, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, color: C.text, fontSize: 14 },
  severityRow: { flexDirection: 'row', gap: 8 },
  severityBtn: { flex: 1, paddingVertical: 10, borderRadius: 8, borderWidth: 1, borderColor: C.line, alignItems: 'center', backgroundColor: C.surface },
  severityText: { color: C.textMid, fontSize: 11, fontWeight: '700' },
  actions: { flexDirection: 'row', gap: 10, marginTop: 8 },
  btnPrimary: { flex: 1, backgroundColor: C.primary, paddingVertical: 14, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  btnText: { color: C.primaryInk, fontWeight: '800', fontSize: 15 },
  btnSecondary: { flex: 1, borderWidth: 1, borderColor: C.primary, paddingVertical: 14, borderRadius: 12, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 6 },
  btnSecondaryText: { color: C.primary, fontWeight: '700', fontSize: 15 },
  permLabel: { color: C.textMid, fontSize: 15, fontWeight: '600' },
  doneText: { color: C.text, fontSize: 22, fontWeight: '800' },
});
