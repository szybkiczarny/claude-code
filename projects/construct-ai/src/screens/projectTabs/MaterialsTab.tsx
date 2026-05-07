import { useState } from 'react';
import { FlatList, View, Text, TouchableOpacity, ActivityIndicator, TextInput, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { C } from '../../theme';
import { ts } from './shared';
import EmptyState from './EmptyState';
import type { MaterialEntry } from '../../types';

export default function MaterialsTab({ materials, projectId, onReload, refreshing, onRefresh }: {
  materials: MaterialEntry[]; projectId: string; onReload: ()=>void; refreshing?: boolean; onRefresh?: ()=>void;
}) {
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState('');
  const [qty, setQty] = useState('');
  const [delivery, setDelivery] = useState('');
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!name.trim()) return;
    setSaving(true);
    await supabase.from('materials').insert({ project_id:projectId, report_id:null, name:name.trim(), qty:qty.trim()||null, delivery:delivery.trim()||null });
    setSaving(false); setName(''); setQty(''); setDelivery(''); setAdding(false); onReload();
  };

  return (
    <FlatList
      data={materials}
      keyExtractor={m => m.id}
      contentContainerStyle={{ padding:16, gap:10, paddingBottom:120 }}
      refreshControl={<RefreshControl refreshing={refreshing ?? false} onRefresh={onRefresh} tintColor={C.primary}/>}
      ListHeaderComponent={(
        <>
          <TouchableOpacity style={[ts.recordBtn, adding && { backgroundColor:C.surface, borderWidth:1, borderColor:C.line }]} onPress={() => setAdding(v => !v)}>
            <Ionicons name={adding ? 'close' : 'add'} size={18} color={adding ? C.text : C.primaryInk}/>
            <Text style={{ color:adding ? C.text : C.primaryInk, fontSize:15, fontWeight:'800' }}>{adding ? 'Anuluj' : 'Dodaj materiał'}</Text>
          </TouchableOpacity>
          {adding && (
            <View style={[ts.listCard, { padding:14, gap:10, marginTop:10 }]}>
              <TextInput style={ts.input} placeholder="Nazwa (np. Beton C25/30)" placeholderTextColor={C.textDim} value={name} onChangeText={setName}/>
              <TextInput style={ts.input} placeholder="Ilość (np. 12 m3)" placeholderTextColor={C.textDim} value={qty} onChangeText={setQty}/>
              <TextInput style={ts.input} placeholder="Dostawa (opcjonalnie)" placeholderTextColor={C.textDim} value={delivery} onChangeText={setDelivery}/>
              <TouchableOpacity style={[ts.recordBtn, { marginTop:0 }]} onPress={save} disabled={saving || !name.trim()}>
                {saving ? <ActivityIndicator color={C.primaryInk} size="small"/> : <Text style={{ color:C.primaryInk, fontSize:15, fontWeight:'800' }}>Zapisz</Text>}
              </TouchableOpacity>
            </View>
          )}
          {materials.length > 0 && <Text style={[ts.sectionLabel, { marginTop:12 }]}>MATERIAŁY · {materials.length}</Text>}
        </>
      )}
      ListEmptyComponent={!adding ? <EmptyState icon="cube-outline" title="Brak materiałów" sub="Nagraj raport lub dodaj ręcznie"/> : null}
      renderItem={({ item: m }: { item: MaterialEntry }) => (
        <View style={ts.listCard}>
          <View style={ts.listCardInner}>
            <View style={[ts.iconBox, { backgroundColor:C.primary+'26' }]}><Ionicons name="cube-outline" size={20} color={C.primary}/></View>
            <View style={{ flex:1 }}>
              <Text style={ts.listCardTitle}>{m.name}</Text>
              <Text style={ts.listCardSub}>{m.delivery ? `Dostawa: ${m.delivery}` : 'Brak terminu'}</Text>
            </View>
            <View style={{ alignItems:'flex-end', gap:4 }}>
              {m.qty && <View style={ts.qtyBadge}><Text style={ts.qtyText}>{m.qty}</Text></View>}
              {m.report_id && <View style={ts.autoBadge}><Text style={ts.autoText}>AUTO</Text></View>}
            </View>
          </View>
        </View>
      )}
    />
  );
}
