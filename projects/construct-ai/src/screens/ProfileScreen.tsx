import { useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, ActivityIndicator, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../lib/supabase';
import { C } from '../theme';
import type { User } from '@supabase/supabase-js';

export default function ProfileScreen({ navigation }: { navigation: any }) {
  const insets = useSafeAreaInsets();
  const [user, setUser] = useState<User|null>(null);
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) { setUser(data.user); setName(data.user.user_metadata?.full_name ?? ''); }
    });
  }, []);

  const save = async () => {
    setSaving(true);
    await supabase.auth.updateUser({ data: { full_name: name.trim() } });
    setSaving(false);
    navigation.goBack();
  };

  const logout = () => Alert.alert('Wyloguj','Czy na pewno chcesz się wylogować?',[
    { text:'Anuluj', style:'cancel' },
    { text:'Wyloguj', style:'destructive', onPress: ()=>supabase.auth.signOut() },
  ]);

  const initials = name.trim() ? name.trim().split(/\s+/).map((w: string) => w[0]?.toUpperCase()).slice(0,2).join('') : (user?.email?.[0]?.toUpperCase() ?? '?');

  return (
    <KeyboardAvoidingView behavior={Platform.OS==='ios'?'padding':'height'} style={{flex:1,backgroundColor:C.bg}}>
      <View style={[s.header,{paddingTop:insets.top+12}]}>
        <TouchableOpacity onPress={()=>navigation.goBack()} style={s.backBtn}><Ionicons name="chevron-back" size={22} color={C.text}/></TouchableOpacity>
        <Text style={s.title}>Profil</Text>
        <TouchableOpacity onPress={save} style={s.saveBtn}>{saving?<ActivityIndicator color={C.primary} size="small"/>:<Text style={s.saveTxt}>Zapisz</Text>}</TouchableOpacity>
      </View>
      <View style={s.body}>
        <View style={s.avatar}><Text style={s.avatarText}>{initials}</Text></View>
        <Text style={s.email}>{user?.email}</Text>
        <View style={{width:'100%',gap:6}}>
          <Text style={s.label}>Imię i nazwisko</Text>
          <TextInput style={s.input} placeholder="Jan Kowalski" placeholderTextColor={C.textDim} value={name} onChangeText={setName}/>
        </View>
        <TouchableOpacity style={s.logoutBtn} onPress={logout}>
          <Ionicons name="log-out-outline" size={20} color={C.danger}/>
          <Text style={{color:C.danger,fontSize:15,fontWeight:'700'}}>Wyloguj się</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}
const s = StyleSheet.create({
  header:{flexDirection:'row',alignItems:'center',paddingHorizontal:16,paddingBottom:12,borderBottomWidth:1,borderColor:C.line},
  backBtn:{width:44,height:44,borderRadius:12,backgroundColor:C.surface,borderWidth:1,borderColor:C.line,alignItems:'center',justifyContent:'center'},
  title:{flex:1,textAlign:'center',fontSize:17,fontWeight:'700',color:C.text},
  saveBtn:{paddingHorizontal:16,height:44,alignItems:'center',justifyContent:'center'},
  saveTxt:{color:C.primary,fontSize:16,fontWeight:'700'},
  body:{flex:1,alignItems:'center',padding:24,gap:20},
  avatar:{width:88,height:88,borderRadius:44,backgroundColor:C.primary,alignItems:'center',justifyContent:'center'},
  avatarText:{fontSize:32,fontWeight:'800',color:C.primaryInk},
  email:{fontSize:14,color:C.textMid,fontWeight:'600'},
  label:{fontSize:13,fontWeight:'700',color:C.textMid},
  input:{backgroundColor:C.surface,borderWidth:1,borderColor:C.line,borderRadius:14,paddingHorizontal:16,paddingVertical:14,color:C.text,fontSize:15,width:'100%'},
  logoutBtn:{flexDirection:'row',alignItems:'center',gap:10,marginTop:'auto',paddingVertical:14,paddingHorizontal:24,backgroundColor:C.danger+'1A',borderRadius:14,borderWidth:1,borderColor:C.danger+'33'},
});
