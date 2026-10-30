/**
 * Gerador de Notificação Sonora e Vibração via Web Audio API e Vibration API
 * Funciona de forma 100% nativa no navegador, PWA e Android sem precisar de arquivos .mp3 pesados externos.
 */

class SoundNotificationService {
  private audioCtx: AudioContext | null = null;

  private getAudioContext(): AudioContext | null {
    if (typeof window === "undefined") return null;
    try {
      if (!this.audioCtx) {
        const AudioCtxClass =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        if (AudioCtxClass) {
          this.audioCtx = new AudioCtxClass();
        }
      }
      if (this.audioCtx && this.audioCtx.state === "suspended") {
        this.audioCtx.resume();
      }
      return this.audioCtx;
    } catch {
      return null;
    }
  }

  /**
   * Toca um chime melódico agradável e moderno anunciando nova versão disponível
   * Notas: Dó maior ascendente (C5 -> E5 -> G5 -> C6) com fadeout harmônico
   */
  public playUpdateChime(): void {
    try {
      const ctx = this.getAudioContext();
      if (!ctx) return;

      const now = ctx.currentTime;
      const notes = [
        { freq: 523.25, time: 0.0, dur: 0.12 }, // C5
        { freq: 659.25, time: 0.1, dur: 0.12 }, // E5
        { freq: 783.99, time: 0.2, dur: 0.14 }, // G5
        { freq: 1046.5, time: 0.32, dur: 0.35 }, // C6
      ];

      notes.forEach(({ freq, time, dur }) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, now + time);

        // Curva de volume suave
        gain.gain.setValueAtTime(0.001, now + time);
        gain.gain.linearRampToValueAtTime(0.18, now + time + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + time + dur);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now + time);
        osc.stop(now + time + dur + 0.05);
      });

      // Feedback háptico no celular (vibração elegante)
      if (typeof navigator !== "undefined" && navigator.vibrate) {
        try {
          navigator.vibrate([60, 40, 100]);
        } catch {
          // ignore
        }
      }
    } catch (err) {
      console.debug("[SoundNotification] Não foi possível reproduzir som:", err);
    }
  }

  /**
   * Toca um bip suave de sucesso
   */
  public playSuccessBeep(): void {
    try {
      const ctx = this.getAudioContext();
      if (!ctx) return;

      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(880, now);
      osc.frequency.exponentialRampToValueAtTime(1174.66, now + 0.15); // D6

      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.2);
    } catch {
      // ignore
    }
  }
}

export const soundNotificationService = new SoundNotificationService();
