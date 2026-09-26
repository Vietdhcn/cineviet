import { createBrowserRouter, Link, RouterProvider } from 'react-router-dom';
import { Layout } from './ui/Layout';
import { CatalogPage } from './features/catalog/CatalogPage';
import { MoviePage } from './features/catalog/MoviePage';
import { SeatPage } from './features/booking/SeatPage';
import { CheckoutPage } from './features/booking/CheckoutPage';
import { BookingsPage } from './features/booking/BookingsPage';
import { RecommendationPage } from './features/recommendation/RecommendationPage';
import { CinemaDirectoryPage } from './features/cinemas/CinemaDirectoryPage';
import { CinemaDetailPage } from './features/cinemas/CinemaDetailPage';
import { EmptyState } from './ui/Loading';
import { AccountPage } from './features/account/AccountPage';

const routes = [{
  path: '/', element: <Layout />, children: [
    { index: true, element: <CatalogPage /> },
    { path: 'phim/:movieId', element: <MoviePage /> },
    { path: 'rap', element: <CinemaDirectoryPage /> },
    { path: 'rap/:cinemaId', element: <CinemaDetailPage /> },
    { path: 'dat-ghe/:showtimeId', element: <SeatPage /> },
    { path: 'thanh-toan/:bookingId', element: <CheckoutPage /> },
    { path: 'don-ve', element: <BookingsPage /> },
    { path: 'goi-y', element: <RecommendationPage /> },
    { path: 'tai-khoan', element: <AccountPage /> },
    { path: '*', element: <div className="page"><EmptyState title="Lạc khỏi phòng chiếu" body="Đường dẫn này không tồn tại trong CineViet." action={<Link className="button button--primary" to="/">Về trang chủ</Link>} /></div> },
  ],
}];

const router = createBrowserRouter(routes);

export default function App() { return <RouterProvider router={router} />; }
