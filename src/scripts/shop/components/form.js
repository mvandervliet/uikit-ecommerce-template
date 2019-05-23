import { Mu, MuMx } from '../../mu/mu';
import { MuCtxSetterMixin } from '../../mu/bindings';


export class MuForm extends MuMx.compose(null, [MuCtxSetterMixin, 'mu-form']) {

  onInit() {
    this.submit = this.submit.bind(this);
    this.change = this.change.bind(this);
  }

  onMount() {
    // console.log('FORM MOUNT', this.context._id, this.node);
    const eNoop = e => e.preventDefault();
    this._change = this._ctxAttrValue('muChange') || this.node.onchange || eNoop;
    this._submit = this._ctxAttrValue('muSubmit') || this.node.onsubmit || eNoop;
    this.node.onchange = this.change;
    this.node.onsubmit = this.submit;
    return super.onMount && super.onMount();
  }

  submit(e) {
    // console.log('SUBMIT', this.context._id, this.node);
    this.emitOnce('submit', this, e);
    return this._submit(e, this);
  }

  change(e) {
    this.emitOnce('change', this, e);
    this._change(e, this);
  }

  getData() {

    // Setup serialized data
    const data = {};
  
    // Loop through each field in the form
    for (let i = 0; i < this.node.elements.length; i++) {
  
      const field = this.node.elements[i];
  
      // Don't serialize fields without a name, submits, buttons, file and reset inputs, and disabled fields
      const omitType = ['file', 'reset', 'submit', 'button'];
      if (!field.name || field.disabled || omitType.indexOf(field.type) > -1) {
        continue;
      }

      // multi
      if (field.type === 'select-multiple') {
        data[field.name] = field.options
          .filter(o => o.selected)
          .map(opt => opt.value);
      }
  
      // Convert field data to a query string
      else if ((field.type !== 'checkbox' && field.type !== 'radio') || field.checked) {
        if (/\]$/.test(field.name)) {
          const name = field.name.split('[').shift();
          data[name] = data[name] || [];
          data[name].push(field.value);
        } else {
          data[field.name] = field.value;
        }
      }
    }
  
    return data;
  
  };
}

export default Mu.micro('ctrl.form', '[mu-form]', MuForm);
