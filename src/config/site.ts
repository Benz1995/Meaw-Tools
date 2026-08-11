export const siteConfig = {
  name: "Meaw Tools",
  description:
    "คาเฟ่เครื่องมือออนไลน์สำหรับคนทำงาน ใช้งานฟรี และประมวลผลข้อมูลภายใน Browser",
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "https://meaw-tools.vercel.app",
  email: "hello@devthai.tools",
  githubUrl: "https://github.com/Benz1995/Meaw-Tools",
} as const;

export const defaultSocialImage = {
  url: "/brand/meaw-cafe-hero.webp",
  width: 1536,
  height: 1024,
  alt: "Meaw Tools คาเฟ่เครื่องมือออนไลน์ธีมแมว",
} as const;
