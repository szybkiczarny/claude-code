import { useCallback, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import { C } from '../theme';
import type { Report } from '../types';

interface ReportWithMeta extends Report { defectCount: number; }

function isToday(iso: string) { const d=new Date(iso),n=new Date(); return d.getDate()===n.getDate()&&d.getMonth()===n.getMonth()&&d.getFullYear()===n.getFullYear(); }
function fDate(iso: string) { return new Date(iso).toLocaleDateString('pl-PL',{weekday:'long',day:'numeric',month:'long'}); }
function fTime(iso: string) { const d=new Date(iso); return `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`; }

export default function ReportsScreen({ navigation, route }: { navigation: any; route: any }) {
  const insets = useSafeAreaInsets();
  const projectId: string = route?.params?.projectId ?? '';
  const projectName: string = route?.params?.projectName ?? '';
  const [reports, setReports] = useState<ReportWithMeta[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    let data: Report[]|null = null;
    if (projectId) {
      const res = await supabase.from('reports').select('*').eq('project_id',projectId).order('created_at',{ascending:false});
      data = res.data;
    } else {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }
      const { data: ps } = await supabase.from('projects').select('id').eq('manager_id',user.id);
      const ids = (ps??[]).map(p=>p.id);
      if (!ids.length) { setReports([]); setLoading(false); return; }
      const res = await supabase.from('reports').select('*').in('project_id',ids).order('created_at',{ascending:false});
      data = res.data;
    }
    if (!data) { setLoading(false); return; }
    const ids = data.map(r=>r.id);
    const { data: def } = ids.length ? await supabase.from('defects').select('report_id').in('report_id',ids) : { data: [] };
    const counts: Record<string,number> = {};
    for (const d of def??[]) counts[d.report_id] = (counts[d.report_id]??0)+1;
    setReports(data.map(r=>({...r, defectCount: counts[r.id]??0})));
    setLoading(false);
  };

  useFocusEffect(useCallback(()=>{ load(); },[]));

  const todayList = reports.filter(r=>isToday(r.created_at));
  const earlierList = reports.filter(r=>!isToday(r.created_at));
  const totalDefects = reports.reduce((a,r)=>a+r.defectCount,0);

  return (
    <View style={s.root}>
      <View style={[s.header,{paddingTop:insets.top+12}]}>
        <View style={{flex:1}}>
          <Text style={s.sub}>RAPORTY</Text>
          <Text style={s.title}>{projectName||'Wszystkie raporty'}</Text>
        </View>
      </View>

      {!loading&&reports.length>0&&(
        <View style={s.stats}>
          {[{v:reports.length,l:'Wszystkich',c:C.text},{v:todayList.length,l:'Dziś',c:C.primary},{v:totalDefects,l:'Usterek',c:C.danger}].map(({v,l,c})=>(
            <View key={l} style={s.tile}><Text style={[s.tileVal,{color:c}]}>{v}</Text><Text style={s.tileLbl}>{l}</Text></View>
          ))}
        </View>
      )}

      {loading
        ? <ActivityIndicator color={C.primary} style={{marginTop:48}} size="large"/>
        : reports.length===0
          ? <View style={s.empty}><Text style={{fontSize:48}}>📋</Text><Text style={s.emptyTitle}>Brak raportów</Text><Text style={s.emptySub}>Nagraj pierwszy raport głosowy</Text></View>
          : <FlatList
              data={[...todayList,...earlierList]}
              keyExtractor={r=>r.id}
              contentContainerStyle={{paddingHorizontal:16,paddingBottom:120,gap:10}}
              ListHeaderComponent={todayList.length>0?<Text style={s.sectionLabel}>DZIŚ · {todayList.length}</Text>:null}
              renderItem={({item:r,index})=>(
                <>
                  {index===todayList.length&&earlierList.length>0&&<Text style={[s.sectionLabel,{marginTop:16}]}>WCZEŚNIEJ · {earlierList.length}</Text>}
                  <TouchableOpacity style={s.card} onPress={()=>navigation.navigate('ReportDetail',{reportId:r.id})} activeOpacity={0.85}>
                    <View style={s.cardInner}>
                      <View style={s.iconWrap}><Ionicons name="mic" size={24} color={C.primary}/></View>
                      <View style={{flex:1}}>
                        <View style={{flexDirection:'row',alignItems:'center',gap:8}}>
                          <Text style={s.cardTitle} numberOfLines={1}>{fDate(r.created_at)}</Text>
                          {isToday(r.created_at)&&<View style={s.newBadge}><Text style={s.newText}>NOWY</Text></View>}
                        </View>
                        {r.ai_summary&&<Text style={s.cardSummary} numberOfLines={2}>{r.ai_summary}</Text>}
                        <View style={{flexDirection:'row',gap:12,marginTop:6}}>
                          <View style={{flexDirection:'row',alignItems:'center',gap:4}}><Ionicons name="time-outline" size={12} color={C.textMid}/><Text style={s.meta}>{fTime(r.created_at)}</Text></View>
                          {r.defectCount>0&&<View style={{flexDirection:'row',alignItems:'center',gap:4}}><Ionicons name="alert-circle-outline" size={12} color={C.danger}/><Text style={[s.meta,{color:C.danger}]}>{r.defectCount}</Text></View>}
                          {r.weather&&<View style={{flexDirection:'row',alignItems:'center',gap:4}}><Ionicons name="cloud-outline" size={12} color={C.textMid}/><Text style={s.meta}>{r.weather}</Text></View>}
                        </View>
                      </View>
                      <Ionicons name="chevron-forward" size={18} color={C.textDim}/>
                    </View>
                  </TouchableOpacity>
                </>
              )}
            />
      }
    </View>
  );
}

