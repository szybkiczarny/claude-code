import { useCallback, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, TextInput, RefreshControl, Alert, Modal } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import { C } from '../theme';
import type { Project } from '../types';

const PALETTE = ['#F6B93B','#5BC0EB','#22C08A','#FF7A45','#A78BFA','#FB7185'];
function pColor(id: string) { return PALETTE[[...id].reduce((a,c)=>a+c.charCodeAt(0),0)%PALETTE.length]; }
function pCode(name: string) { return name.trim().split(/\s+/).slice(0,2).map(w=>w[0]?.toUpperCase()??'').join('')+'-'+new Date().getFullYear(); }
function relTime(iso: string) { const h=Math.floor((Date.now()-new Date(iso).getTime())/3_600_000); return h<1?'przed chwilą':h<24?`${h}h temu`:`${Math.floor(h/24)}d temu`; }
function isToday(iso: string) { const d=new Date(iso),n=new Date(); return d.getDate()===n.getDate()&&d.getMonth()===n.getMonth()&&d.getFullYear()===n.getFullYear(); }
function thisWeek(iso: string) { return (Date.now()-new Date(iso).getTime()) < 7*24*3600*1000; }

interface Meta { openDefects: number; lastReport: string|null; reportCount: number; }

export default function ProjectsScreen({ navigation }: { navigation: any }) {
  const insets = useSafeAreaInsets();
  const [projects, setProjects] = useState<Project[]>([]);
  const [meta, setMeta] = useState<Record<string,Meta>>({});
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [userName, setUserName] = useState<string|null>(null);
  const [editProject, setEditProject] = useState<Project|null>(null);
  const [editName, setEditName] = useState('');
  const [editAddress, setEditAddress] = useState('');
  const [editClient, setEditClient] = useState('');
  const [saving, setSaving] = useState(false);

  const load = async (silent = false) => {
    if (!silent) setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }
    setUserName(user.user_metadata?.full_name ?? null);
    const { data: ps } = await supabase.from('projects').select('*').eq('manager_id', user.id).order('created_at',{ascending:false});
    if (!ps) { setLoading(false); return; }
    setProjects(ps);
    const ids = ps.map(p=>p.id);
    if (!ids.length) { setLoading(false); return; }
    const [{data:def},{data:rep}] = await Promise.all([
      supabase.from('defects').select('project_id,status').in('project_id',ids),
      supabase.from('reports').select('project_id,created_at').in('project_id',ids).order('created_at',{ascending:false}),
    ]);
    const m: Record<string,Meta> = {};
    for (const p of ps) m[p.id] = { openDefects:0, lastReport:null, reportCount:0 };
    for (const d of def??[]) { if(d.status!=='resolved') m[d.project_id].openDefects++; }
    for (const r of rep??[]) { m[r.project_id].reportCount++; if(!m[r.project_id].lastReport) m[r.project_id].lastReport=r.created_at; }
    setMeta(m);
    setLoading(false);
    setRefreshing(false);
  };

  useFocusEffect(useCallback(()=>{ load(); },[]));

  const onRefresh = () => { setRefreshing(true); load(true); };

  const deleteProject = (p: Project) => {
    Alert.alert('Usuń projekt', `Usunąć "${p.name}"?\n\nTo usunie też wszystkie raporty i usterki.`, [
      { text: 'Anuluj', style: 'cancel' },
      { text: 'Usuń', style: 'destructive', onPress: async () => {
        await supabase.from('projects').delete().eq('id', p.id);
        load(true);
      }},
    ]);
  };

  const openEdit = (p: Project) => {
    setEditProject(p);
    setEditName(p.name);
    setEditAddress(p.address ?? '');
    setEditClient(p.client_name ?? '');
  };

  const saveEdit = async () => {
    if (!editProject || !editName.trim()) return;
    setSaving(true);
    await supabase.from('projects').update({ name: editName.trim(), address: editAddress.trim()||null, client_name: editClient.trim()||null }).eq('id', editProject.id);
    setSaving(false);
    setEditProject(null);
    load(true);
  };

  const showOptions = (p: Project) => {
    Alert.alert(p.name, 'Co chcesz zrobić?', [
      { text: 'Edytuj', onPress: ()=>openEdit(p) },
      { text: 'Usuń', style: 'destructive', onPress: ()=>deleteProject(p) },
      { text: 'Anuluj', style: 'cancel' },
    ]);
  };

  const TODAY = new Date().toLocaleDateString('pl-PL',{weekday:'long',day:'numeric',month:'long'});
  const filtered = projects.filter(p=>p.name.toLowerCase().includes(query.toLowerCase())||(p.client_name??'').toLowerCase().includes(query.toLowerCase()));
  const totalOpen = Object.values(meta).reduce((a,m)=>a+m.openDefects,0);
  const reportsThisWeek = Object.values(meta).reduce((a,m)=>a+(m.lastReport&&thisWeek(m.lastReport)?1:0),0);
  const totalReports = Object.values(meta).reduce((a,m)=>a+m.reportCount,0);

  return (
    <View style={s.root}>
      <View style={[s.header,{paddingTop:insets.top+12}]}>
        <View style={{flex:1}}>
          <Text style={s.dateLabel}>{TODAY}</Text>
          <Text style={s.greeting}>{userName?`Cześć, ${userName.split(' ')[0]}`:'Projekty'}</Text>
        </View>
        <TouchableOpacity style={s.iconBtn} onPress={()=>navigation.navigate('Profile')}>
          <Ionicons name="person-outline" size={20} color={C.text} />
        </TouchableOpacity>
        <TouchableOpacity style={[s.iconBtn,{backgroundColor:C.primary}]} onPress={()=>navigation.navigate('AddProject')}>
          <Ionicons name="add" size={24} color={C.primaryInk} />
        </TouchableOpacity>
      </View>

      {!loading&&(
        <View style={s.stats}>
          {[
            {v:projects.length, l:'Projekty',  c:C.text},
            {v:totalOpen,       l:'Usterki',   c:totalOpen>0?C.danger:C.success},
            {v:totalReports,    l:'Raporty',   c:C.text},
            {v:reportsThisWeek, l:'Ten tydzień',c:C.primary},
          ].map(({v,l,c})=>(
            <View key={l} style={s.tile}>
              <Text style={[s.tileVal,{color:c}]}>{v}</Text>
              <Text style={s.tileLbl}>{l}</Text>
            </View>
          ))}
        </View>
      )}

      <View style={s.searchWrap}>
        <Ionicons name="search-outline" size={18} color={C.textMid} />
        <TextInput style={s.searchInput} placeholder="Szukaj projektu…" placeholderTextColor={C.textDim} value={query} onChangeText={setQuery} />
      </View>

      <Text style={s.sectionLabel}>PROJEKTY · {filtered.length}</Text>

      {loading
        ? <ActivityIndicator color={C.primary} style={{marginTop:48}} size="large"/>
        : <FlatList
            data={filtered}
            keyExtractor={p=>p.id}
            contentContainerStyle={{paddingHorizontal:16,paddingBottom:120,gap:12}}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.primary}/>}
            ListEmptyComponent={
              <View style={s.empty}>
                <Text style={{fontSize:48}}>🏗️</Text>
                <Text style={s.emptyTitle}>Brak projektów</Text>
                <Text style={s.emptySub}>Kliknij + żeby dodać pierwszy projekt</Text>
              </View>
            }
            renderItem={({item:p})=>{
              const color=pColor(p.id); const m=meta[p.id]??{openDefects:0,lastReport:null,reportCount:0};
              return (
                <TouchableOpacity style={s.card} onPress={()=>navigation.navigate('ProjectDetail',{projectId:p.id,projectName:p.name})} onLongPress={()=>showOptions(p)} activeOpacity={0.85}>
                  <View style={[s.cardAccent,{backgroundColor:color}]}/>
                  <View style={s.cardBody}>
                    <View style={s.cardRow}>
                      <View style={[s.codeBox,{backgroundColor:color+'33',borderColor:color+'66'}]}>
                        <Text style={[s.codeText,{color}]}>{pCode(p.name)}</Text>
                      </View>
                      <View style={{flex:1}}>
                        <Text style={s.cardName}>{p.name}</Text>
                        <Text style={s.cardSub} numberOfLines={1}>{[p.client_name,p.address].filter(Boolean).join(' · ')}</Text>
                      </View>
                      <TouchableOpacity onPress={()=>showOptions(p)} style={{padding:4}}>
                        <Ionicons name="ellipsis-vertical" size={18} color={C.textDim}/>
                      </TouchableOpacity>
                    </View>
                    <View style={s.chips}>
                      {m.openDefects>0&&<View style={[s.chip,{backgroundColor:C.danger+'26',borderColor:C.danger+'66'}]}><Ionicons name="alert-circle-outline" size={12} color={C.danger}/><Text style={[s.chipText,{color:C.danger}]}>{m.openDefects} usterek</Text></View>}
                      <View style={[s.chip,{backgroundColor:C.surfaceHi,borderColor:C.line}]}><Ionicons name="document-text-outline" size={12} color={C.textMid}/><Text style={[s.chipText,{color:C.textMid}]}>{m.reportCount} raportów</Text></View>
                      <View style={[s.chip,{backgroundColor:C.surfaceHi,borderColor:C.line}]}><Ionicons name="time-outline" size={12} color={C.textMid}/><Text style={[s.chipText,{color:C.textMid}]}>{m.lastReport?relTime(m.lastReport):'brak raportów'}</Text></View>
                    </View>
                  </View>
                </TouchableOpacity>
              );
            }}
          />
      }

      {/* Edit Modal */}
      <Modal visible={!!editProject} transparent animationType="slide" onRequestClose={()=>setEditProject(null)}>
        <TouchableOpacity style={s.overlay} activeOpacity={1} onPress={()=>setEditProject(null)}>
          <TouchableOpacity activeOpacity={1} style={s.sheet}>
            <View style={s.handle}/>
            <Text style={s.sheetTitle}>Edytuj projekt</Text>
            <TextInput style={s.input} placeholder="Nazwa projektu *" placeholderTextColor={C.textDim} value={editName} onChangeText={setEditName}/>
            <TextInput style={s.input} placeholder="Adres" placeholderTextColor={C.textDim} value={editAddress} onChangeText={setEditAddress}/>
            <TextInput style={s.input} placeholder="Klient / Inwestor" placeholderTextColor={C.textDim} value={editClient} onChangeText={setEditClient}/>
            <TouchableOpacity style={[s.saveBtn,{opacity:saving||!editName.trim()?0.5:1}]} onPress={saveEdit} disabled={saving||!editName.trim()}>
              {saving?<ActivityIndicator color={C.primaryInk}/>:<Text style={s.saveBtnText}>Zapisz zmiany</Text>}
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  root:{flex:1,backgroundColor:C.bg},
  header:{flexDirection:'row',alignItems:'center',gap:10,paddingHorizontal:16,paddingBottom:12},
  dateLabel:{fontSize:11,color:C.textMid,textTransform:'uppercase',letterSpacing:1.2,fontWeight:'700'},
  greeting:{fontSize:26,fontWeight:'800',color:C.text,letterSpacing:-0.5},
  iconBtn:{width:44,height:44,borderRadius:12,backgroundColor:C.surface,borderWidth:1,borderColor:C.line,alignItems:'center',justifyContent:'center'},
  stats:{flexDirection:'row',gap:6,paddingHorizontal:16,paddingBottom:14},
  tile:{flex:1,backgroundColor:C.surface,borderWidth:1,borderColor:C.line,borderRadius:14,padding:10},
  tileVal:{fontSize:24,fontWeight:'800',lineHeight:28},
  tileLbl:{fontSize:9,color:C.textMid,marginTop:3,textTransform:'uppercase',letterSpacing:0.6,fontWeight:'600'},
  searchWrap:{flexDirection:'row',alignItems:'center',gap:8,marginHorizontal:16,marginBottom:10,backgroundColor:C.surface,borderWidth:1,borderColor:C.line,borderRadius:14,paddingHorizontal:14,height:46},
  searchInput:{flex:1,color:C.text,fontSize:15},
  sectionLabel:{fontSize:11,color:C.textMid,letterSpacing:1.4,fontWeight:'700',paddingHorizontal:16,marginBottom:10},
  empty:{alignItems:'center',paddingTop:60,gap:10},
  emptyTitle:{fontSize:16,fontWeight:'700',color:C.text},
  emptySub:{fontSize:13,color:C.textDim},
  card:{backgroundColor:C.surface,borderWidth:1,borderColor:C.line,borderRadius:16,overflow:'hidden'},
  cardAccent:{height:4},
  cardBody:{padding:14},
  cardRow:{flexDirection:'row',alignItems:'center',gap:10,marginBottom:12},
  codeBox:{width:46,height:46,borderRadius:12,borderWidth:1,alignItems:'center',justifyContent:'center'},
  codeText:{fontSize:10,fontWeight:'800',letterSpacing:0.3},
  cardName:{fontSize:16,fontWeight:'700',color:C.text},
  cardSub:{fontSize:11,color:C.textMid,marginTop:2},
  chips:{flexDirection:'row',gap:6,flexWrap:'wrap'},
  chip:{flexDirection:'row',alignItems:'center',gap:4,paddingHorizontal:10,paddingVertical:5,borderRadius:999,borderWidth:1},
  chipText:{fontSize:11,fontWeight:'700'},
  overlay:{flex:1,backgroundColor:'rgba(0,0,0,0.6)',justifyContent:'flex-end'},
  sheet:{backgroundColor:C.surface,borderTopLeftRadius:24,borderTopRightRadius:24,padding:24,paddingBottom:40,gap:12},
  handle:{width:40,height:4,backgroundColor:C.line,borderRadius:2,alignSelf:'center',marginBottom:8},
  sheetTitle:{fontSize:18,fontWeight:'800',color:C.text,marginBottom:4},
  input:{backgroundColor:C.surfaceHi,borderWidth:1,borderColor:C.line,borderRadius:12,paddingHorizontal:14,paddingVertical:12,color:C.text,fontSize:14},
  saveBtn:{backgroundColor:C.primary,borderRadius:12,paddingVertical:14,alignItems:'center',marginTop:4},
  saveBtnText:{color:C.primaryInk,fontWeight:'800',fontSize:15},
});
