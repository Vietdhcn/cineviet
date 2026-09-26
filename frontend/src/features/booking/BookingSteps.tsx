import { Check } from 'lucide-react';

const steps = ['Chọn suất', 'Chọn ghế', 'Xác nhận', 'Nhận vé'];
export function BookingSteps({ current }: { current: number }) {
  return <ol className="booking-steps" aria-label="Tiến trình đặt vé">{steps.map((step, index) => <li key={step} className={index === current ? 'is-current' : index < current ? 'is-done' : ''} aria-current={index === current ? 'step' : undefined}><span>{index < current ? <Check aria-hidden="true" /> : index + 1}</span><em>{step}</em></li>)}</ol>;
}

