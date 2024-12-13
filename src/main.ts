import { initAnalyzer } from './analyzer';
import { setupAudio } from './recorder';
import './spectrogram';
import './style.css';
import { init as initWaveDrawer } from './wave-drawer';

initAnalyzer();

document.getElementById('startButton')!.addEventListener('click', () => {
  setupAudio().catch(error => {
    console.error('Error accessing audio:', error);
    alert('Could not access microphone. Please check your permissions.');
  });
  document.getElementById('startButton')!.style.display = 'none';
});

initWaveDrawer();
