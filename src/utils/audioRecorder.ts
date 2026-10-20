/**
 * Utility for capturing microphone audio and visualizing audio level
 */

export interface RecorderState {
  isRecording: boolean;
  audioBlob: Blob | null;
  audioUrl: string | null;
  base64Audio: string | null;
  mimeType: string;
  durationSeconds: number;
  error: string | null;
}

export class AudioRecorder {
  private mediaStream: MediaStream | null = null;
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private dataArray: Uint8Array<ArrayBuffer> | null = null;
  private animationFrameId: number | null = null;
  private timerIntervalId: number | null = null;
  private startTime: number = 0;

  private onVolumeChange?: (volume: number) => void;
  private onTimeUpdate?: (seconds: number) => void;

  constructor(
    onVolumeChange?: (volume: number) => void,
    onTimeUpdate?: (seconds: number) => void
  ) {
    this.onVolumeChange = onVolumeChange;
    this.onTimeUpdate = onTimeUpdate;
  }

  static isSupported(): boolean {
    return !!(
      typeof navigator !== 'undefined' &&
      navigator.mediaDevices &&
      navigator.mediaDevices.getUserMedia
    );
  }

  async checkPermission(): Promise<'granted' | 'denied' | 'prompt'> {
    if (typeof navigator === 'undefined' || !navigator.permissions) {
      return 'prompt';
    }
    try {
      const result = await navigator.permissions.query({ name: 'microphone' as PermissionName });
      return result.state;
    } catch {
      return 'prompt';
    }
  }

  async start(): Promise<void> {
    this.audioChunks = [];
    this.startTime = Date.now();

    try {
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      // Find supported mimeType
      const mimeTypes = [
        'audio/webm;codecs=opus',
        'audio/webm',
        'audio/mp4',
        'audio/ogg;codecs=opus',
        'audio/wav',
      ];
      let selectedMimeType = '';
      for (const mime of mimeTypes) {
        if (MediaRecorder.isTypeSupported(mime)) {
          selectedMimeType = mime;
          break;
        }
      }

      this.mediaRecorder = selectedMimeType
        ? new MediaRecorder(this.mediaStream, { mimeType: selectedMimeType })
        : new MediaRecorder(this.mediaStream);

      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          this.audioChunks.push(event.data);
        }
      };

      // Set up AudioContext for real-time waveform / volume meter
      try {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        this.audioContext = new AudioCtx();
        const source = this.audioContext.createMediaStreamSource(this.mediaStream);
        this.analyser = this.audioContext.createAnalyser();
        this.analyser.fftSize = 256;
        source.connect(this.analyser);

        const bufferLength = this.analyser.frequencyBinCount;
        this.dataArray = new Uint8Array(bufferLength);

        const trackVolume = () => {
          if (!this.analyser || !this.dataArray) return;
          this.analyser.getByteFrequencyData(this.dataArray);
          let sum = 0;
          for (let i = 0; i < this.dataArray.length; i++) {
            sum += this.dataArray[i];
          }
          const average = sum / this.dataArray.length;
          const normalized = Math.min(1, average / 100);
          if (this.onVolumeChange) {
            this.onVolumeChange(normalized);
          }
          this.animationFrameId = requestAnimationFrame(trackVolume);
        };
        trackVolume();
      } catch (audioCtxErr) {
        console.warn('AudioContext volume tracker not supported:', audioCtxErr);
      }

      // Track recording duration
      this.timerIntervalId = window.setInterval(() => {
        const elapsed = Math.floor((Date.now() - this.startTime) / 1000);
        if (this.onTimeUpdate) {
          this.onTimeUpdate(elapsed);
        }
      }, 500);

      this.mediaRecorder.start(250); // Slice chunks every 250ms
    } catch (err: any) {
      this.cleanup();
      throw err;
    }
  }

  async stop(): Promise<{ blob: Blob; base64: string; mimeType: string; duration: number }> {
    return new Promise((resolve, reject) => {
      if (!this.mediaRecorder || this.mediaRecorder.state === 'inactive') {
        return reject(new Error('Recorder is not active'));
      }

      const duration = Math.max(1, Math.floor((Date.now() - this.startTime) / 1000));
      const mimeType = this.mediaRecorder.mimeType || 'audio/webm';

      this.mediaRecorder.onstop = async () => {
        try {
          const blob = new Blob(this.audioChunks, { type: mimeType });
          const base64 = await this.blobToBase64(blob);
          this.cleanup();
          resolve({
            blob,
            base64,
            mimeType,
            duration,
          });
        } catch (err) {
          this.cleanup();
          reject(err);
        }
      };

      this.mediaRecorder.stop();
    });
  }

  cancel(): void {
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      try {
        this.mediaRecorder.stop();
      } catch {}
    }
    this.cleanup();
  }

  private cleanup(): void {
    if (this.timerIntervalId) {
      clearInterval(this.timerIntervalId);
      this.timerIntervalId = null;
    }
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((track) => track.stop());
      this.mediaStream = null;
    }
    if (this.audioContext && this.audioContext.state !== 'closed') {
      this.audioContext.close().catch(() => {});
      this.audioContext = null;
    }
    this.analyser = null;
    this.dataArray = null;
    this.mediaRecorder = null;
    if (this.onVolumeChange) {
      this.onVolumeChange(0);
    }
  }

  private blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        resolve(result);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }
}
