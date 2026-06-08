// @ts-check
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';

// https://astro.build/config
export default defineConfig({
	integrations: [
		starlight({
			title: 'Luis Bretones',
			customCss: ['./src/styles/custom.css'],
			components: {
				Footer: './src/components/Footer.astro',
				SiteTitle: './src/components/SiteTitle.astro',
			},
			sidebar: [
				{ label: 'Home', link: '/' },
				{
					label: 'Projects',
					items: [
						{ label: 'All Projects', link: '/projects/' },
						{ label: 'Protocol Analysis of Wireless Audio Transceivers', link: '/projects/protocol-analysis-wireless-audio-transceivers/' },
					],
				},
				{
					label: 'Blog',
					items: [
						{ label: 'All Posts', link: '/blog/' },
						{ label: 'Getting started with usbmon on Arch Linux', link: '/blog/usbmon-arch-linux/' },
					],
				},
				{ label: 'Contact', link: '/contact/' },
			],
		}),
	],
});