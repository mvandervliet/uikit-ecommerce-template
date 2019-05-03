
import uikit from 'uikit/dist/js/uikit.min.js';
import icons from 'uikit/dist/js/uikit-icons.min.js';
// ensure global
import { addGlobal } from './util/window';
import { UI_GLOBAL } from './util/constants';
addGlobal(UI_GLOBAL, uikit);

icons(uikit);
export default uikit;