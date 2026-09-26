import { expect, it } from 'vitest';
import { cinemaGateway } from './gateway';
import { HttpCinemaGateway } from '../infrastructure/httpCinemaGateway';

it('uses only the HTTP gateway in the browser build', () => {
  expect(cinemaGateway).toBeInstanceOf(HttpCinemaGateway);
});
