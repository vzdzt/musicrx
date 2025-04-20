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
      history.removeChild(history.lastChild); // Remove oldest before adding new
    }

    history.insertBefore(prophecy, history.firstChild);
  },

  updateVibeCheck() {
    const vibeIndicator = document.querySelector('.vibe-indicator');
    if (!vibeIndicator) return;
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

  if (!magicButton || !magicInput || !magicAnswer) {
    console.error('Missing critical elements: magicButton, magicInput, or magicAnswer');
    if (magicAnswer) {
      magicAnswer.textContent = 'Oracle broken, check console for errors';
    }
    return;
  }

  magicButton.addEventListener('click', () => {
    if (magicInput.value.trim()) {
      let response;
      if (magicOracle.currentMode === 'fortune') {
        response = magicOracle.getRandomResponse();
      } else if (magicOracle.currentMode === 'recommendation') {
        const genreSelect = document.getElementById('genreSelect');
        const selectedGenre = genreSelect?.value;
        if (selectedGenre && magicOracle.genreRecommendations[selectedGenre]) {
          const recommendations = magicOracle.genreRecommendations[selectedGenre];
          response = recommendations[Math.floor(Math.random() * recommendations.length)];
        } else {
          response = "Select a valid genre, twin!";
        }
      } else if (magicOracle.currentMode === 'compatibility') {
        const artist1 = document.getElementById('artist1')?.value.trim();
        const artist2 = document.getElementById('artist2')?.value.trim();
        if (artist1 && artist2) {
          response = magicOracle.compatibilityResults[Math.floor(Math.random() * magicOracle.compatibilityResults.length)];
        } else {
          response = "Enter both artists, fr!";
        }
      } else {
        response = "Invalid mode, twin!";
      }
      magicAnswer.textContent = response;
      magicOracle.addToProphecyHistory(magicInput.value, response);
      magicOracle.updateVibeCheck();
      magicInput.value = '';
    } else {
      magicAnswer.textContent = "ask something first twin fr fr";
    }
  });

  magicInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && magicInput.value.trim()) {
      magicButton.click();
    }
  });

  document.querySelectorAll('.mode-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const mode = btn.getAttribute('data-mode');
      if (!mode) {
        console.warn('Mode button missing data-mode attribute');
        return;
      }

      document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      magicOracle.currentMode = mode;

      const genreSelect = document.getElementById('genreSelect');
      const compatibilityInputs = document.querySelector('.compatibility-inputs');

      if (genreSelect) {
        genreSelect.style.display = magicOracle.currentMode === 'recommendation' ? 'block' : 'none';
      }
      if (compatibilityInputs) {
        compatibilityInputs.style.display = magicOracle.currentMode === 'compatibility' ? 'flex' : 'none';
      }

      magicOracle.updateVibeCheck();
    });
  });
});

// Attach to global scope for non-module browser context
window.magicOracle = magicOracle;
