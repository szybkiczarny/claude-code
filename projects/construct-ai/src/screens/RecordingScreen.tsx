import { useState, useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator, Alert, FlatList } from 'react-native';
import { Audio } from 'expo-av';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../lib/supabase';
import { transcribeAudio } from '../lib/groq';
import { extractReportData } from '../lib/gemini';
import { C } from '../theme';
import type { RecordingState, Project } from '../types';

const TAGS = [
  { id: 'defect',   label: 'Usterka',  color: C.danger,   icon: 'alert-circle-outline' },
  { id: 'progress', label: 'Postęp',   color: C.success,  icon: 'checkmark-circle-outline' },
  { id: 'safety',   label: 'BHP',      color: C.warning,  icon: 'shield-outline' },
  { id: 'material', label: 'Materiał', color: C.info,     icon: 'cube-outline' },
  { id: 'crew',     label: 'Ekipa',    color: '#A78BFA',  icon: 'people-outline' },
  { id: 'weather',  label: 'Pogoda',   color: C.textMid,  icon: 'cloud-outline' },
] as const;

function fmt(s: number) { return `${String(Math.floor(s/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`; }

export default function RecordingScreen({ navigation, route }: { navigation: any; route: any }) {
  const insets = useSafeAreaInsets();
  const routeProjectId: string = route?.params?.projectId ?? '';
  const routeProjectName: string = route?.params?.projectName ?? '';

  const [selectedProjectId, setSelectedProjectId] = useState(routeProjectId);
  const [selectedProjectName, setSelectedProjectName] = useState(routeProjectName);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(false);

  const projectId = selectedProjectId;
  const projectName = selectedProjectName;

  const [state, setState] = useState<RecordingState>('idle');
  const [duration, setDuration] = useState(0);
  const [tags, setTags] = useState<string[]>([]);
  const [summary, setSummary] = useState<string|null>(null);
  const [defects, setDefects] = useState<any[]>([]);
  const [reportId, setReportId] = useState<string|null>(null);
  const [error, setError] = useState<string|null>(null);

  const recRef = useRef<Audio.Recording|null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval>|null>(null);

  const noProject = !projectId;

  useEffect(() => {
    setSelectedProjectId(routeProjectId);
    setSelectedProjectName(routeProjectName);
  }, [routeProjectId, routeProjectName]);

  useEffect(() => {
    if (!routeProjectId) {
      setLoadingProjects(true);
      supabase.auth.getUser().then(async ({ data }) => {
        if (!data.user) { setLoadingProjects(false); return; }
        const { data: ps } = await supabase.from('projects').select('*').eq('manager_id', data.user.id).order('created_at', { ascending: false });
        setProjects(ps ?? []);
        setLoadingProjects(false);
      });
    }
  }, [routeProjectId]);

  const start = async () => {
    try {
      const { granted } = await Audio.requestPermissionsAsync();
      if (!granted) { Alert.alert('Brak uprawnień','Zezwól na dostęp do mikrofonu w ustawieniach.'); return; }
      await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
      const { recording } = await Audio.Recording.createAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
      recRef.current = recording;
      setDuration(0);
      timerRef.current = setInterval(()=>setDuration(d=>d+1),1000);
      setState('recording');
    } catch { setError('Nie udało się uruchomić mikrofonu'); setState('error'); }
  };

  const stop = async () => {
    if (!recRef.current) return;
    if (timerRef.current) clearInterval(timerRef.current);
    const rec = recRef.current;
    recRef.current = null;
    try {
      await rec.stopAndUnloadAsync();
      await Audio.setAudioModeAsync({ allowsRecordingIOS: false });
      const uri = rec.getURI();
      if (!uri) throw new Error('Brak pliku audio');

      setState('uploading');
      const transcript = await transcribeAudio(uri);

      setState('processing');
      const data = await extractReportData(transcript);
      const { data: { user } } = await supabase.auth.getUser();
      let gps: { lat: number; lng: number }|null = null;
      try {
        const { granted } = await Location.requestForegroundPermissionsAsync();
        if (granted) { const l = await Location.getCurrentPositionAsync({}); gps = { lat: l.coords.latitude, lng: l.coords.longitude }; }
      } catch {}

      const { data: report, error: rErr } = await supabase.from('reports').insert({
        project_id: projectId, inspector_id: user?.id, transcript,
        ai_summary: data.summary, weather: data.weather,
        lat: gps?.lat??null, lng: gps?.lng??null, status: 'done',
      }).select().single();
      if (rErr) throw rErr;

      if (data.defects?.length > 0) {
        await supabase.from('defects').insert(data.defects.map((d: any) => ({
          report_id: report.id, project_id: projectId, description: d.description,
          severity: d.severity, location_desc: d.location,
          subcontractor: d.subcontractor??null, deadline: d.deadline??null, action: d.action??null,
        })));
      }
      if (data.crew?.length > 0) {
        await supabase.from('crew').insert(data.crew.map((c: any) => ({
          project_id: projectId, report_id: report.id, role: c.role, company: c.company??null, count: c.count??1,
          recorded_at: new Date().toISOString().split('T')[0],
        })));
      }
      if (data.materials?.length > 0) {
        await supabase.from('materials').insert(data.materials.map((m: any) => ({
          project_id: projectId, report_id: report.id, name: m.name, qty: m.qty??null, delivery: m.delivery??null,
        })));
      }
      if (data.progress?.percent != null) {
        await supabase.from('progress_log').insert({
          project_id: projectId, report_id: report.id,
          percent: data.progress.percent,
          stage: data.progress.stage ?? null,
          note: data.progress.note ?? null,
        });
      }
      if (data.next_steps?.length > 0) {
        await supabase.from('tasks').insert(data.next_steps.map((t: any) => ({
          project_id: projectId, report_id: report.id,
          description: typeof t === 'string' ? t : t.description,
          location: typeof t === 'object' ? (t.location??null) : null,
          deadline: typeof t === 'object' ? (t.deadline??null) : null,
          status: 'todo',
        })));
      }

      setSummary(data.summary);
      setDefects(data.defects??[]);
      setReportId(report.id);
      setState('done');
    } catch (err: any) {
      setError(err?.message ?? 'Nieznany błąd');
      setState('error');
    }
  };

  const reset = () => { setState('idle'); setError(null); setSummary(null); setDefects([]); setReportId(null); setDuration(0); setTags([]); };

  if (state === 'uploading' || state === 'processing') {
    return (
      <View style={[s.root,{justifyContent:'center',alignItems:'center',gap:20}]}>
        <ActivityIndicator color={C.primary} size="large"/>
        <Text style={s.processingText}>{state==='uploading'?'Wysyłanie audio…':'AI analizuje raport…'}</Text>
        <Text style={{color:C.textDim,fontSize:13}}>To może potrwać kilka sekund</Text>
      </View>
    );
  }

  if (state === 'error') {
    return (
      <View style={[s.root,{justifyContent:'center',alignItems:'center',gap:16,paddingHorizontal:24}]}>
        <View style={[s.bigCircle,{backgroundColor:C.danger+'26'}]}><Ionicons name="alert-circle" size={48} color={C.danger}/></View>
        <Text style={{color:C.danger,fontSize:14,fontWeight:'600',textAlign:'center'}}>{error}</Text>
        <TouchableOpacity style={s.secondaryBtn} onPress={reset}><Text style={s.secondaryBtnText}>Spróbuj ponownie</Text></TouchableOpacity>
      </View>
    );
  }

  if (state === 'done') {
    return (
      <ScrollView style={s.root} contentContainerStyle={{padding:20,gap:16,paddingBottom:120}}>
        <View style={{alignItems:'center',paddingVertical:16}}>
          <View style={[s.bigCircle,{backgroundColor:C.success+'26'}]}><Ionicons name="checkmark-circle" size={48} color={C.success}/></View>
          <Text style={{color:C.text,fontSize:22,fontWeight:'800',marginTop:12}}>Raport zapisany</Text>
        </View>
        {summary&&<View style={s.card}><Text style={{color:C.textMid,fontSize:13,lineHeight:20}}>{summary}</Text></View>}
        {defects.length>0&&(
          <View style={s.card}>
            <Text style={s.sectionLabel}>WYKRYTE USTERKI · {defects.length}</Text>
            {defects.map((d,i)=>(
              <View key={i} style={{flexDirection:'row',gap:10,paddingVertical:8,borderTopWidth:i>0?1:0,borderColor:C.line}}>
                <View style={[s.severityDot,{backgroundColor:d.severity==='critical'||d.severity==='high'?C.danger:d.severity==='medium'?C.warning:C.textMid}]}/>
                <Text style={{flex:1,color:C.text,fontSize:13,fontWeight:'600'}}>{d.description}</Text>
              </View>
            ))}
          </View>
        )}
        {reportId&&(
          <TouchableOpacity style={s.secondaryBtn} onPress={()=>navigation.navigate('ReportDetail',{reportId})}>
            <Ionicons name="document-text-outline" size={18} color={C.primary}/>
            <Text style={s.secondaryBtnText}>Otwórz pełny raport</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity style={s.primaryBtn} onPress={reset}>
          <Text style={s.primaryBtnText}>Nagraj kolejny raport</Text>
        </TouchableOpacity>
      </ScrollView>
    );
  }

  const isRec = state === 'recording';

  return (
    <View style={s.root}>
      <View style={[s.header,{paddingTop:insets.top+12}]}>
        <Text style={s.headerSub}>NAGRYWANIE</Text>
        <Text style={s.headerTitle} numberOfLines={1}>{projectName||'Wybierz projekt'}</Text>
      </View>

      {noProject&&(
        <View style={{marginHorizontal:16,marginBottom:8}}>
          <Text style={[s.sectionLabel,{marginBottom:8}]}>WYBIERZ PROJEKT</Text>
          {loadingProjects
            ? <ActivityIndicator color={C.primary} style={{marginVertical:12}}/>
            : projects.length===0
              ? <View style={[s.card,{flexDirection:'row',gap:10,alignItems:'center'}]}><Ionicons name="folder-open-outline" size={20} color={C.textMid}/><Text style={{color:C.textMid,fontSize:13,fontWeight:'600'}}>Brak projektów — dodaj projekt najpierw</Text></View>
              : <FlatList
                  data={projects}
                  keyExtractor={p=>p.id}
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{gap:8,paddingRight:4}}
                  renderItem={({item:p})=>(
                    <TouchableOpacity
                      style={[s.projectChip,selectedProjectId===p.id&&{borderColor:C.primary,backgroundColor:C.primary+'22'}]}
                      onPress={()=>{ setSelectedProjectId(p.id); setSelectedProjectName(p.name); }}
                    >
                      <Text style={{color:selectedProjectId===p.id?C.primary:C.text,fontSize:13,fontWeight:'700'}} numberOfLines={1}>{p.name}</Text>
                    </TouchableOpacity>
                  )}
                />
          }
        </View>
      )}

      {/* FAB */}
      <View style={s.fabWrap}>
        {isRec&&<Text style={s.timer}>{fmt(duration)}</Text>}
        <TouchableOpacity
          style={[s.fab,{backgroundColor:isRec?C.danger:C.primary}]}
          onPress={isRec?stop:start}
          disabled={noProject}
          activeOpacity={0.85}
        >
          <Ionicons name={isRec?'stop':'mic'} size={44} color={isRec?'#fff':C.primaryInk}/>
        </TouchableOpacity>
        <Text style={s.fabLabel}>{isRec?'Dotknij aby zakończyć':'Dotknij aby nagrać'}</Text>
        {isRec&&<View style={s.recDot}/>}
      </View>

      {/* Tags */}
      <View style={s.tagsWrap}>
        <Text style={s.sectionLabel}>SZYBKIE TAGI</Text>
        <View style={s.tagsRow}>
          {TAGS.map(t=>{
            const active = tags.includes(t.id);
            return (
              <TouchableOpacity key={t.id} onPress={()=>setTags(prev=>active?prev.filter(x=>x!==t.id):[...prev,t.id])}
                style={[s.tag,{backgroundColor:active?t.color+'26':C.surface,borderColor:active?t.color+'66':C.line}]}>
                <Ionicons name={t.icon as any} size={14} color={active?t.color:C.textMid}/>
                <Text style={[s.tagText,{color:active?t.color:C.textMid}]}>{t.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  root:{flex:1,backgroundColor:C.bg},
  header:{paddingHorizontal:16,paddingBottom:8},
  headerSub:{fontSize:11,color:C.textMid,textTransform:'uppercase',letterSpacing:1.2,fontWeight:'700'},
  headerTitle:{fontSize:24,fontWeight:'800',color:C.text,letterSpacing:-0.4},
  fabWrap:{flex:1,alignItems:'center',justifyContent:'center',gap:16},
  timer:{fontSize:42,fontWeight:'800',color:C.text,letterSpacing:-1,fontVariant:['tabular-nums'] as any},
  fab:{width:120,height:120,borderRadius:60,alignItems:'center',justifyContent:'center',shadowColor:'#000',shadowOpacity:0.3,shadowRadius:20,elevation:8},
  fabLabel:{color:C.textMid,fontSize:14,fontWeight:'600'},
  recDot:{width:10,height:10,borderRadius:5,backgroundColor:C.danger,position:'absolute',top:16,right:16},
  tagsWrap:{paddingHorizontal:16,paddingBottom:120},
  sectionLabel:{fontSize:11,color:C.textMid,textTransform:'uppercase',letterSpacing:1.4,fontWeight:'700',marginBottom:10},
  tagsRow:{flexDirection:'row',flexWrap:'wrap',gap:8},
  tag:{flexDirection:'row',alignItems:'center',gap:6,paddingHorizontal:14,paddingVertical:8,borderRadius:999,borderWidth:1},
  tagText:{fontSize:13,fontWeight:'700'},
  bigCircle:{width:96,height:96,borderRadius:48,alignItems:'center',justifyContent:'center'},
  card:{backgroundColor:C.surface,borderWidth:1,borderColor:C.line,borderRadius:16,padding:16},
  projectChip:{backgroundColor:C.surface,borderWidth:1,borderColor:C.line,borderRadius:12,paddingHorizontal:14,paddingVertical:10,maxWidth:160},
  processingText:{color:C.text,fontSize:18,fontWeight:'700'},
  severityDot:{width:8,height:8,borderRadius:4,marginTop:4,flexShrink:0},
  primaryBtn:{backgroundColor:C.primary,borderRadius:14,paddingVertical:16,alignItems:'center'},
  primaryBtnText:{color:C.primaryInk,fontSize:16,fontWeight:'800'},
  secondaryBtn:{backgroundColor:C.surface,borderWidth:1,borderColor:C.line,borderRadius:14,paddingVertical:14,flexDirection:'row',alignItems:'center',justifyContent:'center',gap:8},
  secondaryBtnText:{color:C.primary,fontSize:15,fontWeight:'700'},
});
