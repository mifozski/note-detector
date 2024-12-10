import WaveSurfer from 'wavesurfer.js';



export function init() {
const wavesurfer = WaveSurfer.create({
    container: '#waveform',
    waveColor: '#4F4A85',
    progressColor: '#383351',
    url: '/audio.mp3',
    })
}