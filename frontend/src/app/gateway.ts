import type { CinemaGateway } from '../domain/cinema';
import { HttpCinemaGateway } from '../infrastructure/httpCinemaGateway';

export const cinemaGateway: CinemaGateway = new HttpCinemaGateway();
