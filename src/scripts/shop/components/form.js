import { Mu, MuMx } from '../../mu/mu';
import { MuCtxSetterMixin } from '../../mu/bindings';


export class MuForm extends MuMx.compose(null, [MuCtxSetterMixin, 'mu-form']) {

  constructor() {
    super();
    this.submit = this.submit.bind(this);
    this.change = this.change.bind(this);
  }

  onMount() {
    const eNoop = e => e.preventDefault();
    this._change = this.node.onchange || eNoop;
    this._submit = this.node.onsubmit || eNoop;
    this.node.onchange = this.change;
    this.node.onsubmit = this.submit;
    return super.onMount && super.onMount();
  }

  submit(e) {
    this.emit('submit', this, e);
    return this._submit(e);
  }

  change(e) {
    this.emit('change', this, e);
    this._change(e);
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
        data[field.name] = field.value;
      }
    }
  
    return data;
  
  };
}

export default Mu.micro('ctrl.form', '[mu-form]', MuForm);
