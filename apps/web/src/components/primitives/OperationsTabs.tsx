import { NavLink } from 'react-router-dom';

const operationTabs = [
  {
    label: 'Promocode management',
    to: '/app/operations/promocodes'
  },
  {
    label: 'Orders and apply flow',
    to: '/app/operations/orders'
  }
];

export function OperationsTabs(): JSX.Element {
  return (
    <nav className="operations-tabs" aria-label="Operations sections">
      {operationTabs.map((item) => (
        <NavLink
          key={item.to}
          className={({ isActive }) =>
            isActive ? 'operations-tab operations-tab--active' : 'operations-tab'
          }
          to={item.to}
        >
          {item.label}
        </NavLink>
      ))}
    </nav>
  );
}
