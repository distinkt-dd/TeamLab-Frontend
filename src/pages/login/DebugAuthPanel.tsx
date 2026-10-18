import { getServices } from '@app';

import {
  selectAccessToken,
  selectAuthUser,
  selectRefreshToken,
} from '@features/auth/model/selectors';

import { setAuthData } from '@features/auth/model/authSlice';

import React, { useState } from 'react';
import { useAppDispatch, useAppSelector } from '../../app/hooks';

export const DebugAuthPanel: React.FC = () => {
  const services = getServices();
  const dispatch = useAppDispatch();

  const accessToken = useAppSelector(selectAccessToken);
  const refreshToken = useAppSelector(selectRefreshToken);
  const currentUser = useAppSelector(selectAuthUser);

  const [accessInput, setAccessInput] = useState('');
  const [refreshInput, setRefreshInput] = useState('');

  /**
   * Inject Tokens — вставляет токены из полей в Redux.
   */
  const handleInject = () => {
    if (!accessInput || !refreshInput) {
      alert('Вставь оба токена в поля!');
      return;
    }

    // Подставляем тестового пользователя
    dispatch(
      setAuthData({
        access: accessInput,
        refresh: refreshInput,
        user: {
          id: 1,
          username: 'demo_owner',
          display_name: 'Demo Owner',
          account_type: 'owner',
        },
      })
    );

    console.log('[DebugAuth] Токены успешно внедрены в Redux');
    alert('Токены установлены! Теперь проверь роуты.');
  };

  /** LOGOUT (Test Route) — использует тот же безопасный flow, что и профиль. */
  const handleTestLogout = () => {
    void services.auth.logout();
    console.log('[DebugAuth] Запущен безопасный logout()');
    alert(
      'Пользователь разлогинен. Перейди на /projects — должен быть редирект на /login.'
    );
  };

  /**
   * Force Refresh — запускает принудительное обновление токена.
   * В текущей реализации используется forceRefresh(), которая всегда
   * отправляет запрос на /refresh, независимо от наличия access-токена.
   * При неудаче (например, истёкший refresh) сработает колбэк onLogout.
   */
  const handleForceRefresh = async () => {
    if (!services?.auth) {
      console.warn('[DebugAuth] Сервисы ещё не инициализированы');
      alert('Сервисы ещё не готовы. Подожди пару секунд и попробуй снова.');
      return;
    }

    try {
      await services.auth.ensureValidToken();
      console.log('[DebugAuth] Refresh выполнен успешно');
      alert('Refresh выполнен. Проверь статус в панели.');
    } catch (e) {
      console.error('[DebugAuth] Ошибка refresh', e);
      alert(
        'Ошибка refresh. Если токены были истёкшими, сервис мог уже разлогинить пользователя.'
      );
    }
  };

  return (
    <aside
      style={{
        border: '1px solid #aaa',
        padding: '16px',
        margin: '24px 0',
        background: '#f9f9f9',
        fontFamily: 'monospace',
        maxWidth: '520px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
      }}
    >
      <h3>Auth Debug Panel (DEV)</h3>

      {/* Блок статуса */}
      <div
        style={{
          marginBottom: '16px',
          padding: '12px',
          background: '#fff',
          border: '1px dashed #ccc',
        }}
      >
        <p style={{ fontSize: '13px', color: '#666', margin: '4px 0' }}>
          Статус авторизации:
        </p>
        <p>Access: {accessToken ? '✅ есть (не пустой)' : '❌ нет'}</p>
        <p>Refresh: {refreshToken ? '✅ есть' : '❌ нет'}</p>
        <p>
          User:{' '}
          {currentUser ? `✅ ${currentUser.username}` : '❌ не авторизован'}
        </p>
      </div>

      {/* Блок Inject Tokens */}
      <div
        style={{
          border: '1px dashed #ccc',
          padding: '14px',
          marginBottom: '18px',
          backgroundColor: '#fafafa',
        }}
      >
        <h4 style={{ margin: '0 0 10px 0', fontSize: '14px' }}>
          🧪 Inject Tokens (из Postman)
        </h4>
        <input
          placeholder="Access token"
          value={accessInput}
          onChange={(e) => setAccessInput(e.target.value)}
          style={{
            width: '100%',
            padding: '6px',
            boxSizing: 'border-box',
            marginBottom: '8px',
            fontSize: '12px',
            border: '1px solid #ddd',
          }}
        />
        <input
          placeholder="Refresh token"
          value={refreshInput}
          onChange={(e) => setRefreshInput(e.target.value)}
          style={{
            width: '100%',
            padding: '6px',
            boxSizing: 'border-box',
            marginBottom: '10px',
            fontSize: '12px',
            border: '1px solid #ddd',
          }}
        />
        <button
          onClick={handleInject}
          style={{
            padding: '8px 16px',
            cursor: 'pointer',
            background: '#4caf50',
            color: 'white',
            border: 'none',
            fontWeight: 'bold',
          }}
        >
          Inject Tokens
        </button>
        <div style={{ fontSize: '11px', color: '#777', marginTop: '6px' }}>
          Вставь токены из ответа API, нажми Inject — панель положит их в Redux.
        </div>
      </div>

      {/* Блок тестов */}
      <div>
        <h4 style={{ margin: '0 0 12px 0', fontSize: '14px' }}>
          🧪 Тесты защиты роутов и логики
        </h4>

        <div style={{ display: 'grid', gap: '8px' }}>
          <button
            onClick={handleTestLogout}
            style={{
              padding: '10px',
              cursor: 'pointer',
              background: '#ff5252',
              color: 'white',
              border: 'none',
              fontWeight: 'bold',
              fontSize: '14px',
            }}
          >
            🚪 LOGOUT (Test Route Protection)
          </button>
          <div style={{ fontSize: '12px', color: '#555' }}>
            Останавливает refresh, отзывает текущий refresh-токен и очищает
            сессию. Проверяет редирект защищённого маршрута.
          </div>

          <button
            onClick={handleForceRefresh}
            style={{
              padding: '10px',
              cursor: 'pointer',
              background: '#2196f3',
              color: 'white',
              border: 'none',
              fontWeight: 'bold',
              fontSize: '14px',
            }}
          >
            ♻️ Force Refresh
          </button>
          <div style={{ fontSize: '12px', color: '#555' }}>
            Запускает ensureValidToken(). Если токены истёкшие — сервис должен
            сам сделать logout. Проверяет автоматическую реакцию системы.
          </div>
        </div>
      </div>
    </aside>
  );
};
