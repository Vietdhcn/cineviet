import type { CinemaGateway } from '../domain/cinema';
import type { OperationsGateway } from '../features/operations';
import { HttpCinemaGateway } from '../infrastructure/httpCinemaGateway';

export const cinemaGateway: CinemaGateway = new HttpCinemaGateway();
export const operationsGateway: OperationsGateway | null = null;
