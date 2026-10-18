import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App, persistor, store } from '@app';
import { BrowserRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { initServices } from './app/store/services';

const queryClient = new QueryClient();
const services = initServices(store, () => queryClient.clear());

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Provider store={store}>
      <QueryClientProvider client={queryClient}>
        <PersistGate
          loading={null}
          persistor={persistor}
          onBeforeLift={() => services.auth.restoreSession()}
        >
          <BrowserRouter>
            <App />
          </BrowserRouter>
        </PersistGate>
      </QueryClientProvider>
    </Provider>
  </StrictMode>
);