const s = StyleSheet.create({
  root:{flex:1,backgroundColor:C.bg},
  header:{paddingHorizontal:16,paddingBottom:12},
  sub:{fontSize:11,color:C.textMid,textTransform:'uppercase',letterSpacing:1.2,fontWeight:'700'},
  title:{fontSize:26,fontWeight:'800',color:C.text,letterSpacing:-0.5},
  stats:{flexDirection:'row',gap:8,paddingHorizontal:16,paddingBottom:14},
  tile:{flex:1,backgroundColor:C.surface,borderWidth:1,borderColor:C.line,borderRadius:14,padding:12},
  tileVal:{fontSize:26,fontWeight:'800',lineHeight:30},
  tileLbl:{fontSize:10,color:C.textMid,marginTop:4,textTransform:'uppercase',letterSpacing:0.8,fontWeight:'600'},
  sectionLabel:{fontSize:11,color:C.textMid,letterSpacing:1.4,fontWeight:'700',paddingHorizontal:16,marginBottom:8},
  empty:{alignItems:'center',paddingTop:60,gap:10},
  emptyTitle:{fontSize:16,fontWeight:'700',color:C.text},
  emptySub:{fontSize:13,color:C.textDim},
  card:{backgroundColor:C.surface,borderWidth:1,borderColor:C.line,borderRadius:16,overflow:'hidden'},
  cardInner:{padding:14,flexDirection:'row',alignItems:'center',gap:12},
  iconWrap:{width:52,height:52,borderRadius:14,backgroundColor:C.primary+'2E',borderWidth:1,borderColor:C.primary+'4D',alignItems:'center',justifyContent:'center'},
  cardTitle:{fontSize:15,fontWeight:'700',color:C.text,flex:1},
  cardSummary:{fontSize:12,color:C.textMid,marginTop:2,lineHeight:17},
  meta:{fontSize:11,color:C.textMid,fontWeight:'600'},
  newBadge:{backgroundColor:C.primary+'2E',borderRadius:999,paddingHorizontal:8,paddingVertical:2,borderWidth:1,borderColor:C.primary+'4D'},
  newText:{fontSize:10,fontWeight:'800',color:C.primary},
});
