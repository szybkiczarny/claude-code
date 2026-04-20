import { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { supabase } from '../lib/supabase';
import type { Project } from '../types';

const STATUS_LABEL: Record<string, string> = { active: 'Aktywny', completed: 'Zakończony', paused: 'Wstrzymany' };
const STATUS_COLOR: Record<string, string> = { active: '#4CAF50', completed: '#9E9E9E', paused: '#F5A623' };

export default function ProjectsScreen({ onSelect }: { onSelect: (id: string, name: string) => void }) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from('projects')
      .select('*')
      .order('created_at', { ascending: false })
      .then(({ data, error }) => {
        if (!error && data) setProjects(data);
        setLoading(false);
      });
  }, []);

  if (loading) return (
    <View style={styles.center}>
      <ActivityIndicator color="#F5A623" size="large" />
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Projekty</Text>
        <Text style={styles.subtitle}>{projects.length} projektów</Text>
      </View>

      <FlatList
        data={projects}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.card} onPress={() => onSelect(item.id, item.name)} activeOpacity={0.75}>
            <View style={styles.cardTop}>
              <Text style={styles.cardName}>{item.name}</Text>
              <View style={[styles.statusDot, { backgroundColor: STATUS_COLOR[item.status] }]} />
            </View>
            <Text style={styles.cardAddress}>📍 {item.address}</Text>
            {item.client_name && <Text style={styles.cardClient}>👤 {item.client_name}</Text>}
            <View style={styles.cardFooter}>
              <Text style={[styles.statusLabel, { color: STATUS_COLOR[item.status] }]}>
                {STATUS_LABEL[item.status]}
              </Text>
              <Text style={styles.cardArrow}>›</Text>
            </View>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <View style={styles.emptyBox}>
            <Text style={styles.emptyIcon}>🏗️</Text>
            <Text style={styles.emptyText}>Brak projektów</Text>
            <Text style={styles.emptyHint}>Dodaj projekt w panelu Supabase</Text>
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
  subtitle: { fontSize: 13, color: '#9E9E9E', marginTop: 2 },
  list: { padding: 16, gap: 12 },
  card: { backgroundColor: '#1E1E1E', borderRadius: 16, padding: 18, borderWidth: 1, borderColor: '#2C2C2C' },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  cardName: { fontSize: 17, fontWeight: '700', color: '#F5F5F5', flex: 1 },
  statusDot: { width: 10, height: 10, borderRadius: 5 },
  cardAddress: { fontSize: 13, color: '#9E9E9E', marginBottom: 4 },
  cardClient: { fontSize: 13, color: '#9E9E9E', marginBottom: 12 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  statusLabel: { fontSize: 12, fontWeight: '600' },
  cardArrow: { color: '#9E9E9E', fontSize: 22 },
  emptyBox: { alignItems: 'center', paddingTop: 80, gap: 8 },
  emptyIcon: { fontSize: 48 },
  emptyText: { color: '#F5F5F5', fontSize: 18, fontWeight: '700' },
  emptyHint: { color: '#9E9E9E', fontSize: 13 },
});
