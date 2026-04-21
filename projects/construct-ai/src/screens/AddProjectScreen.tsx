import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../lib/supabase';
import { C } from '../theme';

export default function AddProjectScreen({ navigation }: { navigation: any }) {
  const insets = useSafeAreaInsets();
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [client, setClient] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string|null>(null);

  const save = async () => {
    if (!name.trim()) return;
    setLoading(true); setError(null);
    const { data: { user } } = await supabase.auth.getUser();
    const { error: e } = await supabase.from('projects').insert({
      name: name.trim(), address: address.trim()||null,
      client_name: client.trim()||null, status: 'active', manager_id: user?.id,
    });
    setLoading(false);
    if (e) { setError(JSON.stringify(e)); return; }
    navigation.goBack();
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS==='ios'?'padding':'height'} style={{flex:1,backgroundColor:C.bg}}>
      <View style={[s.header,{paddingTop:insets.top+12}]}>
        <TouchableOpacity onPress={()=>navigation.goBack()} style={s.backBtn}>
          <Ionicons name="chevron-back" size={22} color={C.text}/>
        </TouchableOpacity>
        <Text style={s.title}>Nowy projekt</Text>
        <TouchableOpacity onPress={save} disabled={loading||!name.trim()} style={[s.saveBtn,!name.trim()&&{opacity:0.4}]}>
          {loading?<ActivityIndicator color={C.primary} size="small"/>:<Text style={s.saveTxt}>Zapisz</Text>}
        </TouchableOpacity>
      </View>
      <ScrollView contentContainerStyle={s.form}>
        <Text style={s.label}>Nazwa projektu *</Text>
        <TextInput style={s.input} placeholder="np. Osiedle Zielona Górka" placeholderTextColor={C.textDim} value={name} onChangeText={setName}/>
        <Text style={s.label}>Adres budowy</Text>
        <TextInput style={s.input} placeholder="ul. Polna 12, Warszawa" placeholderTextColor={C.textDim} value={address} onChangeText={setAddress}/>
        <Text style={s.label}>Klient / inwestor</Text>
        <TextInput style={s.input} placeholder="opcjonalnie" placeholderTextColor={C.textDim} value={client} onChangeText={setClient}/>
        {error&&<Text style={{color:C.danger,fontSize:13,fontWeight:'600'}}>{error}</Text>}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
const s = StyleSheet.create({
  header:{flexDirection:'row',alignItems:'center',paddingHorizontal:16,paddingBottom:12,borderBottomWidth:1,borderColor:C.line},
  backBtn:{width:44,height:44,borderRadius:12,backgroundColor:C.surface,borderWidth:1,borderColor:C.line,alignItems:'center',justifyContent:'center'},
  title:{flex:1,textAlign:'center',fontSize:17,fontWeight:'700',color:C.text},
  saveBtn:{paddingHorizontal:16,height:44,alignItems:'center',justifyContent:'center'},
  saveTxt:{color:C.primary,fontSize:16,fontWeight:'700'},
  form:{padding:20,gap:6},
  label:{fontSize:13,fontWeight:'700',color:C.textMid,marginBottom:4,marginTop:8},
  input:{backgroundColor:C.surface,borderWidth:1,borderColor:C.line,borderRadius:14,paddingHorizontal:16,paddingVertical:14,color:C.text,fontSize:15},
});
