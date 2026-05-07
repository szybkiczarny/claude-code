import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { C } from '../../theme';

export default function EmptyState({ icon, title, sub }: { icon: string; title: string; sub: string }) {
  return (
    <View style={{ alignItems:'center', paddingTop:48, gap:10 }}>
      <Ionicons name={icon as any} size={48} color={C.textDim}/>
      <Text style={{ fontSize:16, fontWeight:'700', color:C.text }}>{title}</Text>
      <Text style={{ fontSize:13, color:C.textDim, textAlign:'center' }}>{sub}</Text>
    </View>
  );
}
