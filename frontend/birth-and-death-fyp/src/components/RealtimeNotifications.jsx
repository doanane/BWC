import { useEffect, useRef } from 'react';
import { getNotificationsWsUrl } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useSnackbar } from '../context/SnackbarContext';

export default function RealtimeNotifications() {
    const { isAuthenticated } = useAuth();
    const { info } = useSnackbar();
    const reconnectTimer = useRef(null);
    const backoff = useRef(1000);
    const socketRef = useRef(null);
    const infoRef = useRef(info);

    useEffect(() => {
        infoRef.current = info;
    }, [info]);

    useEffect(() => {
        if (!isAuthenticated) return undefined;
        let active = true;

        function connect() {
            if (!active) return;
            const wsUrl = getNotificationsWsUrl();
            if (!wsUrl) return;

            const socket = new WebSocket(wsUrl);
            socketRef.current = socket;

            socket.onopen = () => {
                if (!active) return;
                backoff.current = 1000;
                window.dispatchEvent(new CustomEvent('bdr:ws-connected'));
            };

            socket.onmessage = (event) => {
                if (!active) return;
                try {
                    const data = JSON.parse(event.data);
                    if (data?.event === 'notification.created' && data?.notification) {
                        window.dispatchEvent(new CustomEvent('bdr:notification-created', { detail: data.notification }));
                        if (data.notification.title) {
                            infoRef.current?.(`${data.notification.title}: ${data.notification.message}`, 6000);
                        }
                    }
                    if (data?.event === 'application.submitted') {
                        window.dispatchEvent(new CustomEvent('bdr:application-submitted', { detail: data }));
                    }
                    if (data?.event === 'application.status_changed') {
                        window.dispatchEvent(new CustomEvent('bdr:application-status-changed', { detail: data }));
                    }
                } catch (_) { }
            };

            socket.onclose = () => {
                if (!active) return;
                window.dispatchEvent(new CustomEvent('bdr:ws-disconnected'));
                clearTimeout(reconnectTimer.current);
                const waitMs = backoff.current;
                backoff.current = Math.min(backoff.current * 2, 10000);
                reconnectTimer.current = setTimeout(() => {
                    if (!active) return;
                    connect();
                }, waitMs);
            };

            socket.onerror = () => { socket.close(); };
        }

        connect();

        const tryFastReconnect = () => {
            if (!active) return;
            if (socketRef.current?.readyState === WebSocket.OPEN || socketRef.current?.readyState === WebSocket.CONNECTING) {
                return;
            }
            clearTimeout(reconnectTimer.current);
            backoff.current = 1000;
            connect();
        };

        const onVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                tryFastReconnect();
            }
        };

        window.addEventListener('visibilitychange', onVisibilityChange);
        window.addEventListener('online', tryFastReconnect);

        const pingTimer = setInterval(() => {
            if (socketRef.current?.readyState === WebSocket.OPEN) {
                try {
                    socketRef.current.send('ping');
                } catch {
                    // Ignore transient ping failures; reconnect flow handles recovery.
                }
            }
        }, 25000);

        return () => {
            active = false;
            clearInterval(pingTimer);
            clearTimeout(reconnectTimer.current);
            window.removeEventListener('visibilitychange', onVisibilityChange);
            window.removeEventListener('online', tryFastReconnect);
            if (socketRef.current) socketRef.current.close();
        };
    }, [isAuthenticated]);

    return null;
}
