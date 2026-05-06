import { Navigate, Route, Routes } from 'react-router-dom';
import { ProtectedRoute } from './auth/protected-route';
import { AppShell } from './components/primitives/AppShell';
import { LoginPage } from './pages/LoginPage';
import { OrdersPage } from './pages/OrdersPage';
import { PromoUsagesAnalyticsPage } from './pages/PromoUsagesAnalyticsPage';
import { PromocodesAnalyticsPage } from './pages/PromocodesAnalyticsPage';
import { PromocodeManagementPage } from './pages/PromocodeManagementPage';
import { RegisterPage } from './pages/RegisterPage';
import { UsersAnalyticsPage } from './pages/UsersAnalyticsPage';

function App(): JSX.Element {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/app/analytics/users" replace />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route
        path="/app"
        element={
          <ProtectedRoute>
            <AppShell />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/app/analytics/users" replace />} />
        <Route path="overview" element={<Navigate to="/app/analytics/users" replace />} />
        <Route path="analytics" element={<Navigate to="/app/analytics/users" replace />} />
        <Route path="analytics/users" element={<UsersAnalyticsPage />} />
        <Route path="analytics/promocodes" element={<PromocodesAnalyticsPage />} />
        <Route path="analytics/promo-usages" element={<PromoUsagesAnalyticsPage />} />
        <Route path="operations" element={<Navigate to="/app/operations/promocodes" replace />} />
        <Route path="operations/promocodes" element={<PromocodeManagementPage />} />
        <Route path="operations/orders" element={<OrdersPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/app/analytics/users" replace />} />
    </Routes>
  );
}

export default App;
