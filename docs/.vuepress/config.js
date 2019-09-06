module.exports = {
  title: 'socket.io.client.biz',
  description: 'DFocus wanted ssp solution - javascript-client',
  serviceWorker: true,
  base: '/socket.io.client.biz/',
  themeConfig: {
    home: true,
    logo: '/favicon.png',
    nav: [
      { text: 'API', link: '/api/' },
      { text: 'Github', link: 'https://github.com/DFocusFE/socket.io.client.biz' }
    ],
    sidebar: {
      '/api/': ['']
    },
    serviceWorker: {
      updatePopup: true
    }
  }
}
