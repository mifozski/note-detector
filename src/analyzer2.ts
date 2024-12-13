// @ts-ignore
import ess from 'essentia.js';
import Essentia from 'essentia.js/dist/core_api';
import { PlotHeatmap } from 'essentia.js/dist/display/plot';
import EssentiaExtractor from 'essentia.js/dist/extractor/extractor';

let essentiaExtractor: EssentiaExtractor;
let plotSpectrogram: PlotHeatmap;
let essentia: Essentia;

const plotContainerId = 'plotDiv';

let isComputed = false;
const frameSize = 1024;
const hopSize = 512;
const numBands = 96;

// const audioURL = 'https://freesound.org/data/previews/328/328857_230356-lq.mp3';
const audioURL = 'http://localhost:8080/328857_230356-lq.mp3';

let audioData;

const audioCtx = new AudioContext();

async function onClickFeatureExtractor() {
  // load audio file from an url
  audioCtx.resume();
  audioData = await essentiaExtractor.getAudioChannelDataFromURL(audioURL, audioCtx);

  const freqs = essentia.arrayToVector([]);
  const magnitudes = essentia.arrayToVector([]);
  const pcp = await essentiaExtractor.HPCP(freqs, magnitudes);
  console.log('pcp:', pcp);

  console.log('profile:', essentiaExtractor.profile);
  const chords = await essentiaExtractor.ChordsDetection(pcp.hpcp);
  console.log('chords:', chords);

  // if already computed, destroy plot traces
  if (isComputed) {
    plotSpectrogram.destroy();
  }

  // modifying default extractor settings
  essentiaExtractor.frameSize = frameSize;
  essentiaExtractor.hopSize = hopSize;
  // settings specific to an algorithm
  essentiaExtractor.profile.MelBands.numberBands = numBands;

  // Now generate overlapping frames with given frameSize and hopSize
  // You could also do it using pure JS to avoid arrayToVector and vectorToArray conversion
  const audioFrames = essentiaExtractor.FrameGenerator(audioData, frameSize, hopSize);
  const logMelSpectrogram = [];
  console.log('frameSize: ', audioFrames);
  for (let i = 0; i < audioFrames.size(); i++) {
    logMelSpectrogram.push(
      essentiaExtractor.melSpectrumExtractor(essentiaExtractor.vectorToArray(audioFrames.get(i))),
    );
  }

  // plot the feature
  plotSpectrogram.create(
    logMelSpectrogram, // input feature array
    'LogMelSpectrogram', // plot title
    audioData.length, // length of audio in samples
    audioCtx.sampleRate, // audio sample rate,
    hopSize, // hopSize
  );
  // essentiaExtractor.algorithms.delete();
  isComputed = true;
}

export function initAnalyzer() {
  plotSpectrogram = new ess.EssentiaPlot.PlotHeatmap(
    Plotly, // Plotly.js global
    plotContainerId, // HTML container id
    'spectrogram', // type of plot
    ess.EssentiaPlot.LayoutSpectrogramPlot, // layout settings
  ) as PlotHeatmap;

  plotSpectrogram.plotLayout.yaxis.range = [0, numBands];

  console.log('ess:', ess);
  console.log('wasm:', ess.EssentiaWASM.EssentiaWASM);

  // Now let's load the essentia wasm back-end, if so create UI elements for computing features
  // ess.EssentiaWASM.EssentiaWASM().then(async function (WasmModule: any) {
  // populate html audio player with audio
  const player = document.getElementById('audioPlayer')! as HTMLAudioElement;
  // player.src = audioURL;
  player.load();

  // essentiaExtractor = new ess.EssentiaExtractor(WasmModule);
  essentiaExtractor = new ess.EssentiaExtractor(ess.EssentiaWASM.EssentiaWASM);

  essentia = new ess.Essentia(ess.EssentiaWASM.EssentiaWASM, true) as Essentia;

  // essentia version log to html div
  // $('#logDiv').html(
  //   '<h5> essentia-' + essentiaExtractor.version + ' wasm backend loaded ... </h5><br>',
  // );

  // $('#logDiv').append(
  //   '<button id="btn" class="ui white inverted button">Compute Log-Mel-Spectrogram </button>',
  // );

  const button = document.getElementById('btn')!;

  // add onclick event handler to comoute button
  button.addEventListener('click', () => onClickFeatureExtractor(), false);
  // });

  // const essentia = new ess.Essentia(ess.EssentiaWASM.EssentiaWASM, true) as Essentia;

  // essentiaExtractor = new ess.EssentiaExtractor(ess.EssentiaWASM.EssentiaWASM);

  // essentia.extra;

  // console.log(essentia.version);
}

async function onRecordFeatureExtractor(event) {
  audioData = await essentiaExtractor.getAudioChannelDataFromURL(audioURL, audioCtx);

  // convert the float32 audio data into std::vector<float> for using essentia algos
  const bufferSignal = essentia.arrayToVector(event.inputBuffer.getChannelData(0));

  if (!bufferSignal) {
    throw 'onRecordingError: empty audio signal input found!';
  }

  const chordFeatures = computeChords(bufferSignal, bufferSize);

  // displayChordInfo(chordFeatures);
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
