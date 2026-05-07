import { useState, useEffect } from 'react';
import { View, Text, ScrollView, ActivityIndicator, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { C } from '../../theme';
import { ts } from './shared';
import { geocodeAddress, fetchWeekForecast, type DayForecast } from '../../lib/weather';

const DAYS_PL = ['Nd','Pn','Wt','Śr','Cz','Pt','Sb'];

function fDay(dateStr: string) {
  const d = new Date(dateStr);
  const today = new Date();
  if (d.toDateString() === today.toDateString()) return 'Dziś';
  const tom = new Date(); tom.setDate(tom.getDate() + 1);
  if (d.toDateString() === tom.toDateString()) return 'Jutro';
  return DAYS_PL[d.getDay()];
}

export default function WeatherTab({ address, refreshing, onRefresh }: {
  address: string; refreshing?: boolean; onRefresh?: ()=>void;
}) {
  const [forecast, setForecast] = useState<DayForecast[]>([]);
  const [loading, setLoading] = useState(true);
  const [locationName, setLocationName] = useState('');
  const [error, setError] = useState<string|null>(null);

  useEffect(() => {
    if (!address) { setError('Brak adresu projektu'); setLoading(false); return; }
    setLoading(true); setError(null);
    geocodeAddress(address)
      .then(coords => {
        if (!coords) { setError('Nie znaleziono lokalizacji dla adresu projektu'); setLoading(false); return; }
        setLocationName(address.split(',').slice(0,2).join(','));
        return fetchWeekForecast(coords.lat, coords.lng);
      })
      .then(days => { if (days) setForecast(days); setLoading(false); })
      .catch(() => { setError('Błąd pobierania pogody'); setLoading(false); });
  }, [address]);

  if (loading) return <View style={{ flex:1, alignItems:'center', justifyContent:'center' }}><ActivityIndicator color={C.primary} size="large"/><Text style={{ color:C.textMid, marginTop:12, fontSize:13 }}>Pobieranie prognozy…</Text></View>;
  if (error) return <View style={{ flex:1, alignItems:'center', justifyContent:'center', padding:32, gap:10 }}><Ionicons name="cloud-offline-outline" size={48} color={C.textDim}/><Text style={{ color:C.text, fontSize:16, fontWeight:'700', textAlign:'center' }}>{error}</Text></View>;

  const today = forecast[0];
  return (
    <ScrollView contentContainerStyle={{ padding:16, gap:14, paddingBottom:120 }} refreshControl={<RefreshControl refreshing={refreshing ?? false} onRefresh={onRefresh} tintColor={C.primary}/>}>
      <View style={{ flexDirection:'row', alignItems:'center', gap:6 }}>
        <Ionicons name="location-outline" size={14} color={C.textMid}/>
        <Text style={{ fontSize:12, color:C.textMid, flex:1 }} numberOfLines={1}>{locationName}</Text>
      </View>
      {today && (
        <View style={[ts.statsCard, { alignItems:'center', gap:8 }]}>
          <Text style={{ fontSize:64, lineHeight:76 }}>{today.icon}</Text>
          <Text style={{ fontSize:42, fontWeight:'800', color:C.text }}>{today.maxTemp}°</Text>
          <Text style={{ fontSize:14, color:C.textMid, fontWeight:'600' }}>{today.label}</Text>
          <View style={{ flexDirection:'row', gap:20, marginTop:4 }}>
            {[{ label:'MIN', val:today.minTemp, color:C.info },{ label:'MAX', val:today.maxTemp, color:C.danger },{ label:'DESZCZ', val:`${today.precipitation} mm`, color:today.precipitation>0?C.info:C.success }].map(({ label, val, color }) => (
              <View key={label} style={{ alignItems:'center' }}>
                <Text style={{ fontSize:11, color:C.textMid, textTransform:'uppercase', letterSpacing:0.8, fontWeight:'700' }}>{label}</Text>
                <Text style={{ fontSize:18, fontWeight:'700', color }}>{val}</Text>
              </View>
            ))}
          </View>
        </View>
      )}
      <Text style={ts.sectionLabel}>PROGNOZA 7 DNI</Text>
      <View style={[ts.statsCard, { gap:0 }]}>
        {forecast.map((day, i) => (
          <View key={day.date} style={[{ flexDirection:'row', alignItems:'center', padding:12, gap:10 }, i < forecast.length-1 && { borderBottomWidth:1, borderColor:C.line }]}>
            <Text style={{ width:36, fontSize:13, fontWeight:'700', color:i===0?C.primary:C.text }}>{fDay(day.date)}</Text>
            <Text style={{ fontSize:24, width:36 }}>{day.icon}</Text>
            <Text style={{ flex:1, fontSize:12, color:C.textMid }} numberOfLines={1}>{day.label}</Text>
            {day.precipitation > 0 && (
              <View style={{ flexDirection:'row', alignItems:'center', gap:3, marginRight:8 }}>
                <Ionicons name="rainy-outline" size={12} color={C.info}/>
                <Text style={{ fontSize:11, color:C.info, fontWeight:'700' }}>{day.precipitation}mm</Text>
              </View>
            )}
            <Text style={{ fontSize:13, color:C.info, fontWeight:'700', width:28, textAlign:'right' }}>{day.minTemp}°</Text>
            <Text style={{ fontSize:13, color:C.danger, fontWeight:'700', width:28, textAlign:'right' }}>{day.maxTemp}°</Text>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}
