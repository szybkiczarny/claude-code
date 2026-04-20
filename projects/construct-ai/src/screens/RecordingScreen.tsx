import { useState, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, Modal, ScrollView
} from 'react-native';
import { Audio } from 'expo-av';
import { supabase } from '../lib/supabase';
import { transcribeAudio } from '../lib/groq';
import { extractReportData } from '../lib/gemini';
import DefectCameraScreen from './DefectCameraScreen';
import type { RecordingState } from '../types';

export default function RecordingScreen({ projectId }: { projectId: string }) {
  const [state, setState] = useState<RecordingState>('idle');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [reportId, setReportId] = useState<string | null>(null);
  const [summary, setSummary] = useState<string | null>(null);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [duration, setDuration] = useState(0);
  const recordingRef = useRef<Audio.Recording | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startRecording = async () => {
    try {
      const { granted } = await Audio.requestPermissionsAsync();
      if (!granted) {
        Alert.alert('Brak uprawnień', 'Zezwól na dostęp do mikrofonu w ustawieniach.');
        return;
      }
      await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      recordingRef.current = recording;
      setDuration(0);
      timerRef.current = setInterval(() => setDuration((d) => d + 1), 1000);
      setState('recording');
    } catch (err) {
      handleError('Nie udało się uruchomić mikrofonu', err);
    }
  };

  const stopAndProcess = async () => {
    if (!recordingRef.current) return;
    if (timerRef.current) clearInterval(timerRef.current);
    const recording = recordingRef.current;
    recordingRef.current = null;

    try {
      await recording.stopAndUnloadAsync();
      await Audio.setAudioModeAsync({ allowsRecordingIOS: false });
      const uri = recording.getURI();
      if (!uri) throw new Error('Brak pliku audio');

      setState('uploading');
      const transcript = await transcribeAudio(uri);

      setState('processing');
      const reportData = await extractReportData(transcript);

      const { data: { user } } = await supabase.auth.getUser();
      const { data: report, error: reportError } = await supabase
        .from('reports')
        .insert({
          project_id: projectId,
          inspector_id: user?.id,
          transcript,
          ai_summary: reportData.summary,
          weather: reportData.weather,
          status: 'done',
        })
        .select()
        .single();

      if (reportError) throw reportError;

      if (reportData.defects.length > 0) {
        await supabase.from('defects').insert(
          reportData.defects.map((d) => ({
            report_id: report.id,
            project_id: projectId,
            description: d.description,
            severity: d.severity,
            location_desc: d.location,
          }))
        );
      }

      setReportId(report.id);
      setSummary(reportData.summary);
      setState('done');
    } catch (err) {
      handleError('Błąd podczas przetwarzania nagrania', err);
    }
  };

  const handleError = (msg: string, err: unknown) => {
    console.error(msg, err);
    setErrorMsg(msg);
    setState('error');
  };

  const reset = () => {
    setErrorMsg(null);
    setReportId(null);
    setSummary(null);
    setDuration(0);
    setState('idle');
  };

  const formatDuration = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Nowy raport</Text>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>🏗️ Projekt aktywny</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>

        {/* Główny przycisk */}
        <View style={styles.recordWrapper}>
          {state === 'idle' && (
            <TouchableOpacity style={styles.btnRecord} onPress={startRecording} activeOpacity={0.85}>
              <Text style={styles.micIcon}>🎙️</Text>
              <Text style={styles.btnRecordLabel}>Naciśnij i mów</Text>
              <Text style={styles.btnRecordHint}>Opisz co widzisz na budowie</Text>
            </TouchableOpacity>
          )}

          {state === 'recording' && (
            <TouchableOpacity style={[styles.btnRecord, styles.btnRecording]} onPress={stopAndProcess} activeOpacity={0.85}>
              <View style={styles.recordingDot} />
              <Text style={styles.micIcon}>⏹</Text>
              <Text style={styles.btnRecordLabel}>Zakończ nagrywanie</Text>
              <Text style={styles.timerText}>{formatDuration(duration)}</Text>
            </TouchableOpacity>
          )}

          {(state === 'uploading' || state === 'processing') && (
            <View style={styles.processingBox}>
              <ActivityIndicator size="large" color="#F5A623" />
              <Text style={styles.processingText}>
                {state === 'uploading' ? '⬆️  Wysyłanie audio...' : '🤖  AI analizuje raport...'}
              </Text>
            </View>
          )}

          {state === 'done' && (
            <View style={styles.doneBox}>
              <Text style={styles.doneIcon}>✅</Text>
              <Text style={styles.doneTitle}>Raport gotowy!</Text>
              {summary && <Text style={styles.doneSummary}>{summary}</Text>}
            </View>
          )}

          {state === 'error' && (
            <View style={styles.errorBox}>
              <Text style={styles.errorIcon}>❌</Text>
              <Text style={styles.errorText}>{errorMsg}</Text>
            </View>
          )}
        </View>

        {/* Akcje po zapisaniu */}
        {state === 'done' && reportId && (
          <View style={styles.actionsRow}>
            <TouchableOpacity style={styles.actionCard} onPress={() => setCameraOpen(true)}>
              <Text style={styles.actionIcon}>📸</Text>
              <Text style={styles.actionLabel}>Dodaj zdjęcia usterek</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionCard} onPress={reset}>
              <Text style={styles.actionIcon}>🎙️</Text>
              <Text style={styles.actionLabel}>Nagraj kolejny</Text>
            </TouchableOpacity>
          </View>
        )}

        {state === 'error' && (
          <TouchableOpacity style={styles.btnRetry} onPress={reset}>
            <Text style={styles.btnRetryText}>Spróbuj ponownie</Text>
          </TouchableOpacity>
        )}

        {/* Podpowiedź */}
        {state === 'idle' && (
          <View style={styles.tipsBox}>
            <Text style={styles.tipsTitle}>💡 Jak nagrywać?</Text>
            <Text style={styles.tipItem}>• Powiedz gdzie jesteś (np. "3. piętro, oś C")</Text>
            <Text style={styles.tipItem}>• Opisz co widzisz i co wymaga naprawy</Text>
            <Text style={styles.tipItem}>• Wspomnij liczbę pracowników jeśli ważne</Text>
            <Text style={styles.tipItem}>• AI automatycznie wyciągnie usterki</Text>
          </View>
        )}
      </ScrollView>

      {/* Modal z kamerą */}
      <Modal visible={cameraOpen} animationType="slide" onRequestClose={() => setCameraOpen(false)}>
        {reportId && (
          <DefectCameraScreen
            projectId={projectId}
            reportId={reportId}
            onDone={() => setCameraOpen(false)}
          />
        )}
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#111' },
  header: { paddingTop: 56, paddingHorizontal: 20, paddingBottom: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerTitle: { fontSize: 22, fontWeight: '800', color: '#F5F5F5' },
  badge: { backgroundColor: '#2C2C2C', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
  badgeText: { color: '#9E9E9E', fontSize: 12 },
  body: { paddingHorizontal: 20, paddingBottom: 40 },

  recordWrapper: { alignItems: 'center', marginVertical: 32 },
  btnRecord: {
    width: 200, height: 200, borderRadius: 100,
    backgroundColor: '#F5A623', alignItems: 'center', justifyContent: 'center',
    shadowColor: '#F5A623', shadowOpacity: 0.35, shadowRadius: 30, elevation: 12,
  },
  btnRecording: { backgroundColor: '#E53935', shadowColor: '#E53935' },
  micIcon: { fontSize: 52 },
  btnRecordLabel: { fontSize: 14, fontWeight: '700', color: '#1A1A1A', marginTop: 6 },
  btnRecordHint: { fontSize: 11, color: '#1A1A1A', opacity: 0.7, marginTop: 2 },
  timerText: { fontSize: 20, fontWeight: '800', color: '#fff', marginTop: 4 },
  recordingDot: { position: 'absolute', top: 18, right: 18, width: 10, height: 10, borderRadius: 5, backgroundColor: '#fff' },

  processingBox: { alignItems: 'center', gap: 16, paddingVertical: 40 },
  processingText: { color: '#F5A623', fontSize: 16, fontWeight: '600' },

  doneBox: { alignItems: 'center', gap: 8, paddingVertical: 16 },
  doneIcon: { fontSize: 52 },
  doneTitle: { fontSize: 20, fontWeight: '800', color: '#4CAF50' },
  doneSummary: { color: '#9E9E9E', fontSize: 14, textAlign: 'center', lineHeight: 20, paddingHorizontal: 12 },

  errorBox: { alignItems: 'center', gap: 12, paddingVertical: 20 },
  errorIcon: { fontSize: 40 },
  errorText: { color: '#E53935', fontSize: 15, textAlign: 'center' },

  actionsRow: { flexDirection: 'row', gap: 12, marginBottom: 24 },
  actionCard: { flex: 1, backgroundColor: '#1E1E1E', borderRadius: 16, padding: 20, alignItems: 'center', gap: 8, borderWidth: 1, borderColor: '#2C2C2C' },
  actionIcon: { fontSize: 28 },
  actionLabel: { color: '#F5F5F5', fontSize: 13, fontWeight: '600', textAlign: 'center' },

  btnRetry: { backgroundColor: '#2C2C2C', paddingVertical: 14, borderRadius: 10, alignItems: 'center' },
  btnRetryText: { color: '#F5A623', fontWeight: '600' },

  tipsBox: { backgroundColor: '#1E1E1E', borderRadius: 16, padding: 20, borderWidth: 1, borderColor: '#2C2C2C' },
  tipsTitle: { color: '#F5A623', fontWeight: '700', fontSize: 14, marginBottom: 12 },
  tipItem: { color: '#9E9E9E', fontSize: 13, lineHeight: 22 },
});
