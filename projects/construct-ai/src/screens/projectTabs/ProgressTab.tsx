import { ScrollView, View, Text, RefreshControl } from 'react-native';
import { C } from '../../theme';
import { ts } from './shared';
import EmptyState from './EmptyState';
import type { ProgressEntry } from '../../types';

export default function ProgressTab({ log, refreshing, onRefresh }: {
  log: ProgressEntry[]; refreshing?: boolean; onRefresh?: ()=>void;
}) {
  const latest = log[0] ?? null;
  return (
    <ScrollView contentContainerStyle={{ padding:16, gap:12, paddingBottom:120 }} refreshControl={<RefreshControl refreshing={refreshing ?? false} onRefresh={onRefresh} tintColor={C.primary}/>}>
      {latest && (
        <View style={ts.statsCard}>
          <Text style={ts.sectionLabel}>AKTUALNY POSTĘP</Text>
          <Text style={{ fontSize:48, fontWeight:'800', color:C.primary, marginVertical:8 }}>{latest.percent}%</Text>
          {latest.stage && <View style={[ts.statusBadge, { backgroundColor:C.primary+'26', borderColor:C.primary+'66', alignSelf:'flex-start' }]}><Text style={[ts.statusText, { color:C.primary }]}>{latest.stage}</Text></View>}
          {latest.note && <Text style={{ color:C.textMid, fontSize:13, marginTop:10, lineHeight:20 }}>{latest.note}</Text>}
          <View style={ts.progressBg}><View style={[ts.progressFill, { width:`${latest.percent}%` as any }]}/></View>
        </View>
      )}
      {log.length === 0 && <EmptyState icon="bar-chart-outline" title="Brak danych o postępie" sub="Nagraj raport i wspomnij o % zaawansowania prac"/>}
      {log.length > 1 && <Text style={[ts.sectionLabel, { marginTop:4 }]}>HISTORIA · {log.length} wpisów</Text>}
      {log.slice(1).map(e => (
        <View key={e.id} style={ts.listCard}>
          <View style={ts.listCardInner}>
            <View style={[ts.iconBox, { backgroundColor:C.primary+'26' }]}>
              <Text style={{ fontSize:14, fontWeight:'800', color:C.primary }}>{e.percent}%</Text>
            </View>
            <View style={{ flex:1 }}>
              <Text style={ts.listCardTitle}>{new Date(e.created_at).toLocaleDateString('pl-PL', { day:'numeric', month:'long' })}</Text>
              {e.stage && <Text style={ts.listCardSub}>{e.stage}</Text>}
              {e.note && <Text style={{ fontSize:11, color:C.textDim, marginTop:2 }} numberOfLines={1}>{e.note}</Text>}
            </View>
          </View>
        </View>
      ))}
    </ScrollView>
  );
}
