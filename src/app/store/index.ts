import { configureStore, combineReducers } from '@reduxjs/toolkit';
import authReducer from '@features/auth/model/authSlice';
import userReducer from '@entities/user/model/slice';

import {
  persistReducer,
  FLUSH,
  REHYDRATE,
  PERSIST,
  REGISTER,
} from 'redux-persist';
import storage from 'redux-persist/lib/storage';

const rootReducer = combineReducers({
  auth: authReducer,
  user: userReducer,
});

const persistConfig = {
  key: 'root',
  storage,
  whitelist: ['auth'],
};

const persistedReducer = persistReducer(persistConfig, rootReducer);

export const store = configureStore({
  reducer: persistedReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: [
          FLUSH,
          REHYDRATE,
          PERSIST,
          REGISTER,
          'persist/PAUSE',
          'persist/PURGE',
        ],
      },
    }),
});

import { persistStore } from 'redux-persist';
export const persistor = persistStore(store);

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
