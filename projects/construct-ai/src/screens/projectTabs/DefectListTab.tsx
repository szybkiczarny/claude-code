import { useState, useEffect } from 'react';
import { FlatList, View, Text, TouchableOpacity, ActivityIndicator, Alert, ScrollView, Modal, TextInput, Share, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { C } from '../../theme';
import { ts, sLabel, sColor, NEXT_STATUS, NEXT_LABEL } from './shared';
import EmptyState from './EmptyState';
import { scheduleDeadlineReminder } from '../../lib/notifications';
import type { Defect, Contractor } from '../../types';

function DefectDelegateModal({ defect, projectId, onClose, onAssigned }: {
  defect: Defect|null; projectId: string; onClose: ()=>void; onAssigned: ()=>void;
}) {
  const [contractors, setContractors] = useState<Contractor[]>([]);
  const [selected, setSelected] = useState<Contractor|null>(null);
  const [deadline, setDeadline] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!defect) return;
    setSelected(null);
    setDeadline(defect.deadline ?? '');
    supabase.from('contractors').select('*').eq('project_id', projectId).order('name')
      .then(({ data }) => {
        if (data) {
          setContractors(data);
          if (defect.subcontractor) {
            const match = data.find(c => c.name === defect.subcontractor);
            if (match) setSelected(match);
          }
        }
      });
  }, [defect?.id]);

  if (!defect) return null;

  const assign = async () => {
    if (!selected) return;
    setSaving(true);
    await supabase.from('defects').update({ subcontractor: selected.name, deadline: deadline || null, status: 'in_progress' }).eq('id', defect.id);
    if (deadline) scheduleDeadlineReminder(defect.description, selected.name, deadline);
    setSaving(false);
    onAssigned();
    onClose();
  };

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={ts.modalOverlay} activeOpacity={1} onPress={onClose}>
        <TouchableOpacity activeOpacity={1} style={[ts.sheet, { maxHeight:'85%' }]}>
          <View style={ts.sheetHandle}/>
          <Text style={ts.sheetSub}>PRZYDZIEL USTERKĘ</Text>
          <Text style={ts.sheetTitle} numberOfLines={2}>{defect.description}</Text>
          <Text style={[ts.sheetSub, { marginBottom:8 }]}>WYKONAWCA</Text>
          <ScrollView style={{ maxHeight:180 }} showsVerticalScrollIndicator={false}>
            {contractors.length === 0 && <Text style={{ color:C.textDim, fontSize:13, marginBottom:12 }}>Brak wykonawców — dodaj w zakładce Kontrahenci</Text>}
            {contractors.map(c => {
              const active = selected?.id === c.id;
              return (
                <TouchableOpacity key={c.id} onPress={() => setSelected(active ? null : c)}
                  style={{ flexDirection:'row', alignItems:'center', gap:10, padding:10, borderRadius:12, marginBottom:6,
                    backgroundColor: active ? C.primary+'18' : C.bg, borderWidth:1, borderColor: active ? C.primary : C.line }}>
                  <View style={{ width:36, height:36, borderRadius:18, backgroundColor: active ? C.primary : C.surfaceHi, alignItems:'center', justifyContent:'center' }}>
                    <Text style={{ fontSize:13, fontWeight:'700', color: active ? C.primaryInk : C.textMid }}>{c.name.slice(0,2).toUpperCase()}</Text>
                  </View>
                  <View style={{ flex:1 }}>
                    <Text style={{ fontSize:14, fontWeight:'700', color:C.text }}>{c.name}</Text>
                    {c.phone && <Text style={{ fontSize:11, color:C.textMid }}>{c.phone}</Text>}
                  </View>
                  {active && <Ionicons name="checkmark-circle" size={20} color={C.primary}/>}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
          <Text style={[ts.sheetSub, { marginTop:14, marginBottom:8 }]}>TERMIN (opcjonalnie)</Text>
          <TextInput style={ts.input} placeholder="np. 2026-05-10" placeholderTextColor={C.textDim} value={deadline} onChangeText={setDeadline}/>
          <TouchableOpacity style={[ts.recordBtn, !selected && { backgroundColor:C.line }]} onPress={assign} disabled={!selected || saving}>
            {saving ? <ActivityIndicator color={C.primaryInk} size="small"/> : <Text style={{ color: selected ? C.primaryInk : C.textMid, fontWeight:'800', fontSize:15 }}>{selected ? `Przydziel → ${selected.name}` : 'Wybierz wykonawcę'}</Text>}
          </TouchableOpacity>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

export default function DefectListTab({ defects, navigation, showFilter, onReload, refreshing, onRefresh, projectId }: {
  defects: Defect[]; navigation: any; showFilter?: boolean; onReload?: ()=>void; refreshing?: boolean; onRefresh?: ()=>void; projectId?: string;
}) {
  const [filter, setFilter] = useState('all');
  const [updating, setUpdating] = useState<string|null>(null);
  const [delegateDefect, setDelegateDefect] = useState<Defect|null>(null);
  const visible = filter === 'all' ? defects : defects.filter(d => d.status === filter);

  const changeStatus = async (d: Defect) => {
    setUpdating(d.id);
    await supabase.from('defects').update({ status: NEXT_STATUS[d.status] }).eq('id', d.id);
    setUpdating(null);
    onReload?.();
  };

  const deleteDefect = (d: Defect) => {
    Alert.alert('Usuń usterkę', `Usunąć "${d.description.slice(0,60)}"?`, [
      { text:'Anuluj', style:'cancel' },
      { text:'Usuń', style:'destructive', onPress: async () => {
        await supabase.from('defects').delete().eq('id', d.id);
        onReload?.();
      }},
    ]);
  };

  return (
    <View style={{ flex:1 }}>
      <FlatList
        data={visible}
        keyExtractor={d => d.id}
        contentContainerStyle={{ padding:16, gap:10, paddingBottom:120 }}
        refreshControl={<RefreshControl refreshing={refreshing ?? false} onRefresh={onRefresh} tintColor={C.primary}/>}
        ListHeaderComponent={showFilter && defects.length > 0 ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom:12 }}>
            <View style={{ flexDirection:'row', gap:8 }}>
              {[{ id:'all', l:'Wszystkie' },{ id:'open', l:'Otwarte' },{ id:'in_progress', l:'W toku' },{ id:'resolved', l:'Naprawione' }].map(f => (
                <TouchableOpacity key={f.id} style={[ts.filterChip, filter===f.id && ts.filterChipActive]} onPress={() => setFilter(f.id)}>
                  <Text style={[ts.filterText, filter===f.id && ts.filterTextActive]}>{f.l}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        ) : null}
        ListEmptyComponent={<EmptyState icon="checkmark-circle-outline" title={showFilter ? 'Brak usterek' : 'Nic do zrobienia'} sub="Usterki z raportów głosowych pojawią się tutaj"/>}
        renderItem={({ item: d }: { item: Defect }) => (
          <View style={[ts.listCard, { opacity: d.status==='resolved' ? 0.6 : 1 }]}>
            <View style={{ padding:14, gap:8 }}>
              <View style={{ flexDirection:'row', alignItems:'center', gap:8, flexWrap:'wrap' }}>
                <View style={[ts.statusBadge, { backgroundColor:sColor(d.status)+'26', borderColor:sColor(d.status)+'66' }]}>
                  <Text style={[ts.statusText, { color:sColor(d.status) }]}>{sLabel(d.status)}</Text>
                </View>
                <Text style={{ color:C.textMid, fontSize:11, fontWeight:'600', textTransform:'uppercase' }}>{d.severity}</Text>
                <View style={{ flex:1 }}/>
                <TouchableOpacity
                  style={[ts.statusBtn, { backgroundColor:sColor(NEXT_STATUS[d.status])+'22', borderColor:sColor(NEXT_STATUS[d.status])+'66' }]}
                  onPress={() => changeStatus(d)}
                  disabled={updating === d.id}
                >
                  {updating === d.id
                    ? <ActivityIndicator size={10} color={C.textMid}/>
                    : <Text style={[ts.statusBtnText, { color:sColor(NEXT_STATUS[d.status]) }]}>{NEXT_LABEL[d.status]}</Text>
                  }
                </TouchableOpacity>
              </View>
              <Text style={{ fontSize:14, fontWeight:'700', color:C.text, textDecorationLine:d.status==='resolved'?'line-through':'none' }}>{d.description}</Text>
              {d.location_desc && <View style={{ flexDirection:'row', alignItems:'center', gap:4 }}><Ionicons name="location-outline" size={12} color={C.textMid}/><Text style={{ fontSize:11, color:C.textMid }}>{d.location_desc}</Text></View>}
              <View style={{ flexDirection:'row', alignItems:'center', gap:8 }}>
                {d.subcontractor
                  ? <View style={{ flexDirection:'row', alignItems:'center', gap:4 }}><Ionicons name="business-outline" size={12} color={C.textMid}/><Text style={{ fontSize:11, color:C.textMid }}>{d.subcontractor}</Text></View>
                  : <Text style={{ fontSize:11, color:C.textDim }}>Brak wykonawcy</Text>
                }
                <View style={{ flex:1 }}/>
                {projectId && (
                  <TouchableOpacity style={ts.delegateBtn} onPress={() => {
                    const msg = [`🔧 Usterka: ${d.description}`, d.location_desc ? `📍 Lokalizacja: ${d.location_desc}` : null, d.action ? `🛠️ Działanie: ${d.action}` : null, d.deadline ? `📅 Termin: ${d.deadline}` : null].filter(Boolean).join('\n');
                    Share.share({ message: msg });
                  }}>
                    <Ionicons name="share-social-outline" size={14} color={C.primaryInk}/>
                  </TouchableOpacity>
                )}
                <TouchableOpacity style={[ts.delegateBtn, { backgroundColor:C.danger+'22' }]} onPress={() => deleteDefect(d)}>
                  <Ionicons name="trash-outline" size={14} color={C.danger}/>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}
      />
      {projectId && <DefectDelegateModal defect={delegateDefect} projectId={projectId} onClose={() => setDelegateDefect(null)} onAssigned={() => { onReload?.(); setDelegateDefect(null); }}/>}
      {projectId && (
        <TouchableOpacity style={ts.fab} onPress={() => navigation.navigate('DefectCamera', { projectId, reportId:null })}>
          <Ionicons name="camera" size={26} color={C.primaryInk}/>
        </TouchableOpacity>
      )}
    </View>
  );
}
