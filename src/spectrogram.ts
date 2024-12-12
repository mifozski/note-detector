import WaveSurfer from 'wavesurfer.js';

import RecordPlugin from 'wavesurfer.js/dist/plugins/record.esm.js';
import Spectrogram from 'wavesurfer.js/dist/plugins/spectrogram.esm.js';

let wavesurfer: WaveSurfer, record: RecordPlugin;
const scrollingWaveform = false;
const continuousWaveform = true;

const createWaveSurfer = () => {
  // Destroy the previous wavesurfer instance
  if (wavesurfer) {
    wavesurfer.destroy();
  }

  // Create a new Wavesurfer instance
  wavesurfer = WaveSurfer.create({
    container: '#mic',
    waveColor: 'rgb(200, 0, 200)',
    progressColor: 'rgb(100, 0, 100)',
  });

  // Initialize the Record plugin
  record = wavesurfer.registerPlugin(
    RecordPlugin.create({
      renderRecordedAudio: false,
      scrollingWaveform,
      continuousWaveform,
      continuousWaveformDuration: 30, // optional
    }),
  );

  wavesurfer.registerPlugin(
    Spectrogram.create({
      labels: true,
      height: 200,
      splitChannels: true,
    }),
  );

  // Render recorded audio
  record.on('record-end', blob => {
    console.log('recorded :)');
    // const container = document.querySelector('#recordings');
    // const recordedUrl = URL.createObjectURL(blob);

    // // Create wavesurfer from the recorded audio
    // const wavesurfer = WaveSurfer.create({
    //   container,
    //   waveColor: 'rgb(200, 100, 0)',
    //   progressColor: 'rgb(100, 50, 0)',
    //   url: recordedUrl,
    // });

    // // Play button
    // const button = container.appendChild(document.createElement('button'));
    // button.textContent = 'Play';
    // button.onclick = () => wavesurfer.playPause();
    // wavesurfer.on('pause', () => (button.textContent = 'Play'));
    // wavesurfer.on('play', () => (button.textContent = 'Pause'));

    // // Download link
    // const link = container.appendChild(document.createElement('a'));
    // Object.assign(link, {
    //   href: recordedUrl,
    //   download: 'recording.' + blob.type.split(';')[0].split('/')[1] || 'webm',
    //   textContent: 'Download recording',
    // });
  });
  pauseButton.style.display = 'none';
  recButton.textContent = 'Record';

  record.on('record-progress', time => {
    updateProgress(time);
  });
};

const progress = document.querySelector('#progress')!;
const updateProgress = (time: number) => {
  // time will be in milliseconds, convert it to mm:ss format
  const formattedTime = [
    Math.floor((time % 3600000) / 60000), // minutes
    Math.floor((time % 60000) / 1000), // seconds
  ]
    .map(v => (v < 10 ? '0' + v : v))
    .join(':');
  progress.textContent = formattedTime;
};

const pauseButton = document.querySelector('#pause') as HTMLButtonElement;
pauseButton.onclick = () => {
  if (record.isPaused()) {
    record.resumeRecording();
    pauseButton.textContent = 'Pause';
    return;
  }

  record.pauseRecording();
  pauseButton.textContent = 'Resume';
};

const micSelect = document.querySelector('#mic-select') as HTMLSelectElement;
{
  // Mic selection
  RecordPlugin.getAvailableAudioDevices().then(devices => {
    console.log('devices:', devices);
    devices.forEach(device => {
      const option = document.createElement('option');
      option.value = device.deviceId;
      option.text = device.label || device.deviceId;
      micSelect.appendChild(option);
    });
  });
}
// Record button
const recButton = document.querySelector('#record') as HTMLButtonElement;

recButton.onclick = () => {
  if (record.isRecording() || record.isPaused()) {
    record.stopRecording();
    recButton.textContent = 'Record';
    pauseButton.style.display = 'none';
    return;
  }

  recButton.disabled = true;

  // reset the wavesurfer instance

  // get selected device
  const deviceId = micSelect.value;
  record.startRecording({ deviceId }).then(() => {
    recButton.textContent = 'Stop';
    recButton.disabled = false;
    pauseButton.style.display = 'inline';
  });
};

// document.querySelector('#scrollingWaveform').onclick = e => {
//   scrollingWaveform = e.target.checked;
//   if (continuousWaveform && scrollingWaveform) {
//     continuousWaveform = false;
//     document.querySelector('#continuousWaveform').checked = false;
//   }
//   createWaveSurfer();
// };

// document.querySelector('#continuousWaveform').onclick = e => {
//   continuousWaveform = e.target.checked;
//   if (continuousWaveform && scrollingWaveform) {
//     scrollingWaveform = false;
//     document.querySelector('#scrollingWaveform').checked = false;
//   }
//   createWaveSurfer();
// };

createWaveSurfer();

// // Create an instance of WaveSurfer
// const ws = WaveSurfer.create({
//   container: '#waveform',
//   waveColor: 'rgb(200, 0, 200)',
//   progressColor: 'rgb(100, 0, 100)',
//   url: '/examples/audio/audio.wav',
//   sampleRate: 22050,
// });

// // Initialize the Spectrogram plugin
// ws.registerPlugin(
//   Spectrogram.create({
//     labels: true,
//     height: 200,
//     splitChannels: true,
//   }),
// );

// // Play on click
// ws.once('interaction', () => {
//   ws.play();
// });
