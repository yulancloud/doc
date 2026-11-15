import { defineValaxyConfig } from 'valaxy'
import type { ThemePressConfig } from 'valaxy-theme-press'

export default defineValaxyConfig<ThemePressConfig>({
  siteConfig: {
    title: '欲蓝财务',
    description: '欲蓝财务商城官方文档教程',
    url: 'https://yulancloud.github.io/doc',
    lang: 'zh-CN',
  },
  vite: {
    base: '/doc/',
  },
  theme: 'valaxy-theme-press',
  themeConfig: {
    nav: [
      { text: '部署指南', link: '/deploy' },
      { text: '后台使用', link: '/admin' },
      { text: '欲蓝财务魔方', link: '/yulan' },
      { text: 'Windows APP', link: '/windows-app' },
      { text: '常见问题', link: '/faq' },
    ],
    sidebar: {
      '/': [
        {
          text: '开始',
          collapsed: false,
          items: [
            { text: '首页', link: '/' },
            { text: '部署总览', link: '/deploy' },
            { text: '部署前准备', link: '/deploy/prepare' },
          ],
        },
        {
          text: '部署指南（按 Web 服务器分）',
          collapsed: false,
          items: [
            { text: 'Nginx 部署 · 需伪静态', link: '/deploy/nginx' },
            { text: 'Apache 部署 · 免伪静态', link: '/deploy/apache' },
            { text: 'PHP 内置服务器 · 本地测试', link: '/deploy/builtin' },
            { text: '安装与升级迁移', link: '/deploy/install' },
          ],
        },
        {
          text: '后台使用教程',
          collapsed: false,
          items: [
            { text: '后台总览', link: '/admin' },
            { text: '商品管理', link: '/admin/products' },
            { text: '订单与发货', link: '/admin/orders' },
            { text: '支付配置（易支付）', link: '/admin/payment' },
            { text: '站点设置与其他', link: '/admin/settings' },
          ],
        },
        {
          text: '功能与配套',
          collapsed: false,
          items: [
            { text: '欲蓝财务魔方', link: '/yulan' },
            { text: 'Windows APP', link: '/windows-app' },
            { text: '常见问题', link: '/faq' },
          ],
        },
      ],
    },
    editLink: {
      pattern: 'https://github.com/yulancloud/doc/edit/main/source/:path',
      text: '编辑本页',
    },
    socialLinks: [
      { icon: 'i-ri-github-line', link: 'https://github.com/yulancloud/yulancloud', name: '主仓库' },
      { icon: 'i-ri-github-line', link: 'https://github.com/yulancloud/yulancloudRubik-Windows', name: 'Windows APP' },
    ],
    footer: {
      message: '欲蓝财务 · 文档教程',
      copyright: '由 GitHub Pages 托管',
    },
  },
})
