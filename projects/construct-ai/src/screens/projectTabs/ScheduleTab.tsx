import { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Alert, Modal, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { C } from '../../theme';
import { ts } from './shared';
import EmptyState from './EmptyState';
import type { ScheduleTask } from '../../types';

// ─── CPM algorithm ───────────────────────────────────────────────────────────

interface CPMResult {
  id: string;
  es: number; ef: number;
  ls: number; lf: number;
  float: number;
  critical: boolean;
}

function computeCPM(tasks: ScheduleTask[]): Map<string, CPMResult> {
  const result = new Map<string, CPMResult>();
  tasks.forEach(t => result.set(t.id, { id:t.id, es:0, ef:0, ls:0, lf:0, float:0, critical:false }));

  // Build adjacency list (id → successors)
  const successors = new Map<string, string[]>();
  const inDegree  = new Map<string, number>();
  tasks.forEach(t => { successors.set(t.id, []); inDegree.set(t.id, 0); });
  tasks.forEach(t => {
    (t.depends_on ?? []).forEach(depId => {
      successors.get(depId)?.push(t.id);
      inDegree.set(t.id, (inDegree.get(t.id) ?? 0) + 1);
    });
  });

  // Kahn's topo sort (also detects cycles)
  const queue = [...inDegree.entries()].filter(([,d]) => d === 0).map(([id]) => id);
  const order: string[] = [];
  while (queue.length) {
    const id = queue.shift()!;
    order.push(id);
    successors.get(id)?.forEach(sid => {
      const newD = (inDegree.get(sid) ?? 0) - 1;
      inDegree.set(sid, newD);
      if (newD === 0) queue.push(sid);
    });
  }
  if (order.length < tasks.length) return result; // cycle — skip

  const dur = (id: string) => tasks.find(t => t.id === id)?.duration_days ?? 1;

  // Forward pass
  order.forEach(id => {
    const t = tasks.find(x => x.id === id)!;
    const r = result.get(id)!;
    const preds = t.depends_on ?? [];
    r.es = preds.length ? Math.max(...preds.map(pid => result.get(pid)?.ef ?? 0)) : 0;
    r.ef = r.es + dur(id);
  });

  const projectEnd = Math.max(...Array.from(result.values()).map(r => r.ef));

  // Backward pass
  [...order].reverse().forEach(id => {
    const r = result.get(id)!;
    const succs = successors.get(id) ?? [];
    r.lf = succs.length ? Math.min(...succs.map(sid => result.get(sid)?.ls ?? projectEnd)) : projectEnd;
    r.ls = r.lf - dur(id);
    r.float = r.ls - r.es;
    r.critical = r.float === 0;
  });

  return result;
}

// ─── Dependency picker ────────────────────────────────────────────────────────

function DepsModal({ tasks, taskId, current, onSave, onClose }: {
  tasks: ScheduleTask[]; taskId: string|null; current: string[]; onSave: (deps: string[])=>void; onClose: ()=>void;
}) {
  const [sel, setSel] = useState<string[]>(current);

  // Collect all descendants of taskId to prevent cycles
  const descendants = new Set<string>();
  if (taskId) {
    const stack = [taskId];
    while (stack.length) {
      const id = stack.pop()!;
      descendants.add(id);
      tasks.forEach(t => { if ((t.depends_on ?? []).includes(id)) stack.push(t.id); });
    }
  }

  const available = tasks.filter(t => t.id !== taskId && !descendants.has(t.id));

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={ts.modalOverlay} activeOpacity={1} onPress={onClose}>
        <TouchableOpacity activeOpacity={1} style={[ts.sheet, { maxHeight:'80%' }]}>
          <View style={ts.sheetHandle}/>
          <Text style={ts.sheetSub}>POPRZEDNICY ZADANIA</Text>
          <Text style={{ fontSize:13, color:C.textMid, marginBottom:12 }}>Zadanie zaczyna się po zakończeniu wybranych</Text>
          <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight:320 }}>
            {available.length === 0 && <Text style={{ color:C.textDim, fontSize:13 }}>Brak innych zadań</Text>}
            {available.map(t => {
              const active = sel.includes(t.id);
              return (
                <TouchableOpacity key={t.id} onPress={() => setSel(p => active ? p.filter(x=>x!==t.id) : [...p, t.id])}
                  style={{ flexDirection:'row', alignItems:'center', gap:10, padding:10, borderRadius:12, marginBottom:6,
                    backgroundColor: active ? C.primary+'18' : C.bg, borderWidth:1, borderColor: active ? C.primary : C.line }}>
                  <View style={{ flex:1 }}>
                    <Text style={{ fontSize:14, fontWeight:'700', color:C.text }}>{t.name}</Text>
                    <Text style={{ fontSize:11, color:C.textMid }}>{t.duration_days} {t.duration_days===1?'dzień':'dni'}</Text>
                  </View>
                  {active && <Ionicons name="checkmark-circle" size={20} color={C.primary}/>}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
          <TouchableOpacity style={[ts.recordBtn, { marginTop:16 }]} onPress={() => { onSave(sel); onClose(); }}>
            <Text style={{ color:C.primaryInk, fontWeight:'800', fontSize:15 }}>Zapisz zależności ({sel.length})</Text>
          </TouchableOpacity>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

// ─── Add/Edit task modal ──────────────────────────────────────────────────────

function TaskFormModal({ initial, tasks, projectId, onSave, onClose }: {
  initial?: ScheduleTask|null; tasks: ScheduleTask[]; projectId: string; onSave: ()=>void; onClose: ()=>void;
}) {
  const [name, setName] = useState(initial?.name ?? '');
  const [duration, setDuration] = useState(String(initial?.duration_days ?? 1));
  const [deps, setDeps] = useState<string[]>(initial?.depends_on ?? []);
  const [depsModal, setDepsModal] = useState(false);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!name.trim()) return;
    setSaving(true);
    const payload = { project_id:projectId, name:name.trim(), duration_days:parseInt(duration)||1, depends_on:deps, sort_order:tasks.length };
    if (initial) {
      await supabase.from('schedule_tasks').update(payload).eq('id', initial.id);
    } else {
      await supabase.from('schedule_tasks').insert(payload);
    }
    setSaving(false);
    onSave();
    onClose();
  };

  const depNames = deps.map(id => tasks.find(t => t.id === id)?.name).filter(Boolean);

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={ts.modalOverlay} activeOpacity={1} onPress={onClose}>
        <TouchableOpacity activeOpacity={1} style={ts.sheet}>
          <View style={ts.sheetHandle}/>
          <Text style={ts.sheetSub}>{initial ? 'EDYTUJ ZADANIE' : 'NOWE ZADANIE'}</Text>
          <TextInput style={[ts.input, { marginBottom:10 }]} placeholder="Nazwa zadania" placeholderTextColor={C.textDim} value={name} onChangeText={setName} autoFocus/>
          <View style={{ flexDirection:'row', alignItems:'center', gap:10, marginBottom:10 }}>
            <TextInput style={[ts.input, { flex:1 }]} placeholder="Czas trwania (dni)" keyboardType="number-pad" placeholderTextColor={C.textDim} value={duration} onChangeText={setDuration}/>
            <Text style={{ color:C.textMid, fontSize:13 }}>dni</Text>
          </View>
          <TouchableOpacity onPress={() => setDepsModal(true)}
            style={{ backgroundColor:C.surfaceHi, borderRadius:12, padding:12, marginBottom:10, flexDirection:'row', alignItems:'center', gap:8, borderWidth:1, borderColor:C.line }}>
            <Ionicons name="git-merge-outline" size={18} color={C.textMid}/>
            <Text style={{ flex:1, fontSize:13, color: deps.length ? C.text : C.textDim }}>
              {deps.length ? `Po: ${depNames.join(', ')}` : 'Dodaj poprzedniki (opcjonalnie)'}
            </Text>
            <Ionicons name="chevron-forward" size={16} color={C.textDim}/>
          </TouchableOpacity>
          <TouchableOpacity style={[ts.recordBtn, !name.trim() && { backgroundColor:C.line }]} onPress={save} disabled={saving || !name.trim()}>
            {saving ? <ActivityIndicator color={C.primaryInk} size="small"/> : <Text style={{ color: name.trim() ? C.primaryInk : C.textMid, fontWeight:'800', fontSize:15 }}>Zapisz zadanie</Text>}
          </TouchableOpacity>
          <DepsModal tasks={tasks} taskId={initial?.id ?? null} current={deps} onSave={setDeps} onClose={() => setDepsModal(false)}/>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

// ─── Gantt bar row ────────────────────────────────────────────────────────────

function GanttBar({ cpm, totalDays, barWidth }: { cpm: CPMResult; totalDays: number; barWidth: number }) {
  if (totalDays === 0) return null;
  const left = (cpm.es / totalDays) * barWidth;
  const width = Math.max(8, (( cpm.ef - cpm.es) / totalDays) * barWidth);
  const color = cpm.critical ? C.danger : C.primary;
  return (
    <View style={{ height:12, position:'relative', marginTop:4 }}>
      <View style={{ position:'absolute', left:0, right:0, height:4, top:4, backgroundColor:C.line, borderRadius:2 }}/>
      <View style={{ position:'absolute', left, width, height:12, borderRadius:6, backgroundColor:color, opacity:0.9 }}/>
    </View>
  );
}

// ─── Main ScheduleTab component ───────────────────────────────────────────────

export default function ScheduleTab({ projectId }: { projectId: string }) {
  const [tasks, setTasks] = useState<ScheduleTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [addModal, setAddModal] = useState(false);
  const [editTask, setEditTask] = useState<ScheduleTask|null>(null);
  const [barWidth, setBarWidth] = useState(280);

  const load = async () => {
    const { data } = await supabase.from('schedule_tasks').select('*').eq('project_id', projectId).order('sort_order');
    setTasks(data ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const cpm = computeCPM(tasks);
  const totalDays = tasks.length ? Math.max(...Array.from(cpm.values()).map(r => r.ef)) : 0;
  const criticalCount = Array.from(cpm.values()).filter(r => r.critical).length;

  const deleteTask = (t: ScheduleTask) => {
    Alert.alert('Usuń zadanie', `Usunąć "${t.name}"?`, [
      { text:'Anuluj', style:'cancel' },
      { text:'Usuń', style:'destructive', onPress: async () => {
        // Also clear this task from other tasks' depends_on
        const affected = tasks.filter(x => (x.depends_on ?? []).includes(t.id));
        await Promise.all([
          supabase.from('schedule_tasks').delete().eq('id', t.id),
          ...affected.map(x => supabase.from('schedule_tasks').update({ depends_on: (x.depends_on ?? []).filter(d => d !== t.id) }).eq('id', x.id)),
        ]);
        load();
      }},
    ]);
  };

  const toggleStatus = async (t: ScheduleTask) => {
    const next = t.status === 'done' ? 'todo' : t.status === 'todo' ? 'in_progress' : 'done';
    await supabase.from('schedule_tasks').update({ status:next }).eq('id', t.id);
    load();
  };

  if (loading) return <ActivityIndicator color={C.primary} style={{ marginTop:40 }}/>;

  const STATUS_COLOR: Record<string,string> = { todo: C.line, in_progress: C.warning, done: C.success };
  const STATUS_LABEL: Record<string,string> = { todo: 'Do zrobienia', in_progress: 'W toku', done: 'Gotowe' };

  return (
    <View style={{ flex:1 }}>
      <ScrollView contentContainerStyle={{ padding:16, paddingBottom:120 }}>
        {/* Summary card */}
        {tasks.length > 0 && (
          <View style={[ts.statsCard, { marginHorizontal:0, marginBottom:16 }]}>
            <View style={{ flexDirection:'row', justifyContent:'space-between' }}>
              <View style={{ alignItems:'center' }}>
                <Text style={{ fontSize:28, fontWeight:'800', color:C.text }}>{totalDays}</Text>
                <Text style={{ fontSize:10, color:C.textMid, textTransform:'uppercase', fontWeight:'700', letterSpacing:0.6 }}>dni łącznie</Text>
              </View>
              <View style={{ alignItems:'center' }}>
                <Text style={{ fontSize:28, fontWeight:'800', color:C.danger }}>{criticalCount}</Text>
                <Text style={{ fontSize:10, color:C.textMid, textTransform:'uppercase', fontWeight:'700', letterSpacing:0.6 }}>krytycznych</Text>
              </View>
              <View style={{ alignItems:'center' }}>
                <Text style={{ fontSize:28, fontWeight:'800', color:C.success }}>{tasks.filter(t=>t.status==='done').length}</Text>
                <Text style={{ fontSize:10, color:C.textMid, textTransform:'uppercase', fontWeight:'700', letterSpacing:0.6 }}>gotowych</Text>
              </View>
              <View style={{ alignItems:'center' }}>
                <Text style={{ fontSize:28, fontWeight:'800', color:C.primary }}>{tasks.length}</Text>
                <Text style={{ fontSize:10, color:C.textMid, textTransform:'uppercase', fontWeight:'700', letterSpacing:0.6 }}>zadań</Text>
              </View>
            </View>
          </View>
        )}

        {tasks.length === 0 && <EmptyState icon="calendar-outline" title="Brak harmonogramu" sub="Dodaj zadania żeby obliczyć ścieżkę krytyczną"/>}

        {/* Task list with Gantt bars */}
        <View onLayout={e => setBarWidth(e.nativeEvent.layout.width - 32)} style={{ gap:8 }}>
          {tasks.map(t => {
            const r = cpm.get(t.id);
            return (
              <View key={t.id} style={{ backgroundColor:C.surface, borderRadius:14, padding:14, borderWidth:1.5,
                borderColor: r?.critical ? C.danger+'66' : C.line }}>
                <View style={{ flexDirection:'row', alignItems:'center', gap:8 }}>
                  {/* Status dot */}
                  <TouchableOpacity onPress={() => toggleStatus(t)}
                    style={{ width:20, height:20, borderRadius:10, backgroundColor:STATUS_COLOR[t.status], borderWidth:t.status==='todo'?2:0, borderColor:C.textDim }}>
                    {t.status === 'done' && <Ionicons name="checkmark" size={14} color="#fff" style={{ alignSelf:'center' }}/>}
                    {t.status === 'in_progress' && <View style={{ width:8, height:8, borderRadius:4, backgroundColor:'#fff', alignSelf:'center', marginTop:6 }}/>}
                  </TouchableOpacity>

                  <Text style={{ flex:1, fontSize:14, fontWeight:'700', color:C.text, textDecorationLine:t.status==='done'?'line-through':'none' }} numberOfLines={1}>{t.name}</Text>

                  {r?.critical && (
                    <View style={{ backgroundColor:C.danger+'26', borderRadius:6, paddingHorizontal:6, paddingVertical:2 }}>
                      <Text style={{ fontSize:10, fontWeight:'800', color:C.danger }}>KRYTYCZNA</Text>
                    </View>
                  )}

                  <TouchableOpacity onPress={() => setEditTask(t)} style={{ padding:4 }}>
                    <Ionicons name="create-outline" size={18} color={C.textMid}/>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => deleteTask(t)} style={{ padding:4 }}>
                    <Ionicons name="trash-outline" size={16} color={C.danger}/>
                  </TouchableOpacity>
                </View>

                <View style={{ flexDirection:'row', alignItems:'center', gap:10, marginTop:6 }}>
                  <Text style={{ fontSize:11, color:C.textMid }}>{t.duration_days} {t.duration_days===1?'dzień':'dni'}</Text>
                  {r && (
                    <>
                      <Text style={{ fontSize:11, color:C.textDim }}>·</Text>
                      <Text style={{ fontSize:11, color:C.textMid }}>Dzień {r.es+1}–{r.ef}</Text>
                      {r.float > 0 && <Text style={{ fontSize:11, color:C.info }}>+{r.float}d zapasu</Text>}
                    </>
                  )}
                  {(t.depends_on ?? []).length > 0 && (
                    <View style={{ flexDirection:'row', alignItems:'center', gap:4 }}>
                      <Ionicons name="git-merge-outline" size={11} color={C.textDim}/>
                      <Text style={{ fontSize:11, color:C.textDim }}>{(t.depends_on ?? []).length}</Text>
                    </View>
                  )}
                </View>

                {r && <GanttBar cpm={r} totalDays={totalDays} barWidth={barWidth}/>}
              </View>
            );
          })}
        </View>

        {tasks.length > 0 && (
          <View style={{ marginTop:12, padding:12, backgroundColor:C.surface, borderRadius:12, borderWidth:1, borderColor:C.line }}>
            <Text style={[ts.sectionLabel, { marginBottom:6 }]}>LEGENDA</Text>
            <View style={{ flexDirection:'row', gap:16, flexWrap:'wrap' }}>
              <View style={{ flexDirection:'row', alignItems:'center', gap:6 }}>
                <View style={{ width:20, height:8, borderRadius:4, backgroundColor:C.danger }}/>
                <Text style={{ fontSize:11, color:C.textMid }}>Ścieżka krytyczna</Text>
              </View>
              <View style={{ flexDirection:'row', alignItems:'center', gap:6 }}>
                <View style={{ width:20, height:8, borderRadius:4, backgroundColor:C.primary }}/>
                <Text style={{ fontSize:11, color:C.textMid }}>Normalny</Text>
              </View>
            </View>
          </View>
        )}
      </ScrollView>

      <TouchableOpacity style={ts.fab} onPress={() => setAddModal(true)}>
        <Ionicons name="add" size={28} color={C.primaryInk}/>
      </TouchableOpacity>

      {addModal && <TaskFormModal tasks={tasks} projectId={projectId} onSave={load} onClose={() => setAddModal(false)}/>}
      {editTask && <TaskFormModal initial={editTask} tasks={tasks} projectId={projectId} onSave={load} onClose={() => setEditTask(null)}/>}
    </View>
  );
}
