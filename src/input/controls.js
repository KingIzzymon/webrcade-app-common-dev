import { isXbox } from '../util/browser.js'

export const CIDS = {
  UP: 0,
  DOWN: 1,
  LEFT: 2,
  RIGHT: 3,
  A: 4,
  B: 5,
  X: 6,
  Y: 7,
  LBUMP: 8,
  RBUMP: 9,
  LTRIG: 10,
  RTRIG: 11,
  SELECT: 12,
  START: 13,
  LANALOG: 14,
  RANALOG: 15,
  ESCAPE: 16
}

export const KCODES = {
  ARROW_UP: 'ArrowUp',
  ARROW_DOWN: 'ArrowDown',
  ARROW_LEFT: 'ArrowLeft',
  ARROW_RIGHT: 'ArrowRight',
  A: 'KeyA',
  C: 'KeyC',
  D: 'KeyD',
  E: 'KeyE',
  I: 'KeyI',
  J: 'KeyJ',
  K: 'KeyK',
  L: 'KeyL',
  Q: 'KeyQ',
  R: 'KeyR',
  S: 'KeyS',
  T: 'KeyT',
  V: 'KeyV',
  W: 'KeyW',
  X: 'KeyX',
  Z: 'KeyZ',
  SHIFT_RIGHT: 'ShiftRight',
  SHIFT_LEFT: 'ShiftLeft',
  SPACE_BAR: 'Space',
  CONTROL_LEFT: 'ControlLeft',
  CONTROL_RIGHT: 'ControlRight',
  ENTER: 'Enter',
  ESCAPE: 'Escape'
}

export class PadMapping {
  constructor(idToButtonNum, axisMappings = []) {
    this.idToButtonNum = idToButtonNum;
    this.buttonNumToId = {};

    for (const [id, num] of Object.entries(idToButtonNum)) {
      this.buttonNumToId[num] = id;
    }
  }

  getButtonNum(cid) {
    const bid = this.idToButtonNum[cid];
    return (bid === undefined ? -1 : bid);
  }

  getAxisIndex(stick, isX) { return -1 };

  getHotKeyIds() { return null; }

  getAxisValue(pad, stick, isX) {
    if (pad && pad.axes) {
      const idx = this.getAxisIndex(stick, isX);
      if (idx >= 0 && idx < pad.axes.length) {
        return pad.axes[idx];
      }
    }
    return 0;
  }
}

export class StandardPadMapping extends PadMapping {
  constructor() {
    super({
      [CIDS.UP]: 12,
      [CIDS.DOWN]: 13,
      [CIDS.LEFT]: 14,
      [CIDS.RIGHT]: 15,
      [CIDS.A]: 0,
      [CIDS.B]: 1,
      [CIDS.X]: 2,
      [CIDS.Y]: 3,
      [CIDS.LBUMP]: 4,
      [CIDS.RBUMP]: 5,
      [CIDS.LTRIG]: 6,
      [CIDS.RTRIG]: 7,
      [CIDS.SELECT]: 8,
      [CIDS.START]: 9,
      [CIDS.LANALOG]: 10,
      [CIDS.RANALOG]: 11,
    });
  }

  getAxisIndex(stick, isX) {
    if (stick === 0)
      return isX ? 0 : 1;
    else if (stick === 1) {
      return isX ? 2 : 3;
    } else {
      return -1;
    }
  }
}

export class KeyCodeToControlMapping {
  constructor(keyCodeToControlId = {}) {
    this.keyCodeToControlId = keyCodeToControlId;
    this.controlIdState = {};

    for (const [code, id] of Object.entries(keyCodeToControlId)) {
      this.controlIdState[id] = false;

      this.leftLast = false;
      this.upLast = false;
      this.upHeld = false;
      this.downHeld = false;
      this.rightHeld = false;
      this.leftHeld = false;
    }
  }

