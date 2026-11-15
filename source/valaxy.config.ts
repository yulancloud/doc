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
      { text: '部署教程', link: '/deploy/' },
      { text: '欲蓝财务魔方', link: '/yulan/' },
      { text: 'Windows APP', link: '/windows-app/' },
      { text: '常见问题', link: '/faq/' },
    ],
    sidebar: {
      '/': [
        {
          text: '文档',
          items: [
            { text: '首页', link: '/' },
            { text: '部署教程', link: '/deploy/' },
            { text: '欲蓝财务魔方', link: '/yulan/' },
            { text: 'Windows APP', link: '/windows-app/' },
            { text: '常见问题', link: '/faq/' },
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
