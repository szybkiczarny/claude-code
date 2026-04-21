import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, ActivityIndicator, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../lib/supabase';
import { C } from '../theme';

export default function AuthScreen() {
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mode, setMode] = useState<'login'|'register'>('login');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string|null>(null);

  const submit = async () => {
    if (!email.trim()||!password.trim()) return;
    setLoading(true); setError(null);
    const { error: e } = mode==='login'
      ? await supabase.auth.signInWithPassword({ email: email.trim(), password })
      : await supabase.auth.signUp({ email: email.trim(), password });
    setLoading(false);
    if (e) setError(e.message);
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS==='ios'?'padding':'height'} style={{flex:1,backgroundColor:C.bg}}>
      <ScrollView contentContainerStyle={[s.inner,{paddingTop:insets.top+32,paddingBottom:insets.bottom+32}]} keyboardShouldPersistTaps="handled">
        <Text style={s.logo}>🏗️</Text>
        <Text style={s.title}>Construct Raport</Text>
        <Text style={s.sub}>AI</Text>
        <View style={s.form}>
          <TextInput style={s.input} placeholder="E-mail" placeholderTextColor={C.textDim} value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address"/>
          <TextInput style={s.input} placeholder="Hasło" placeholderTextColor={C.textDim} value={password} onChangeText={setPassword} secureTextEntry/>
          {error&&<Text style={s.error}>{error}</Text>}
          <TouchableOpacity style={s.btn} onPress={submit} disabled={loading} activeOpacity={0.8}>
            {loading?<ActivityIndicator color={C.primaryInk}/>:<Text style={s.btnText}>{mode==='login'?'Zaloguj się':'Utwórz konto'}</Text>}
          </TouchableOpacity>
          <TouchableOpacity onPress={()=>{setMode(m=>m==='login'?'register':'login');setError(null);}}>
            <Text style={s.switch}>{mode==='login'?'Nie masz konta? Zarejestruj się':'Masz konto? Zaloguj się'}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
const s = StyleSheet.create({
  inner:{flexGrow:1,justifyContent:'center',paddingHorizontal:28},
  logo:{fontSize:56,textAlign:'center',marginBottom:8},
  title:{fontSize:28,fontWeight:'800',color:C.text,textAlign:'center',letterSpacing:-0.5},
  sub:{fontSize:16,fontWeight:'700',color:C.primary,textAlign:'center',marginBottom:40},
  form:{gap:12},
  input:{backgroundColor:C.surface,borderWidth:1,borderColor:C.line,borderRadius:14,paddingHorizontal:16,paddingVertical:14,color:C.text,fontSize:16},
  error:{color:C.danger,fontSize:13,fontWeight:'600',textAlign:'center'},
  btn:{backgroundColor:C.primary,borderRadius:14,paddingVertical:16,alignItems:'center',marginTop:4},
  btnText:{color:C.primaryInk,fontSize:16,fontWeight:'800'},
  switch:{color:C.primary,fontSize:14,fontWeight:'600',textAlign:'center',marginTop:8},
});
