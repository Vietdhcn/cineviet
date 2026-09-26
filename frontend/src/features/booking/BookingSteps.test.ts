import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it } from 'vitest';
import { BookingSteps } from './BookingSteps';

it('ends the current booking flow at a hold rather than issuing a ticket', () => {
  const html = renderToStaticMarkup(createElement(BookingSteps, { current: 2 }));
  expect(html).toContain('Giữ chỗ');
  expect(html).not.toContain('Nhận vé');
});
