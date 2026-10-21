/* KrishiDost – app.js (v4, debugged and recomposed)
 *
 * Free / open data sources (no paid keys required):
 *  - Weather forecast ........ Open-Meteo (open-source, CC-BY)
 *  - Rain map ................ RainViewer radar, with automatic fallback to NASA GIBS (GPM IMERG)
 *  - Satellite soil & sun .... NASA POWER (AG community: root-zone soil wetness, rain, sunshine)
 *  - Cyclone / flood events .. NASA EONET (open natural-event tracker)
 *  - River-flow flood signal . Open-Meteo Flood API (Copernicus GloFAS)
 *  - Mandi prices ............ Agmarknet via /api/mandi, with direct fallback to data.gov.in (Govt. of India)
 *  - Farm news ............... Google News RSS via /api/news, with rss2json fallback
 *  - Map ..................... Leaflet + OpenStreetMap / CARTO tiles
 *  - Reverse geocode ......... Nominatim, with BigDataCloud fallback
 *
 * Note: ISRO Bhuvan and IMD do not offer open, browser-callable (CORS) weather APIs,
 * so they are not called directly. The UI points farmers to IMD / CWC for official warnings.
 */
(() => {
  'use strict';

  /* ───────────────────────── Config ───────────────────────── */

  const STORAGE_KEY = 'krishidost:v4';
  const REFRESH_MS = 30 * 60 * 1000;

  // data.gov.in public sample key (rate-limited). Replace with your own free key from
  // https://data.gov.in for reliable use. The /api/mandi endpoint is tried first.
  // You can also set it without editing this file: window.KRISHIDOST_DATA_GOV_KEY = 'your-key'
  const DATA_GOV_KEY = window.KRISHIDOST_DATA_GOV_KEY
    || '579b464db66ec23bdd000001cdd3946e44ce4aad7209ff7b23ac571b';
  const MANDI_RESOURCE = '9ef84268-d588-465a-a308-a864a43d0070';
  const MANDI_COMMODITY = {
    paddy: 'Paddy(Dhan)(Common)',
    wheat: 'Wheat',
    cotton: 'Cotton',
    maize: 'Maize',
    jute: 'Jute',
    potato: 'Potato',
  };

  const PLACES = [
    { name: 'Gangadharpur, West Bengal', lat: 22.35, lon: 88.05 },
    { name: 'Kolkata, West Bengal', lat: 22.5726, lon: 88.3639 },
    { name: 'Patna, Bihar', lat: 25.5941, lon: 85.1376 },
    { name: 'Ludhiana, Punjab', lat: 30.9, lon: 75.8573 },
    { name: 'Nagpur, Maharashtra', lat: 21.1458, lon: 79.0882 },
    { name: 'Guntur, Andhra Pradesh', lat: 16.3067, lon: 80.4365 },
  ];

  const INDIAN_STATES = [
    'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh', 'Goa', 'Gujarat', 'Haryana',
    'Himachal Pradesh', 'Jharkhand', 'Karnataka', 'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur',
    'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana',
    'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal', 'NCT of Delhi', 'Delhi', 'Jammu and Kashmir',
    'Ladakh', 'Chandigarh', 'Puducherry', 'Andaman and Nicobar Islands', 'Lakshadweep',
    'Dadra and Nagar Haveli and Daman and Diu',
  ];

  /* ───────────────────────── Icons ───────────────────────── */

  const ICONS = {
    check: '<circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/>',
    alert: '<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"/><path d="M12 9v4"/><path d="M12 17h.01"/>',
    cloud: '<path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z"/>',
    bug: '<path d="m8 2 1.88 1.88"/><path d="M14.12 3.88 16 2"/><path d="M9 7.13v-1a3 3 0 1 1 6 0v1"/><path d="M12 20c-3.3 0-6-2.7-6-6v-3a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v3c0 3.3-2.7 6-6 6"/><path d="M12 20v-9"/><path d="M6.53 9C4.6 8.8 3 7.1 3 5"/><path d="M6 13H2"/><path d="M3 21c0-2.1 1.7-3.9 3.8-4"/><path d="M20.97 5c0 2.1-1.6 3.8-3.5 4"/><path d="M22 13h-4"/><path d="M17.2 17c2.1.1 3.8 1.9 3.8 4"/>',
    waves: '<path d="M2 6c.6.5 1.2 1 2.5 1C7 7 7 5 9.5 5c2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1"/><path d="M2 12c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1"/><path d="M2 18c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1"/>',
    sprout: '<path d="M7 20h10"/><path d="M10 20c5.5-2.5.8-6.4 3-10"/><path d="M9.5 9.4c1.1.8 1.8 2.2 2.3 3.7-2 .4-3.5.4-4.8-.3-1.2-.6-2.3-1.9-3-4.2 2.8-.5 4.4 0 5.5.8z"/><path d="M14.1 6a7 7 0 0 0-1.1 4c1.9-.1 3.3-.6 4.3-1.4 1-1 1.6-2.3 1.7-4.6-2.7.1-4 1-4.9 2z"/>',
    news: '<path d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 1-2 2Zm0 0a2 2 0 0 1-2-2v-9c0-1.1.9-2 2-2h2"/><path d="M18 14h-8"/><path d="M15 18h-5"/><path d="M10 6h8v4h-8V6Z"/>',
    store: '<path d="m2 7 4.41-4.41A2 2 0 0 1 7.83 2h8.34a2 2 0 0 1 1.42.59L22 7"/><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><path d="M15 22v-4a2 2 0 0 0-2-2h-2a2 2 0 0 0-2 2v4"/><path d="M2 7h20"/><path d="M22 7v3a2 2 0 0 1-2 2 2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 16 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 12 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 8 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 4 12a2 2 0 0 1-2-2V7"/>',
    volume: '<path d="M11 4.7 6.9 8.2H3v7.6h3.9L11 19.3z"/><path d="M15.5 8.5a5 5 0 0 1 0 7"/><path d="M18.5 5.5a9 9 0 0 1 0 13"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/>',
    cloudsun: '<path d="M12 2v2M4.93 4.93l1.41 1.41M20 12h2M19.07 4.93l-1.41 1.41M15.95 12.65a4 4 0 0 0-5.93-4.13"/><path d="M13 22H7a5 5 0 1 1 4.9-6H13a3 3 0 0 1 0 6Z"/>',
    rain: '<path d="M4 14.9A7 7 0 1 1 15.7 8h1.8a4.5 4.5 0 0 1 2.5 8.2"/><path d="M16 14v6M8 14v6M12 16v6"/>',
    storm: '<path d="M6 16.3A4.5 4.5 0 0 1 7.5 7.5a6 6 0 0 1 11.7 1.8A4 4 0 0 1 18 17.3"/><path d="m13 11-4 6h6l-4 6"/>',
    fog: '<path d="M4 14.9A7 7 0 1 1 15.7 8h1.8a4.5 4.5 0 0 1 2.5 8.2"/><path d="M16 17H7M17 21H9"/>',
    pin: '<path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/>',
    locate: '<circle cx="12" cy="12" r="3"/><circle cx="12" cy="12" r="8"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/>',
    refresh: '<path d="M3 12a9 9 0 0 1 15-6.7L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-15 6.7L3 16"/><path d="M3 21v-5h5"/>',
    search: '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>',
    x: '<path d="M18 6 6 18M6 6l12 12"/>',
    wind: '<path d="M17.7 7.7a2.5 2.5 0 1 1 1.8 4.3H2"/><path d="M9.6 4.6A2 2 0 1 1 11 8H2"/><path d="M12.6 19.4A2 2 0 1 0 14 16H2"/>',
    thermo: '<path d="M14 4v10.54a4 4 0 1 1-4 0V4a2 2 0 0 1 4 0Z"/>',
    droplet: '<path d="M12 22a7 7 0 0 0 7-7c0-2-1-3.9-3-5.5s-3.5-4-4-6.5c-.5 2.5-2 4.9-4 6.5C6 11.1 5 13 5 15a7 7 0 0 0 7 7z"/>',
    layers: '<path d="m12 2 10 5-10 5L2 7z"/><path d="m2 12 10 5 10-5"/><path d="m2 17 10 5 10-5"/>',
    tag: '<path d="M12.6 2.6a2 2 0 0 0-1.4-.6H4a2 2 0 0 0-2 2v7.2a2 2 0 0 0 .6 1.4l8.7 8.7a2.4 2.4 0 0 0 3.4 0l6.6-6.6a2.4 2.4 0 0 0 0-3.4z"/><circle cx="7.5" cy="7.5" r=".5"/>',
  };

  const icon = (name, size = 20) =>
    `<svg class="icon" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name] || ''}</svg>`;

  /* ───────────────────────── Translations ───────────────────────── */

  const I18N = {
    en: {
      skip: 'Skip to content',
      tagline: 'Your farming companion',
      changePlace: 'Change Place',
      mapTitle: 'Rain radar and location map',
      mapFail: 'The map could not load. Check your connection and refresh.',
      radar: 'Rain radar',
      myLocation: 'Use my location',
      mapHint: 'Tap the map to check another location.',
      radarTime: 'Radar updated {time}',
      radarNasa: 'Rain map from NASA GPM IMERG satellite data.',
      radarFail: 'Rain radar is unavailable right now.',
      locating: 'Finding your location…',
      locDenied: 'Location access was blocked. Search for your place instead.',
      locUnsupported: 'Your browser cannot share its location. Search for your place instead.',
      allClear: 'All clear',
      warning: 'Weather warning',
      statusOk: 'No severe weather signal in the available short-term forecast.',
      actionOk: 'Continue fieldwork; check weather before spraying.',
      statusWarn: 'Heavy rain or a thunderstorm is likely in the next 3 days.',
      actionWarn: 'Avoid spraying, secure harvested crops and clear drains.',
      updated: 'Updated today, {time}',
      refresh: 'Refresh',
      humidity: 'Humidity',
      feelsLike: 'Feels like {t}°C',
      live: 'Live',
      outlookTitle: '14-day disaster outlook',
      outlookClear: 'No extended rainfall extreme is forecast. Still plan drainage and safe crop storage, and check official IMD updates.',
      outlookWatch: 'About {mm} mm of rain is forecast over the next 14 days. Plan drainage, move stored grain to higher ground and follow IMD bulletins.',
      chartLabel: 'Daily rainfall for the next 14 days. Total {mm} mm.',
      chartToday: 'Today',
      chartEnd: 'Day 14',
      hazardHead: 'Open cyclone and flood events near you',
      hazardNone: 'NASA EONET lists no open cyclone or flood event near this area.',
      hazardFail: 'Could not load NASA event data right now.',
      hazardSource: 'Events: NASA EONET. Always follow IMD and district warnings.',
      yourCrop: 'Your crop',
      pestTitle: 'Pest alert for your crop',
      pestPrompt: 'Choose a crop above for crop-specific checks.',
      pestLow: 'Weather-driven pest pressure is low right now. Keep up routine scouting.',
      pestNote: 'Weather-based scouting guidance, not a confirmed outbreak.',
      riskLow: 'Low risk',
      riskHigh: 'Elevated risk',
      outlook72: '72-hour outlook',
      today: 'Today',
      tomorrow: 'Tomorrow',
      low: 'Low',
      rainChance: '{p}% chance of rain',
      floodTitle: 'Flood risk',
      floodLow: 'Low',
      floodMedium: 'Medium',
      floodHigh: 'High',
      floodText: 'Flood risk is currently {level} based on expected rainfall ({mm} mm in 3 days).',
      floodRiver: 'River flow (GloFAS) is forecast to rise about {x}× in 7 days.',
      floodNote: 'Rainfall and river-flow estimate. Follow official flood warnings from CWC and your district office.',
      nasaTitle: 'NASA satellite: soil and sunshine',
      nasaSoil: 'Root-zone soil wetness {p}%',
      nasaDry: 'Dry soil',
      nasaOk: 'Adequate moisture',
      nasaWet: 'Wet soil',
      nasaRain7: 'Rain, last 7 days: {mm} mm',
      nasaSun: 'Sunshine: {v} kWh/m² per day',
      nasaTemp: 'Average temperature: {t}°C',
      nasaDate: 'Latest data: {date}',
      nasaIrrigate: 'Soil is dry and little rain is forecast. Plan irrigation.',
      nasaHold: 'Soil is already wet. Hold irrigation and keep drains clear.',
      nasaFine: 'Soil moisture looks adequate. Irrigate only if crops show stress.',
      nasaFail: 'NASA POWER data is unavailable right now.',
      nasaSource: 'Source: NASA POWER (satellite and model data, usually a few days behind). Field conditions can differ.',
      adviceTitle: 'KrishiDost advice',
      advicePrompt: 'Choose a crop above to see your advice.',
      newsTitle: 'Agri news and updates',
      newsEmpty: 'No recent farm stories found for this area.',
      newsFail: 'Could not load the latest news.',
      newsSource: 'Headlines from Google News. Tap a story to read it on the publisher’s site.',
      mandiTitle: 'Local mandi prices',
      mandiPrompt: 'Choose a crop above to see today’s mandi prices.',
      mandiNoState: 'Pick a place in India to see nearby mandi prices.',
      mandiEmpty: 'No recent {crop} prices were reported in {state}. Try another crop or place.',
      mandiFail: 'Live mandi prices are unavailable right now. Please try again shortly.',
      mandiSource: 'Source: Agmarknet via data.gov.in. Prices are in ₹ per quintal and can differ at your mandi.',
      perQuintal: 'per quintal',
      range: 'Range ₹{min}–₹{max}',
      reported: 'Reported {date}',
      retry: 'Try again',
      listen: 'Listen',
      dialogTitle: 'Choose your place',
      searchLabel: 'Search for a place',
      searchPlaceholder: 'Search village, town or district',
      popular: 'Popular places',
      searching: 'Searching…',
      noResults: 'No places found. Try a different spelling.',
      searchFail: 'Search failed. Check your connection and try again.',
      close: 'Close',
      errorTitle: 'Could not load the forecast',
      errorBody: 'Check your internet connection and try again.',
      refreshFail: 'Could not refresh. Showing the last forecast.',
      myLocationName: 'My location',
      pinned: 'Selected location',
      disclaimer: 'KrishiDost gives weather-based guidance. It does not replace advice from your local agriculture office.',
      wxClear: 'Clear', wxPartly: 'Partly cloudy', wxCloudy: 'Cloudy', wxFog: 'Fog',
      wxDrizzle: 'Drizzle', wxRain: 'Rain', wxShowers: 'Showers', wxStorm: 'Thunderstorm',
    },
    hi: {
      skip: 'मुख्य सामग्री पर जाएं',
      tagline: 'आपका खेती का साथी',
      changePlace: 'जगह बदलें',
      mapTitle: 'वर्षा रडार और स्थान का नक्शा',
      mapFail: 'नक्शा लोड नहीं हो सका। इंटरनेट जांचें और पेज रीफ्रेश करें।',
      radar: 'वर्षा रडार',
      myLocation: 'मेरी जगह',
      mapHint: 'दूसरी जगह देखने के लिए नक्शे पर टैप करें।',
      radarTime: 'रडार अपडेट {time}',
      radarNasa: 'वर्षा का नक्शा NASA GPM IMERG उपग्रह डेटा से।',
      radarFail: 'वर्षा रडार अभी उपलब्ध नहीं है।',
      locating: 'आपकी जगह खोजी जा रही है…',
      locDenied: 'स्थान की अनुमति नहीं मिली। अपनी जगह खोजकर चुनें।',
      locUnsupported: 'आपका ब्राउज़र स्थान साझा नहीं कर सकता। अपनी जगह खोजकर चुनें।',
      allClear: 'सब ठीक है',
      warning: 'मौसम चेतावनी',
      statusOk: 'उपलब्ध अल्पकालिक पूर्वानुमान में कोई गंभीर मौसम संकेत नहीं है।',
      actionOk: 'खेत का काम जारी रखें; छिड़काव से पहले मौसम देखें।',
      statusWarn: 'अगले 3 दिनों में भारी बारिश या आंधी-तूफान की संभावना है।',
      actionWarn: 'छिड़काव न करें, कटी फसल सुरक्षित रखें और नालियां साफ करें।',
      updated: 'अपडेट: आज, {time}',
      refresh: 'ताज़ा करें',
      humidity: 'नमी',
      feelsLike: 'महसूस हो रहा है {t}°C',
      live: 'लाइव',
      outlookTitle: '14 दिन का आपदा पूर्वानुमान',
      outlookClear: 'अगले 14 दिनों में अत्यधिक वर्षा का अनुमान नहीं है। फिर भी निकासी और फसल के सुरक्षित भंडारण की योजना बनाएं, और IMD की आधिकारिक सूचनाएं देखें।',
      outlookWatch: 'अगले 14 दिनों में लगभग {mm} मिमी बारिश का अनुमान है। निकासी की योजना बनाएं, भंडारित अनाज ऊंची जगह रखें और IMD की सूचनाएं देखें।',
      chartLabel: 'अगले 14 दिनों की दैनिक वर्षा। कुल {mm} मिमी।',
      chartToday: 'आज',
      chartEnd: '14वां दिन',
      hazardHead: 'आपके पास चल रहे चक्रवात और बाढ़ की घटनाएं',
      hazardNone: 'NASA EONET में इस क्षेत्र के पास कोई चक्रवात या बाढ़ की घटना दर्ज नहीं है।',
      hazardFail: 'NASA की घटना जानकारी अभी लोड नहीं हो सकी।',
      hazardSource: 'घटनाएं: NASA EONET। हमेशा IMD और जिला प्रशासन की चेतावनी मानें।',
      yourCrop: 'आपकी फसल',
      pestTitle: 'आपकी फसल के लिए कीट चेतावनी',
      pestPrompt: 'फसल-विशेष जांच के लिए ऊपर से फसल चुनें।',
      pestLow: 'अभी मौसम से कीट का दबाव कम है। नियमित निगरानी जारी रखें।',
      pestNote: 'मौसम आधारित निगरानी सलाह, पुष्ट प्रकोप नहीं।',
      riskLow: 'कम खतरा',
      riskHigh: 'बढ़ा हुआ खतरा',
      outlook72: '72 घंटे का पूर्वानुमान',
      today: 'आज',
      tomorrow: 'कल',
      low: 'न्यूनतम',
      rainChance: 'बारिश की संभावना {p}%',
      floodTitle: 'बाढ़ का खतरा',
      floodLow: 'कम',
      floodMedium: 'मध्यम',
      floodHigh: 'अधिक',
      floodText: 'अपेक्षित वर्षा (3 दिन में {mm} मिमी) के आधार पर बाढ़ का खतरा अभी {level} है।',
      floodRiver: 'नदी का प्रवाह (GloFAS) 7 दिनों में लगभग {x} गुना बढ़ने का अनुमान है।',
      floodNote: 'यह वर्षा और नदी प्रवाह पर आधारित अनुमान है। CWC और जिला कार्यालय की आधिकारिक चेतावनी देखें।',
      nasaTitle: 'NASA उपग्रह: मिट्टी और धूप',
      nasaSoil: 'जड़ क्षेत्र की मिट्टी में नमी {p}%',
      nasaDry: 'सूखी मिट्टी',
      nasaOk: 'पर्याप्त नमी',
      nasaWet: 'गीली मिट्टी',
      nasaRain7: 'पिछले 7 दिनों की बारिश: {mm} मिमी',
      nasaSun: 'धूप: {v} kWh/m² प्रतिदिन',
      nasaTemp: 'औसत तापमान: {t}°C',
      nasaDate: 'ताज़ा डेटा: {date}',
      nasaIrrigate: 'मिट्टी सूखी है और बारिश कम होने का अनुमान है। सिंचाई की योजना बनाएं।',
      nasaHold: 'मिट्टी पहले से गीली है। सिंचाई रोकें और नालियां साफ रखें।',
      nasaFine: 'मिट्टी की नमी ठीक लग रही है। फसल में तनाव दिखे तभी सिंचाई करें।',
      nasaFail: 'NASA POWER का डेटा अभी उपलब्ध नहीं है।',
      nasaSource: 'स्रोत: NASA POWER (उपग्रह और मॉडल डेटा, आमतौर पर कुछ दिन पुराना)। खेत की स्थिति अलग हो सकती है।',
      adviceTitle: 'कृषिदोस्त सलाह',
      advicePrompt: 'सलाह देखने के लिए ऊपर से फसल चुनें।',
      newsTitle: 'कृषि समाचार और अपडेट',
      newsEmpty: 'इस क्षेत्र के लिए हाल की कृषि खबरें नहीं मिलीं।',
      newsFail: 'ताज़ा खबरें लोड नहीं हो सकीं।',
      newsSource: 'शीर्षक Google News से हैं। पूरी खबर प्रकाशक की साइट पर पढ़ने के लिए टैप करें।',
      mandiTitle: 'स्थानीय मंडी भाव',
      mandiPrompt: 'आज के मंडी भाव देखने के लिए ऊपर से फसल चुनें।',
      mandiNoState: 'पास की मंडी के भाव देखने के लिए भारत में कोई जगह चुनें।',
      mandiEmpty: '{state} में {crop} के हाल के भाव दर्ज नहीं हुए। दूसरी फसल या जगह आजमाएं।',
      mandiFail: 'लाइव मंडी भाव अभी उपलब्ध नहीं हैं। कृपया थोड़ी देर बाद कोशिश करें।',
      mandiSource: 'स्रोत: Agmarknet, data.gov.in के माध्यम से। भाव ₹ प्रति क्विंटल में हैं और आपकी मंडी में अलग हो सकते हैं।',
      perQuintal: 'प्रति क्विंटल',
      range: 'दायरा ₹{min}–₹{max}',
      reported: 'दर्ज: {date}',
      retry: 'फिर कोशिश करें',
      listen: 'सुनें',
      dialogTitle: 'अपनी जगह चुनें',
      searchLabel: 'जगह खोजें',
      searchPlaceholder: 'गांव, शहर या जिला खोजें',
      popular: 'लोकप्रिय जगहें',
      searching: 'खोज जारी है…',
      noResults: 'कोई जगह नहीं मिली। दूसरी वर्तनी आजमाएं।',
      searchFail: 'खोज विफल रही। इंटरनेट जांचें और फिर कोशिश करें।',
      close: 'बंद करें',
      errorTitle: 'पूर्वानुमान लोड नहीं हो सका',
      errorBody: 'इंटरनेट जांचें और फिर कोशिश करें।',
      refreshFail: 'ताज़ा नहीं हो सका। पिछला पूर्वानुमान दिख रहा है।',
      myLocationName: 'मेरी जगह',
      pinned: 'चुनी हुई जगह',
      disclaimer: 'कृषिदोस्त मौसम आधारित सलाह देता है। यह आपके स्थानीय कृषि कार्यालय की सलाह का विकल्प नहीं है।',
      wxClear: 'साफ', wxPartly: 'आंशिक बादल', wxCloudy: 'बादल', wxFog: 'कोहरा',
      wxDrizzle: 'फुहार', wxRain: 'बारिश', wxShowers: 'बौछारें', wxStorm: 'आंधी-तूफान',
    },
  };

  /* ───────────────────────── Crop data ───────────────────────── */
  // Each text is [English, Hindi].

  const CROPS = {
    paddy: {
      name: ['Paddy', 'धान'],
      pestHigh: ['Humid, wet days raise blast and stem borer risk. Scout fields every 2–3 days.', 'नम और बरसाती दिनों में ब्लास्ट और तना छेदक का खतरा बढ़ता है। हर 2–3 दिन में खेत देखें।'],
      storm: ['Hold back fertiliser and spraying. Open field drains so standing water does not rise above the plants.', 'खाद और छिड़काव रोक दें। खेत की नालियां खोलें ताकि पानी पौधों से ऊपर न जाए।'],
      wet: ['Rain is likely, so skip top-dressing today. Keep 2–5 cm of water and check bunds.', 'बारिश की संभावना है, आज ऊपरी खाद न दें। 2–5 सेमी पानी रखें और मेड़ें जांचें।'],
      dry: ['Good window for top-dressing. Keep 2–5 cm of standing water and irrigate if the field is drying.', 'ऊपरी खाद के लिए अच्छा समय है। 2–5 सेमी पानी रखें और खेत सूखे तो सिंचाई करें।'],
    },
    wheat: {
      name: ['Wheat', 'गेहूं'],
      pestHigh: ['Damp weather can favour rust and aphids. Check leaves closely, especially the lower ones.', 'नम मौसम में रतुआ और माहू बढ़ सकते हैं। पत्तियां, खासकर नीचे की, ध्यान से देखें।'],
      storm: ['Delay irrigation and spraying. Drain excess water to avoid waterlogging and lodging.', 'सिंचाई और छिड़काव टालें। जलभराव और फसल गिरने से बचाने के लिए पानी निकालें।'],
      wet: ['Skip irrigation while rain is expected. Watch for waterlogging in low patches.', 'बारिश की संभावना में सिंचाई न करें। निचले हिस्सों में जलभराव देखें।'],
      dry: ['A good time for light irrigation and weeding. Avoid over-watering.', 'हल्की सिंचाई और निराई के लिए अच्छा समय। ज्यादा पानी न दें।'],
    },
    cotton: {
      name: ['Cotton', 'कपास'],
      pestHigh: ['Wet weather favours bollworm and leaf spot. Inspect squares and bolls regularly.', 'बरसाती मौसम में सुंडी और पत्ती धब्बा बढ़ सकते हैं। कलियां और गूलर नियमित जांचें।'],
      storm: ['Avoid spraying and picking. Protect picked cotton from rain and drain the field.', 'छिड़काव और चुनाई न करें। चुना हुआ कपास बारिश से बचाएं और खेत से पानी निकालें।'],
      wet: ['Hold off picking and spraying until the rain clears. Keep picked cotton dry.', 'बारिश रुकने तक चुनाई और छिड़काव रोकें। चुना हुआ कपास सूखा रखें।'],
      dry: ['The dry spell suits picking and weeding. Irrigate only if the soil is dry.', 'सूखा मौसम चुनाई और निराई के लिए ठीक है। मिट्टी सूखी हो तभी सिंचाई करें।'],
    },
    maize: {
      name: ['Maize', 'मक्का'],
      pestHigh: ['Warm, humid weather favours fall armyworm and leaf blight. Check whorls and leaves.', 'गर्म और नम मौसम में फॉल आर्मीवर्म और पत्ती झुलसा बढ़ सकते हैं। पत्तों के गुच्छे और पत्तियां देखें।'],
      storm: ['Postpone spraying and fertiliser. Drain fields quickly, as maize does not tolerate waterlogging.', 'छिड़काव और खाद टालें। मक्का जलभराव सहन नहीं करता, इसलिए पानी जल्दी निकालें।'],
      wet: ['Skip irrigation and top-dressing while rain is expected. Check drainage channels.', 'बारिश में सिंचाई और ऊपरी खाद न दें। निकासी की नालियां जांचें।'],
      dry: ['Good window for weeding and top-dressing. Irrigate at tasselling if the soil is dry.', 'निराई और ऊपरी खाद के लिए अच्छा समय। मिट्टी सूखी हो तो मंजरी निकलते समय सिंचाई करें।'],
    },
    jute: {
      name: ['Jute', 'जूट'],
      pestHigh: ['Humid weather can bring stem rot and hairy caterpillars. Inspect stems and leaf undersides.', 'नम मौसम में तना सड़न और रोएंदार सुंडी आ सकती हैं। तने और पत्तियों के नीचे देखें।'],
      storm: ['Do not cut or ret jute during the storm. Keep drains open to protect standing plants.', 'आंधी के दौरान जूट की कटाई या सड़ाई न करें। खड़ी फसल बचाने के लिए नालियां खुली रखें।'],
      wet: ['Rain helps growth, but keep drains clear. Delay weeding if the soil is too soggy.', 'बारिश बढ़वार में मदद करती है, पर नालियां साफ रखें। मिट्टी बहुत गीली हो तो निराई टालें।'],
      dry: ['Good time for weeding and thinning. Irrigate lightly if the soil is dry.', 'निराई और छंटाई के लिए अच्छा समय। मिट्टी सूखी हो तो हल्की सिंचाई करें।'],
    },
    potato: {
      name: ['Potato', 'आलू'],
      pestHigh: ['Damp, cool weather raises late blight risk. Check leaves for dark patches and act early.', 'ठंडे, नम मौसम में पछेती झुलसा का खतरा बढ़ता है। पत्तियों पर काले धब्बे देखें और जल्दी उपाय करें।'],
      storm: ['Delay spraying and earthing up. Drain fields to protect tubers from rot.', 'छिड़काव और मिट्टी चढ़ाना टालें। कंद सड़ने से बचाने के लिए पानी निकालें।'],
      wet: ['Avoid irrigation. Spray protectively only if your agriculture office advises it.', 'सिंचाई न करें। सुरक्षात्मक छिड़काव तभी करें जब कृषि कार्यालय सलाह दे।'],
      dry: ['Good window for earthing up and light irrigation. Keep checking for blight.', 'मिट्टी चढ़ाने और हल्की सिंचाई के लिए अच्छा समय। झुलसा की जांच करते रहें।'],
    },
  };

  /* ───────────────────────── State ───────────────────────── */

  const state = {
    place: PLACES[0],
    crop: null,
    lang: 'en',
    data: null,
    updated: null,
    status: 'loading', // loading | ready | error
    radarOn: true,
    news: { key: '', status: 'idle', items: [], at: 0 },
    mandi: null,   // { key, status: loading|ready|empty|error|nostate, data }
    nasa: null,    // { key, status: loading|ready|error, data }
    hazards: null, // { key, status: loading|ready|error, items }
    river: null,   // { key, status: loading|ready|error, data }
  };

  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    if (saved.place && typeof saved.place.name === 'string'
      && Number.isFinite(saved.place.lat) && Number.isFinite(saved.place.lon)) state.place = saved.place;
    if (saved.crop && CROPS[saved.crop]) state.crop = saved.crop;
    if (saved.lang === 'hi' || saved.lang === 'en') state.lang = saved.lang;
    else if ((navigator.language || '').toLowerCase().startsWith('hi')) state.lang = 'hi';
    if (typeof saved.radarOn === 'boolean') state.radarOn = saved.radarOn;
  } catch (_) { /* storage unavailable */ }

  const persist = () => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        place: state.place, crop: state.crop, lang: state.lang, radarOn: state.radarOn,
      }));
    } catch (_) { /* ignore */ }
  };

  /* ───────────────────────── Helpers ───────────────────────── */

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const li = () => (state.lang === 'hi' ? 1 : 0);
  const locale = () => (state.lang === 'hi' ? 'hi-IN' : 'en-IN');
  const fmtNum = (n) => new Intl.NumberFormat('en-IN').format(Math.round(n));
  const placeKey = () => `${state.place.lat.toFixed(3)},${state.place.lon.toFixed(3)}`;

  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const safeUrl = (u) => (/^https?:\/\//i.test(u || '') ? u : '#');

  const t = (key, vars = {}) => {
    let s = (I18N[state.lang] && I18N[state.lang][key]) ?? I18N.en[key] ?? key;
    for (const k in vars) s = s.split(`{${k}}`).join(vars[k]);
    return s;
  };

  const shortName = (name) => String(name).split(',')[0].trim();
  const fmtTime = (d) => d.toLocaleTimeString(locale(), { hour: 'numeric', minute: '2-digit' });
  const weekday = (d) => d.toLocaleDateString(locale(), { weekday: 'long' });
  const fmtDay = (d) => (Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString(locale(), { day: 'numeric', month: 'short' }));

  function ago(value) {
    const d = new Date(value);
    if (!value || Number.isNaN(d.getTime())) return '';
    const diff = (d.getTime() - Date.now()) / 1000;
    const rtf = new Intl.RelativeTimeFormat(locale(), { numeric: 'auto' });
    const mins = Math.round(diff / 60);
    if (Math.abs(mins) < 60) return rtf.format(Math.min(mins, 0), 'minute');
    const hrs = Math.round(diff / 3600);
    if (Math.abs(hrs) < 24) return rtf.format(Math.min(hrs, 0), 'hour');
    return rtf.format(Math.min(Math.round(diff / 86400), 0), 'day');
  }

  function region() {
    const parts = state.place.name.split(',').map((s) => s.trim());
    const last = parts[parts.length - 1];
    const st = INDIAN_STATES.find((s) => s.toLowerCase() === last.toLowerCase());
    return {
      state: st ? (st === 'Delhi' ? 'NCT of Delhi' : st) : null,
      district: st && parts.length >= 3 ? parts[1] : null,
    };
  }

  async function fetchJSON(url, timeout = 12000) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeout);
    try {
      const res = await fetch(url, { signal: ctrl.signal });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } finally {
      clearTimeout(timer);
    }
  }

  let toastTimer;
  function toast(msg) {
    const el = $('#toast');
    if (!el) return;
    el.textContent = msg;
    el.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { el.hidden = true; }, 4000);
  }

  /* ───────────────────────── Weather logic ───────────────────────── */

  function wxKey(code) {
    if (code <= 1) return 'wxClear';
    if (code === 2) return 'wxPartly';
    if (code === 3) return 'wxCloudy';
    if (code === 45 || code === 48) return 'wxFog';
    if (code >= 51 && code <= 57) return 'wxDrizzle';
    if (code >= 61 && code <= 67) return 'wxRain';
    if (code >= 80 && code <= 82) return 'wxShowers';
    if (code >= 95) return 'wxStorm';
    return 'wxCloudy';
  }

  function wxIcon(code) {
    if (code <= 1) return 'sun';
    if (code === 2) return 'cloudsun';
    if (code === 3) return 'cloud';
    if (code === 45 || code === 48) return 'fog';
    if (code >= 95) return 'storm';
    if (code >= 51) return 'rain';
    return 'cloud';
  }

  const wxTone = (code) => (code <= 2 ? 'sun' : code >= 95 ? 'storm' : code >= 51 ? 'rain' : 'cloud');

  const FLOOD_RANK = { Low: 0, Medium: 1, High: 2 };

  function riverSignal() {
    const r = state.river;
    if (!r || r.status !== 'ready' || !r.data || r.key !== placeKey()) return null;
    const { peak, rise } = r.data;
    let level = 'Low';
    if (rise >= 3 && peak >= 20) level = 'High';
    else if (rise >= 1.8 && peak >= 10) level = 'Medium';
    return { level, rise };
  }

  function derive(d) {
    const days = d.daily.time.map((date, i) => ({
      date: new Date(`${date}T00:00:00`),
      tMax: d.daily.temperature_2m_max[i] ?? 0,
      tMin: d.daily.temperature_2m_min[i] ?? 0,
      rain: d.daily.precipitation_sum[i] ?? 0,
      prob: d.daily.precipitation_probability_max[i] ?? 0,
      code: d.daily.weather_code[i] ?? 0,
    }));
    const next3 = days.slice(0, 3);
    const rain3 = next3.reduce((s, x) => s + x.rain, 0);
    const rain14 = days.reduce((s, x) => s + x.rain, 0);
    const maxDay14 = Math.max(0, ...days.map((x) => x.rain));
    const maxDay3 = Math.max(0, ...next3.map((x) => x.rain));
    const stormSoon = next3.some((x) => x.code >= 95 || x.rain >= 65);

    // Flood risk is a 3-day rainfall estimate, raised by the GloFAS river-flow signal if present.
    let flood = 'Low';
    if (rain3 >= 150 || maxDay3 >= 100) flood = 'High';
    else if (rain3 >= 60 || maxDay3 >= 50) flood = 'Medium';
    const river = riverSignal();
    if (river && FLOOD_RANK[river.level] > FLOOD_RANK[flood]) flood = river.level;

    const wetDays = next3.filter((x) => x.prob >= 50 || x.rain >= 5).length;
    const humidity = d.current.relative_humidity_2m ?? 0;

    return {
      days, next3, rain3, rain14, stormSoon, flood, wetDays, river,
      warn: stormSoon || flood === 'High',
      watch14: rain14 >= 250 || maxDay14 >= 100,
      pestHigh: wetDays >= 2 || (humidity >= 85 && wetDays >= 1),
      now: {
        temp: d.current.temperature_2m ?? 0,
        feels: d.current.apparent_temperature ?? d.current.temperature_2m ?? 0,
        hum: Math.round(humidity),
        wind: d.current.wind_speed_10m ?? 0,
        code: d.current.weather_code ?? 0,
      },
    };
  }

  function adviceFor(m) {
    const c = CROPS[state.crop];
    if (!c) return '';
    if (m.stormSoon) return c.storm[li()];
    if (m.wetDays >= 2) return c.wet[li()];
    return c.dry[li()];
  }

  /* ───────────────────────── Text-to-speech ───────────────────────── */

  const canSpeak = 'speechSynthesis' in window;
  let currentUtter = null;
  const speechTexts = new Map();
  let speechCounter = 0;

  function clearSpeaking() { $$('.is-speaking').forEach((b) => b.classList.remove('is-speaking')); }

  function speak(text, btn) {
    if (!canSpeak || !text) return;
    const same = btn && btn.classList.contains('is-speaking');
    currentUtter = null;
    window.speechSynthesis.cancel();
    clearSpeaking();
    if (same) return;
    const u = new SpeechSynthesisUtterance(text);
    u.lang = locale();
    const voices = window.speechSynthesis.getVoices();
    const want = u.lang.toLowerCase();
    const voice = voices.find((v) => v.lang.replace('_', '-').toLowerCase() === want)
      || voices.find((v) => v.lang.toLowerCase().startsWith(want.slice(0, 2)));
    if (voice) u.voice = voice;
    currentUtter = u;
    const done = () => { if (currentUtter === u) { clearSpeaking(); currentUtter = null; } };
    u.onend = done;
    u.onerror = done;
    if (btn) btn.classList.add('is-speaking');
    window.speechSynthesis.speak(u);
  }

  const registerSpeech = (text) => {
    const id = `s${speechCounter++}`;
    speechTexts.set(id, text);
    return id;
  };

  const speakBtn = (text) => (canSpeak
    ? `<button type="button" class="icon-btn" data-speak="${registerSpeech(text)}" aria-label="${esc(t('listen'))}">${icon('volume', 22)}</button>`
    : '');

  /* ───────────────────────── Cards ───────────────────────── */

  const skLines = (n = 3) => Array.from({ length: n }, (_, i) => `<div class="sk-line${i === n - 1 ? ' short' : ''}"></div>`).join('');

  function statusCard(m) {
    const warn = m.warn;
    const title = warn ? t('warning') : t('allClear');
    const body = warn ? t('statusWarn') : t('statusOk');
    const action = warn ? t('actionWarn') : t('actionOk');
    const speech = `${title}. ${body} ${action}`;
    const tone = wxTone(m.now.code);
    return `
      <section class="card card--status ${warn ? 'card--warn' : 'card--ok'} col-7" aria-labelledby="h-status">
        <div class="status-grid">
          <div>
            <div class="card-head">
              <span class="status-icon">${icon(warn ? 'alert' : 'check', 28)}</span>
              <h2 id="h-status">${esc(title)}</h2>
              ${speakBtn(speech)}
            </div>
            <p class="lead">${esc(body)}</p>
            <p class="sub">${esc(action)}</p>
            <ul class="now">
              <li>${icon('droplet', 16)}<span>${esc(t('humidity'))} ${m.now.hum}%</span></li>
              <li>${icon('wind', 16)}<span>${Math.round(m.now.wind)} km/h</span></li>
            </ul>
            <p class="meta">
              <span>${esc(t('updated', { time: state.updated ? fmtTime(state.updated) : '' }))}</span>
              <button type="button" class="link-btn" data-action="refresh">${icon('refresh', 14)} ${esc(t('refresh'))}</button>
            </p>
          </div>
          <div class="status-temp${tone === 'rain' || tone === 'storm' ? ' is-wet' : ''}">
            ${icon(wxIcon(m.now.code), 40)}
            <span class="temp-big">${Math.round(m.now.temp)}°</span>
            <span class="temp-wx">${esc(t(wxKey(m.now.code)))}</span>
            <span class="temp-feels">${esc(t('feelsLike', { t: Math.round(m.now.feels) }))}</span>
          </div>
        </div>
      </section>`;
  }

  function rainChart(m) {
    const w = 300, h = 64, gap = 4;
    const n = Math.min(14, m.days.length);
    if (!n) return '';
    const bw = (w - gap * (n - 1)) / n;
    const max = Math.max(20, ...m.days.slice(0, n).map((d) => d.rain));
    const bars = m.days.slice(0, n).map((d, i) => {
      const bh = Math.max(2, (d.rain / max) * (h - 4));
      return `<rect class="bar${d.rain >= 65 ? ' bar--heavy' : ''}" x="${(i * (bw + gap)).toFixed(1)}" y="${(h - bh).toFixed(1)}" width="${bw.toFixed(1)}" height="${bh.toFixed(1)}" rx="2"/>`;
    }).join('');
    return `
      <svg class="chart" viewBox="0 0 ${w} ${h}" role="img" aria-label="${esc(t('chartLabel', { mm: Math.round(m.rain14) }))}">${bars}</svg>
      <div class="chart-axis" aria-hidden="true"><span>${esc(t('chartToday'))}</span><span>${esc(t('chartEnd'))}</span></div>`;
  }

  function hazardBlock() {
    const h = state.hazards;
    let inner;
    if (!h || h.status === 'loading') {
      inner = skLines(2);
    } else if (h.status === 'error') {
      inner = `<p class="note">${esc(t('hazardFail'))}</p>`;
    } else if (!h.items.length) {
      inner = `<p class="note">${esc(t('hazardNone'))}</p>`;
    } else {
      inner = `<ul class="news-list">${h.items.map((x) => {
        const meta = [x.cat, ago(x.date)].filter(Boolean).join(' · ');
        return `
        <li class="news-row">
          <a class="news-link" href="${esc(safeUrl(x.link))}" target="_blank" rel="noopener noreferrer">
            <span class="news-title">${esc(x.title)}</span>
            <span class="news-meta">${esc(meta)}</span>
          </a>
        </li>`;
      }).join('')}</ul><p class="note">${esc(t('hazardSource'))}</p>`;
    }
    return `<p class="sub">${esc(t('hazardHead'))}</p>${inner}`;
  }

  function outlookCard(m) {
    const text = m.watch14 ? t('outlookWatch', { mm: Math.round(m.rain14) }) : t('outlookClear');
    return `
      <section class="card col-5" id="card-outlook" aria-labelledby="h-outlook">
        <div class="card-head">
          <span class="badge-icon">${icon('cloud', 22)}</span>
          <h2 id="h-outlook">${esc(t('outlookTitle'))}</h2>
        </div>
        <p class="lead">${esc(text)}</p>
        ${rainChart(m)}
        ${hazardBlock()}
      </section>`;
  }

  function cropPicker() {
    const chips = Object.entries(CROPS).map(([key, c]) => {
      const on = state.crop === key;
      return `<button type="button" class="chip" role="radio" aria-checked="${on}" data-crop="${key}">${on ? icon('check', 16) : ''}${esc(c.name[li()])}</button>`;
    }).join('');
    return `
      <section class="col-12" aria-labelledby="h-crop">
        <h2 class="section-title" id="h-crop">${esc(t('yourCrop'))}</h2>
        <div role="radiogroup" aria-labelledby="h-crop" style="display:flex;flex-wrap:wrap;gap:10px">${chips}</div>
      </section>`;
  }

  function pestCard(m) {
    const c = CROPS[state.crop];
    let inner;
    if (!c) {
      inner = `<p class="lead">${esc(t('pestPrompt'))}</p>`;
    } else {
      const high = m.pestHigh;
      inner = `
        <span class="risk ${high ? 'risk--medium' : 'risk--low'}">${esc(t(high ? 'riskHigh' : 'riskLow'))}</span>
        <p class="lead">${esc(high ? c.pestHigh[li()] : t('pestLow'))}</p>`;
    }
    return `
      <section class="card col-6" aria-labelledby="h-pest">
        <div class="card-head">
          <span class="badge-icon is-pest">${icon('bug', 22)}</span>
          <h2 id="h-pest">${esc(t('pestTitle'))}</h2>
        </div>
        ${inner}
        <p class="note">${esc(t('pestNote'))}</p>
      </section>`;
  }

  function adviceCard(m) {
    const text = state.crop ? adviceFor(m) : t('advicePrompt');
    return `
      <section class="card col-6" aria-labelledby="h-advice">
        <div class="card-head">
          <span class="badge-icon">${icon('sprout', 22)}</span>
          <h2 id="h-advice">${esc(t('adviceTitle'))}</h2>
          ${state.crop ? speakBtn(text) : ''}
        </div>
        <p class="${state.crop ? 'body' : 'lead'}">${esc(text)}</p>
      </section>`;
  }

  function forecastCard(m) {
    const labels = [t('today'), t('tomorrow'), m.next3[2] ? weekday(m.next3[2].date) : ''];
    const tiles = m.next3.map((d, i) => `
        <li class="tile tile--${wxTone(d.code)}">
          <span class="tile-day">${esc(labels[i])}</span>
          <span class="tile-icon${d.code >= 51 ? ' is-wet' : ''}">${icon(wxIcon(d.code), 34)}</span>
          <span class="tile-wx">${esc(t(wxKey(d.code)))}</span>
          <span class="tile-rain" aria-label="${esc(t('rainChance', { p: d.prob }))}">${icon('droplet', 14)}${d.prob}%</span>
          <span class="tile-temp">${Math.round(d.tMax)}°C</span>
          <span class="tile-min">${esc(t('low'))} ${Math.round(d.tMin)}°</span>
        </li>`).join('');
    return `
      <section class="col-8" aria-labelledby="h-72">
        <h2 class="section-title" id="h-72">${esc(t('outlook72'))}</h2>
        <ul class="tiles">${tiles}</ul>
      </section>`;
  }

  function floodCard(m) {
    const level = t(`flood${m.flood}`);
    const cls = { Low: 'risk--low', Medium: 'risk--medium', High: 'risk--high' }[m.flood];
    const riverLine = m.river && m.river.rise >= 1.8
      ? `<p class="body">${esc(t('floodRiver', { x: m.river.rise.toFixed(1) }))}</p>` : '';
    return `
      <section class="card col-4" id="card-flood" aria-labelledby="h-flood">
        <div class="card-head">
          <span class="badge-icon is-rain">${icon('waves', 22)}</span>
          <h2 id="h-flood">${esc(t('floodTitle'))}</h2>
        </div>
        <span class="risk ${cls}">${esc(level)}</span>
        <p class="body">${esc(t('floodText', { level: level.toLowerCase(), mm: Math.round(m.rain3) }))}</p>
        ${riverLine}
        <p class="note">${esc(t('floodNote'))}</p>
      </section>`;
  }

  function newsCard() {
    const n = state.news;
    let inner;
    let speech = '';
    if (n.status === 'loading' || n.status === 'idle') {
      inner = skLines(4);
    } else if (n.status === 'error') {
      inner = `<p class="msg">${esc(t('newsFail'))}</p><p class="meta"><button type="button" class="link-btn" data-action="news-retry">${icon('refresh', 14)} ${esc(t('retry'))}</button></p>`;
    } else if (!n.items.length) {
      inner = `<p class="msg">${esc(t('newsEmpty'))}</p>`;
    } else {
      speech = n.items.map((x) => x.title).join('. ');
      inner = `<ul class="news-list">${n.items.map((x) => {
        const meta = [x.source, ago(x.published)].filter(Boolean).join(' · ');
        return `
        <li class="news-row">
          <a class="news-link" href="${esc(safeUrl(x.link))}" target="_blank" rel="noopener noreferrer">
            <span class="news-title">${esc(x.title)}</span>
            <span class="news-meta">${esc(meta)}</span>
          </a>
          ${canSpeak ? `<button type="button" class="icon-btn" data-speak="${registerSpeech(x.title)}" aria-label="${esc(t('listen'))}">${icon('volume', 18)}</button>` : ''}
        </li>`;
      }).join('')}</ul><p class="note">${esc(t('newsSource'))}</p>`;
    }
    return `
      <section class="card col-7" id="card-news" aria-labelledby="h-news">
        <div class="card-head">
          <span class="badge-icon is-news">${icon('news', 22)}</span>
          <h2 id="h-news">${esc(t('newsTitle'))}</h2>
          <span class="live">${esc(t('live'))}</span>
          ${speech ? speakBtn(speech) : ''}
        </div>
        ${inner}
      </section>`;
  }

  function mandiCard() {
    const m = state.mandi;
    const crop = CROPS[state.crop];
    let inner;
    let speech = '';

    if (!crop) {
      inner = `<p class="prompt">${esc(t('mandiPrompt'))}</p>`;
    } else if (!m || m.status === 'loading') {
      inner = skLines(4);
    } else if (m.status === 'nostate') {
      inner = `<p class="msg">${esc(t('mandiNoState'))}</p>`;
    } else if (m.status === 'error') {
      inner = `<p class="msg">${esc(t('mandiFail'))}</p><p class="meta"><button type="button" class="link-btn" data-action="mandi-retry">${icon('refresh', 14)} ${esc(t('retry'))}</button></p>`;
    } else if (m.status === 'empty') {
      inner = `<p class="msg">${esc(t('mandiEmpty', { crop: crop.name[li()], state: region().state || '' }))}</p>`;
    } else {
      const list = m.data.markets;
      const top = list[0];
      const rows = list.slice(1, 5).map((x) => `
        <li>
          <span class="m-name">${esc(x.market)}<span class="m-sub">${esc(x.district || '')}${x.date ? ` · ${esc(fmtDay(new Date(x.date)))}` : ''}</span></span>
          <span class="m-price">₹${fmtNum(x.modal)}</span>
        </li>`).join('');
      speech = `${crop.name[li()]}: ${top.market}, ₹${fmtNum(top.modal)} ${t('perQuintal')}`;
      inner = `
        <div class="mandi-top">
          <p class="market">${esc(top.market)}${top.district ? `, ${esc(top.district)}` : ''}</p>
          <p class="price">₹${fmtNum(top.modal)} <small>${esc(t('perQuintal'))}</small></p>
          <p class="range">${esc(t('range', { min: fmtNum(top.min), max: fmtNum(top.max) }))}${top.date ? ` · ${esc(t('reported', { date: fmtDay(new Date(top.date)) }))}` : ''}</p>
        </div>
        ${rows ? `<ul class="mandi-list">${rows}</ul>` : ''}
        <p class="note">${esc(t('mandiSource'))}</p>`;
    }

    return `
      <section class="card col-5" id="card-mandi" aria-labelledby="h-mandi">
        <div class="card-head">
          <span class="badge-icon is-gold">${icon('store', 22)}</span>
          <h2 id="h-mandi">${esc(t('mandiTitle'))}</h2>
          ${crop ? `<span class="live">${esc(t('live'))}</span>` : ''}
          ${speech ? speakBtn(speech) : ''}
        </div>
        ${inner}
      </section>`;
  }

  function nasaCard() {
    const n = state.nasa;
    let inner;
    let speech = '';
    if (!n || n.status === 'loading') {
      inner = skLines(4);
    } else if (n.status === 'error') {
      inner = `<p class="msg">${esc(t('nasaFail'))}</p><p class="meta"><button type="button" class="link-btn" data-action="nasa-retry">${icon('refresh', 14)} ${esc(t('retry'))}</button></p>`;
    } else {
      const d = n.data;
      const m = state.data ? derive(state.data) : null;
      let badge = '';
      let adviceKey = null;
      if (d.soil != null) {
        let levelKey = 'nasaOk';
        let cls = 'risk--low';
        if (d.soil < 0.4) { levelKey = 'nasaDry'; cls = 'risk--medium'; adviceKey = (!m || m.rain3 < 10) ? 'nasaIrrigate' : 'nasaFine'; }
        else if (d.soil > 0.7) { levelKey = 'nasaWet'; cls = 'risk--medium'; adviceKey = 'nasaHold'; }
        else adviceKey = 'nasaFine';
        badge = `<span class="risk ${cls}">${esc(t(levelKey))}</span>`;
      }
      const lines = [];
      if (d.soil != null) lines.push(t('nasaSoil', { p: Math.round(d.soil * 100) }));
      lines.push(t('nasaRain7', { mm: Math.round(d.rain7) }));
      if (d.sun != null) lines.push(t('nasaSun', { v: d.sun.toFixed(1) }));
      if (d.temp != null) lines.push(t('nasaTemp', { t: d.temp.toFixed(1) }));
      const advice = adviceKey ? t(adviceKey) : '';
      speech = [advice, lines[0]].filter(Boolean).join('. ');
      inner = `
        ${badge}
        ${advice ? `<p class="lead">${esc(advice)}</p>` : ''}
        <ul class="now">${lines.map((x) => `<li><span>${esc(x)}</span></li>`).join('')}</ul>
        <p class="meta"><span>${esc(t('nasaDate', { date: fmtDay(d.lastDate) }))}</span></p>
        <p class="note">${esc(t('nasaSource'))}</p>`;
    }
    return `
      <section class="card col-12" id="card-nasa" aria-labelledby="h-nasa">
        <div class="card-head">
          <span class="badge-icon">${icon('layers', 22)}</span>
          <h2 id="h-nasa">${esc(t('nasaTitle'))}</h2>
          ${speech ? speakBtn(speech) : ''}
        </div>
        ${inner}
      </section>`;
  }

  const skeleton = () => `
    <div class="grid" aria-hidden="true">
      <div class="card skeleton col-7"></div><div class="card skeleton col-5"></div>
      <div class="card skeleton col-6"></div><div class="card skeleton col-6"></div>
      <div class="card skeleton col-12"></div>
    </div>`;

  const errorCard = () => `
    <section class="card error-card">
      <h2>${esc(t('errorTitle'))}</h2>
      <p>${esc(t('errorBody'))}</p>
      <button type="button" class="btn btn-solid" data-action="retry">${esc(t('retry'))}</button>
    </section>`;

  function render() {
    const root = $('#content');
    if (!root) return;
    speechTexts.clear();
    if (!state.data) {
      root.innerHTML = state.status === 'error' ? errorCard() : skeleton();
      return;
    }
    const m = derive(state.data);
    root.innerHTML = `<div class="grid">
      ${statusCard(m)}${outlookCard(m)}${cropPicker()}${pestCard(m)}${adviceCard(m)}
      ${forecastCard(m)}${floodCard(m)}${newsCard()}${mandiCard()}${nasaCard()}
    </div>`;
  }

  // Replace a single card without re-rendering (and re-focusing) the whole page.
  const CARD_BUILDERS = {
    news: () => newsCard(),
    mandi: () => mandiCard(),
    nasa: () => nasaCard(),
    outlook: (m) => outlookCard(m),
    flood: (m) => floodCard(m),
  };
  const NEEDS_DERIVED = new Set(['outlook', 'flood']);

  function refreshCard(which) {
    const el = $(`#card-${which}`);
    const build = CARD_BUILDERS[which];
    if (!el || !build) return;
    let m = null;
    if (NEEDS_DERIVED.has(which)) {
      if (!state.data) return;
      m = derive(state.data);
    }
    el.outerHTML = build(m);
    // A changed flood signal can also change the top status card.
    if (which === 'flood' && state.data) {
      const st = $('.card--status');
      if (st) st.outerHTML = statusCard(derive(state.data));
    }
  }

  function applyStatic() {
    document.documentElement.lang = state.lang === 'hi' ? 'hi' : 'en';
    $$('[data-i18n]').forEach((el) => { el.textContent = t(el.dataset.i18n); });
    $$('[data-i18n-placeholder]').forEach((el) => { el.placeholder = t(el.dataset.i18nPlaceholder); });
    $$('[data-i18n-aria]').forEach((el) => { el.setAttribute('aria-label', t(el.dataset.i18nAria)); });
    $$('[data-icon]').forEach((el) => { el.innerHTML = icon(el.dataset.icon, Number(el.dataset.size) || 18); });
    const lb = $('#lang-toggle');
    if (lb) {
      lb.textContent = state.lang === 'en' ? 'हिन्दी' : 'English';
      lb.lang = state.lang === 'en' ? 'hi' : 'en';
    }
    updatePlaceUI();
    updateCaption();
  }

  function updatePlaceUI() {
    const pn = $('#place-name');
    if (pn) pn.innerHTML = `${icon('pin', 16)}<span>${esc(state.place.name)}</span>`;
    const ml = $('#map-label-text');
    if (ml) ml.textContent = shortName(state.place.name);
  }

  /* ───────────────────────── Live data loaders ───────────────────────── */

  let reqToken = 0;
  let refreshTimer;

  function loadAll(forceNews = false) {
    loadWeather();
    loadNews(forceNews);
    loadMandi();
    loadNasa();
    loadHazards();
    loadRiver();
  }

  async function loadWeather() {
    const token = ++reqToken;
    state.status = 'loading';
    if (!state.data) render();
    const content = $('#content');
    if (content) content.classList.add('is-busy');
    try {
      const { lat, lon } = state.place;
      const url = 'https://api.open-meteo.com/v1/forecast'
        + `?latitude=${lat}&longitude=${lon}`
        + '&current=temperature_2m,apparent_temperature,relative_humidity_2m,wind_speed_10m,weather_code'
        + '&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max'
        + '&forecast_days=14&timezone=auto';
      const data = await fetchJSON(url);
      if (token !== reqToken) return;
      if (!data.daily || !data.current) throw new Error('Unexpected response');
      state.data = data;
      state.updated = new Date();
      state.status = 'ready';
    } catch (_) {
      if (token !== reqToken) return;
      state.status = 'error';
      if (state.data) toast(t('refreshFail'));
    }
    if (content) content.classList.remove('is-busy');
    render();
    clearTimeout(refreshTimer);
    refreshTimer = setTimeout(() => loadAll(true), REFRESH_MS);
  }

  /* ----- News ----- */

  const splitTitle = (raw) => {
    const i = raw.lastIndexOf(' - ');
    return i > 0 ? { title: raw.slice(0, i), source: raw.slice(i + 3) } : { title: raw, source: '' };
  };

  async function fetchNews(lang, st) {
    // 1) Own serverless endpoint (preferred: fast, cached, no third-party limits).
    try {
      const qs = new URLSearchParams({ lang });
      if (st) qs.set('state', st);
      const j = await fetchJSON(`/api/news?${qs}`, 10000);
      if (Array.isArray(j.items)) return j.items;
    } catch (_) { /* fall through */ }

    // 2) Fallback: public RSS-to-JSON converter over the Google News RSS feed.
    const hi = lang === 'hi';
    const q = hi
      ? `किसान OR कृषि OR मंडी OR फसल ${st || 'भारत'} when:7d`
      : `farmers OR agriculture OR mandi OR "crop prices" OR monsoon ${st || 'India'} when:7d`;
    const rss = `https://news.google.com/rss/search?q=${encodeURIComponent(q)}&hl=${hi ? 'hi' : 'en-IN'}&gl=IN&ceid=${hi ? 'IN:hi' : 'IN:en'}`;
    try {
      const j = await fetchJSON(`https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(rss)}`, 10000);
      if (j.status === 'ok' && Array.isArray(j.items) && j.items.length) {
        return j.items.slice(0, 6).map((it) => {
          const { title, source } = splitTitle(it.title || '');
          const published = it.pubDate ? `${String(it.pubDate).replace(' ', 'T')}Z` : '';
          return { title, source, link: it.link, published };
        });
      }
    } catch (_) { /* fall through */ }

    // 3) Fallback: fetch the RSS XML through public CORS proxies and parse it in the browser.
    const proxies = [
      (u) => `https://api.allorigins.win/raw?url=${encodeURIComponent(u)}`,
      (u) => `https://corsproxy.io/?${encodeURIComponent(u)}`,
      (u) => `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(u)}`,
    ];
    for (const mk of proxies) {
      try {
        const ctrl = new AbortController();
        const timer = setTimeout(() => ctrl.abort(), 10000);
        let xmlText;
        try {
          const res = await fetch(mk(rss), { signal: ctrl.signal });
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          xmlText = await res.text();
        } finally { clearTimeout(timer); }
        const doc = new DOMParser().parseFromString(xmlText, 'text/xml');
        const items = Array.from(doc.querySelectorAll('item')).slice(0, 6).map((it) => {
          const { title, source } = splitTitle((it.querySelector('title') || {}).textContent || '');
          const pub = (it.querySelector('pubDate') || {}).textContent || '';
          const d = pub ? new Date(pub) : null;
          return {
            title,
            source: source || ((it.querySelector('source') || {}).textContent || ''),
            link: (it.querySelector('link') || {}).textContent || '',
            published: d && !Number.isNaN(d.getTime()) ? d.toISOString() : '',
          };
        }).filter((x) => x.title && x.link);
        if (items.length) return items;
      } catch (_) { /* try the next proxy */ }
    }
    throw new Error('News unavailable');
  }

  async function loadNews(force = false) {
    const st = region().state;
    const key = `${state.lang}|${st || ''}`;
    const n = state.news;
    if (!force && n.key === key && n.status === 'ready' && Date.now() - n.at < REFRESH_MS) return;
    const mine = { key, status: 'loading', items: [], at: 0 };
    state.news = mine;
    refreshCard('news');
    try {
      const items = await fetchNews(state.lang, st);
      if (state.news !== mine) return;
      state.news = { key, status: 'ready', items: items.slice(0, 6), at: Date.now() };
    } catch (_) {
      if (state.news !== mine) return;
      state.news = { key, status: 'error', items: [], at: 0 };
    }
    refreshCard('news');
  }

  /* ----- Mandi prices ----- */

  // Direct fallback to the Govt. of India Open Government Data API (Agmarknet daily prices).
  async function fetchMandiDirect(crop, st, district) {
    const commodity = MANDI_COMMODITY[crop];
    if (!commodity) return { markets: [] };

    const query = async (withDistrict) => {
      const qs = new URLSearchParams({
        'api-key': DATA_GOV_KEY,
        format: 'json',
        limit: '100',
        'filters[state]': st,
        'filters[commodity]': commodity,
      });
      if (withDistrict && district) qs.set('filters[district]', district);
      const target = `https://api.data.gov.in/resource/${MANDI_RESOURCE}?${qs}`;
      // Try the API directly first; if the browser blocks it (CORS) or it fails, retry via CORS proxies.
      const attempts = [
        target,
        `https://api.allorigins.win/raw?url=${encodeURIComponent(target)}`,
        `https://corsproxy.io/?${encodeURIComponent(target)}`,
      ];
      let lastErr;
      for (const url of attempts) {
        try {
          const j = await fetchJSON(url, 15000);
          if (j && Array.isArray(j.records)) return j.records;
          lastErr = new Error('Unexpected mandi response');
        } catch (err) { lastErr = err; }
      }
      throw lastErr || new Error('Mandi unavailable');
    };

    let records = district ? await query(true) : [];
    if (!records.length) records = await query(false);

    const toISO = (s) => {
      const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(String(s || ''));
      return m ? `${m[3]}-${m[2]}-${m[1]}` : '';
    };
    const byMarket = new Map();
    for (const r of records) {
      const modal = Number(r.modal_price);
      if (!Number.isFinite(modal) || modal <= 0) continue;
      const row = {
        market: r.market || '',
        district: r.district || '',
        min: Number(r.min_price) || modal,
        max: Number(r.max_price) || modal,
        modal,
        date: toISO(r.arrival_date),
      };
      const prev = byMarket.get(row.market);
      if (!prev || row.date > prev.date) byMarket.set(row.market, row);
    }
    const markets = Array.from(byMarket.values())
      .sort((a, b) => (b.date || '').localeCompare(a.date || '') || b.modal - a.modal);
    return { markets };
  }

  async function fetchMandi(crop, st, district) {
    try {
      const qs = new URLSearchParams({ crop, state: st });
      if (district) qs.set('district', district);
      const j = await fetchJSON(`/api/mandi?${qs}`, 15000);
      if (Array.isArray(j.markets) && j.markets.length) return j;
    } catch (_) { /* fall through to the direct government API */ }
    return fetchMandiDirect(crop, st, district);
  }

  async function loadMandi() {
    if (!state.crop) { state.mandi = null; refreshCard('mandi'); return; }
    const { state: st, district } = region();
    if (!st) { state.mandi = { status: 'nostate' }; refreshCard('mandi'); return; }
    const mine = { key: `${state.crop}|${st}|${district || ''}`, status: 'loading' };
    state.mandi = mine;
    refreshCard('mandi');
    try {
      const j = await fetchMandi(state.crop, st, district);
      if (state.mandi !== mine) return;
      state.mandi = {
        key: mine.key,
        status: Array.isArray(j.markets) && j.markets.length ? 'ready' : 'empty',
        data: j,
      };
    } catch (_) {
      if (state.mandi !== mine) return;
      state.mandi = { key: mine.key, status: 'error' };
    }
    refreshCard('mandi');
  }

  /* ----- NASA POWER: satellite soil moisture, rain and sunshine ----- */

  async function fetchNasa(lat, lon) {
    const fmt = (d) => d.toISOString().slice(0, 10).replace(/-/g, '');
    const end = new Date();
    const start = new Date(Date.now() - 12 * 864e5);
    const url = 'https://power.larc.nasa.gov/api/temporal/daily/point'
      + '?parameters=T2M,PRECTOTCORR,GWETROOT,ALLSKY_SFC_SW_DWN&community=AG'
      + `&longitude=${lon.toFixed(4)}&latitude=${lat.toFixed(4)}`
      + `&start=${fmt(start)}&end=${fmt(end)}&format=JSON`;
    const j = await fetchJSON(url, 25000);
    const p = j && j.properties && j.properties.parameter;
    if (!p || !p.PRECTOTCORR) throw new Error('Unexpected NASA POWER response');

    const valid = (v) => Number.isFinite(v) && v > -900; // POWER uses -999 for "no data"
    const series = (name) => Object.keys(p[name] || {}).sort().filter((k) => valid(p[name][k]));

    const rainDates = series('PRECTOTCORR');
    if (!rainDates.length) throw new Error('No NASA POWER data');
    const last7 = rainDates.slice(-7);
    const rain7 = last7.reduce((s, k) => s + p.PRECTOTCORR[k], 0);

    const soilDates = series('GWETROOT');
    const soil = soilDates.length ? p.GWETROOT[soilDates[soilDates.length - 1]] : null;

    const avg = (name) => {
      const ks = series(name).slice(-7);
      return ks.length ? ks.reduce((s, k) => s + p[name][k], 0) / ks.length : null;
    };

    const ld = rainDates[rainDates.length - 1];
    const lastDate = new Date(Number(ld.slice(0, 4)), Number(ld.slice(4, 6)) - 1, Number(ld.slice(6, 8)));
    return { soil, rain7, sun: avg('ALLSKY_SFC_SW_DWN'), temp: avg('T2M'), lastDate };
  }

  async function loadNasa() {
    const key = placeKey();
    const mine = { key, status: 'loading', data: null };
    state.nasa = mine;
    refreshCard('nasa');
    try {
      const data = await fetchNasa(state.place.lat, state.place.lon);
      if (state.nasa !== mine) return;
      state.nasa = { key, status: 'ready', data };
    } catch (_) {
      if (state.nasa !== mine) return;
      state.nasa = { key, status: 'error', data: null };
    }
    refreshCard('nasa');
  }

  /* ----- NASA EONET: open cyclone and flood events near the place ----- */

  async function fetchHazards(lat, lon) {
    // bbox order for EONET: minLon, maxLat, maxLon, minLat
    const bbox = [lon - 12, lat + 10, lon + 12, lat - 10].map((n) => n.toFixed(2)).join(',');
    const url = `https://eonet.gsfc.nasa.gov/api/v3/events?status=open&category=severeStorms,floods&days=21&bbox=${bbox}`;
    const j = await fetchJSON(url, 15000);
    return (j.events || []).slice(0, 4).map((e) => {
      const g = e.geometry && e.geometry[e.geometry.length - 1];
      return {
        title: e.title || '',
        cat: (e.categories && e.categories[0] && e.categories[0].title) || '',
        link: (e.sources && e.sources[0] && e.sources[0].url) || e.link || '',
        date: (g && g.date) || '',
      };
    });
  }

  async function loadHazards() {
    const key = placeKey();
    const mine = { key, status: 'loading', items: [] };
    state.hazards = mine;
    refreshCard('outlook');
    try {
      const items = await fetchHazards(state.place.lat, state.place.lon);
      if (state.hazards !== mine) return;
      state.hazards = { key, status: 'ready', items };
    } catch (_) {
      if (state.hazards !== mine) return;
      state.hazards = { key, status: 'error', items: [] };
    }
    refreshCard('outlook');
  }

  /* ----- Open-Meteo Flood API (Copernicus GloFAS river discharge) ----- */

  async function fetchRiver(lat, lon) {
    const url = 'https://flood-api.open-meteo.com/v1/flood'
      + `?latitude=${lat}&longitude=${lon}&daily=river_discharge_max&forecast_days=7`;
    const j = await fetchJSON(url, 12000);
    const arr = j && j.daily && j.daily.river_discharge_max;
    if (!Array.isArray(arr)) return null;
    const vals = arr.filter((v) => Number.isFinite(v));
    if (vals.length < 2) return null;
    const base = vals[0];
    const peak = Math.max(...vals);
    return { base, peak, rise: base > 0 ? peak / base : 1 };
  }

  async function loadRiver() {
    const key = placeKey();
    const mine = { key, status: 'loading', data: null };
    state.river = mine;
    try {
      const data = await fetchRiver(state.place.lat, state.place.lon);
      if (state.river !== mine) return;
      state.river = { key, status: 'ready', data };
    } catch (_) {
      if (state.river !== mine) return;
      state.river = { key, status: 'error', data: null };
    }
    refreshCard('flood');
  }

  /* ───────────────────────── Map ───────────────────────── */

  let map = null;
  let marker = null;
  let radarLayer = null;
  let radarTime = null;
  let radarFailed = false;
  let radarSource = 'rainviewer'; // rainviewer | nasa
  let radarTileErrors = 0;

  function updateCaption() {
    const el = $('#map-caption');
    if (!el) return;
    if (radarFailed) el.textContent = t('radarFail');
    else if (state.radarOn && radarSource === 'nasa') el.textContent = t('radarNasa');
    else if (state.radarOn && radarTime) el.textContent = t('radarTime', { time: fmtTime(radarTime) });
    else el.textContent = t('mapHint');
  }

  function nasaRadarLayer() {
    // NASA GIBS, GPM IMERG precipitation rate (free, no key). WMTS order is {z}/{y}/{x}.
    return L.tileLayer(
      'https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/IMERG_Precipitation_Rate/default/default/GoogleMapsCompatible_Level6/{z}/{y}/{x}.png',
      {
        opacity: 0.7, maxNativeZoom: 6, maxZoom: 18, zIndex: 5,
        attribution: 'Rain &copy; <a href="https://earthdata.nasa.gov/gibs">NASA GIBS</a> / GPM IMERG',
      },
    );
  }

  function useNasaRadar() {
    if (!map) return;
    if (radarLayer && map.hasLayer(radarLayer)) map.removeLayer(radarLayer);
    radarSource = 'nasa';
    radarTime = null;
    radarFailed = false;
    radarLayer = nasaRadarLayer();
    if (state.radarOn) radarLayer.addTo(map);
    updateCaption();
  }

  function initMap() {
    const fallback = $('#map-fallback');
    if (typeof L === 'undefined') { if (fallback) fallback.hidden = false; return; }
    const { lat, lon } = state.place;
    map = L.map('map', { center: [lat, lon], zoom: 8, minZoom: 3, scrollWheelZoom: false, dragging: !L.Browser.mobile });
    // CARTO basemaps now require an API key, so use the standard OpenStreetMap tiles,
    // with Esri World Street Map as an automatic fallback if OSM tiles keep failing.
    const osm = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19,
    }).addTo(map);
    let osmErrors = 0;
    osm.on('tileerror', () => {
      osmErrors += 1;
      if (osmErrors === 6 && map.hasLayer(osm)) {
        map.removeLayer(osm);
        L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}', {
          attribution: 'Tiles &copy; Esri',
          maxZoom: 19,
        }).addTo(map).bringToBack();
      }
    });
    marker = L.marker([lat, lon], {
      icon: L.divIcon({ className: 'pin', html: '<span></span>', iconSize: [30, 30], iconAnchor: [15, 30] }),
      keyboard: false,
    }).addTo(map);
    map.on('focus', () => map.scrollWheelZoom.enable());
    map.on('blur', () => map.scrollWheelZoom.disable());
    map.on('click', onMapClick);
    window.addEventListener('resize', () => map && map.invalidateSize());
    loadRadar();
  }

  async function loadRadar() {
    try {
      const j = await fetchJSON('https://api.rainviewer.com/public/weather-maps.json');
      const frames = j.radar && j.radar.past;
      if (!frames || !frames.length) throw new Error('No radar frames');
      const last = frames[frames.length - 1];
      radarTime = new Date(last.time * 1000);
      radarSource = 'rainviewer';
      radarTileErrors = 0;
      radarLayer = L.tileLayer(`${j.host}${last.path}/256/{z}/{x}/{y}/2/1_1.png`, {
        opacity: 0.7, maxNativeZoom: 7, maxZoom: 18, zIndex: 5,
        attribution: 'Radar &copy; <a href="https://www.rainviewer.com/">RainViewer</a>',
      });
      // If RainViewer tiles keep failing, switch to NASA satellite rainfall automatically.
      radarLayer.on('tileerror', () => {
        radarTileErrors += 1;
        if (radarSource === 'rainviewer' && radarTileErrors >= 6) useNasaRadar();
      });
      if (state.radarOn) radarLayer.addTo(map);
      radarFailed = false;
      updateCaption();
    } catch (_) {
      useNasaRadar();
    }
  }

  function toggleRadar() {
    state.radarOn = !state.radarOn;
    $('#radar-toggle').setAttribute('aria-pressed', String(state.radarOn));
    if (map && radarLayer) { if (state.radarOn) radarLayer.addTo(map); else map.removeLayer(radarLayer); }
    persist();
    updateCaption();
  }

  function moveMap(lat, lon) {
    if (!map) return;
    marker.setLatLng([lat, lon]);
    map.setView([lat, lon], Math.max(map.getZoom(), 8), { animate: true });
  }

  async function reverseName(lat, lon) {
    // 1) Nominatim (OpenStreetMap)
    try {
      const j = await fetchJSON(
        `https://nominatim.openstreetmap.org/reverse?format=jsonv2&zoom=12&accept-language=en&lat=${lat}&lon=${lon}`, 6000);
      const a = j.address || {};
      const local = a.village || a.hamlet || a.town || a.suburb || a.city || a.county;
      const district = a.state_district || a.county;
      const parts = [local, district && district !== local ? district : null, a.state].filter(Boolean);
      if (parts.length) return parts.join(', ');
    } catch (_) { /* fall through */ }
    // 2) BigDataCloud free client-side reverse geocoder
    try {
      const j = await fetchJSON(
        `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=en`, 6000);
      const parts = [j.locality || j.city, j.principalSubdivision].filter(Boolean);
      if (parts.length) return parts.join(', ');
    } catch (_) { /* fall through */ }
    return null;
  }

  async function onMapClick(e) {
    const { lat, lng } = e.latlng;
    marker.setLatLng(e.latlng);
    const name = (await reverseName(lat, lng)) || `${t('pinned')} ${lat.toFixed(2)}°N ${lng.toFixed(2)}°E`;
    setPlace({ name, lat, lon: lng }, { skipMove: true });
  }

  function locateMe() {
    if (!('geolocation' in navigator)) { toast(t('locUnsupported')); return; }
    toast(t('locating'));
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude: lat, longitude: lon } = pos.coords;
        const name = (await reverseName(lat, lon)) || t('myLocationName');
        setPlace({ name, lat, lon });
        const el = $('#toast');
        if (el) el.hidden = true;
      },
      () => toast(t('locDenied')),
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 },
    );
  }

  /* ───────────────────────── Place selection ───────────────────────── */

  function setPlace(place, opts = {}) {
    state.place = { name: place.name, lat: Number(place.lat), lon: Number(place.lon) };
    state.data = null;
    state.nasa = null;
    state.hazards = null;
    state.river = null;
    persist();
    updatePlaceUI();
    if (!opts.skipMove) moveMap(state.place.lat, state.place.lon);
    render();
    loadAll();
  }

  let dlg, searchInput, resultsEl, dlgStatus;
  let dialogResults = [];
  let searchTimer;
  let searchToken = 0;

  function showResults(list, statusText) {
    dialogResults = list;
    dlgStatus.textContent = statusText || '';
    resultsEl.innerHTML = list.map((p, i) => `
      <li><button type="button" data-idx="${i}">${icon('pin', 18)}<span>${esc(p.name)}</span></button></li>`).join('');
  }

  function openDialog() {
    searchInput.value = '';
    showResults(PLACES, t('popular'));
    if (typeof dlg.showModal === 'function') dlg.showModal(); else dlg.setAttribute('open', '');
    searchInput.focus();
  }

  async function runSearch(q) {
    const token = ++searchToken;
    dlgStatus.textContent = t('searching');
    try {
      const j = await fetchJSON(
        `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(q)}&count=10&language=en&format=json`, 8000);
      if (token !== searchToken) return;
      const list = (j.results || [])
        .filter((r) => r.country_code === 'IN')
        .map((r) => ({
          name: [r.name, r.admin2 && r.admin2 !== r.name ? r.admin2 : null, r.admin1].filter(Boolean).join(', '),
          lat: r.latitude,
          lon: r.longitude,
        }));
      showResults(list, list.length ? '' : t('noResults'));
    } catch (_) {
      if (token === searchToken) showResults([], t('searchFail'));
    }
  }

  /* ───────────────────────── Events ───────────────────────── */

  function bindEvents() {
    $('#change-place').addEventListener('click', openDialog);
    $('#dlg-close').addEventListener('click', () => dlg.close());
    dlg.addEventListener('click', (e) => { if (e.target === dlg) dlg.close(); });

    searchInput.addEventListener('input', () => {
      clearTimeout(searchTimer);
      const q = searchInput.value.trim();
      if (q.length < 2) { searchToken++; showResults(PLACES, t('popular')); return; }
      searchTimer = setTimeout(() => runSearch(q), 350);
    });

    resultsEl.addEventListener('click', (e) => {
      const btn = e.target.closest('button[data-idx]');
      if (!btn) return;
      const p = dialogResults[Number(btn.dataset.idx)];
      if (p) { dlg.close(); setPlace(p); }
    });

    $('#lang-toggle').addEventListener('click', () => {
      state.lang = state.lang === 'en' ? 'hi' : 'en';
      if (canSpeak) window.speechSynthesis.cancel();
      persist();
      applyStatic();
      render();
      loadNews();
    });

    $('#radar-toggle').addEventListener('click', toggleRadar);
    $('#locate-btn').addEventListener('click', locateMe);

    $('#content').addEventListener('click', (e) => {
      const speakEl = e.target.closest('[data-speak]');
      if (speakEl) { speak(speechTexts.get(speakEl.dataset.speak), speakEl); return; }

      const cropEl = e.target.closest('[data-crop]');
      if (cropEl) {
        const picked = cropEl.dataset.crop;
        state.crop = state.crop === picked ? null : picked;
        persist();
        render();
        const again = $(`[data-crop="${picked}"]`);
        if (again) again.focus({ preventScroll: true });
        loadMandi();
        return;
      }

      const actionEl = e.target.closest('[data-action]');
      if (!actionEl) return;
      const a = actionEl.dataset.action;
      if (a === 'retry') { state.data = null; render(); loadAll(); }
      else if (a === 'refresh') loadAll(true);
      else if (a === 'news-retry') loadNews(true);
      else if (a === 'mandi-retry') loadMandi();
      else if (a === 'nasa-retry') loadNasa();
    });

    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible' && state.updated
        && Date.now() - state.updated.getTime() > REFRESH_MS) {
        loadAll(true);
      }
    });
  }

  /* ───────────────────────── Init ───────────────────────── */

  function init() {
    dlg = $('#place-dialog');
    searchInput = $('#place-search');
    resultsEl = $('#place-results');
    dlgStatus = $('#dlg-status');

    applyStatic();
    $('#radar-toggle').setAttribute('aria-pressed', String(state.radarOn));
    bindEvents();
    initMap();
    render();
    loadAll();
    if (canSpeak) window.speechSynthesis.getVoices();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();