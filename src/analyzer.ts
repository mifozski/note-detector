/* If you're feeling fancy you can add interactivity 
    to your site with Javascript */

import ess from 'essentia.js';
import Essentia from 'essentia.js/dist/core_api';

// declare some global variables
// HTML elements
const strengthInfo = document.getElementById('strength')!;
const chordInfo = document.getElementById('chord')!;

// global var for web audio api AudioContext
let audioCtx: AudioContext;

let essentia: Essentia;

// buffer size microphone stream
const bufferSize = 4096;
// threshold for filtering the chord detection results
const chordThreshold = 0.6;
// global var getUserMedia mic stream
let gumStream;

// create Web Audio API audio context. Throw an error if the browser has no support
try {
  const AudioContext = window.AudioContext || window.webkitAudioContext;
  audioCtx = new AudioContext();
} catch (e) {
  throw 'Could not instantiate AudioContext: ' + e.message;
}

const audioURL = '/328857_230356-lq.mp3';
console.log(audioURL);
console.log(import.meta.env);

export function initAnalyzer() {
  // Now let's load the essentia wasm back-end, if so create UI elements for computing features
  // ess.EssentiaWASM.EssentiaWASM().then(async function (WasmModule: any) {
  // populate html audio player with audio
  const player = document.getElementById('audioPlayer')! as HTMLAudioElement;
  // player.src = audioURL;
  player.load();

  essentia = new ess.Essentia(ess.EssentiaWASM.EssentiaWASM, false) as Essentia;

  const button = document.getElementById('btn')!;

  // add onclick event handler to comoute button
  button.addEventListener('click', () => startMicRecordStream(onRecordFeatureExtractor), false);
}

// record native microphone input and do further audio processing on each audio buffer using the given callback functions
async function startMicRecordStream(onProcessCallback) {
  // cross-browser support for getUserMedia
  navigator.getUserMedia =
    navigator.getUserMedia ||
    navigator.webkitGetUserMedia ||
    navigator.mozGetUserMedia ||
    navigator.msGetUserMedia;
  window.URL = window.URL || window.webkitURL || window.mozURL || window.msURL;

  const response = await fetch(audioURL);
  const arrayBuffer = await response.arrayBuffer();

  // Decode the audio data
  const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);

  // Create a buffer source node
  const source = audioCtx.createBufferSource();
  source.buffer = audioBuffer;

  // Connect the source to the destination (speakers)
  source.connect(audioCtx.destination);

  const scriptNode = audioCtx.createScriptProcessor(bufferSize, 1, 1);
  // onprocess callback (here we can use essentia.js algos)
  scriptNode.onaudioprocess = onProcessCallback;
  // It seems necessary to connect the stream to a sink for the pipeline to work, contrary to documentataions.
  // As a workaround, here we create a gain node with zero gain, and connect temp to the system audio output.
  const gain = audioCtx.createGain();
  gain.gain.setValueAtTime(0, audioCtx.currentTime);
  scriptNode.connect(gain);
  gain.connect(audioCtx.destination);

  source.start();

  if (audioCtx.state === 'suspended') audioCtx.resume();
  if (navigator.getUserMedia) {
    console.log('Initializing audio...');
    // navigator.getUserMedia(
    //   { audio: true, video: false },
    //   function (stream) {
    //     gumStream = stream;
    //     if (gumStream.active) {
    //       console.log('Audio context sample rate = ' + audioCtx.sampleRate);
    //       const mic = audioCtx.createMediaStreamSource(stream);
    //       // We need the buffer size that is a power of two
    //       if (bufferSize % 2 != 0 || bufferSize < 256) {
    //         throw 'Choose a buffer size that is a power of two and greater than 256';
    //       }
    //       const scriptNode = audioCtx.createScriptProcessor(bufferSize, 1, 1);
    //       // onprocess callback (here we can use essentia.js algos)
    //       scriptNode.onaudioprocess = onProcessCallback;
    //       // It seems necessary to connect the stream to a sink for the pipeline to work, contrary to documentataions.
    //       // As a workaround, here we create a gain node with zero gain, and connect temp to the system audio output.
    //       const gain = audioCtx.createGain();
    //       gain.gain.setValueAtTime(0, audioCtx.currentTime);
    //       mic.connect(scriptNode);
    //       scriptNode.connect(gain);
    //       gain.connect(audioCtx.destination);

    //       // if (callback) {
    //       //   callback();
    //       // }
    //     } else {
    //       throw 'Mic stream not active';
    //     }
    //   },
    //   function (message) {
    //     throw 'Could not access microphone - ' + message;
    //   },
    // );
  } else {
    throw 'Could not access microphone - getUserMedia not available';
  }
}

// stop mic recording
function stopMicRecordStream() {
  console.log('Stopped recording ...');
  // stop mic stream
  gumStream.getAudioTracks().forEach(function (track) {
    track.stop();
  });
  audioCtx.suspend();
}

// ScriptNodeProcessor callback function to extract pitchyin feature using essentia.js and plotting it on the front-end
function onRecordFeatureExtractor(event) {
  // convert the float32 audio data into std::vector<float> for using essentia algos
  const bufferSignal = essentia.arrayToVector(event.inputBuffer.getChannelData(0));

  if (!bufferSignal) {
    throw 'onRecordingError: empty audio signal input found!';
  }

  const chordFeatures = computeChords(bufferSignal, bufferSize);

  displayChordInfo(chordFeatures);
}

// compute chords from an audio buffer vector
const computeChords = function (audioVectorBuffer, frameSize) {
  const hpcpPool = new essentia.module.VectorVectorFloat();

  // we need to compute the following signal process chain
  // audio frame => windowing => spectrum => spectral peak => spectral whitening => HPCP => ChordDetection
  const windowOut = essentia.Windowing(audioVectorBuffer, true, frameSize, 'blackmanharris62');

  const spectrumOut = essentia.Spectrum(windowOut.frame, frameSize);

  const peaksOut = essentia.SpectralPeaks(
    spectrumOut.spectrum,
    0,
    4000,
    100,
    60,
    'frequency',
    audioCtx.sampleRate,
  );

  const whiteningOut = essentia.SpectralWhitening(
    spectrumOut.spectrum,
    peaksOut.frequencies,
    peaksOut.magnitudes,
    4000,
    audioCtx.sampleRate,
  );

  const hpcpOut = essentia.HPCP(
    peaksOut.frequencies,
    whiteningOut.magnitudes,
    true,
    500,
    0,
    4000,
    false,
    60,
    true,
    'unitMax',
    440,
    audioCtx.sampleRate,
    12,
  );

  hpcpPool.push_back(hpcpOut.hpcp);

  const chordDetect = essentia.ChordsDetection(hpcpPool, bufferSize, audioCtx.sampleRate);

  const chords = chordDetect.chords.get(0);

  const chordsStrength = chordDetect.strength.get(0);

  return { chord: chords, strength: chordsStrength };
};

// function to display the pitch on the html elements
function displayChordInfo(features) {
  console.log('features:', features);
  if (features.strength > chordThreshold) {
    strengthInfo.innerHTML = 'Strength: ' + features.strength.toFixed(2);
    chordInfo.innerHTML = features.chord;
  } else {
    chordInfo.innerHTML = '---';
    strengthInfo.innerHTML = 'Strength: ' + features.strength.toFixed(2);
  }
}
