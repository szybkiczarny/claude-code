import { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native';
import { supabase } from '../lib/supabase';
import type { Report } from '../types';

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: string }> = {
  done:       { label: 'Gotowy',      color: '#4CAF50', icon: '✅' },
  processing: { label: 'W trakcie',   color: '#F5A623', icon: '⏳' },
  draft:      { label: 'Szkic',       color: '#9E9E9E', icon: '📝' },
  failed:     { label: 'Błąd',        color: '#E53935', icon: '❌' },
};

export default function ReportsScreen({ projectId, projectName }: { projectId: string; projectName?: string }) {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!projectId) return;
    setLoading(true);
    supabase
      .from('reports')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false })
      .then(({ data, error }) => {
        if (!error && data) setReports(data);
        setLoading(false);
      });
  }, [projectId]);

  if (loading) return (
    <View style={styles.center}>
      <ActivityIndicator color="#F5A623" size="large" />
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Raporty</Text>
        {projectName && <Text style={styles.projectName}>📁 {projectName}</Text>}
      </View>

      <FlatList
        data={reports}
        keyExtractor={(r) => r.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => {
          const config = STATUS_CONFIG[item.status] ?? STATUS_CONFIG.draft;
          return (
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardIcon}>{config.icon}</Text>
                <View style={styles.cardMeta}>
                  <Text style={styles.cardDate}>
                    {new Date(item.created_at).toLocaleDateString('pl-PL', {
                      day: 'numeric', month: 'long', year: 'numeric'
                    })}
                  </Text>
                  <Text style={styles.cardTime}>
                    {new Date(item.created_at).toLocaleTimeString('pl-PL', {
                      hour: '2-digit', minute: '2-digit'
                    })}
                  </Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: config.color + '22', borderColor: config.color }]}>
                  <Text style={[styles.statusText, { color: config.color }]}>{config.label}</Text>
                </View>
              </View>

              {item.ai_summary && (
                <Text style={styles.summary} numberOfLines={3}>{item.ai_summary}</Text>
              )}

              <View style={styles.cardFooter}>
                {item.weather && <Text style={styles.footerItem}>☁️ {item.weather}</Text>}
                {item.pdf_url && (
                  <TouchableOpacity>
                    <Text style={styles.pdfLink}>📄 Pobierz PDF</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          );
        }}
        ListEmptyComponent={
          <View style={styles.emptyBox}>
            <Text style={styles.emptyIcon}>📋</Text>
            <Text style={styles.emptyText}>Brak raportów</Text>
            <Text style={styles.emptyHint}>Nagraj pierwszy raport głosowy</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, backgroundColor: '#111', alignItems: 'center', justifyContent: 'center' },
  container: { flex: 1, backgroundColor: '#111' },
  header: { paddingTop: 56, paddingHorizontal: 20, paddingBottom: 16 },
  title: { fontSize: 28, fontWeight: '800', color: '#F5F5F5' },
  projectName: { fontSize: 13, color: '#9E9E9E', marginTop: 2 },
  list: { padding: 16, gap: 12 },
  card: { backgroundColor: '#1E1E1E', borderRadius: 16, padding: 18, borderWidth: 1, borderColor: '#2C2C2C' },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  cardIcon: { fontSize: 24 },
  cardMeta: { flex: 1 },
  cardDate: { color: '#F5F5F5', fontSize: 14, fontWeight: '600' },
  cardTime: { color: '#9E9E9E', fontSize: 12, marginTop: 1 },
  statusBadge: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1 },
  statusText: { fontSize: 11, fontWeight: '700' },
  summary: { color: '#BDBDBD', fontSize: 14, lineHeight: 20, marginBottom: 12 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  footerItem: { color: '#9E9E9E', fontSize: 12 },
  pdfLink: { color: '#F5A623', fontSize: 12, fontWeight: '600' },
  emptyBox: { alignItems: 'center', paddingTop: 80, gap: 8 },
  emptyIcon: { fontSize: 48 },
  emptyText: { color: '#F5F5F5', fontSize: 18, fontWeight: '700' },
  emptyHint: { color: '#9E9E9E', fontSize: 13 },
});
