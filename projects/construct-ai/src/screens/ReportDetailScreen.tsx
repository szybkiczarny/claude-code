import { useCallback, useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, Image, Share, Linking, Modal, Alert, RefreshControl, TextInput } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { supabase } from '../lib/supabase';
import { C } from '../theme';
import type { Report, Defect, CrewEntry, MaterialEntry, Contractor } from '../types';

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
  const [refreshing, setRefreshing] = useState(false);
  const [tab, setTab] = useState<TabId>('defects');
  const [delegateDefect, setDelegateDefect] = useState<Defect|null>(null);
  const [updatingDefect, setUpdatingDefect] = useState<string|null>(null);

  const cycleStatus = async (d: Defect) => {
    const next: Record<string,string> = { open:'in_progress', in_progress:'resolved', resolved:'open' };
    setUpdatingDefect(d.id);
    await supabase.from('defects').update({ status: next[d.status] }).eq('id', d.id);
    setUpdatingDefect(null);
    load();
  };

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
    setRefreshing(false);
  };

  useFocusEffect(useCallback(()=>{ load(); },[]));

  const onRefresh = () => { setRefreshing(true); load(); };

  const deleteReport = () => {
    Alert.alert('Usuń raport', 'Usunąć ten raport?\n\nTo usunie też wszystkie usterki w tym raporcie.', [
      { text: 'Anuluj', style: 'cancel' },
      { text: 'Usuń', style: 'destructive', onPress: async () => {
        await supabase.from('reports').delete().eq('id', reportId);
        navigation.goBack();
      }},
    ]);
  };

  const deleteDefect = (d: Defect) => {
    Alert.alert('Usuń usterkę', `Usunąć "${d.description.slice(0,60)}"?`, [
      { text: 'Anuluj', style: 'cancel' },
      { text: 'Usuń', style: 'destructive', onPress: async () => {
        await supabase.from('defects').delete().eq('id', d.id);
        load();
      }},
    ]);
  };

  const deletePhoto = (d: Defect) => {
    Alert.alert('Usuń zdjęcie', 'Usunąć zdjęcie tej usterki?', [
      { text: 'Anuluj', style: 'cancel' },
      { text: 'Usuń', style: 'destructive', onPress: async () => {
        await supabase.from('defects').update({ photo_url: null }).eq('id', d.id);
        load();
      }},
    ]);
  };

  const generatePdf = async () => {
    if (!report) return;
    const date = new Date(report.created_at).toLocaleDateString('pl-PL', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

    const severityLabel = (s: string) => s === 'critical' ? 'Krytyczna' : s === 'high' ? 'Wysoka' : s === 'medium' ? 'Średnia' : 'Niska';
    const statusLabel2  = (s: string) => s === 'open' ? 'Otwarta' : s === 'in_progress' ? 'W toku' : 'Naprawiona';
    const statusColor2  = (s: string) => s === 'open' ? '#FF5A5F' : s === 'in_progress' ? '#FFB02E' : '#3DDC97';

    const defectsHtml = defects.map((d, i) => `
      <div class="defect">
        <div class="defect-header">
          <span class="defect-num">${i + 1}</span>
          <span class="badge" style="background:${statusColor2(d.status)}22;color:${statusColor2(d.status)};border:1px solid ${statusColor2(d.status)}66">${statusLabel2(d.status)}</span>
          <span class="severity">${severityLabel(d.severity)}</span>
          ${d.subcontractor ? `<span class="contractor">📋 ${d.subcontractor}</span>` : ''}
          ${d.deadline ? `<span class="deadline">⏰ ${d.deadline}</span>` : ''}
        </div>
        <p class="defect-desc">${d.description}</p>
        ${d.location_desc ? `<p class="defect-loc">📍 ${d.location_desc}</p>` : ''}
      </div>`).join('');

    const crewHtml = crew.length ? `
      <h2>Ekipa</h2>
      <table><tr><th>Rola</th><th>Firma</th><th>Liczba</th></tr>
      ${crew.map(c => `<tr><td>${c.role}</td><td>${c.company ?? '—'}</td><td>${c.count}</td></tr>`).join('')}
      </table>` : '';

    const materialsHtml = materials.length ? `
      <h2>Materiały</h2>
      <table><tr><th>Materiał</th><th>Ilość</th><th>Dostawa</th></tr>
      ${materials.map(m => `<tr><td>${m.name}</td><td>${m.qty ?? '—'}</td><td>${m.delivery ?? '—'}</td></tr>`).join('')}
      </table>` : '';

    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"/>
    <style>
      body{font-family:Arial,sans-serif;padding:32px;color:#1a1a2e;font-size:14px}
      h1{font-size:22px;margin-bottom:4px;color:#0B1729}
      h2{font-size:16px;margin:24px 0 10px;color:#0B1729;border-bottom:2px solid #F6B93B;padding-bottom:4px}
      .meta{color:#667690;font-size:12px;margin-bottom:20px}
      .summary{background:#f8f9fa;border-left:4px solid #F6B93B;padding:12px 16px;margin-bottom:20px;border-radius:4px;line-height:1.6}
      .defect{border:1px solid #e0e0e0;border-radius:8px;padding:12px;margin-bottom:10px}
      .defect-header{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:6px}
      .defect-num{font-weight:700;color:#F6B93B;min-width:20px}
      .badge{font-size:11px;padding:2px 8px;border-radius:999px;font-weight:700}
      .severity{font-size:11px;color:#667690;font-weight:600;text-transform:uppercase}
      .contractor{font-size:11px;color:#5AA9FF}
      .deadline{font-size:11px;color:#FFB02E}
      .defect-desc{margin:4px 0;font-weight:600}
      .defect-loc{margin:2px 0;color:#667690;font-size:12px}
      table{width:100%;border-collapse:collapse}
      th{background:#0B1729;color:#F6B93B;padding:8px 10px;text-align:left;font-size:12px}
      td{padding:7px 10px;border-bottom:1px solid #e8e8e8;font-size:13px}
      .footer{margin-top:40px;color:#999;font-size:11px;text-align:center}
    </style></head><body>
    <h1>Raport budowy</h1>
    <div class="meta">${date}${report.weather ? ' · ' + report.weather : ''} · ${defects.length} usterek · ${crew.reduce((a,c)=>a+c.count,0)} osób</div>
    ${report.ai_summary ? `<div class="summary">${report.ai_summary}</div>` : ''}
    ${defects.length ? `<h2>Usterki (${defects.length})</h2>${defectsHtml}` : ''}
    ${crewHtml}
    ${materialsHtml}
    <div class="footer">Wygenerowano przez Construct AI · ${new Date().toLocaleDateString('pl-PL')}</div>
    </body></html>`;

    try {
      const { uri } = await Print.printToFileAsync({ html, base64: false });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, { mimeType: 'application/pdf', UTI: 'com.adobe.pdf' });
      } else {
        Alert.alert('PDF zapisany', uri);
      }
    } catch (e: any) {
      Alert.alert('Błąd', e?.message ?? 'Nie udało się wygenerować PDF');
    }
  };

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
        <TouchableOpacity style={s.backBtn} onPress={generatePdf}>
          <Ionicons name="document-text-outline" size={20} color={C.primary}/>
        </TouchableOpacity>
        <TouchableOpacity style={s.backBtn} onPress={shareReport}>
          <Ionicons name="share-outline" size={20} color={C.primary}/>
        </TouchableOpacity>
        <TouchableOpacity style={s.backBtn} onPress={deleteReport}>
          <Ionicons name="trash-outline" size={18} color={C.danger}/>
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

      <ScrollView contentContainerStyle={{padding:16,gap:10,paddingBottom:120}} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.primary}/>}>

        {/* USTERKI */}
        {tab==='defects'&&(
          defects.length===0
            ? <EmptyState icon="checkmark-circle-outline" title="Brak usterek" sub="Brak wykrytych usterek w tym raporcie"/>
            : defects.map(d=>(
              <View key={d.id} style={s.defectCard}>
                {d.photo_url&&<Image source={{uri:d.photo_url}} style={s.defectPhoto} resizeMode="cover"/>}
                <View style={{padding:14}}>
                  <View style={s.defectTop}>
                    <TouchableOpacity
                      style={[s.badge,{backgroundColor:statusColor(d.status)+'26',borderColor:statusColor(d.status)+'66'}]}
                      onPress={()=>cycleStatus(d)}
                    >
                      {updatingDefect===d.id
                        ? <ActivityIndicator size={10} color={statusColor(d.status)}/>
                        : <Text style={[s.badgeText,{color:statusColor(d.status)}]}>{statusLabel(d.status)} ›</Text>
                      }
                    </TouchableOpacity>
                    <View style={[s.badge,{backgroundColor:severityColor(d.severity)+'26',borderColor:severityColor(d.severity)+'66'}]}>
                      <Text style={[s.badgeText,{color:severityColor(d.severity)}]}>{severityLabel(d.severity)}</Text>
                    </View>
                  </View>
                  <Text style={s.defectDesc}>{d.description}</Text>
                  {d.location_desc&&<View style={s.defectMeta}><Ionicons name="location-outline" size={12} color={C.textMid}/><Text style={s.metaTxt}>{d.location_desc}</Text></View>}
                  {d.action&&<View style={s.defectMeta}><Ionicons name="build-outline" size={12} color={C.textMid}/><Text style={s.metaTxt}>{d.action}</Text></View>}
                </View>
                <View style={s.defectFooter}>
                  {d.subcontractor&&<View style={{flexDirection:'row',alignItems:'center',gap:4}}><Ionicons name="business-outline" size={12} color={C.textMid}/><Text style={s.metaTxt}>{d.subcontractor}</Text></View>}
                  {d.deadline&&<View style={{flexDirection:'row',alignItems:'center',gap:4}}><Ionicons name="calendar-outline" size={12} color={C.textMid}/><Text style={s.metaTxt}>{d.deadline}</Text></View>}
                  <View style={{flex:1}}/>
                  {d.photo_url&&(
                    <TouchableOpacity style={[s.delegateBtn,{backgroundColor:C.danger+'22',marginRight:6}]} onPress={()=>deletePhoto(d)}>
                      <Ionicons name="image-outline" size={14} color={C.danger}/>
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity style={[s.delegateBtn,{backgroundColor:C.surfaceHi,marginRight:6}]} onPress={()=>navigation.navigate('DefectCamera',{projectId:report.project_id,reportId:report.id})}>
                    <Ionicons name="camera-outline" size={14} color={C.textMid}/>
                  </TouchableOpacity>
                  <TouchableOpacity style={[s.delegateBtn,{backgroundColor:C.surfaceHi,marginRight:6}]} onPress={()=>setDelegateDefect(d)}>
                    <Ionicons name="send-outline" size={14} color={C.primary}/>
                  </TouchableOpacity>
                  <TouchableOpacity style={[s.delegateBtn,{backgroundColor:C.danger+'22'}]} onPress={()=>deleteDefect(d)}>
                    <Ionicons name="trash-outline" size={14} color={C.danger}/>
                  </TouchableOpacity>
                </View>
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
      <DelegateModal defect={delegateDefect} report={report} onClose={()=>setDelegateDefect(null)} onAssigned={load}/>
    </View>
  );
}

function DelegateModal({ defect, report, onClose, onAssigned }: { defect: Defect|null; report: any; onClose: ()=>void; onAssigned: ()=>void }) {
  const [contractors, setContractors] = useState<Contractor[]>([]);
  const [selected, setSelected] = useState<Contractor|null>(null);
  const [deadline, setDeadline] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!defect || !report?.project_id) return;
    setSelected(null);
    setDeadline(defect.deadline ?? '');
    supabase.from('contractors').select('*').eq('project_id', report.project_id).order('name')
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
    await supabase.from('defects').update({
      subcontractor: selected.name,
      deadline: deadline || null,
      status: 'in_progress',
    }).eq('id', defect.id);
    setSaving(false);
    onAssigned();
    onClose();
    const msg = `Usterka do naprawy:\n${defect.description}${defect.location_desc ? `\nLokalizacja: ${defect.location_desc}` : ''}${deadline ? `\nTermin: ${deadline}` : ''}`;
    Alert.alert(
      `Przydzielono → ${selected.name}`,
      'Powiadomić wykonawcę?',
      [
        { text: 'Nie teraz', style: 'cancel' },
        selected.phone ? { text: 'WhatsApp', onPress: () => Linking.openURL(`whatsapp://send?phone=${selected.phone}&text=${encodeURIComponent(msg)}`) } : { text: 'Udostępnij', onPress: () => Share.share({ message: msg }) },
      ]
    );
  };

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={s.modalOverlay} activeOpacity={1} onPress={onClose}>
        <TouchableOpacity activeOpacity={1} style={[s.sheet, { maxHeight: '85%' }]}>
          <View style={s.sheetHandle}/>
          <Text style={s.sheetSub}>PRZYDZIEL USTERKĘ</Text>
          <Text style={s.sheetTitle} numberOfLines={2}>{defect.description}</Text>

          <Text style={[s.sheetSub, { marginBottom: 8 }]}>WYKONAWCA</Text>
          <ScrollView style={{ maxHeight: 200 }} showsVerticalScrollIndicator={false}>
            {contractors.length === 0 && (
              <Text style={{ color: C.textDim, fontSize: 13, marginBottom: 12 }}>
                Brak wykonawców — dodaj ich w zakładce Kontrahenci projektu
              </Text>
            )}
            {contractors.map(c => {
              const active = selected?.id === c.id;
              return (
                <TouchableOpacity key={c.id} onPress={() => setSelected(active ? null : c)} style={[s.contractorRow, active && s.contractorRowActive]}>
                  <View style={[s.contractorAvatar, { backgroundColor: active ? C.primary : C.surfaceHi }]}>
                    <Text style={{ fontSize: 13, fontWeight: '700', color: active ? C.primaryInk : C.textMid }}>
                      {c.name.slice(0, 2).toUpperCase()}
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 14, fontWeight: '700', color: C.text }}>{c.name}</Text>
                    {c.phone && <Text style={{ fontSize: 11, color: C.textMid }}>{c.phone}</Text>}
                  </View>
                  {active && <Ionicons name="checkmark-circle" size={20} color={C.primary}/>}
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          <Text style={[s.sheetSub, { marginTop: 14, marginBottom: 8 }]}>TERMIN (opcjonalnie)</Text>
          <TextInput
            style={s.input}
            placeholder="np. 2026-05-10"
            placeholderTextColor={C.textDim}
            value={deadline}
            onChangeText={setDeadline}
          />

          <TouchableOpacity
            style={[s.assignBtn, !selected && { backgroundColor: C.line }]}
            onPress={assign}
            disabled={!selected || saving}
          >
            {saving
              ? <ActivityIndicator color={C.primaryInk} size="small"/>
              : <Text style={[s.assignBtnText, !selected && { color: C.textMid }]}>
                  {selected ? `Przydziel → ${selected.name}` : 'Wybierz wykonawcę'}
                </Text>
            }
          </TouchableOpacity>
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
  contractorRow:{flexDirection:'row',alignItems:'center',gap:10,padding:10,borderRadius:12,marginBottom:6,backgroundColor:C.bg,borderWidth:1,borderColor:C.line},
  contractorRowActive:{backgroundColor:C.primary+'18',borderColor:C.primary},
  contractorAvatar:{width:36,height:36,borderRadius:18,alignItems:'center',justifyContent:'center'},
  input:{backgroundColor:C.surfaceHi,borderWidth:1,borderColor:C.line,borderRadius:12,paddingHorizontal:14,paddingVertical:11,color:C.text,fontSize:14,marginBottom:16},
  assignBtn:{backgroundColor:C.primary,borderRadius:14,paddingVertical:15,alignItems:'center',marginTop:4},
  assignBtnText:{color:C.primaryInk,fontWeight:'800',fontSize:15},
});
