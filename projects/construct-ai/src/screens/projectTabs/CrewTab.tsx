import { useState } from 'react';
import { FlatList, View, Text, TouchableOpacity, ActivityIndicator, TextInput, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { C } from '../../theme';
import { ts } from './shared';
import EmptyState from './EmptyState';
import type { CrewEntry } from '../../types';

export default function CrewTab({ crew, projectId, onReload, refreshing, onRefresh }: {
  crew: CrewEntry[]; projectId: string; onReload: ()=>void; refreshing?: boolean; onRefresh?: ()=>void;
}) {
  const [adding, setAdding] = useState(false);
  const [role, setRole] = useState('');
  const [company, setCompany] = useState('');
  const [count, setCount] = useState('1');
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!role.trim()) return;
    setSaving(true);
    await supabase.from('crew').insert({ project_id:projectId, report_id:null, role:role.trim(), company:company.trim()||null, count:parseInt(count)||1, recorded_at:new Date().toISOString().split('T')[0] });
    setSaving(false); setRole(''); setCompany(''); setCount('1'); setAdding(false); onReload();
  };

  const total = crew.reduce((a, c) => a + c.count, 0);

  return (
    <FlatList
      data={crew}
      keyExtractor={c => c.id}
      contentContainerStyle={{ padding:16, gap:10, paddingBottom:120 }}
      refreshControl={<RefreshControl refreshing={refreshing ?? false} onRefresh={onRefresh} tintColor={C.primary}/>}
      ListHeaderComponent={(
        <>
          <TouchableOpacity style={[ts.recordBtn, adding && { backgroundColor:C.surface, borderWidth:1, borderColor:C.line }]} onPress={() => setAdding(v => !v)}>
            <Ionicons name={adding ? 'close' : 'add'} size={18} color={adding ? C.text : C.primaryInk}/>
            <Text style={{ color:adding ? C.text : C.primaryInk, fontSize:15, fontWeight:'800' }}>{adding ? 'Anuluj' : 'Dodaj osobę / ekipę'}</Text>
          </TouchableOpacity>
          {adding && (
            <View style={[ts.listCard, { padding:14, gap:10, marginTop:10 }]}>
              <TextInput style={ts.input} placeholder="Rola (np. Murarz, Elektryk)" placeholderTextColor={C.textDim} value={role} onChangeText={setRole}/>
              <TextInput style={ts.input} placeholder="Firma / podwykonawca" placeholderTextColor={C.textDim} value={company} onChangeText={setCompany}/>
              <TextInput style={ts.input} placeholder="Liczba osób" keyboardType="number-pad" placeholderTextColor={C.textDim} value={count} onChangeText={setCount}/>
              <TouchableOpacity style={[ts.recordBtn, { marginTop:0 }]} onPress={save} disabled={saving || !role.trim()}>
                {saving ? <ActivityIndicator color={C.primaryInk} size="small"/> : <Text style={{ color:C.primaryInk, fontSize:15, fontWeight:'800' }}>Zapisz</Text>}
              </TouchableOpacity>
            </View>
          )}
          {crew.length > 0 && <Text style={[ts.sectionLabel, { marginTop:12 }]}>EKIPA · {total} OSÓB</Text>}
        </>
      )}
      ListEmptyComponent={!adding ? <EmptyState icon="people-outline" title="Brak ekipy" sub="Nagraj raport lub dodaj ręcznie"/> : null}
      renderItem={({ item: c }: { item: CrewEntry }) => (
        <View style={ts.listCard}>
          <View style={ts.listCardInner}>
            <View style={[ts.iconBox, { backgroundColor:C.primary+'26' }]}><Text style={{ fontSize:18, fontWeight:'800', color:C.primary }}>{c.count}</Text></View>
            <View style={{ flex:1 }}>
              <Text style={ts.listCardTitle}>{c.role}</Text>
              <Text style={ts.listCardSub}>{c.company ?? 'Brak firmy'}</Text>
            </View>
            {c.report_id && <View style={ts.autoBadge}><Text style={ts.autoText}>AUTO</Text></View>}
          </View>
        </View>
      )}
    />
  );
}
