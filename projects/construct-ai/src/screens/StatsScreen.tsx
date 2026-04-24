import { useCallback, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, RefreshControl } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import { C } from '../theme';

interface ProjectStat { id: string; name: string; open: number; inProgress: number; resolved: number; total: number; }
interface ContractorStat { name: string; count: number; }

export default function StatsScreen({ navigation }: { navigation: any }) {
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [totalProjects, setTotalProjects] = useState(0);
  const [totalReports, setTotalReports] = useState(0);
  const [defectOpen, setDefectOpen] = useState(0);
  const [defectInProgress, setDefectInProgress] = useState(0);
  const [defectResolved, setDefectResolved] = useState(0);
  const [projectStats, setProjectStats] = useState<ProjectStat[]>([]);
  const [topContractors, setTopContractors] = useState<ContractorStat[]>([]);
  const [reportsThisWeek, setReportsThisWeek] = useState(0);

  const load = async (silent = false) => {
    if (!silent) setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }

    const { data: ps } = await supabase.from('projects').select('id,name').eq('manager_id', user.id);
    const projects = ps ?? [];
    setTotalProjects(projects.length);

    if (!projects.length) { setLoading(false); setRefreshing(false); return; }
    const ids = projects.map(p => p.id);

    const weekAgo = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString();

    const [{ data: defects }, { data: reports }] = await Promise.all([
      supabase.from('defects').select('project_id,status,subcontractor').in('project_id', ids),
      supabase.from('reports').select('project_id,created_at').in('project_id', ids),
    ]);

    const allDefects = defects ?? [];
    const allReports = reports ?? [];

    setTotalReports(allReports.length);
    setReportsThisWeek(allReports.filter(r => r.created_at >= weekAgo).length);
    setDefectOpen(allDefects.filter(d => d.status === 'open').length);
    setDefectInProgress(allDefects.filter(d => d.status === 'in_progress').length);
    setDefectResolved(allDefects.filter(d => d.status === 'resolved').length);

    const pMap: Record<string, ProjectStat> = {};
    for (const p of projects) pMap[p.id] = { id: p.id, name: p.name, open: 0, inProgress: 0, resolved: 0, total: 0 };
    for (const d of allDefects) {
      if (!pMap[d.project_id]) continue;
      pMap[d.project_id].total++;
      if (d.status === 'open') pMap[d.project_id].open++;
      else if (d.status === 'in_progress') pMap[d.project_id].inProgress++;
      else pMap[d.project_id].resolved++;
    }
    setProjectStats(Object.values(pMap).filter(p => p.total > 0).sort((a, b) => (b.open + b.inProgress) - (a.open + a.inProgress)));

    const cMap: Record<string, number> = {};
    for (const d of allDefects) {
      if (d.subcontractor) cMap[d.subcontractor] = (cMap[d.subcontractor] ?? 0) + 1;
    }
    setTopContractors(Object.entries(cMap).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count).slice(0, 5));

    setLoading(false);
    setRefreshing(false);
  };

  useFocusEffect(useCallback(() => { load(); }, []));
  const onRefresh = () => { setRefreshing(true); load(true); };

  const totalDefects = defectOpen + defectInProgress + defectResolved;
  const pctOpen = totalDefects > 0 ? defectOpen / totalDefects : 0;
  const pctProgress = totalDefects > 0 ? defectInProgress / totalDefects : 0;
  const pctDone = totalDefects > 0 ? defectResolved / totalDefects : 0;

  return (
    <View style={s.root}>
      <View style={[s.header, { paddingTop: insets.top + 12 }]}>
        <View style={{ flex: 1 }}>
          <Text style={s.sub}>DASHBOARD</Text>
          <Text style={s.title}>Statystyki</Text>
        </View>
        <TouchableOpacity style={s.profileBtn} onPress={() => navigation.navigate('StatsProfile')}>
          <Ionicons name="person-outline" size={20} color={C.text} />
        </TouchableOpacity>
      </View>

      {loading
        ? <ActivityIndicator color={C.primary} style={{ marginTop: 60 }} size="large" />
        : <ScrollView contentContainerStyle={s.scroll} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.primary} />}>

          {/* Summary tiles */}
          <View style={s.tilesRow}>
            {[
              { v: totalProjects, l: 'Projekty', c: C.text, icon: 'folder-outline' as const },
              { v: totalReports, l: 'Raporty', c: C.info, icon: 'document-text-outline' as const },
              { v: reportsThisWeek, l: 'Ten tydzień', c: C.primary, icon: 'calendar-outline' as const },
              { v: totalDefects, l: 'Usterki', c: defectOpen > 0 ? C.danger : C.success, icon: 'alert-circle-outline' as const },
            ].map(({ v, l, c, icon }) => (
              <View key={l} style={s.tile}>
                <Ionicons name={icon} size={18} color={c} style={{ marginBottom: 4 }} />
                <Text style={[s.tileVal, { color: c }]}>{v}</Text>
                <Text style={s.tileLbl}>{l}</Text>
              </View>
            ))}
          </View>

          {/* Defects breakdown */}
          {totalDefects > 0 && (
            <View style={s.card}>
              <Text style={s.cardTitle}>USTERKI — STATUS</Text>
              <View style={s.barRow}>
                {pctOpen > 0 && <View style={[s.barSeg, { flex: pctOpen, backgroundColor: C.danger }]} />}
                {pctProgress > 0 && <View style={[s.barSeg, { flex: pctProgress, backgroundColor: C.warning }]} />}
                {pctDone > 0 && <View style={[s.barSeg, { flex: pctDone, backgroundColor: C.success }]} />}
              </View>
              <View style={s.legend}>
                {[
                  { label: 'Otwarte', count: defectOpen, color: C.danger },
                  { label: 'W toku', count: defectInProgress, color: C.warning },
                  { label: 'Naprawione', count: defectResolved, color: C.success },
                ].map(({ label, count, color }) => (
                  <View key={label} style={s.legendItem}>
                    <View style={[s.legendDot, { backgroundColor: color }]} />
                    <Text style={s.legendLabel}>{label}</Text>
                    <Text style={[s.legendVal, { color }]}>{count}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Per-project breakdown */}
          {projectStats.length > 0 && (
            <View style={s.card}>
              <Text style={s.cardTitle}>USTERKI PER PROJEKT</Text>
              <View style={{ gap: 12 }}>
                {projectStats.map(p => {
                  const maxPossible = Math.max(...projectStats.map(x => x.total), 1);
                  return (
                    <View key={p.id}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
                        <Text style={s.projName} numberOfLines={1}>{p.name}</Text>
                        <Text style={[s.projCount, { color: (p.open + p.inProgress) > 0 ? C.danger : C.success }]}>
                          {p.open + p.inProgress > 0 ? `${p.open + p.inProgress} otwarte` : '✓ wszystkie naprawione'}
                        </Text>
                      </View>
                      <View style={s.projBarBg}>
                        {p.resolved > 0 && <View style={{ flex: p.resolved / maxPossible, backgroundColor: C.success, borderRadius: 3 }} />}
                        {p.inProgress > 0 && <View style={{ flex: p.inProgress / maxPossible, backgroundColor: C.warning, borderRadius: 3 }} />}
                        {p.open > 0 && <View style={{ flex: p.open / maxPossible, backgroundColor: C.danger, borderRadius: 3 }} />}
                        {p.total < maxPossible && <View style={{ flex: (maxPossible - p.total) / maxPossible }} />}
                      </View>
                    </View>
                  );
                })}
              </View>
            </View>
          )}

          {/* Top contractors */}
          {topContractors.length > 0 && (
            <View style={s.card}>
              <Text style={s.cardTitle}>TOP WYKONAWCY</Text>
              <View style={{ gap: 10 }}>
                {topContractors.map((c, i) => (
                  <View key={c.name} style={s.contractorRow}>
                    <View style={[s.rank, { backgroundColor: i === 0 ? C.primary + '33' : C.surfaceHi }]}>
                      <Text style={[s.rankText, { color: i === 0 ? C.primary : C.textMid }]}>#{i + 1}</Text>
                    </View>
                    <Text style={s.contractorName} numberOfLines={1}>{c.name}</Text>
                    <View style={s.countBadge}>
                      <Text style={s.countBadgeText}>{c.count} usterek</Text>
                    </View>
                  </View>
                ))}
              </View>
            </View>
          )}

          {totalDefects === 0 && !loading && (
            <View style={s.empty}>
              <Ionicons name="bar-chart-outline" size={52} color={C.textDim} />
              <Text style={s.emptyTitle}>Brak danych</Text>
              <Text style={s.emptySub}>Nagraj raporty żeby zobaczyć statystyki</Text>
            </View>
          )}
        </ScrollView>
      }
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 12 },
  sub: { fontSize: 11, color: C.textMid, textTransform: 'uppercase', letterSpacing: 1.2, fontWeight: '700' },
  title: { fontSize: 26, fontWeight: '800', color: C.text, letterSpacing: -0.5 },
  profileBtn: { width: 44, height: 44, borderRadius: 12, backgroundColor: C.surface, borderWidth: 1, borderColor: C.line, alignItems: 'center', justifyContent: 'center' },
  scroll: { padding: 16, gap: 14, paddingBottom: 120 },
  tilesRow: { flexDirection: 'row', gap: 8 },
  tile: { flex: 1, backgroundColor: C.surface, borderWidth: 1, borderColor: C.line, borderRadius: 14, padding: 12, alignItems: 'center' },
  tileVal: { fontSize: 24, fontWeight: '800', lineHeight: 28 },
  tileLbl: { fontSize: 9, color: C.textMid, marginTop: 3, textTransform: 'uppercase', letterSpacing: 0.6, fontWeight: '600', textAlign: 'center' },
  card: { backgroundColor: C.surface, borderWidth: 1, borderColor: C.line, borderRadius: 16, padding: 16, gap: 14 },
  cardTitle: { fontSize: 11, color: C.textMid, textTransform: 'uppercase', letterSpacing: 1.2, fontWeight: '700' },
  barRow: { flexDirection: 'row', height: 10, borderRadius: 5, overflow: 'hidden', gap: 2 },
  barSeg: { height: '100%' },
  legend: { flexDirection: 'row', gap: 16, flexWrap: 'wrap' },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendLabel: { fontSize: 12, color: C.textMid, fontWeight: '600' },
  legendVal: { fontSize: 13, fontWeight: '800' },
  projName: { fontSize: 13, fontWeight: '700', color: C.text, flex: 1, marginRight: 8 },
  projCount: { fontSize: 11, fontWeight: '700' },
  projBarBg: { flexDirection: 'row', height: 6, borderRadius: 3, overflow: 'hidden', backgroundColor: C.line },
  contractorRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  rank: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  rankText: { fontSize: 12, fontWeight: '800' },
  contractorName: { flex: 1, fontSize: 14, fontWeight: '700', color: C.text },
  countBadge: { backgroundColor: C.primary + '26', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1, borderColor: C.primary + '66' },
  countBadgeText: { fontSize: 11, fontWeight: '700', color: C.primary },
  empty: { alignItems: 'center', paddingTop: 60, gap: 10 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: C.text },
  emptySub: { fontSize: 13, color: C.textDim, textAlign: 'center' },
});
