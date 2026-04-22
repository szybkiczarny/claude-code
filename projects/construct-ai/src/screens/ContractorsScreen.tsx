import { useCallback, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, TextInput, Linking, Alert } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import { C } from '../theme';
import type { Contractor } from '../types';

const TRADES = ['Murarz','Elektryk','Hydraulik','Dekarz','Tynkarz','Stolarz','Malarz','Spawacz','Glazurnik','Inny'];

export default function ContractorsScreen({ navigation, route }: { navigation: any; route: any }) {
  const insets = useSafeAreaInsets();
  const { projectId, projectName } = route.params;
  const [contractors, setContractors] = useState<Contractor[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [trade, setTrade] = useState('');

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from('contractors').select('*').eq('project_id', projectId).order('name');
    if (data) setContractors(data);
    setLoading(false);
  };

  useFocusEffect(useCallback(() => { load(); }, []));

  const save = async () => {
    if (!name.trim()) return;
    setSaving(true);
    await supabase.from('contractors').insert({
      project_id: projectId,
      name: name.trim(),
      email: email.trim() || null,
      phone: phone.trim() || null,
      trade: trade || null,
    });
    setSaving(false);
    setName(''); setEmail(''); setPhone(''); setTrade('');
    setAdding(false);
    load();
  };

  const deleteContractor = (c: Contractor) => {
    Alert.alert('Usuń kontrahenta', `Usunąć ${c.name}?`, [
      { text: 'Anuluj', style: 'cancel' },
      { text: 'Usuń', style: 'destructive', onPress: async () => {
        await supabase.from('contractors').delete().eq('id', c.id);
        load();
      }},
    ]);
  };

  return (
    <View style={s.root}>
      <View style={[s.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={22} color={C.text} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={s.headerSub}>{projectName}</Text>
          <Text style={s.headerTitle}>Kontrahenci</Text>
        </View>
        <TouchableOpacity style={[s.backBtn, { backgroundColor: C.primary }]} onPress={() => setAdding(v => !v)}>
          <Ionicons name={adding ? 'close' : 'add'} size={22} color={C.primaryInk} />
        </TouchableOpacity>
      </View>

      {adding && (
        <View style={s.form}>
          <TextInput style={s.input} placeholder="Nazwa firmy / nazwisko *" placeholderTextColor={C.textDim} value={name} onChangeText={setName} />
          <TextInput style={s.input} placeholder="Telefon" placeholderTextColor={C.textDim} value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
          <TextInput style={s.input} placeholder="Email" placeholderTextColor={C.textDim} value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
          <Text style={s.sectionLabel}>BRANŻA</Text>
          <View style={s.tradesRow}>
            {TRADES.map(t => (
              <TouchableOpacity key={t} style={[s.tradeChip, trade === t && s.tradeChipActive]} onPress={() => setTrade(t === trade ? '' : t)}>
                <Text style={[s.tradeText, trade === t && s.tradeTextActive]}>{t}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <TouchableOpacity style={s.saveBtn} onPress={save} disabled={saving || !name.trim()}>
            {saving ? <ActivityIndicator color={C.primaryInk} /> : <Text style={s.saveBtnText}>Zapisz kontrahenta</Text>}
          </TouchableOpacity>
        </View>
      )}

      {loading
        ? <ActivityIndicator color={C.primary} style={{ marginTop: 40 }} size="large" />
        : <FlatList
            data={contractors}
            keyExtractor={c => c.id}
            contentContainerStyle={{ padding: 16, gap: 10, paddingBottom: 120 }}
            ListEmptyComponent={
              <View style={s.empty}>
                <Ionicons name="business-outline" size={48} color={C.textDim} />
                <Text style={s.emptyTitle}>Brak kontrahentów</Text>
                <Text style={s.emptySub}>Kliknij + żeby dodać pierwszego</Text>
              </View>
            }
            renderItem={({ item: c }) => (
              <View style={s.card}>
                <View style={[s.tradeIcon, { backgroundColor: C.primary + '26' }]}>
                  <Ionicons name="business-outline" size={20} color={C.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.cardName}>{c.name}</Text>
                  {c.trade && <Text style={s.cardTrade}>{c.trade}</Text>}
                  <View style={{ flexDirection: 'row', gap: 10, marginTop: 6, flexWrap: 'wrap' }}>
                    {c.phone && (
                      <TouchableOpacity style={s.contactBtn} onPress={() => Linking.openURL(`tel:${c.phone}`)}>
                        <Ionicons name="call-outline" size={13} color={C.success} />
                        <Text style={[s.contactText, { color: C.success }]}>{c.phone}</Text>
                      </TouchableOpacity>
                    )}
                    {c.phone && (
                      <TouchableOpacity style={s.contactBtn} onPress={() => Linking.openURL(`whatsapp://send?phone=${c.phone}`)}>
                        <Ionicons name="logo-whatsapp" size={13} color="#25D366" />
                        <Text style={[s.contactText, { color: '#25D366' }]}>WhatsApp</Text>
                      </TouchableOpacity>
                    )}
                    {c.email && (
                      <TouchableOpacity style={s.contactBtn} onPress={() => Linking.openURL(`mailto:${c.email}`)}>
                        <Ionicons name="mail-outline" size={13} color={C.primary} />
                        <Text style={[s.contactText, { color: C.primary }]}>{c.email}</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
                <TouchableOpacity onPress={() => deleteContractor(c)} style={{ padding: 8 }}>
                  <Ionicons name="trash-outline" size={18} color={C.danger} />
                </TouchableOpacity>
              </View>
            )}
          />
      }
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingBottom: 12 },
  backBtn: { width: 44, height: 44, borderRadius: 12, backgroundColor: C.surface, borderWidth: 1, borderColor: C.line, alignItems: 'center', justifyContent: 'center' },
  headerSub: { fontSize: 11, color: C.textMid, textTransform: 'uppercase', letterSpacing: 1.2, fontWeight: '700' },
  headerTitle: { fontSize: 22, fontWeight: '800', color: C.text },
  form: { marginHorizontal: 16, backgroundColor: C.surface, borderWidth: 1, borderColor: C.line, borderRadius: 16, padding: 16, gap: 10, marginBottom: 8 },
  input: { backgroundColor: C.surfaceHi, borderWidth: 1, borderColor: C.line, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, color: C.text, fontSize: 14 },
  sectionLabel: { fontSize: 11, color: C.textMid, textTransform: 'uppercase', letterSpacing: 1.2, fontWeight: '700', marginTop: 4 },
  tradesRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tradeChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, backgroundColor: C.surfaceHi, borderWidth: 1, borderColor: C.line },
  tradeChipActive: { backgroundColor: C.primary + '26', borderColor: C.primary + '66' },
  tradeText: { fontSize: 12, fontWeight: '600', color: C.textMid },
  tradeTextActive: { color: C.primary },
  saveBtn: { backgroundColor: C.primary, borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 4 },
  saveBtnText: { color: C.primaryInk, fontWeight: '800', fontSize: 15 },
  empty: { alignItems: 'center', paddingTop: 60, gap: 10 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: C.text },
  emptySub: { fontSize: 13, color: C.textDim },
  card: { backgroundColor: C.surface, borderWidth: 1, borderColor: C.line, borderRadius: 14, padding: 14, flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  tradeIcon: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  cardName: { fontSize: 15, fontWeight: '700', color: C.text },
  cardTrade: { fontSize: 11, color: C.textMid, marginTop: 2, textTransform: 'uppercase', letterSpacing: 0.8, fontWeight: '600' },
  contactBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999, backgroundColor: C.surfaceHi, borderWidth: 1, borderColor: C.line },
  contactText: { fontSize: 11, fontWeight: '700' },
});
