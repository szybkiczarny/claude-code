import { useState, useEffect, useRef } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Alert, Modal, TextInput, Image, LayoutChangeEvent, GestureResponderEvent } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import { supabase } from '../../lib/supabase';
import { C } from '../../theme';
import { ts, decode } from './shared';
import type { FloorPlan, Defect } from '../../types';

const SEV_COLORS: Record<string, string> = {
  low: C.success,
  medium: C.warning,
  high: '#FF8C00',
  critical: C.danger,
};

type PinData = { defect: Defect; x: number; y: number };

export default function FloorPlanTab({ projectId }: { projectId: string }) {
  const [plans, setPlans] = useState<FloorPlan[]>([]);
  const [defects, setDefects] = useState<Defect[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [viewPlan, setViewPlan] = useState<FloorPlan|null>(null);

  const load = async () => {
    const [{ data: ps }, { data: ds }] = await Promise.all([
      supabase.from('floor_plans').select('*').eq('project_id', projectId).order('created_at', { ascending:false }),
      supabase.from('defects').select('*').eq('project_id', projectId).not('pin_x', 'is', null),
    ]);
    setPlans(ps ?? []);
    setDefects(ds ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const uploadPlan = async () => {
    const result = await DocumentPicker.getDocumentAsync({ type:'image/*', copyToCacheDirectory:true });
    if (result.canceled) return;
    const file = result.assets[0];
    setUploading(true);
    try {
      const base64 = await FileSystem.readAsStringAsync(file.uri, { encoding:'base64' as any });
      const ext = file.name.split('.').pop() ?? 'jpg';
      const path = `${projectId}/plans/${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from('documents').upload(path, decode(base64), { contentType:file.mimeType ?? 'image/jpeg' });
      if (upErr) throw upErr;
      const { data: { publicUrl } } = supabase.storage.from('documents').getPublicUrl(path);
      const planName = file.name.replace(/\.[^.]+$/, '');
      await supabase.from('floor_plans').insert({ project_id:projectId, name:planName, image_url:publicUrl });
      await load();
    } catch (e: any) {
      Alert.alert('Błąd', e.message ?? 'Nie udało się wgrać rzutu');
    }
    setUploading(false);
  };

  const deletePlan = (plan: FloorPlan) => {
    Alert.alert('Usuń rzut', `Usunąć "${plan.name}"?`, [
      { text:'Anuluj', style:'cancel' },
      { text:'Usuń', style:'destructive', onPress: async () => {
        await supabase.from('floor_plans').delete().eq('id', plan.id);
        setPlans(p => p.filter(x => x.id !== plan.id));
      }},
    ]);
  };

  if (loading) return <ActivityIndicator color={C.primary} style={{ marginTop:40 }}/>;

  return (
    <View style={{ flex:1 }}>
      <ScrollView contentContainerStyle={{ padding:16, paddingBottom:100 }}>
        {plans.length === 0 && (
          <View style={{ alignItems:'center', paddingTop:48, gap:10 }}>
            <Ionicons name="map-outline" size={48} color={C.textDim}/>
            <Text style={{ fontSize:16, fontWeight:'700', color:C.text }}>Brak rzutów</Text>
            <Text style={{ fontSize:13, color:C.textDim, textAlign:'center' }}>Wgraj plan piętra żeby oznaczać usterki na mapie</Text>
          </View>
        )}
        {plans.map(plan => {
          const pinCount = defects.filter(d => d.floor_plan_id === plan.id).length;
          return (
            <TouchableOpacity key={plan.id} onPress={() => setViewPlan(plan)}
              style={{ backgroundColor:C.surface, borderRadius:14, marginBottom:10, borderWidth:1, borderColor:C.line, overflow:'hidden' }}>
              <Image source={{ uri:plan.image_url }} style={{ width:'100%', height:160 }} resizeMode="cover"/>
              <View style={{ flexDirection:'row', alignItems:'center', padding:12, gap:10 }}>
                <View style={{ flex:1 }}>
                  <Text style={{ fontSize:14, fontWeight:'700', color:C.text }}>{plan.name}</Text>
                  <Text style={{ fontSize:11, color:C.textMid, marginTop:2 }}>{pinCount} {pinCount === 1 ? 'usterka' : 'usterek'} na rzucie</Text>
                </View>
                <Ionicons name="location" size={16} color={pinCount > 0 ? C.danger : C.textDim}/>
                <TouchableOpacity onPress={() => deletePlan(plan)} style={{ padding:4 }}>
                  <Ionicons name="trash-outline" size={18} color={C.danger}/>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <TouchableOpacity
        style={{ position:'absolute', bottom:24, right:20, backgroundColor:C.primary, borderRadius:28, width:56, height:56, alignItems:'center', justifyContent:'center', elevation:4 }}
        onPress={uploadPlan}
        disabled={uploading}
      >
        {uploading ? <ActivityIndicator color={C.primaryInk}/> : <Ionicons name="add" size={28} color={C.primaryInk}/>}
      </TouchableOpacity>

      {viewPlan && (
        <FloorPlanViewer
          plan={viewPlan}
          defects={defects.filter(d => d.floor_plan_id === viewPlan.id)}
          projectId={projectId}
          onClose={() => setViewPlan(null)}
          onDefectAdded={load}
        />
      )}
    </View>
  );
}

function FloorPlanViewer({ plan, defects, projectId, onClose, onDefectAdded }: {
  plan: FloorPlan; defects: Defect[]; projectId: string; onClose: ()=>void; onDefectAdded: ()=>void;
}) {
  const [containerSize, setContainerSize] = useState({ width:1, height:1 });
  const [imageRatio, setImageRatio] = useState(1);
  const [newPin, setNewPin] = useState<{ x: number; y: number }|null>(null);
  const [description, setDescription] = useState('');
  const [severity, setSeverity] = useState<'low'|'medium'|'high'|'critical'>('medium');
  const [saving, setSaving] = useState(false);
  const [selectedDefect, setSelectedDefect] = useState<Defect|null>(null);

  useEffect(() => {
    Image.getSize(plan.image_url, (w, h) => setImageRatio(w / h), () => {});
  }, [plan.image_url]);

  const onLayout = (e: LayoutChangeEvent) => {
    const { width } = e.nativeEvent.layout;
    setContainerSize({ width, height: width / imageRatio });
  };

  const onImagePress = (e: GestureResponderEvent) => {
    if (newPin) { setNewPin(null); return; }
    const x = e.nativeEvent.locationX / containerSize.width;
    const y = e.nativeEvent.locationY / containerSize.height;
    setNewPin({ x, y });
    setDescription('');
    setSeverity('medium');
  };

  const saveDefect = async () => {
    if (!newPin || !description.trim()) return;
    setSaving(true);
    await supabase.from('defects').insert({
      project_id: projectId,
      report_id: null,
      description: description.trim(),
      severity,
      status: 'open',
      floor_plan_id: plan.id,
      pin_x: newPin.x,
      pin_y: newPin.y,
    });
    setSaving(false);
    setNewPin(null);
    setDescription('');
    onDefectAdded();
  };

  const pins: PinData[] = defects.map(d => ({
    defect: d,
    x: (d.pin_x ?? 0) * containerSize.width,
    y: (d.pin_y ?? 0) * containerSize.height,
  }));

  const newPinAbs = newPin ? { x: newPin.x * containerSize.width, y: newPin.y * containerSize.height } : null;

  return (
    <Modal visible animationType="slide" onRequestClose={onClose}>
      <View style={{ flex:1, backgroundColor:C.bg }}>
        {/* Header */}
        <View style={{ flexDirection:'row', alignItems:'center', padding:16, paddingTop:52, gap:12, borderBottomWidth:1, borderColor:C.line }}>
          <TouchableOpacity onPress={onClose} style={{ width:44, height:44, borderRadius:12, backgroundColor:C.surface, borderWidth:1, borderColor:C.line, alignItems:'center', justifyContent:'center' }}>
            <Ionicons name="close" size={22} color={C.text}/>
          </TouchableOpacity>
          <View style={{ flex:1 }}>
            <Text style={{ fontSize:18, fontWeight:'800', color:C.text }}>{plan.name}</Text>
            <Text style={{ fontSize:11, color:C.textMid }}>Tapnij rzut żeby dodać usterkę</Text>
          </View>
          <View style={{ backgroundColor:C.danger+'26', borderRadius:10, paddingHorizontal:10, paddingVertical:6 }}>
            <Text style={{ fontSize:13, fontWeight:'700', color:C.danger }}>{defects.length} usterek</Text>
          </View>
        </View>

        <ScrollView style={{ flex:1 }} contentContainerStyle={{ padding:16 }}>
          {/* Floor plan image with pins */}
          <View onLayout={onLayout} style={{ width:'100%', aspectRatio:imageRatio, borderRadius:12, overflow:'hidden', backgroundColor:C.surface }}>
            <TouchableOpacity activeOpacity={1} onPress={onImagePress} style={{ flex:1 }}>
              <Image source={{ uri:plan.image_url }} style={{ width:'100%', height:'100%' }} resizeMode="cover"/>
              {/* Existing pins */}
              {pins.map(p => (
                <TouchableOpacity
                  key={p.defect.id}
                  onPress={() => setSelectedDefect(p.defect)}
                  style={{ position:'absolute', left:p.x - 14, top:p.y - 14, width:28, height:28, borderRadius:14, backgroundColor:SEV_COLORS[p.defect.severity], borderWidth:2, borderColor:'#fff', alignItems:'center', justifyContent:'center', elevation:4 }}
                >
                  <Ionicons name={p.defect.status === 'resolved' ? 'checkmark' : 'alert'} size={14} color="#fff"/>
                </TouchableOpacity>
              ))}
              {/* New pin preview */}
              {newPinAbs && (
                <View style={{ position:'absolute', left:newPinAbs.x - 14, top:newPinAbs.y - 14, width:28, height:28, borderRadius:14, backgroundColor:SEV_COLORS[severity], borderWidth:2, borderColor:'#fff', opacity:0.8, alignItems:'center', justifyContent:'center' }}>
                  <Ionicons name="add" size={16} color="#fff"/>
                </View>
              )}
            </TouchableOpacity>
          </View>

          {/* Legenda */}
          <View style={{ flexDirection:'row', gap:12, marginTop:10, flexWrap:'wrap' }}>
            {[['low','Niski'],['medium','Średni'],['high','Wysoki'],['critical','Krytyczny']].map(([sev, label]) => (
              <View key={sev} style={{ flexDirection:'row', alignItems:'center', gap:4 }}>
                <View style={{ width:10, height:10, borderRadius:5, backgroundColor:SEV_COLORS[sev] }}/>
                <Text style={{ fontSize:11, color:C.textMid }}>{label}</Text>
              </View>
            ))}
          </View>

          {/* Inline nowa usterka form */}
          {newPin && (
            <View style={{ backgroundColor:C.surface, borderRadius:14, padding:16, marginTop:16, gap:12, borderWidth:1, borderColor:C.primary+'66' }}>
              <Text style={{ fontSize:14, fontWeight:'800', color:C.primary }}>Nowa usterka</Text>
              <TextInput
                style={ts.input}
                placeholder="Opis usterki..."
                placeholderTextColor={C.textDim}
                value={description}
                onChangeText={setDescription}
                autoFocus
                multiline
              />
              <View style={{ flexDirection:'row', gap:8 }}>
                {(['low','medium','high','critical'] as const).map(s => (
                  <TouchableOpacity key={s} onPress={() => setSeverity(s)}
                    style={{ flex:1, paddingVertical:8, borderRadius:10, borderWidth:2, alignItems:'center',
                      backgroundColor: severity===s ? SEV_COLORS[s]+'26' : 'transparent',
                      borderColor: severity===s ? SEV_COLORS[s] : C.line }}>
                    <Text style={{ fontSize:11, fontWeight:'700', color: severity===s ? SEV_COLORS[s] : C.textMid }}>
                      {s==='low'?'Niski':s==='medium'?'Średni':s==='high'?'Wysoki':'Krytyczny'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              <View style={{ flexDirection:'row', gap:10 }}>
                <TouchableOpacity onPress={() => setNewPin(null)} style={{ flex:1, padding:12, borderRadius:12, borderWidth:1, borderColor:C.line, alignItems:'center' }}>
                  <Text style={{ color:C.textMid, fontWeight:'700' }}>Anuluj</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={saveDefect} disabled={saving || !description.trim()}
                  style={{ flex:2, padding:12, borderRadius:12, backgroundColor: description.trim() ? C.primary : C.line, alignItems:'center' }}>
                  {saving ? <ActivityIndicator color={C.primaryInk} size="small"/> : <Text style={{ color: description.trim() ? C.primaryInk : C.textMid, fontWeight:'800' }}>Zapisz usterkę</Text>}
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Lista usterek na rzucie */}
          {defects.length > 0 && (
            <View style={{ marginTop:16, gap:8 }}>
              <Text style={ts.sectionLabel}>USTERKI NA RZUCIE · {defects.length}</Text>
              {defects.map(d => (
                <TouchableOpacity key={d.id} onPress={() => setSelectedDefect(d)}
                  style={{ backgroundColor:C.surface, borderRadius:12, padding:12, flexDirection:'row', gap:10, borderWidth:1, borderColor:C.line }}>
                  <View style={{ width:10, height:10, borderRadius:5, backgroundColor:SEV_COLORS[d.severity], marginTop:4 }}/>
                  <View style={{ flex:1 }}>
                    <Text style={{ fontSize:13, fontWeight:'700', color:C.text, textDecorationLine:d.status==='resolved'?'line-through':'none' }} numberOfLines={2}>{d.description}</Text>
                    <Text style={{ fontSize:11, color:C.textMid, marginTop:2 }}>{d.status==='open'?'Otwarta':d.status==='in_progress'?'W toku':'Naprawiona'}</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </ScrollView>

        {/* Defect detail sheet */}
        {selectedDefect && (
          <Modal visible transparent animationType="slide" onRequestClose={() => setSelectedDefect(null)}>
            <TouchableOpacity style={ts.modalOverlay} activeOpacity={1} onPress={() => setSelectedDefect(null)}>
              <TouchableOpacity activeOpacity={1} style={ts.sheet}>
                <View style={ts.sheetHandle}/>
                <View style={{ flexDirection:'row', alignItems:'center', gap:8, marginBottom:8 }}>
                  <View style={{ width:12, height:12, borderRadius:6, backgroundColor:SEV_COLORS[selectedDefect.severity] }}/>
                  <Text style={{ fontSize:11, color:C.textMid, textTransform:'uppercase', fontWeight:'700' }}>{selectedDefect.severity}</Text>
                  <View style={{ flex:1 }}/>
                  <TouchableOpacity onPress={async () => {
                    Alert.alert('Usuń usterkę', 'Usunąć tę usterkę z rzutu?', [
                      { text:'Anuluj', style:'cancel' },
                      { text:'Usuń', style:'destructive', onPress: async () => {
                        await supabase.from('defects').delete().eq('id', selectedDefect.id);
                        setSelectedDefect(null);
                        onDefectAdded();
                      }},
                    ]);
                  }}>
                    <Ionicons name="trash-outline" size={20} color={C.danger}/>
                  </TouchableOpacity>
                </View>
                <Text style={{ fontSize:16, fontWeight:'800', color:C.text, marginBottom:10 }}>{selectedDefect.description}</Text>
                {selectedDefect.location_desc && <Text style={{ fontSize:13, color:C.textMid, marginBottom:6 }}>📍 {selectedDefect.location_desc}</Text>}
                {selectedDefect.subcontractor && <Text style={{ fontSize:13, color:C.textMid, marginBottom:6 }}>🏗️ {selectedDefect.subcontractor}</Text>}
                {selectedDefect.deadline && <Text style={{ fontSize:13, color:C.warning, fontWeight:'700', marginBottom:6 }}>📅 {selectedDefect.deadline}</Text>}
                <TouchableOpacity
                  style={{ marginTop:8, backgroundColor:C.surface, borderRadius:12, padding:12, alignItems:'center', borderWidth:1, borderColor:C.line }}
                  onPress={() => setSelectedDefect(null)}
                >
                  <Text style={{ color:C.text, fontWeight:'700' }}>Zamknij</Text>
                </TouchableOpacity>
              </TouchableOpacity>
            </TouchableOpacity>
          </Modal>
        )}
      </View>
    </Modal>
  );
}
