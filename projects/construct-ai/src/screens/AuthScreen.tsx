import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, ActivityIndicator, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../lib/supabase';
import { C } from '../theme';

type Mode = 'login' | 'register' | 'reset';

export default function AuthScreen() {
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mode, setMode] = useState<Mode>('login');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [registered, setRegistered] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  const submit = async () => {
    if (!email.trim()) return;
    setLoading(true); setError(null);

    if (mode === 'reset') {
      const { error: e } = await supabase.auth.resetPasswordForEmail(email.trim());
      setLoading(false);
      if (e) setError(e.message);
      else setResetSent(true);
      return;
    }

    if (!password.trim()) { setLoading(false); return; }

    if (mode === 'login') {
      const { error: e } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      setLoading(false);
      if (e) setError(e.message);
    } else {
      const { error: e } = await supabase.auth.signUp({ email: email.trim(), password });
      setLoading(false);
      if (e) setError(e.message);
      else setRegistered(true);
    }
  };

  const switchMode = (next: Mode) => { setMode(next); setError(null); setResetSent(false); };

  /* ── Po rejestracji ── */
  if (registered) return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1, backgroundColor: C.bg }}>
      <ScrollView contentContainerStyle={[s.inner, { paddingTop: insets.top + 32, paddingBottom: insets.bottom + 32 }]}>
        <Text style={s.logo}>🏗️</Text>
        <Text style={s.title}>Construct Raport</Text>
        <Text style={s.sub}>AI</Text>
        <View style={s.confirmBox}>
          <Text style={s.confirmIcon}>📧</Text>
          <Text style={s.confirmTitle}>Sprawdź skrzynkę!</Text>
          <Text style={s.confirmSub}>Wysłaliśmy link aktywacyjny na{'\n'}<Text style={s.confirmEmail}>{email}</Text></Text>
          <Text style={s.confirmHint}>Kliknij link w emailu, a następnie wróć tu i zaloguj się.</Text>
          <TouchableOpacity style={s.btn} onPress={() => { setRegistered(false); switchMode('login'); }} activeOpacity={0.8}>
            <Text style={s.btnText}>Przejdź do logowania</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );

  /* ── Po resecie hasła ── */
  if (resetSent) return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1, backgroundColor: C.bg }}>
      <ScrollView contentContainerStyle={[s.inner, { paddingTop: insets.top + 32, paddingBottom: insets.bottom + 32 }]}>
        <Text style={s.logo}>🏗️</Text>
        <Text style={s.title}>Construct Raport</Text>
        <Text style={s.sub}>AI</Text>
        <View style={s.confirmBox}>
          <Text style={s.confirmIcon}>🔑</Text>
          <Text style={s.confirmTitle}>Email wysłany!</Text>
          <Text style={s.confirmSub}>Sprawdź skrzynkę na{'\n'}<Text style={s.confirmEmail}>{email}</Text></Text>
          <Text style={s.confirmHint}>Kliknij link w emailu żeby ustawić nowe hasło.</Text>
          <TouchableOpacity style={s.btn} onPress={() => switchMode('login')} activeOpacity={0.8}>
            <Text style={s.btnText}>Wróć do logowania</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1, backgroundColor: C.bg }}>
      <ScrollView contentContainerStyle={[s.inner, { paddingTop: insets.top + 32, paddingBottom: insets.bottom + 32 }]} keyboardShouldPersistTaps="handled">
        <Text style={s.logo}>🏗️</Text>
        <Text style={s.title}>Construct Raport</Text>
        <Text style={s.sub}>AI</Text>

        <View style={s.form}>
          <TextInput
            style={s.input}
            placeholder="E-mail"
            placeholderTextColor={C.textDim}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
          />
          {mode !== 'reset' && (
            <TextInput
              style={s.input}
              placeholder="Hasło"
              placeholderTextColor={C.textDim}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />
          )}
          {error && <Text style={s.error}>{error}</Text>}

          <TouchableOpacity style={s.btn} onPress={submit} disabled={loading} activeOpacity={0.8}>
            {loading
              ? <ActivityIndicator color={C.primaryInk} />
              : <Text style={s.btnText}>
                  {mode === 'login' ? 'Zaloguj się' : mode === 'register' ? 'Utwórz konto' : 'Wyślij link resetujący'}
                </Text>
            }
          </TouchableOpacity>

          {mode === 'login' && (
            <>
              <TouchableOpacity onPress={() => switchMode('register')}>
                <Text style={s.switch}>Nie masz konta? Zarejestruj się</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => switchMode('reset')}>
                <Text style={s.forgot}>Nie pamiętam hasła</Text>
              </TouchableOpacity>
            </>
          )}
          {mode === 'register' && (
            <TouchableOpacity onPress={() => switchMode('login')}>
              <Text style={s.switch}>Masz konto? Zaloguj się</Text>
            </TouchableOpacity>
          )}
          {mode === 'reset' && (
            <TouchableOpacity onPress={() => switchMode('login')}>
              <Text style={s.switch}>Wróć do logowania</Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  inner: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: 28 },
  logo: { fontSize: 56, textAlign: 'center', marginBottom: 8 },
  title: { fontSize: 28, fontWeight: '800', color: C.text, textAlign: 'center', letterSpacing: -0.5 },
  sub: { fontSize: 16, fontWeight: '700', color: C.primary, textAlign: 'center', marginBottom: 40 },
  form: { gap: 12 },
  input: { backgroundColor: C.surface, borderWidth: 1, borderColor: C.line, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 14, color: C.text, fontSize: 16 },
  error: { color: C.danger, fontSize: 13, fontWeight: '600', textAlign: 'center' },
  btn: { backgroundColor: C.primary, borderRadius: 14, paddingVertical: 16, alignItems: 'center', marginTop: 4 },
  btnText: { color: C.primaryInk, fontSize: 16, fontWeight: '800' },
  switch: { color: C.primary, fontSize: 14, fontWeight: '600', textAlign: 'center', marginTop: 8 },
  forgot: { color: C.textDim, fontSize: 13, fontWeight: '600', textAlign: 'center', marginTop: 4 },
  confirmBox: { gap: 16, alignItems: 'center' },
  confirmIcon: { fontSize: 56, textAlign: 'center' },
  confirmTitle: { fontSize: 22, fontWeight: '800', color: C.text, textAlign: 'center' },
  confirmSub: { fontSize: 15, color: C.textMid, textAlign: 'center', lineHeight: 22 },
  confirmEmail: { color: C.primary, fontWeight: '700' },
  confirmHint: { fontSize: 13, color: C.textDim, textAlign: 'center', lineHeight: 19, paddingHorizontal: 8 },
});
