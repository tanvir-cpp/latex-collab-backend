import { AppController } from './app.controller.js';

describe('AppController', () => {
  it('reports liveness', () => {
    expect(new AppController().health()).toEqual({ status: 'ok' });
  });
});
