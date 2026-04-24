const WMO: Record<number, { label: string; icon: string }> = {
  0:  { label: 'Bezchmurnie',         icon: '☀️' },
  1:  { label: 'Głównie słonecznie',  icon: '🌤️' },
  2:  { label: 'Częściowe chmury',    icon: '⛅' },
  3:  { label: 'Zachmurzone',         icon: '☁️' },
  45: { label: 'Mgła',                icon: '🌫️' },
  48: { label: 'Mgła',                icon: '🌫️' },
  51: { label: 'Mżawka',              icon: '🌦️' },
  53: { label: 'Mżawka',              icon: '🌦️' },
  55: { label: 'Mżawka',              icon: '🌦️' },
  61: { label: 'Lekki deszcz',        icon: '🌧️' },
  63: { label: 'Deszcz',              icon: '🌧️' },
  65: { label: 'Ulewa',               icon: '🌧️' },
  71: { label: 'Lekki śnieg',         icon: '🌨️' },
  73: { label: 'Śnieg',               icon: '❄️' },
  75: { label: 'Zawieja',             icon: '❄️' },
  80: { label: 'Przelotne deszcze',   icon: '🌦️' },
  81: { label: 'Deszcze',             icon: '🌧️' },
  82: { label: 'Gwałtowne deszcze',   icon: '⛈️' },
  85: { label: 'Śnieg',               icon: '🌨️' },
  95: { label: 'Burza',               icon: '⛈️' },
  96: { label: 'Burza z gradem',      icon: '⛈️' },
  99: { label: 'Burza z gradem',      icon: '⛈️' },
};

export interface DayForecast {
  date: string;
  maxTemp: number;
  minTemp: number;
  precipitation: number;
  code: number;
  label: string;
  icon: string;
}

export async function geocodeAddress(address: string): Promise<{ lat: number; lng: number } | null> {
  try {
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(address)}&format=json&limit=1`;
    const res = await fetch(url, { headers: { 'User-Agent': 'ConstructAI/1.0' } });
    const data = await res.json();
    if (!data.length) return null;
    return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
  } catch {
    return null;
  }
}

export async function fetchWeekForecast(lat: number, lng: number): Promise<DayForecast[]> {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,weathercode&timezone=auto&forecast_days=7`;
  const res = await fetch(url);
  const data = await res.json();
  const { time, temperature_2m_max, temperature_2m_min, precipitation_sum, weathercode } = data.daily;
  return (time as string[]).map((date, i) => ({
    date,
    maxTemp: Math.round(temperature_2m_max[i]),
    minTemp: Math.round(temperature_2m_min[i]),
    precipitation: Math.round((precipitation_sum[i] ?? 0) * 10) / 10,
    code: weathercode[i],
    ...(WMO[weathercode[i]] ?? { label: 'Brak danych', icon: '❓' }),
  }));
}
