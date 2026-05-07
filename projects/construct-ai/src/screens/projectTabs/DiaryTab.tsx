import { FlatList, TouchableOpacity, View, Text, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { C } from '../../theme';
import { ts } from './shared';
import EmptyState from './EmptyState';
import type { Report } from '../../types';

export default function DiaryTab({ reports, navigation, projectId, projectName, refreshing, onRefresh }: {
  reports: Report[]; navigation: any; projectId: string; projectName: string; refreshing: boolean; onRefresh: ()=>void;
}) {
  return (
    <FlatList
      data={reports}
      keyExtractor={(r: Report) => r.id}
      contentContainerStyle={{ padding:16, gap:10, paddingBottom:120 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.primary}/>}
      ListHeaderComponent={(
        <TouchableOpacity style={ts.recordBtn} onPress={() => navigation.navigate('Record', { screen:'Recording', params:{ projectId, projectName } })}>
          <Ionicons name="mic" size={18} color={C.primaryInk}/>
          <Text style={{ color:C.primaryInk, fontSize:15, fontWeight:'800' }}>Nagraj raport głosowy</Text>
        </TouchableOpacity>
      )}
      ListEmptyComponent={<EmptyState icon="mic-outline" title="Brak raportów" sub="Nagraj pierwszy raport powyżej"/>}
      renderItem={({ item: r }: { item: Report }) => (
        <TouchableOpacity style={ts.listCard} onPress={() => navigation.navigate('ReportDetail', { reportId: r.id })} activeOpacity={0.85}>
          <View style={ts.listCardInner}>
            <View style={[ts.iconBox, { backgroundColor:C.primary+'26' }]}><Ionicons name="mic" size={20} color={C.primary}/></View>
            <View style={{ flex:1 }}>
              <Text style={ts.listCardTitle}>{new Date(r.created_at).toLocaleDateString('pl-PL', { weekday:'short', day:'numeric', month:'long' })}</Text>
              {r.ai_summary && <Text style={ts.listCardSub} numberOfLines={1}>{r.ai_summary}</Text>}
            </View>
            <Ionicons name="chevron-forward" size={16} color={C.textDim}/>
          </View>
        </TouchableOpacity>
      )}
    />
  );
}
