
/* ───────── KrishiDost AI Assistant ───────── */

(() => {
  const root = document.getElementById("krishi-ai");
  if (!root || root.dataset.initialized === "true") return;
  root.dataset.initialized = "true";

  const language = root.querySelector("#ai-language");
  const greeting = root.querySelector("#ai-greeting");
  const description = root.querySelector("#ai-description");
  const questionInput = root.querySelector("#ai-question");
  const form = root.querySelector("#ai-form");
  const answer = root.querySelector("#ai-answer");
  const mic = root.querySelector("#ai-mic");
  const status = root.querySelector("#ai-status");
  const speakButton = root.querySelector("#ai-speak");

  const copy = {
    "bn-IN": {
      greeting: "নমস্কার! আমি কৃষিদোস্ত।",
      description: "আপনার চাষাবাদ সম্পর্কে প্রশ্ন করুন।",
      placeholder: "চাষাবাদ সম্পর্কে প্রশ্ন লিখুন...",
      ready: "সাহায্য করতে প্রস্তুত",
      listening: "আপনার কথা শুনছি...",
      unsupported: "এই ব্রাউজারে ভয়েস ইনপুট সমর্থিত নয়। লিখে প্রশ্ন করুন।",
      empty: "দয়া করে একটি প্রশ্ন লিখুন বা মাইক্রোফোন ব্যবহার করুন।",
      fallback: "এই বিষয়ে নির্ভরযোগ্য তথ্য যাচাই করুন। আপনার ফসল ও এলাকার নাম জানালে আরও নির্দিষ্ট পরামর্শ পাওয়া সহজ হবে।",
      rain: "ভারী বৃষ্টির আগে স্থানীয় আবহাওয়ার সতর্কতা দেখুন, জমির নিকাশি পরিষ্কার রাখুন এবং স্থানীয় কৃষি দপ্তরের পরামর্শ অনুসরণ করুন।",
      market: "মাণ্ডির দাম জানতে ফসলের নাম, রাজ্য, জেলা ও বাজার নির্বাচন করুন। সরকারি বা স্থানীয় মাণ্ডির সর্বশেষ দাম যাচাই করুন।",
      soil: "মাটির স্বাস্থ্য ভালো রাখতে মাটি পরীক্ষা করুন, পরীক্ষার ফল অনুযায়ী সার দিন এবং সম্ভব হলে জৈব পদার্থ যোগ করুন।",
      error: "ভয়েস ইনপুট চালু করা যায়নি। অনুমতি পরীক্ষা করুন অথবা লিখে প্রশ্ন করুন।"
    },
    "hi-IN": {
      greeting: "नमस्ते! मैं कृषिदोस्त हूँ।",
      description: "खेती से जुड़ा अपना सवाल पूछें।",
      placeholder: "खेती के बारे में सवाल लिखें...",
      ready: "मदद के लिए तैयार",
      listening: "आपकी बात सुन रहा हूँ...",
      unsupported: "इस ब्राउज़र में आवाज़ से इनपुट उपलब्ध नहीं है। कृपया टाइप करें।",
      empty: "कृपया सवाल लिखें या माइक्रोफ़ोन इस्तेमाल करें।",
      fallback: "इस विषय की जानकारी किसी विश्वसनीय स्रोत से जाँचें। अपनी फसल और क्षेत्र का नाम बताने से अधिक उपयोगी सलाह मिल सकती है।",
      rain: "भारी बारिश से पहले स्थानीय मौसम चेतावनी देखें, खेत की जल निकासी साफ रखें और स्थानीय कृषि विभाग की सलाह मानें।",
      market: "मंडी भाव जानने के लिए फसल, राज्य, ज़िला और मंडी चुनें। सरकारी या स्थानीय मंडी के नवीनतम भाव की पुष्टि करें।",
      soil: "मिट्टी की सेहत के लिए मिट्टी की जाँच कराएँ, परिणाम के अनुसार खाद डालें और संभव हो तो जैविक पदार्थ मिलाएँ।",
      error: "वॉइस इनपुट शुरू नहीं हो पाया। अनुमति जाँचें या सवाल टाइप करें।"
    },
    "en-IN": {
      greeting: "Hello! I'm KrishiDost.",
      description: "Ask me a question about farming.",
      placeholder: "Ask about farming...",
      ready: "Ready to help",
      listening: "Listening to you...",
      unsupported: "Voice input is not supported in this browser. Please type your question.",
      empty: "Please type a question or use the microphone.",
      fallback: "Please verify this topic with a reliable source. Sharing your crop and location will help you find more specific guidance.",
      rain: "Before heavy rain, check local weather alerts, keep field drainage clear, and follow advice from your local agricultural department.",
      market: "To check mandi prices, choose the crop, state, district, and market. Verify the latest prices from an official or local mandi source.",
      soil: "For healthier soil, get a soil test, apply fertilizer based on the results, and add organic matter where appropriate.",
      error: "Voice input could not start. Check microphone permission or type your question."
    }
  };

  function currentCopy() {
    return copy[language.value] || copy["en-IN"];
  }

  function setLanguageText() {
    const t = currentCopy();
    greeting.textContent = t.greeting;
    description.textContent = t.description;
    questionInput.placeholder = t.placeholder;
    status.textContent = t.ready;
  }

  function getDemoResponse(question) {
    const q = question.toLocaleLowerCase();

    if (/rain|heavy rain|বৃষ্টি|বর্ষা|बारिश|वर्षा|बाढ़|flood|জল জম|বন্যা/.test(q)) {
      return currentCopy().rain;
    }

    if (/mandi|price|market|দাম|বাজার|মাণ্ডি|मंडी|भाव|कीमत|बाजार/.test(q)) {
      return currentCopy().market;
    }

    if (/soil|fertili[sz]er|মাটি|সার|मिट्टी|खाद|उर्वरक/.test(q)) {
      return currentCopy().soil;
    }

    return currentCopy().fallback;
  }

  function speak(text) {
    if (!("speechSynthesis" in window)) {
      status.textContent = "Speech output is not supported in this browser.";
      return;
    }

    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = language.value;
    utterance.rate = 0.95;

    window.speechSynthesis.speak(utterance);
  }

  function ask(question) {
    const cleanQuestion = question.trim();
    if (!cleanQuestion) {
      answer.textContent = currentCopy().empty;
      return;
    }

    const response = getDemoResponse(cleanQuestion);
    answer.textContent = response;
    status.textContent = currentCopy().ready;
  }

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    ask(questionInput.value);
  });

  root.querySelectorAll(".ai-suggestion").forEach((button) => {
    button.addEventListener("click", () => {
      questionInput.value = button.dataset.question || "";
      ask(questionInput.value);
    });
  });

  language.addEventListener("change", () => {
    setLanguageText();
    if (questionInput.value.trim()) {
      questionInput.placeholder = currentCopy().placeholder;
    }
  });

  speakButton.addEventListener("click", () => {
    const text = answer.textContent.trim();
    if (text) speak(text);
  });

  const SpeechRecognition =
    window.SpeechRecognition || window.webkitSpeechRecognition;

  if (!SpeechRecognition) {
    mic.disabled = true;
    mic.title = currentCopy().unsupported;
    status.textContent = currentCopy().unsupported;
  } else {
    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;

    mic.addEventListener("click", () => {
      try {
        recognition.lang = language.value;
        status.textContent = currentCopy().listening;
        mic.classList.add("is-listening");
        recognition.start();
      } catch {
        status.textContent = currentCopy().error;
        mic.classList.remove("is-listening");
      }
    });

    recognition.addEventListener("result", (event) => {
      const transcript = event.results[0][0].transcript;
      questionInput.value = transcript;
      ask(transcript);
    });

    recognition.addEventListener("error", () => {
      status.textContent = currentCopy().error;
    });

    recognition.addEventListener("end", () => {
      mic.classList.remove("is-listening");
      if (status.textContent === currentCopy().listening) {
        status.textContent = currentCopy().ready;
      }
    });
  }

  setLanguageText();
})();
