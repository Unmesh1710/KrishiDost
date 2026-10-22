/* KrishiDost – app.js
 * Live weather (Open-Meteo), rain radar (RainViewer), map (Leaflet + OpenStreetMap),
 * live farm news (Google News via /api/news), AI assistant with voice in/out (via /api/assistant),
 * English/Hindi UI, text-to-speech and crop-specific advice.
 */
(() => {
  'use strict';

  /* ───────────────────────── Config ───────────────────────── */

  const STORAGE_KEY = 'krishidost:v3';
  const REFRESH_MS = 30 * 60 * 1000;

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
    mic: '<path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><path d="M12 19v3"/>',
    send: '<path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/>',
    sparkles: '<path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z"/>',
    stop: '<rect x="6" y="6" width="12" height="12" rx="2"/>',
    layers: '<path d="m12 2 10 5-10 5L2 7z"/><path d="m2 12 10 5 10-5"/><path d="m2 17 10 5 10-5"/>',
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
      outlookClear: 'No extended cyclone or flood bulletin is available here. Plan drainage and safe crop storage, and check official IMD updates.',
      outlookWatch: 'About {mm} mm of rain is forecast over the next 14 days. Plan drainage, move stored grain to higher ground and follow IMD bulletins.',
      chartLabel: 'Daily rainfall for the next 14 days. Total {mm} mm.',
      chartToday: 'Today',
      chartEnd: 'Day 14',
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
      floodNote: 'Rainfall-based estimate. Follow official flood warnings from CWC and your district office.',
      adviceTitle: 'KrishiDost advice',
      advicePrompt: 'Choose a crop above to see your advice.',
      newsTitle: 'Agri news and updates',
      newsEmpty: 'No recent farm stories found for this area.',
      newsFail: 'Could not load the latest news.',
      newsSource: 'Headlines from Google News. Tap a story to read it on the publisher’s site.',
      aiTitle: 'Ask KrishiDost AI',
      aiHint: 'Ask about weather, crops, pests or irrigation. Type, or tap the mic and speak. I answer in text and voice.',
      aiPlaceholder: 'Type your question…',
      aiMic: 'Speak your question',
      aiSend: 'Send',
      aiStop: 'Stop voice',
      aiListening: 'Listening… speak now',
      aiThinking: 'Thinking…',
      aiSpeaking: 'Speaking…',
      aiNote: 'AI can make mistakes. Follow pesticide labels and confirm with your local agriculture office (KVK).',
      aiNotSetup: 'The assistant is not set up on this site yet.',
      aiFail: 'Sorry, I could not answer right now. Please try again.',
      aiNoVoiceIn: 'Voice input is not supported in this browser, so please type your question.',
      aiNoVoiceOut: 'Voice replies are not supported in this browser.',
      micDenied: 'Microphone access was blocked. You can type instead.',
      micError: 'Voice input failed. Please try again or type.',
      aiQ1: 'Should I spray today?',
      aiQ2: 'When should I irrigate?',
      aiQ3: 'Will it rain this week?',
      aiQ4: 'Is my crop at risk?',
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
      outlookClear: 'यहां कोई लंबा चक्रवात या बाढ़ बुलेटिन उपलब्ध नहीं है। निकासी और फसल के सुरक्षित भंडारण की योजना बनाएं, और IMD की आधिकारिक सूचनाएं देखें।',
      outlookWatch: 'अगले 14 दिनों में लगभग {mm} मिमी बारिश का अनुमान है। निकासी की योजना बनाएं, भंडारित अनाज ऊंची जगह रखें और IMD की सूचनाएं देखें।',
      chartLabel: 'अगले 14 दिनों की दैनिक वर्षा। कुल {mm} मिमी।',
      chartToday: 'आज',
      chartEnd: '14वां दिन',
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
      floodNote: 'यह वर्षा पर आधारित अनुमान है। CWC और जिला कार्यालय की आधिकारिक चेतावनी देखें।',
      adviceTitle: 'कृषिदोस्त सलाह',
      advicePrompt: 'सलाह देखने के लिए ऊपर से फसल चुनें।',
      newsTitle: 'कृषि समाचार और अपडेट',
      newsEmpty: 'इस क्षेत्र के लिए हाल की कृषि खबरें नहीं मिलीं।',
      newsFail: 'ताज़ा खबरें लोड नहीं हो सकीं।',
      newsSource: 'शीर्षक Google News से हैं। पूरी खबर प्रकाशक की साइट पर पढ़ने के लिए टैप करें।',
      aiTitle: 'कृषिदोस्त AI से पूछें',
      aiHint: 'मौसम, फसल, कीट या सिंचाई के बारे में पूछें। लिखें, या माइक दबाकर बोलें। मैं लिखकर और बोलकर जवाब दूंगा।',
      aiPlaceholder: 'अपना सवाल लिखें…',
      aiMic: 'बोलकर पूछें',
      aiSend: 'भेजें',
      aiStop: 'आवाज़ रोकें',
      aiListening: 'सुन रहा हूं… अब बोलें',
      aiThinking: 'सोच रहा हूं…',
      aiSpeaking: 'बोल रहा हूं…',
      aiNote: 'AI से गलती हो सकती है। कीटनाशक के लेबल का पालन करें और अपने कृषि कार्यालय (KVK) से पुष्टि करें।',
      aiNotSetup: 'इस साइट पर सहायक अभी चालू नहीं किया गया है।',
      aiFail: 'माफ़ कीजिए, अभी जवाब नहीं दे सका। कृपया फिर कोशिश करें।',
      aiNoVoiceIn: 'इस ब्राउज़र में आवाज़ से इनपुट उपलब्ध नहीं है, कृपया सवाल लिखें।',
      aiNoVoiceOut: 'इस ब्राउज़र में आवाज़ में जवाब उपलब्ध नहीं है।',
      micDenied: 'माइक की अनुमति नहीं मिली। आप लिखकर पूछ सकते हैं।',
      micError: 'आवाज़ से इनपुट विफल रहा। फिर कोशिश करें या लिखें।',
      aiQ1: 'क्या आज छिड़काव करूं?',
      aiQ2: 'सिंचाई कब करूं?',
      aiQ3: 'इस हफ्ते बारिश होगी?',
      aiQ4: 'क्या मेरी फसल को खतरा है?',
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
    chat: { messages: [], busy: false, listening: false, speaking: false, draft: '' },
  };

  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    if (saved.place && Number.isFinite(saved.place.lat) && Number.isFinite(saved.place.lon)) state.place = saved.place;
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

  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const safeUrl = (u) => (/^https?:\/\//i.test(u) ? u : '#');

  const t = (key, vars = {}) => {
    let s = (I18N[state.lang] && I18N[state.lang][key]) ?? I18N.en[key] ?? key;
    for (const k in vars) s = s.split(`{${k}}`).join(vars[k]);
    return s;
  };

  const shortName = (name) => String(name).split(',')[0].trim();
  const fmtTime = (d) => d.toLocaleTimeString(locale(), { hour: 'numeric', minute: '2-digit' });
  const weekday = (d) => d.toLocaleDateString(locale(), { weekday: 'long' });

  function ago(value) {
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return '';
    const diff = (d.getTime() - Date.now()) / 1000;
    const rtf = new Intl.RelativeTimeFormat(locale(), { numeric: 'auto' });
    const mins = Math.round(diff / 60);
    if (Math.abs(mins) < 60) return rtf.format(Math.min(mins, 0), 'minute');
    const hrs = Math.round(diff / 3600);
    if (Math.abs(hrs) < 24) return rtf.format(hrs, 'hour');
    return rtf.format(Math.round(diff / 86400), 'day');
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
    const maxDay = Math.max(0, ...days.map((x) => x.rain));
    const stormSoon = next3.some((x) => x.code >= 95 || x.rain >= 65);

    let flood = 'Low';
    if (rain3 >= 150 || maxDay >= 100) flood = 'High';
    else if (rain3 >= 60 || maxDay >= 50) flood = 'Medium';

    const wetDays = next3.filter((x) => x.prob >= 50 || x.rain >= 5).length;
    const humidity = d.current.relative_humidity_2m ?? 0;

    return {
      days, next3, rain3, rain14, stormSoon, flood, wetDays,
      warn: stormSoon || flood === 'High',
      watch14: rain14 >= 250 || maxDay >= 100,
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

  // Hindi text (Devanagari) is read with a Hindi voice, everything else with Indian English.
  const speechLang = (text) => (/[\u0900-\u097F]/.test(text) ? 'hi-IN' : 'en-IN');

  // Some mobile browsers only allow speech after a tap, so "warm up" the engine inside the tap.
  function unlockSpeech() {
    if (!canSpeak) return;
    try {
      const u = new SpeechSynthesisUtterance(' ');
      u.volume = 0;
      window.speechSynthesis.speak(u);
    } catch (_) { /* ignore */ }
  }

  function stopSpeaking() {
    currentUtter = null;
    if (canSpeak) window.speechSynthesis.cancel();
    clearSpeaking();
    if (state.chat.speaking) { state.chat.speaking = false; updateChat(false); }
  }

  function speak(text, btn, opts = {}) {
    if (!canSpeak || !text) return;
    const same = btn && btn.classList.contains('is-speaking');
    stopSpeaking();
    if (same) return;
    const u = new SpeechSynthesisUtterance(text);
    u.lang = speechLang(text);
    const voices = window.speechSynthesis.getVoices();
    const want = u.lang.toLowerCase();
    const voice = voices.find((v) => v.lang.replace('_', '-').toLowerCase() === want)
      || voices.find((v) => v.lang.toLowerCase().startsWith(want.slice(0, 2)));
    if (voice) u.voice = voice;
    currentUtter = u;
    u.onstart = () => { if (currentUtter === u && opts.onstart) opts.onstart(); };
    const done = () => {
      if (currentUtter !== u) return;
      currentUtter = null;
      clearSpeaking();
      if (opts.onend) opts.onend();
    };
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

  function outlookCard(m) {
    const text = m.watch14 ? t('outlookWatch', { mm: Math.round(m.rain14) }) : t('outlookClear');
    return `
      <section class="card col-5" aria-labelledby="h-outlook">
        <div class="card-head">
          <span class="badge-icon">${icon('cloud', 22)}</span>
          <h2 id="h-outlook">${esc(t('outlookTitle'))}</h2>
        </div>
        <p class="lead">${esc(text)}</p>
        ${rainChart(m)}
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
    return `
      <section class="card col-4" aria-labelledby="h-flood">
        <div class="card-head">
          <span class="badge-icon is-rain">${icon('waves', 22)}</span>
          <h2 id="h-flood">${esc(t('floodTitle'))}</h2>
        </div>
        <span class="risk ${cls}">${esc(level)}</span>
        <p class="body">${esc(t('floodText', { level: level.toLowerCase(), mm: Math.round(m.rain3) }))}</p>
        <p class="note">${esc(t('floodNote'))}</p>
      </section>`;
  }

  const skLines = (n = 3) => Array.from({ length: n }, (_, i) => `<div class="sk-line${i === n - 1 ? ' short' : ''}"></div>`).join('');

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

  /* ───────────────────────── AI assistant (text + voice in, text + voice out) ───────────────────────── */

  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  let recognition = null;

  function assistantContext() {
    const ctx = {
      place: state.place.name,
      appLanguage: state.lang === 'hi' ? 'Hindi' : 'English',
      crop: state.crop ? CROPS[state.crop].name[0] : null,
      today: new Date().toLocaleDateString('en-CA'),
    };
    if (state.data) {
      const m = derive(state.data);
      const cond = (code) => I18N.en[wxKey(code)];
      ctx.now = {
        tempC: Math.round(m.now.temp), feelsLikeC: Math.round(m.now.feels),
        humidityPct: m.now.hum, windKmh: Math.round(m.now.wind), condition: cond(m.now.code),
      };
      ctx.next3Days = m.next3.map((d) => ({
        date: d.date.toLocaleDateString('en-CA'),
        maxC: Math.round(d.tMax), minC: Math.round(d.tMin),
        rainChancePct: d.prob, rainMm: Math.round(d.rain), condition: cond(d.code),
      }));
      ctx.rainNext14DaysMm = Math.round(m.rain14);
      ctx.floodRisk = m.flood;
      ctx.stormLikelyNext3Days = m.stormSoon;
      ctx.pestRisk = m.pestHigh ? 'elevated' : 'low';
    }
    return ctx;
  }

  function chatLogHTML() {
    const c = state.chat;
    if (!c.messages.length && !c.busy) return `<p class="chat-hint">${esc(t('aiHint'))}</p>`;
    const rows = c.messages.map((m) => {
      const bot = m.role !== 'user';
      const replay = bot && canSpeak
        ? `<button type="button" class="icon-btn" data-speak="${registerSpeech(m.text)}" aria-label="${esc(t('listen'))}">${icon('volume', 18)}</button>`
        : '';
      return `<div class="msg-row ${bot ? 'is-bot' : 'is-user'}${m.error ? ' is-error' : ''}"><p class="bubble">${esc(m.text)}</p>${replay}</div>`;
    }).join('');
    const typing = c.busy
      ? `<div class="msg-row is-bot"><p class="bubble typing" aria-label="${esc(t('aiThinking'))}"><i></i><i></i><i></i></p></div>`
      : '';
    return rows + typing;
  }

  function assistantCard() {
    const c = state.chat;
    const prompts = ['aiQ1', 'aiQ2', 'aiQ3', 'aiQ4']
      .map((k) => `<button type="button" class="chip" data-ai-prompt="${esc(t(k))}">${esc(t(k))}</button>`).join('');
    const notes = [t('aiNote'), SR ? '' : t('aiNoVoiceIn'), canSpeak ? '' : t('aiNoVoiceOut')].filter(Boolean).join(' ');
    return `
      <section class="card col-5" id="card-assistant" aria-labelledby="h-ai">
        <div class="card-head">
          <span class="badge-icon is-ai">${icon('sparkles', 22)}</span>
          <h2 id="h-ai">${esc(t('aiTitle'))}</h2>
          <span class="live live--ai">AI</span>
        </div>
        <div class="chat-log" id="chat-log" role="log" aria-live="polite">${chatLogHTML()}</div>
        <p class="chat-status" id="chat-status" role="status"></p>
        <div class="chat-prompts" id="chat-prompts"${c.messages.length ? ' hidden' : ''}>${prompts}</div>
        <form class="chat-form" id="chat-form" autocomplete="off">
          ${SR ? `<button type="button" class="round-btn${c.listening ? ' is-listening' : ''}" id="chat-mic" data-ai-mic aria-pressed="${c.listening}" aria-label="${esc(t('aiMic'))}">${icon('mic', 22)}</button>` : ''}
          <input id="chat-input" type="text" maxlength="500" placeholder="${esc(t('aiPlaceholder'))}" aria-label="${esc(t('aiPlaceholder'))}" value="${esc(c.draft)}">
          <button type="submit" class="round-btn primary" id="chat-send" aria-label="${esc(t('aiSend'))}"${c.busy ? ' disabled' : ''}>${icon('send', 20)}</button>
          <button type="button" class="round-btn" id="chat-stop" data-ai-stop aria-label="${esc(t('aiStop'))}"${c.speaking ? '' : ' hidden'}>${icon('stop', 20)}</button>
        </form>
        <p class="note">${esc(notes)}</p>
      </section>`;
  }

  // Update only the parts of the chat that change, so typing and focus are never lost.
  function updateChat(scroll = true) {
    const log = $('#chat-log');
    if (!log) return;
    const c = state.chat;
    log.innerHTML = chatLogHTML();
    if (scroll) log.scrollTop = log.scrollHeight;
    const status = $('#chat-status');
    status.textContent = c.listening ? t('aiListening') : c.busy ? t('aiThinking') : c.speaking ? t('aiSpeaking') : '';
    const mic = $('#chat-mic');
    if (mic) { mic.classList.toggle('is-listening', c.listening); mic.setAttribute('aria-pressed', String(c.listening)); }
    $('#chat-send').disabled = c.busy;
    $('#chat-stop').hidden = !c.speaking;
    $('#chat-prompts').hidden = c.messages.length > 0;
  }

  function setDraft(value) {
    state.chat.draft = value;
    const input = $('#chat-input');
    if (input) input.value = value;
  }

  function abortListening() {
    if (!recognition) return;
    const r = recognition;
    recognition = null;
    try { r.abort(); } catch (_) { /* ignore */ }
    state.chat.listening = false;
  }

  function speakAssistant(text) {
    speak(text, null, {
      onstart: () => { state.chat.speaking = true; updateChat(false); },
      onend: () => { state.chat.speaking = false; updateChat(false); },
    });
  }

  async function askAssistant() {
    const history = state.chat.messages
      .filter((m) => !m.error)
      .slice(-8)
      .map((m) => ({ role: m.role === 'user' ? 'user' : 'assistant', content: m.text }));
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 30000);
    try {
      const res = await fetch('/api/assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: history, context: assistantContext(), lang: state.lang }),
        signal: ctrl.signal,
      });
      const j = await res.json().catch(() => ({}));
      if (res.ok && j.reply) return { text: j.reply };
      return { text: t(j.error === 'not_configured' || res.status === 404 ? 'aiNotSetup' : 'aiFail'), error: true };
    } catch (_) {
      return { text: t('aiFail'), error: true };
    } finally {
      clearTimeout(timer);
    }
  }

  async function sendChat(raw) {
    const text = String(raw || '').trim().slice(0, 500);
    const c = state.chat;
    if (!text || c.busy) return;
    abortListening();
    unlockSpeech();
    stopSpeaking();
    c.messages.push({ role: 'user', text });
    c.busy = true;
    setDraft('');
    updateChat();

    const reply = await askAssistant();

    c.messages.push({ role: 'assistant', text: reply.text, error: !!reply.error });
    c.busy = false;
    updateChat();
    speakAssistant(reply.text); // every answer is also spoken aloud
  }

  function toggleMic() {
    if (!SR) { toast(t('aiNoVoiceIn')); return; }
    const c = state.chat;
    if (c.listening && recognition) { recognition.stop(); return; }
    unlockSpeech();
    stopSpeaking();

    const rec = new SR();
    recognition = rec;
    rec.lang = locale();
    rec.interimResults = true;
    rec.continuous = false;
    rec.maxAlternatives = 1;
    let finalText = '';

    rec.onresult = (e) => {
      let interim = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i];
        if (r.isFinal) finalText += r[0].transcript; else interim += r[0].transcript;
      }
      setDraft((finalText + interim).trim());
    };
    rec.onerror = (e) => {
      if (e.error === 'not-allowed' || e.error === 'service-not-allowed') toast(t('micDenied'));
      else if (e.error !== 'aborted' && e.error !== 'no-speech') toast(t('micError'));
    };
    rec.onend = () => {
      const mine = recognition === rec;
      if (mine) recognition = null;
      c.listening = false;
      updateChat(false);
      if (!mine) return; // cancelled on purpose (e.g. a prompt was tapped or language changed)
      const text = (finalText || c.draft).trim();
      if (text) sendChat(text);
    };

    try {
      rec.start();
      c.listening = true;
      updateChat(false);
    } catch (_) {
      recognition = null;
      toast(t('micError'));
    }
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
    speechTexts.clear();
    if (!state.data) {
      root.innerHTML = state.status === 'error' ? errorCard() : skeleton();
      return;
    }
    const m = derive(state.data);
    root.innerHTML = `<div class="grid">
      ${statusCard(m)}${outlookCard(m)}${cropPicker()}${pestCard(m)}${adviceCard(m)}
      ${forecastCard(m)}${floodCard(m)}${newsCard()}${assistantCard()}
    </div>`;
  }

  // Replace a single card without re-rendering (and re-focusing) the whole page.
  function refreshCard(which) {
    const el = $(`#card-${which}`);
    if (!el) return;
    el.outerHTML = newsCard();
  }

  function applyStatic() {
    document.documentElement.lang = state.lang === 'hi' ? 'hi' : 'en';
    $$('[data-i18n]').forEach((el) => { el.textContent = t(el.dataset.i18n); });
    $$('[data-i18n-placeholder]').forEach((el) => { el.placeholder = t(el.dataset.i18nPlaceholder); });
    $$('[data-i18n-aria]').forEach((el) => { el.setAttribute('aria-label', t(el.dataset.i18nAria)); });
    $$('[data-icon]').forEach((el) => { el.innerHTML = icon(el.dataset.icon, Number(el.dataset.size) || 18); });
    const lb = $('#lang-toggle');
    lb.textContent = state.lang === 'en' ? 'हिन्दी' : 'English';
    lb.lang = state.lang === 'en' ? 'hi' : 'en';
    updatePlaceUI();
    updateCaption();
  }

  function updatePlaceUI() {
    $('#place-name').innerHTML = `${icon('pin', 16)}<span>${esc(state.place.name)}</span>`;
    $('#map-label-text').textContent = shortName(state.place.name);
  }

  /* ───────────────────────── Live data loaders ───────────────────────── */

  let reqToken = 0;
  let refreshTimer;

  async function loadWeather() {
    const token = ++reqToken;
    state.status = 'loading';
    if (!state.data) render();
    $('#content').classList.add('is-busy');
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
    $('#content').classList.remove('is-busy');
    render();
    clearTimeout(refreshTimer);
    refreshTimer = setTimeout(() => { loadWeather(); loadNews(true); }, REFRESH_MS);
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
    const j = await fetchJSON(`https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(rss)}`, 10000);
    if (j.status !== 'ok' || !Array.isArray(j.items)) throw new Error('News unavailable');
    return j.items.slice(0, 6).map((it) => {
      const { title, source } = splitTitle(it.title || '');
      const published = it.pubDate ? `${String(it.pubDate).replace(' ', 'T')}Z` : '';
      return { title, source, link: it.link, published };
    });
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

  /* ───────────────────────── Map ───────────────────────── */

  let map = null;
  let marker = null;
  let radarLayer = null;
  let radarTime = null;
  let radarFailed = false;

  function updateCaption() {
    const el = $('#map-caption');
    if (!el) return;
    if (radarFailed) el.textContent = t('radarFail');
    else if (state.radarOn && radarTime) el.textContent = t('radarTime', { time: fmtTime(radarTime) });
    else el.textContent = t('mapHint');
  }

  function initMap() {
    if (typeof L === 'undefined') { $('#map-fallback').hidden = false; return; }
    const { lat, lon } = state.place;
    map = L.map('map', { center: [lat, lon], zoom: 8, minZoom: 3, scrollWheelZoom: false, dragging: !L.Browser.mobile });
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 18,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(map);
    marker = L.marker([lat, lon], {
      icon: L.divIcon({ className: 'pin', html: '<span></span>', iconSize: [30, 30], iconAnchor: [15, 30] }),
      keyboard: false,
    }).addTo(map);
    map.on('focus', () => map.scrollWheelZoom.enable());
    map.on('blur', () => map.scrollWheelZoom.disable());
    map.on('click', onMapClick);
    loadRadar();
  }

  async function loadRadar() {
    try {
      const j = await fetchJSON('https://api.rainviewer.com/public/weather-maps.json');
      const frames = j.radar && j.radar.past;
      if (!frames || !frames.length) throw new Error('No radar frames');
      const last = frames[frames.length - 1];
      radarTime = new Date(last.time * 1000);
      radarLayer = L.tileLayer(`${j.host}${last.path}/256/{z}/{x}/{y}/2/1_1.png`, {
        opacity: 0.7, maxNativeZoom: 7, maxZoom: 18, zIndex: 5,
        attribution: 'Radar &copy; <a href="https://www.rainviewer.com/">RainViewer</a>',
      });
      if (state.radarOn) radarLayer.addTo(map);
      radarFailed = false;
    } catch (_) { radarFailed = true; }
    updateCaption();
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
    try {
      const j = await fetchJSON(
        `https://nominatim.openstreetmap.org/reverse?format=jsonv2&zoom=12&accept-language=en&lat=${lat}&lon=${lon}`, 6000);
      const a = j.address || {};
      const local = a.village || a.hamlet || a.town || a.suburb || a.city || a.county || a.state_district;
      const parts = [local, a.state].filter(Boolean);
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
        $('#toast').hidden = true;
      },
      () => toast(t('locDenied')),
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 },
    );
  }

  /* ───────────────────────── Place selection ───────────────────────── */

  function setPlace(place, opts = {}) {
    state.place = { name: place.name, lat: Number(place.lat), lon: Number(place.lon) };
    state.data = null;
    persist();
    updatePlaceUI();
    if (!opts.skipMove) moveMap(state.place.lat, state.place.lon);
    render();
    loadWeather();
    loadNews();
  }

  const dlg = $('#place-dialog');
  const searchInput = $('#place-search');
  const resultsEl = $('#place-results');
  const dlgStatus = $('#dlg-status');
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
      abortListening();
      stopSpeaking();
      persist();
      applyStatic();
      render();
      loadNews();
    });

    $('#radar-toggle').addEventListener('click', toggleRadar);
    $('#locate-btn').addEventListener('click', locateMe);

    $('#content').addEventListener('submit', (e) => {
      if (e.target.id !== 'chat-form') return;
      e.preventDefault();
      sendChat(($('#chat-input') || {}).value || '');
    });
    $('#content').addEventListener('input', (e) => {
      if (e.target.id === 'chat-input') state.chat.draft = e.target.value;
    });

    $('#content').addEventListener('click', (e) => {
      const speakEl = e.target.closest('[data-speak]');
      if (speakEl) { speak(speechTexts.get(speakEl.dataset.speak), speakEl); return; }

      const promptEl = e.target.closest('[data-ai-prompt]');
      if (promptEl) { sendChat(promptEl.dataset.aiPrompt); return; }
      if (e.target.closest('[data-ai-mic]')) { toggleMic(); return; }
      if (e.target.closest('[data-ai-stop]')) { stopSpeaking(); return; }

      const cropEl = e.target.closest('[data-crop]');
      if (cropEl) {
        const picked = cropEl.dataset.crop;
        state.crop = state.crop === picked ? null : picked;
        persist();
        render();
        const again = $(`[data-crop="${picked}"]`);
        if (again) again.focus({ preventScroll: true });
        return;
      }

      const actionEl = e.target.closest('[data-action]');
      if (!actionEl) return;
      const a = actionEl.dataset.action;
      if (a === 'retry') { state.data = null; render(); loadWeather(); }
      else if (a === 'refresh') { loadWeather(); loadNews(true); }
      else if (a === 'news-retry') loadNews(true);
    });

    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible' && state.updated && Date.now() - state.updated > REFRESH_MS) {
        loadWeather(); loadNews(true);
      }
    });
  }

  /* ───────────────────────── Init ───────────────────────── */

  function init() {
    applyStatic();
    $('#radar-toggle').setAttribute('aria-pressed', String(state.radarOn));
    bindEvents();
    initMap();
    render();
    loadWeather();
    loadNews();
    if (canSpeak) window.speechSynthesis.getVoices();
  }

  init();
})();