  handleKeyEvent(e, down) {
    const cid = this.keyCodeToControlId[e.code];
    if (cid !== undefined) {
      e.preventDefault();
      this.controlIdState[cid] = down;

      switch (cid) {
        case CIDS.UP:
          this.upHeld = down;
          if (down) this.upLast = true;
          break;
        case CIDS.DOWN:
          this.downHeld = down;
          if (down) this.upLast = false;
          break;
        case CIDS.RIGHT:
          this.rightHeld = down;
          if (down) this.leftLast = false;
          break;
        case CIDS.LEFT:
          this.leftHeld = down;
          if (down) this.leftLast = true;
          break;
      }
    }
  }

  isControlDown(cid) {
    let down = this.controlIdState[cid];

    if (down !== undefined && down) {
      switch (cid) {
        case CIDS.UP:
          down = !(this.downHeld && !this.upLast);
          break;
        case CIDS.DOWN:
          down = !(this.upHeld && this.upLast);
          break;
        case CIDS.RIGHT:
          down = !(this.leftHeld && this.leftLast);
          break;
        case CIDS.LEFT:
          down = !(this.rightHeld && !this.leftLast);
          break;
      }
    } else {
      down = false;
    }

    return down;
  }
}

export class DefaultKeyCodeToControlMapping extends KeyCodeToControlMapping {
  constructor() {
    super({
      [KCODES.ARROW_UP]: CIDS.UP,
      [KCODES.ARROW_DOWN]: CIDS.DOWN,
      [KCODES.ARROW_RIGHT]: CIDS.RIGHT,
      [KCODES.ARROW_LEFT]: CIDS.LEFT,
      [KCODES.Z]: CIDS.A,
      [KCODES.A]: CIDS.X,
      [KCODES.X]: CIDS.B,
      [KCODES.S]: CIDS.Y,
      [KCODES.Q]: CIDS.LBUMP,
      [KCODES.W]: CIDS.RBUMP,
      [KCODES.SHIFT_RIGHT]: CIDS.SELECT,
      [KCODES.ENTER]: CIDS.START,
      [KCODES.ESCAPE]: CIDS.ESCAPE
    });
  }
}

export class Controller {
  constructor(keyCodeToControlMapping = new KeyCodeToControlMapping()) {
    this.keyCodeToControlMapping = keyCodeToControlMapping;
    this.padMapping = new StandardPadMapping();
    this.pad = null;
    this.isXbox = isXbox();
  }

  setPad(pad) {
    this.pad = pad;
  }

  handleKeyEvent(e, down) {
    this.keyCodeToControlMapping.handleKeyEvent(e, down);
  }

  isPadButtonDown(cid, analogToDigital = true) {
    const { padMapping } = this;
    const { pad } = this;
    const bid = padMapping.getButtonNum(cid);
    let bdown = false;
    if (bid >= 0 && pad && pad.buttons.length > bid) {
      bdown = pad.buttons[bid].pressed;
    }

    if (!bdown && analogToDigital) {
      switch (cid) {
        case CIDS.LEFT:
          bdown = this.isAxisLeft(0);
          break;
        case CIDS.RIGHT:
          bdown = this.isAxisRight(0);
          break;
        case CIDS.UP:
          bdown = this.isAxisUp(0);
          break;
        case CIDS.DOWN:
          bdown = this.isAxisDown(0);
          break;
      }
    }

    return bdown;
  }

  getAxisValue(stick, isX) {
    const { padMapping } = this;
    return padMapping.getAxisValue(this.pad, stick, isX);
  }

  isAxisLeft(stick) {
    const { padMapping } = this;
    return padMapping.getAxisValue(this.pad, stick, true) < -0.5;
  }

  isAxisRight(stick) {
    const { padMapping } = this;
    return padMapping.getAxisValue(this.pad, stick, true) > 0.5;
  }

  isAxisUp(stick) {
    const { padMapping } = this;
    return padMapping.getAxisValue(this.pad, stick, false) < -0.5;
  }

  isAxisDown(stick) {
    const { padMapping } = this;
    return padMapping.getAxisValue(this.pad, stick, false) > 0.5;
  }

