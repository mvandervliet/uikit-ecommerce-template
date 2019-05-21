/**
 * Created insulated child context
 */
export const MxCtxInsulator = ctor => class extends ctor {

  constructor(...args) {
    super(...args);
    this.context = this.context.child();
  }

}
