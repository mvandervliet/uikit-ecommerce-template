import { Mu } from './mu';

export class UserController {
  constructor() {
    this.mu.on('ready', () => {

    });
  }

  refresh() {

  }

  logout() {
    this.mu.api.get('/logout')
      .then(res => {
        this.data = null;
        return res;
      });
  }
}

export default Mu.macro('User', UserController);
