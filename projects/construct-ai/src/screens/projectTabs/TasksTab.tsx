import { useState } from 'react';
import { FlatList, View, Text, TouchableOpacity, ActivityIndicator, Alert, Modal, Linking, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Share } from 'react-native';
import { supabase } from '../../lib/supabase';
import { C } from '../../theme';
import { ts } from './shared';
import EmptyState from './EmptyState';
import type { Task } from '../../types';

function TaskDelegateModal({ task, onClose }: { task: Task|null; onClose: ()=>void }) {
  if (!task) return null;
  const msg = `Zadanie: ${task.description}${task.location ? `\nLokalizacja: ${task.location}` : ''}${task.deadline ? `\nTermin: ${task.deadline}` : ''}`;
  const encoded = encodeURIComponent(msg);
  const actions = [
    { label:'WhatsApp', icon:'logo-whatsapp' as const,      color:'#25D366', onPress: () => { Linking.openURL(`whatsapp://send?text=${encoded}`); onClose(); } },
    { label:'SMS',      icon:'chatbubble-outline' as const,  color:C.info,    onPress: () => { Linking.openURL(`sms:?body=${encoded}`); onClose(); } },
    { label:'E-mail',   icon:'mail-outline' as const,        color:C.primary, onPress: () => { Linking.openURL(`mailto:?subject=Zadanie&body=${encoded}`); onClose(); } },
    { label:'Udostępnij', icon:'share-outline' as const,     color:'#A78BFA', onPress: () => { Share.share({ message:msg }); onClose(); } },
  ];
  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={ts.modalOverlay} activeOpacity={1} onPress={onClose}>
        <TouchableOpacity activeOpacity={1} style={ts.sheet}>
          <View style={ts.sheetHandle}/>
          <Text style={ts.sheetSub}>WYŚLIJ ZADANIE</Text>
          <Text style={ts.sheetTitle} numberOfLines={2}>{task.description}</Text>
          {(task.location || task.deadline) && (
            <View style={{ flexDirection:'row', gap:12, marginBottom:14 }}>
              {task.location && <View style={{ flexDirection:'row', alignItems:'center', gap:4 }}><Ionicons name="location-outline" size={13} color={C.textMid}/><Text style={{ fontSize:12, color:C.textMid }}>{task.location}</Text></View>}
              {task.deadline && <View style={{ flexDirection:'row', alignItems:'center', gap:4 }}><Ionicons name="calendar-outline" size={13} color={C.warning}/><Text style={{ fontSize:12, color:C.warning, fontWeight:'700' }}>{task.deadline}</Text></View>}
            </View>
          )}
          <View style={ts.sheetActions}>
            {actions.map(a => (
              <TouchableOpacity key={a.label} style={ts.sheetAction} onPress={a.onPress}>
                <View style={[ts.sheetIconBox, { backgroundColor:a.color+'26' }]}>
                  <Ionicons name={a.icon} size={22} color={a.color}/>
                </View>
                <Text style={ts.sheetActionLabel}>{a.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

export default function TasksTab({ tasks, onReload, refreshing, onRefresh }: {
  tasks: Task[]; onReload: ()=>void; refreshing?: boolean; onRefresh?: ()=>void;
}) {
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
      { text:'Anuluj', style:'cancel' },
      { text:'Usuń', style:'destructive', onPress: async () => {
        await supabase.from('tasks').delete().eq('id', t.id);
        onReload();
      }},
    ]);
  };

  return (
    <>
      <FlatList
        data={tasks}
        keyExtractor={t => t.id}
        contentContainerStyle={{ padding:16, gap:10, paddingBottom:120 }}
        refreshControl={<RefreshControl refreshing={refreshing ?? false} onRefresh={onRefresh} tintColor={C.primary}/>}
        ListEmptyComponent={<EmptyState icon="checkmark-done-outline" title="Brak zadań" sub="Zadania z raportów głosowych pojawią się tutaj"/>}
        renderItem={({ item: t }) => (
          <View style={[ts.listCard, { opacity: t.status==='done' ? 0.5 : 1 }]}>
            <View style={{ padding:14, gap:8 }}>
              <View style={{ flexDirection:'row', alignItems:'center', gap:8 }}>
                <TouchableOpacity
                  style={[ts.checkBox, t.status==='done' && { backgroundColor:C.success, borderColor:C.success }]}
                  onPress={() => toggleDone(t)}
                  disabled={updating === t.id}
                >
                  {updating === t.id
                    ? <ActivityIndicator size={12} color="#fff"/>
                    : t.status === 'done' && <Ionicons name="checkmark" size={14} color="#fff"/>
                  }
                </TouchableOpacity>
                <Text style={{ flex:1, fontSize:14, fontWeight:'700', color:C.text, textDecorationLine:t.status==='done'?'line-through':'none' }} numberOfLines={2}>{t.description}</Text>
                <TouchableOpacity style={ts.delegateBtn} onPress={() => setDelegate(t)}>
                  <Ionicons name="send-outline" size={14} color={C.primaryInk}/>
                </TouchableOpacity>
                <TouchableOpacity style={[ts.delegateBtn, { backgroundColor:C.danger+'22' }]} onPress={() => deleteTask(t)}>
                  <Ionicons name="trash-outline" size={14} color={C.danger}/>
                </TouchableOpacity>
              </View>
              {(t.location || t.deadline) && (
                <View style={{ flexDirection:'row', gap:12, paddingLeft:32 }}>
                  {t.location && <View style={{ flexDirection:'row', alignItems:'center', gap:4 }}><Ionicons name="location-outline" size={12} color={C.textMid}/><Text style={{ fontSize:11, color:C.textMid }}>{t.location}</Text></View>}
                  {t.deadline && <View style={{ flexDirection:'row', alignItems:'center', gap:4 }}><Ionicons name="calendar-outline" size={12} color={C.warning}/><Text style={{ fontSize:11, color:C.warning, fontWeight:'700' }}>{t.deadline}</Text></View>}
                </View>
              )}
            </View>
          </View>
        )}
      />
      <TaskDelegateModal task={delegate} onClose={() => setDelegate(null)}/>
    </>
  );
}