  isControlDown(cid, analogToDigital = true) {
    const { isXbox } = this;
    if (this.keyCodeToControlMapping.isControlDown(cid)) {
      return true;
    }

    if (cid === CIDS.ESCAPE || cid === CIDS.START || cid == CIDS.SELECT) {
      // left trigger + (right analog/left analog)
      // left trigger + (start/select) (not on xbox)
      if (cid === CIDS.ESCAPE) {
        return (
          this.isPadButtonDown(CIDS.LTRIG) && (this.isPadButtonDown(CIDS.RANALOG) || this.isPadButtonDown(CIDS.LANALOG))) ||
          (!isXbox && (
            (this.isPadButtonDown(CIDS.LTRIG) && (this.isPadButtonDown(CIDS.START) || this.isPadButtonDown(CIDS.SELECT))) ||
            (this.isPadButtonDown(CIDS.SELECT) && this.isPadButtonDown(CIDS.X))
          )
        );
      // right trigger + right analog
      // start (not available for xbox)
      } else if (cid == CIDS.START) {
        return (this.isPadButtonDown(CIDS.RTRIG) && this.isPadButtonDown(CIDS.RANALOG)) ||
          (!isXbox && this.isPadButtonDown(CIDS.START));
      // right trigger + left analog
      // select (not available for xbox)
      } else if (cid == CIDS.SELECT) {
        return (this.isPadButtonDown(CIDS.RTRIG) && this.isPadButtonDown(CIDS.LANALOG)) ||
        (!isXbox && this.isPadButtonDown(CIDS.SELECT));
      }
      return false;
    }

    return this.isPadButtonDown(cid, analogToDigital);
  }
}

export class Controllers {
  constructor(controllerArray) {
    this.controllers = controllerArray;

    this.enabled = false;
    this.setEnabled(true);
  }

  keyDownListener = e => {
    this.handleKeyEvent(e, true);
  }

  keyUpListener = e => {
    this.handleKeyEvent(e, false);
  }

  setEnabled(enable) {
    const docElement = document.documentElement;

    if (enable && !this.enabled) {
      this.enabled = true;
      docElement.addEventListener("keydown", this.keyDownListener);
      docElement.addEventListener("keyup", this.keyUpListener);
    } else if (!enable && this.enabled) {
      this.enabled = false;
      docElement.removeEventListener("keydown", this.keyDownListener);
      docElement.removeEventListener("keyup", this.keyUpListener);
    }
  }

  handleKeyEvent(e, down) {
    for (let i = 0; i < this.controllers.length; i++) {
      this.controllers[i].handleKeyEvent(e, down);
    }
  }

  waitUntilControlReleased(controllerIdx, cid) {
    const INTERVAL = 50;
    return new Promise((resolve, reject) => {
      const f = () => {
        this.poll();
        if (!this.isControlDown(controllerIdx, cid)) {
          resolve();
        } else {
          setTimeout(f, INTERVAL);
        }
      }
      setTimeout(f, INTERVAL);
    });
  }

  poll() {
    const clen = this.controllers.length;
    const gamepads = navigator.getGamepads ? navigator.getGamepads() :
      (navigator.webkitGetGamepads ? navigator.webkitGetGamepads() : []);

    let padIdx = 0;
    for (let idx = 0; padIdx < clen && idx < gamepads.length; idx++) {
      let pad = gamepads[idx];
      if (pad) {
        this.controllers[padIdx].setPad(pad);
        // TODO: Set custom mappings (if necessary)
        padIdx++;
      }
    }

    for (; padIdx < clen; padIdx++) {
      this.controllers[padIdx].setPad(null);
    }
  }

  isControlDown(controllerIdx, cid, analogToDigital = true)  {
    return this.controllers[controllerIdx].isControlDown(cid, analogToDigital);
  }

  isAxisDown(controllerIdx, stick) {
    return this.controllers[controllerIdx].isAxisDown(stick);
  }

  isAxisUp(controllerIdx, stick) {
    return this.controllers[controllerIdx].isAxisUp(stick);
  }

  isAxisLeft(controllerIdx, stick) {
    return this.controllers[controllerIdx].isAxisLeft(stick);
  }

  isAxisRight(controllerIdx, stick) {
    return this.controllers[controllerIdx].isAxisRight(stick);
  }

  getAxisValue(controllerIdx, stick, isX) {
    return this.controllers[controllerIdx].getAxisValue(stick, isX);
  }
}
