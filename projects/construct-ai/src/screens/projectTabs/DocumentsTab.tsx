import { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Alert, TextInput, Modal, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import { supabase } from '../../lib/supabase';
import { C } from '../../theme';
import { decode } from './shared';

type DocRow = { id: string; name: string; revision: string; file_url: string; file_type: string|null; created_at: string };

function fileIcon(type: string|null) {
  if (!type) return 'document-outline';
  if (type.includes('pdf')) return 'document-text-outline';
  if (type.includes('image')) return 'image-outline';
  if (type.includes('sheet') || type.includes('excel')) return 'grid-outline';
  return 'document-outline';
}

export default function DocumentsTab({ projectId }: { projectId: string }) {
  const [docs, setDocs] = useState<DocRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [revModal, setRevModal] = useState(false);
  const [pendingFile, setPendingFile] = useState<any>(null);
  const [revision, setRevision] = useState('R0');

  const load = async () => {
    const { data } = await supabase.from('documents').select('*').eq('project_id', projectId).order('created_at', { ascending:false });
    setDocs(data ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const pickAndUpload = async () => {
    const result = await DocumentPicker.getDocumentAsync({ type:'*/*', copyToCacheDirectory:true });
    if (result.canceled) return;
    const file = result.assets[0];
    setPendingFile(file);
    setRevision('R0');
    setRevModal(true);
  };

  const upload = async () => {
    if (!pendingFile) return;
    setRevModal(false);
    setUploading(true);
    try {
      const base64 = await FileSystem.readAsStringAsync(pendingFile.uri, { encoding:'base64' as any });
      const ext = pendingFile.name.split('.').pop() ?? 'bin';
      const path = `${projectId}/${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from('documents').upload(path, decode(base64), { contentType:pendingFile.mimeType ?? 'application/octet-stream' });
      if (upErr) throw upErr;
      const { data: { publicUrl } } = supabase.storage.from('documents').getPublicUrl(path);
      await supabase.from('documents').insert({ project_id:projectId, name:pendingFile.name, revision, file_url:publicUrl, file_type:pendingFile.mimeType });
      await load();
    } catch (e: any) {
      Alert.alert('Błąd', e.message ?? 'Nie udało się wgrać pliku');
    }
    setUploading(false);
    setPendingFile(null);
  };

  const deleteDoc = (doc: DocRow) => {
    Alert.alert('Usuń dokument', `Usunąć "${doc.name}"?`, [
      { text:'Anuluj', style:'cancel' },
      { text:'Usuń', style:'destructive', onPress: async () => {
        await supabase.from('documents').delete().eq('id', doc.id);
        setDocs(d => d.filter(x => x.id !== doc.id));
      }},
    ]);
  };

  if (loading) return <ActivityIndicator color={C.primary} style={{ marginTop:40 }}/>;

  return (
    <View style={{ flex:1 }}>
      <ScrollView contentContainerStyle={{ padding:16, paddingBottom:100 }}>
        {docs.length === 0 && (
          <View style={{ alignItems:'center', paddingTop:48, gap:10 }}>
            <Ionicons name="folder-open-outline" size={48} color={C.textDim}/>
            <Text style={{ fontSize:16, fontWeight:'700', color:C.text }}>Brak dokumentów</Text>
            <Text style={{ fontSize:13, color:C.textDim, textAlign:'center' }}>Wgraj rysunki, plany lub inne pliki projektowe</Text>
          </View>
        )}
        {docs.map(doc => (
          <View key={doc.id} style={{ flexDirection:'row', alignItems:'center', backgroundColor:C.surface, borderRadius:12, padding:12, marginBottom:8, gap:12, borderWidth:1, borderColor:C.line }}>
            <View style={{ width:44, height:44, borderRadius:10, backgroundColor:C.primary+'20', alignItems:'center', justifyContent:'center' }}>
              <Ionicons name={fileIcon(doc.file_type) as any} size={22} color={C.primary}/>
            </View>
            <View style={{ flex:1 }}>
              <Text style={{ fontSize:14, fontWeight:'700', color:C.text }} numberOfLines={1}>{doc.name}</Text>
              <View style={{ flexDirection:'row', gap:8, marginTop:2 }}>
                <View style={{ backgroundColor:C.primary+'22', borderRadius:6, paddingHorizontal:6, paddingVertical:2 }}>
                  <Text style={{ fontSize:11, fontWeight:'700', color:C.primary }}>{doc.revision}</Text>
                </View>
                <Text style={{ fontSize:11, color:C.textDim }}>{new Date(doc.created_at).toLocaleDateString('pl-PL')}</Text>
              </View>
            </View>
            <TouchableOpacity onPress={() => Linking.openURL(doc.file_url)} style={{ padding:6 }}>
              <Ionicons name="open-outline" size={20} color={C.primary}/>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => deleteDoc(doc)} style={{ padding:6 }}>
              <Ionicons name="trash-outline" size={18} color={C.danger}/>
            </TouchableOpacity>
          </View>
        ))}
      </ScrollView>

      <TouchableOpacity
        style={{ position:'absolute', bottom:24, right:20, backgroundColor:C.primary, borderRadius:28, width:56, height:56, alignItems:'center', justifyContent:'center', elevation:4 }}
        onPress={pickAndUpload}
        disabled={uploading}
      >
        {uploading ? <ActivityIndicator color={C.primaryInk}/> : <Ionicons name="cloud-upload-outline" size={26} color={C.primaryInk}/>}
      </TouchableOpacity>

      <Modal visible={revModal} transparent animationType="slide" onRequestClose={() => setRevModal(false)}>
        <View style={{ flex:1, justifyContent:'flex-end', backgroundColor:'#00000066' }}>
          <View style={{ backgroundColor:C.surface, borderTopLeftRadius:20, borderTopRightRadius:20, padding:24, gap:12 }}>
            <Text style={{ fontSize:16, fontWeight:'700', color:C.text }}>Numer rewizji</Text>
            <Text style={{ fontSize:13, color:C.textDim }}>{pendingFile?.name}</Text>
            <TextInput
              style={{ backgroundColor:C.bg, borderRadius:10, padding:12, color:C.text, fontSize:16, borderWidth:1, borderColor:C.line }}
              value={revision} onChangeText={setRevision}
              placeholder="np. R0, R1, Rev.2" placeholderTextColor={C.textDim} autoFocus
            />
            <TouchableOpacity style={{ backgroundColor:C.primary, borderRadius:12, padding:14, alignItems:'center' }} onPress={upload}>
              <Text style={{ color:C.primaryInk, fontWeight:'700', fontSize:15 }}>Wgraj dokument</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}
