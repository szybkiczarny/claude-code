import { useCallback, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, RefreshControl } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import { C } from '../theme';
import type { Project, Defect, Report, CrewEntry, MaterialEntry, Task, ProgressEntry } from '../types';

import DiaryTab      from './projectTabs/DiaryTab';
import DefectListTab from './projectTabs/DefectListTab';
import ProgressTab   from './projectTabs/ProgressTab';
import TasksTab      from './projectTabs/TasksTab';
import CrewTab       from './projectTabs/CrewTab';
import MaterialsTab  from './projectTabs/MaterialsTab';
import WeatherTab    from './projectTabs/WeatherTab';
import DocumentsTab  from './projectTabs/DocumentsTab';
import FloorPlanTab  from './projectTabs/FloorPlanTab';
import ScheduleTab   from './projectTabs/ScheduleTab';

type TabId = 'diary'|'todo'|'tasks'|'schedule'|'floorplan'|'docs'|'progress'|'crew'|'materials'|'weather';

export default function ProjectDetailScreen({ navigation, route }: { navigation: any; route: any }) {
  const insets = useSafeAreaInsets();
  const { projectId, projectName } = route.params;
  const [project, setProject]         = useState<Project|null>(null);
  const [defects, setDefects]         = useState<Defect[]>([]);
  const [reports, setReports]         = useState<Report[]>([]);
  const [crew, setCrew]               = useState<CrewEntry[]>([]);
  const [materials, setMaterials]     = useState<MaterialEntry[]>([]);
  const [tasks, setTasks]             = useState<Task[]>([]);
  const [progressLog, setProgressLog] = useState<ProgressEntry[]>([]);
  const [loading, setLoading]         = useState(true);
  const [refreshing, setRefreshing]   = useState(false);
  const [tab, setTab]                 = useState<TabId>('diary');

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
    if(p) setProject(p); if(d) setDefects(d); if(r) setReports(r);
    if(c) setCrew(c);     if(m) setMaterials(m); if(tk) setTasks(tk); if(pl) setProgressLog(pl);
    setLoading(false);
    setRefreshing(false);
  };

  useFocusEffect(useCallback(()=>{ load(); },[]));
  const onRefresh = () => { setRefreshing(true); load(); };

  if (loading) return <View style={[s.root,{justifyContent:'center'}]}><ActivityIndicator color={C.primary} size="large"/></View>;

  const openItems   = defects.filter(d => d.status==='open' || d.status==='in_progress');
  const resolved    = defects.filter(d => d.status==='resolved').length;
  const progress    = defects.length > 0 ? resolved / defects.length : 0;
  const openTasks   = tasks.filter(t => t.status==='todo');

  const TABS: { id:TabId; label:string; count?:number }[] = [
    { id:'diary',     label:'Dziennik' },
    { id:'todo',      label:'Do zrobienia', count:openItems.length },
    { id:'tasks',     label:'Zadania',      count:openTasks.length||undefined },
    { id:'schedule',  label:'Harmonogram' },
    { id:'floorplan', label:'Rzut' },
    { id:'docs',      label:'Dokumenty' },
    { id:'progress',  label:'Postęp' },
    { id:'crew',      label:'Ekipa',        count:crew.reduce((a,c)=>a+c.count,0) },
    { id:'materials', label:'Materiały',    count:materials.length },
    { id:'weather',   label:'Pogoda' },
  ];

  return (
    <View style={s.root}>
      <View style={[s.header,{paddingTop:insets.top+12}]}>
        <TouchableOpacity style={s.backBtn} onPress={()=>navigation.goBack()}><Ionicons name="chevron-back" size={22} color={C.text}/></TouchableOpacity>
        <View style={{flex:1}}>
          <Text style={s.headerSub}>{project?.client_name ?? 'Projekt'}</Text>
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
        <View style={s.progressBg}><View style={[s.progressFill,{width:`${Math.round(progress*100)}%` as any}]}/></View>
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
        {tab==='diary'     && <DiaryTab     reports={reports} navigation={navigation} projectId={projectId} projectName={projectName} refreshing={refreshing} onRefresh={onRefresh}/>}
        {tab==='todo'      && <DefectListTab defects={openItems} navigation={navigation} projectId={projectId} onReload={load} refreshing={refreshing} onRefresh={onRefresh}/>}
        {tab==='tasks'     && <TasksTab     tasks={tasks} onReload={load} refreshing={refreshing} onRefresh={onRefresh}/>}
        {tab==='schedule'  && <ScheduleTab  projectId={projectId}/>}
        {tab==='floorplan' && <FloorPlanTab projectId={projectId}/>}
        {tab==='docs'      && <DocumentsTab projectId={projectId}/>}
        {tab==='progress'  && <ProgressTab  log={progressLog} refreshing={refreshing} onRefresh={onRefresh}/>}
        {tab==='crew'      && <CrewTab      crew={crew} projectId={projectId} onReload={load} refreshing={refreshing} onRefresh={onRefresh}/>}
        {tab==='materials' && <MaterialsTab materials={materials} projectId={projectId} onReload={load} refreshing={refreshing} onRefresh={onRefresh}/>}
        {tab==='weather'   && <WeatherTab   address={project?.address ?? ''} refreshing={refreshing} onRefresh={onRefresh}/>}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  root:        { flex:1, backgroundColor:C.bg },
  header:      { flexDirection:'row', alignItems:'center', gap:12, paddingHorizontal:16, paddingBottom:10 },
  backBtn:     { width:44, height:44, borderRadius:12, backgroundColor:C.surface, borderWidth:1, borderColor:C.line, alignItems:'center', justifyContent:'center' },
  headerSub:   { fontSize:11, color:C.textMid, textTransform:'uppercase', letterSpacing:1.2, fontWeight:'700' },
  headerTitle: { fontSize:20, fontWeight:'800', color:C.text, letterSpacing:-0.4 },
  statsCard:   { marginHorizontal:16, marginBottom:10, backgroundColor:C.surface, borderWidth:1, borderColor:C.line, borderRadius:16, padding:16 },
  statsLabel:  { fontSize:11, color:C.textMid, textTransform:'uppercase', letterSpacing:1, fontWeight:'600' },
  progressBg:  { height:8, backgroundColor:C.line, borderRadius:4, overflow:'hidden', marginBottom:14 },
  progressFill:{ height:'100%' as any, backgroundColor:C.primary, borderRadius:4 },
  statsRow:    { flexDirection:'row', justifyContent:'space-between' },
  tabsScroll:  { flexGrow:0, borderBottomWidth:1, borderColor:C.line },
  tabsRow:     { paddingHorizontal:16, flexDirection:'row' },
  tab:         { paddingVertical:12, paddingHorizontal:10, marginBottom:-1, flexDirection:'row', alignItems:'center', gap:6 },
  tabActive:   { borderBottomWidth:2, borderColor:C.primary },
  tabText:     { fontSize:14, color:C.textMid, fontWeight:'500' },
  tabTextActive:{ color:C.text, fontWeight:'700' },
  tabBadge:    { paddingHorizontal:6, paddingVertical:2, borderRadius:999, minWidth:18, alignItems:'center' },
});
