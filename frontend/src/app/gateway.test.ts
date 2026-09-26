import { expect, it } from 'vitest';
import { cinemaGateway, operationsGateway } from './gateway';
import { HttpCinemaGateway } from '../infrastructure/httpCinemaGateway';

it('uses only the HTTP gateway in the browser build', () => {
  expect(cinemaGateway).toBeInstanceOf(HttpCinemaGateway);
  expect(operationsGateway).toBeNull();
});
