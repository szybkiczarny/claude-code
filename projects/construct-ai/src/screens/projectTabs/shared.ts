import { StyleSheet } from 'react-native';
import { C } from '../../theme';

export const ts = StyleSheet.create({
  root:           { flex:1, backgroundColor:C.bg },
  listCard:       { backgroundColor:C.surface, borderWidth:1, borderColor:C.line, borderRadius:14, overflow:'hidden' },
  listCardInner:  { padding:14, flexDirection:'row', alignItems:'center', gap:12 },
  listCardTitle:  { fontSize:14, fontWeight:'700', color:C.text },
  listCardSub:    { fontSize:11, color:C.textMid, marginTop:2 },
  iconBox:        { width:44, height:44, borderRadius:12, alignItems:'center', justifyContent:'center' },
  statusBadge:    { flexDirection:'row', alignItems:'center', paddingHorizontal:8, paddingVertical:4, borderRadius:999, borderWidth:1 },
  statusText:     { fontSize:11, fontWeight:'700' },
  filterChip:     { paddingHorizontal:12, paddingVertical:7, borderRadius:999, backgroundColor:C.surface, borderWidth:1, borderColor:C.line },
  filterChipActive:{ backgroundColor:C.primary, borderColor:C.primary },
  filterText:     { fontSize:12, fontWeight:'700', color:C.textMid },
  filterTextActive:{ color:C.primaryInk },
  statusBtn:      { paddingHorizontal:10, paddingVertical:4, borderRadius:999, borderWidth:1, minWidth:90, alignItems:'center' },
  statusBtnText:  { fontSize:11, fontWeight:'700' },
  checkBox:       { width:24, height:24, borderRadius:6, borderWidth:2, borderColor:C.line, alignItems:'center', justifyContent:'center' },
  delegateBtn:    { width:34, height:34, borderRadius:10, backgroundColor:C.primary, alignItems:'center', justifyContent:'center' },
  fab:            { position:'absolute', bottom:24, right:20, width:56, height:56, borderRadius:28, backgroundColor:C.primary, alignItems:'center', justifyContent:'center', shadowColor:'#000', shadowOffset:{width:0,height:4}, shadowOpacity:0.3, shadowRadius:6, elevation:8 },
  modalOverlay:   { flex:1, backgroundColor:'rgba(0,0,0,0.6)', justifyContent:'flex-end' },
  sheet:          { backgroundColor:C.surface, borderTopLeftRadius:24, borderTopRightRadius:24, padding:24, paddingBottom:40 },
  sheetHandle:    { width:40, height:4, backgroundColor:C.line, borderRadius:2, alignSelf:'center', marginBottom:20 },
  sheetSub:       { fontSize:11, color:C.textMid, textTransform:'uppercase', letterSpacing:1.4, fontWeight:'700', marginBottom:6 },
  sheetTitle:     { fontSize:16, fontWeight:'800', color:C.text, marginBottom:14 },
  sheetActions:   { flexDirection:'row', justifyContent:'space-around', marginTop:8 },
  sheetAction:    { alignItems:'center', gap:8 },
  sheetIconBox:   { width:56, height:56, borderRadius:16, alignItems:'center', justifyContent:'center' },
  sheetActionLabel:{ fontSize:11, fontWeight:'700', color:C.textMid },
  autoBadge:      { backgroundColor:C.surfaceHi, borderRadius:6, paddingHorizontal:6, paddingVertical:2 },
  autoText:       { fontSize:10, fontWeight:'700', color:C.textDim },
  qtyBadge:       { backgroundColor:C.primary+'26', borderRadius:999, paddingHorizontal:8, paddingVertical:3, borderWidth:1, borderColor:C.primary+'4D' },
  qtyText:        { fontSize:11, fontWeight:'700', color:C.primary },
  input:          { backgroundColor:C.surfaceHi, borderWidth:1, borderColor:C.line, borderRadius:12, paddingHorizontal:14, paddingVertical:12, color:C.text, fontSize:14 },
  sectionLabel:   { fontSize:11, color:C.textMid, textTransform:'uppercase', letterSpacing:1.4, fontWeight:'700' },
  recordBtn:      { backgroundColor:C.primary, borderRadius:14, paddingVertical:14, flexDirection:'row', alignItems:'center', justifyContent:'center', gap:8, marginBottom:2 },
  statsCard:      { marginHorizontal:16, marginBottom:10, backgroundColor:C.surface, borderWidth:1, borderColor:C.line, borderRadius:16, padding:16 },
  progressBg:     { height:8, backgroundColor:C.line, borderRadius:4, overflow:'hidden', marginBottom:14 },
  progressFill:   { height:'100%', backgroundColor:C.primary, borderRadius:4 },
});

export function sLabel(s: string) { return s==='open'?'Otwarta':s==='in_progress'?'W toku':'Naprawiona'; }
export function sColor(s: string) { return s==='open'?C.danger:s==='in_progress'?C.warning:C.success; }
export const NEXT_STATUS: Record<string,string> = { open:'in_progress', in_progress:'resolved', resolved:'open' };
export const NEXT_LABEL:  Record<string,string> = { open:'Rozpocznij',  in_progress:'Naprawione', resolved:'Otwórz ponownie' };

export function decode(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}
