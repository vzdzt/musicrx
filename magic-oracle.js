// Magic Oracle with Enhanced Features
const magicOracle = {
  currentMode: 'fortune',

  musicResponses: [
    "♫ the oracle says deadass... {response} ♫",
    "♫ no cap fr... {response} ♫",
    "♫ i'm ngl twin... {response} ♫",
    "♫ on god... {response} ♫",
    "♫ respectfully... {response} ♫"
  ],

  genreRecommendations: {
    rap: ["Kendrick (goated)", "Drake (in his feelings)", "Tyler (based)", "Denzel (going crazy)", "Travis (straight up)"],
    rock: ["Tame Impala (psyched out)", "Arctic Monkeys (uk tingz)", "The Strokes (valid)", "RHCP (spicy)"],
    pop: ["The Weeknd (crying in the club)", "Taylor Swift (in her era)", "SZA (slaying)", "Frank Ocean (missing)"],
    electronic: ["Flume (wavy)", "Porter Robinson (emotional damage)", "Disclosure (uk tingz)", "Aphex Twin (unhinged)"],
    jazz: ["Kamasi (ascended)", "Robert Glasper (smooth)", "GoGo Penguin (icy)", "Sons of Kemet (based)"]
  },

  answers: [
    "How we gonna tell him", "Nah", "Maybe if they weren't mid",
    "Just put the fries in the bag bro", "She still don't want you",
    "This might be your moment twin", "Find out yourself bozo",
    "She REALLY don't want you", "LMAOOO nah",
    "You not fighting demons bro do the dishes",
    "Dawg you're pushing 30", "Down BAD", "Call her (she blocked you)",
    "She's literally never gonna like you", "She's literally in love with you",
    "BRO PLEASE BE FR", "You gonna make it out the hood fr",
    "Keep pushing (respectfully)", "W incoming",
    "One step at a time young king", "Pack it up expeditiously",
    "GIVE UP (affectionate)",
  ],

  compatibilityResults: [
    "They would break the internet fr",
    "Mid + Mid = Still Mid",
    "This collab would end careers",
    "The world ain't ready for this",
    "Please don't manifest this",
    "Streets need this expeditiously",
    "Absolutely cursed combination",
    "This would heal the game fr"
  ],

  getRandomResponse() {
    const template = this.musicResponses[Math.floor(Math.random() * this.musicResponses.length)];
    const response = this.answers[Math.floor(Math.random() * this.answers.length)];
    return template.replace('{response}', response);
  },

  addToProphecyHistory(question, answer) {
    const history = document.getElementById('prophecyHistory');
    if (!history) return;

    const prophecy = document.createElement('div');
    prophecy.className = 'prophecy-item';
    prophecy.innerHTML = `
      <strong>Q:</strong> ${question}<br>
      <strong>A:</strong> ${answer}
    `;

    if (history.children.length >= 5) {
      history.removeChild(history.lastChild);
    }

    history.insertBefore(prophecy, history.firstChild);
  },

  updateVibeCheck() {
    const vibeIndicator = document.querySelector('.vibe-indicator');
    const vibes = [
      "i know what you are",
      "get a job",
      "seek help",
      "real",
      "aura",
    ];
    vibeIndicator.textContent = vibes[Math.floor(Math.random() * vibes.length)];
  }
};

document.addEventListener('DOMContentLoaded', () => {
  const magicButton = document.getElementById('magicButton');
  const magicInput = document.getElementById('magicInput');
  const magicAnswer = document.getElementById('magicAnswer');

  magicButton?.addEventListener('click', () => {
    if (magicInput?.value.trim()) {
      const response = magicOracle.getRandomResponse();
      magicAnswer.textContent = response;
      magicOracle.addToProphecyHistory(magicInput.value, response);
      magicOracle.updateVibeCheck();
      magicInput.value = '';
    } else {
      magicAnswer.textContent = "ask something first twin fr fr";
    }
  });

  magicInput?.addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && magicInput.value.trim()) {
      magicButton.click();
    }
  });

  document.querySelectorAll('.mode-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      magicOracle.currentMode = btn.getAttribute('data-mode');
      
      // Toggle visibility of options based on mode
      const genreSelect = document.getElementById('genreSelect');
      const compatibilityInputs = document.querySelector('.compatibility-inputs');
      
      genreSelect.style.display = 'none';
      compatibilityInputs.style.display = 'none';
      
      if (magicOracle.currentMode === 'recommendation') {
        genreSelect.style.display = 'block';
      } else if (magicOracle.currentMode === 'compatibility') {
        compatibilityInputs.style.display = 'flex';
      }
      
      magicOracle.updateVibeCheck();
    });
  });
});

export default magicOracle;
