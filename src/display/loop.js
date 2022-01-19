import * as LOG from '../log'
import { addDebugDiv } from './debug.js'

export class DisplayLoop {
  constructor(freq = 60, vsync = true, debug = false) {
    this.frequency = freq;
    this.forceAdjustTimestamp = false;
    this.vsync = vsync;
    this.debug = debug;
    this.paused = true;
    this.isNative = false;
    this.isNativeCheckDone = false;
    this.fps = '';
    this.debugDiv = null;

    if (this.debug) {
      this.debugDiv = addDebugDiv();
    }
    this.checkNativeFps();
  }

  checkNativeFps() {
    if (!this.vsync) {
      this.isNativeCheckDone = true;
      return;
    }

    this.TEST_BEGIN = this.frequency * 5;
    this.TEST_COUNT = this.frequency * 5;

    let fc = 0;
    let start = 0;
    let end = start;

    const f = () => {
      fc++; end = Date.now();
      if (start === 0 && fc === this.TEST_BEGIN) {
        start = Date.now();
        fc = 0;
        LOG.info('native fps test beginning.')
        requestAnimationFrame(f);
      } else if (fc === this.TEST_COUNT) {
        this.isNativeCheckDone = true;

        const fps = (1000/((end - start)/fc));
        const round = Math.round(fps/10)*10;
        const diff = Math.abs(round - fps);
        const nFaster = fps > this.frequency;

        LOG.info('Native FPS: ' + fps + ", round: " + round);
        if ((round === this.frequency) && (diff < 0.5) && this.vsync) {
          LOG.info('Native matches frequency.');
          this.isNative = true;
          this.forceAdjustTimestamp = true;
        } else if (round < this.frequency || (!nFaster && diff >= 5 /*0.5*/)) {
          LOG.info('Native frequency too slow, vsync disabled.');
          this.vsync = false;
          this.forceAdjustTimestamp = true;
        } else {
          LOG.info('Native not close enough to frequency: ' + fps + ', vsync: ' + this.vsync);
        }
      } else {
        requestAnimationFrame(f);
      }
    }
    requestAnimationFrame(f)
  }

  getFrequency() { return this.frequency; }

  sync(cb, afterTimeout) {
    if (this.vsync) {
      requestAnimationFrame(cb);
    } else {
      if (!afterTimeout) {
        setTimeout(cb, 0);
      } else {
        cb();
      }
    }
  }

  pause(p) {
    if (p == this.paused)
      return;
    if (!p) {
      this.forceAdjustTimestamp = true;
    }
    this.paused = p;
  }


  waitCount = 0;

  start(cb) {
    const { frequency } = this;

    const frameTicks = (1000.0 / frequency);
    const adjustTolerance = (frameTicks * frequency * 2); // 2 secs
    const checkFrequency = frequency * 5;

    LOG.info("Frame ticks: " + frameTicks);
    LOG.info("Frequency: " + frequency);

    const initialStart = Date.now();
    let start = Date.now();
    let fc = 0;
    let avgWait = 0;
    let checkSync = 0;

    const f = () => {
      if (!this.paused) {
        nextTimestamp = (nextTimestamp === -1 ?
            Date.now() + frameTicks : nextTimestamp + frameTicks);

        cb();
        fc++;
        let now = Date.now();

        if (((nextTimestamp + adjustTolerance) < now) || this.forceAdjustTimestamp) {
          this.forceAdjustTimestamp = false;
          nextTimestamp = -1; fc = 0; start = now; avgWait = 0;
          LOG.info("adjusted next timestamp.");
        }

        let wait = nextTimestamp == -1 ? 0 : (nextTimestamp - now);
        avgWait += wait;

        if (!this.isNative && wait > 0) {
          this.waitCount++;
          setTimeout(() => this.sync(f, true), wait);
        } else {
          this.sync(f, false);
        }

        if (fc > checkFrequency) {
          let elapsed = Date.now() - start;
          const fpsVal = (1000.0 / (elapsed / fc));

          if (this.debug && checkSync === 1) {
            LOG.info("Checking VSYNC");
          }

          if (this.vsync && (checkSync === 1) && (fpsVal < (frequency - 0.5))) {
            this.isNative = false;
            this.vsync = false;
            this.forceAdjustTimestamp = true;
            checkSync = 2;
            LOG.info('Disabling native and vsync, too slow: ' + fpsVal);
          }

          if (this.debug) {
            const fps = (fpsVal).toFixed(2);
            const w = ((avgWait / fc) * frequency).toFixed(2);
            this.fps = `FPS: ${fps}, Vsync: ${this.vsync}, Wait: ${w}, Native: ${this.isNative}, Wait count: ${this.waitCount}`;
            this.debugDiv.innerHTML = this.fps;
            LOG.info(this.fps);
          }

          if (checkSync === 0 && this.isNativeCheckDone) {
            if (this.debug) {
              LOG.info("Check sync start: " + (Date.now() - initialStart) / 1000.0);
            }
            checkSync = 1;
          } else if (checkSync === 1) {
            if (((Date.now() - initialStart) / 1000.0) > 60.0) {
              if (this.debug) {
                LOG.info("1 minute has elapsed, disabling vsync check.");
              }
              checkSync = 2;
            }
          }

          start = Date.now(); fc = 0; avgWait = 0;
        }
      } else {
        this.sync(f, false);
      }
    }

    let nextTimestamp = -1;
    this.pause(false);
    setTimeout(() => this.sync(f, true), 0);
  }

  getFps() {
    return this.fps;
  }
}
