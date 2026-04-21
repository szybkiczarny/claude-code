import { useCallback, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, Image, Share, Linking, Modal } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import { C } from '../theme';
import type { Report, Defect, CrewEntry, MaterialEntry } from '../types';

type TabId = 'defects' | 'crew' | 'materials' | 'transcript';

function statusLabel(s: string) { return s==='open'?'Otwarta':s==='in_progress'?'W toku':'Naprawiona'; }
function statusColor(s: string) { return s==='open'?C.danger:s==='in_progress'?C.warning:C.success; }
function severityLabel(s: string) { return s==='critical'?'Krytyczna':s==='high'?'Wysoka':s==='medium'?'Średnia':'Niska'; }
function severityColor(s: string) { return s==='critical'||s==='high'?C.danger:s==='medium'?C.warning:C.textMid; }

export default function ReportDetailScreen({ navigation, route }: { navigation: any; route: any }) {
  const insets = useSafeAreaInsets();
  const { reportId } = route.params;
  const [report, setReport] = useState<Report|null>(null);
  const [defects, setDefects] = useState<Defect[]>([]);
  const [crew, setCrew] = useState<CrewEntry[]>([]);
  const [materials, setMaterials] = useState<MaterialEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<TabId>('defects');
  const [delegateDefect, setDelegateDefect] = useState<Defect|null>(null);

  const load = async () => {
    const [{ data: r }, { data: d }, { data: c }, { data: m }] = await Promise.all([
      supabase.from('reports').select('*').eq('id',reportId).single(),
      supabase.from('defects').select('*').eq('report_id',reportId).order('created_at'),
      supabase.from('crew').select('*').eq('report_id',reportId).order('created_at'),
      supabase.from('materials').select('*').eq('report_id',reportId).order('created_at'),
    ]);
    if (r) setReport(r);
    if (d) setDefects(d);
    if (c) setCrew(c);
    if (m) setMaterials(m);
    setLoading(false);
  };

  useFocusEffect(useCallback(()=>{ load(); },[]));

  const shareReport = async () => {
    if (!report) return;
    const date = new Date(report.created_at).toLocaleDateString('pl-PL',{day:'numeric',month:'long',year:'numeric'});
    let text = `📋 Raport budowy — ${date}\n\n`;
    if (report.ai_summary) text += `${report.ai_summary}\n\n`;
    if (defects.length) {
      text += `🔧 Usterki (${defects.length}):\n`;
      defects.forEach((d,i) => { text += `${i+1}. ${d.description}${d.deadline?` [termin: ${d.deadline}]`:''}\n`; });
      text += '\n';
    }
    if (crew.length) { text += `👷 Ekipa: ${crew.map(c=>`${c.count}x ${c.role}${c.company?` (${c.company})`:''}`).join(', ')}\n\n`; }
    await Share.share({ message: text });
  };

  if (loading) return <View style={[s.root,{justifyContent:'center'}]}><ActivityIndicator color={C.primary} size="large"/></View>;
  if (!report) return <View style={[s.root,{justifyContent:'center',alignItems:'center'}]}><Text style={{color:C.textMid}}>Nie znaleziono raportu</Text></View>;

  const date = new Date(report.created_at).toLocaleDateString('pl-PL',{weekday:'long',day:'numeric',month:'long',year:'numeric'});

  const TABS: {id:TabId;label:string;count?:number}[] = [
    {id:'defects',label:'Usterki',count:defects.length},
    {id:'crew',label:'Ekipa',count:crew.reduce((a,c)=>a+c.count,0)||undefined},
    {id:'materials',label:'Materiały',count:materials.length||undefined},
    {id:'transcript',label:'Transkrypcja'},
  ];

  return (
    <View style={s.root}>
      {/* Header */}
      <View style={[s.header,{paddingTop:insets.top+12}]}>
        <TouchableOpacity style={s.backBtn} onPress={()=>navigation.goBack()}>
          <Ionicons name="chevron-back" size={22} color={C.text}/>
        </TouchableOpacity>
        <View style={{flex:1}}>
          <Text style={s.headerSub}>RAPORT</Text>
          <Text style={s.headerTitle} numberOfLines={1}>{date}</Text>
        </View>
        <TouchableOpacity style={s.backBtn} onPress={shareReport}>
          <Ionicons name="share-outline" size={20} color={C.primary}/>
        </TouchableOpacity>
      </View>

      {/* Summary */}
      {report.ai_summary&&(
        <View style={s.summary}><Text style={{color:C.textMid,fontSize:13,lineHeight:20}}>{report.ai_summary}</Text></View>
      )}

      {/* Meta chips */}
      <View style={s.metaRow}>
        {report.weather&&<View style={s.metaChip}><Ionicons name="cloud-outline" size={13} color={C.textMid}/><Text style={s.metaTxt}>{report.weather}</Text></View>}
        <View style={s.metaChip}><Ionicons name="alert-circle-outline" size={13} color={C.danger}/><Text style={[s.metaTxt,{color:C.danger}]}>{defects.length} usterek</Text></View>
        {crew.length>0&&<View style={s.metaChip}><Ionicons name="people-outline" size={13} color={C.textMid}/><Text style={s.metaTxt}>{crew.reduce((a,c)=>a+c.count,0)} osób</Text></View>}
        {materials.length>0&&<View style={s.metaChip}><Ionicons name="cube-outline" size={13} color={C.textMid}/><Text style={s.metaTxt}>{materials.length} mat.</Text></View>}
      </View>

      {/* Tabs */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.tabsScroll} contentContainerStyle={s.tabsRow}>
        {TABS.map(t=>(
          <TouchableOpacity key={t.id} style={[s.tab,tab===t.id&&s.tabActive]} onPress={()=>setTab(t.id)}>
            <Text style={[s.tabText,tab===t.id&&s.tabTextActive]}>{t.label}</Text>
            {t.count!=null&&t.count>0&&(
              <View style={[s.tabBadge,{backgroundColor:tab===t.id?C.danger:C.line}]}>
                <Text style={{fontSize:10,fontWeight:'700',color:tab===t.id?'#fff':C.textMid}}>{t.count}</Text>
              </View>
            )}
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView contentContainerStyle={{padding:16,gap:10,paddingBottom:120}}>

        {/* USTERKI */}
        {tab==='defects'&&(
          defects.length===0
            ? <EmptyState icon="checkmark-circle-outline" title="Brak usterek" sub="Brak wykrytych usterek w tym raporcie"/>
            : defects.map(d=>(
              <View key={d.id} style={s.defectCard}>
                {d.photo_url&&<Image source={{uri:d.photo_url}} style={s.defectPhoto} resizeMode="cover"/>}
                <View style={{padding:14}}>
                  <View style={s.defectTop}>
                    <View style={[s.badge,{backgroundColor:statusColor(d.status)+'26',borderColor:statusColor(d.status)+'66'}]}>
                      <Text style={[s.badgeText,{color:statusColor(d.status)}]}>{statusLabel(d.status)}</Text>
                    </View>
                    <View style={[s.badge,{backgroundColor:severityColor(d.severity)+'26',borderColor:severityColor(d.severity)+'66'}]}>
                      <Text style={[s.badgeText,{color:severityColor(d.severity)}]}>{severityLabel(d.severity)}</Text>
                    </View>
                  </View>
                  <Text style={s.defectDesc}>{d.description}</Text>
                  {d.location_desc&&<View style={s.defectMeta}><Ionicons name="location-outline" size={12} color={C.textMid}/><Text style={s.metaTxt}>{d.location_desc}</Text></View>}
                  {d.action&&<View style={s.defectMeta}><Ionicons name="build-outline" size={12} color={C.textMid}/><Text style={s.metaTxt}>{d.action}</Text></View>}
                </View>
                {(d.subcontractor||d.deadline)&&(
                  <View style={s.defectFooter}>
                    {d.subcontractor&&<View style={{flexDirection:'row',alignItems:'center',gap:4}}><Ionicons name="business-outline" size={12} color={C.textMid}/><Text style={s.metaTxt}>{d.subcontractor}</Text></View>}
                    {d.deadline&&<View style={{flexDirection:'row',alignItems:'center',gap:4}}><Ionicons name="calendar-outline" size={12} color={C.textMid}/><Text style={s.metaTxt}>{d.deadline}</Text></View>}
                    <View style={{flex:1}}/>
                    <TouchableOpacity style={s.delegateBtn} onPress={()=>setDelegateDefect(d)}>
                      <Ionicons name="send-outline" size={14} color={C.primaryInk}/>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            ))
        )}

        {/* EKIPA */}
        {tab==='crew'&&(
          crew.length===0
            ? <EmptyState icon="people-outline" title="Brak ekipy" sub="Brak danych o ekipie w tym raporcie"/>
            : crew.map(c=>(
              <View key={c.id} style={s.listCard}>
                <View style={[s.listIcon,{backgroundColor:C.primary+'26'}]}><Text style={{fontSize:18,fontWeight:'800',color:C.primary}}>{c.count}</Text></View>
                <View style={{flex:1}}>
                  <Text style={s.listTitle}>{c.role}</Text>
                  <Text style={s.listSub}>{c.company??'Brak firmy'}</Text>
                </View>
              </View>
            ))
        )}

        {/* MATERIAŁY */}
        {tab==='materials'&&(
          materials.length===0
            ? <EmptyState icon="cube-outline" title="Brak materiałów" sub="Brak danych o materiałach w tym raporcie"/>
            : materials.map(m=>(
              <View key={m.id} style={s.listCard}>
                <View style={[s.listIcon,{backgroundColor:C.primary+'26'}]}><Ionicons name="cube-outline" size={20} color={C.primary}/></View>
                <View style={{flex:1}}>
                  <Text style={s.listTitle}>{m.name}</Text>
                  <Text style={s.listSub}>{m.delivery?`Dostawa: ${m.delivery}`:'Brak terminu'}</Text>
                </View>
                {m.qty&&<View style={s.qtyBadge}><Text style={s.qtyText}>{m.qty}</Text></View>}
              </View>
            ))
        )}

        {/* TRANSKRYPCJA */}
        {tab==='transcript'&&(
          report.transcript
            ? <View style={s.transcriptCard}><Text style={{color:C.textMid,fontSize:13,lineHeight:22}}>{report.transcript}</Text></View>
            : <EmptyState icon="mic-outline" title="Brak transkrypcji" sub="Transkrypcja niedostępna"/>
        )}
      </ScrollView>

      {/* Delegate bottom sheet */}
      <DelegateModal defect={delegateDefect} onClose={()=>setDelegateDefect(null)}/>
    </View>
  );
}

function DelegateModal({ defect, onClose }: { defect: Defect|null; onClose: ()=>void }) {
  if (!defect) return null;
  const msg = `Usterka: ${defect.description}${defect.location_desc?`. Lokalizacja: ${defect.location_desc}`:''}${defect.deadline?`. Termin: ${defect.deadline}`.replace('.',','):''}`;
  const encoded = encodeURIComponent(msg);
  const actions = [
    { label:'WhatsApp', icon:'logo-whatsapp' as const, color:'#25D366', onPress:()=>{ Linking.openURL(`whatsapp://send?text=${encoded}`); onClose(); } },
    { label:'SMS',      icon:'chatbubble-outline' as const, color:C.info,    onPress:()=>{ Linking.openURL(`sms:?body=${encoded}`); onClose(); } },
    { label:'E-mail',   icon:'mail-outline' as const,       color:C.primary, onPress:()=>{ Linking.openURL(`mailto:?subject=Usterka&body=${encoded}`); onClose(); } },
    { label:'Udostępnij', icon:'share-outline' as const,    color:'#A78BFA', onPress:()=>{ Share.share({message:msg}); onClose(); } },
  ];
  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={s.modalOverlay} activeOpacity={1} onPress={onClose}>
        <TouchableOpacity activeOpacity={1} style={s.sheet}>
          <View style={s.sheetHandle}/>
          <Text style={s.sheetSub}>DELEGUJ USTERKĘ</Text>
          <Text style={s.sheetTitle} numberOfLines={2}>{defect.description}</Text>
          {defect.subcontractor&&(
            <View style={[s.metaChip,{marginBottom:14}]}>
              <Ionicons name="business-outline" size={13} color={C.textMid}/>
              <Text style={s.metaTxt}>{defect.subcontractor}</Text>
              {defect.deadline&&<Text style={[s.metaTxt,{marginLeft:8}]}>· Termin: {defect.deadline}</Text>}
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

function EmptyState({ icon, title, sub }: { icon: any; title: string; sub: string }) {
  return (
    <View style={{alignItems:'center',paddingTop:48,gap:10}}>
      <Ionicons name={icon} size={48} color={C.textDim}/>
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
  headerTitle:{fontSize:18,fontWeight:'700',color:C.text},
  summary:{marginHorizontal:16,marginBottom:10,backgroundColor:C.surface,borderWidth:1,borderColor:C.line,borderRadius:14,padding:14},
  metaRow:{flexDirection:'row',gap:8,paddingHorizontal:16,marginBottom:10,flexWrap:'wrap'},
  metaChip:{flexDirection:'row',alignItems:'center',gap:4,backgroundColor:C.surface,borderWidth:1,borderColor:C.line,borderRadius:999,paddingHorizontal:10,paddingVertical:5},
  metaTxt:{fontSize:11,color:C.textMid,fontWeight:'600'},
  tabsScroll:{flexGrow:0,borderBottomWidth:1,borderColor:C.line},
  tabsRow:{paddingHorizontal:16,flexDirection:'row'},
  tab:{paddingVertical:12,paddingHorizontal:10,marginBottom:-1,flexDirection:'row',alignItems:'center',gap:6},
  tabActive:{borderBottomWidth:2,borderColor:C.primary},
  tabText:{fontSize:14,color:C.textMid,fontWeight:'500'},
  tabTextActive:{color:C.text,fontWeight:'700'},
  tabBadge:{paddingHorizontal:6,paddingVertical:2,borderRadius:999,minWidth:18,alignItems:'center'},
  defectCard:{backgroundColor:C.surface,borderWidth:1,borderColor:C.line,borderRadius:14,overflow:'hidden'},
  defectPhoto:{width:'100%',height:160},
  defectTop:{flexDirection:'row',gap:8,marginBottom:8},
  badge:{flexDirection:'row',alignItems:'center',gap:4,paddingHorizontal:8,paddingVertical:4,borderRadius:999,borderWidth:1},
  badgeText:{fontSize:11,fontWeight:'700'},
  defectDesc:{fontSize:14,fontWeight:'700',color:C.text,lineHeight:20},
  defectMeta:{flexDirection:'row',alignItems:'center',gap:4,marginTop:5},
  defectFooter:{flexDirection:'row',alignItems:'center',gap:10,padding:12,borderTopWidth:1,borderColor:C.line,backgroundColor:C.bg+'80'},
  delegateBtn:{width:32,height:32,borderRadius:8,backgroundColor:C.primary,alignItems:'center',justifyContent:'center'},
  listCard:{backgroundColor:C.surface,borderWidth:1,borderColor:C.line,borderRadius:14,padding:14,flexDirection:'row',alignItems:'center',gap:12},
  listIcon:{width:44,height:44,borderRadius:12,alignItems:'center',justifyContent:'center'},
  listTitle:{fontSize:14,fontWeight:'700',color:C.text},
  listSub:{fontSize:11,color:C.textMid,marginTop:2},
  qtyBadge:{paddingHorizontal:10,paddingVertical:4,borderRadius:999,backgroundColor:C.primary+'26',borderWidth:1,borderColor:C.primary+'66'},
  qtyText:{fontSize:12,fontWeight:'700',color:C.primary},
  transcriptCard:{backgroundColor:C.surface,borderWidth:1,borderColor:C.line,borderRadius:14,padding:16},
  modalOverlay:{flex:1,backgroundColor:'rgba(0,0,0,0.6)',justifyContent:'flex-end'},
  sheet:{backgroundColor:C.surface,borderTopLeftRadius:20,borderTopRightRadius:20,padding:20,paddingBottom:40},
  sheetHandle:{width:36,height:4,borderRadius:2,backgroundColor:C.line,alignSelf:'center',marginBottom:16},
  sheetSub:{fontSize:11,color:C.textMid,textTransform:'uppercase',letterSpacing:1.2,fontWeight:'700',marginBottom:4},
  sheetTitle:{fontSize:18,fontWeight:'700',color:C.text,marginBottom:14,lineHeight:24},
  sheetActions:{flexDirection:'row',gap:10},
  sheetAction:{flex:1,alignItems:'center',gap:8,padding:12,backgroundColor:C.bg,borderRadius:14,borderWidth:1,borderColor:C.line},
  sheetIconBox:{width:44,height:44,borderRadius:12,alignItems:'center',justifyContent:'center'},
  sheetActionLabel:{fontSize:11,fontWeight:'700',color:C.text},
});
