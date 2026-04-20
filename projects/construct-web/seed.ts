import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://umrgtstdxbcguubxklgf.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVtcmd0c3RkeGJjZ3V1YnhrbGdmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY2MTA5NzMsImV4cCI6MjA5MjE4Njk3M30.CbwosSJ8U6B68rQYhELWBh0YTOIjQgwLnqd2bsfAhoA'
);

const projects = [
  { name: 'Osiedle Zielona Górka', address: 'ul. Polna 12, Warszawa', client_name: 'Develia S.A.', status: 'active' },
  { name: 'Centrum Handlowe Nowa Brama', address: 'al. Krakowska 45, Kraków', client_name: 'Atrium Poland', status: 'active' },
  { name: 'Biurowiec Prosta Tower', address: 'ul. Prosta 20, Warszawa', client_name: 'HB Reavis', status: 'paused' },
  { name: 'Hala Magazynowa Logistix', address: 'ul. Przemysłowa 3, Łódź', client_name: 'Panattoni', status: 'completed' },
];

const { data, error } = await supabase.from('projects').insert(projects).select();
if (error) console.error('Błąd:', error.message);
else console.log('Dodano projektów:', data.length);
