import { Mu } from './mu';
import { getGlobal } from '../util/window';
import { UI_GLOBAL } from '../util/constants';

export class MuUi {
  constructor() {
    this.kit = getGlobal(UI_GLOBAL);
    this.view.on('attached', this.kit.update.bind(this.kit));
  }
}

export default Mu.macro('ui', MuUi);

