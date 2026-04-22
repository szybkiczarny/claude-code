import { useCallback, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, TextInput, FlatList, Image, Alert, Linking, Modal, Share, RefreshControl } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import { C } from '../theme';
import type { Project, Defect, Report, CrewEntry, MaterialEntry, Task, ProgressEntry } from '../types';

type TabId = 'diary'|'todo'|'defects'|'tasks'|'progress'|'crew'|'materials';
function sLabel(s: string) { return s==='open'?'Otwarta':s==='in_progress'?'W toku':'Naprawiona'; }
function sColor(s: string) { return s==='open'?C.danger:s==='in_progress'?C.warning:C.success; }

export default function ProjectDetailScreen({ navigation, route }: { navigation: any; route: any }) {
  const insets = useSafeAreaInsets();
  const { projectId, projectName } = route.params;
  const [project, setProject] = useState<Project|null>(null);
  const [defects, setDefects] = useState<Defect[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [crew, setCrew] = useState<CrewEntry[]>([]);
  const [materials, setMaterials] = useState<MaterialEntry[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [progressLog, setProgressLog] = useState<ProgressEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [tab, setTab] = useState<TabId>('diary');

  const load = async () => {
    const [{ data:p },{ data:d },{ data:r },{ data:c },{ data:m },{ data:tk },{ data:pl }] = await Promise.all([
      supabase.from('projects').select('*').eq('id',projectId).single(),
      supabase.from('defects').select('*').eq('project_id',projectId).order('created_at',{ascending:false}),
      supabase.from('reports').select('*').eq('project_id',projectId).order('created_at',{ascending:false}).limit(20),
      supabase.from('crew').select('*').eq('project_id',projectId).order('created_at',{ascending:false}),
      supabase.from('materials').select('*').eq('project_id',projectId).order('created_at',{ascending:false}),
      supabase.from('tasks').select('*').eq('project_id',projectId).order('created_at',{ascending:false}),
      supabase.from('progress_log').select('*').eq('project_id',projectId).order('created_at',{ascending:false}),
    ]);
    if(p) setProject(p); if(d) setDefects(d); if(r) setReports(r); if(c) setCrew(c); if(m) setMaterials(m); if(tk) setTasks(tk); if(pl) setProgressLog(pl);
    setLoading(false);
    setRefreshing(false);
  };

  useFocusEffect(useCallback(()=>{ load(); },[]));

  const onRefresh = () => { setRefreshing(true); load(); };

  if (loading) return <View style={[s.root,{justifyContent:'center'}]}><ActivityIndicator color={C.primary} size="large"/></View>;

  const openItems = defects.filter(d=>d.status==='open'||d.status==='in_progress');
  const resolved = defects.filter(d=>d.status==='resolved').length;
  const progress = defects.length>0 ? resolved/defects.length : 0;

  const openTasks = tasks.filter(t=>t.status==='todo');
  const latestProgress = progressLog[0] ?? null;
  const TABS: {id:TabId;label:string;count?:number}[] = [
    {id:'diary',label:'Dziennik'},
    {id:'todo',label:'Do zrobienia',count:openItems.length},
    {id:'defects',label:'Usterki',count:defects.length},
    {id:'tasks',label:'Zadania',count:openTasks.length||undefined},
    {id:'progress',label:'Postęp'},
    {id:'crew',label:'Ekipa',count:crew.reduce((a,c)=>a+c.count,0)},
    {id:'materials',label:'Materiały',count:materials.length},
  ];

  return (
    <View style={s.root}>
      <View style={[s.header,{paddingTop:insets.top+12}]}>
        <TouchableOpacity style={s.backBtn} onPress={()=>navigation.goBack()}><Ionicons name="chevron-back" size={22} color={C.text}/></TouchableOpacity>
        <View style={{flex:1}}>
          <Text style={s.headerSub}>{project?.client_name??'Projekt'}</Text>
          <Text style={s.headerTitle} numberOfLines={1}>{projectName}</Text>
        </View>
        <TouchableOpacity style={[s.backBtn,{backgroundColor:C.surfaceHi}]} onPress={()=>navigation.navigate('Contractors',{projectId,projectName})}>
          <Ionicons name="business-outline" size={20} color={C.textMid}/>
        </TouchableOpacity>
      </View>

      {/* Stats card */}
      <View style={s.statsCard}>
        <View style={{flexDirection:'row',justifyContent:'space-between',marginBottom:6}}>
          <Text style={s.statsLabel}>Postęp napraw</Text>
          <Text style={{color:C.text,fontSize:13,fontWeight:'700'}}>{Math.round(progress*100)}%</Text>
        </View>
        <View style={s.progressBg}><View style={[s.progressFill,{width:`${Math.round(progress*100)}%`}]}/></View>
        <View style={s.statsRow}>
          {[{v:openItems.length,l:'Do zrobienia',c:C.danger},{v:reports.length,l:'Raporty',c:C.text},{v:defects.length,l:'Usterki',c:C.text},{v:resolved,l:'Naprawione',c:C.success}].map(({v,l,c})=>(
            <View key={l} style={{alignItems:'center'}}>
              <Text style={{fontSize:22,fontWeight:'800',color:c}}>{v}</Text>
              <Text style={{fontSize:10,color:C.textMid,textTransform:'uppercase',letterSpacing:0.6,fontWeight:'600',marginTop:2}}>{l}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Tabs */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.tabsScroll} contentContainerStyle={s.tabsRow}>
        {TABS.map(t=>(
          <TouchableOpacity key={t.id} style={[s.tab,tab===t.id&&s.tabActive]} onPress={()=>setTab(t.id)}>
            <Text style={[s.tabText,tab===t.id&&s.tabTextActive]}>{t.label}</Text>
            {t.count!=null&&t.count>0&&<View style={[s.tabBadge,{backgroundColor:tab===t.id?C.danger:C.line}]}><Text style={{fontSize:10,fontWeight:'700',color:tab===t.id?'#fff':C.textMid}}>{t.count}</Text></View>}
          </TouchableOpacity>
        ))}
      </ScrollView>

      <View style={{flex:1}}>
        {tab==='diary'&&<DiaryTab reports={reports} navigation={navigation} projectId={projectId} projectName={projectName} refreshing={refreshing} onRefresh={onRefresh}/>}
        {tab==='todo'&&<DefectListTab defects={openItems} navigation={navigation} onReload={load} refreshing={refreshing} onRefresh={onRefresh}/>}
        {tab==='defects'&&<DefectListTab defects={defects} navigation={navigation} showFilter onReload={load} refreshing={refreshing} onRefresh={onRefresh}/>}
        {tab==='tasks'&&<TasksTab tasks={tasks} onReload={load} refreshing={refreshing} onRefresh={onRefresh}/>}
        {tab==='progress'&&<ProgressTab log={progressLog} refreshing={refreshing} onRefresh={onRefresh}/>}
        {tab==='crew'&&<CrewTab crew={crew} projectId={projectId} onReload={load} refreshing={refreshing} onRefresh={onRefresh}/>}
        {tab==='materials'&&<MaterialsTab materials={materials} projectId={projectId} onReload={load} refreshing={refreshing} onRefresh={onRefresh}/>}
      </View>
    </View>
  );
}

function DiaryTab({ reports, navigation, projectId, projectName, refreshing, onRefresh }: any) {
  return (
    <FlatList
      data={reports}
      keyExtractor={(r:Report)=>r.id}
      contentContainerStyle={{padding:16,gap:10,paddingBottom:120}}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.primary}/>}
      ListHeaderComponent={(
        <TouchableOpacity style={s.recordBtn} onPress={()=>navigation.navigate('Record',{screen:'Recording',params:{projectId,projectName}})}>
          <Ionicons name="mic" size={18} color={C.primaryInk}/>
          <Text style={{color:C.primaryInk,fontSize:15,fontWeight:'800'}}>Nagraj raport głosowy</Text>
        </TouchableOpacity>
      )}
      ListEmptyComponent={<EmptyState icon="mic-outline" title="Brak raportów" sub="Nagraj pierwszy raport powyżej"/>}
      renderItem={({item:r}:{item:Report})=>(
        <TouchableOpacity style={s.listCard} onPress={()=>navigation.navigate('ReportDetail',{reportId:r.id})} activeOpacity={0.85}>
          <View style={s.listCardInner}>
            <View style={[s.iconBox,{backgroundColor:C.primary+'26'}]}><Ionicons name="mic" size={20} color={C.primary}/></View>
            <View style={{flex:1}}>
              <Text style={s.listCardTitle}>{new Date(r.created_at).toLocaleDateString('pl-PL',{weekday:'short',day:'numeric',month:'long'})}</Text>
              {r.ai_summary&&<Text style={s.listCardSub} numberOfLines={1}>{r.ai_summary}</Text>}
            </View>
            <Ionicons name="chevron-forward" size={16} color={C.textDim}/>
          </View>
        </TouchableOpacity>
      )}
    />
  );
}

const NEXT_STATUS: Record<string,string> = { open:'in_progress', in_progress:'resolved', resolved:'open' };
const NEXT_LABEL: Record<string,string> = { open:'Rozpocznij', in_progress:'Naprawione', resolved:'Otwórz ponownie' };

function DefectListTab({ defects, navigation, showFilter, onReload, refreshing, onRefresh }: { defects: Defect[]; navigation: any; showFilter?: boolean; onReload?: ()=>void; refreshing?: boolean; onRefresh?: ()=>void }) {
  const [filter, setFilter] = useState('all');
  const [updating, setUpdating] = useState<string|null>(null);
  const visible = filter==='all' ? defects : defects.filter(d=>d.status===filter);

  const changeStatus = async (d: Defect) => {
    setUpdating(d.id);
    await supabase.from('defects').update({ status: NEXT_STATUS[d.status] }).eq('id', d.id);
    setUpdating(null);
    onReload?.();
  };

  const deleteDefect = (d: Defect) => {
    Alert.alert('Usuń usterkę', `Usunąć "${d.description.slice(0,60)}"?`, [
      { text: 'Anuluj', style: 'cancel' },
      { text: 'Usuń', style: 'destructive', onPress: async () => {
        await supabase.from('defects').delete().eq('id', d.id);
        onReload?.();
      }},
    ]);
  };

  return (
    <FlatList
      data={visible}
      keyExtractor={d=>d.id}
      contentContainerStyle={{padding:16,gap:10,paddingBottom:120}}
      refreshControl={<RefreshControl refreshing={refreshing??false} onRefresh={onRefresh} tintColor={C.primary}/>}
      ListHeaderComponent={showFilter&&defects.length>0?(
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{marginBottom:12}}>
          <View style={{flexDirection:'row',gap:8}}>
            {[{id:'all',l:'Wszystkie'},{id:'open',l:'Otwarte'},{id:'in_progress',l:'W toku'},{id:'resolved',l:'Naprawione'}].map(f=>(
              <TouchableOpacity key={f.id} style={[s.filterChip,filter===f.id&&s.filterChipActive]} onPress={()=>setFilter(f.id)}>
                <Text style={[s.filterText,filter===f.id&&s.filterTextActive]}>{f.l}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      ):null}
      ListEmptyComponent={<EmptyState icon="checkmark-circle-outline" title={showFilter?"Brak usterek":"Nic do zrobienia"} sub="Usterki z raportów głosowych pojawią się tutaj"/>}
      renderItem={({item:d}:{item:Defect})=>(
        <View style={[s.listCard,{opacity:d.status==='resolved'?0.6:1}]}>
          <View style={{padding:14,gap:8}}>
            <View style={{flexDirection:'row',alignItems:'center',gap:8,flexWrap:'wrap'}}>
              <View style={[s.statusBadge,{backgroundColor:sColor(d.status)+'26',borderColor:sColor(d.status)+'66'}]}>
                <Text style={[s.statusText,{color:sColor(d.status)}]}>{sLabel(d.status)}</Text>
              </View>
              <Text style={{color:C.textMid,fontSize:11,fontWeight:'600',textTransform:'uppercase'}}>{d.severity}</Text>
              <View style={{flex:1}}/>
              <TouchableOpacity
                style={[s.statusBtn,{backgroundColor:sColor(NEXT_STATUS[d.status])+'22',borderColor:sColor(NEXT_STATUS[d.status])+'66'}]}
                onPress={()=>changeStatus(d)}
                disabled={updating===d.id}
              >
                {updating===d.id
                  ? <ActivityIndicator size={10} color={C.textMid}/>
                  : <Text style={[s.statusBtnText,{color:sColor(NEXT_STATUS[d.status])}]}>{NEXT_LABEL[d.status]}</Text>
                }
              </TouchableOpacity>
            </View>
            <Text style={{fontSize:14,fontWeight:'700',color:C.text,textDecorationLine:d.status==='resolved'?'line-through':'none'}}>{d.description}</Text>
            {d.location_desc&&<View style={{flexDirection:'row',alignItems:'center',gap:4}}><Ionicons name="location-outline" size={12} color={C.textMid}/><Text style={{fontSize:11,color:C.textMid}}>{d.location_desc}</Text></View>}
            {d.subcontractor&&<View style={{flexDirection:'row',alignItems:'center',gap:4}}><Ionicons name="business-outline" size={12} color={C.textMid}/><Text style={{fontSize:11,color:C.textMid}}>{d.subcontractor}</Text></View>}
            <TouchableOpacity style={[s.statusBtn,{backgroundColor:C.danger+'22',borderColor:C.danger+'44',minWidth:0,paddingHorizontal:8,alignSelf:'flex-start'}]} onPress={()=>deleteDefect(d)}>
              <Ionicons name="trash-outline" size={14} color={C.danger}/>
            </TouchableOpacity>
          </View>
        </View>
      )}
    />
  );
}

function ProgressTab({ log, refreshing, onRefresh }: { log: ProgressEntry[]; refreshing?: boolean; onRefresh?: ()=>void }) {
  const latest = log[0] ?? null;
  return (
    <ScrollView contentContainerStyle={{padding:16,gap:12,paddingBottom:120}} refreshControl={<RefreshControl refreshing={refreshing??false} onRefresh={onRefresh} tintColor={C.primary}/>}>
      {latest && (
        <View style={s.statsCard}>
          <Text style={s.statsLabel}>AKTUALNY POSTĘP</Text>
          <Text style={{fontSize:48,fontWeight:'800',color:C.primary,marginVertical:8}}>{latest.percent}%</Text>
          {latest.stage&&<View style={[s.statusBadge,{backgroundColor:C.primary+'26',borderColor:C.primary+'66',alignSelf:'flex-start'}]}><Text style={[s.statusText,{color:C.primary}]}>{latest.stage}</Text></View>}
          {latest.note&&<Text style={{color:C.textMid,fontSize:13,marginTop:10,lineHeight:20}}>{latest.note}</Text>}
          <View style={s.progressBg}><View style={[s.progressFill,{width:`${latest.percent}%`}]}/></View>
        </View>
      )}
      {log.length===0&&<EmptyState icon="bar-chart-outline" title="Brak danych o postępie" sub="Nagraj raport i wspomnij o % zaawansowania prac"/>}
      {log.length>1&&<Text style={[s.sectionLabel,{marginTop:4}]}>HISTORIA · {log.length} wpisów</Text>}
      {log.slice(1).map(e=>(
        <View key={e.id} style={s.listCard}>
          <View style={s.listCardInner}>
            <View style={[s.iconBox,{backgroundColor:C.primary+'26'}]}>
              <Text style={{fontSize:14,fontWeight:'800',color:C.primary}}>{e.percent}%</Text>
            </View>
            <View style={{flex:1}}>
              <Text style={s.listCardTitle}>{new Date(e.created_at).toLocaleDateString('pl-PL',{day:'numeric',month:'long'})}</Text>
              {e.stage&&<Text style={s.listCardSub}>{e.stage}</Text>}
              {e.note&&<Text style={{fontSize:11,color:C.textDim,marginTop:2}} numberOfLines={1}>{e.note}</Text>}
            </View>
          </View>
        </View>
      ))}
    </ScrollView>
  );
}

function TasksTab({ tasks, onReload, refreshing, onRefresh }: { tasks: Task[]; onReload: ()=>void; refreshing?: boolean; onRefresh?: ()=>void }) {
  const [delegate, setDelegate] = useState<Task|null>(null);
  const [updating, setUpdating] = useState<string|null>(null);

  const toggleDone = async (t: Task) => {
    setUpdating(t.id);
    await supabase.from('tasks').update({ status: t.status==='todo'?'done':'todo' }).eq('id', t.id);
    setUpdating(null);
    onReload();
  };

  const deleteTask = (t: Task) => {
    Alert.alert('Usuń zadanie', `Usunąć "${t.description.slice(0,60)}"?`, [
      { text: 'Anuluj', style: 'cancel' },
      { text: 'Usuń', style: 'destructive', onPress: async () => {
        await supabase.from('tasks').delete().eq('id', t.id);
        onReload();
      }},
    ]);
  };

  return (
    <>
      <FlatList
        data={tasks}
        keyExtractor={t=>t.id}
        contentContainerStyle={{padding:16,gap:10,paddingBottom:120}}
        refreshControl={<RefreshControl refreshing={refreshing??false} onRefresh={onRefresh} tintColor={C.primary}/>}
        ListEmptyComponent={<EmptyState icon="checkmark-done-outline" title="Brak zadań" sub="Zadania z raportów głosowych pojawią się tutaj"/>}
        renderItem={({item:t})=>(
          <View style={[s.listCard,{opacity:t.status==='done'?0.5:1}]}>
            <View style={{padding:14,gap:8}}>
              <View style={{flexDirection:'row',alignItems:'center',gap:8}}>
                <TouchableOpacity
                  style={[s.checkBox, t.status==='done'&&{backgroundColor:C.success,borderColor:C.success}]}
                  onPress={()=>toggleDone(t)}
                  disabled={updating===t.id}
                >
                  {updating===t.id
                    ? <ActivityIndicator size={12} color="#fff"/>
                    : t.status==='done' && <Ionicons name="checkmark" size={14} color="#fff"/>
                  }
                </TouchableOpacity>
                <Text style={{flex:1,fontSize:14,fontWeight:'700',color:C.text,textDecorationLine:t.status==='done'?'line-through':'none'}} numberOfLines={2}>{t.description}</Text>
                <TouchableOpacity style={s.delegateBtn} onPress={()=>setDelegate(t)}>
                  <Ionicons name="send-outline" size={14} color={C.primaryInk}/>
                </TouchableOpacity>
                <TouchableOpacity style={[s.delegateBtn,{backgroundColor:C.danger+'22'}]} onPress={()=>deleteTask(t)}>
                  <Ionicons name="trash-outline" size={14} color={C.danger}/>
                </TouchableOpacity>
              </View>
              {(t.location||t.deadline)&&(
                <View style={{flexDirection:'row',gap:12,paddingLeft:32}}>
                  {t.location&&<View style={{flexDirection:'row',alignItems:'center',gap:4}}><Ionicons name="location-outline" size={12} color={C.textMid}/><Text style={{fontSize:11,color:C.textMid}}>{t.location}</Text></View>}
                  {t.deadline&&<View style={{flexDirection:'row',alignItems:'center',gap:4}}><Ionicons name="calendar-outline" size={12} color={C.warning}/><Text style={{fontSize:11,color:C.warning,fontWeight:'700'}}>{t.deadline}</Text></View>}
                </View>
              )}
            </View>
          </View>
        )}
      />
      <TaskDelegateModal task={delegate} onClose={()=>setDelegate(null)}/>
    </>
  );
}

function TaskDelegateModal({ task, onClose }: { task: Task|null; onClose: ()=>void }) {
  if (!task) return null;
  const msg = `Zadanie: ${task.description}${task.location?`\nLokalizacja: ${task.location}`:''}${task.deadline?`\nTermin: ${task.deadline}`:''}`;
  const encoded = encodeURIComponent(msg);
  const actions = [
    { label:'WhatsApp', icon:'logo-whatsapp' as const, color:'#25D366', onPress:()=>{ Linking.openURL(`whatsapp://send?text=${encoded}`); onClose(); } },
    { label:'SMS',      icon:'chatbubble-outline' as const, color:C.info,    onPress:()=>{ Linking.openURL(`sms:?body=${encoded}`); onClose(); } },
    { label:'E-mail',   icon:'mail-outline' as const,       color:C.primary, onPress:()=>{ Linking.openURL(`mailto:?subject=Zadanie&body=${encoded}`); onClose(); } },
    { label:'Udostępnij', icon:'share-outline' as const,    color:'#A78BFA', onPress:()=>{ Share.share({message:msg}); onClose(); } },
  ];
  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={s.modalOverlay} activeOpacity={1} onPress={onClose}>
        <TouchableOpacity activeOpacity={1} style={s.sheet}>
          <View style={s.sheetHandle}/>
          <Text style={s.sheetSub}>WYŚLIJ ZADANIE</Text>
          <Text style={s.sheetTitle} numberOfLines={2}>{task.description}</Text>
          {(task.location||task.deadline)&&(
            <View style={{flexDirection:'row',gap:12,marginBottom:14}}>
              {task.location&&<View style={{flexDirection:'row',alignItems:'center',gap:4}}><Ionicons name="location-outline" size={13} color={C.textMid}/><Text style={{fontSize:12,color:C.textMid}}>{task.location}</Text></View>}
              {task.deadline&&<View style={{flexDirection:'row',alignItems:'center',gap:4}}><Ionicons name="calendar-outline" size={13} color={C.warning}/><Text style={{fontSize:12,color:C.warning,fontWeight:'700'}}>{task.deadline}</Text></View>}
            </View>
          )}
          <View style={s.sheetActions}>
            {actions.map(a=>(
              <TouchableOpacity key={a.label} style={s.sheetAction} onPress={a.onPress}>
                <View style={[s.sheetIconBox,{backgroundColor:a.color+'26'}]}>
                  <Ionicons name={a.icon} size={22} color={a.color}/>
                </View>
                <Text style={s.sheetActionLabel}>{a.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

function CrewTab({ crew, projectId, onReload, refreshing, onRefresh }: { crew: CrewEntry[]; projectId: string; onReload: ()=>void; refreshing?: boolean; onRefresh?: ()=>void }) {
  const [adding, setAdding] = useState(false);
  const [role, setRole] = useState(''); const [company, setCompany] = useState(''); const [count, setCount] = useState('1');
  const [saving, setSaving] = useState(false);
  const save = async () => {
    if (!role.trim()) return; setSaving(true);
    await supabase.from('crew').insert({ project_id:projectId, report_id:null, role:role.trim(), company:company.trim()||null, count:parseInt(count)||1, recorded_at:new Date().toISOString().split('T')[0] });
    setSaving(false); setRole(''); setCompany(''); setCount('1'); setAdding(false); onReload();
  };
  const total = crew.reduce((a,c)=>a+c.count,0);
  return (
    <FlatList
      data={crew}
      keyExtractor={c=>c.id}
      contentContainerStyle={{padding:16,gap:10,paddingBottom:120}}
      refreshControl={<RefreshControl refreshing={refreshing??false} onRefresh={onRefresh} tintColor={C.primary}/>}
      ListHeaderComponent={(
        <>
          <TouchableOpacity style={[s.recordBtn,adding&&{backgroundColor:C.surface,borderWidth:1,borderColor:C.line}]} onPress={()=>setAdding(v=>!v)}>
            <Ionicons name={adding?"close":"add"} size={18} color={adding?C.text:C.primaryInk}/>
            <Text style={{color:adding?C.text:C.primaryInk,fontSize:15,fontWeight:'800'}}>{adding?'Anuluj':'Dodaj osobę / ekipę'}</Text>
          </TouchableOpacity>
          {adding&&(
            <View style={[s.listCard,{padding:14,gap:10,marginTop:10}]}>
              <TextInput style={s.input} placeholder="Rola (np. Murarz, Elektryk)" placeholderTextColor={C.textDim} value={role} onChangeText={setRole}/>
              <TextInput style={s.input} placeholder="Firma / podwykonawca" placeholderTextColor={C.textDim} value={company} onChangeText={setCompany}/>
              <TextInput style={s.input} placeholder="Liczba osób" keyboardType="number-pad" placeholderTextColor={C.textDim} value={count} onChangeText={setCount}/>
              <TouchableOpacity style={[s.recordBtn,{marginTop:0}]} onPress={save} disabled={saving||!role.trim()}>
                {saving?<ActivityIndicator color={C.primaryInk} size="small"/>:<Text style={{color:C.primaryInk,fontSize:15,fontWeight:'800'}}>Zapisz</Text>}
              </TouchableOpacity>
            </View>
          )}
          {crew.length>0&&<Text style={[s.sectionLabel,{marginTop:12}]}>EKIPA · {total} OSÓB</Text>}
        </>
      )}
      ListEmptyComponent={!adding?<EmptyState icon="people-outline" title="Brak ekipy" sub="Nagraj raport lub dodaj ręcznie"/>:null}
      renderItem={({item:c}:{item:CrewEntry})=>(
        <View style={s.listCard}>
          <View style={s.listCardInner}>
            <View style={[s.iconBox,{backgroundColor:C.primary+'26'}]}><Text style={{fontSize:18,fontWeight:'800',color:C.primary}}>{c.count}</Text></View>
            <View style={{flex:1}}>
              <Text style={s.listCardTitle}>{c.role}</Text>
              <Text style={s.listCardSub}>{c.company??'Brak firmy'}</Text>
            </View>
            {c.report_id&&<View style={s.autoBadge}><Text style={s.autoText}>AUTO</Text></View>}
          </View>
        </View>
      )}
    />
  );
}

function MaterialsTab({ materials, projectId, onReload, refreshing, onRefresh }: { materials: MaterialEntry[]; projectId: string; onReload: ()=>void; refreshing?: boolean; onRefresh?: ()=>void }) {
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState(''); const [qty, setQty] = useState(''); const [delivery, setDelivery] = useState('');
  const [saving, setSaving] = useState(false);
  const save = async () => {
    if (!name.trim()) return; setSaving(true);
    await supabase.from('materials').insert({ project_id:projectId, report_id:null, name:name.trim(), qty:qty.trim()||null, delivery:delivery.trim()||null });
    setSaving(false); setName(''); setQty(''); setDelivery(''); setAdding(false); onReload();
  };
  return (
    <FlatList
      data={materials}
      keyExtractor={m=>m.id}
      contentContainerStyle={{padding:16,gap:10,paddingBottom:120}}
      refreshControl={<RefreshControl refreshing={refreshing??false} onRefresh={onRefresh} tintColor={C.primary}/>}
      ListHeaderComponent={(
        <>
          <TouchableOpacity style={[s.recordBtn,adding&&{backgroundColor:C.surface,borderWidth:1,borderColor:C.line}]} onPress={()=>setAdding(v=>!v)}>
            <Ionicons name={adding?"close":"add"} size={18} color={adding?C.text:C.primaryInk}/>
            <Text style={{color:adding?C.text:C.primaryInk,fontSize:15,fontWeight:'800'}}>{adding?'Anuluj':'Dodaj materiał'}</Text>
          </TouchableOpacity>
          {adding&&(
            <View style={[s.listCard,{padding:14,gap:10,marginTop:10}]}>
              <TextInput style={s.input} placeholder="Nazwa (np. Beton C25/30)" placeholderTextColor={C.textDim} value={name} onChangeText={setName}/>
              <TextInput style={s.input} placeholder="Ilość (np. 12 m3)" placeholderTextColor={C.textDim} value={qty} onChangeText={setQty}/>
              <TextInput style={s.input} placeholder="Dostawa (opcjonalnie)" placeholderTextColor={C.textDim} value={delivery} onChangeText={setDelivery}/>
              <TouchableOpacity style={[s.recordBtn,{marginTop:0}]} onPress={save} disabled={saving||!name.trim()}>
                {saving?<ActivityIndicator color={C.primaryInk} size="small"/>:<Text style={{color:C.primaryInk,fontSize:15,fontWeight:'800'}}>Zapisz</Text>}
              </TouchableOpacity>
            </View>
          )}
          {materials.length>0&&<Text style={[s.sectionLabel,{marginTop:12}]}>MATERIAŁY · {materials.length}</Text>}
        </>
      )}
      ListEmptyComponent={!adding?<EmptyState icon="cube-outline" title="Brak materiałów" sub="Nagraj raport lub dodaj ręcznie"/>:null}
      renderItem={({item:m}:{item:MaterialEntry})=>(
        <View style={s.listCard}>
          <View style={s.listCardInner}>
            <View style={[s.iconBox,{backgroundColor:C.primary+'26'}]}><Ionicons name="cube-outline" size={20} color={C.primary}/></View>
            <View style={{flex:1}}>
              <Text style={s.listCardTitle}>{m.name}</Text>
              <Text style={s.listCardSub}>{m.delivery?`Dostawa: ${m.delivery}`:'Brak terminu'}</Text>
            </View>
            <View style={{alignItems:'flex-end',gap:4}}>
              {m.qty&&<View style={s.qtyBadge}><Text style={s.qtyText}>{m.qty}</Text></View>}
              {m.report_id&&<View style={s.autoBadge}><Text style={s.autoText}>AUTO</Text></View>}
            </View>
          </View>
        </View>
      )}
    />
  );
}

function EmptyState({ icon, title, sub }: { icon: string; title: string; sub: string }) {
  return (
    <View style={{alignItems:'center',paddingTop:48,gap:10}}>
      <Ionicons name={icon as any} size={48} color={C.textDim}/>
      <Text style={{fontSize:16,fontWeight:'700',color:C.text}}>{title}</Text>
      <Text style={{fontSize:13,color:C.textDim,textAlign:'center'}}>{sub}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  root:{flex:1,backgroundColor:C.bg},
  header:{flexDirection:'row',alignItems:'center',gap:12,paddingHorizontal:16,paddingBottom:10},
  backBtn:{width:44,height:44,borderRadius:12,backgroundColor:C.surface,borderWidth:1,borderColor:C.line,alignItems:'center',justifyContent:'center'},
  headerSub:{fontSize:11,color:C.textMid,textTransform:'uppercase',letterSpacing:1.2,fontWeight:'700'},
  headerTitle:{fontSize:20,fontWeight:'800',color:C.text,letterSpacing:-0.4},
  statsCard:{marginHorizontal:16,marginBottom:10,backgroundColor:C.surface,borderWidth:1,borderColor:C.line,borderRadius:16,padding:16},
  statsLabel:{fontSize:11,color:C.textMid,textTransform:'uppercase',letterSpacing:1,fontWeight:'600'},
  progressBg:{height:8,backgroundColor:C.line,borderRadius:4,overflow:'hidden',marginBottom:14},
  progressFill:{height:'100%',backgroundColor:C.primary,borderRadius:4},
  statsRow:{flexDirection:'row',justifyContent:'space-between'},
  tabsScroll:{flexGrow:0,borderBottomWidth:1,borderColor:C.line},
  tabsRow:{paddingHorizontal:16,flexDirection:'row'},
  tab:{paddingVertical:12,paddingHorizontal:10,marginBottom:-1,flexDirection:'row',alignItems:'center',gap:6},
  tabActive:{borderBottomWidth:2,borderColor:C.primary},
  tabText:{fontSize:14,color:C.textMid,fontWeight:'500'},
  tabTextActive:{color:C.text,fontWeight:'700'},
  tabBadge:{paddingHorizontal:6,paddingVertical:2,borderRadius:999,minWidth:18,alignItems:'center'},
  recordBtn:{backgroundColor:C.primary,borderRadius:14,paddingVertical:14,flexDirection:'row',alignItems:'center',justifyContent:'center',gap:8,marginBottom:2},
  sectionLabel:{fontSize:11,color:C.textMid,textTransform:'uppercase',letterSpacing:1.4,fontWeight:'700'},
  listCard:{backgroundColor:C.surface,borderWidth:1,borderColor:C.line,borderRadius:14,overflow:'hidden'},
  listCardInner:{padding:14,flexDirection:'row',alignItems:'center',gap:12},
  listCardTitle:{fontSize:14,fontWeight:'700',color:C.text},
  listCardSub:{fontSize:11,color:C.textMid,marginTop:2},
  iconBox:{width:44,height:44,borderRadius:12,alignItems:'center',justifyContent:'center'},
  statusBadge:{flexDirection:'row',alignItems:'center',paddingHorizontal:8,paddingVertical:4,borderRadius:999,borderWidth:1},
  statusText:{fontSize:11,fontWeight:'700'},
  filterChip:{paddingHorizontal:12,paddingVertical:7,borderRadius:999,backgroundColor:C.surface,borderWidth:1,borderColor:C.line},
  filterChipActive:{backgroundColor:C.primary,borderColor:C.primary},
  filterText:{fontSize:12,fontWeight:'700',color:C.textMid},
  filterTextActive:{color:C.primaryInk},
  statusBtn:{paddingHorizontal:10,paddingVertical:4,borderRadius:999,borderWidth:1,minWidth:90,alignItems:'center'},
  statusBtnText:{fontSize:11,fontWeight:'700'},
  checkBox:{width:24,height:24,borderRadius:6,borderWidth:2,borderColor:C.line,alignItems:'center',justifyContent:'center'},
  delegateBtn:{width:34,height:34,borderRadius:10,backgroundColor:C.primary,alignItems:'center',justifyContent:'center'},
  modalOverlay:{flex:1,backgroundColor:'rgba(0,0,0,0.6)',justifyContent:'flex-end'},
  sheet:{backgroundColor:C.surface,borderTopLeftRadius:24,borderTopRightRadius:24,padding:24,paddingBottom:40},
  sheetHandle:{width:40,height:4,backgroundColor:C.line,borderRadius:2,alignSelf:'center',marginBottom:20},
  sheetSub:{fontSize:11,color:C.textMid,textTransform:'uppercase',letterSpacing:1.4,fontWeight:'700',marginBottom:6},
  sheetTitle:{fontSize:16,fontWeight:'800',color:C.text,marginBottom:14},
  sheetActions:{flexDirection:'row',justifyContent:'space-around',marginTop:8},
  sheetAction:{alignItems:'center',gap:8},
  sheetIconBox:{width:56,height:56,borderRadius:16,alignItems:'center',justifyContent:'center'},
  sheetActionLabel:{fontSize:11,fontWeight:'700',color:C.textMid},
  autoBadge:{backgroundColor:C.surfaceHi,borderRadius:6,paddingHorizontal:6,paddingVertical:2},
  autoText:{fontSize:10,fontWeight:'700',color:C.textDim},
  qtyBadge:{backgroundColor:C.primary+'26',borderRadius:999,paddingHorizontal:8,paddingVertical:3,borderWidth:1,borderColor:C.primary+'4D'},
  qtyText:{fontSize:11,fontWeight:'700',color:C.primary},
  input:{backgroundColor:C.surfaceHi,borderWidth:1,borderColor:C.line,borderRadius:12,paddingHorizontal:14,paddingVertical:12,color:C.text,fontSize:14},
});
