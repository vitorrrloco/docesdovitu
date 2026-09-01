importScripts('https://www.gstatic.com/firebasejs/12.18.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/12.18.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: 'AIzaSyAfH-93y7s1YK_3je_sZlofd8XJ1z436Yk',
  authDomain: 'doces-do-vitu.firebaseapp.com',
  projectId: 'doces-do-vitu',
  storageBucket: 'doces-do-vitu.firebasestorage.app',
  messagingSenderId: '681586131940',
  appId: '1:681586131940:web:e8c213d9865621467e7df1',
  measurementId: 'G-9QDNX23V8Z'
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const notification = payload.notification || {};
  const title = notification.title || 'DOCES DO VITU';
  const options = {
    body: notification.body || 'Você tem uma nova atualização.',
    icon: '/icon-512.png',
    badge: '/favicon.png',
    tag: payload?.data?.tag || 'doces-vitu',
    data: payload?.data || {}
  };
  self.registration.showNotification(title, options);
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const target = event.notification?.data?.url || '/';
  event.waitUntil((async()=>{
    const clientsList = await clients.matchAll({type:'window',includeUncontrolled:true});
    for(const client of clientsList){
      if('focus' in client){
        try{ await client.navigate(target); }catch{}
        return client.focus();
      }
    }
    if(clients.openWindow) return clients.openWindow(target);
  })());
});
