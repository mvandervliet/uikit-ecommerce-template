import { Mu, MuMx, MuCtxSingleAttrMixin, attrToSelector } from "../../mu";

const DEBUG_ATTR = 'mu-debug';

export class MuDebug extends MuMx.compose(null, [MuCtxSingleAttrMixin, DEBUG_ATTR]) {
  onMount() {
    const prop = this._ctxAttrProp();
    const val = this._ctxAttrValue();
    const pre = JSON.stringify({ [prop]: val }, null, 2);
    this.view.render(this.node, `<pre>{{pre}}</pre>`, { pre });
  }
}

export default Mu.micro('shop.debug', attrToSelector(DEBUG_ATTR), MuDebug);