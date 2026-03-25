import type { MetadataRoute } from 'next';

const siteUrl = 'https://openclassroom.online';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/api/', '/classroom/'],
    },
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
