// export async function setupAudio() {
//   const audioContext = new (window.AudioContext || window.webkitAudioContext)();
//   const analyser = audioContext.createAnalyser();
//   analyser.fftSize = 2048; // Frequency resolution
//   const bufferLength = analyser.frequencyBinCount;
//   const frequencyData = new Float32Array(bufferLength);
//   const timeDomainData = new Uint8Array(bufferLength);

//   // Noise and volume gate settings
//   const noiseThreshold = -60; // dB (below this, consider as noise)
//   const volumeThreshold = 20; // Amplitude threshold for detecting sound

//   // Get microphone input
//   const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
//   const source = audioContext.createMediaStreamSource(stream);
//   source.connect(analyser);

//   const noteDisplay = document.getElementById('note')!;
//   const notesDisplay = document.getElementById('notes')!;
//   const recordedNotes: string[] = [];
//   let lastNote: string | undefined; // To avoid duplicate recording

//   function frequencyToNoteName(frequency: number) {
//       const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
//       const noteNumber = Math.round(12 * Math.log2(frequency / 440)) + 69;
//       const octave = Math.floor(noteNumber / 12) - 1;
//       const noteIndex = noteNumber % 12;
//       return `${noteNames[noteIndex]}${octave}`;
//   }

//   function detectNote() {
//       analyser.getFloatFrequencyData(frequencyData);
//       analyser.getByteTimeDomainData(timeDomainData);

//       // Check if the volume exceeds the threshold
//       const volume = Math.max(...timeDomainData) - 128; // Centered around 128
//       if (volume < volumeThreshold) {
//       noteDisplay.textContent = "Silent...";
//       requestAnimationFrame(detectNote);
//       return;
//       }

//       // Find the peak frequency above the noise threshold
//       let maxIndex = 0;
//       let maxAmplitude = noiseThreshold; // dB threshold
//       for (let i = 0; i < bufferLength; i++) {
//       if (frequencyData[i] > maxAmplitude) {
//           maxAmplitude = frequencyData[i];
//           maxIndex = i;
//       }
//       }

//       // Convert the peak index to a frequency
//       const nyquist = audioContext.sampleRate / 2;
//       const frequency = (maxIndex / bufferLength) * nyquist;

//       if (frequency > 20) { // Filter out inaudible frequencies
//       const detectedNote = frequencyToNoteName(frequency);

//       if (detectedNote !== lastNote) { // Check for new notes
//           lastNote = detectedNote;
//           noteDisplay.textContent = `${detectedNote} (${frequency.toFixed(1)} Hz)`;
//           // Record the note
//           recordedNotes.push(detectedNote);
//           notesDisplay.textContent = recordedNotes.join(', ');
//       }
//     }

//     requestAnimationFrame(detectNote);
//   }

//   detectNote();
// }

export async function setupAudio() {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const analyser = audioContext.createAnalyser();
    analyser.fftSize = 2048; // Frequency resolution
    const bufferLength = analyser.frequencyBinCount;
    const frequencyData = new Float32Array(bufferLength);

    const chordDisplay = document.getElementById('chord')!;

    // Database of guitar chords (add more as needed)
    const chords = {
      'E Major': ['E2', 'G#2', 'B2', 'E3', 'G#3', 'B3'],
      'A Minor': ['A2', 'E3', 'A3', 'C4', 'E4'],
      'C Major': ['C3', 'E3', 'G3', 'C4', 'E4'],
      'G Major': ['G2', 'B2', 'D3', 'G3', 'B3', 'D4']
    };

    // Frequency-to-note mapping
    function frequencyToNoteName(frequency: number) {
      const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
      const noteNumber = Math.round(12 * Math.log2(frequency / 440)) + 69;
      const octave = Math.floor(noteNumber / 12) - 1;
      const noteIndex = noteNumber % 12;
      return `${noteNames[noteIndex]}${octave}`;
    }

    // Get peaks in the frequency spectrum
    function getPeaks(dataArray: Float32Array, threshold = -60) {
      const peaks = [];
      for (let i = 0; i < dataArray.length; i++) {
        if (dataArray[i] > threshold) {
          const nyquist = audioContext.sampleRate / 2;
          const frequency = (i / dataArray.length) * nyquist;
          peaks.push(frequencyToNoteName(frequency));
        }
      }
      return peaks;
    }

    // Match detected notes to chords
    function matchChord(detectedNotes: string[]) {
      for (const [chordName, chordNotes] of Object.entries(chords)) {
        if (chordNotes.every(note => detectedNotes.includes(note))) {
          return chordName;
        }
      }
      return 'Unknown Chord';
    }

    // Start analyzing audio
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const source = audioContext.createMediaStreamSource(stream);
    source.connect(analyser);

    function detectChord() {
      analyser.getFloatFrequencyData(frequencyData);

      // Get significant frequencies
      const detectedNotes = getPeaks(frequencyData).filter(Boolean);

      if (detectedNotes.length > 0) {
        const matchedChord = matchChord(detectedNotes);
        chordDisplay.textContent = matchedChord;
      } else {
        chordDisplay.textContent = 'No Chord Detected';
      }

      requestAnimationFrame(detectChord);
    }

    detectChord();
  }