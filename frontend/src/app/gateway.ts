import type { CinemaGateway } from '../domain/cinema';
import type { OperationsGateway } from '../features/operations';
import { DemoCinemaGateway } from '../infrastructure/demoCinemaGateway';
import { HttpCinemaGateway } from '../infrastructure/httpCinemaGateway';

export const isDemoMode = import.meta.env.VITE_API_MODE !== 'server';
const demoGateway = new DemoCinemaGateway();
export const cinemaGateway: CinemaGateway = isDemoMode ? demoGateway : new HttpCinemaGateway();
export const operationsGateway: OperationsGateway | null = isDemoMode ? demoGateway : null;
